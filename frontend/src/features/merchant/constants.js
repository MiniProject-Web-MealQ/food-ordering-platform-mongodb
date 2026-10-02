/**
 * รหัสหมวดเมนู ต้องตรงกับ MENU_CATEGORIES ใน features/customer/mock-data.js
 * และค่าที่ seed ของ backend เก็บไว้ เพราะแอปลูกค้าจัดกลุ่มเมนูด้วยรหัสเหล่านี้
 */
export const MENU_CATEGORIES = [
  { value: "single", label: "อาหารจานเดียว" },
  { value: "noodle", label: "เส้น" },
  { value: "drink", label: "เครื่องดื่ม" },
  { value: "dessert", label: "ของหวาน" },
];

/** ชื่อภาษาไทยของรหัสหมวด ถ้าเป็นรหัสที่ไม่รู้จัก (สร้างจากที่อื่น) แสดงตามเดิม */
export function categoryLabel(code) {
  return MENU_CATEGORIES.find((c) => c.value === code)?.label ?? code;
}

export const PAYMENT_METHOD_LABEL = {
  promptpay: "PromptPay",
  card: "บัตรเครดิต/เดบิต",
  banking: "Online banking",
  wallet: "MealQ Wallet",
};
