import test from "node:test";
import assert from "node:assert/strict";
import { couponEligibility, mergeCollectedCoupon, selectedCoupon } from "../src/features/customer/coupons.js";
import { COUPONS, priceCart, setCatalogue } from "../src/features/customer/catalog.js";
import { checkoutAttempt, finishCheckout, markCheckoutSubmitted, pendingSubmittedCheckout, submittedCheckout } from "../src/features/customer/checkout-attempt.js";
import { loadState, reducer } from "../src/features/customer/store.js";
import { checkoutBody } from "../src/features/customer/order-request.js";

const now = Date.parse("2026-10-19T10:00:00Z");
const coupon = (overrides = {}) => ({ id: "global", code: "LUNCH", discountType: "percentage", discountValue: 10, minimumOrder: 0, collectedAt: "2026-10-19T09:00:00Z", canUse: true, startsAt: "2026-10-18T00:00:00Z", expiresAt: "2026-10-20T00:00:00Z", ...overrides });
const basket = (overrides = {}) => ({ restaurantId: "store", couponId: null, couponCode: null, items: [{ menuId: "meal", qty: 1, selections: {} }], ...overrides });
const context = { now, subtotal: 100, restaurantIds: ["store", "store-db"] };

function catalogue(promotions = []) {
  setCatalogue({ restaurants: [{ id: "store-db", clientId: "store", name: "Store", isOpen: true }], menus: [{ id: "meal-db", clientId: "meal", storeId: "store-db", name: "Meal", price: 100, isAvailable: true }], promotions, config: { serviceFee: 5 } });
}

test("one explicit saved ID selects the right global/store coupon even when codes match", () => {
  const global = coupon();
  const scoped = coupon({ id: "scoped", storeId: "store-db", discountValue: 30 });
  catalogue([global, scoped]);
  assert.equal(Object.values(COUPONS).length, 2);
  assert.equal(priceCart(basket(), [global, scoped], now).total, 105);
  const priced = priceCart(basket({ couponId: "scoped", couponCode: "LUNCH" }), [global, scoped], now);
  assert.equal(priced.discount, 30);
  assert.equal(priced.total, 75);
  assert.equal(priced.coupon.id, "scoped");
});

test("checkout sends no null coupon fields for explicit none and only the selected scalar ID/code", () => {
  const plain = checkoutBody(basket(), "wallet", 105);
  assert.equal(Object.hasOwn(plain, "couponId"), false);
  assert.equal(Object.hasOwn(plain, "couponCode"), false);
  const selected = checkoutBody(basket({ couponId: "global", couponCode: "LUNCH" }), "wallet", 95);
  assert.equal(selected.couponId, "global");
  assert.equal(selected.couponCode, "LUNCH");
  assert.equal(selected.expectedTotal, 95);
  assert.deepEqual(selected.items, [{ menuId: "meal", quantity: 1, selections: {}, note: undefined }]);
  assert.equal(Object.hasOwn(selected, "couponIds"), false);
});

test("public or another account's coupon cannot produce a discount, and unknown selections remain blocked", () => {
  catalogue([coupon()]);
  const cart = basket({ couponId: "global", couponCode: "LUNCH" });
  const missing = priceCart(cart, [], now);
  assert.equal(missing.discount, 0);
  assert.ok(missing.couponIssue);
  assert.ok(selectedCoupon(cart, [coupon({ collectedAt: null })], context).issue);
  assert.ok(selectedCoupon({ ...cart, couponId: null }, [coupon()], context).issue);
  assert.ok(selectedCoupon({ ...cart, couponCode: "OTHER" }, [coupon()], context).issue);
});

test("store and minimum conditions use food subtotal and accept backend store identity", () => {
  assert.equal(couponEligibility(coupon({ storeId: "store-db", minimumOrder: 100 }), context).eligible, true);
  const wrongStore = couponEligibility(coupon({ storeId: "other", storeName: "ร้านอื่น" }), context);
  assert.equal(wrongStore.eligible, false);
  assert.match(wrongStore.reason, /ร้านอื่น/);
  assert.equal(couponEligibility(coupon({ minimumOrder: 105 }), context).eligible, false);
});

test("percentage/fixed discounts respect cap, subtotal and cent rounding without discounting fees", () => {
  assert.equal(couponEligibility(coupon({ discountValue: 50, maxDiscount: 12.5 }), context).discount, 12.5);
  assert.equal(couponEligibility(coupon({ discountType: "fixed", discountValue: 999 }), context).discount, 100);
  assert.equal(couponEligibility(coupon(), { ...context, subtotal: 65.55 }).discount, 6.56);
  catalogue();
  const priced = priceCart(basket({ couponId: "global", couponCode: "LUNCH" }), [coupon({ discountType: "fixed", discountValue: 999 })], now);
  assert.equal(priced.total, 5);
});

test("expiry is exclusive at the exact boundary and payment can re-evaluate a previously valid selection", () => {
  const expiring = coupon({ expiresAt: new Date(now + 1).toISOString() });
  const cart = basket({ couponId: "global", couponCode: "LUNCH" });
  assert.equal(selectedCoupon(cart, [expiring], context).discount, 10);
  const expired = selectedCoupon(cart, [expiring], { ...context, now: now + 1 });
  assert.equal(expired.discount, 0);
  assert.match(expired.issue, /หมดอายุ/);
  assert.equal(couponEligibility(coupon({ expiresAt: "invalid" }), context).eligible, false);
});

