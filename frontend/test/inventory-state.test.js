import assert from "node:assert/strict";
import test from "node:test";
import { createInventoryRefresh, inventoryGuide, loadInventoryCatalogue, recipeAvailability, unitNeedsReview, validateRecipeRows } from "../src/features/merchant/inventory-state.js";

const chicken = "abcdef0123456789abcdef01";
const rice = "abcdef0123456789abcdef02";
const stock = [{ id: chicken, name: "ไก่", unit: "กรัม", quantity: 1000 }, { id: rice, name: "ข้าว", unit: "100", quantity: 20 }];
const recipe = (change = {}) => ({ ingredient_id: chicken, quantity: "120.5", unit: "กรัม", ...change });
const deferred = () => { let resolve, reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };
const turn = () => new Promise((resolve) => setImmediate(resolve));

test("inventory guide joins ID references, shows recipes per dish and leaves source quantities unchanged", () => {
  const menus = [{ id: "m1", name: "ข้าวผัดไก่", ingredients: [recipe()] }, { id: "m2", name: "ไก่", ingredients: [] }, { id: "m3", name: "เมนูเดิม" }];
  const before = JSON.stringify({ stock, menus });
  const guide = inventoryGuide(stock, menus);
  assert.deepEqual(guide.ingredients[0].linkedMenus, [{ menuId: "m1", name: "ข้าวผัดไก่", quantity: "120.5", unit: "กรัม" }]);
  assert.equal(guide.ingredients[1].linkedMenus.length, 0);
  assert.equal(guide.ingredients[1].unitNeedsReview, true);
  assert.deepEqual(guide.menusWithoutRecipes.map((menu) => menu.id), ["m2", "m3"]);
  assert.equal(JSON.stringify({ stock, menus }), before);
  assert.deepEqual(inventoryGuide(null, null), { ingredients: [], menusWithoutRecipes: [] });
});

test("numeric unit diagnosis warns without rejecting a recipe or guessing a replacement", () => {
  for (const unit of ["100", " 5 ", "0.5", "-2", "1,5"]) assert.equal(unitNeedsReview(unit), true);
  for (const unit of ["กรัม", "ชิ้น", "100 กรัม", "", null]) assert.equal(unitNeedsReview(unit), false);
  assert.equal(validateRecipeRows([recipe({ unit: "100" })]), "");
});

test("menu recipes require one ingredient and reject duplicates, malformed IDs, missing units and unsafe quantities", () => {
  for (const rows of [undefined, null, [], {}, [null], [recipe({ ingredient_id: "invalid" })], [recipe({ unit: " " })], [recipe({ unit: "x".repeat(41) })]]) assert.ok(validateRecipeRows(rows));
  assert.ok(validateRecipeRows([recipe(), recipe({ ingredient_id: chicken.toUpperCase() })]));
  for (const quantity of ["", "abc", NaN, Infinity, -1, 0, 0.0000009, 1000001]) assert.ok(validateRecipeRows([recipe({ quantity })]), String(quantity));
  for (const quantity of [0.000001, "0.125", 1000000]) assert.equal(validateRecipeRows([recipe({ quantity })]), "");
  assert.equal(validateRecipeRows([recipe(), recipe({ ingredient_id: rice, unit: "100", quantity: 2 })]), "");
  assert.ok(validateRecipeRows(Array.from({ length: 101 }, () => recipe())));
});

test("recipe availability identifies deleted, inactive and changed units without rewriting unsaved rows", () => {
  const rows = [recipe(), recipe({ ingredient_id: rice, unit: "กรัม" }), recipe({ ingredient_id: "abcdef0123456789abcdef03" }), { ingredient_id: "", quantity: "7", unit: "" }];
  const before = JSON.stringify(rows);
  assert.deepEqual(recipeAvailability(rows, stock), [{ index: 1, reason: "unit" }, { index: 2, reason: "missing" }]);
  assert.deepEqual(recipeAvailability([recipe()], [{ ...stock[0], isActive: false }]), [{ index: 0, reason: "inactive" }]);
  assert.equal(JSON.stringify(rows), before);
});

