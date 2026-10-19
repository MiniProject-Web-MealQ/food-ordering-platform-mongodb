// Direct service checks: the only network used is an isolated local MongoDB.
// Do not start src/server.js here: its background worker would bypass this mock.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const webpush = require("web-push");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const originalSend = webpush.sendNotification;
const calls = [];
let send = async () => ({ statusCode: 201 });
webpush.sendNotification = async (subscription, payload, options) => {
  calls.push({ subscription, payload: JSON.parse(payload), options });
  return send(subscription, payload, options);
};
const servicePath = require.resolve("../src/services/notifications");
let notifications = require(servicePath);
const User = require("../src/models/User");
const Profile = require("../src/models/CustomerProfile");
const Notification = require("../src/models/Notification");
const Subscription = require("../src/models/PushSubscription");
const PushConfig = require("../src/models/PushConfig");
const Order = require("../src/models/Order");

const database = `mealq_push_${crypto.randomBytes(8).toString("hex")}`;
let connected = false;
let passes = 0;
const pass = (message) => { passes++; console.log(`[PASS] ${message}`); };
const id = () => new mongoose.Types.ObjectId();
const keys = () => {
  const curve = crypto.createECDH("prime256v1");
  return { p256dh: curve.generateKeys().toString("base64url"), auth: crypto.randomBytes(16).toString("base64url") };
};
const endpoint = (label) => `https://fcm.googleapis.com/fcm/send/mealq-test-${database}-${label}`;
async function customer({ enabled = true, status = "active" } = {}) {
  const user = await User.create({ name: "Synthetic push fixture", email: `${id()}@mealq.local`, password_hash: "synthetic-not-a-login-hash", role: "customer", status });
  await Profile.create({ user_id: user._id, settings: { notifyReady: enabled } });
  return user;
}
async function subscription(user, label) {
  return Subscription.create({ user_id: user._id, endpoint: endpoint(label), keys: keys() });
}
async function notice(user, label) {
  return Notification.create({ user_id: user._id, event_key: `${database}:${label}`, order_id: String(id()), title: "อาหารพร้อมรับแล้ว", body: "Synthetic order", kind: "ready" });
}
function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, sendStatus(code) { this.statusCode = code; return this; } };
}
function countEndpoint(value) { return calls.filter((call) => call.subscription.endpoint === value).length; }

async function archiveAndClose() {
  try {
    if (connected && mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, database);
      assert.match(database, /^mealq_push_[a-f0-9]{16}$/);
      const collections = {};
      for (const { name } of await mongoose.connection.db.listCollections().toArray()) {
        const collection = mongoose.connection.db.collection(name);
        collections[name] = { documents: await collection.find({}).toArray(), indexes: await collection.indexes() };
      }
      const archiveDir = path.join(os.tmpdir(), "mealq-push-check-archives");
      await fs.mkdir(archiveDir, { recursive: true });
      const archive = path.join(archiveDir, `${database}.json`);
      const snapshot = mongoose.mongo.BSON.EJSON.stringify({ database, syntheticOnly: true, savedAt: new Date(), collections }, null, 2);
      await fs.writeFile(archive, snapshot, { flag: "wx", mode: 0o600 });
      assert.equal(await fs.readFile(archive, "utf8"), snapshot, "Verify test-data archive before deleting its database");
      await mongoose.connection.dropDatabase();
      console.log(`Synthetic test database archived before cleanup: ${archive}`);
    }
  } finally {
    webpush.sendNotification = originalSend;
    await mongoose.disconnect();
  }
}

