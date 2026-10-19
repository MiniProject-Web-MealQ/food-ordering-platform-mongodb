const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../src/models/User");
const Outbox = require("../src/models/EmailOutbox");
const State = require("../src/models/EmailNotificationState");
const mail = require("../src/services/mail");
const email = require("../src/services/order-email");
const notifications = require("../src/services/notifications");
const CustomerProfile = require("../src/models/CustomerProfile");
const Store = require("../src/models/Store");
const Order = require("../src/models/Order");
const Notification = require("../src/models/Notification");

test("order-email eligibility rejects unverified, reserved and header-injected recipients", () => {
  for (const address of ["alice@gmail.com", "owner@synthetic-mail.mealq.site"]) assert.equal(email.deliverableEmail(address), true);
  for (const address of [null, "test@seed.invalid", "test@mealq.local", "test@fixture.test", "test@example.com", "test@sub.example.org", "test@example", "test@127.0.0.1", "a@gmail.com\r\nBcc:other@gmail.com"]) assert.equal(email.deliverableEmail(address), false);
  const user = { status: "active", role: "customer", email: "alice@gmail.com", email_verified_at: new Date() };
  assert.equal(email.eligibleUser(user), true);
  for (const change of [{ email_verified_at: null }, { status: "suspended" }, { role: "staff" }, { email: "test@seed.invalid" }]) assert.equal(email.eligibleUser({ ...user, ...change }), false);
});

