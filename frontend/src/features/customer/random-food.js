const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function validId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function identities(item) {
  return [item?.id, item?.backendId].filter(validId);
}

function timestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string" && value.trim()) return new Date(value).getTime();
  return NaN;
}

/** Matches both the customer order view and an API order before it is mapped. */
export function getRecentMenuIds(orders, now = Date.now()) {
  const recentIds = new Set();
  const currentTime = timestamp(now);
  if (!Array.isArray(orders) || !Number.isFinite(currentTime)) return recentIds;
  const cutoff = currentTime - WEEK_MS;
  for (const order of orders) {
    if (!order || String(order.status || "").toLowerCase() === "cancelled" || !Array.isArray(order.items)) continue;
    const placed = timestamp(order.statusTimes?.PLACED ?? order.createdAt);
    if (!Number.isFinite(placed) || placed < cutoff || placed > currentTime) continue;
    for (const item of order.items) {
      for (const id of [item?.menuId, item?.clientMenuId, item?.backendId]) {
        if (validId(id)) recentIds.add(id);
      }
    }
  }
  return recentIds;
}

/** All results refer to a real store and retain the original catalogue object. */
export function filterRandomCandidates(menuItems, resolveRestaurant, filters = {}, recentIds = new Set()) {
  if (!Array.isArray(menuItems) || typeof resolveRestaurant !== "function") return [];
  const options = filters && typeof filters === "object" ? filters : {};
  const cuisine = options.cuisine ?? "all";
  const budget = options.budget === undefined ? Infinity : options.budget;
  if (budget !== Infinity && (!Number.isFinite(budget) || budget < 0)) return [];
  const recent = recentIds instanceof Set ? recentIds : new Set();
  return menuItems.filter((item) => {
    if (!item || identities(item).length === 0 || !validId(item.restaurantId) || !Number.isFinite(item.price) || item.price < 0) return false;
    const restaurant = resolveRestaurant(item.restaurantId);
    if (!restaurant || typeof restaurant !== "object" || Array.isArray(restaurant)) return false;
    if (cuisine !== "all" && item.cuisine !== cuisine) return false;
    if (item.price > budget) return false;
    if (options.openOnly && restaurant.isOpen !== true) return false;
    if (options.hideSoldOut && (item.soldOut === true || item.isAvailable === false)) return false;
    if (options.noRepeat && identities(item).some((id) => recent.has(id))) return false;
    return true;
  });
}

export function chooseRandomCandidate(items, previousId, random = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const alternatives = validId(previousId) ? items.filter((item) => !identities(item).includes(previousId)) : items;
  const pool = alternatives.length > 0 ? alternatives : items;
  const value = typeof random === "function" ? random() : 0;
  const unit = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return pool[Math.min(pool.length - 1, Math.floor(unit * pool.length))];
}

export function getRandomBudgetMax(items, base = 150, step = 10) {
  const floor = Number.isFinite(base) && base >= 0 ? base : 150;
  const increment = Number.isFinite(step) && step > 0 ? step : 10;
  const maximum = (Array.isArray(items) ? items : []).reduce((highest, item) => (
    Number.isFinite(item?.price) && item.price >= 0 ? Math.max(highest, item.price) : highest
  ), floor);
  const rounded = Math.ceil(maximum / increment) * increment;
  return Number.isFinite(rounded) ? rounded : maximum;
}
