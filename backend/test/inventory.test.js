const test = require("node:test");
const assert = require("node:assert/strict");
const Ingredient = require("../src/models/Ingredient");
const { requirements, checkStock, assertRecipesConfigured } = require("../src/services/inventory");

const STOCK = "0123456789abcdef01234567";
const OTHER = "1123456789abcdef01234567";
const STORE = "2123456789abcdef01234567";
function selection(menuId, quantity, recipeQuantity = 0.125, ingredients) {
  return { input: { quantity }, menu: { _id: menuId, name: `Meal ${menuId}`, ingredients: ingredients || [{ ingredient_id: STOCK, quantity: recipeQuantity, unit: "kg" }] } };
}
function mockStock(t, stock) {
  const calls = [];
  t.mock.method(Ingredient, "find", (query) => { calls.push(query); return { select() { return { lean: async () => stock }; } }; });
  for (const method of ["findOneAndUpdate", "updateOne", "create"]) t.mock.method(Ingredient, method, async () => { assert.fail("Stock preflight must never write inventory"); });
  return calls;
}

test("recipe requirements aggregate shared ingredients across dish quantities and variants without float drift or mutation", () => {
  const items = [selection("a", 2), selection("b", 1, 0.25), selection("a", 1)];
  const before = structuredClone(items);
  assert.deepEqual(requirements(items), [{ ingredient_id: STOCK, quantity: 0.625, unit: "kg" }]);
  assert.deepEqual(items, before);
});

test("stock preflight checks the whole shared-ingredient basket and only returns availability", async (t) => {
  const calls = mockStock(t, [{ _id: STOCK, quantity: 0.5, unit: "kg", is_active: true }]);
  assert.deepEqual(await checkStock([selection("a", 2), selection("b", 1, 0.25)], STORE), { available: true });
  assert.deepEqual(calls, [{ _id: { $in: [STOCK] }, store_id: STORE }]);
  await assert.rejects(checkStock([selection("a", 3), selection("b", 1, 0.25)], STORE), (error) => {
    assert.equal(error.status, 409);
    assert.equal(error.code, "OUT_OF_STOCK");
    assert.deepEqual(error.details, { shortages: [{ menuId: "a", name: "Meal a" }, { menuId: "b", name: "Meal b" }] });
    return true;
  });
});

test("stock preflight rejects non-finite stored quantities instead of treating them as available", async (t) => {
  const stock = [{ _id: STOCK, quantity: NaN, unit: "kg", is_active: true }];
  mockStock(t, stock);
  for (const quantity of [NaN, Infinity, -Infinity]) {
    stock[0].quantity = quantity;
    await assert.rejects(checkStock([selection("a", 1)], STORE), { code: "OUT_OF_STOCK" });
  }
});

test("missing, inactive or unit-mismatched stock identifies affected menus once without exposing recipe amounts", async (t) => {
  mockStock(t, [{ _id: STOCK, quantity: 10, unit: "kg", is_active: false }, { _id: OTHER, quantity: 10, unit: "piece", is_active: true }]);
  const items = [selection("a", 1), selection("a", 2), selection("b", 1, 1, [{ ingredient_id: OTHER, quantity: 1, unit: "kg" }]), selection("c", 1, 1, [{ ingredient_id: "3123456789abcdef01234567", quantity: 1, unit: "piece" }])];
  await assert.rejects(checkStock(items, STORE), (error) => {
    assert.deepEqual(error.details.shortages.map((row) => row.menuId), ["a", "b", "c"]);
    for (const row of error.details.shortages) assert.deepEqual(Object.keys(row).sort(), ["menuId", "name"]);
    return error.code === "OUT_OF_STOCK";
  });
});

test("unconfigured legacy recipes fail before any inventory query and cannot silently bypass deduction", async (t) => {
  t.mock.method(Ingredient, "find", () => { assert.fail("Missing recipes must fail before querying inventory"); });
  for (const ingredients of [undefined, [], [{ ingredient_id: STOCK, quantity: 0, unit: "kg" }], [{ ingredient_id: STOCK, quantity: 0.0000001, unit: "kg" }]]) {
    const items = [{ input: { quantity: 1 }, menu: { _id: "legacy", name: "Legacy meal", ingredients } }];
    assert.throws(() => assertRecipesConfigured(items), { status: 409, code: "RECIPE_NOT_CONFIGURED" });
    await assert.rejects(checkStock(items, STORE), (error) => error.code === "RECIPE_NOT_CONFIGURED" && error.details.shortages[0].menuId === "legacy");
  }
});