test("catalogue loader reads inventory and menus together and rejects partial or malformed responses", async () => {
  const calls = [];
  const controller = new AbortController();
  const response = await loadInventoryCatalogue(async (path, options) => { calls.push({ path, options }); return { ok: true, data: path.endsWith("inventory") ? { ingredients: stock } : { menus: [] } }; }, { includeMenus: true, signal: controller.signal });
  assert.equal(response.ingredients, stock);
  assert.deepEqual(calls.map((call) => call.path), ["/merchant/inventory", "/merchant/menu"]);
  assert.ok(calls.every((call) => call.options.method === "GET" && call.options.signal === controller.signal));
  await assert.rejects(loadInventoryCatalogue(async (path) => path.endsWith("menu") ? { ok: false, error: { message: "menu unavailable" } } : { ok: true, data: { ingredients: stock } }, { includeMenus: true }), /menu unavailable/);
  await assert.rejects(loadInventoryCatalogue(async () => ({ ok: true, data: {} })), /ข้อมูลสต็อก/);
  const onlyInventory = await loadInventoryCatalogue(async () => ({ ok: true, data: { ingredients: stock } }));
  assert.deepEqual(onlyInventory.menus, []);
});

test("refresh coordinator coalesces reads and ignores superseded snapshots while retaining latest result", async () => {
  const reads = [], applied = [], failures = [], pending = [];
  let active = 0, maxActive = 0;
  const loader = createInventoryRefresh({ load: () => { active++; maxActive = Math.max(active, maxActive); const read = deferred(); reads.push(read); return read.promise.finally(() => { active--; }); }, onSuccess: (value) => applied.push(value), onError: (error) => failures.push(error), onPending: (value) => pending.push(value) });
  const first = loader.refresh();
  await turn();
  const second = loader.refresh();
  loader.refresh();
  assert.equal(reads.length, 1);
  reads[0].resolve("old");
  await turn();
  assert.equal(reads.length, 2);
  assert.deepEqual(applied, []);
  reads[1].resolve("latest");
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(maxActive, 1);
  assert.deepEqual(applied, ["latest"]);
  assert.deepEqual(failures, []);
  assert.deepEqual(pending, [true, false]);
  loader.dispose();
});

test("failed reads unlock retry and stale errors never replace a newer snapshot", async () => {
  const reads = [], applied = [], errors = [];
  const loader = createInventoryRefresh({ load: () => { const read = deferred(); reads.push(read); return read.promise; }, onSuccess: (value) => applied.push(value), onError: (error) => errors.push(error.message) });
  const first = loader.refresh(); await turn();
  loader.refresh(); reads[0].reject(new Error("stale")); await turn();
  reads[1].reject(new Error("latest failure"));
  assert.equal(await first, false);
  assert.deepEqual(errors, ["latest failure"]);
  const retry = loader.refresh(); await turn(); reads[2].resolve("retry success");
  assert.equal(await retry, true);
  assert.deepEqual(applied, ["retry success"]);
  loader.dispose();
});

test("unmount disposal aborts the in-flight read, discards queued reads and never publishes afterwards", async () => {
  const read = deferred(), events = [];
  let signal, calls = 0;
  const loader = createInventoryRefresh({ load: (value) => { calls++; signal = value; return read.promise; }, onSuccess: () => events.push("success"), onError: () => events.push("error"), onPending: (value) => events.push(value) });
  const promise = loader.refresh(); await turn(); loader.refresh(); loader.dispose();
  assert.equal(signal.aborted, true);
  read.resolve("late");
  assert.equal(await promise, false);
  assert.equal(calls, 1);
  assert.deepEqual(events, [true]);
  assert.equal(await loader.refresh(), false);
});
