import { meetsPasswordPolicy } from "./password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email.trim());
}

/** Strips spaces and dashes, e.g. "081-234-5678" → "0812345678". */
export function normalizePhone(phone) {
  return phone.replace(/[\s-]/g, "");
}

export function isValidThaiPhone(phone) {
  return /^0\d{8,9}$/.test(normalizePhone(phone));
}

export function validateRegistration(input) {
  const errors = {};
  if (!input.name.trim()) errors.name = "กรอกชื่อที่ใช้แสดง";
  if (!isValidEmail(input.email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  if (input.phone.trim() && !isValidThaiPhone(input.phone)) {
    errors.phone = "เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0";
  }
  if (!meetsPasswordPolicy(input.password)) {
    errors.password = "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว และมีทั้งตัวอักษรและตัวเลข";
  }
  if (!input.acceptedTerms) errors.acceptedTerms = "กรุณายอมรับเงื่อนไขก่อนสมัคร";
  return errors;
}