test("VAPID contact uses the public configured origin and never a localhost or local placeholder subject", (t) => {
  const oldSubject = process.env.PUSH_SUBJECT;
  const oldFrontend = process.env.FRONTEND_URL;
  t.after(() => {
    if (oldSubject === undefined) delete process.env.PUSH_SUBJECT; else process.env.PUSH_SUBJECT = oldSubject;
    if (oldFrontend === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = oldFrontend;
  });
  delete process.env.PUSH_SUBJECT;
  process.env.FRONTEND_URL = "https://mealq.site,http://localhost:5173";
  assert.equal(notifications.pushSubject(), "https://mealq.site");
  process.env.PUSH_SUBJECT = "https://localhost";
  assert.equal(notifications.pushSubject(), "https://mealq.site");
  process.env.PUSH_SUBJECT = "mailto:admin@mealq.local";
  assert.equal(notifications.pushSubject(), "https://mealq.site");
  process.env.PUSH_SUBJECT = "mailto:owner@gmail.com";
  assert.equal(notifications.pushSubject(), "mailto:owner@gmail.com");
  assert.equal(notifications.validEndpoint("https://web.push.apple.com/fixture"), true);
  assert.equal(notifications.validEndpoint("https://web.push.apple.com.attacker.invalid/fixture"), false);
});

test("each leased email gets a fresh clock and retry backoff starts after a slow SMTP attempt", async (t) => {
  const start = Date.parse("2026-10-19T00:00:00.000Z");
  let time = start;
  const user = { _id: "user", status: "active", role: "customer", name: "Fixture", email: "fixture@synthetic-mail.mealq.site", email_verified_at: new Date(start - 10000), email_order_notifications: true, email_order_generation: "generation", email_order_enabled_at: new Date(start - 10000) };
  const jobs = [1, 2].map((number) => ({ _id: `job${number}`, user_id: user._id, role: "customer", event_at: new Date(start - 1000), preference_generation: "generation", to: user.email, event_key: `event${number}`, payload: {}, attempts: 1 }));
  const leases = [];
  const updates = [];
  let sends = 0;
  t.mock.method(mail, "mailConfigured", () => true);
  t.mock.method(State, "findOneAndUpdate", async () => ({ enabled_at: new Date(start - 10000) }));
  t.mock.method(User, "findById", async () => user);
  t.mock.method(Outbox, "updateMany", async () => ({}));
  t.mock.method(Outbox, "aggregate", async () => jobs.length ? [{ _id: jobs[0]._id }] : []);
  t.mock.method(Outbox, "findOneAndUpdate", async (_filter, update) => { leases.push(update.$set.lease_until); return jobs.shift() || null; });
  t.mock.method(Outbox, "updateOne", async (filter, update) => { updates.push({ filter, update }); });
  t.mock.method(mail, "sendOrderNotificationEmail", async () => {
    sends++;
    if (sends === 1) { time += 130000; return; }
    time += 2000;
    throw Object.assign(new Error("Synthetic transport failure"), { code: "ECONNECTION" });
  });
  assert.deepEqual(await email.deliverOrderEmails({ limit: 2, now: () => new Date(time) }), { processed: 2 });
  assert.equal(leases[0].getTime(), start + email.LEASE_MS);
  assert.equal(leases[1].getTime(), start + 130000 + email.LEASE_MS);
  const retry = updates.find((entry) => entry.filter._id === "job2").update.$set;
  assert.equal(retry.status, "pending");
  assert.equal(retry.available_at.getTime(), start + 132000 + email.RETRY_MS[0]);
  assert.ok(retry.available_at.getTime() > time);
});

test("expanded customer stages respect their own deployment watermark without suppressing the existing paid backlog", async (t) => {
  const activated = new Date("2026-10-19T12:00:00Z");
  const older = new Date(activated.getTime() - 60000);
  const user = { _id: "customer", status: "active", role: "customer", email: "fixture@synthetic-mail.mealq.site", email_verified_at: older, email_order_notifications: true, email_order_enabled_at: older, email_order_generation: "generation" };
  const inserts = [];
  t.mock.method(State, "findOneAndUpdate", async ({ _id }) => ({ enabled_at: _id === email.CUSTOMER_STEPS_STATE_ID ? activated : older }));
  t.mock.method(Outbox, "findOneAndUpdate", async (_query, update) => { inserts.push(update.$setOnInsert); return update.$setOnInsert; });
  const input = { order: { _id: "order", status: "confirmed" }, user, role: "customer", event: "confirmed", eventAt: new Date(activated.getTime() - 1) };
  assert.equal(await email.enqueueOrderEmail(input), null);
  assert.equal(await email.enqueueOrderEmail({ ...input, order: { ...input.order, status: "preparing" }, event: "preparing" }), null);
  assert.ok(await email.enqueueOrderEmail({ ...input, order: { ...input.order, status: "pending" }, event: "paid" }));
  const fresh = await email.enqueueOrderEmail({ ...input, eventAt: activated, nextAction: "Wait for preparation" });
  assert.equal(fresh.payload.orderStatus, "confirmed");
  assert.equal(fresh.payload.nextAction, "Wait for preparation");
  assert.equal(fresh.payload.eventAt, activated.toISOString());
  assert.equal(inserts.length, 2);
});

test("durable five-stage journal queues every customer step while keeping merchant events and current-only pushes", async (t) => {
  const customer = { _id: "customer" };
  const merchant = { _id: "merchant" };
  const calls = []; const pushes = [];
  t.mock.method(CustomerProfile, "findOne", async () => ({ settings: { notifyReady: true } }));
  t.mock.method(User, "findById", async () => customer);
  t.mock.method(User, "findOne", async () => merchant);
  t.mock.method(Store, "findById", async () => ({ name: "Fixture kitchen", owner_id: merchant._id }));
  t.mock.method(Notification, "updateOne", async (query) => { pushes.push(query); });
  t.mock.method(Order, "updateOne", async () => ({}));
  t.mock.method(email, "enqueueOrderEmail", async (input) => { calls.push(input); });
  t.mock.method(email, "ensureEmailWatermark", async () => ({ enabled_at: new Date(0) }));
  const statuses = ["pending", "confirmed", "preparing", "ready", "completed"];
  const journal = statuses.map((status, index) => ({ status, at: new Date(1000 + index), payment_status: "paid" }));
  await notifications.recordOrder({ _id: "order", order_number: "MQ-TEST", customer_id: customer._id, store_id: "store", status: "completed", checkout_completed: true, notification_pending: true, notification_events: journal });
  assert.deepEqual(calls.filter((input) => input.role === "customer").map((input) => input.event), ["paid", "confirmed", "preparing", "ready", "completed"]);
  assert.deepEqual(calls.filter((input) => input.role === "merchant").map((input) => input.event), ["new", "pickup"]);
  assert.match(calls.find((input) => input.event === "preparing").nextAction, /รอแจ้งเตือนอาหารพร้อมรับ/);
  assert.equal(pushes.length, 2);
  assert.ok(pushes.every((input) => input.event_key.includes(":completed")));
});

test("outbox claim excludes earlier unfinished events for the same recipient/order/role, then claims atomically", async (t) => {
  let pipeline; let claim;
  t.mock.method(mail, "mailConfigured", () => true);
  t.mock.method(Outbox, "updateMany", async () => ({}));
  t.mock.method(Outbox, "aggregate", async (input) => { pipeline = input; return [{ _id: "head" }]; });
  t.mock.method(Outbox, "findOneAndUpdate", async (query) => { claim = query; return null; });
  assert.deepEqual(await email.deliverOrderEmails({ limit: 1 }), { processed: 0 });
  const lookup = pipeline.find((step) => step.$lookup).$lookup;
  assert.equal(lookup.from, Outbox.collection.name);
  assert.deepEqual(lookup.let.recipient, "$user_id");
  assert.deepEqual(lookup.let.order, "$order_id");
  assert.deepEqual(lookup.let.role, "$role");
  assert.match(JSON.stringify(lookup.pipeline), /pending.*sending/);
  assert.doesNotMatch(JSON.stringify(lookup.pipeline), /available_at|lease_until/);
  assert.equal(claim._id, "head");
  assert.equal(claim.attempts.$lt, email.MAX_ATTEMPTS);
});
