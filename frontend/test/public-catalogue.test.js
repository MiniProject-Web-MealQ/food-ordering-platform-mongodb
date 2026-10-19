import assert from "node:assert/strict";
import test from "node:test";
import { loadPublicCatalogue, mapPublicCatalogue } from "../src/features/landing/public-catalogue.js";

const stores = [
  { id: "db-closed", clientId: "tea-house", name: "ชาและขนม", status: "active", isOpen: false, coverImage: "/tea-cover.webp?v=7", logo: "/tea-logo.webp?v=7", rating: { count: 0, average: 0 }, queue: { activeCount: 0, nowServing: null } },
  { id: "db-open", clientId: "rice-bowl", name: "ข้าวญี่ปุ่น", isOpen: true, coverImage: "/rice-cover.webp?v=8", logo: "/rice-logo.webp?v=8", rating: { count: 4, average: 4.75 }, queue: { activeCount: 3, nowServing: 14 } },
];
const menus = [
  { id: "db-tea", storeId: "db-closed", name: "มัทฉะ", cuisine: "drink", category: "drink", image: "/tea.webp?v=3", isAvailable: true, price: 45 },
  { id: "db-rice", clientId: "salmon-bowl", storeId: "db-open", name: "ข้าวปลาแซลมอน", cuisine: "japanese", category: "single", image: "/salmon.webp?v=6", isAvailable: true, price: 89 },
  { id: "db-cake", storeId: "tea-house", name: "เค้ก", cuisine: "dessert", category: "dessert", image: "/cake.webp?v=2", isAvailable: false, price: 60 },
];

test("public home maps current images, canonical links, menu categories and genuine queue data", () => {
  const catalogue = mapPublicCatalogue(stores, menus);
  assert.equal(catalogue.restaurantCount, 2);
  assert.equal(catalogue.menuCount, 3);
  const [open, closed] = catalogue.restaurants;
  assert.equal(open.id, "rice-bowl");
  assert.equal(open.href, "/customer/restaurants/rice-bowl");
  assert.equal(open.coverImage, "/rice-cover.webp?v=8");
  assert.equal(open.logo, "/rice-logo.webp?v=8");
  assert.equal(open.category, "อาหารญี่ปุ่น");
  assert.equal(open.menuCount, 1);
  assert.equal(open.queueCount, 3);
  assert.equal(open.nowServing, 14);
  assert.equal(open.ratingLabel, "★ 4.8 (4 รีวิว)");
  assert.equal(closed.ratingLabel, "ยังไม่มีรีวิว");
  assert.equal(closed.nowServing, null);
  assert.equal(closed.category, "เครื่องดื่ม · ของหวาน");
  assert.equal(closed.menuCount, 2);
  assert.equal(catalogue.featured.restaurant.backendId, "db-open");
  assert.equal(catalogue.featured.menu.image, "/salmon.webp?v=6");
  assert.equal(catalogue.featured.menu.href, "/customer/restaurants/rice-bowl/menu/salmon-bowl");
});

test("removed/suspended stores and orphan menus cannot survive a catalogue refresh", () => {
  const first = mapPublicCatalogue(stores, menus);
  const refreshed = mapPublicCatalogue([{ ...stores[1], status: "suspended" }, stores[0]], [...menus, { id: "orphan", storeId: "deleted-store" }]);
  assert.equal(first.menuCount, 3);
  assert.equal(refreshed.restaurantCount, 1);
  assert.equal(refreshed.menuCount, 2);
  assert.equal(refreshed.featured.restaurant.id, "tea-house");
  assert.equal(refreshed.restaurants.some((store) => store.id === "rice-bowl"), false);
  assert.equal(mapPublicCatalogue([], menus).featured, null);
});

test("unknown queues and ratings stay unknown instead of displaying invented numbers", () => {
  const { restaurants: [store] } = mapPublicCatalogue([{ id: "a", name: "ใหม่", isOpen: true }], []);
  assert.equal(store.queueCount, null);
  assert.equal(store.nowServing, null);
  assert.equal(store.ratingLabel, "ยังไม่มีรีวิว");
  assert.equal(store.category, "อาหารและเครื่องดื่ม");
});

test("a shared public fetch validates both responses and forwards cancellation", async () => {
  const calls = [];
  const controller = new AbortController();
  const result = await loadPublicCatalogue(async (path, options) => {
    calls.push({ path, options });
    return { ok: true, data: path === "/restaurants" ? { restaurants: stores } : { menus } };
  }, controller.signal);
  assert.equal(result.ok, true);
  assert.equal(result.catalogue.menuCount, 3);
  assert.deepEqual(calls.map((call) => call.path), ["/restaurants", "/menus"]);
  assert.equal(calls.every((call) => call.options.signal === controller.signal), true);
  assert.equal((await loadPublicCatalogue(async () => ({ ok: true, data: {} }))).ok, false);
  assert.equal((await loadPublicCatalogue(async (path) => path === "/restaurants" ? { ok: true, data: { restaurants: stores } } : { ok: false })).ok, false);
  assert.equal((await loadPublicCatalogue(async () => { throw new Error("offline"); })).ok, false);
});
