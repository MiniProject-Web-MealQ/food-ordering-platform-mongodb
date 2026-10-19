// Real routes + real local SMTP, with a random localhost-only synthetic database.
// No production server is imported, so no background worker can send elsewhere.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { startTestSmtp } = require("./fixtures/smtp-inbox");
const { hashPassword } = require("../src/services/password");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const Menu = require("../src/models/Menu");
const Ingredient = require("../src/models/Ingredient");
const Order = require("../src/models/Order");
const Notification = require("../src/models/Notification");
const Outbox = require("../src/models/EmailOutbox");
const State = require("../src/models/EmailNotificationState");
const email = require("../src/services/order-email");
const notifications = require("../src/services/notifications");

const database = `mealq_order_email_${crypto.randomBytes(8).toString("hex")}`;
const password = `Synthetic-${crypto.randomBytes(20).toString("base64url")}9`;
let smtp, server, base, connected = false, store, menu, customerUser, merchantUser;
let passes = 0;
const pass = (message) => { passes++; console.log(`[PASS] ${message}`); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const id = () => new mongoose.Types.ObjectId();

function client() {
  let cookie = "";
  return async function request(method, route, body, expected = 200, key) {
    const response = await fetch(base + route, { method, headers: { Origin: "https://mealq.site", Cookie: cookie, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    for (const value of response.headers.getSetCookie()) if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
    return data;
  };
}
const guest = client(); const customer = client(); const merchant = client(); const admin = client();
async function fixtureUser(role = "customer", extra = {}) {
  return User.create({ name: "Synthetic order-email fixture", email: `${role}-${id()}@synthetic-mail.mealq.site`, role, status: "active", password_hash: await hashPassword(password), email_verified_at: new Date(), ...extra });
}
async function login(request, user) { return request("POST", "/auth/login", { email: user.email, password, portal: user.role }); }
async function waitFor(check, message) {
  const deadline = Date.now() + 4000;
  do { if (await check()) return; await delay(20); } while (Date.now() < deadline);
  assert.fail(message);
}
const jobsFor = (orderId) => Outbox.find({ order_id: orderId }).sort({ event_key: 1 });
async function flush() { await email.deliverOrderEmails({ limit: 100 }); }
async function checkout(request = customer) {
  return (await request("POST", "/orders", { items: [{ menuId: String(menu._id), quantity: 1 }], paymentMethod: "wallet" }, 201, crypto.randomUUID())).order;
}
async function syntheticOrder(user = customerUser, fields = {}) {
  return Order.create({ order_number: `EMAIL-${crypto.randomUUID()}`, customer_id: user._id, store_id: store._id, items: [{ menu_id: menu._id, name: menu.name, quantity: 1, price: menu.price, total_price: menu.price }], subtotal: menu.price, total_price: menu.price, status: "ready", payment_status: "paid", checkout_completed: true, ...fields });
}
async function optedInUser(extra = {}) {
  return fixtureUser("customer", { email_order_notifications: true, email_order_enabled_at: new Date(), email_order_generation: crypto.randomUUID(), ...extra });
}
async function directJob(user) {
  const order = await syntheticOrder(user);
  return email.enqueueOrderEmail({ order, user, role: "customer", event: "ready", eventAt: new Date(), title: "อาหารพร้อมรับแล้ว", message: "Synthetic local SMTP check", url: `/customer/orders/${order._id}`, storeName: store.name });
}

async function run() {
  const uri = new URL(process.env.ORDER_EMAIL_TEST_MONGO_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27018/mealq");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname), "Email tests refuse remote MongoDB");
  uri.pathname = `/${database}`;
  await mongoose.connect(uri.href, { serverSelectionTimeoutMS: 5000 }); connected = true;
  smtp = await startTestSmtp();
  Object.assign(process.env, smtp.env, { NODE_ENV: "development", PAYMENT_MODE: "demo", FRONTEND_URL: "https://mealq.site", SESSION_SECRET: crypto.randomUUID() });
  assert.equal(process.env.SMTP_HOST, "127.0.0.1");
  await Promise.all([User, Store, Menu, Ingredient, Order, Notification, Outbox, State].map((model) => model.init()));
  const watermark = await email.ensureEmailWatermark();
  assert.equal((await email.ensureEmailWatermark(new Date(Date.now() + 86400000))).enabled_at.getTime(), watermark.enabled_at.getTime());

  const app = express(); app.use(express.json());
  app.use("/api/v1/auth", require("../src/routes/authRoutes"));
  app.use("/api/v1/customer", require("../src/routes/customerRoutes"));
  app.use("/api/v1/merchant", require("../src/routes/merchantRoutes"));
  app.use("/api/v1/orders", require("../src/routes/orderRoutes"));
  app.use("/api/v1/admin", require("../src/routes/adminRoutes"));
  app.use((error, _req, res, _next) => { res.status(error.status || 500).json({ error: { code: error.code || "INTERNAL_ERROR", message: error.message } }); });
  server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  customerUser = await fixtureUser(); merchantUser = await fixtureUser("merchant"); const adminUser = await fixtureUser("admin");
  await login(customer, customerUser); const merchantLogin = await login(merchant, merchantUser); await login(admin, adminUser);
  store = await Store.findById(merchantLogin.store.id);
  await admin("PATCH", `/admin/stores/${store._id}`, { status: "active" });
  await merchant("PATCH", "/merchant/store", { name: "Synthetic email DEMO shop", isOpen: true, maxQueue: 30 });
  const ingredient = (await merchant("POST", "/merchant/inventory", { name: "Synthetic email portions", quantity: 1000, unit: "portion" }, 201)).ingredient;
  const dish = (await merchant("POST", "/merchant/menu", { name: 'Synthetic egg & rice <dish>', price: 40, category: "single", ingredients: [{ ingredientId: ingredient.id, quantity: 1, unit: "portion" }] }, 201)).menu;
  menu = await Menu.findById(dish.id);
  await customer("POST", "/customer/wallet/topup", { amount: 5000 }, 201, "email-fixture-topup");

  await guest("GET", "/auth/notification-preferences", undefined, 401);
  assert.equal((await customer("GET", "/auth/notification-preferences")).emailOrders, false);
  assert.equal((await merchant("GET", "/auth/notification-preferences")).emailOrders, false);
  await customer("PATCH", "/auth/notification-preferences", { emailOrders: "true" }, 400);
  assert.equal((await admin("PATCH", "/auth/notification-preferences", { emailOrders: true }, 403)).error.code, "EMAIL_ROLE_UNSUPPORTED");
  const unverified = await fixtureUser("customer", { email_verified_at: null }); const unverifiedClient = client(); await login(unverifiedClient, unverified);
  assert.equal((await unverifiedClient("PATCH", "/auth/notification-preferences", { emailOrders: true }, 400)).error.code, "EMAIL_NOT_VERIFIED");
  const reserved = await fixtureUser("customer", { email: `${id()}@mealq.invalid` }); const reservedClient = client(); await login(reservedClient, reserved);
  assert.equal((await reservedClient("PATCH", "/auth/notification-preferences", { emailOrders: true }, 400)).error.code, "EMAIL_UNDELIVERABLE");
  const host = process.env.SMTP_HOST; process.env.SMTP_HOST = "";
  assert.equal((await customer("PATCH", "/auth/notification-preferences", { emailOrders: true }, 503)).error.code, "EMAIL_UNAVAILABLE");
  process.env.SMTP_HOST = host;
  pass("Order email defaults off; authenticated preference routes enforce booleans, roles, verified/deliverable addresses and SMTP availability");

  const old = await syntheticOrder(customerUser, { createdAt: new Date(watermark.enabled_at.getTime() - 3600000), updatedAt: new Date(watermark.enabled_at.getTime() - 3600000) });
  await notifications.recordOrder(old);
  assert.equal((await jobsFor(old._id)).length, 0);
  await customer("PATCH", "/auth/notification-preferences", { emailOrders: true, user_id: String(merchantUser._id) });
  assert.equal((await User.findById(merchantUser._id)).email_order_notifications, false, "A preference mutation cannot target another account");
  await merchant("PATCH", "/auth/notification-preferences", { emailOrders: true });
  const generation = (await User.findById(customerUser._id)).email_order_generation;
  await Promise.all([customer("PATCH", "/auth/notification-preferences", { emailOrders: true }), customer("PATCH", "/auth/notification-preferences", { emailOrders: true })]);
  assert.equal((await User.findById(customerUser._id)).email_order_generation, generation);
  await notifications.recordOrder(old); await flush();
  assert.equal((await jobsFor(old._id)).length, 0); assert.equal(smtp.messages.length, 0);
  pass("First-deployment and per-user opt-in watermarks suppress historical orders; repeated enable requests keep the same generation and cannot alter another account");

  const paid = await checkout();
  await waitFor(async () => (await jobsFor(paid.id)).length === 2, "New paid order should enqueue customer paid + merchant new jobs");
  await Promise.all([flush(), flush()]);
  assert.equal(smtp.messages.length, 2);
  assert.equal(smtp.messages.filter((row) => row.recipients.includes(customerUser.email)).length, 1);
  assert.equal(smtp.messages.filter((row) => row.recipients.includes(merchantUser.email)).length, 1);
  assert.ok(smtp.messages.find((row) => row.recipients.includes(customerUser.email)).text.includes(`/customer/orders/${paid.id}`));
  assert.ok(smtp.messages.find((row) => row.recipients.includes(merchantUser.email)).text.includes(`/merchant/orders/${paid.id}`));
  assert.ok((await jobsFor(paid.id)).every((job) => job.status === "sent"));
  await flush(); assert.equal(smtp.messages.length, 2);
  pass("Real checkout sends exactly one role-specific customer paid and merchant new email; concurrent workers and normal retries do not resend sent jobs");

  for (const status of ["confirmed", "preparing", "ready"]) await merchant("PATCH", `/merchant/orders/${paid.id}/status`, { status });
  await waitFor(async () => Outbox.exists({ order_id: paid.id, event: "ready" }), "Ready job should enqueue");
  const readyDoc = await Order.findById(paid.id);
  await Promise.all([notifications.recordOrder(readyDoc), notifications.recordOrder(readyDoc)]);
  await flush();
  assert.equal(smtp.messages.length, 5);
  const current = (await merchant("GET", `/merchant/orders/${paid.id}`)).order;
  await merchant("POST", `/merchant/orders/${paid.id}/receive`, { receiveCode: current.pickupCode });
  await waitFor(async () => (await jobsFor(paid.id)).length === 7, "Pickup should add customer completed + merchant pickup jobs");
  await flush(); assert.equal(smtp.messages.length, 7);
  const paidJobs = await jobsFor(paid.id);
  assert.deepEqual(paidJobs.filter((row) => row.role === "customer").map((row) => row.event).sort(), ["paid", "confirmed", "preparing", "ready", "completed"].sort());
  assert.equal(paidJobs.filter((row) => row.role === "merchant").length, 2);
  pass("Every customer step from paid through confirmed/preparing/ready/pickup sends once; merchant events remain new and pickup only");

  const cancelled = await checkout(); await waitFor(async () => (await jobsFor(cancelled.id)).length === 2, "Cancellation fixture checkout jobs"); await flush();
  const beforeCancel = smtp.messages.length;
  await customer("PATCH", `/orders/${cancelled.id}/cancel`, { reason: "Synthetic customer cancellation" });
  await waitFor(async () => (await jobsFor(cancelled.id)).length === 4, "Customer cancellation should notify both roles");
  await customer("PATCH", `/orders/${cancelled.id}/cancel`, { reason: "Synthetic retry" });
  await flush(); assert.equal(smtp.messages.length, beforeCancel + 2);
  const merchantCancelled = await checkout(); await waitFor(async () => (await jobsFor(merchantCancelled.id)).length === 2, "Merchant-cancel checkout jobs"); await flush();
  const beforeMerchantCancel = smtp.messages.length;
  await merchant("PATCH", `/merchant/orders/${merchantCancelled.id}/status`, { status: "cancelled" });
  await waitFor(async () => (await jobsFor(merchantCancelled.id)).length === 3, "Merchant cancellation should notify customer");
  await flush(); assert.equal(smtp.messages.length, beforeMerchantCancel + 1);
  pass("Customer cancellation informs both parties once; merchant cancellation informs the customer without emailing the merchant's own action");

  await guest("GET", "/merchant/notifications", undefined, 401);
  await customer("GET", "/merchant/notifications", undefined, 403);
  await merchant("GET", "/customer/notifications", undefined, 403);
  const inbox = (await customer("GET", "/customer/notifications")).notifications;
  const privateNotice = inbox.find((row) => row.orderId === paid.id);
  assert.ok(privateNotice);
  await merchant("PATCH", `/merchant/notifications/${privateNotice.id}/read`, {});
  assert.equal((await Notification.findById(privateNotice.id)).read, false);
  const merchantInbox = (await merchant("GET", "/merchant/notifications")).notifications;
  assert.ok(merchantInbox.some((row) => row.orderId === paid.id));
  pass("Notification inboxes enforce customer/merchant role gates and cross-account read requests cannot alter another user's notification");

  const queued = await syntheticOrder(); await notifications.recordOrder(queued);
  await waitFor(async () => (await jobsFor(queued._id)).length === 1, "Synthetic ready job should enqueue for customer");
  const beforeOptOut = smtp.messages.length;
  await customer("PATCH", "/auth/notification-preferences", { emailOrders: false });
  await customer("PATCH", "/auth/notification-preferences", { emailOrders: true });
  assert.notEqual((await User.findById(customerUser._id)).email_order_generation, generation);
  await notifications.recordOrder(queued); await flush();
  assert.equal(smtp.messages.length, beforeOptOut);
  assert.equal((await jobsFor(queued._id))[0].status, "skipped");
  pass("Opt-out cancels queued mail immediately; re-enabling cannot replay old events or a previous preference generation");

  const changed = await optedInUser(); const suspended = await optedInUser(); const unverifiedLater = await optedInUser(); const changedRole = await optedInUser();
  const skippedJobs = await Promise.all([changed, suspended, unverifiedLater, changedRole].map(directJob));
  await User.updateOne({ _id: changed._id }, { $set: { email: `changed-${id()}@synthetic-mail.mealq.site` } });
  await User.updateOne({ _id: suspended._id }, { $set: { status: "suspended" } });
  await User.updateOne({ _id: unverifiedLater._id }, { $set: { email_verified_at: null } });
  await User.updateOne({ _id: changedRole._id }, { $set: { role: "staff" } });
  const beforeSkip = smtp.messages.length; await flush(); assert.equal(smtp.messages.length, beforeSkip);
  assert.equal(await Outbox.countDocuments({ _id: { $in: skippedJobs.map((job) => job._id) }, status: "skipped" }), 4);
  pass("Delivery revalidates address, verification, active status and supported role; stale recipient snapshots never send");

  const retryUser = await optedInUser(); const retry = await directJob(retryUser);
  smtp.reject(true); const now = new Date(); await email.deliverOrderEmails({ now });
  const failedOnce = await Outbox.findById(retry._id);
  assert.equal(failedOnce.status, "pending"); assert.equal(failedOnce.attempts, 1); assert.ok(failedOnce.available_at > now);
  await email.deliverOrderEmails({ now }); assert.equal((await Outbox.findById(retry._id)).attempts, 1);
  const beforeRetry = smtp.messages.length; smtp.reject(false);
  await email.deliverOrderEmails({ now: new Date(failedOnce.available_at.getTime() + 1) });
  assert.equal((await Outbox.findById(retry._id)).status, "sent"); assert.equal(smtp.messages.length, beforeRetry + 1);
  pass("A real local SMTP failure leaves a durable job; backoff prevents hot retries and a later successful attempt sends once");

  const timelineUser = await optedInUser();
  const timelineOrder = await syntheticOrder(timelineUser);
  const sameTime = new Date();
  // Reverse insertion at one timestamp exercises rank ordering as well as the
  // predecessor guard, rather than relying on ObjectId or insertion order.
  for (const status of ["ready", "preparing", "confirmed"]) {
    await email.enqueueOrderEmail({ order: { ...timelineOrder.toObject(), status }, user: timelineUser, role: "customer", event: status, eventAt: sameTime, title: status, message: "Synthetic chronological check", url: `/customer/orders/${timelineOrder._id}` });
  }
  smtp.reject(true);
  await email.deliverOrderEmails({ limit: 1 });
  const held = await Outbox.findOne({ order_id: timelineOrder._id, event: "confirmed" });
  assert.equal(held.attempts, 1); assert.equal(held.status, "pending");
  assert.equal(await Outbox.countDocuments({ order_id: timelineOrder._id, event: { $in: ["preparing", "ready"] }, attempts: 0 }), 2);
  const independent = await directJob(timelineUser);
  smtp.reject(false); await flush();
  assert.equal((await Outbox.findById(independent._id)).status, "sent", "Another order must not be blocked by this order's retry backoff");
  assert.equal(await Outbox.countDocuments({ order_id: timelineOrder._id, status: "sent" }), 0, "Later steps must wait for the earlier retry");
  await Promise.all([email.deliverOrderEmails({ limit: 100, now: new Date(held.available_at.getTime() + 1) }), email.deliverOrderEmails({ limit: 100, now: new Date(held.available_at.getTime() + 1) })]);
  const timelineMessages = smtp.messages.filter((row) => row.recipients.includes(timelineUser.email) && row.text.includes(timelineOrder.order_number));
  assert.deepEqual(timelineMessages.map((row) => row.text.match(/\n(confirmed|preparing|ready)\n/)?.[1]), ["confirmed", "preparing", "ready"]);
  assert.equal(await Outbox.countDocuments({ order_id: timelineOrder._id, status: "sent" }), 3);
  pass("Equal-time rapid stages stay chronological across retry backoff and concurrent workers, while another order continues sending");

  const terminalUser = await optedInUser(); const terminalOrder = await syntheticOrder(terminalUser);
  for (const status of ["confirmed", "ready"]) await email.enqueueOrderEmail({ order: { ...terminalOrder.toObject(), status }, user: terminalUser, role: "customer", event: status, eventAt: new Date(), title: status, url: `/customer/orders/${terminalOrder._id}` });
  const terminalHead = await Outbox.findOne({ order_id: terminalOrder._id, event: "confirmed" });
  smtp.reject(true);
  for (let attempt = 0; attempt < email.MAX_ATTEMPTS; attempt++) {
    const head = await Outbox.findById(terminalHead._id);
    await email.deliverOrderEmails({ limit: 1, now: new Date(Math.max(Date.now(), head.available_at.getTime()) + 1) });
  }
  assert.equal((await Outbox.findById(terminalHead._id)).status, "failed");
  smtp.reject(false); await flush();
  assert.equal((await Outbox.findOne({ order_id: terminalOrder._id, event: "ready" })).status, "sent");
  assert.equal((await Outbox.findById(terminalHead._id)).attempts, email.MAX_ATTEMPTS);
  pass("A terminal failed earlier step is retained for audit and does not prevent a later ready notification forever");

  const pausedUser = await optedInUser(); process.env.SMTP_HOST = "";
  const paused = await directJob(pausedUser); assert.ok(paused, "An already opted-in event must still be queued during a temporary SMTP outage");
  await flush(); assert.equal((await Outbox.findById(paused._id)).attempts, 0); process.env.SMTP_HOST = host;
  await flush(); assert.equal((await Outbox.findById(paused._id)).status, "sent");
  const exhausted = await directJob(await optedInUser()); smtp.reject(true);
  for (let attempt = 1; attempt <= email.MAX_ATTEMPTS; attempt++) { const row = await Outbox.findById(exhausted._id); await email.deliverOrderEmails({ now: new Date(Math.max(Date.now(), row.available_at.getTime()) + 1) }); }
  const exhaustedRow = await Outbox.findById(exhausted._id);
  assert.equal(exhaustedRow.status, "failed"); assert.equal(exhaustedRow.attempts, 5);
  assert.match(exhaustedRow.last_error_code, /^[A-Z0-9_]{1,50}$/);
  smtp.reject(false); await email.deliverOrderEmails({ now: new Date(Date.now() + 86400000) }); assert.equal((await Outbox.findById(exhausted._id)).attempts, 5);
  pass("Missing SMTP pauses without consuming attempts; repeated delivery errors stop after five attempts and retain only a safe error code");

  const leased = await directJob(await optedInUser()); const leaseEnd = new Date(Date.now() + email.LEASE_MS);
  await Outbox.updateOne({ _id: leased._id }, { $set: { status: "sending", lease_id: "synthetic-crashed-worker", lease_until: leaseEnd, attempts: 1 } });
  const beforeLease = smtp.messages.length; await flush(); assert.equal(smtp.messages.length, beforeLease);
  await Promise.all([email.deliverOrderEmails({ now: new Date(leaseEnd.getTime() + 1) }), email.deliverOrderEmails({ now: new Date(leaseEnd.getTime() + 1) })]);
  assert.equal(smtp.messages.length, beforeLease + 1); assert.equal((await Outbox.findById(leased._id)).status, "sent");
  pass("An active delivery lease prevents a second worker; an expired crashed lease is recovered with a single accepted send");

  const journalBase = Date.now();
  const journal = ["pending", "confirmed", "preparing", "ready", "completed"].map((status, index) => ({ status, at: new Date(journalBase + index), payment_status: "paid" }));
  const crashed = await syntheticOrder(customerUser, { status: "completed", receive_time: journal[4].at, notification_events: journal });
  assert.equal((await jobsFor(crashed._id)).length, 0);
  await notifications.recordOrder(crashed);
  await Promise.all([notifications.recordOrder(crashed), notifications.recordOrder(crashed)]);
  const recovered = await jobsFor(crashed._id);
  assert.equal(recovered.length, 7);
  const originalTimes = { paid: journal[0].at, new: journal[0].at, confirmed: journal[1].at, preparing: journal[2].at, ready: journal[3].at, completed: journal[4].at, pickup: journal[4].at };
  for (const job of recovered) assert.equal(job.event_at.getTime(), originalTimes[job.event].getTime());
  const recoveredPush = await Notification.find({ order_id: String(crashed._id) });
  assert.equal(recoveredPush.length, 2);
  assert.ok(recoveredPush.every((notice) => ["completed", "pickup"].includes(notice.kind)), "Only the current state should create a push notice after recovery");
  const beforeRepair = smtp.messages.length; await flush(); assert.equal(smtp.messages.length, beforeRepair + 7);
  pass("A committed five-stage event journal repairs a crash before outbox creation, preserves event timestamps and avoids superseded push spam");

  const oldEventTime = new Date(); await delay(3);
  const lateOptIn = await optedInUser();
  const finalEventTime = new Date();
  const mixed = await syntheticOrder(lateOptIn, { status: "completed", receive_time: finalEventTime, notification_events: [
    { status: "pending", at: oldEventTime, payment_status: "paid" },
    { status: "ready", at: oldEventTime, payment_status: "paid" },
    { status: "completed", at: finalEventTime, payment_status: "paid" },
  ] });
  await notifications.recordOrder(mixed);
  const cutoffJobs = await jobsFor(mixed._id);
  assert.deepEqual(cutoffJobs.filter((job) => job.role === "customer").map((job) => job.event), ["completed"]);
  assert.deepEqual(cutoffJobs.filter((job) => job.role === "merchant").map((job) => job.event).sort(), ["new", "pickup"]);
  await flush();
  pass("Journal recovery applies each recipient's original opt-in cutoff; a later order update never re-dates old customer emails");

  const deploymentBeforeDowntime = new Date(Date.now() - 3 * 86400000);
  await State.updateOne({ _id: "order-email-v1" }, { $set: { enabled_at: deploymentBeforeDowntime } });
  const backlogUser = await optedInUser({ email_order_enabled_at: new Date(deploymentBeforeDowntime.getTime() + 1000) });
  const staleAt = new Date(Date.now() - 25 * 3600000);
  const overdue = await syntheticOrder(backlogUser, { status: "pending", createdAt: staleAt, updatedAt: staleAt, notification_pending: true, notification_events: [{ status: "pending", at: staleAt, payment_status: "paid" }] });
  const repairedOld = await notifications.repairOrders({ limit: 1 });
  assert.deepEqual(repairedOld, { processed: 1, failed: 0 });
  assert.equal((await Order.findById(overdue._id)).notification_pending, false);
  assert.equal((await Order.findById(overdue._id)).updatedAt.getTime(), staleAt.getTime(), "Acknowledging a journal must not fabricate a new event timestamp");
  const overdueJobs = await jobsFor(overdue._id);
  assert.equal(overdueJobs.length, 1); assert.equal(overdueJobs[0].event_at.getTime(), staleAt.getTime());
  pass("A flagged event older than 24 hours survives long downtime and repairs without changing the order's original timestamp");

  const backlog = [];
  for (let index = 0; index < 3; index++) {
    const at = new Date(staleAt.getTime() + (index + 1) * 1000);
    backlog.push(await syntheticOrder(backlogUser, { status: "pending", createdAt: at, updatedAt: at, notification_pending: true, notification_events: [{ status: "pending", at, payment_status: "paid" }] }));
  }
  assert.deepEqual(await notifications.repairOrders({ limit: 2 }), { processed: 2, failed: 0 });
  assert.equal((await Order.findById(backlog[0]._id)).notification_pending, false);
  assert.equal((await Order.findById(backlog[1]._id)).notification_pending, false);
  assert.equal((await Order.findById(backlog[2]._id)).notification_pending, true);
  assert.deepEqual(await notifications.repairOrders({ limit: 2 }), { processed: 1, failed: 0 });
  assert.equal((await Order.findById(backlog[2]._id)).notification_pending, false);
  pass("Bounded oldest-first journal repair advances across the backlog instead of repeatedly scanning only recent orders");

  const oldExpanded = await syntheticOrder(backlogUser, { status: "preparing", notification_events: [
    { status: "confirmed", at: staleAt, payment_status: "paid" },
    { status: "preparing", at: new Date(staleAt.getTime() + 1), payment_status: "paid" },
  ] });
  await notifications.recordOrder(oldExpanded);
  assert.equal((await jobsFor(oldExpanded._id)).length, 0, "An older opt-in cannot backfill newly introduced stages from before this version's activation");
  const expandedAt = new Date();
  const newExpanded = await syntheticOrder(backlogUser, { status: "preparing", notification_events: [
    { status: "confirmed", at: expandedAt, payment_status: "paid" },
    { status: "preparing", at: new Date(expandedAt.getTime() + 1), payment_status: "paid" },
  ] });
  await notifications.recordOrder(newExpanded);
  assert.deepEqual((await jobsFor(newExpanded._id)).map((job) => job.event), ["confirmed", "preparing"]);
  await flush();
  pass("The new-stage activation watermark prevents historical confirmed/preparing backfill while admitting fresh stages for an existing opt-in");

  const readyAt = new Date();
  const racing = await syntheticOrder(customerUser, { status: "ready", notification_pending: true, notification_events: [{ status: "ready", at: readyAt, payment_status: "paid" }] });
  const originalEnqueue = email.enqueueOrderEmail; let appended = false;
  email.enqueueOrderEmail = async (input) => {
    const result = await originalEnqueue(input);
    if (String(input.order._id) === String(racing._id) && !appended) {
      appended = true; const at = new Date();
      await Order.updateOne({ _id: racing._id, status: "ready" }, { $set: { status: "completed", receive_time: at, notification_pending: true }, $push: { notification_events: { status: "completed", at, payment_status: "paid" } } });
    }
    return result;
  };
  try { await notifications.recordOrder(racing); } finally { email.enqueueOrderEmail = originalEnqueue; }
  assert.equal(appended, true);
  assert.equal((await Order.findById(racing._id)).notification_pending, true, "Old acknowledgement cannot clear a concurrently appended event");
  assert.deepEqual(await notifications.repairOrders({ limit: 1 }), { processed: 1, failed: 0 });
  assert.equal((await Order.findById(racing._id)).notification_pending, false);
  assert.deepEqual((await jobsFor(racing._id)).map((job) => job.event).sort(), ["completed", "pickup", "ready"]);
  pass("A transition appended while another journal snapshot enqueues cannot lose its pending marker and is repaired on the next pass");
  console.log(`${passes} order-notification groups passed with local SMTP only; no external email was sent.`);
}

async function archiveAndClose() {
  if (server) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  if (smtp) await smtp.close();
  if (!connected || mongoose.connection.readyState !== 1) return;
  assert.equal(mongoose.connection.name, database); assert.match(database, /^mealq_order_email_[a-f0-9]{16}$/);
  const collections = {};
  for (const { name } of await mongoose.connection.db.listCollections().toArray()) { const collection = mongoose.connection.db.collection(name); collections[name] = { documents: await collection.find({}).toArray(), indexes: await collection.indexes() }; }
  const directory = path.join(os.tmpdir(), "mealq-order-email-check-archives"); await fs.mkdir(directory, { recursive: true });
  const archive = path.join(directory, `${database}.json`);
  const snapshot = mongoose.mongo.BSON.EJSON.stringify({ database, syntheticOnly: true, savedAt: new Date(), collections }, null, 2);
  await fs.writeFile(archive, snapshot, { flag: "wx", mode: 0o600 });
  assert.equal(await fs.readFile(archive, "utf8"), snapshot, "Verify full synthetic data archive before dropping only the random test database");
  await mongoose.connection.dropDatabase();
  console.log(`Synthetic test database archived before cleanup: ${archive}`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try { await archiveAndClose(); } catch (error) { console.error("Cleanup failed; synthetic database retained if archive could not be verified:", error.message); process.exitCode = 1; }
  await mongoose.disconnect();
});
