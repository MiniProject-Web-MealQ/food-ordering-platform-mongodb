/**
 * สถานะออเดอร์และคิว ใช้ชื่อตรงตามที่ backend/src/models/Order.js และ Queue.js เก็บ
 *
 * Order: pending → confirmed → preparing → ready → completed หรือ cancelled ก่อนถึง ready
 * หมายเหตุ: แอปลูกค้ายังใช้สถานะอีกชุด (PLACED/PAID/QUEUED/PREPARING/READY/PICKED_UP)
 * ทั้งสองฝั่งต้องตกลงใช้ชุดเดียวกัน
 */

export const ORDER_STATUS_LABEL = {
  pending: "รอรับออเดอร์",
  confirmed: "รับแล้ว · รอทำ",
  preparing: "กำลังทำ",
  ready: "พร้อมรับ",
  completed: "รับอาหารแล้ว",
  cancelled: "ยกเลิกแล้ว",
};

/** ตรงกับ STATUS_QUEUE_MAP ใน backend/src/controllers/merchantController.js */
export const QUEUE_STATUS_FOR_ORDER = {
  pending: "waiting",
  confirmed: "waiting",
  preparing: "preparing",
  ready: "ready",
  completed: "completed",
  cancelled: "cancelled",
};

/** ลำดับสถานะปกติ ใช้กับ timeline ในหน้ารายละเอียดออเดอร์ */
export const ORDER_STEPS = ["pending", "confirmed", "preparing", "ready", "completed"];

export const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "ready"];

/** สถานะที่ครัวยังต้องทำ นับรวมเป็นคิวตาม store.queue.max_queue */
export const IN_KITCHEN_STATUSES = ["pending", "confirmed", "preparing"];

const NEXT_STEP = {
  pending: { status: "confirmed", label: "รับออเดอร์" },
  confirmed: { status: "preparing", label: "เริ่มทำ" },
  preparing: { status: "ready", label: "อาหารพร้อม · เรียกคิว" },
};

/** ขั้นถัดไปที่กดปุ่มเดียวบนการ์ดได้ หรือ null ถ้าขั้นถัดไปต้องทำมากกว่านั้น (ready ต้องใช้รหัส) */
export function nextStep(status) {
  return NEXT_STEP[status] ?? null;
}

export function canCancel(status) {
  return IN_KITCHEN_STATUSES.includes(status);
}

/** คอลัมน์ของกระดานคิว ครัวนับ "รับแล้ว" กับ "กำลังทำ" เป็นคอลัมน์เดียวกัน */
export const BOARD_COLUMNS = [
  { id: "new", label: "รอรับ", statuses: ["pending"], empty: "ยังไม่มีออเดอร์ใหม่" },
  { id: "cooking", label: "กำลังทำ", statuses: ["confirmed", "preparing"], empty: "ไม่มีออเดอร์ที่กำลังทำ" },
  { id: "ready", label: "พร้อมรับ", statuses: ["ready"], empty: "ไม่มีคิวที่รอลูกค้ามารับ" },
  { id: "done", label: "เสร็จแล้ว", statuses: ["completed", "cancelled"], empty: "ยังไม่มีออเดอร์ที่เสร็จวันนี้" },
];
