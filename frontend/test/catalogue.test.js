import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { CUISINES } from "../src/features/customer/mock-data.js";
import { getRestaurant, getRestaurantCategories, getRestaurantMenu, MENU_CATEGORIES, MENU_ITEMS, RESTAURANTS, setCatalogue } from "../src/features/customer/catalog.js";

const require = createRequire(import.meta.url);
const { stores } = require("../../backend/scripts/catalogue-v2-manifest.js");

test("published catalogue retains every store and food image with all six cuisine groups and four menu categories", () => {
  const restaurants = stores.map((store, index) => ({
    id: `db-store-${index}`, clientId: store.slug, name: store.name,
    coverImage: store.banner, logo: store.logo, isOpen: true,
  }));
  const menus = stores.flatMap((store, index) => store.menus.map((menu) => ({
    ...menu, id: `db-menu-${store.slug}-${menu.slug}`, clientId: `${store.slug}-${menu.slug}`,
    storeId: `db-store-${index}`, isAvailable: true,
  })));
  setCatalogue({ restaurants, menus });
  assert.equal(RESTAURANTS.length, 6);
  assert.equal(MENU_ITEMS.length, 48);
  assert.deepEqual(new Set(MENU_CATEGORIES.map((category) => category.id)), new Set(["single", "noodle", "drink", "dessert"]));
  for (const [index, store] of stores.entries()) {
    const restaurant = getRestaurant(store.slug);
    assert.equal(restaurant, getRestaurant(`db-store-${index}`));
    assert.equal(restaurant.category, CUISINES.find((cuisine) => cuisine.id === store.cuisine).label);
    assert.equal(restaurant.logo, store.logo);
    assert.equal(restaurant.coverImage, store.banner);
    assert.ok(getRestaurantCategories(store.slug).length > 0);
    const items = getRestaurantMenu(store.slug);
    assert.equal(items.length, 8);
    for (const item of items) {
      assert.equal(item.cuisine, store.cuisine);
      assert.equal(item.image, store.menus.find((menu) => menu.name === item.name).image);
      assert.equal(item.soldOut, false);
    }
  }
});

test("store labels follow the current menu and never classify a mixed or unknown menu as one cuisine", () => {
  const restaurants = [{ id: "db", clientId: "shop", name: "Shop" }];
  const menu = (id, cuisine, category = "single", storeId = "db") => ({ id, storeId, cuisine, category, price: 50, isAvailable: true });
  const label = (menus) => { setCatalogue({ restaurants, menus }); return getRestaurant("shop").category; };
  assert.equal(label([menu("a", "japanese", "single", "shop")]), "ญี่ปุ่น");
  assert.equal(label([menu("a", "japanese"), menu("b", "korean")]), "อาหารนานาชาติ");
  assert.equal(label([menu("a", "drink"), menu("b", "dessert")]), "เครื่องดื่มและของหวาน");
  assert.equal(label([menu("a", "thai"), menu("b", "drink")]), "อาหารและเครื่องดื่ม");
  assert.equal(label([menu("a", "thai"), menu("b", "dessert")]), "อาหารและของหวาน");
  assert.equal(label([menu("a", "unknown"), menu("b", "japanese")]), "อาหารและเครื่องดื่ม");
  assert.equal(label([menu("a", undefined)]), "อาหารและเครื่องดื่ม");
  assert.equal(label([menu("a", undefined, "drink")]), "เครื่องดื่ม");
  assert.equal(label([]), "อาหารและเครื่องดื่ม");
  assert.equal(label([menu("a", "korean")]), "เกาหลี");
});
