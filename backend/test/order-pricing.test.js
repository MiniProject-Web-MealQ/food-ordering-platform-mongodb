const test = require("node:test");
const assert = require("node:assert/strict");
const { validateOrderInput, priceOrderItem, promotionDiscount } = require("../src/services/order-pricing");
const { createOrder, reviewMyOrder } = require("../src/controllers/orderController");

const menu = {
  _id: "menu", client_id: "meal", name: "Meal", price: 60, is_available: true,
  option_groups: [
    { id: "spice", label: "Spice", required: true, multiple: false, options: [{ id: "mild", price: 0 }, { id: "hot", price: 0 }] },
    { id: "extras", multiple: true, options: [{ id: "egg", price: 10 }, { id: "rice", price: 5 }] },
  ],
};
const item = { menuId: "meal", quantity: 2, selections: { spice: ["mild"], extras: ["egg"] }, price: 1, totalPrice: 1 };
const rejects = (fn, code) => assert.throws(fn, (error) => error.code === code);

test("checkout computes the menu and option prices from server data", () => {
  const priced = priceOrderItem(menu, item);
  assert.equal(priced.price, 70);
  assert.equal(priced.total_price, 140);
  assert.equal(priced.quantity, 2);
});

test("quantities cannot be zero, negative, fractional, strings or excessive", () => {
  for (const quantity of [0, -1, 1.5, "2", 100, NaN, Infinity]) {
    rejects(() => validateOrderInput({ items: [{ ...item, quantity }] }), "INVALID_QUANTITY");
  }
});

test("checkout rejects empty, oversized and malformed orders", () => {
  rejects(() => validateOrderInput({ items: [] }), "EMPTY_ORDER");
  rejects(() => validateOrderInput({ items: Array(51).fill(item) }), "TOO_MANY_ITEMS");
  rejects(() => validateOrderInput({ items: [{ ...item, menuId: {} }] }), "INVALID_MENU");
  rejects(() => validateOrderInput({ items: [item], paymentMethod: "free" }), "INVALID_PAYMENT_METHOD");
});

test("required and single choice groups cannot be bypassed", () => {
  rejects(() => priceOrderItem(menu, { ...item, selections: {} }), "INVALID_OPTIONS");
  rejects(() => priceOrderItem(menu, { ...item, selections: { spice: ["mild", "hot"] } }), "INVALID_OPTIONS");
});

test("unknown and repeated options cannot manipulate order pricing", () => {
  for (const selections of [
    { spice: ["mild"], extras: ["egg", "egg"] },
    { spice: ["mild"], extras: ["unknown"] },
    { spice: ["mild"], invented: [] },
    { spice: "mild" },
  ]) rejects(() => priceOrderItem(menu, { ...item, selections }), "INVALID_OPTIONS");
});

test("unavailable menu and invalid server prices reject checkout", () => {
  rejects(() => priceOrderItem({ ...menu, is_available: false }, item), "MENU_UNAVAILABLE");
  rejects(() => priceOrderItem({ ...menu, price: NaN }, item), "INVALID_MENU_PRICE");
});

const promotion = { is_active: true, start_date: new Date("2026-01-01"), expire_date: new Date("2027-01-01"), discount_type: "percentage", discount_value: 10, minimum_order: 50, usage_limit: 5, used_count: 0 };
const now = new Date("2026-10-02");

test("coupons enforce expiry, minimum order, usage and discount caps", () => {
  assert.equal(promotionDiscount(promotion, 100, now), 10);
  assert.equal(promotionDiscount({ ...promotion, max_discount: 5 }, 100, now), 5);
  assert.equal(promotionDiscount({ ...promotion, discount_type: "fixed", discount_value: 500 }, 100, now), 100);
  rejects(() => promotionDiscount(null, 100, now), "INVALID_COUPON");
  rejects(() => promotionDiscount({ ...promotion, is_active: false }, 100, now), "INVALID_COUPON");
  rejects(() => promotionDiscount({ ...promotion, expire_date: now }, 100, now), "INVALID_COUPON");
  rejects(() => promotionDiscount(promotion, 49, now), "COUPON_MINIMUM");
  rejects(() => promotionDiscount({ ...promotion, used_count: 5 }, 100, now), "COUPON_LIMIT");
});

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("production cannot report unconfigured external payment as successful", async (t) => {
  const original = process.env.NODE_ENV;
  const paymentMode = process.env.PAYMENT_MODE;
  t.after(() => { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; });
  t.after(() => { if (paymentMode === undefined) delete process.env.PAYMENT_MODE; else process.env.PAYMENT_MODE = paymentMode; });
  process.env.NODE_ENV = "production";
  process.env.PAYMENT_MODE = "wallet";
  const res = response();
  await createOrder({ body: { items: [item], paymentMethod: "promptpay" } }, res);
  assert.equal(res.statusCode, 501);
  assert.equal(res.body.error.code, "PAYMENT_NOT_CONFIGURED");
});

test("review validation rejects invalid stars before querying MongoDB", async () => {
  const res = response();
  await reviewMyOrder({ body: { rating: 6 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "INVALID_REVIEW");
});
