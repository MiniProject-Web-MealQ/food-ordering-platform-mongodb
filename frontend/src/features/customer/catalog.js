import { MENU_CATEGORIES as KNOWN_CATEGORIES, SERVICE_FEE } from "./mock-data";

export const RESTAURANTS = [];
export const MENU_ITEMS = [];
export const MENU_CATEGORIES = [];
export const COUPONS = {};
const restaurantsById = new Map();
const menuById = new Map();

/** Keeps existing page lookups synchronous while the provider loads the current server catalogue. */
export function setCatalogue({ restaurants, menus, promotions = [] }) {
  restaurantsById.clear();
  menuById.clear();
  const mappedRestaurants = restaurants.map((store) => ({
    id: store.clientId || store.id,
    backendId: store.id,
    name: store.name,
    category: store.category || "อาหารและเครื่องดื่ม",
    rating: Number(store.rating?.average || 0),
    reviewCount: Number(store.rating?.count || 0),
    location: store.address?.detail || "รับอาหารที่หน้าร้าน",
    pickupPoint: store.pickupPoint || "หน้าร้าน",
    distance: null,
    hours: { open: store.openingHours?.open_time || "—", close: store.openingHours?.close_time || "—" },
    isOpen: store.isOpen,
    queueLength: Number(store.queue?.activeCount || 0),
    nowServing: Number(store.queue?.nowServing || 0),
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
      weeklyOrders: Number(menu.soldQuantity || 0),
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
  for (const code of Object.keys(COUPONS)) delete COUPONS[code];
  for (const promotion of promotions) COUPONS[promotion.code.toUpperCase()] = {
    ...promotion,
    restaurantId: promotion.storeId ? restaurantsById.get(promotion.storeId)?.id : null,
    label: promotion.discountType === "percentage" ? "ลด " + promotion.discountValue + "%" : "ลด ฿" + promotion.discountValue,
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
    const fallback = group.options.find((o) => o.default);
    selections[group.id] = fallback && !group.multiple ? [fallback.id] : [];
  }
  return selections;
}

export function missingRequiredGroups(menuItem, selections) {
  return menuItem.optionGroups.filter((g) => g.required && !(selections[g.id]?.length > 0));
}

function selectedOptions(menuItem, selections) {
  return menuItem.optionGroups.flatMap((group) =>
    group.options.filter((o) => selections[group.id]?.includes(o.id)),
  );
}

export function unitPrice(menuItem, selections) {
  return menuItem.price + selectedOptions(menuItem, selections).reduce((s, o) => s + o.price, 0);
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
        lineTotal: price * line.qty,
        optionLabels: optionLabels(menuItem, line.selections),
      },
    ];
  });
}

export function priceCart(cart) {
  const lines = resolveCartLines(cart);
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const candidate = cart.couponCode ? COUPONS[cart.couponCode] : null;
  const coupon = candidate && (!candidate.restaurantId || candidate.restaurantId === cart.restaurantId)
    && subtotal >= Number(candidate.minimumOrder || 0) ? candidate : null;
  let discount = coupon ? coupon.discountType === "percentage" ? Math.round(subtotal * Number(coupon.discountValue) / 100) : Number(coupon.discountValue) : 0;
  if (coupon?.maxDiscount != null) discount = Math.min(discount, Number(coupon.maxDiscount));
  discount = Math.min(subtotal, discount);
  const serviceFee = lines.length > 0 ? SERVICE_FEE : 0;
  return {
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotal,
    serviceFee,
    coupon,
    discount,
    total: Math.max(0, subtotal + serviceFee - discount),
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
  return Math.max(restaurant.nowServing + restaurant.queueLength + 1, ...held);
}

export function queuesAhead(order) {
  return Math.max(0, order.queueNumber - order.nowServing);
}
