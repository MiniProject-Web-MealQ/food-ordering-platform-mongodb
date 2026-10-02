import { ACTIVE_STATUSES, IN_KITCHEN_STATUSES } from "./status";

/** ฟังก์ชันอ่านข้อมูลจาก state ของร้าน (ไม่แก้ state) หน้าต่าง ๆ เรียกใช้แทนการกรอง state เอง */

export function queueFor(state, orderId) {
  return state.queues.find((q) => q.order_id === orderId) ?? null;
}

/** หาออเดอร์จาก _id หรือ order_number (URL ใช้เลขออเดอร์เหมือน API) */
export function findOrder(state, id) {
  return state.orders.find((o) => o._id === id || o.order_number === id) ?? null;
}

export function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function todaysOrders(state, now) {
  return state.orders.filter((o) => isSameDay(o.order_date, now));
}

/** ออเดอร์ที่ยังอยู่บนกระดานวันนี้ เรียงเก่าสุดก่อน ครัวจะได้ทำจากบนลงล่าง */
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

/** ตัวเลขสำหรับหน้าภาพรวม ยอดขายนับทุกออเดอร์ที่จ่ายแล้วและไม่ถูกยกเลิก */
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

/** ค้นหาจากเลขคิว ("12" หรือ "#12") เลขออเดอร์ ชื่อลูกค้า หรือชื่อเมนู */
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
