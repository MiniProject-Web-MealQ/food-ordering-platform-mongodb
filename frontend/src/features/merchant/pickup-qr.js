import { ORDER_STATUS_LABEL } from "./status";

/**
 * What a customer's pickup QR may contain. The customer app does not show a scannable QR yet
 * (features/customer/components/pickup-code.jsx draws a decorative pattern), so the scanner
 * accepts the formats it is likely to adopt:
 *   "MEALQ:<order_number>:<receive_code>"   e.g. MEALQ:MQ599608373:9667  (preferred)
 *   "<receive_code>"                         e.g. 9667
 *   JSON with orderNumber + pickupCode / receiveCode / code
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
    // Not JSON: fall through.
  }
  return null;
}

/**
 * Matches a scan against the board. Resolves to { entry } for a ready order,
 * or { message } explaining why the scan cannot be used.
 */
export function matchPickupScan(entries, scan) {
  if (!scan) return { message: "QR นี้ไม่ใช่รหัสรับอาหารของ MealQ" };
  const matches = entries.filter(
    ({ order, queue }) =>
      queue?.receive_code === scan.code && (!scan.orderNumber || order.order_number === scan.orderNumber),
  );
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
