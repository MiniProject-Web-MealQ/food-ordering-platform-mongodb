const test = require("node:test");
const assert = require("node:assert/strict");
const { stores, RUN_ID } = require("../scripts/catalogue-v2-manifest");
const { validateManifest, stableId } = require("../scripts/catalogue-replacement");
const { priceOrderItem } = require("../src/services/order-pricing");

test("replacement catalogue has six cuisines, four categories and 48 individually illustrated dishes", () => {
  validateManifest();
  const dishes = stores.flatMap((store) => store.menus);
  assert.equal(new Set(dishes.map((dish) => dish.image)).size, 48);
  assert.deepEqual([...new Set(dishes.map((dish) => dish.category))].sort(), ["dessert", "drink", "noodle", "single"]);
  assert.equal(new Set(stores.flatMap((store) => [store.logo, store.banner, ...store.menus.map((dish) => dish.image)])).size, 60);
  assert.equal(new Set(stores.flatMap((store) => store.menus.map((dish) => String(stableId("menu", `${store.slug}:${dish.slug}`))))).size, 48);
  assert.equal(RUN_ID, "20261019-v2");
});

test("every menu has a valid default option selection and server-computed demo price", () => {
  for (const store of stores) for (const dish of store.menus) {
    const selections = Object.fromEntries(dish.optionGroups.map((group) => [group.id, group.options.filter((option) => option.default).map((option) => option.id)]));
    const priced = priceOrderItem({ _id: stableId("menu", `${store.slug}:${dish.slug}`), name: dish.name, price: dish.price, is_available: true, option_groups: dish.optionGroups }, { quantity: 1, selections });
    assert.equal(priced.price, dish.price, dish.name);
    assert.equal(priced.total_price, dish.price, dish.name);
  }
});
