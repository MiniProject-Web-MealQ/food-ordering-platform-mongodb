import { createContext, use } from "react";
import {
  cartLineKey,
  currentStatus,
  getMenuItem,
  getRestaurant,
  nextQueueNumber,
  ORDER_STEPS,
  priceCart,
} from "./catalog";
import { formatBaht } from "./format";
import { COUPONS, createSeedState, PAYMENT_METHODS } from "./mock-data";

/**
 * MOCK: client-side customer state (cart, orders, favourites, notifications, settings), persisted to
 * localStorage. Each action maps to a future API call; swap the reducer cases for requests then.
 */

export const STORAGE_KEY = "mealq.customer.v1";

export const CustomerContext = createContext(null);

/** Drops lines whose menu item sold out while it sat in the cart, remembering their names for the notice. */
function withoutSoldOut(cart) {
  const soldOut = cart.items.filter((line) => getMenuItem(line.menuId)?.soldOut !== false);
  if (soldOut.length === 0) return cart;
  return {
    ...cart,
    items: cart.items.filter((line) => !soldOut.includes(line)),
    removedItems: [
      ...cart.removedItems,
      ...soldOut.map((line) => getMenuItem(line.menuId)?.name).filter(Boolean),
    ],
  };
}

export function loadState() {
  let state;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    state = null;
  }
  state ??= createSeedState();
  const items = state.cart.items.map((line) => ({
    ...line,
    key: cartLineKey(line.menuId, line.selections, line.note),
  }));
  return { ...state, cart: withoutSoldOut({ ...state.cart, items }) };
}

function emptyCart() {
  return { restaurantId: null, couponCode: null, items: [], removedItems: [] };
}

function nextOrderId(orders) {
  const highest = Math.max(1000, ...orders.map((o) => Number(o.id.replace("MQ", ""))));
  return `MQ${highest + 1}`;
}

function notificationFor(order, status, at) {
  const restaurant = getRestaurant(order.restaurantId);
  const copy = {
    PREPARING: { kind: "preparing", title: "ร้านเริ่มทำอาหารของคุณแล้ว", body: `#${order.id}` },
    READY: {
      kind: "ready",
      title: "อาหารของคุณพร้อมแล้ว!",
      body: `#${order.id} · ${restaurant.name} · เดินมารับได้เลย`,
    },
  }[status];
  return copy ? { id: `n-${status}-${order.id}`, ...copy, orderId: order.id, at, read: false } : null;
}

