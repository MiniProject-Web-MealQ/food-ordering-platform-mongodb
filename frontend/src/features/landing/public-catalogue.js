const CUISINE_LABELS = {
  thai: "อาหารไทย", japanese: "อาหารญี่ปุ่น", korean: "อาหารเกาหลี",
  fastfood: "ฟาสต์ฟู้ด", drink: "เครื่องดื่ม", dessert: "ของหวาน",
};
const CATEGORY_LABELS = { single: "จานเดียว", noodle: "เส้น", drink: "เครื่องดื่ม", dessert: "ของหวาน" };

export const EMPTY_PUBLIC_CATALOGUE = { restaurants: [], menus: [], featured: null, restaurantCount: 0, menuCount: 0 };

function identity(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function count(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function categoryLabel(menus, fallback) {
  const cuisines = [...new Set(menus.map((menu) => CUISINE_LABELS[menu.cuisine]).filter(Boolean))];
  if (cuisines.length) return cuisines.join(" · ");
  const categories = [...new Set(menus.map((menu) => CATEGORY_LABELS[menu.category]).filter(Boolean))];
  return categories.join(" · ") || fallback || "อาหารและเครื่องดื่ม";
}

/** Independent of the signed-in customer store: the public home uses the same API catalogue. */
export function mapPublicCatalogue(restaurants, menus) {
  const stores = new Map();
  for (const store of restaurants) {
    if (!store || !identity(store.id) || (store.status && store.status !== "active")) continue;
    const id = identity(store.clientId) || store.id;
    const mapped = {
      id, backendId: store.id, name: store.name || "ร้านอาหาร", href: `/customer/restaurants/${encodeURIComponent(id)}`,
      coverImage: store.coverImage || null, logo: store.logo || null, isOpen: store.isOpen === true,
      queueCount: count(store.queue?.activeCount), nowServing: count(store.queue?.nowServing),
      reviewCount: count(store.rating?.count) || 0,
      rating: typeof store.rating?.average === "number" && Number.isFinite(store.rating.average) ? store.rating.average : null,
      fallbackCategory: store.category, menus: [],
    };
    stores.set(store.id, mapped);
    if (id !== store.id) stores.set(id, mapped);
  }
  const mappedMenus = [];
  const seenMenus = new Set();
  for (const menu of menus) {
    if (!menu || !identity(menu.id) || seenMenus.has(menu.id)) continue;
    const store = stores.get(menu.storeId);
    if (!store) continue;
    seenMenus.add(menu.id);
    const id = identity(menu.clientId) || menu.id;
    const mapped = {
      id, backendId: menu.id, restaurantId: store.id, name: menu.name || "เมนูอาหาร",
      image: menu.image || null, category: menu.category, cuisine: menu.cuisine,
      isAvailable: menu.isAvailable === true,
      price: typeof menu.price === "number" && Number.isFinite(menu.price) && menu.price >= 0 ? menu.price : null,
      href: `${store.href}/menu/${encodeURIComponent(id)}`,
    };
    store.menus.push(mapped);
    mappedMenus.push(mapped);
  }
  const mappedStores = [...new Set(stores.values())].map((store) => ({
    ...store, menuCount: store.menus.length, category: categoryLabel(store.menus, store.fallbackCategory),
    ratingLabel: store.reviewCount > 0 && store.rating !== null ? `★ ${store.rating.toFixed(1)} (${store.reviewCount} รีวิว)` : "ยังไม่มีรีวิว",
  })).sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || a.name.localeCompare(b.name, "th"));
  const featuredStore = mappedStores.find((store) => store.isOpen && store.menus.some((menu) => menu.image && menu.isAvailable))
    || mappedStores.find((store) => store.menus.some((menu) => menu.image))
    || mappedStores.find((store) => store.coverImage)
    || mappedStores[0];
  const featuredMenu = featuredStore?.menus.find((menu) => menu.image && menu.isAvailable)
    || featuredStore?.menus.find((menu) => menu.image)
    || null;
  return {
    restaurants: mappedStores, menus: mappedMenus,
    featured: featuredStore ? { restaurant: featuredStore, menu: featuredMenu } : null,
    restaurantCount: mappedStores.length, menuCount: mappedMenus.length,
  };
}

/** Commit both endpoints together so a partial refresh cannot mix old stores with new menus. */
export async function loadPublicCatalogue(fetchJson, signal) {
  try {
    const [stores, food] = await Promise.all([
      fetchJson("/restaurants", { method: "GET", signal }),
      fetchJson("/menus", { method: "GET", signal }),
    ]);
    if (!stores.ok || !food.ok || !Array.isArray(stores.data?.restaurants) || !Array.isArray(food.data?.menus)) return { ok: false };
    return { ok: true, catalogue: mapPublicCatalogue(stores.data.restaurants, food.data.menus) };
  } catch {
    return { ok: false };
  }
}
