/** ฟังก์ชันคำนวณตัวเลขจาก state ของ admin (ไม่แก้ state) หน้าต่าง ๆ เรียกใช้แทนการคำนวณเอง */

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const ACTIVE_ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready"];

/** ออเดอร์ที่ยังไม่จบเกินเวลานี้ถือว่า "ค้างนาน" */
export const STUCK_AFTER_MS = 30 * MINUTE;

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfMonth(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

/** ยอดขาย = ทุกออเดอร์ที่จ่ายแล้วและไม่ถูกยกเลิก */
export function isSale(order) {
  return order.status !== "cancelled" && ["paid", "simulated"].includes(order.payment_status);
}

function revenueOf(orders) {
  return orders.filter(isSale).reduce((sum, o) => sum + o.total_price, 0);
}

export function ordersBetween(state, from, to = Infinity) {
  return state.orders.filter((o) => o.order_date >= from && o.order_date < to);
}

export function byId(list, id) {
  return list.find((x) => x._id === id) ?? null;
}

export function todayStats(state, now) {
  const today = ordersBetween(state, startOfDay(now));
  return {
    orderCount: today.length,
    revenue: revenueOf(today),
    cancelled: today.filter((o) => o.status === "cancelled").length,
    backlog: state.orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length,
  };
}

export function totals(state, now) {
  const weekAgo = now - 7 * DAY;
  const live = state.stores.filter((s) => s.status === "active");
  return {
    stores: state.stores.filter((s) => s.status !== "rejected").length,
    open: live.filter((s) => s.is_open).length,
    closed: live.filter((s) => !s.is_open).length,
    suspended: state.stores.filter((s) => s.status === "suspended").length,
    pending: state.stores.filter((s) => s.status === "pending").length,
    customers: state.users.filter((u) => u.role === "customer").length,
    newCustomers: state.users.filter((u) => u.role === "customer" && u.created_at >= weekAgo).length,
    newMerchants: state.users.filter((u) => u.role === "merchant" && u.created_at >= weekAgo).length,
  };
}

/** ยอดขายและจำนวนออเดอร์รายวัน ย้อนหลัง `days` วัน (รวมวันนี้) เรียงเก่า → ใหม่ */
export function dailySeries(state, now, days = 7) {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const from = today - (days - 1 - i) * DAY;
    const orders = ordersBetween(state, from, from + DAY);
    return { date: from, revenue: revenueOf(orders), orders: orders.length };
  });
}

/** ยอดขายรายเดือน ย้อนหลัง `months` เดือน (รวมเดือนนี้) */
export function monthlySeries(state, now, months = 3) {
  const d = new Date(now);
  return Array.from({ length: months }, (_, i) => {
    const from = new Date(d.getFullYear(), d.getMonth() - (months - 1 - i), 1).getTime();
    const to = new Date(d.getFullYear(), d.getMonth() - (months - 2 - i), 1).getTime();
    const orders = ordersBetween(state, from, to);
    return { date: from, revenue: revenueOf(orders), orders: orders.length };
  });
}

export function storeRanking(state, from, to = Infinity) {
  const rows = new Map();
  for (const o of ordersBetween(state, from, to)) {
    const row = rows.get(o.store_id) ?? { storeId: o.store_id, orders: 0, cancelled: 0, revenue: 0 };
    row.orders += 1;
    if (o.status === "cancelled") row.cancelled += 1;
    else if (isSale(o)) row.revenue += o.total_price;
    rows.set(o.store_id, row);
  }
  return [...rows.values()]
    .map((r) => ({ ...r, store: byId(state.stores, r.storeId), cancelRate: r.orders ? r.cancelled / r.orders : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function menuRanking(state, from, to = Infinity) {
  const rows = new Map();
  for (const o of ordersBetween(state, from, to).filter(isSale)) {
    for (const item of o.items) {
      const row = rows.get(item.menu_id) ?? { menuId: item.menu_id, name: item.name, storeId: o.store_id, quantity: 0, revenue: 0 };
      row.quantity += item.quantity;
      row.revenue += item.total_price;
      rows.set(item.menu_id, row);
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, store: byId(state.stores, r.storeId) }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
}

/** จำนวนออเดอร์แยกตามชั่วโมงที่สั่ง (06:00–21:00) */
export function hourlyCounts(state, from, to = Infinity) {
  const counts = Array.from({ length: 16 }, (_, i) => ({ hour: i + 6, orders: 0 }));
  for (const o of ordersBetween(state, from, to)) {
    const h = new Date(o.order_date).getHours();
    const slot = counts.find((c) => c.hour === h);
    if (slot) slot.orders += 1;
  }
  return counts;
}

/** เรื่องที่ admin ต้องดูแล: ร้านรออนุมัติ ออเดอร์ค้างนาน และร้านที่ยกเลิกบ่อย (7 วันล่าสุด) */
export function attention(state, now) {
  const stuck = state.orders
    .filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status) && now - o.order_date > STUCK_AFTER_MS)
    .sort((a, b) => a.order_date - b.order_date);
  const highCancel = storeRanking(state, now - 7 * DAY).filter((r) => r.orders >= 5 && r.cancelRate >= 0.15);
  return {
    pendingStores: state.stores.filter((s) => s.status === "pending"),
    stuckOrders: stuck,
    highCancel,
  };
}

export function storeStats(state, storeId, now) {
  const mine = state.orders.filter((o) => o.store_id === storeId);
  const today = mine.filter((o) => o.order_date >= startOfDay(now));
  const month = mine.filter((o) => o.order_date >= startOfMonth(now));
  const last30 = mine.filter((o) => o.order_date >= now - 30 * DAY);
  const sales = last30.filter(isSale);
  return {
    todayOrders: today.length,
    monthRevenue: revenueOf(month),
    cancelRate: last30.length ? last30.filter((o) => o.status === "cancelled").length / last30.length : 0,
    averageOrder: sales.length ? Math.round(revenueOf(sales) / sales.length) : 0,
    last30Orders: last30.length,
  };
}

export function walletOf(state, userId) {
  return state.wallets.find((w) => w.user_id === userId)?.balance ?? 0;
}

/** สถานะคูปองที่คำนวณจากวันที่และจำนวนสิทธิ์ ไม่ได้เก็บไว้ใน model */
export function promotionState(promo, now) {
  if (!promo.is_active) return "disabled";
  if (now < promo.start_date) return "scheduled";
  if (now > promo.expire_date) return "expired";
  if (promo.usage_limit != null && promo.used_count >= promo.usage_limit) return "used_up";
  return "live";
}
