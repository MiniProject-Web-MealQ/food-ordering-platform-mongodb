const test = require("node:test");
const assert = require("node:assert/strict");
const { menuChanges, validateOptionGroups } = require("../src/services/menu-validation");

test("merchant menus reject malformed prices and accidental string booleans", () => {
  for (const input of [{ name: "Meal" }, { name: {}, price: 10 }, { name: "Meal", price: null }, { name: "Meal", price: Infinity }, { name: "Meal", price: 10, isAvailable: "false" }]) {
    assert.throws(() => menuChanges(input, true), (error) => error.code === "VALIDATION_ERROR");
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
