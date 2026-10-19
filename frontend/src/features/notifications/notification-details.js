const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
const KINDS = {
  paid: { label: "การชำระเงิน", icon: "✓", tone: "mint" },
  new: { label: "ออเดอร์ใหม่", icon: "🧾", tone: "mint" },
  confirmed: { label: "ร้านยืนยันออเดอร์", icon: "✓", tone: "mint" },
  preparing: { label: "กำลังเตรียมอาหาร", icon: "👩‍🍳", tone: "cream" },
  ready: { label: "อาหารพร้อมรับ", icon: "🔔", tone: "brand" },
  completed: { label: "รับอาหารสำเร็จ", icon: "✓", tone: "mint" },
  pickup: { label: "ลูกค้ารับอาหารแล้ว", icon: "✓", tone: "mint" },
  cancelled: { label: "การยกเลิกออเดอร์", icon: "✕", tone: "danger" },
  promo: { label: "คูปองและโปรโมชัน", icon: "🎟️", tone: "mint" },
};
const STATUS = { PLACED: "รับคำสั่งซื้อแล้ว", QUEUED: "ร้านยืนยันแล้ว", PREPARING: "กำลังเตรียมอาหาร", READY: "อาหารพร้อมรับ", PICKED_UP: "รับอาหารสำเร็จ", CANCELLED: "ยกเลิกแล้ว", pending: "รับคำสั่งซื้อแล้ว", confirmed: "ร้านยืนยันแล้ว", preparing: "กำลังเตรียมอาหาร", ready: "อาหารพร้อมรับ", completed: "รับอาหารสำเร็จ", cancelled: "ยกเลิกแล้ว" };
const PAYMENT = { paid: "ชำระแล้ว", simulated: "ชำระแบบ Demo", pending: "รอชำระ", refunded: "คืนเงินแล้ว", failed: "ชำระไม่สำเร็จ" };
const fullTime = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const validId = (value) => typeof value === "string" && SAFE_ID.test(value);
const number = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const baht = (value) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

export function notificationDate(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function notificationTime(value) {
  const date = notificationDate(value);
  return date ? fullTime.format(date) : "ไม่ทราบเวลาแจ้งเตือน";
}

export function notificationAction(notification, audience = "customer") {
  if (!["customer", "merchant"].includes(audience) || !notification || typeof notification !== "object") return null;
  if (notification.kind === "promo") {
    if (audience !== "customer") return null;
    const query = validId(notification.promotionId) ? `?promotionId=${encodeURIComponent(notification.promotionId)}` : "";
    return { to: `/customer/coupons${query}`, label: "ดูคูปอง" };
  }
  // Accept only a role-local order path. No schemes, protocol-relative URLs,
  // encoded separators, query parameters, fragments or other role destinations.
  const path = typeof notification.url === "string" && notification.url.match(new RegExp(`^/${audience}/orders/([A-Za-z0-9][A-Za-z0-9_-]{0,99})$`));
  const orderId = path ? path[1] : validId(notification.orderId) ? notification.orderId : null;
  if (orderId) return { to: `/${audience}/orders/${encodeURIComponent(orderId)}`, label: "ดูรายละเอียดออเดอร์" };
  if (audience === "customer" && validId(notification.restaurantId)) return { to: `/customer/restaurants/${encodeURIComponent(notification.restaurantId)}`, label: "ดูรายละเอียดร้าน" };
  return null;
}

export function notificationPresentation(notification, { audience = "customer", order = null, storeName = "" } = {}) {
  const kind = KINDS[notification.kind] || { label: "การแจ้งเตือน", icon: "🔔", tone: "cream" };
  const rows = [{ label: "ประเภท", value: kind.label }, { label: "เวลาแจ้งเตือน", value: notificationTime(notification.at) }];
  const store = notification.storeName || notification.restaurantName || order?.restaurantName || order?.store?.name || storeName;
  if (store) rows.push({ label: "ร้าน", value: String(store) });
  if (notification.kind === "promo") {
    if (notification.code) rows.push({ label: "รหัสคูปอง", value: String(notification.code) });
    if (number(notification.discountValue) && notification.discountType === "percentage") rows.push({ label: "ส่วนลด", value: `${notification.discountValue}%` });
    if (number(notification.discountValue) && notification.discountType === "fixed") rows.push({ label: "ส่วนลด", value: baht(notification.discountValue) });
    if (number(notification.minimumOrder)) rows.push({ label: "ยอดขั้นต่ำ", value: baht(notification.minimumOrder) });
    if (number(notification.maxDiscount) && notification.maxDiscount > 0) rows.push({ label: "ลดสูงสุด", value: baht(notification.maxDiscount) });
    if (notification.expiresAt && notificationDate(notification.expiresAt)) rows.push({ label: "ใช้ได้ถึง", value: notificationTime(notification.expiresAt) });
  } else {
    const humanId = (value) => typeof value === "string" && !/^[a-f0-9]{24}$/i.test(value) ? value : null;
    const displayId = order?.order_number || humanId(order?.id) || notification.orderNumber || humanId(notification.orderId);
    if (displayId) rows.push({ label: "ออเดอร์", value: String(displayId) });
    if (order && STATUS[order.status]) rows.push({ label: "สถานะออเดอร์ปัจจุบัน", value: STATUS[order.status] });
    const payment = order?.paymentStatus || order?.payment_status;
    if (PAYMENT[payment]) rows.push({ label: "สถานะการชำระเงิน", value: PAYMENT[payment] });
    const total = order?.total ?? order?.total_price;
    if (number(total)) rows.push({ label: "ยอดออเดอร์", value: baht(total) });
    if (payment === "refunded" && (order?.paymentMethod || order?.payment_method) === "wallet" && number(total)) rows.push({ label: "คืนเข้า Wallet", value: baht(total) });
  }
  return { ...kind, rows, description: notification.kind === "promo" ? notification.description || null : null, action: notificationAction(notification, audience) };
}

export function createNotificationReader({ send, onAcknowledged = () => {}, isCurrent = () => true }) {
  const pending = new Map();
  return {
    read(id) {
      if (pending.has(id)) return pending.get(id);
      const request = Promise.resolve().then(async () => {
        if (!isCurrent()) return { ok: false, stale: true };
        try {
          const result = await send(id);
          if (!isCurrent()) return { ok: false, stale: true };
          if (result?.ok !== true) return { ok: false, error: result?.error || { message: "บันทึกการอ่านไม่สำเร็จ กรุณาลองอีกครั้ง" } };
          onAcknowledged(id, result);
          return result;
        } catch (error) {
          return isCurrent() ? { ok: false, error: { message: error?.message || "บันทึกการอ่านไม่สำเร็จ กรุณาลองอีกครั้ง" } } : { ok: false, stale: true };
        }
      }).finally(() => pending.delete(id));
      pending.set(id, request);
      return request;
    },
  };
}
