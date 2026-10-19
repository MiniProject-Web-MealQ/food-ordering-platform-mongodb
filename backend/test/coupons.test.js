const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { couponSelection } = require("../src/services/coupon-input");
const { checkoutIdentity } = require("../src/services/checkout");
const Promotion = require("../src/models/Promotion");
const AdminActivity = require("../src/models/AdminActivity");
const admin = require("../src/controllers/adminController");

const couponId = "abcdef1234567890abcdef12";
test("coupon selection rejects non-scalars and stacking syntax before coercion", () => {
  for (const body of [{ couponId: [couponId] }, { couponId: null }, { couponId: {} }, { couponId: "" },
    { couponCode: ["SAVE10"] }, { couponCode: {} }, { couponCode: 123 },
    { couponCode: "AB" }, { couponCode: "X".repeat(21) }, { couponCode: "SAVE10,OTHER" },
    { coupons: [] }, { couponIds: [] }, { couponCodes: [] }, { promotions: [] }, { promotionIds: [] }]) {
    assert.throws(() => couponSelection(body), (error) => error.status === 400 && error.code === "INVALID_COUPON_SELECTION");
  }
  assert.deepEqual(couponSelection({ couponId: couponId.toUpperCase(), couponCode: " save10 " }), { couponId, couponCode: "SAVE10" });
  assert.deepEqual(couponSelection({ couponCode: "  " }), { couponCode: "" });
});

test("legacy null coupon codes remain an absent selection with the same checkout fingerprint", () => {
  assert.deepEqual(couponSelection({ couponCode: null }), { couponCode: "" });
  const req = { user: { _id: "user-one" }, headers: { "idempotency-key": "legacy-retry-123" }, body: { items: [{ menuId: "menu-one", quantity: 1 }], paymentMethod: "wallet" } };
  assert.equal(checkoutIdentity({ ...req, body: { ...req.body, couponCode: null } }).fingerprint, checkoutIdentity(req).fingerprint);
  assert.throws(() => couponSelection({ couponId: null, couponCode: null }), (error) => error.code === "INVALID_COUPON_SELECTION");
});

test("new coupon IDs distinguish checkout attempts while code-only requests retain the legacy fingerprint", () => {
  const body = { items: [{ menuId: "menu-one", quantity: 1, selections: {}, note: "" }], paymentMethod: "wallet", couponCode: "SAVE10", expectedTotal: 34 };
  const req = { user: { _id: "user-one" }, headers: { "idempotency-key": "coupon-retry-123" }, body };
  // The old implementation hashes a canonical body without a couponId property.
  const canonicalLegacy = { couponCode: "SAVE10", expectedTotal: 34, items: [{ menuId: "menu-one", note: "", quantity: 1, selections: {} }], paymentMethod: "wallet" };
  const legacyHash = crypto.createHash("sha256").update(JSON.stringify(canonicalLegacy)).digest("hex");
  assert.equal(checkoutIdentity(req).fingerprint, legacyHash);
  const selected = checkoutIdentity({ ...req, body: { ...body, couponId } });
  assert.notEqual(selected.fingerprint, legacyHash);
  assert.notEqual(checkoutIdentity({ ...req, body: { ...body, couponId: "bbcdef1234567890abcdef12" } }).fingerprint, selected.fingerprint);
  assert.equal(checkoutIdentity({ ...req, body: { ...body, couponId: couponId.toUpperCase(), couponCode: " save10 " } }).fingerprint, selected.fingerprint);
  assert.throws(() => checkoutIdentity({ ...req, headers: {}, body: { ...body, couponCode: ["SAVE10"] } }), (error) => error.code === "INVALID_COUPON_SELECTION");
});

test("editing promotion copy never writes stale checkout counters or claim receipts", async (t) => {
  const customer = "1234567890abcdef12345678";
  const claim = "2234567890abcdef12345678";
  const promotion = Promotion.hydrate({ _id: couponId, code: "SAVE10", title: "Original title", discount_type: "fixed", discount_value: 10,
    start_date: new Date("2026-01-01"), expire_date: new Date("2027-01-01"), is_active: true,
    used_count: 2, usage_by_customer: { [customer]: 2 }, checkout_claims: { [claim]: true } });
  t.mock.method(Promotion, "findById", async () => promotion);
  t.mock.method(AdminActivity, "create", async () => ({}));
  let update;
  t.mock.method(promotion, "save", async function() { update = this.$__delta()[1]; return this; });
  const res = { status() { return this; }, json(body) { this.body = body; } };
  await admin.updatePromotion({ params: { id: couponId }, user: { _id: customer, name: "Admin" }, body: { title: "Edited title", used_count: 0, usage_by_customer: {}, checkout_claims: {} }, app: { get() {} } }, res);
  assert.equal(res.body.ok, true);
  assert.equal(update.$set.title, "Edited title");
  for (const paths of Object.values(update)) assert.ok(Object.keys(paths).every((key) => !/^(used_count|usage_by_customer|checkout_claims)(\.|$)/.test(key)));
  // A concurrent checkout can advance these database-owned counters without the copy save resetting them.
  const database = { used_count: 3, usage_by_customer: { [customer]: 3 }, checkout_claims: { [claim]: true, newer: true } };
  Object.assign(database, update.$set);
  assert.equal(database.used_count, 3); assert.equal(database.usage_by_customer[customer], 3); assert.equal(database.checkout_claims.newer, true);
});
