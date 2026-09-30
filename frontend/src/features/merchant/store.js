import { createContext, use } from "react";
import { menuFromApi, ordersFromApi, storeFromApi } from "./adapters";
import { getMenus, getOrders, getSession, getStore } from "./api";

/**
 * Merchant state mirrors what the API returned (converted to the models' snake_case by adapters.js).
 * The reducer never talks to the server: loaders below and use-merchant-actions.js make the
 * requests and dispatch their results.
 *
 * status: "loading" → "ready" | "signed-out" | "error"
 */

export const MerchantContext = createContext(null);

export const initialState = {
  status: "loading",
  error: null,
  session: null,
  store: null,
  menus: [],
  orders: [],
  queues: [],
};

function upsert(list, item, key) {
  return list.some((x) => x[key] === item[key])
    ? list.map((x) => (x[key] === item[key] ? item : x))
    : [item, ...list];
}

export function reducer(state, action) {
  switch (action.type) {
    case "load/started":
      return { ...state, status: "loading", error: null };
    case "load/succeeded":
      return {
        status: "ready",
        error: null,
        session: action.session,
        store: action.store,
        menus: action.menus,
        orders: action.orders,
        queues: action.queues,
      };
    case "load/signedOut":
      return { ...initialState, status: "signed-out" };
    case "load/failed":
      return { ...state, status: "error", error: action.error };
    case "orders/loaded":
      return { ...state, orders: action.orders, queues: action.queues };
    case "order/saved":
      return {
        ...state,
        orders: upsert(state.orders, action.order, "_id"),
        queues: upsert(state.queues, action.queue, "order_id"),
      };
    case "store/saved":
      return { ...state, store: action.store };
    case "menu/saved":
      return { ...state, menus: upsert(state.menus, action.menu, "_id") };
    case "menu/removed":
      return { ...state, menus: state.menus.filter((m) => m._id !== action.menuId) };
    default:
      throw new Error(`Unknown merchant action: ${action.type}`);
  }
}

export function useMerchant() {
  const context = use(MerchantContext);
  if (!context) throw new Error("useMerchant must be used inside <MerchantProvider>");
  return context;
}

function failure(result) {
  if (result.status === 401 || result.status === 403) return { type: "load/signedOut" };
  return { type: "load/failed", error: result.error };
}

/** Everything the merchant pages need, fetched in one go. Resolves to the action to dispatch. */
export async function loadEverything() {
  const me = await getSession();
  if (!me.ok) return failure(me);
  // A customer session is not a merchant session: send them to the merchant login.
  if (me.data?.user?.role !== "MERCHANT") return { type: "load/signedOut" };

  const [store, menus, orders] = await Promise.all([getStore(), getMenus(), getOrders()]);
  const failed = [store, menus, orders].find((result) => !result.ok);
  if (failed) return failure(failed);

  return {
    type: "load/succeeded",
    session: { name: me.data.user.name, email: me.data.user.email },
    store: storeFromApi(store.data.store),
    menus: menus.data.menus.map(menuFromApi),
    ...ordersFromApi(orders.data.orders),
  };
}

/** Re-reads the order list (new orders, changes made on another device). Null when it failed. */
export async function loadOrders() {
  const result = await getOrders();
  if (!result.ok) return result.status === 401 ? { type: "load/signedOut" } : null;
  return { type: "orders/loaded", ...ordersFromApi(result.data.orders) };
}
