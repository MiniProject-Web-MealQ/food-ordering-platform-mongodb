const test = require("node:test");
const assert = require("node:assert/strict");
const { menuChanges, validateOptionGroups } = require("../src/services/menu-validation");
const ingredientId = "0123456789abcdef01234567";
const recipe = [{ ingredientId, quantity: 0.125, unit: "kg" }];

test("merchant menus reject malformed prices and accidental string booleans", () => {
  for (const input of [{ name: "Meal" }, { name: {}, price: 10 }, { name: "Meal", price: null }, { name: "Meal", price: Infinity }, { name: "Meal", price: 10, isAvailable: "false" }]) {
    assert.throws(() => menuChanges({ ...input, ingredients: recipe }, true), (error) => error.code === "VALIDATION_ERROR");
  }
});

test("menu updates preserve absent fields while accepting valid option groups", () => {
  assert.deepEqual(menuChanges({ isAvailable: false }), { is_available: false });
  const group = { id: "size", label: "Size", required: true, multiple: false, options: [{ id: "normal", label: "Normal", price: 0 }] };
  const changes = menuChanges({ optionGroups: [group] });
  assert.equal(changes.option_groups[0].min, 1);
  assert.equal(changes.option_groups[0].max, 1);
  assert.throws(() => validateOptionGroups([group, group]), (error) => error.code === "VALIDATION_ERROR");
  assert.throws(() => validateOptionGroups([{ ...group, options: [group.options[0], group.options[0]] }]), (error) => error.code === "VALIDATION_ERROR");
});

test("creating a menu requires a recipe even when it is not available for sale", () => {
  for (const isAvailable of [true, false]) {
    for (const ingredients of [undefined, null, [], {}, "recipe"]) {
      assert.throws(() => menuChanges({ name: "Meal", price: 50, isAvailable, ...(ingredients !== undefined ? { ingredients } : {}) }, true), { status: 400, code: "VALIDATION_ERROR" });
    }
  }
});

test("explicit recipe removal is rejected while unrelated legacy menu patches stay supported", () => {
  for (const ingredients of [[], null, {}, "recipe"]) assert.throws(() => menuChanges({ ingredients }), { code: "VALIDATION_ERROR" });
  assert.deepEqual(menuChanges({ price: 75, isAvailable: true }), { price: 75, is_available: true });
  assert.deepEqual(menuChanges({ description: "Recipe unchanged" }), { description: "Recipe unchanged" });
});

test("valid fractional per-dish recipes round-trip without changing input and keep create defaults", () => {
  const frozenRow = Object.freeze({ ingredientId: ingredientId.toUpperCase(), quantity: 0.125, unit: " kg " });
  const ingredients = Object.freeze([frozenRow]);
  const changes = menuChanges({ name: "Rice bowl", price: 60, ingredients }, true);
  assert.deepEqual(changes.ingredients, [{ ingredient_id: ingredientId, quantity: 0.125, unit: "kg" }]);
  assert.equal(changes.category, "single");
  assert.equal(changes.is_available, true);
  assert.equal(changes.cook_time, 0);
  assert.equal(frozenRow.unit, " kg ");
  assert.deepEqual(menuChanges({ ingredients: recipe }).ingredients, [{ ingredient_id: ingredientId, quantity: 0.125, unit: "kg" }]);
  assert.equal(menuChanges({ ingredients: [{ ...recipe[0], quantity: 0.000001 }] }).ingredients[0].quantity, 0.000001);
});

test("recipe rows reject invalid IDs, units, quantities and canonical duplicate ingredient IDs", () => {
  for (const row of [null, {}, { ...recipe[0], ingredientId: "short" }, { ...recipe[0], ingredientId: 123 }, { ...recipe[0], unit: " " }, { ...recipe[0], unit: null }, ...[0, -1, 0.0000001, Infinity, NaN, "0.125", 1000001].map((quantity) => ({ ...recipe[0], quantity }))]) {
    assert.throws(() => menuChanges({ ingredients: [row] }), { code: "VALIDATION_ERROR" });
  }
  assert.throws(() => menuChanges({ ingredients: [recipe[0], { ...recipe[0], ingredientId: ingredientId.toUpperCase() }] }), { code: "VALIDATION_ERROR" });
  assert.throws(() => menuChanges({ ingredients: Array.from({ length: 101 }, () => recipe[0]) }), { code: "VALIDATION_ERROR" });
});
