import assert from "node:assert/strict";
import test from "node:test";
import { chooseRandomCandidate, filterRandomCandidates, getRandomBudgetMax, getRecentMenuIds } from "../src/features/customer/random-food.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 19, 12);
const stores = new Map([
  ["open", { id: "open", isOpen: true }],
  ["closed", { id: "closed", isOpen: false }],
]);
const restaurant = (id) => stores.get(id);
const menus = [
  { id: "rice", backendId: "db-rice", restaurantId: "open", cuisine: "thai", price: 65, soldOut: false },
  { id: "ramen", backendId: "db-ramen", restaurantId: "open", cuisine: "japanese", price: 189, soldOut: false },
  { id: "tea", backendId: "db-tea", restaurantId: "closed", cuisine: "drink", price: 45, soldOut: false },
  { id: "cake", backendId: "db-cake", restaurantId: "open", cuisine: "dessert", price: 80, soldOut: true },
  { id: "free", backendId: "db-free", restaurantId: "open", cuisine: "drink", price: 0, soldOut: false },
];

test("seven-day history includes the cutoff, excludes cancelled/future/old orders and matches API aliases", () => {
  const orders = [
    { status: "PICKED_UP", statusTimes: { PLACED: NOW - 7 * DAY_MS }, items: [{ menuId: "rice" }] },
    { status: "pending", createdAt: new Date(NOW - DAY_MS).toISOString(), items: [{ menuId: "db-ramen", clientMenuId: "ramen" }] },
    { status: "READY", createdAt: new Date(NOW), items: [{ backendId: "db-tea" }] },
    { status: "CANCELLED", createdAt: NOW, items: [{ menuId: "cancelled" }] },
    { status: "cancelled", createdAt: NOW, items: [{ menuId: "cancelled-api" }] },
    { createdAt: NOW - 7 * DAY_MS - 1, items: [{ menuId: "old" }] },
    { createdAt: NOW + 1, items: [{ menuId: "future" }] },
  ];
  assert.deepEqual([...getRecentMenuIds(orders, NOW)].sort(), ["db-ramen", "db-tea", "ramen", "rice"]);
});

test("malformed history cannot block random selection or invent a recently eaten menu", () => {
  const malformed = [null, false, {}, { items: null }, { createdAt: "not-a-date", items: [{ menuId: "bad" }] },
    { createdAt: NOW, items: [null, {}, { menuId: "" }, { menuId: {} }, { menuId: "ok" }] }];
  assert.deepEqual([...getRecentMenuIds(malformed, new Date(NOW))], ["ok"]);
  assert.equal(getRecentMenuIds(undefined, NOW).size, 0);
  assert.equal(getRecentMenuIds(malformed, "invalid").size, 0);
});

test("real catalogue filters compose cuisine, inclusive budget, open stores and availability", () => {
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { cuisine: "thai", budget: 65, openOnly: true, hideSoldOut: true }), [menus[0]]);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { budget: 80, openOnly: true, hideSoldOut: true }), [menus[0], menus[4]]);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { budget: 0 }), [menus[4]]);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { cuisine: "all", budget: 45 }), [menus[2], menus[4]]);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { cuisine: "japanese", budget: 188 }), []);
  assert.deepEqual(filterRandomCandidates(menus, restaurant), menus);
});

test("deleted stores, bad identities and unsafe prices never enter the pool", () => {
  const invalid = [null, {}, { ...menus[0], id: "", backendId: "" }, { ...menus[0], restaurantId: "missing" },
    { ...menus[0], restaurantId: null }, { ...menus[0], price: NaN }, { ...menus[0], price: Infinity },
    { ...menus[0], price: -1 }, { ...menus[0], price: "65" }];
  const backendOnly = { ...menus[0], id: undefined };
  assert.deepEqual(filterRandomCandidates([...invalid, backendOnly], restaurant), [backendOnly]);
  assert.deepEqual(filterRandomCandidates(menus, undefined), []);
  assert.deepEqual(filterRandomCandidates(null, restaurant), []);
  assert.deepEqual(filterRandomCandidates(menus, () => "not a restaurant"), []);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { budget: NaN }), []);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { budget: -1 }), []);
});

test("no-repeat recognizes client or database menu IDs and can be disabled", () => {
  const recent = new Set(["db-rice", "ramen"]);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { noRepeat: true }, recent), menus.slice(2));
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { noRepeat: false }, recent), menus);
  assert.deepEqual(filterRandomCandidates(menus, restaurant, { noRepeat: true }, null), menus);
  assert.equal(recent.size, 2);
});

test("random selection avoids the previous menu through either identity without mutating the pool", () => {
  const original = [...menus];
  assert.equal(chooseRandomCandidate(menus, "rice", () => 0), menus[1]);
  assert.equal(chooseRandomCandidate(menus, "db-rice", () => 0), menus[1]);
  assert.equal(chooseRandomCandidate(menus, null, () => 0.99), menus[4]);
  assert.equal(chooseRandomCandidate(menus, null, () => 1), menus[4]);
  assert.equal(chooseRandomCandidate(menus, null, () => -1), menus[0]);
  assert.equal(chooseRandomCandidate(menus, null, () => NaN), menus[0]);
  assert.equal(chooseRandomCandidate([menus[0]], "rice", () => 0), menus[0]);
  assert.equal(chooseRandomCandidate([], null), null);
  assert.equal(chooseRandomCandidate(undefined, null), null);
  assert.deepEqual(menus, original);
});

test("budget ceiling follows high-priced real items, rounds by the step and ignores malformed prices", () => {
  assert.equal(getRandomBudgetMax(menus), 190);
  assert.equal(getRandomBudgetMax([{ price: 320 }, { price: 190 }]), 320);
  assert.equal(getRandomBudgetMax([{ price: 151 }], 100, 25), 175);
  assert.equal(getRandomBudgetMax([{ price: 0 }]), 150);
  assert.equal(getRandomBudgetMax([{}, null, { price: -1 }, { price: NaN }, { price: Infinity }, { price: "900" }]), 150);
  assert.equal(getRandomBudgetMax(undefined), 150);
  assert.equal(getRandomBudgetMax([], NaN, 0), 150);
  assert.equal(Number.isFinite(getRandomBudgetMax([{ price: Number.MAX_VALUE }])), true);
});
