import { createContext, use } from "react";
import { COUPONS, cartLineKey, getMenuItem, getOrderRestaurant, getRestaurant, isOrderable, optionLabels } from "./catalog";

export const STORAGE_KEY = "mealq.customer.v2";
export const CustomerContext = createContext(null);
export const storageKey = (userId) => STORAGE_KEY + ":" + (userId || "guest");
export const emptyCart = () => ({ restaurantId: null, couponCode: null, items: [], removedItems: [] });

export function loadState(userId) {
  const initial = {
    cart: emptyCart(), orders: [], favorites: { restaurants: [], menus: [] }, notifications: [],
    settings: { notifyReady: true, promotions: false, paymentMethod: "promptpay" }, user: null,
  };
  let stored;
  try { stored = JSON.parse(localStorage.getItem(storageKey(userId))); } catch { /* Fresh state works when storage is unavailable. */ }
  if (!stored || typeof stored !== "object") return initial;
  return {
    ...initial,
    cart: { ...emptyCart(), ...stored.cart, items: Array.isArray(stored.cart?.items) ? stored.cart.items : [] },
    favorites: {
      restaurants: Array.isArray(stored.favorites?.restaurants) ? stored.favorites.restaurants : [],
      menus: Array.isArray(stored.favorites?.menus) ? stored.favorites.menus : [],
    },
    notifications: Array.isArray(stored.notifications) ? stored.notifications : [],
    settings: { ...initial.settings, ...stored.settings },
  };
}

function withoutUnavailable(cart) {
  const valid = [];
  const removed = [];
  for (const line of cart.items) {
    const menu = getMenuItem(line.menuId);
    if (!menu || menu.soldOut) { removed.push(menu?.name || "เมนูที่ไม่เปิดขายแล้ว"); continue; }
    const selections = line.selections && typeof line.selections === "object" ? line.selections : {};
    const cleaned = Object.fromEntries(menu.optionGroups.map((group) => [group.id,
      (Array.isArray(selections[group.id]) ? selections[group.id] : []).filter((id) => group.options.some((option) => option.id === id)),
    ]));
    const note = String(line.note || "");
    valid.push({ ...line, menuId: menu.id, selections: cleaned, note, qty: Math.max(1, Math.min(99, Number.parseInt(line.qty, 10) || 1)), key: cartLineKey(menu.id, cleaned, note) });
  }
  return { ...cart, restaurantId: valid.length ? getMenuItem(valid[0].menuId).restaurantId : null,
    couponCode: COUPONS[cart.couponCode] ? cart.couponCode : null,
    items: valid, removedItems: [...new Set([...(cart.removedItems || []), ...removed])] };
}

const STATUS_MAP = { pending: "PLACED", confirmed: "QUEUED", preparing: "PREPARING", ready: "READY", completed: "PICKED_UP", cancelled: "CANCELLED" };

export function mapOrder(order) {
  const restaurantId = order.store?.clientId || order.store?.id;
  const restaurant = getRestaurant(restaurantId);
  const at = new Date(order.createdAt).getTime();
  const updatedAt = new Date(order.updatedAt || order.createdAt).getTime();
  const status = STATUS_MAP[order.status] || "PLACED";
  const statusTimes = { PLACED: at, PAID: at };
  const progression = ["QUEUED", "PREPARING", "READY", "PICKED_UP"];
  const reached = progression.indexOf(status);
  if (reached >= 0) statusTimes[status] = updatedAt;
  if (order.queueCalledAt) statusTimes.READY = new Date(order.queueCalledAt).getTime();
  if (order.queueCompletedAt) statusTimes.PICKED_UP = new Date(order.queueCompletedAt).getTime();
  if (status === "CANCELLED") statusTimes.CANCELLED = updatedAt;
  return {
    id: order.orderNumber, backendOrderId: order.id, restaurantId, restaurantName: order.store?.name,
    items: (order.items || []).map((item, index) => {
      const menuId = item.clientMenuId || item.menuId;
      const menu = getMenuItem(menuId);
      return { key: order.id + "-" + index, menuId, name: item.name, unitPrice: Number(item.price), qty: Number(item.quantity),
        selections: item.selections || {}, optionLabels: menu ? optionLabels(menu, item.selections || {}) : [], note: item.note || "" };
    }),
    subtotal: Number(order.subtotal), serviceFee: Number(order.serviceFee), discount: Number(order.discount), total: Number(order.totalPrice),
    paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, paymentMode: order.paymentMode,
    queueNumber: order.queueNumber, nowServing: restaurant?.nowServing || 0, etaMinutes: restaurant?.waitMinutes || [5, 10],
    pickupCode: order.pickupCode, status, statusTimes, review: order.review || null,
  };
}

