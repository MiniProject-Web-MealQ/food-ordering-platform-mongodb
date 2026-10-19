import { ORDER_STATUS_LABEL } from "./status.js";

/**
 * QR ใหม่ระบุเลขออเดอร์พร้อมรหัสรับอาหาร รองรับรูปแบบเก่าที่ไม่คลุมเครือด้วย:
 *   "MEALQ:<order_number>:<receive_code>"   เช่น MEALQ:MQ599608373:9667  (แนะนำ)
 *   "<receive_code>"                         เช่น 9667
 *   JSON ที่มี orderNumber + pickupCode / receiveCode / code
 */
export function parsePickupQr(text) {
  const value = String(text ?? "").trim();
  const tagged = /^MEALQ:([^:\s]+):(\d{4})$/i.exec(value);
  if (tagged) return { orderNumber: tagged[1], code: tagged[2] };
  if (/^\d{4}$/.test(value)) return { orderNumber: null, code: value };
  try {
    const data = JSON.parse(value);
    const code = String(data?.pickupCode ?? data?.receiveCode ?? data?.receive_code ?? data?.code ?? "");
    if (/^\d{4}$/.test(code)) return { orderNumber: data.orderNumber ?? data.order_number ?? null, code };
  } catch {
    // ไม่ใช่ JSON: ข้ามไป
  }
  return null;
}

/**
 * เทียบผลสแกนกับออเดอร์บนกระดาน คืน { entry } ถ้าเจอออเดอร์ที่พร้อมรับ
 * หรือ { message } ที่อธิบายว่าทำไมใช้ QR นี้ไม่ได้
 */
export function matchPickupScan(entries, scan) {
  if (!scan) return { message: "QR นี้ไม่ใช่รหัสรับอาหารของ MealQ" };
  const matches = entries.filter(
    ({ order, queue }) =>
      queue?.receive_code === scan.code && (!scan.orderNumber || order.order_number === scan.orderNumber),
  );
  if (!scan.orderNumber && matches.length > 1) return { message: "รหัสนี้ตรงกับหลายออเดอร์ ให้ลูกค้าเปิด QR ใหม่ หรือเลือกออเดอร์และตรวจรายการก่อนกรอกรหัส" };
  const ready = matches.find(({ order }) => order.status === "ready");
  if (ready) return { entry: ready };
  const other = matches[0];
  if (other) {
    return {
      message: `ออเดอร์ ${other.order.order_number} ยังรับไม่ได้ (สถานะ: ${ORDER_STATUS_LABEL[other.order.status]})`,
    };
  }
  return { message: "ไม่พบออเดอร์ที่ตรงกับ QR นี้ในร้าน" };
}