test("upcoming coupons can be saved ahead of time but cannot be redeemed until they start", () => {
  const upcoming = coupon({ startsAt: new Date(now + 1000).toISOString() });
  assert.equal(couponEligibility(upcoming, context).eligible, false);
  assert.equal(couponEligibility({ ...upcoming, collectedAt: null }, { ...context, requireSaved: false, forCollection: true }).eligible, true);
});

test("per-account and global exhaustion block usage; multiple remaining uses stay usable", () => {
  assert.equal(couponEligibility(coupon({ remainingUses: 2, perUserLimit: 3 }), context).eligible, true);
  assert.equal(couponEligibility(coupon({ remainingUses: null }), context).eligible, true);
  assert.equal(couponEligibility(coupon({ remainingUses: 0 }), context).eligible, false);
  assert.equal(couponEligibility(coupon({ remainingGlobalUses: 0 }), context).eligible, false);
  const disabled = couponEligibility(coupon({ canUse: false, unavailableReason: "ถูกปิดใช้งาน" }), context);
  assert.match(disabled.reason, /ถูกปิดใช้งาน/);
});

test("collect retries merge by canonical promotion ID, never code, without duplicating saved coupons", () => {
  const first = coupon();
  const refreshed = { ...first, remainingUses: 2 };
  const list = mergeCollectedCoupon(mergeCollectedCoupon([], first), refreshed);
  assert.equal(list.length, 1);
  assert.equal(list[0].remainingUses, 2);
  assert.equal(mergeCollectedCoupon(list, coupon({ id: "other" })).length, 2);
});

test("catalogue reconciliation preserves invalid selected coupon until the user explicitly removes or changes it", () => {
  catalogue();
  let state = { ...loadState(), cart: basket({ couponId: "deleted", couponCode: "OLD" }) };
  state = reducer(state, { type: "catalogue/reconcile" });
  assert.equal(state.cart.couponId, "deleted");
  assert.ok(priceCart(state.cart, [], now).couponIssue);
  state = reducer(state, { type: "cart/applyCoupon", id: "global", code: "LUNCH" });
  state = reducer(state, { type: "cart/applyCoupon", id: "another", code: "SECOND" });
  assert.equal(state.cart.couponId, "another");
  assert.equal(state.cart.couponCode, "SECOND");
  state = reducer(state, { type: "cart/removeCoupon" });
  assert.equal(state.cart.couponId, null);
  assert.equal(state.cart.couponCode, null);
});

test("account loading never trusts a coupon wallet stored in localStorage", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => JSON.stringify({ coupons: [coupon()] }) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "localStorage", original); else delete globalThis.localStorage; });
  assert.deepEqual(loadState("different-account").coupons, []);
});

test("idempotency distinguishes equal-price equal-code promotions by canonical ID", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "sessionStorage", original); else delete globalThis.sessionStorage; });
  const cart = basket({ couponCode: "LUNCH", couponId: "global" });
  const first = checkoutAttempt(cart, "wallet", 95);
  assert.equal(checkoutAttempt(cart, "wallet", 95), first);
  assert.notEqual(checkoutAttempt({ ...cart, couponId: "store-coupon" }, "wallet", 95), first);
});

test("order sync retains server notifications addressed with Mongo order IDs", () => {
  catalogue();
  const state = { ...loadState(), notifications: [{ id: "notice", orderId: "order-db", read: true }] };
  const next = reducer(state, { type: "orders/sync", orders: [{ id: "order-db", orderNumber: "MQ-42", store: { id: "store-db" }, items: [], createdAt: new Date(now).toISOString(), status: "pending" }] });
  assert.equal(next.notifications.length, 1);
});

test("uncertain submitted payments retain original total/key after coupon exhaustion and reload, scoped to account and basket", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "sessionStorage", original); else delete globalThis.sessionStorage; });
  const cart = basket({ couponId: "global", couponCode: "LUNCH" });
  const key = checkoutAttempt(cart, "wallet", 95, "customer-a");
  assert.equal(submittedCheckout(cart, "wallet", "customer-a"), null);
  markCheckoutSubmitted(cart, "wallet", 95, key, "customer-a");
  catalogue();
  const exhaustedTotal = priceCart(cart, [coupon({ canUse: false, remainingUses: 0 })], now).total;
  assert.equal(exhaustedTotal, 105);
  assert.equal(checkoutAttempt(cart, "wallet", exhaustedTotal, "customer-a"), key);
  assert.deepEqual(submittedCheckout(JSON.parse(JSON.stringify(cart)), "wallet", "customer-a"), { key, total: 95 });
  assert.equal(submittedCheckout(cart, "wallet", "customer-b"), null);
  assert.deepEqual(pendingSubmittedCheckout("customer-a"), { key, total: 95 });
  assert.equal(pendingSubmittedCheckout("customer-b"), null);
  assert.equal(submittedCheckout(cart, "promptpay", "customer-a"), null);
  assert.equal(submittedCheckout({ ...cart, couponId: "another" }, "wallet", "customer-a"), null);
  assert.equal(submittedCheckout({ ...cart, items: [{ menuId: "meal", qty: 2, selections: {} }] }, "wallet", "customer-a"), null);
  assert.equal(checkoutAttempt({ ...cart, couponId: null, couponCode: null }, "promptpay", 105, "customer-a"), null);
  assert.deepEqual(pendingSubmittedCheckout("customer-a"), { key, total: 95 });
  finishCheckout(key);
  assert.equal(submittedCheckout(cart, "wallet", "customer-a"), null);
  assert.notEqual(checkoutAttempt(cart, "wallet", 95, "customer-a"), key);
});
