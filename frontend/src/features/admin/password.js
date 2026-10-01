/**
 * เกณฑ์รหัสผ่านของบัญชีผู้ดูแลระบบ (เข้มกว่าบัญชีลูกค้า/ร้านค้าใน features/auth/password.js)
 * อย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข
 */
export const ADMIN_PASSWORD_RULES = [
  { id: "length", label: "อย่างน้อย 8 ตัวอักษร", test: (p) => p.length >= 8 },
  { id: "upper", label: "มีตัวพิมพ์ใหญ่ (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "มีตัวพิมพ์เล็ก (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "มีตัวเลข (0–9)", test: (p) => /\d/.test(p) },
];

export function checkAdminPassword(password) {
  return ADMIN_PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, passed: rule.test(password) }));
}

export function isStrongAdminPassword(password) {
  return ADMIN_PASSWORD_RULES.every((rule) => rule.test(password));
}

/** ตรวจรหัสผ่านใหม่กับช่องยืนยัน คืน { password?, confirm? } เฉพาะช่องที่ผิด */
export function validateNewPassword(password, confirm) {
  const errors = {};
  if (!password) errors.password = "กรอกรหัสผ่าน";
  else if (!isStrongAdminPassword(password)) errors.password = "รหัสผ่านยังไม่ผ่านเกณฑ์ด้านล่าง";
  if (!confirm) errors.confirm = "กรอกรหัสผ่านอีกครั้ง";
  else if (confirm !== password) errors.confirm = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
  return errors;
}
