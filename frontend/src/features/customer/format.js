const clockFormat = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });

export function formatBaht(amount) {
  return `฿${amount.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
}

/** 1726470660000 → "12:31" */
export function formatClock(timestamp) {
  return clockFormat.format(timestamp);
}

/** "12:31", "เมื่อวาน 19:40", or "14 ก.ย. 12:31". */
export function formatWhen(timestamp, now = Date.now()) {
  const date = new Date(timestamp);
  const today = new Date(now);
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  if (date.toDateString() === today.toDateString()) return formatClock(timestamp);
  if (date.toDateString() === yesterday.toDateString()) return `เมื่อวาน ${formatClock(timestamp)}`;
  return `${dateFormat.format(timestamp)} ${formatClock(timestamp)}`;
}

export function formatRange([min, max]) {
  return `${min}–${max}`;
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined) return "รับอาหารที่ร้าน";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} กม.` : `${Math.round(meters)} ม.`;
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 11) return "สวัสดีตอนเช้า";
  if (hour < 14) return "สวัสดีตอนเที่ยง";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}
