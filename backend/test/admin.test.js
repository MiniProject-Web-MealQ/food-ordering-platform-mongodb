const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const Menu = require("../src/models/Menu");
const Order = require("../src/models/Order");
const Queue = require("../src/models/Queue");
const Promotion = require("../src/models/Promotion");
const Wallet = require("../src/models/Wallet");
const WalletTransaction = require("../src/models/WalletTransaction");
const AdminActivity = require("../src/models/AdminActivity");
const controller = require("../src/controllers/adminController");
const adminRoutes = require("../src/routes/adminRoutes");
const { createSessionToken, COOKIE_NAME } = require("../src/services/session");
const { verifyPassword } = require("../src/services/password");

const ADMIN_ID = "1234567890abcdef12345678";
const USER_ID = "2234567890abcdef12345678";
const STORE_ID = "3234567890abcdef12345678";
const ORDER_ID = "4234567890abcdef12345678";
const admin = { _id: ADMIN_ID, name: "Admin", email: "admin@mealq.local", role: "admin", status: "active", session_version: 0 };

function response() {
  return { code: 200, payload: null, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
}

function mockFind(t, model, rows) {
  const query = { select() { return this; }, sort() { return this; }, limit() { return this; }, async lean() { return rows; } };
  t.mock.method(model, "find", () => query);
}

test("admin snapshot never exposes password hashes, reset tokens, session versions or identity-provider ids", async (t) => {
  const createdAt = new Date("2026-10-02T00:00:00.000Z");
  mockFind(t, User, [{ ...admin, createdAt, password_hash: "secret", reset_token_hash: "token", reset_token_expires: createdAt, session_version: 12, google_id: "private", future_secret: "hidden" }]);
  mockFind(t, Store, [{ _id: STORE_ID, owner_id: USER_ID, name: "Test store", createdAt }]);
  mockFind(t, Menu, []);
  mockFind(t, Order, [{ _id: ORDER_ID, customer_id: USER_ID, store_id: STORE_ID, order_date: createdAt, createdAt, updatedAt: createdAt, total_price: 50, payment_status: "refunded" }]);
  mockFind(t, Queue, [{ _id: "5234567890abcdef12345678", order_id: ORDER_ID, queue_number: 9, receive_code: "123456" }]);
  mockFind(t, Promotion, []);
  mockFind(t, Wallet, [{ _id: "6234567890abcdef12345678", user_id: USER_ID, balance: 150, ledger_keys: ["private-key"] }]);
  mockFind(t, WalletTransaction, [{ _id: "7234567890abcdef12345678", user_id: USER_ID, type: "adjustment", direction: "debit", amount: 20, createdAt }]);
  mockFind(t, AdminActivity, []);
  const res = response();
  await controller.state({ user: admin }, res);
  for (const key of ["password_hash", "reset_token_hash", "reset_token_expires", "session_version", "google_id", "future_secret"]) assert.equal(Object.hasOwn(res.payload.users[0], key), false, key);
  assert.equal(Object.hasOwn(res.payload.wallets[0], "ledger_keys"), false);
  assert.equal(res.payload.orders[0].order_date, createdAt.getTime());
  assert.equal(res.payload.orders[0].queue.queue_number, 9);
  assert.equal(res.payload.orders[0].refund.amount, 50);
  assert.equal(res.payload.wallet_transactions[0].amount, -20);
  assert.equal(res.payload.wallet_transactions[0].type, "adjust");
});

test("an administrator awaiting their first password change sees only their own account", async () => {
  const res = response();
  await controller.state({ user: { ...admin, must_change_password: true, password_hash: "secret" } }, res);
  assert.equal(res.payload.users.length, 1);
  assert.equal(res.payload.session.must_change_password, true);
  for (const key of ["stores", "orders", "menus", "promotions", "wallets", "wallet_transactions", "activity"]) assert.deepEqual(res.payload[key], []);
  assert.equal(Object.hasOwn(res.payload.users[0], "password_hash"), false);
});

test("administrator cannot suspend or demote their own account", async () => {
  for (const body of [{ status: "suspended", reason: "test reason" }, { role: "customer" }]) {
    const res = response();
    await controller.updateUser({ user: admin, params: { id: ADMIN_ID }, body }, res);
    assert.equal(res.code, 409);
    assert.equal(res.payload.error.code, "SELF_MODIFICATION");
  }
});

test("role and status changes invalidate sessions atomically and disconnect existing sockets", async (t) => {
  const target = { _id: USER_ID, name: "Customer", role: "customer" };
  t.mock.method(User, "findById", async () => target);
  let changes;
  t.mock.method(User, "findByIdAndUpdate", async (_id, update) => { changes = update; return target; });
  let audited;
  t.mock.method(AdminActivity, "create", async (entry) => { audited = entry; return entry; });
  let disconnectedRoom;
  const io = { in(room) { disconnectedRoom = room; return { disconnectSockets(close) { assert.equal(close, true); } }; } };
  const res = response();
  await controller.updateUser({ user: admin, params: { id: USER_ID }, body: { status: "suspended", reason: "test reason" }, app: { get: () => io } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(changes.$inc, { session_version: 1 });
  assert.equal(changes.$set.status, "suspended");
  assert.equal(disconnectedRoom, `user:${USER_ID}`);
  assert.equal(audited.actor_id, ADMIN_ID);
  assert.equal(audited.action, "user.suspend");
});

test("administrator creation hashes the initial password and requires a first password change", async (t) => {
  let created;
  t.mock.method(User, "create", async (fields) => { created = fields; return { ...fields, _id: USER_ID }; });
  t.mock.method(AdminActivity, "create", async (fields) => fields);
  const res = response();
  await controller.createAdmin({ user: admin, body: { name: "New Admin", email: "NEW@mealq.local", password: "Admin123!" } }, res);
  assert.equal(res.code, 201);
  assert.equal(created.role, "admin");
  assert.equal(created.must_change_password, true);
  assert.notEqual(created.password_hash, "Admin123!");
  assert.equal(await verifyPassword("Admin123!", created.password_hash), true);
  assert.equal(Object.hasOwn(created, "password"), false);
  assert.equal(created.email, "new@mealq.local");
});

test("admin endpoints reject malformed ids, empty mutations and unsupported promotion values", async (t) => {
  for (const handler of [controller.updateStore, controller.updateUser, controller.updatePromotion, controller.cancelOrder]) {
    const res = response();
    await handler({ user: admin, params: { id: "invalid-id" }, body: {} }, res);
    assert.equal(res.code, 404);
  }
  t.mock.method(User, "findById", async () => ({ _id: USER_ID, role: "customer" }));
  const res = response();
  await controller.updateUser({ user: admin, params: { id: USER_ID }, body: {} }, res);
  assert.equal(res.code, 400);
  for (const fields of [
    { discount_value: 101 }, { minimum_order: -1 }, { start_date: "not-a-date" }, { expire_date: "2020-01-01" }, { store_id: "malformed" },
  ]) {
    const promotionRes = response();
    await controller.createPromotion({ user: admin, body: { code: "TEST10", title: "Test promotion", discount_type: "percentage", discount_value: 10, start_date: "2026-10-01", expire_date: "2026-10-31", store_id: null, is_active: true, ...fields } }, promotionRes);
    assert.equal(promotionRes.code, 400);
  }
});

test("admin routes require a signed-in admin and block mutations before a required password change", async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/admin", adminRoutes);
  t.mock.method(User, "findById", async (id) => id === ADMIN_ID ? { ...admin, must_change_password: true } : { ...admin, _id: USER_ID, role: "customer" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/admin`;
  assert.equal((await fetch(`${base}/state`)).status, 401);
  assert.equal((await fetch(`${base}/state`, { headers: { cookie: `${COOKIE_NAME}=${createSessionToken(USER_ID, 60000, 0)}` } })).status, 403);
  const cookie = `${COOKIE_NAME}=${createSessionToken(ADMIN_ID, 60000, 0)}`;
  assert.equal((await fetch(`${base}/state`, { headers: { cookie } })).status, 200);
  const mutation = await fetch(`${base}/users`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}" });
  assert.equal(mutation.status, 403);
  assert.equal((await mutation.json()).error.code, "PASSWORD_CHANGE_REQUIRED");
});
