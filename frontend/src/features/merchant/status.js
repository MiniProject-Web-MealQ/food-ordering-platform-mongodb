/**
 * Order and queue statuses, named exactly as backend/src/models/Order.js and Queue.js store them.
 *
 * Order: pending → confirmed → preparing → ready → completed, or cancelled before it is ready.
 * NOTE: the customer app still uses its own set (PLACED/PAID/QUEUED/PREPARING/READY/PICKED_UP);
 * both sides must agree on one set when they move onto the real API.
 */

export const ORDER_STATUS_LABEL = {
  pending: "รอรับออเดอร์",
  confirmed: "รับแล้ว · รอทำ",
  preparing: "กำลังทำ",
  ready: "พร้อมรับ",
  completed: "รับอาหารแล้ว",
  cancelled: "ยกเลิกแล้ว",
};

/** Mirrors STATUS_QUEUE_MAP in backend/src/controllers/merchantController.js. */
export const QUEUE_STATUS_FOR_ORDER = {
  pending: "waiting",
  confirmed: "waiting",
  preparing: "preparing",
  ready: "ready",
  completed: "completed",
  cancelled: "cancelled",
};

/** The happy path, in order. Used by the timeline on the order detail page. */
export const ORDER_STEPS = ["pending", "confirmed", "preparing", "ready", "completed"];

export const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "ready"];

/** Statuses the kitchen still has to work on; these count toward store.queue.max_queue. */
export const IN_KITCHEN_STATUSES = ["pending", "confirmed", "preparing"];

const NEXT_STEP = {
  pending: { status: "confirmed", label: "รับออเดอร์" },
  confirmed: { status: "preparing", label: "เริ่มทำ" },
  preparing: { status: "ready", label: "อาหารพร้อม · เรียกคิว" },
};

/** The one-tap move for a card, or null when the next step needs more than a tap (ready needs the code). */
export function nextStep(status) {
  return NEXT_STEP[status] ?? null;
}

export function canCancel(status) {
  return IN_KITCHEN_STATUSES.includes(status);
}

/** Queue board columns. The kitchen treats "accepted" and "cooking" as one lane. */
export const BOARD_COLUMNS = [
  { id: "new", label: "รอรับ", statuses: ["pending"], empty: "ยังไม่มีออเดอร์ใหม่" },
  { id: "cooking", label: "กำลังทำ", statuses: ["confirmed", "preparing"], empty: "ไม่มีออเดอร์ที่กำลังทำ" },
  { id: "ready", label: "พร้อมรับ", statuses: ["ready"], empty: "ไม่มีคิวที่รอลูกค้ามารับ" },
  { id: "done", label: "เสร็จแล้ว", statuses: ["completed", "cancelled"], empty: "ยังไม่มีออเดอร์ที่เสร็จวันนี้" },
];