async function run() {
  const uri = new URL(process.env.PUSH_TEST_MONGO_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27018/mealq");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname), "Push checks refuse remote MongoDB");
  uri.pathname = `/${database}`;
  await mongoose.connect(uri.href, { serverSelectionTimeoutMS: 5000 });
  connected = true;
  await Promise.all([User, Profile, Notification, Subscription, PushConfig, Order].map((model) => model.init()));

  const first = await notifications.pushConfig();
  assert.match(first.publicKey, /^[A-Za-z0-9_-]{87}$/);
  assert.ok(first.privateKey);
  assert.equal((await PushConfig.findById("vapid")).privateKey, undefined);
  delete require.cache[servicePath];
  notifications = require(servicePath);
  assert.equal((await notifications.pushConfig()).publicKey, first.publicKey);
  const publicResponse = response(); await notifications.publicKey({}, publicResponse);
  assert.deepEqual(Object.keys(publicResponse.body), ["publicKey"]);
  assert.equal(publicResponse.body.publicKey, first.publicKey);
  pass("VAPID identity survives a service restart and public responses conceal its private key");

  for (const host of ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]) assert.equal(notifications.validEndpoint(`https://${host}/synthetic`), true);
  for (const value of [null, {}, "http://fcm.googleapis.com/synthetic", "https://127.0.0.1/admin", "https://fcm.googleapis.com.attacker.example/synthetic", "https://fcm.googleapis.com@127.0.0.1/synthetic", "https://user:pass@fcm.googleapis.com/synthetic", "https://fcm.googleapis.com:444/synthetic"]) assert.equal(notifications.validEndpoint(value), false);
  const owner = await customer(); const outsider = await customer();
  const device = { endpoint: endpoint("ownership"), keys: keys() };
  const invalid = response(); await notifications.subscribe({ user: owner, body: { ...device, endpoint: "https://127.0.0.1/private" } }, invalid);
  assert.equal(invalid.statusCode, 400);
  const badKeys = response(); await notifications.subscribe({ user: owner, body: { ...device, keys: { auth: "short", p256dh: "short" } } }, badKeys);
  assert.equal(badKeys.statusCode, 400);
  const accepted = response(); await notifications.subscribe({ user: owner, body: device }, accepted);
  assert.equal(accepted.statusCode, 201);
  await notifications.subscribe({ user: owner, body: device }, response());
  assert.equal(await Subscription.countDocuments({ endpoint: device.endpoint }), 1);
  await notifications.unsubscribe({ user: outsider, body: { endpoint: device.endpoint } }, response());
  assert.equal(await Subscription.countDocuments({ endpoint: device.endpoint, user_id: owner._id }), 1);
  await notifications.unsubscribe({ user: owner, body: { endpoint: device.endpoint } }, response());
  assert.equal(await Subscription.countDocuments({ endpoint: device.endpoint }), 0);
  pass("Subscriptions reject private or spoofed endpoints, validate keys and enforce ownership on unsubscribe");

  const optedOut = await customer({ enabled: false });
  const incomplete = { _id: id(), customer_id: owner._id, checkout_completed: false, status: "pending", order_number: "PUSH-INCOMPLETE" };
  await notifications.recordOrder(incomplete);
  await notifications.recordOrder({ ...incomplete, _id: id(), checkout_completed: true, customer_id: optedOut._id });
  assert.equal(await Notification.countDocuments(), 0);
  const order = { _id: id(), customer_id: owner._id, checkout_completed: true, status: "ready", order_number: "PUSH-READY" };
  await notifications.recordOrder(order); await notifications.recordOrder(order);
  assert.equal(await Notification.countDocuments({ event_key: `order:${order._id}:ready` }), 1);
  const normalSubscription = await subscription(owner, "normal");
  await notifications.deliverPending();
  assert.equal(countEndpoint(normalSubscription.endpoint), 1);
  const normalCall = calls.find((call) => call.subscription.endpoint === normalSubscription.endpoint);
  assert.equal(normalCall.payload.url, `/customer/orders/${order._id}`);
  assert.equal(normalCall.payload.tag, `order:${order._id}:ready`);
  assert.equal(normalCall.options.TTL, 3600);
  assert.equal(normalCall.options.timeout, 5000);
  assert.equal(normalCall.options.vapidDetails.publicKey, first.publicKey);
  assert.equal((await Notification.findOne({ event_key: normalCall.payload.tag })).push_sent, true);
  await notifications.deliverPending();
  assert.equal(countEndpoint(normalSubscription.endpoint), 1);
  pass("Only completed, opted-in checkout events enter the inbox; repeated events and successful worker runs do not resend");

  const recoveredUser = await customer();
  const recoveredDevice = await subscription(recoveredUser, "missed-event");
  const recoveredOrder = await Order.create({ order_number: `${database}-recovered`, customer_id: recoveredUser._id, store_id: id(), items: [], subtotal: 40, total_price: 40, status: "ready", checkout_completed: true, payment_status: "simulated" });
  const unfinishedOrder = await Order.create({ order_number: `${database}-unfinished`, customer_id: recoveredUser._id, store_id: id(), items: [], subtotal: 40, total_price: 40, checkout_completed: false });
  await notifications.deliverPending();
  assert.equal(countEndpoint(recoveredDevice.endpoint), 1);
  assert.equal(await Notification.countDocuments({ event_key: `order:${recoveredOrder._id}:ready` }), 1);
  assert.equal(await Notification.countDocuments({ event_key: `order:${unfinishedOrder._id}:pending` }), 0);
  await notifications.deliverPending();
  assert.equal(countEndpoint(recoveredDevice.endpoint), 1);
  pass("The worker repairs a missed completed-order event after restart without publishing an unfinished checkout");

  const expiredUser = await customer();
  const expired404 = await subscription(expiredUser, "404");
  const expired410 = await subscription(expiredUser, "410");
  const valid = await subscription(expiredUser, "valid");
  const expiredJob = await notice(expiredUser, "expired");
  send = async (target) => {
    if (target.endpoint === expired404.endpoint) throw Object.assign(new Error("Synthetic missing endpoint"), { statusCode: 404 });
    if (target.endpoint === expired410.endpoint) throw Object.assign(new Error("Synthetic expired endpoint"), { statusCode: 410 });
    return { statusCode: 201 };
  };
  await notifications.deliverPending();
  assert.equal(await Subscription.countDocuments({ _id: { $in: [expired404._id, expired410._id] } }), 0);
  assert.equal(await Subscription.countDocuments({ _id: valid._id }), 1);
  assert.equal(countEndpoint(valid.endpoint), 1);
  assert.equal((await Notification.findById(expiredJob._id)).push_sent, true);
  pass("404/410 subscriptions are removed while remaining valid devices receive the same event");

  const suspended = await customer({ status: "suspended" });
  const disabledAfterEnqueue = await customer();
  const suspendedDevice = await subscription(suspended, "suspended");
  const disabledDevice = await subscription(disabledAfterEnqueue, "disabled");
  const suspendedJob = await notice(suspended, "suspended");
  const disabledJob = await notice(disabledAfterEnqueue, "disabled");
  await Profile.updateOne({ user_id: disabledAfterEnqueue._id }, { $set: { "settings.notifyReady": false } });
  await notifications.deliverPending();
  assert.equal(countEndpoint(suspendedDevice.endpoint), 0); assert.equal(countEndpoint(disabledDevice.endpoint), 0);
  for (const job of [suspendedJob, disabledJob]) assert.equal((await Notification.findById(job._id)).push_sent, true);
  pass("Suspended accounts and customers who disable notifications before delivery are skipped");

  const retryUser = await customer();
  const retryDevice = await subscription(retryUser, "retry");
  const retryJob = await notice(retryUser, "retry");
  send = async (target) => { if (target.endpoint === retryDevice.endpoint) throw Object.assign(new Error("Synthetic upstream unavailable"), { statusCode: 503 }); return { statusCode: 201 }; };
  await notifications.deliverPending();
  assert.equal((await Notification.findById(retryJob._id)).push_sent, false);
  assert.equal(await Subscription.countDocuments({ _id: retryDevice._id }), 1);
  send = async () => ({ statusCode: 201 });
  await notifications.deliverPending();
  assert.equal(countEndpoint(retryDevice.endpoint), 2);
  assert.equal((await Notification.findById(retryJob._id)).push_sent, true);
  await notifications.deliverPending();
  assert.equal(countEndpoint(retryDevice.endpoint), 2);
  pass("Transient upstream failures keep subscriptions and pending work, then a successful retry completes it once");

  const overlapUser = await customer();
  const overlapDevice = await subscription(overlapUser, "overlap");
  const overlapJob = await notice(overlapUser, "overlap");
  let enter; const entered = new Promise((resolve) => { enter = resolve; });
  let release; const held = new Promise((resolve) => { release = resolve; });
  send = async (target) => { if (target.endpoint === overlapDevice.endpoint) { enter(); await held; } return { statusCode: 201 }; };
  const firstWorker = notifications.deliverPending();
  await Promise.race([entered, new Promise((_, reject) => setTimeout(() => reject(new Error("Synthetic delivery was not entered")), 5000).unref())]);
  await notifications.deliverPending();
  release(); await firstWorker;
  assert.equal(countEndpoint(overlapDevice.endpoint), 1);
  assert.equal((await Notification.findById(overlapJob._id)).push_sent, true);
  pass("Overlapping timer calls in one process cannot send the same pending job concurrently");

  const fanout = await customer();
  const goodDevice = await subscription(fanout, "fanout-good");
  const flakyDevice = await subscription(fanout, "fanout-flaky");
  const fanoutJob = await notice(fanout, "fanout");
  send = async (target) => { if (target.endpoint === flakyDevice.endpoint) throw Object.assign(new Error("Synthetic partial outage"), { statusCode: 503 }); return { statusCode: 201 }; };
  await notifications.deliverPending();
  assert.equal((await Notification.findById(fanoutJob._id)).push_sent, false);
  assert.equal(countEndpoint(goodDevice.endpoint), 1); assert.equal(countEndpoint(flakyDevice.endpoint), 1);
  // Reload the service to prove successful-device receipts are durable on restart.
  delete require.cache[servicePath]; notifications = require(servicePath);
  send = async () => ({ statusCode: 201 });
  await notifications.deliverPending();
  assert.equal(countEndpoint(goodDevice.endpoint), 1, "A retry for another device must not resend to a device already acknowledged");
  assert.equal(countEndpoint(flakyDevice.endpoint), 2);
  assert.equal((await Notification.findById(fanoutJob._id)).push_sent, true);
  const receipts = (await Notification.findById(fanoutJob._id).select("+push_delivered_endpoints")).push_delivered_endpoints;
  assert.equal(receipts.length, 2);
  for (const receipt of receipts) assert.match(receipt, /^[a-f0-9]{64}$/);
  assert.equal((await Notification.findById(fanoutJob._id)).push_delivered_endpoints, undefined);
  const inbox = response(); await notifications.list({ user: fanout }, inbox);
  assert.equal(JSON.stringify(inbox.body).includes("push_delivered_endpoints"), false);
  assert.equal(JSON.stringify(inbox.body).includes(goodDevice.endpoint), false);
  pass("Partial fan-out retries only the failed device, even after a backend restart");

  const newOwner = await customer();
  await notifications.subscribe({ user: newOwner, body: { endpoint: goodDevice.endpoint, keys: goodDevice.keys.toObject() } }, response());
  const priorOwnerJob = await notice(fanout, "prior-owner");
  const newOwnerJob = await notice(newOwner, "new-owner");
  await notifications.deliverPending();
  assert.equal(countEndpoint(goodDevice.endpoint), 2);
  assert.equal(calls.filter((call) => call.subscription.endpoint === goodDevice.endpoint).at(-1).payload.tag, newOwnerJob.event_key);
  assert.equal((await Notification.findById(priorOwnerJob._id)).push_sent, true);
  assert.equal((await Notification.findById(newOwnerJob._id)).push_sent, true);
  pass("Delivery receipts remain private, and a re-bound browser receives only its new account's future events");

  const legacy = await notice(newOwner, "legacy-notice");
  await Notification.collection.updateOne({ _id: legacy._id }, { $unset: { push_delivered_endpoints: "" } });
  await notifications.deliverPending();
  assert.equal((await Notification.findById(legacy._id)).push_sent, true);
  assert.equal(countEndpoint(goodDevice.endpoint), 3);
  pass("Legacy inbox records without device receipt arrays continue to deliver");

  console.log(`${passes} Web Push groups passed. All outbound notifications were mocked; no external push was sent.`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(archiveAndClose);
