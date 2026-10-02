/** ค่าในฟอร์มเป็นข้อความตามที่พิมพ์ toMenuFields() แปลงเป็น field ตาม Menu model */

export const MENU_LIMITS = {
  nameMax: 60,
  descriptionMax: 200,
  priceMax: 5000,
  cookTimeMax: 120,
};

export function emptyMenuValues() {
  return { name: "", category: "", price: "", cook_time: "", description: "", image: null, is_available: true };
}

export function menuToValues(menu) {
  return {
    name: menu.name,
    category: menu.category,
    price: String(menu.price),
    cook_time: String(menu.cook_time),
    description: menu.description ?? "",
    image: menu.image ?? null,
    is_available: menu.is_available,
  };
}

function isWholeNumber(value) {
  return /^\d+$/.test(value.trim());
}

/** คืน { field: ข้อความ } ของทุกช่องที่ผิด ถ้าได้ object ว่างแปลว่าบันทึกได้ */
export function validateMenu(values, menus, editingId = null) {
  const errors = {};
  const name = values.name.trim();
  if (!name) errors.name = "กรอกชื่อเมนู";
  else if (name.length > MENU_LIMITS.nameMax) errors.name = `ชื่อเมนูยาวได้ไม่เกิน ${MENU_LIMITS.nameMax} ตัวอักษร`;
  else if (menus.some((m) => m._id !== editingId && m.name.trim() === name)) errors.name = "มีเมนูชื่อนี้อยู่แล้ว";

  if (!values.category) errors.category = "เลือกหมวดหมู่";

  const price = Number(values.price);
  if (!values.price.trim()) errors.price = "กรอกราคา";
  else if (!isWholeNumber(values.price) || price < 1 || price > MENU_LIMITS.priceMax)
    errors.price = `ราคาต้องเป็นจำนวนเต็ม 1–${MENU_LIMITS.priceMax.toLocaleString("th-TH")} บาท`;

  const cookTime = Number(values.cook_time);
  if (!values.cook_time.trim()) errors.cook_time = "กรอกเวลาทำโดยประมาณ";
  else if (!isWholeNumber(values.cook_time) || cookTime < 1 || cookTime > MENU_LIMITS.cookTimeMax)
    errors.cook_time = `เวลาทำต้องเป็นจำนวนเต็ม 1–${MENU_LIMITS.cookTimeMax} นาที`;

  if (values.description.trim().length > MENU_LIMITS.descriptionMax)
    errors.description = `คำอธิบายยาวได้ไม่เกิน ${MENU_LIMITS.descriptionMax} ตัวอักษร`;

  return errors;
}

export function toMenuFields(values) {
  return {
    name: values.name.trim(),
    category: values.category,
    price: Number(values.price),
    cook_time: Number(values.cook_time),
    description: values.description.trim(),
    image: values.image,
    is_available: values.is_available,
  };
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIDE = 480;

/**
 * ย่อรูปที่เลือกเป็น JPEG data URL ขนาดเล็ก แล้วเก็บลง Menu.image ตรง ๆ
 * TODO(api): เปลี่ยนไปใช้ endpoint อัปโหลดรูปที่คืน URL เมื่อ backend มีให้
 */
export async function readMenuImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("เลือกได้เฉพาะไฟล์รูปภาพ");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("รูปใหญ่เกิน 5 MB");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("เปิดไฟล์รูปนี้ไม่ได้ ลองใช้ไฟล์ JPG หรือ PNG");
  }
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}
