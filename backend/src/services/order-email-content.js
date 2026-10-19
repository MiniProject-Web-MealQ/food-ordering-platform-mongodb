const STEPS = [
  ["pending", "รับคำสั่งซื้อแล้ว"],
  ["confirmed", "ร้านยืนยันออเดอร์"],
  ["preparing", "กำลังทำอาหาร"],
  ["ready", "อาหารพร้อมรับ"],
  ["completed", "รับอาหารเรียบร้อย"],
];

const CONTENT = {
  pending: { title: "รับคำสั่งซื้อของคุณแล้ว", message: "MealQ บันทึกคำสั่งซื้อเรียบร้อยแล้ว ขณะนี้กำลังรอร้านตรวจสอบและยืนยันออเดอร์", nextAction: "รอร้านยืนยันออเดอร์ คุณสามารถเปิดดูรายละเอียดและติดตามสถานะล่าสุดได้ใน MealQ" },
  confirmed: { title: "ร้านยืนยันออเดอร์ของคุณแล้ว", message: "ร้านรับคำสั่งซื้อของคุณเรียบร้อยแล้ว และกำลังจัดเตรียมคิวสำหรับทำอาหาร", nextAction: "รอติดตามขั้นตอนทำอาหาร ยังไม่ต้องมารับจนกว่าร้านจะแจ้งว่าอาหารพร้อมรับ" },
  preparing: { title: "ร้านกำลังทำอาหารให้คุณ", message: "ร้านเริ่มทำอาหารตามออเดอร์ของคุณแล้ว เราจะแจ้งให้ทราบอีกครั้งเมื่ออาหารพร้อมรับ", nextAction: "รอแจ้งเตือนอาหารพร้อมรับ และเปิดออเดอร์เพื่อติดตามสถานะล่าสุดได้ทุกเมื่อ" },
  ready: { title: "อาหารของคุณพร้อมรับแล้ว", message: "ร้านจัดเตรียมอาหารเรียบร้อยแล้ว คุณสามารถไปรับอาหารตามจุดรับของร้านได้", nextAction: "เปิดรายละเอียดออเดอร์ใน MealQ แล้วแสดงรหัสหรือ QR รับอาหารให้ร้านตรวจสอบเมื่อรับอาหาร" },
  completed: { title: "รับอาหารเรียบร้อย ขอบคุณที่ใช้ MealQ", message: "ร้านตรวจสอบรหัสรับอาหารและบันทึกการส่งมอบออเดอร์ของคุณเรียบร้อยแล้ว ขอให้อร่อยกับมื้อนี้", nextAction: "เปิดดูประวัติออเดอร์และให้คะแนนร้านได้ใน MealQ" },
  cancelled: { title: "ออเดอร์ของคุณถูกยกเลิกแล้ว", message: "ออเดอร์นี้สิ้นสุดด้วยการยกเลิก ร้านจะไม่ดำเนินการต่อสำหรับรายการนี้", nextAction: "เปิดรายละเอียดออเดอร์เพื่อตรวจสอบการยกเลิกและสถานะการชำระเงินหรือการคืนยอดที่เกี่ยวข้อง" },
};

function customerOrderEmailContent(status) {
  if (!Object.hasOwn(CONTENT, status)) return null;
  const index = STEPS.findIndex(([value]) => value === status);
  return {
    ...CONTENT[status], status,
    step: index < 0 ? null : index + 1,
    totalSteps: STEPS.length,
    progress: index < 0 ? [] : STEPS.map(([value, label], step) => ({ status: value, label, state: step < index ? "done" : step === index ? "current" : "upcoming" })),
  };
}

module.exports = { customerOrderEmailContent };
