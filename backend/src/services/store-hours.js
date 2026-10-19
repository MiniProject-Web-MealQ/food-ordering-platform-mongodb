const validTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
function isStoreOpen(store, now = new Date()) {
  if (!store.is_open || (store.status && store.status !== "active")) return false;
  const hours = store.opening_hours;
  if (!hours?.automatic) return true;
  if (!validTime(hours.open_time) || !validTime(hours.close_time)) return false;
  // Schedule is daily in Bangkok; an earlier closing time means next day.
  const minute = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return hours.open_time === hours.close_time || (hours.open_time < hours.close_time ? minute >= hours.open_time && minute < hours.close_time : minute >= hours.open_time || minute < hours.close_time);
}
module.exports = { validTime, isStoreOpen };