function notificationFor(order, status, at) {
  const restaurant = getOrderRestaurant(order);
  const copy = {
    PREPARING: { kind: "preparing", title: "ร้านเริ่มทำอาหารของคุณแล้ว", body: "#" + order.id },
    READY: { kind: "ready", title: "อาหารของคุณพร้อมแล้ว!", body: "#" + order.id + " · " + restaurant.name + " · เดินมารับได้เลย" },
    CANCELLED: { kind: "cancelled", title: "ออเดอร์ถูกยกเลิก", body: "#" + order.id + " · " + restaurant.name },
  }[status];
  return copy ? { id: "n-" + status + "-" + order.id, ...copy, orderId: order.id, at, read: false } : null;
}

export function reducer(state, action) {
  switch (action.type) {
    case "session/load": return { ...action.state, user: action.user };
    case "profile/set": return { ...state, user: action.user };
    case "catalogue/reconcile": return { ...state, cart: withoutUnavailable(state.cart) };
    case "favorites/sync": return { ...state, favorites: action.favorites };
    case "cart/add": {
      const { menuId, selections, note, qty } = action;
      const menuItem = getMenuItem(menuId);
      if (!isOrderable(menuItem)) return state;
      const cart = state.cart.restaurantId === menuItem.restaurantId ? state.cart : { ...emptyCart(), restaurantId: menuItem.restaurantId };
      const key = cartLineKey(menuId, selections, note);
      const existing = cart.items.find((line) => line.key === key);
      const items = existing
        ? cart.items.map((line) => line === existing ? { ...line, qty: Math.min(99, line.qty + qty) } : line)
        : [...cart.items, { key, menuId, selections, note: note.trim(), qty: Math.min(99, qty) }];
      return { ...state, cart: { ...cart, items } };
    }
    case "cart/setQty": {
      const items = state.cart.items.map((line) => line.key === action.key ? { ...line, qty: Math.min(99, action.qty) } : line).filter((line) => line.qty > 0);
      return { ...state, cart: items.length > 0 ? { ...state.cart, items } : emptyCart() };
    }
    case "cart/dismissRemoved": return { ...state, cart: { ...state.cart, removedItems: [] } };
    case "cart/applyCoupon": return { ...state, cart: { ...state.cart, couponCode: action.code } };
    case "cart/removeCoupon": return { ...state, cart: { ...state.cart, couponCode: null } };
    case "cart/reorder": {
      let next = { ...state, cart: emptyCart() };
      for (const item of action.order.items) {
        const menu = getMenuItem(item.menuId);
        if (!menu) continue;
        const selections = item.selections || Object.fromEntries(menu.optionGroups.map((group) => [group.id,
          group.options.filter((option) => item.optionLabels?.includes(option.label)).map((option) => option.id),
        ]));
        next = reducer(next, { type: "cart/add", menuId: menu.id, selections, note: item.note || "", qty: item.qty });
      }
      return { ...next, cart: withoutUnavailable(next.cart) };
    }
    case "orders/sync": {
      const orders = action.orders.map(mapOrder);
      let notifications = state.notifications;
      for (const order of orders) {
        const previous = state.orders.find((candidate) => candidate.id === order.id);
        const changed = previous && previous.status !== order.status;
        const firstReady = !previous && order.status === "READY";
        const notice = (changed || firstReady) && notificationFor(order, order.status, order.statusTimes[order.status] || order.statusTimes.PLACED);
        if (notice && (order.status !== "READY" || state.settings.notifyReady) && !notifications.some((item) => item.id === notice.id)) notifications = [notice, ...notifications];
      }
      return { ...state, orders, notifications: notifications.filter((notice) => orders.some((order) => order.id === notice.orderId)).slice(0, 100) };
    }
    case "order/place": {
      const order = mapOrder(action.order);
      return { ...state, cart: emptyCart(), orders: [order, ...state.orders.filter((candidate) => candidate.id !== order.id)] };
    }
    case "order/upsert": {
      const order = mapOrder(action.order);
      return { ...state, orders: state.orders.some((candidate) => candidate.id === order.id)
        ? state.orders.map((candidate) => candidate.id === order.id ? order : candidate) : [order, ...state.orders] };
    }
    case "favorites/toggle": {
      const list = state.favorites[action.kind];
      return { ...state, favorites: { ...state.favorites, [action.kind]: list.includes(action.id) ? list.filter((id) => id !== action.id) : [...list, action.id] } };
    }
    case "notifications/read": return { ...state, notifications: state.notifications.map((notice) => notice.id === action.id ? { ...notice, read: true } : notice) };
    case "notifications/readAll": return { ...state, notifications: state.notifications.map((notice) => ({ ...notice, read: true })) };
    case "settings/set": return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    default: throw new Error("Unknown customer action: " + action.type);
  }
}

export function useCustomer() {
  const context = use(CustomerContext);
  if (!context) throw new Error("useCustomer must be used inside <CustomerProvider>");
  return context;
}

export const actions = {
  applyCoupon(code) {
    const normalized = code.trim().toUpperCase();
    return COUPONS[normalized] ? { type: "cart/applyCoupon", code: normalized } : null;
  },
};
