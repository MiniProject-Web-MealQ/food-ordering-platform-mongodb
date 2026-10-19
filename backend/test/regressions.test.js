const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const Menu = require("../src/models/Menu");
const Ingredient = require("../src/models/Ingredient");
const AdminActivity = require("../src/models/AdminActivity");
const merchantRoutes = require("../src/routes/merchantRoutes");
const admin = require("../src/controllers/adminController");
const { capabilities } = require("../src/controllers/authController");
const { checkoutIdentity } = require("../src/services/checkout");
const { queueSummary } = require("../src/services/queue-view");
const { priceOrderItem } = require("../src/services/order-pricing");
const { createSessionToken, COOKIE_NAME } = require("../src/services/session");

const USER = "1234567890abcdef12345678";
const STORE = "2234567890abcdef12345678";
const MENU = "3234567890abcdef12345678";
const group = { id: "extras", label: "Extras", multiple: true, required: false, options: [{ id: "egg", label: "Egg", price: 10 }] };

test("real merchant routes validate input and persist menu options and store images", async (t) => {
  const store = { _id: STORE, name: "Store", status: "active", queue: {}, async save() {} };
  t.mock.method(User, "findById", async () => ({ _id: USER, role: "merchant", status: "active", session_version: 0 }));
  t.mock.method(Store, "findOne", async () => store);
  t.mock.method(Ingredient, "exists", async () => ({ _id: MENU }));
  let created;
  t.mock.method(Menu, "create", async (fields) => { created = fields; return { _id: MENU, ...fields }; });
  t.mock.method(Menu, "findOneAndUpdate", async (_filter, fields) => ({ _id: MENU, store_id: STORE, ...fields }));
  const app = express(); app.use(express.json()); app.use("/merchant", merchantRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (method, route, body) => fetch(`http://127.0.0.1:${server.address().port}/merchant${route}`, { method, headers: { "content-type": "application/json", cookie: `${COOKIE_NAME}=${createSessionToken(USER, 60000)}` }, body: JSON.stringify(body) });
  const ingredients = [{ ingredientId: MENU, quantity: 1, unit: "portion" }];
  assert.equal((await request("POST", "/menu", { name: "Missing recipe", price: 65 })).status, 400);
  assert.equal(created, undefined);
  const response = await request("POST", "/menu", { name: "Dish", price: 65, optionGroups: [group], ingredients });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).menu.optionGroups[0].options[0].label, "Egg");
  assert.equal(created.option_groups[0].options[0].price, 10);
  assert.equal((await request("PATCH", `/menu/${MENU}`, { isAvailable: "false" })).status, 400);
  assert.equal((await request("POST", "/menu", { name: "Bad", price: null, ingredients })).status, 400);
  assert.equal((await request("PATCH", `/menu/${MENU}`, { ingredients: [] })).status, 400);
  const image = "data:image/png;base64,aGVsbG8=";
  const saved = await request("PATCH", "/store", { logo: image, coverImage: image });
  assert.equal(saved.status, 200);
  assert.match((await saved.json()).store.logo, /^\/api\/v1\/media\/store\//);
  assert.equal(store.logo, image);
  assert.equal(store.cover_image, image);
  assert.equal((await request("PATCH", "/store", { logo: {} })).status, 400);
  assert.equal((await request("PATCH", "/store", { isOpen: "false" })).status, 400);
  assert.equal((await request("PATCH", "/store", { coordinates: { latitude: 91, longitude: 0 } })).status, 400);
});

