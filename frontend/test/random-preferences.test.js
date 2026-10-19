import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_RANDOM_FILTERS, readRandomPreferences, writeRandomPreferences } from "../src/features/customer/random-preferences.js";

const KEY = "mealq.random.preferences.v1";
const defaultPreferences = () => ({ filters: { ...DEFAULT_RANDOM_FILTERS }, motionEnabled: true, soundEnabled: false });
function memoryStorage(initial = []) {
  const data = new Map(initial);
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const currentCatalogue = { cuisineIds: ["thai", "japanese", "drink"], maxBudget: 320 };

test("settings survive a reload with cuisine, budget and explicit sound/motion choices", () => {
  const storage = memoryStorage();
  const chosen = { filters: { cuisine: "japanese", budget: 190, openOnly: false, hideSoldOut: false, noRepeat: true }, motionEnabled: false, soundEnabled: true };
  assert.equal(writeRandomPreferences(chosen, { storage, ...currentCatalogue }), true);
  assert.deepEqual(readRandomPreferences({ storage, ...currentCatalogue }), chosen);
  assert.equal(JSON.parse(storage.data.get(KEY)).version, 1);
});

test("normalization permits only current cuisines, numeric budgets in range and strict booleans", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, JSON.stringify({ version: 1, filters: { cuisine: "removed-cuisine", budget: 999, openOnly: "false", hideSoldOut: 0, noRepeat: 1 }, motionEnabled: "false", soundEnabled: "true" }));
  assert.deepEqual(readRandomPreferences({ storage, ...currentCatalogue }), { ...defaultPreferences(), filters: { ...DEFAULT_RANDOM_FILTERS, budget: 320 } });
  storage.setItem(KEY, JSON.stringify({ version: 1, filters: { cuisine: "thai", budget: 23, openOnly: false, hideSoldOut: false, noRepeat: true }, motionEnabled: false, soundEnabled: true }));
  assert.deepEqual(readRandomPreferences({ storage, ...currentCatalogue }).filters, { cuisine: "thai", budget: 25, openOnly: false, hideSoldOut: false, noRepeat: true });
  storage.setItem(KEY, JSON.stringify({ version: 1, filters: { budget: -500 } }));
  assert.equal(readRandomPreferences({ storage }).filters.budget, 20);
  storage.setItem(KEY, JSON.stringify({ version: 1, filters: { budget: "90" } }));
  assert.equal(readRandomPreferences({ storage }).filters.budget, 80);
});

test("catalogue ceiling changes clamp restored settings and handle nonstep or invalid ceilings", () => {
  const storage = memoryStorage([[KEY, JSON.stringify({ version: 1, filters: { cuisine: "japanese", budget: 320 } })]]);
  assert.equal(readRandomPreferences({ storage, maxBudget: 189 }).filters.budget, 185);
  assert.equal(readRandomPreferences({ storage, maxBudget: 22 }).filters.budget, 20);
  assert.equal(readRandomPreferences({ storage, maxBudget: NaN }).filters.budget, 150);
  assert.equal(readRandomPreferences({ storage, maxBudget: Infinity }).filters.budget, 150);
  assert.equal(readRandomPreferences({ storage, maxBudget: -1 }).filters.budget, 20);
  assert.equal(readRandomPreferences({ storage }).filters.cuisine, "all");
});

test("missing, corrupt, nonobject and future-version storage falls back without deleting anything", () => {
  const storage = memoryStorage([["mealq.other.feature", "keep"]]);
  for (const raw of [null, "", "{broken", "null", "[]", "false", "1", '{"version":2,"filters":{"budget":20}}', '{"version":"1"}', '{}']) {
    if (raw === null) storage.data.delete(KEY); else storage.setItem(KEY, raw);
    assert.deepEqual(readRandomPreferences({ storage }), defaultPreferences());
    assert.equal(storage.getItem("mealq.other.feature"), "keep");
    assert.equal(storage.getItem(KEY), raw);
  }
});

test("writes whitelist only preferences, discard account/history data and do not alter other keys", () => {
  const storage = memoryStorage([["mealq.session", "unrelated-data"]]);
  const preferences = { filters: { ...DEFAULT_RANDOM_FILTERS, budget: 999, userId: "must-not-save", recentIds: ["private-menu"] }, motionEnabled: false, soundEnabled: true, user: { id: "customer" }, history: ["menu"], token: "must-not-save", version: 999 };
  assert.equal(writeRandomPreferences(preferences, { storage, ...currentCatalogue }), true);
  const saved = JSON.parse(storage.getItem(KEY));
  assert.deepEqual(saved, { version: 1, filters: { ...DEFAULT_RANDOM_FILTERS, budget: 320 }, motionEnabled: false, soundEnabled: true });
  assert.equal(storage.getItem("mealq.session"), "unrelated-data");
  assert.equal(storage.data.size, 2);
  assert.equal(preferences.filters.budget, 999);
  assert.equal(writeRandomPreferences(null, { storage }), false);
  assert.equal(writeRandomPreferences([], { storage }), false);
});

test("blocked reads, writes and quota errors degrade safely with catalogue-aware defaults", () => {
  const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); } };
  assert.deepEqual(readRandomPreferences({ storage: blocked, maxBudget: 50 }), { ...defaultPreferences(), filters: { ...DEFAULT_RANDOM_FILTERS, budget: 50 } });
  assert.equal(writeRandomPreferences(defaultPreferences(), { storage: blocked }), false);
  assert.deepEqual(readRandomPreferences({ storage: null }), defaultPreferences());
  assert.equal(writeRandomPreferences(defaultPreferences(), { storage: null }), false);
});

test("a throwing global localStorage getter is caught before access can escape", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError getter"); } });
    assert.deepEqual(readRandomPreferences({ maxBudget: 50 }), { ...defaultPreferences(), filters: { ...DEFAULT_RANDOM_FILTERS, budget: 50 } });
    assert.equal(writeRandomPreferences(defaultPreferences()), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});

test("reset can persist defaults and every read returns independent filter objects", () => {
  const storage = memoryStorage();
  writeRandomPreferences({ filters: { ...DEFAULT_RANDOM_FILTERS, cuisine: "thai", noRepeat: true }, motionEnabled: false, soundEnabled: true }, { storage, ...currentCatalogue });
  assert.equal(writeRandomPreferences(defaultPreferences(), { storage, ...currentCatalogue }), true);
  const reset = readRandomPreferences({ storage, ...currentCatalogue });
  assert.deepEqual(reset, defaultPreferences());
  reset.filters.budget = 999;
  assert.equal(readRandomPreferences({ storage }).filters.budget, 80);
  assert.equal(DEFAULT_RANDOM_FILTERS.budget, 80);
  assert.deepEqual(readRandomPreferences({ storage, cuisineIds: null, maxBudget: 50 }).filters, { ...DEFAULT_RANDOM_FILTERS, budget: 50 });
});
