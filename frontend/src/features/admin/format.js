export { formatBaht, formatClock } from "@/features/customer/format";

const dateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" });
const dateTimeFormat = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const weekdayFormat = new Intl.DateTimeFormat("th-TH", { weekday: "narrow" });
const monthFormat = new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit" });

/** 1 ต.ค. 69 */
export function formatDate(ts) {
  return ts ? dateFormat.format(ts) : "–";
}

/** 1 ต.ค. 14:05 */
export function formatDateTime(ts) {
  return ts ? dateTimeFormat.format(ts) : "–";
}

/** ตัวย่อวันในสัปดาห์ เช่น "พฤ" (ใช้เป็นป้ายแกนกราฟรายวัน คู่กับวันที่บรรทัดล่าง) */
export function formatWeekday(ts) {
  return weekdayFormat.format(ts);
}

/** ต.ค. 69 */
export function formatMonth(ts) {
  return monthFormat.format(ts);
}

export function formatPercent(ratio) {
  return `${Math.round(ratio * 100)}%`;
}

/** "ลด 10% (สูงสุด ฿30)" หรือ "ลด ฿20" */
export function formatDiscount(promo) {
  if (promo.discount_type === "percentage") {
    return `ลด ${promo.discount_value}%${promo.max_discount ? ` (สูงสุด ฿${promo.max_discount})` : ""}`;
  }
  return `ลด ฿${promo.discount_value}`;
}

/** ค่าสำหรับ <input type="date"> */
export function toDateInput(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** อ่านค่าจาก <input type="date"> เป็นเวลาเริ่มวัน (หรือสิ้นวันถ้า endOfDay) ตามเวลาท้องถิ่น */
export function fromDateInput(value, endOfDay = false) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d).getTime();
}
