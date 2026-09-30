import { ACTIVE_STATUSES, IN_KITCHEN_STATUSES } from "./status";

/** Read-only helpers over merchant state. Pages call these instead of filtering state themselves. */

export function queueFor(state, orderId) {
  return state.queues.find((q) => q.order_id === orderId) ?? null;
}

/** Looks an order up by its _id or its order_number (URLs use the order number, like the API). */
export function findOrder(state, id) {
  return state.orders.find((o) => o._id === id || o.order_number === id) ?? null;
}

export function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function todaysOrders(state, now) {
  return state.orders.filter((o) => isSameDay(o.order_date, now));
}

/** Orders still on the board today, oldest first so the kitchen works top to bottom. */
export function boardOrders(state, now) {
  return state.orders
    .filter((o) => ACTIVE_STATUSES.includes(o.status) || isSameDay(o.order_date, now))
    .map((order) => ({ order, queue: queueFor(state, order._id) }))
    .sort((a, b) => a.order.order_date - b.order.order_date);
}

export function inKitchenCount(state) {
  return state.orders.filter((o) => IN_KITCHEN_STATUSES.includes(o.status)).length;
}

export function pendingCount(state) {
  return state.orders.filter((o) => o.status === "pending").length;
}

/** Numbers for the dashboard. Revenue counts every paid order that was not cancelled. */
export function todaySummary(state, now) {
  const today = todaysOrders(state, now);
  const kept = today.filter((o) => o.status !== "cancelled");
  const sold = new Map();
  for (const order of kept) {
    for (const item of order.items) {
      const entry = sold.get(item.menu_id) ?? { menuId: item.menu_id, name: item.name, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.total_price;
      sold.set(item.menu_id, entry);
    }
  }

  return {
    orderCount: today.length,
    cancelledCount: today.length - kept.length,
    completedCount: today.filter((o) => o.status === "completed").length,
    inKitchen: inKitchenCount(state),
    readyCount: state.orders.filter((o) => o.status === "ready").length,
    revenue: kept.reduce((sum, o) => sum + o.total_price, 0),
    topMenus: [...sold.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5),
  };
}

/** Matches a queue number ("12" or "#12"), an order number, a customer name or a menu name. */
export function matchesOrderSearch({ order, queue }, query) {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return true;
  return (
    String(queue?.queue_number ?? "") === q ||
    order.order_number.toLowerCase().includes(q) ||
    order.customer.name.toLowerCase().includes(q) ||
    order.items.some((item) => item.name.toLowerCase().includes(q))
  );
}

export function itemCount(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}
