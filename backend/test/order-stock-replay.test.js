const test = require("node:test");
const assert = require("node:assert/strict");
const Menu = require("../src/models/Menu");
const Order = require("../src/models/Order");
const Store = require("../src/models/Store");
const Ingredient = require("../src/models/Ingredient");
const Queue = require("../src/models/Queue");
const SystemSettings = require("../src/models/SystemSettings");
const { checkoutIdentity } = require("../src/services/checkout");
const { createOrder } = require("../src/controllers/orderController");

const USER = "0123456789abcdef01234567";
const STORE = "1123456789abcdef01234567";
const MENU = "2123456789abcdef01234567";
const STOCK = "3123456789abcdef01234567";
const ORDER = "4123456789abcdef01234567";
function populated(value) {
  return { populate() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}
function response() {
  return { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
}
function fixture(t, fields = {}) {
  const req = { user: { _id: USER }, headers: { "idempotency-key": "concurrent-stock-replay" }, body: { items: [{ menuId: MENU, quantity: 1 }], paymentMethod: "wallet" } };
  const fingerprint = checkoutIdentity(req).fingerprint;
  const saved = { _id: ORDER, checkout_completed: true, checkout_fingerprint: fingerprint, order_number: "MQ-SYNTHETIC", store_id: { _id: STORE, name: "Synthetic shop" }, customer_id: { _id: USER, name: "Synthetic buyer" }, items: [{ menu_id: MENU, name: "Synthetic meal", price: 40, quantity: 1, total_price: 40 }], subtotal: 40, total_price: 44, payment_status: "paid", status: "pending", ...fields };
  let lookups = 0;
  t.mock.method(Order, "findOne", (query) => {
    assert.equal(query.checkout_key, `${USER}:concurrent-stock-replay`);
    return populated(++lookups === 1 ? null : saved);
  });
  t.mock.method(SystemSettings, "findById", () => ({ lean: async () => ({ accepting_orders: true, service_fee: 4 }) }));
  t.mock.method(Menu, "find", async () => [{ _id: MENU, store_id: STORE, name: "Synthetic meal", price: 40, is_available: true, ingredients: [{ ingredient_id: STOCK, quantity: 1, unit: "portion" }] }]);
  t.mock.method(Store, "findById", async () => ({ _id: STORE, name: "Synthetic shop", is_open: true, status: "active" }));
  // The first request reserved the final portion between the first lookup and this read.
  t.mock.method(Ingredient, "find", () => ({ select: () => ({ lean: async () => [{ _id: STOCK, quantity: 0, is_active: true, unit: "portion" }] }) }));
  t.mock.method(Order, "create", async () => { assert.fail("The concurrent retry must not create a second order"); });
  t.mock.method(Store, "findOneAndUpdate", async () => { assert.fail("The resolved retry must not start another checkout lock"); });
  t.mock.method(Ingredient, "findOneAndUpdate", async () => { assert.fail("The concurrent retry must not reserve stock twice"); });
  t.mock.method(Queue, "findOne", async () => null);
  return { req, saved, lookups: () => lookups };
}

test("a same-key order appearing during stock preflight replays its success instead of returning a false shortage", async (t) => {
  const run = fixture(t);
  const res = response();
  await createOrder(run.req, res);
  assert.equal(run.lookups(), 2);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.order.id, ORDER);
  assert.equal(res.body.order.paymentStatus, "paid");
});

test("a same-key order still processing preserves CHECKOUT_IN_PROGRESS for uncertain retry recovery", async (t) => {
  const run = fixture(t, { checkout_completed: false });
  const res = response();
  await createOrder(run.req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "CHECKOUT_IN_PROGRESS");
});

test("a concurrent same-key body mismatch remains an idempotency conflict rather than stock failure", async (t) => {
  const run = fixture(t, { checkout_fingerprint: "different-request-body" });
  const res = response();
  await createOrder(run.req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "IDEMPOTENCY_CONFLICT");
});

test("a genuine shortage without any same-key order retains its structured no-charge error", async (t) => {
  const run = fixture(t);
  t.mock.method(Order, "findOne", () => populated(null));
  const res = response();
  await createOrder(run.req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "OUT_OF_STOCK");
  assert.deepEqual(res.body.error.details, { shortages: [{ menuId: MENU, name: "Synthetic meal" }] });
});
