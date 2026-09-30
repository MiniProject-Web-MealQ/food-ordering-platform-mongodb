import { PAYMENT_METHOD_LABEL } from "./mock-data";

export { formatBaht, formatClock } from "@/features/customer/format";

/** "เพิ่งสั่ง", "8 นาที", "1 ชม. 5 นาที" */
export function formatElapsed(since, now) {
  const minutes = Math.max(0, Math.floor((now - since) / 60000));
  if (minutes < 1) return "เพิ่งสั่ง";
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`;
}

export function formatQueue(queueNumber) {
  return `#${String(queueNumber).padStart(2, "0")}`;
}

export function paymentLabel(method) {
  return PAYMENT_METHOD_LABEL[method] ?? method;
}
