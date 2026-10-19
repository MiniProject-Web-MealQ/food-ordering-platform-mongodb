import test from "node:test";
import assert from "node:assert/strict";
import { setCatalogue, priceCart, missingRequiredGroups, defaultSelections, nextQueueNumber, getRestaurant } from "../src/features/customer/catalog.js";
import { loadState, mapOrder, reducer } from "../src/features/customer/store.js";
import { matchPickupScan, parsePickupQr } from "../src/features/merchant/pickup-qr.js";
import { selectionLabels } from "../src/features/merchant/option-groups.js";
import { distanceMeters } from "../src/features/customer/location.js";
import { checkoutAttempt, finishCheckout } from "../src/features/customer/checkout-attempt.js";

test("checkout rounds coupons and line amounts like the server, and uses the published service fee", () => {
  setCatalogue({ restaurants: [{ id: "s", name: "Store", isOpen: true }], menus: [{ id: "m", storeId: "s", name: "Meal", price: 65, isAvailable: true }], promotions: [{ id: "p", code: "TEN", discountType: "percentage", discountValue: 10 }], config: { serviceFee: 4, acceptingOrders: true } });
  const cart = { restaurantId: "s", couponId: "p", couponCode: "TEN", items: [{ menuId: "m", qty: 1, selections: {} }] };
  const saved = [{ id: "p", code: "TEN", discountType: "percentage", discountValue: 10, collectedAt: "2026-10-19", canUse: true }];
  assert.equal(priceCart(cart, saved).total, 62.5);
  assert.equal(priceCart(cart, saved).discount, 6.5);
  setCatalogue({ restaurants: [{ id: "s", isOpen: true }], menus: [{ id: "m", storeId: "s", price: 0.333, isAvailable: true }], config: { serviceFee: 2.5, acceptingOrders: true } });
  assert.equal(priceCart({ ...cart, couponId: null, couponCode: null, items: [{ menuId: "m", qty: 3, selections: {} }] }).total, 3.49);
});

test("food options reject minimum, maximum and unavailable selections before checkout", () => {
  const group = { id: "g", required: true, multiple: true, min: 2, max: 2, options: [{ id: "a" }, { id: "b" }, { id: "c", isAvailable: false }] };
  const menu = { optionGroups: [group] };
  for (const selected of [[], ["a"], ["a", "b", "c"], ["a", "c"]]) assert.equal(missingRequiredGroups(menu, { g: selected }).length, 1);
  assert.equal(missingRequiredGroups(menu, { g: ["a", "b"] }).length, 0);
  assert.deepEqual(defaultSelections({ optionGroups: [{ ...group, multiple: false, options: [{ id: "a", default: true, isAvailable: false }] }] }), { g: [] });
  assert.equal(missingRequiredGroups({ optionGroups: [{ ...group, required: false, min: 0, max: 0 }] }, { g: ["a"] }).length, 1);
});

test("pickup QR identifies the order and refuses an ambiguous legacy numeric code", () => {
  const entries = ["A", "B"].map((order_number) => ({ order: { order_number, status: "ready" }, queue: { receive_code: "1234" } }));
  assert.ok(matchPickupScan(entries, parsePickupQr("1234")).message);
  assert.equal(matchPickupScan(entries, parsePickupQr("MEALQ:B:1234")).entry.order.order_number, "B");
  assert.equal(matchPickupScan(entries.slice(0, 1), parsePickupQr("1234")).entry.order.order_number, "A");
});

test("customer and kitchen history retain option names after a menu changes or disappears", () => {
  setCatalogue({ restaurants: [{ id: "s", name: "Store", isOpen: true, queue: { nowServing: 41, nextNumber: 45, activeNumbers: [41, 43] } }], menus: [] });
  const snapshot = [{ groupId: "g", optionId: "a", label: "Original egg", price: 10 }];
  const order = mapOrder({ id: "o", orderNumber: "A", store: { id: "s" }, items: [{ menuId: "deleted", name: "Meal", price: 75, quantity: 1, selectedOptions: snapshot }], queueNumber: 43, createdAt: new Date().toISOString() });
  assert.deepEqual(order.items[0].optionLabels, ["Original egg"]);
  assert.equal(selectionLabels({ g: ["a"] }, null, snapshot)[0].text, "Original egg");
  assert.equal(order.queuesAhead, 1);
  assert.equal(nextQueueNumber(getRestaurant("s"), []), 45);
});

test("promotion preference creates one in-app notice and order sync preserves it", () => {
  let state = loadState();
  const promotions = [{ id: "p", code: "TEN", title: "Lunch", updatedAt: "2026-10-19T00:00:00Z" }];
  assert.equal(reducer(state, { type: "promotions/sync", promotions }), state);
  state = reducer(state, { type: "settings/set", key: "promotions", value: true });
  state = reducer(state, { type: "promotions/sync", promotions });
  assert.equal(state.notifications.length, 1);
  state = reducer(state, { type: "promotions/sync", promotions });
  state = reducer(state, { type: "orders/sync", orders: [] });
  assert.equal(state.notifications.length, 1);
});

test("a checkout retry and reload retain the same key, while a changed basket gets a new key", (t) => {
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "sessionStorage", original); else delete globalThis.sessionStorage; });
  const cart = { items: [{ menuId: "m", qty: 1 }] };
  const first = checkoutAttempt(cart, "wallet", 69);
  assert.equal(checkoutAttempt(cart, "wallet", 69), first);
  assert.notEqual(checkoutAttempt(cart, "wallet", 79), first);
  const current = checkoutAttempt(cart, "wallet", 79);
  finishCheckout(current);
  assert.notEqual(checkoutAttempt(cart, "wallet", 79), current);
});

test("nearest-store distance uses coordinates and leaves unlocated stores unknown", () => {
  assert.equal(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0);
  assert.ok(Math.abs(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111195) < 10);
  assert.equal(distanceMeters(null, { latitude: 1, longitude: 1 }), null);
});
