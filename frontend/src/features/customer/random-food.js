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

/** Samples original catalogue objects; client/database aliases describe one menu. */
export function sampleRandomCandidates(items, limit = 5, excludeIds = [], random = Math.random) {
  if (!Array.isArray(items) || !Number.isFinite(limit) || limit < 1) return [];
  const parents = new Map();
  function rootOf(id) {
    if (!parents.has(id)) parents.set(id, id);
    let root = id;
    while (parents.get(root) !== root) root = parents.get(root);
    let cursor = id;
    while (cursor !== root) {
      const next = parents.get(cursor);
      parents.set(cursor, root);
      cursor = next;
    }
    return root;
  }

  const entries = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const ids = identities(item);
    if (!ids.length) continue;
    entries.push({ item, ids });
    const first = rootOf(ids[0]);
    for (const id of ids.slice(1)) parents.set(rootOf(id), first);
  }
  // Resolve all aliases before exclusion: a later duplicate may introduce a
  // second client ID for an already-seen database ID, or join two copies.
  const excluded = new Set((Array.isArray(excludeIds) || excludeIds instanceof Set ? [...excludeIds] : []).filter(validId).map(rootOf));
  const seen = new Set();
  const pool = [];
  for (const { item, ids } of entries) {
    const root = rootOf(ids[0]);
    if (excluded.has(root) || seen.has(root)) continue;
    seen.add(root);
    pool.push(item);
  }

  const count = Math.min(Math.floor(limit), pool.length);
  for (let index = 0; index < count; index += 1) {
    let value = 0;
    try { value = typeof random === "function" ? random() : 0; } catch { /* Optional RNG cannot break the page. */ }
    const unit = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    const remaining = pool.length - index;
    const target = index + Math.min(remaining - 1, Math.floor(unit * remaining));
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }
  return pool.slice(0, count);
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
