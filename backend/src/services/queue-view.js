const Queue = require("../models/Queue");
const Menu = require("../models/Menu");

function queueSummary(store, queues = [], typicalCookTime = 5, lastNumber = 0) {
  const active = queues.filter((queue) => ["waiting", "preparing", "ready"].includes(queue.status) && queue.order_id && !["cancelled", "completed"].includes(queue.order_id.status));
  const preparing = active.find((queue) => queue.status === "preparing");
  const workload = active.filter((queue) => queue.status !== "ready").reduce((sum, queue) => sum + Math.max(1, ...(queue.order_id.items || []).map((item) => Number(item.cook_time || typicalCookTime))), 0);
  const estimate = workload + typicalCookTime;
  return { maxQueue: Number(store.queue?.max_queue ?? 50), activeCount: active.length,
    activeNumbers: active.filter((queue) => queue.status !== "ready").map((queue) => queue.queue_number),
    nowServing: preparing?.queue_number ?? null,
    nextNumber: Math.max(Number(store.queue_sequence || 0), lastNumber, ...active.map((queue) => queue.queue_number)) + 1,
    waitMinutes: [Math.max(1, Math.round(estimate * 0.8)), Math.max(1, Math.ceil(estimate * 1.2))] };
}

async function queueViews(stores) {
  const ids = stores.map((store) => store._id);
  if (!ids.length) return new Map();
  const [queues, menus, numbers] = await Promise.all([
    Queue.find({ store_id: { $in: ids }, status: { $in: ["waiting", "preparing", "ready"] } }).sort({ queue_number: 1 }).populate("order_id", "items status").lean(),
    Menu.find({ store_id: { $in: ids }, is_available: true }).select("store_id cook_time").lean(),
    Queue.aggregate([{ $match: { store_id: { $in: ids } } }, { $group: { _id: "$store_id", last: { $max: "$queue_number" } } }]),
  ]);
  return new Map(stores.map((store) => {
    const key = String(store._id);
    const cookTimes = menus.filter((menu) => String(menu.store_id) === key).map((menu) => Number(menu.cook_time || 5));
    const typical = cookTimes.length ? Math.max(1, Math.ceil(cookTimes.reduce((a, b) => a + b, 0) / cookTimes.length)) : 5;
    return [key, queueSummary(store, queues.filter((queue) => String(queue.store_id) === key), typical, numbers.find((entry) => String(entry._id) === key)?.last || 0)];
  }));
}

module.exports = { queueSummary, queueViews };
