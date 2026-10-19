const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../src/models/User");
const Outbox = require("../src/models/EmailOutbox");
const State = require("../src/models/EmailNotificationState");
const mail = require("../src/services/mail");
const email = require("../src/services/order-email");
const notifications = require("../src/services/notifications");

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