export function reducer(state, action) {
  switch (action.type) {
    case "cart/add": {
      const { menuId, selections, note, qty } = action;
      const menuItem = getMenuItem(menuId);
      // One pickup per order: starting a cart at another restaurant replaces the old one.
      const cart =
        state.cart.restaurantId === menuItem.restaurantId
          ? state.cart
          : { ...emptyCart(), restaurantId: menuItem.restaurantId };
      const key = cartLineKey(menuId, selections, note);
      const existing = cart.items.find((line) => line.key === key);
      const items = existing
        ? cart.items.map((line) => (line === existing ? { ...line, qty: line.qty + qty } : line))
        : [...cart.items, { key, menuId, selections, note: note.trim(), qty }];
      return { ...state, cart: { ...cart, items } };
    }
    case "cart/setQty": {
      const items = state.cart.items
        .map((line) => (line.key === action.key ? { ...line, qty: action.qty } : line))
        .filter((line) => line.qty > 0);
      const cart = items.length > 0 ? { ...state.cart, items } : emptyCart();
      return { ...state, cart };
    }
    case "cart/dismissRemoved":
      return { ...state, cart: { ...state.cart, removedItems: [] } };
    case "cart/applyCoupon":
      return { ...state, cart: { ...state.cart, couponCode: action.code } };
    case "cart/removeCoupon":
      return { ...state, cart: { ...state.cart, couponCode: null } };
    case "cart/reorder": {
      const { order } = action;
      const lines = order.items.filter((item) => getMenuItem(item.menuId));
      let next = { ...state, cart: { ...emptyCart(), restaurantId: order.restaurantId } };
      for (const item of lines) {
        const menuItem = getMenuItem(item.menuId);
        // Old orders only keep option labels; map them back onto the current option ids.
        const selections = Object.fromEntries(
          menuItem.optionGroups.map((group) => [
            group.id,
            group.options.filter((o) => item.optionLabels.includes(o.label)).map((o) => o.id),
          ]),
        );
        next = reducer(next, {
          type: "cart/add",
          menuId: item.menuId,
          selections,
          note: item.note ?? "",
          qty: item.qty,
        });
      }
      return { ...next, cart: withoutSoldOut(next.cart) };
    }
    case "order/place": {
      const { orderId, paymentMethod, pickupCode, at } = action;
      const priced = priceCart(state.cart);
      const restaurant = getRestaurant(state.cart.restaurantId);
      const order = {
        id: orderId,
        restaurantId: restaurant.id,
        items: priced.lines.map((line) => ({
          key: line.key,
          menuId: line.menuId,
          name: line.menuItem.name,
          unitPrice: line.unitPrice,
          qty: line.qty,
          optionLabels: line.optionLabels,
          note: line.note,
        })),
        subtotal: priced.subtotal,
        serviceFee: priced.serviceFee,
        discount: priced.discount,
        couponCode: state.cart.couponCode,
        total: priced.total,
        paymentMethod,
        queueNumber: nextQueueNumber(restaurant, state.orders),
        nowServing: restaurant.nowServing,
        etaMinutes: restaurant.waitMinutes,
        pickupCode,
        statusTimes: { PLACED: at, PAID: at, QUEUED: at },
        review: null,
      };
      const paidNotice = {
        id: `n-paid-${orderId}`,
        kind: "paid",
        title: `ชำระเงินสำเร็จ ${formatBaht(priced.total)}`,
        body: `#${orderId} · ${PAYMENT_METHODS.find((m) => m.id === paymentMethod).label.replace(" QR", "")}`,
        orderId,
        at,
        read: true,
      };
      return {
        ...state,
        cart: emptyCart(),
        orders: [order, ...state.orders],
        notifications: [paidNotice, ...state.notifications],
      };
    }
    case "order/advance": {
      const order = state.orders.find((o) => o.id === action.orderId);
      const index = ORDER_STEPS.findIndex((s) => s.status === currentStatus(order));
      const next = ORDER_STEPS[index + 1];
      if (!next) return state;
      const nowServing =
        next.status === "PREPARING"
          ? order.queueNumber - 1
          : next.status === "READY"
            ? order.queueNumber
            : order.nowServing;
      const updated = {
        ...order,
        nowServing,
        statusTimes: { ...order.statusTimes, [next.status]: action.at },
      };
      const muted = next.status === "READY" && !state.settings.notifyReady;
      const notice = muted ? null : notificationFor(updated, next.status, action.at);
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === order.id ? updated : o)),
        notifications: notice
          ? [notice, ...state.notifications.filter((n) => n.id !== notice.id)]
          : state.notifications,
      };
    }
    case "order/review":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, review: action.review } : o,
        ),
      };
    case "favorites/toggle": {
      const list = state.favorites[action.kind];
      const nextList = list.includes(action.id)
        ? list.filter((id) => id !== action.id)
        : [...list, action.id];
      return { ...state, favorites: { ...state.favorites, [action.kind]: nextList } };
    }
    case "notifications/read":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n,
        ),
      };
    case "notifications/readAll":
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case "settings/set":
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    default:
      throw new Error(`Unknown customer action: ${action.type}`);
  }
}

export function useCustomer() {
  const context = use(CustomerContext);
  if (!context) throw new Error("useCustomer must be used inside <CustomerProvider>");
  return context;
}

/** Action creators keep ids, randomness and clock reads out of the pure reducer. */
export const actions = {
  placeOrder(state, paymentMethod) {
    return {
      type: "order/place",
      orderId: nextOrderId(state.orders),
      paymentMethod,
      pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
      at: Date.now(),
    };
  },
  advanceOrder(orderId) {
    return { type: "order/advance", orderId, at: Date.now() };
  },
  applyCoupon(code) {
    const normalized = code.trim().toUpperCase();
    return COUPONS[normalized] ? { type: "cart/applyCoupon", code: normalized } : null;
  },
};
