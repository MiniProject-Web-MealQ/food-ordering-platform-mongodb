import { CUISINES, MENU_CATEGORIES as KNOWN_CATEGORIES, SERVICE_FEE } from "./mock-data.js";
import { couponLabel, selectedCoupon } from "./coupons.js";

export const RESTAURANTS = [];
export const MENU_ITEMS = [];
export const MENU_CATEGORIES = [];
export const COUPONS = {};
export const CONFIG = { serviceFee: SERVICE_FEE, acceptingOrders: true };
const restaurantsById = new Map();
const menuById = new Map();

function restaurantCategory(menus, fallback) {
  if (menus.length === 0) return fallback || "อาหารและเครื่องดื่ม";
  const cuisines = new Set(menus.map((menu) => menu.cuisine || ({ drink: "drink", dessert: "dessert" }[menu.category])));
  if ([...cuisines].some((id) => !CUISINES.some((cuisine) => cuisine.id === id))) return "อาหารและเครื่องดื่ม";
  if (cuisines.size === 1) return CUISINES.find((cuisine) => cuisines.has(cuisine.id)).label;
  if ([...cuisines].every((id) => id === "drink" || id === "dessert")) return "เครื่องดื่มและของหวาน";
  if (cuisines.has("drink")) return "อาหารและเครื่องดื่ม";
  if (cuisines.has("dessert")) return "อาหารและของหวาน";
  return "อาหารนานาชาติ";
}

/** Keeps existing page lookups synchronous while the provider loads the current server catalogue. */
export function setCatalogue({ restaurants, menus, promotions = [], config }) {
  if (config) Object.assign(CONFIG, config);
  restaurantsById.clear();
  menuById.clear();
  const menusByStore = new Map();
  for (const menu of menus) {
    if (!menusByStore.has(menu.storeId)) menusByStore.set(menu.storeId, []);
    menusByStore.get(menu.storeId).push(menu);
  }
  const mappedRestaurants = restaurants.map((store) => ({
    id: store.clientId || store.id,
    backendId: store.id,
    name: store.name,
    category: restaurantCategory([
      ...(menusByStore.get(store.id) || []),
      ...(store.clientId && store.clientId !== store.id ? menusByStore.get(store.clientId) || [] : []),
    ], store.category),
    rating: Number(store.rating?.average || 0),
    reviewCount: Number(store.rating?.count || 0),
    location: store.address?.detail || "รับอาหารที่หน้าร้าน",
    pickupPoint: store.pickupPoint || "หน้าร้าน",
    distance: null,
    coordinates: store.coordinates || null,
    hours: { open: store.openingHours?.open_time || "—", close: store.openingHours?.close_time || "—" },
    isOpen: store.isOpen,
    queueLength: Number(store.queue?.activeCount || 0),
    nowServing: store.queue?.nowServing ?? null,
    nextNumber: store.queue?.nextNumber ?? null,
    activeNumbers: store.queue?.activeNumbers || [],
    waitMinutes: store.queue?.waitMinutes || [5, 10],
    phone: store.phone || "—",
    about: store.description || "",
    coverImage: store.coverImage,
    logo: store.logo,
    reviews: [],
  }));
  for (const store of mappedRestaurants) {
    restaurantsById.set(store.id, store);
    restaurantsById.set(store.backendId, store);
  }
  RESTAURANTS.splice(0, RESTAURANTS.length, ...mappedRestaurants);
  const mappedMenus = menus.flatMap((menu) => {
    const store = restaurantsById.get(menu.storeId);
    if (!store) return [];
    return [{
      id: menu.clientId || menu.id,
      backendId: menu.id,
      restaurantId: store.id,
      name: menu.name,
      shortLabel: menu.name,
      description: menu.description || "",
      category: menu.category,
      cuisine: menu.cuisine || ({ single: "thai", noodle: "thai", drink: "drink", dessert: "dessert" }[menu.category] || "thai"),
      price: Number(menu.price || 0),
      image: menu.image,
      rating: store.rating,
      reviewCount: store.reviewCount,
      weeklyOrders: Number(menu.weeklyOrders || 0),
      prepMinutes: Number(menu.cookTime || 5),
      allergens: menu.allergens || [],
      optionGroups: menu.optionGroups || [],
      soldOut: !menu.isAvailable,
    }];
  });
  for (const menu of mappedMenus) {
    menuById.set(menu.id, menu);
    menuById.set(menu.backendId, menu);
  }
  MENU_ITEMS.splice(0, MENU_ITEMS.length, ...mappedMenus);
  const categories = [...new Set(mappedMenus.map((menu) => menu.category))].map((id) =>
    KNOWN_CATEGORIES.find((category) => category.id === id) || { id, label: id, emoji: "🍽️" },
  );
  MENU_CATEGORIES.splice(0, MENU_CATEGORIES.length, ...categories);
  for (const id of Object.keys(COUPONS)) delete COUPONS[id];
  for (const promotion of promotions) COUPONS[promotion.id] = {
    ...promotion,
    restaurantId: promotion.storeId ? restaurantsById.get(promotion.storeId)?.id || promotion.storeId : null,
    storeName: promotion.storeName || restaurantsById.get(promotion.storeId)?.name || null,
    label: couponLabel(promotion),
  };
}

/** An order retains its store identity even when a store is no longer in the public catalogue. */
export function getOrderRestaurant(order) {
  return getRestaurant(order.restaurantId) || {
    id: order.restaurantId, name: order.restaurantName || "ร้านอาหาร", pickupPoint: "หน้าร้าน",
    waitMinutes: order.etaMinutes || [5, 10], nowServing: order.nowServing || 0,
  };
}

export function getRestaurant(id) {
  return restaurantsById.get(id) ?? null;
}

