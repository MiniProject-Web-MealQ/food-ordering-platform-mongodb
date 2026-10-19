import { createContext, use } from "react";
import { menuFromApi, ordersFromApi, storeFromApi } from "./adapters";
import { getMenus, getOrders, getSession, getStore } from "./api";

/**
 * state ของร้านเก็บตามที่ API ส่งกลับมา (แปลงเป็น snake_case ตาม model ด้วย adapters.js)
 * reducer ไม่เรียก server เอง ฟังก์ชันโหลดข้อมูลด้านล่างและ use-merchant-actions.js
 * เป็นคนเรียก API แล้ว dispatch ผลลัพธ์
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
      return { ...initialState, status: "signed-out", reason: action.reason ?? null };
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

/**
 * 401 = ไม่มี session หรือหมดอายุ, 403 = cookie ตอนนี้เป็นของบัญชีที่ไม่ใช่ร้านค้า
 * (ส่วนใหญ่เพราะมีคน login เป็นลูกค้าในเบราว์เซอร์เดียวกัน)
 */
export function isSessionLost(result) {
  return !result.ok && (result.status === 401 || result.status === 403);
}

export const sessionLost = { type: "load/signedOut", reason: "session-lost" };

function failure(result) {
  if (isSessionLost(result)) return sessionLost;
  return { type: "load/failed", error: result.error };
}

/** โหลดข้อมูลทั้งหมดที่หน้าร้านต้องใช้ในครั้งเดียว คืน action ที่ต้อง dispatch */
export async function loadEverything() {
  const me = await getSession();
  if (!me.ok) return failure(me);
  // session ของลูกค้าใช้เข้าหน้าร้านไม่ได้: ส่งไปหน้า login ร่วมพร้อมเลือก "ร้านค้า"
  if (me.data?.user?.role !== "MERCHANT") return sessionLost;

  const [store, menus, orders] = await Promise.all([getStore(), getMenus(), getOrders()]);
  const failed = [store, menus, orders].find((result) => !result.ok);
  if (failed) return failure(failed);

  return {
    type: "load/succeeded",
    session: { id: me.data.user.id, accountRole: me.data.user.accountRole, name: me.data.user.name, email: me.data.user.email },
    store: storeFromApi(store.data.store),
    menus: menus.data.menus.map(menuFromApi),
    ...ordersFromApi(orders.data.orders),
  };
}

/** โหลดรายการออเดอร์ใหม่ (ออเดอร์ใหม่ หรือที่แก้จากเครื่องอื่น) คืน null ถ้าโหลดไม่สำเร็จ */
export async function loadOrders() {
  const result = await getOrders();
  if (!result.ok) return isSessionLost(result) ? sessionLost : null;
  return { type: "orders/loaded", ...ordersFromApi(result.data.orders) };
}

export async function loadStore() {
  const result = await getStore();
  if (!result.ok) return isSessionLost(result) ? sessionLost : null;
  return { type: "store/saved", store: storeFromApi(result.data.store) };
}
