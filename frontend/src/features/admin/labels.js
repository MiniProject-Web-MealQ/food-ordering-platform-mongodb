/** ชื่อภาษาไทยของค่าต่าง ๆ ในระบบ ใช้ร่วมกันทุกหน้าของ admin */

export const STORE_STATUS_LABEL = {
  active: "ใช้งาน",
  suspended: "ถูกระงับ",
  pending: "รออนุมัติ",
  rejected: "ไม่อนุมัติ",
};

export const USER_STATUS_LABEL = {
  active: "ใช้งาน",
  suspended: "ถูกระงับ",
};

export const ROLE_LABEL = {
  customer: "ลูกค้า",
  merchant: "ร้านค้า",
  staff: "พนักงานร้าน",
  admin: "ผู้ดูแลระบบ",
};

export const PROMOTION_STATE_LABEL = {
  live: "ใช้งานอยู่",
  scheduled: "ยังไม่เริ่ม",
  expired: "หมดอายุ",
  used_up: "สิทธิ์เต็มแล้ว",
  disabled: "ปิดอยู่",
};

export const WALLET_TX_LABEL = {
  topup: "เติมเงิน",
  payment: "จ่ายค่าอาหาร",
  refund: "คืนเงิน",
  adjust: "ปรับยอดโดยผู้ดูแล",
};

export const CANCEL_BY_LABEL = {
  store: "ร้านค้า",
  customer: "ลูกค้า",
  admin: "ผู้ดูแลระบบ",
};

export const ACTIVITY_LABEL = {
  "store.approve": "อนุมัติร้าน",
  "store.reject": "ไม่อนุมัติร้าน",
  "store.suspend": "ระงับร้าน",
  "store.activate": "ยกเลิกระงับร้าน",
  "store.forceClose": "บังคับปิดร้าน",
  "store.update": "แก้ข้อมูลร้าน",
  "user.suspend": "ระงับบัญชี",
  "user.activate": "ยกเลิกระงับบัญชี",
  "user.role": "เปลี่ยนประเภทบัญชี",
  "user.resetPassword": "ส่งลิงก์ตั้งรหัสผ่านใหม่",
  "user.addAdmin": "เพิ่มผู้ดูแลระบบ",
  "order.cancel": "ยกเลิกออเดอร์แทนร้าน",
  "order.refund": "บันทึกการคืนเงิน",
  "promotion.create": "สร้างคูปอง",
  "promotion.update": "แก้ไขคูปอง",
  "promotion.enable": "เปิดใช้คูปอง",
  "promotion.disable": "ปิดคูปอง",
  "wallet.adjust": "ปรับยอด Wallet",
  "settings.update": "แก้ตั้งค่าระบบ",
};