export function getMenuItem(id) {
  return menuById.get(id) ?? null;
}

export function getRestaurantMenu(restaurantId) {
  return MENU_ITEMS.filter((m) => m.restaurantId === restaurantId);
}

/** Categories a restaurant sells, derived from its menu so the two never disagree. */
export function getRestaurantCategories(restaurantId) {
  const ids = new Set(getRestaurantMenu(restaurantId).map((m) => m.category));
  return MENU_CATEGORIES.filter((c) => ids.has(c.id));
}

export function getWeeklyBestsellers(limit = 6) {
  return MENU_ITEMS.filter((m) => !m.soldOut && getRestaurant(m.restaurantId)?.isOpen)
    .toSorted((a, b) => b.weeklyOrders - a.weeklyOrders)
    .slice(0, limit);
}

export function isOrderable(menuItem) {
  return Boolean(menuItem) && !menuItem.soldOut && Boolean(getRestaurant(menuItem.restaurantId)?.isOpen);
}

// ---------- Options & cart lines ----------

export function defaultSelections(menuItem) {
  const selections = {};
  for (const group of menuItem.optionGroups) {
    const fallback = group.options.find((o) => o.default && o.isAvailable !== false && o.is_available !== false);
    selections[group.id] = fallback && !group.multiple ? [fallback.id] : [];
  }
  return selections;
}

export function missingRequiredGroups(menuItem, selections) {
  return menuItem.optionGroups.filter((group) => {
    const selected = selections[group.id] || [];
    const min = group.required ? Math.max(1, Number(group.min || 1)) : Number(group.min || 0);
    const max = group.multiple ? Number(group.max ?? group.options.length) : 1;
    return selected.length < min || selected.length > max || selected.some((id) => !group.options.some((option) => option.id === id && option.isAvailable !== false && option.is_available !== false));
  });
}

function selectedOptions(menuItem, selections) {
  return menuItem.optionGroups.flatMap((group) =>
    group.options.filter((o) => selections[group.id]?.includes(o.id)),
  );
}

export function unitPrice(menuItem, selections) {
  return Math.round((menuItem.price + selectedOptions(menuItem, selections).reduce((s, o) => s + o.price, 0) + Number.EPSILON) * 100) / 100;
}

export function optionLabels(menuItem, selections) {
  return selectedOptions(menuItem, selections).map((o) => o.label);
}

/** Same item with the same options and note merges into one line. */
export function cartLineKey(menuId, selections, note) {
  const parts = Object.keys(selections)
    .toSorted()
    .filter((groupId) => selections[groupId].length > 0)
    .map((groupId) => `${groupId}:${selections[groupId].toSorted().join("+")}`);
  return [menuId, ...parts, note.trim()].join("|");
}

/** Cart lines joined with the live catalogue (prices and names are never trusted from storage). */
export function resolveCartLines(cart) {
  return cart.items.flatMap((line) => {
    const menuItem = getMenuItem(line.menuId);
    if (!menuItem) return [];
    const price = unitPrice(menuItem, line.selections);
    return [
      {
        ...line,
        menuItem,
        unitPrice: price,
        lineTotal: Math.round((price * line.qty + Number.EPSILON) * 100) / 100,
        optionLabels: optionLabels(menuItem, line.selections),
      },
    ];
  });
}

export function priceCart(cart, savedCoupons = [], now = Date.now()) {
  const lines = resolveCartLines(cart);
  const round = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
  const subtotal = round(lines.reduce((sum, l) => sum + round(l.lineTotal), 0));
  const restaurant = getRestaurant(cart.restaurantId);
  const selection = selectedCoupon(cart, savedCoupons, { subtotal, now, restaurantIds: [cart.restaurantId, restaurant?.backendId].filter(Boolean) });
  const serviceFee = lines.length > 0 ? CONFIG.serviceFee : 0;
  return {
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotal,
    serviceFee,
    coupon: selection.coupon,
    selectedCoupon: selection.selected,
    couponIssue: selection.issue,
    discount: selection.discount,
    total: round(Math.max(0, subtotal + serviceFee - selection.discount)),
  };
}

// ---------- Orders ----------

export const ORDER_STEPS = [
  { status: "PLACED", label: "สั่งอาหารแล้ว" },
  { status: "PAID", label: "ชำระเงินแล้ว" },
  { status: "QUEUED", label: "อยู่ในคิว" },
  { status: "PREPARING", label: "กำลังทำอาหาร" },
  { status: "READY", label: "พร้อมรับอาหาร" },
  { status: "PICKED_UP", label: "รับอาหารแล้ว" },
];

export function currentStatus(order) {
  if (order.status) return order.status;
  const reached = ORDER_STEPS.filter((s) => order.statusTimes[s.status]);
  return reached.at(-1)?.status || "PLACED";
}

export function isActiveOrder(order) {
  return !["PICKED_UP", "CANCELLED"].includes(currentStatus(order));
}

export function statusLabel(status) {
  if (status === "CANCELLED") return "ยกเลิกออเดอร์แล้ว";
  return ORDER_STEPS.find((s) => s.status === status)?.label || "รอร้านรับออเดอร์";
}

/** 0–1 progress for the thin bar on active-order cards. */
export function orderProgress(order) {
  const index = ORDER_STEPS.findIndex((s) => s.status === currentStatus(order));
  return (index + 1) / ORDER_STEPS.length;
}

/** Next queue number at a restaurant, never reusing one held by this customer's active orders there. */
export function nextQueueNumber(restaurant, orders) {
  const held = orders
    .filter((o) => o.restaurantId === restaurant.id && isActiveOrder(o))
    .map((o) => o.queueNumber + 1);
  return Math.max(restaurant.nextNumber || 1, ...held);
}

export function queuesAhead(order) {
  return order.queuesAhead ?? 0;
}
