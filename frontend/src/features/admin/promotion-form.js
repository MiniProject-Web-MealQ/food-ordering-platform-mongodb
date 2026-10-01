import { fromDateInput, toDateInput } from "./format";

/** ค่าในฟอร์มคูปองเป็นข้อความตามที่พิมพ์ toPromotionFields() แปลงเป็น field ตาม Promotion model */

export function emptyPromotionValues(now) {
  return {
    code: "",
    title: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    max_discount: "",
    minimum_order: "0",
    start_date: toDateInput(now),
    expire_date: toDateInput(now + 30 * 24 * 60 * 60 * 1000),
    usage_limit: "",
    per_user_limit: "1",
    store_id: "",
    is_active: true,
  };
}

export function promotionToValues(p) {
  return {
    code: p.code,
    title: p.title,
    description: p.description ?? "",
    discount_type: p.discount_type,
    discount_value: String(p.discount_value),
    max_discount: p.max_discount == null ? "" : String(p.max_discount),
    minimum_order: String(p.minimum_order ?? 0),
    start_date: toDateInput(p.start_date),
    expire_date: toDateInput(p.expire_date),
    usage_limit: p.usage_limit == null ? "" : String(p.usage_limit),
    per_user_limit: String(p.per_user_limit ?? 1),
    store_id: p.store_id ?? "",
    is_active: p.is_active,
  };
}

const whole = (v) => /^\d+$/.test(String(v).trim());

/** คืน { field: ข้อความ } ของทุกช่องที่ผิด ถ้าได้ object ว่างแปลว่าบันทึกได้ */
export function validatePromotion(values, promotions, editingId = null) {
  const errors = {};
  const code = values.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) errors.code = "ใช้ตัวอักษรอังกฤษหรือตัวเลข 3–20 ตัว ไม่มีเว้นวรรค";
  else if (promotions.some((p) => p._id !== editingId && p.code === code)) errors.code = "มีโค้ดนี้อยู่แล้ว";

  if (!values.title.trim()) errors.title = "กรอกชื่อคูปอง";
  else if (values.title.trim().length > 60) errors.title = "ยาวได้ไม่เกิน 60 ตัวอักษร";

  const value = Number(values.discount_value);
  if (!whole(values.discount_value) || value < 1) errors.discount_value = "กรอกจำนวนเต็มตั้งแต่ 1 ขึ้นไป";
  else if (values.discount_type === "percentage" && value > 100) errors.discount_value = "เปอร์เซ็นต์ต้องไม่เกิน 100";

  if (values.discount_type === "percentage" && values.max_discount.trim() && (!whole(values.max_discount) || Number(values.max_discount) < 1)) {
    errors.max_discount = "กรอกจำนวนเต็มตั้งแต่ 1 หรือเว้นว่างถ้าไม่จำกัด";
  }
  if (!whole(values.minimum_order)) errors.minimum_order = "กรอกจำนวนเต็มตั้งแต่ 0";
  else if (values.discount_type === "fixed" && value >= 1 && Number(values.minimum_order) > 0 && value >= Number(values.minimum_order)) {
    errors.minimum_order = "ยอดขั้นต่ำควรมากกว่าส่วนลด";
  }

  if (!values.start_date) errors.start_date = "เลือกวันเริ่ม";
  if (!values.expire_date) errors.expire_date = "เลือกวันหมดอายุ";
  else if (values.start_date && values.expire_date < values.start_date) errors.expire_date = "วันหมดอายุต้องไม่ก่อนวันเริ่ม";

  if (values.usage_limit.trim() && (!whole(values.usage_limit) || Number(values.usage_limit) < 1)) {
    errors.usage_limit = "กรอกจำนวนเต็มตั้งแต่ 1 หรือเว้นว่างถ้าไม่จำกัด";
  }
  if (!whole(values.per_user_limit) || Number(values.per_user_limit) < 1) errors.per_user_limit = "กรอกจำนวนเต็มตั้งแต่ 1";
  return errors;
}

export function toPromotionFields(values) {
  const percentage = values.discount_type === "percentage";
  return {
    code: values.code.trim().toUpperCase(),
    title: values.title.trim(),
    description: values.description.trim(),
    discount_type: values.discount_type,
    discount_value: Number(values.discount_value),
    max_discount: percentage && values.max_discount.trim() ? Number(values.max_discount) : null,
    minimum_order: Number(values.minimum_order),
    start_date: fromDateInput(values.start_date),
    expire_date: fromDateInput(values.expire_date, true),
    usage_limit: values.usage_limit.trim() ? Number(values.usage_limit) : null,
    per_user_limit: Number(values.per_user_limit),
    store_id: values.store_id || null,
    is_active: values.is_active,
  };
}
