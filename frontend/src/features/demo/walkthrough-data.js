/** Illustrative walkthrough only. No sessions, network requests or real orders. */
export const DEMO_ORDER = Object.freeze({
  number: "MQ-DEMO-024",
  queue: "024",
  pickupCode: "4826",
  store: "ครัวอิ่มใจ",
  customer: "คุณมิน",
  item: "ข้าวกะเพราไก่ไข่ดาว",
  quantity: 1,
  subtotal: 65,
  serviceFee: 5,
  total: 70,
  walletTopup: 100,
  walletAfterPayment: 30,
});

export const DEMO_STEPS = Object.freeze([
  {
    id: "login",
    title: "เริ่มจากเข้าสู่ระบบ",
    description: "ลูกค้าเลือก Google Login หรือสมัครด้วยอีเมลและยืนยัน OTP ส่วนร้านค้าเข้าสู่ระบบร้านที่ได้รับอนุมัติและเปิดรับออเดอร์แล้ว",
    actor: "both",
    customerView: "login",
    merchantView: "waiting",
    customerCaption: "เข้าสู่ระบบด้วย Google หรือใช้อีเมลสมัครและยืนยัน OTP ก่อนเริ่มสั่งอาหาร",
    merchantCaption: "ร้านตัวอย่างได้รับอนุมัติแล้ว เข้าสู่ระบบและเปิดหน้ารับออเดอร์ไว้พร้อมใช้งาน",
    durationMs: 7000,
  },
  {
    id: "discover",
    title: "เลือกร้านและเมนูที่อยากกิน",
    description: `${DEMO_ORDER.customer} เลือกร้าน ${DEMO_ORDER.store} แล้วเปิดเมนู ${DEMO_ORDER.item}`,
    actor: "customer",
    customerView: "discover",
    merchantView: "waiting",
    customerCaption: `ดูเมนูของ ${DEMO_ORDER.store} แล้วเลือก ${DEMO_ORDER.item}`,
    merchantCaption: "ร้านเปิดรับรายการและรอออเดอร์ใหม่จากลูกค้า",
    durationMs: 6000,
  },
  {
    id: "customize",
    title: "ตรวจตัวเลือกแล้วเพิ่มลงตะกร้า",
    description: "ลูกค้าดูรายละเอียด เลือกความเผ็ดและจำนวนให้ครบตามเมนูตัวอย่าง แล้วเพิ่มรายการลงตะกร้า",
    actor: "customer",
    customerView: "customize",
    merchantView: "waiting",
    customerCaption: `ตรวจเมนู ${DEMO_ORDER.quantity} จาน ยอดค่าอาหาร ${DEMO_ORDER.subtotal} บาท ก่อนเพิ่มลงตะกร้า`,
    merchantCaption: "ลูกค้ายังเลือกอาหารอยู่ ร้านจะเห็นรายการหลังยืนยันชำระสำเร็จ",
    durationMs: 7000,
  },
  {
    id: "cart",
    title: "ตรวจตะกร้าและยอดรวม",
    description: `ค่าอาหาร ${DEMO_ORDER.subtotal} บาท รวมค่าบริการตัวอย่าง ${DEMO_ORDER.serviceFee} บาท เป็น ${DEMO_ORDER.total} บาท`,
    actor: "customer",
    customerView: "cart",
    merchantView: "waiting",
    customerCaption: `ตรวจจำนวน ${DEMO_ORDER.quantity} จานและยอดรวม ${DEMO_ORDER.total} บาทก่อนชำระ`,
    merchantCaption: "หน้าร้านยังรอออเดอร์ ลูกค้ากำลังตรวจรายการสุดท้าย",
    durationMs: 6000,
  },
  {
    id: "wallet-topup",
    title: "เติมเงินตัวอย่างเข้า Wallet",
    description: `ลูกค้าใหม่เริ่มด้วย Wallet Demo 0 บาท แล้วกดเติมเอง ${DEMO_ORDER.walletTopup} บาทในตัวอย่าง ยอดนี้เป็นเงินจำลองสำหรับทดลองใช้งาน`,
    actor: "customer",
    customerView: "wallet",
    merchantView: "waiting",
    customerCaption: `เปิด Wallet Demo จากยอด 0 บาท แล้วกดเติมเงินตัวอย่าง ${DEMO_ORDER.walletTopup} บาทด้วยตัวเอง`,
    merchantCaption: "ร้านยังรอออเดอร์ ลูกค้ากำลังเตรียมยอดเงินจำลองก่อนชำระ",
    durationMs: 7000,
  },
  {
    id: "checkout",
    title: "ชำระด้วย Wallet Demo",
    description: `ลูกค้าเลือก Wallet Demo และยืนยันยอด ${DEMO_ORDER.total} บาทในตัวอย่างนี้ เป็นเงินจำลองสำหรับการสาธิต`,
    actor: "customer",
    customerView: "checkout",
    merchantView: "waiting",
    customerCaption: `ยืนยันใช้ Wallet Demo ${DEMO_ORDER.total} บาท ยอดจำลองเหลือ ${DEMO_ORDER.walletAfterPayment} บาทหลังชำระสำเร็จ`,
    merchantCaption: "ร้านรอรับออเดอร์เมื่อการชำระของลูกค้าสำเร็จ",
    durationMs: 8000,
  },
  {
    id: "queued",
    title: "ลูกค้าได้เลขคิว ร้านได้รับออเดอร์",
    description: `ออเดอร์ ${DEMO_ORDER.number} แสดงคิว ${DEMO_ORDER.queue} ให้ลูกค้า พร้อมปรากฏเป็นรายการใหม่ในหน้าร้าน`,
    actor: "both",
    customerView: "queued",
    merchantView: "new-order",
    customerCaption: `ได้รับคิว ${DEMO_ORDER.queue} แล้ว รอร้านตรวจและยืนยันรายการ`,
    merchantCaption: `ออเดอร์ใหม่จาก ${DEMO_ORDER.customer}: ${DEMO_ORDER.item} ${DEMO_ORDER.quantity} จาน`,
    durationMs: 6000,
  },
  {
    id: "merchant-confirm",
    title: "ร้านตรวจรายการแล้วรับออเดอร์",
    description: "ร้านตรวจเมนู ตัวเลือกและจำนวน จากนั้นกดยืนยันรับออเดอร์ ลูกค้าเห็นว่าร้านยืนยันแล้ว",
    actor: "merchant",
    customerView: "queued",
    merchantView: "confirmed",
    customerCaption: "ร้านยืนยันออเดอร์แล้ว รอเริ่มเตรียมอาหารตามคิว",
    merchantCaption: "ตรวจรายละเอียดครบแล้ว กดยืนยันรับออเดอร์เพื่อเริ่มงานครัว",
    durationMs: 7000,
  },
  {
    id: "preparing",
    title: "ร้านเริ่มทำอาหาร",
    description: "ร้านเปลี่ยนสถานะเป็นกำลังเตรียม หน้าลูกค้าในตัวอย่างจึงแสดงว่าครัวเริ่มทำอาหารแล้ว",
    actor: "merchant",
    customerView: "preparing",
    merchantView: "preparing",
    customerCaption: `${DEMO_ORDER.store} กำลังเตรียม ${DEMO_ORDER.item} ให้คุณ`,
    merchantCaption: "เริ่มเตรียมอาหาร และอัปเดตสถานะให้ลูกค้าเห็นความคืบหน้า",
    durationMs: 7000,
  },
  {
    id: "ready",
    title: "อาหารพร้อม ให้ลูกค้ามารับ",
    description: "ร้านกดพร้อมรับ หน้าลูกค้าแสดงตัวอย่างแจ้งเตือนและจุดรับอาหาร เพื่อให้เตรียมแสดงรหัสหรือ QR แก่ร้าน",
    actor: "merchant",
    customerView: "ready",
    merchantView: "ready",
    customerCaption: `คิว ${DEMO_ORDER.queue} พร้อมรับแล้ว เตรียมรหัสรับอาหารหรือ QR ให้ร้านตรวจ`,
    merchantCaption: "อาหารเสร็จแล้ว กดพร้อมรับและรอลูกค้ามาที่จุดรับอาหาร",
    durationMs: 7000,
  },
  {
    id: "pickup",
    title: "ร้านตรวจรหัสหรือ QR ก่อนส่งมอบ",
    description: `ลูกค้าแสดงรหัส ${DEMO_ORDER.pickupCode} หรือ QR จากออเดอร์ ให้ร้านค้ากรอกรหัสหรือสแกน QR แล้วกดยืนยันรับอาหาร`,
    actor: "merchant",
    customerView: "pickup",
    merchantView: "verify-pickup",
    customerCaption: `แสดงรหัส ${DEMO_ORDER.pickupCode} หรือ QR ให้ร้านตรวจรับและยืนยันส่งมอบ`,
    merchantCaption: `กรอกรหัส ${DEMO_ORDER.pickupCode} หรือสแกน QR ตรวจให้ตรงออเดอร์แล้วกดยืนยันรับอาหาร`,
    durationMs: 9000,
  },
  {
    id: "completed",
    title: "รับอาหารเรียบร้อยทั้งสองฝั่ง",
    description: "หลังร้านยืนยันรหัสรับอาหารสำเร็จ ทั้งหน้าลูกค้าและหน้าร้านแสดงออเดอร์เสร็จสมบูรณ์และเก็บในประวัติ",
    actor: "both",
    customerView: "completed",
    merchantView: "completed",
    customerCaption: "ได้รับอาหารแล้ว เปิดประวัติเพื่อตรวจรายการและยอดเงินตัวอย่างได้",
    merchantCaption: "ยืนยันส่งมอบสำเร็จ ออเดอร์นี้ย้ายไปประวัติรายการที่เสร็จสมบูรณ์",
    durationMs: 6000,
  },
].map((step) => Object.freeze(step)));

export const DEMO_DURATION_MS = DEMO_STEPS.reduce((total, step) => total + step.durationMs, 0);
const finalIndex = DEMO_STEPS.length - 1;

/** Explicit navigation/seek boundary. Invalid input starts at the first step. */
export function clampStepIndex(index) {
  if (typeof index !== "number" || !Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(finalIndex, Math.trunc(index)));
}

/** Unknown state is not a completed order; callers must handle null explicitly. */
export function getDemoStep(index) {
  if (!Number.isInteger(index) || index < 0 || index > finalIndex) return null;
  return DEMO_STEPS[index];
}

/** Playback ends at the final step until the viewer explicitly restarts it. */
export function nextDemoIndex(index) {
  return getDemoStep(index) ? Math.min(index + 1, finalIndex) : 0;
}

/** Percentage of stage progression. The first stage is 0, the last is 100. */
export function getDemoProgress(index) {
  return getDemoStep(index) ? (index / finalIndex) * 100 : 0;
}