test("suspending an owner closes their stores and revokes the old session", async (t) => {
  t.mock.method(User, "findById", async () => ({ _id: USER, name: "Owner", role: "merchant" }));
  t.mock.method(User, "findByIdAndUpdate", async () => ({}));
  let closed;
  t.mock.method(Store, "updateMany", async (filter, update) => { closed = { filter, update }; });
  t.mock.method(AdminActivity, "create", async () => ({}));
  const res = { status() { return this; }, json(body) { this.body = body; } };
  await admin.updateUser({ user: { _id: MENU }, params: { id: USER }, body: { status: "suspended", reason: "Regression test" }, app: { get: () => null } }, res);
  assert.equal(res.body.ok, true);
  assert.deepEqual(closed, { filter: { owner_id: USER }, update: { $set: { is_open: false } } });
  closed = null;
  t.mock.method(Store, "exists", async () => ({ _id: STORE }));
  await admin.updateUser({ user: { _id: MENU }, params: { id: USER }, body: { role: "staff", storeId: STORE }, app: { get: () => null } }, res);
  assert.deepEqual(closed, { filter: { owner_id: USER }, update: { $set: { is_open: false } } });
});

test("queue summary keeps monotonic numbers and skips completed/cancelled queue gaps", () => {
  const queues = [
    { queue_number: 41, status: "preparing", order_id: { status: "preparing", items: [{ cook_time: 8 }] } },
    { queue_number: 43, status: "waiting", order_id: { status: "pending", items: [{ cook_time: 4 }] } },
    { queue_number: 44, status: "ready", order_id: { status: "ready", items: [] } },
    { queue_number: 45, status: "waiting", order_id: { status: "cancelled", items: [] } },
  ];
  const queue = queueSummary({ queue_sequence: 100 }, queues, 5, 100);
  assert.equal(queue.nowServing, 41);
  assert.equal(queue.nextNumber, 101);
  assert.equal(queue.activeCount, 3);
  assert.deepEqual(queue.activeNumbers, [41, 43]);
  assert.deepEqual(queue.waitMinutes, [14, 21]);
  assert.equal(queueSummary({ queue_sequence: 100 }).nowServing, null);
});

test("checkout keys are customer-scoped, validate their format and fingerprint meaningful changes", () => {
  const body = { items: [{ menuId: MENU, quantity: 1, selections: { a: ["x"], b: [] } }], paymentMethod: "wallet" };
  const req = { user: { _id: USER }, headers: { "idempotency-key": "retry-12345" }, body };
  const identity = checkoutIdentity(req);
  assert.equal(checkoutIdentity({ ...req, body: { ...body, items: [{ ...body.items[0], selections: { b: [], a: ["x"] } }] } }).fingerprint, identity.fingerprint);
  assert.notEqual(checkoutIdentity({ ...req, body: { ...body, paymentMethod: "card" } }).fingerprint, identity.fingerprint);
  assert.notEqual(checkoutIdentity({ ...req, user: { _id: MENU } }).key, identity.key);
  assert.throws(() => checkoutIdentity({ ...req, headers: { "idempotency-key": "bad key" } }), (error) => error.code === "INVALID_REQUEST_KEY");
});

test("new order items snapshot option labels and prices for immutable history", () => {
  const item = priceOrderItem({ _id: MENU, name: "Meal", price: 65, is_available: true, cook_time: 7, option_groups: [group] }, { quantity: 1, selections: { extras: ["egg"] } });
  assert.deepEqual(item.selected_options, [{ groupId: "extras", optionId: "egg", groupLabel: "Extras", label: "Egg", price: 10 }]);
  assert.equal(item.cook_time, 7);
  assert.throws(() => priceOrderItem({ _id: MENU, name: "Meal", price: 65, is_available: true, option_groups: [{ ...group, max: 0 }] }, { quantity: 1, selections: { extras: ["egg"] } }), (error) => error.code === "INVALID_OPTIONS");
});

test("production capabilities offer Wallet and never advertise unconfigured external payments", (t) => {
  const original = process.env.NODE_ENV;
  const paymentMode = process.env.PAYMENT_MODE;
  t.after(() => { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; });
  t.after(() => { if (paymentMode === undefined) delete process.env.PAYMENT_MODE; else process.env.PAYMENT_MODE = paymentMode; });
  process.env.NODE_ENV = "production";
  process.env.PAYMENT_MODE = "wallet";
  let body;
  capabilities({}, { json(value) { body = value; } });
  assert.deepEqual(body.paymentMethods, ["wallet"]);
  assert.equal(body.sandboxTopup, false);
  assert.equal(body.paymentMode, "wallet");
});
