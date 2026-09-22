import { COUPONS, MENU_CATEGORIES, MENU_ITEMS, RESTAURANTS, SERVICE_FEE } from "./mock-data";

const restaurantsById = new Map(RESTAURANTS.map((r) => [r.id, r]));
const menuById = new Map(MENU_ITEMS.map((m) => [m.id, m]));

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
  return !menuItem.soldOut && Boolean(getRestaurant(menuItem.restaurantId)?.isOpen);
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
  const coupon = cart.couponCode ? COUPONS[cart.couponCode] : null;
  const discount = coupon ? Math.round((subtotal * coupon.percent) / 100) : 0;
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
  const reached = ORDER_STEPS.filter((s) => order.statusTimes[s.status]);
  return reached.at(-1).status;
}

export function isActiveOrder(order) {
  return currentStatus(order) !== "PICKED_UP";
}

export function statusLabel(status) {
  return ORDER_STEPS.find((s) => s.status === status).label;
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
