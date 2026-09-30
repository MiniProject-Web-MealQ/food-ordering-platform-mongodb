import { createContext, use } from "react";
import { buildOrder, createSeedState, MERCHANT_STORE_ID, SIMULATED_CUSTOMERS } from "./mock-data";
import { findOrder } from "./orders";
import { canCancel, nextStep, QUEUE_STATUS_FOR_ORDER } from "./status";

/**
 * MOCK: client-side merchant state (session, store, menus, orders, queues), persisted to localStorage.
 * Each action names the API call that should replace it once the pages move onto features/merchant/api.js.
 */

export const STORAGE_KEY = "mealq.merchant.v1";

export const MerchantContext = createContext(null);

function isValidState(state) {
  return (
    state &&
    typeof state === "object" &&
    state.store?._id === MERCHANT_STORE_ID &&
    Array.isArray(state.menus) &&
    Array.isArray(state.orders) &&
    Array.isArray(state.queues)
  );
}

export function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidState(stored)) return stored;
  } catch {
    // Corrupt or blocked storage: fall through to fresh seed data.
  }
  return createSeedState(Date.now());
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app keeps working for this tab only.
  }
}

/**
 * MOCK: signing in writes the session straight to storage, because the login page sits outside
 * <MerchantProvider> (see routes/AppRoutes.jsx). Replace with POST /auth/login (portal MERCHANT).
 */
export function signIn(session) {
  saveState({ ...loadState(), session });
}

export function readSession() {
  return loadState().session;
}

function updateOrder(state, orderId, changes, queueChanges = {}) {
  return {
    ...state,
    orders: state.orders.map((o) => (o._id === orderId ? { ...o, ...changes } : o)),
    queues: state.queues.map((q) =>
      q.order_id === orderId
        ? { ...q, status: QUEUE_STATUS_FOR_ORDER[changes.status ?? q.status] ?? q.status, ...queueChanges }
        : q,
    ),
  };
}

export function reducer(state, action) {
  switch (action.type) {
    // MOCK: PATCH /merchant/store { isOpen }
    case "store/setOpen":
      return { ...state, store: { ...state.store, is_open: action.isOpen } };

    // MOCK: PATCH /merchant/store
    case "store/update":
      return { ...state, store: { ...state.store, ...action.changes } };

    // MOCK: PATCH /merchant/orders/:id/status { status: next }
    case "order/advance": {
      const order = findOrder(state, action.orderId);
      const step = order && nextStep(order.status);
      if (!step) return state;
      return updateOrder(
        state,
        order._id,
        { status: step.status },
        step.status === "ready" ? { called_at: action.at } : {},
      );
    }

    // MOCK: PATCH /merchant/orders/:id/status { status: "cancelled" } (+ refund, not in the API yet)
    case "order/cancel": {
      const order = findOrder(state, action.orderId);
      if (!order || !canCancel(order.status)) return state;
      return updateOrder(state, order._id, { status: "cancelled" });
    }

    // MOCK: PATCH /merchant/orders/:id/status { status: "completed" }.
    // The backend does not check receive_code yet, so the page checks it before dispatching.
    case "order/complete": {
      const order = findOrder(state, action.orderId);
      if (!order || order.status !== "ready") return state;
      const next = updateOrder(
        state,
        order._id,
        { status: "completed", receive_time: action.at },
        { completed_at: action.at },
      );
      // MOCK: counted when food is handed over; the backend should own sold_quantity.
      const sold = new Map(order.items.map((item) => [item.menu_id, item.quantity]));
      return {
        ...next,
        menus: next.menus.map((m) =>
          sold.has(m._id) ? { ...m, sold_quantity: m.sold_quantity + sold.get(m._id) } : m,
        ),
      };
    }

    // MOCK: new orders arrive from the customer app over the "order:new" socket event.
    case "order/simulate":
      return { ...state, orders: [action.order, ...state.orders], queues: [...state.queues, action.queue] };

    // MOCK: PATCH /merchant/menu/:id { isAvailable }
    case "menu/setAvailable":
      return {
        ...state,
        menus: state.menus.map((m) => (m._id === action.menuId ? { ...m, is_available: action.isAvailable } : m)),
      };

    // MOCK: POST /merchant/menu
    case "menu/add":
      return { ...state, menus: [...state.menus, action.menu] };

    // MOCK: PATCH /merchant/menu/:id
    case "menu/update":
      return {
        ...state,
        menus: state.menus.map((m) => (m._id === action.menuId ? { ...m, ...action.changes } : m)),
      };

    // MOCK: DELETE /merchant/menu/:id
    case "menu/remove":
      return { ...state, menus: state.menus.filter((m) => m._id !== action.menuId) };

    // MOCK: POST /auth/logout
    case "session/logout":
      return { ...state, session: null };

    case "demo/reset":
      return { ...action.state, session: state.session };

    default:
      throw new Error(`Unknown merchant action: ${action.type}`);
  }
}

export function useMerchant() {
  const context = use(MerchantContext);
  if (!context) throw new Error("useMerchant must be used inside <MerchantProvider>");
  return context;
}

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Action creators keep ids, randomness and clock reads out of the pure reducer. */
export const actions = {
  advance(orderId) {
    return { type: "order/advance", orderId, at: Date.now() };
  },
  cancel(orderId) {
    return { type: "order/cancel", orderId, at: Date.now() };
  },
  complete(orderId) {
    return { type: "order/complete", orderId, at: Date.now() };
  },
  addMenu(fields) {
    const id = `menu-${Date.now().toString(36)}`;
    return {
      type: "menu/add",
      menu: { _id: id, store_id: MERCHANT_STORE_ID, sold_quantity: 0, ...fields },
    };
  },
  /** MOCK: fakes one incoming order from the menus that are on sale. Returns null when none are. */
  simulateOrder(state) {
    const onSale = state.menus.filter((m) => m.is_available);
    if (onSale.length === 0) return null;
    const lastNumber = Math.max(0, ...state.queues.map((q) => q.queue_number));
    const lines = [[pick(onSale)._id, 1 + Math.floor(Math.random() * 2)]];
    const drink = onSale.find((m) => m.category === "เครื่องดื่ม" && m._id !== lines[0][0]);
    if (drink && Math.random() > 0.5) lines.push([drink._id, 1]);
    const { order, queue } = buildOrder({
      menus: state.menus,
      queueNumber: lastNumber + 1,
      status: "pending",
      orderedAt: Date.now(),
      customerName: pick(SIMULATED_CUSTOMERS),
      receiveCode: randomCode(),
      items: lines,
    });
    return { type: "order/simulate", order, queue };
  },
  resetDemo() {
    return { type: "demo/reset", state: createSeedState(Date.now()) };
  },
};
