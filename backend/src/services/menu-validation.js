function fail(message = "ข้อมูลเมนูไม่ถูกต้อง") {
  throw Object.assign(new Error(message), { status: 400, code: "VALIDATION_ERROR" });
}

function text(value, label, { empty = true, max = 1000 } = {}) {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim())) fail(`${label}ไม่ถูกต้อง`);
  return value.trim();
}

function validateOptionGroups(input) {
  if (!Array.isArray(input) || input.length > 30) fail("กลุ่มตัวเลือกต้องเป็นรายการไม่เกิน 30 กลุ่ม");
  const ids = new Set();
  return input.map((group) => {
    if (!group || typeof group !== "object" || !/^[\w-]{1,60}$/.test(group.id) || ids.has(group.id)) fail("รหัสกลุ่มตัวเลือกต้องไม่ซ้ำกัน");
    ids.add(group.id);
    if (typeof group.required !== "boolean" || typeof group.multiple !== "boolean") fail("ชนิดกลุ่มตัวเลือกไม่ถูกต้อง");
    if (!Array.isArray(group.options) || group.options.length === 0 || group.options.length > 100) fail("แต่ละกลุ่มต้องมีตัวเลือก 1-100 รายการ");
    const optionIds = new Set();
    const options = group.options.map((option) => {
      if (!option || !/^[\w-]{1,60}$/.test(option.id) || optionIds.has(option.id)) fail("รหัสตัวเลือกต้องไม่ซ้ำกัน");
      optionIds.add(option.id);
      if (typeof option.price !== "number" || !Number.isFinite(option.price) || option.price < 0 || option.price > 100000) fail("ราคาตัวเลือกไม่ถูกต้อง");
      if (option.default !== undefined && typeof option.default !== "boolean") fail("ตัวเลือกเริ่มต้นไม่ถูกต้อง");
      if (option.isAvailable !== undefined && typeof option.isAvailable !== "boolean") fail("สถานะตัวเลือกไม่ถูกต้อง");
      return { id: option.id, label: text(option.label, "ชื่อตัวเลือก", { empty: false, max: 100 }), price: option.price, ...(option.default !== undefined ? { default: option.default } : {}), ...(option.isAvailable !== undefined ? { isAvailable: option.isAvailable } : {}) };
    });
    const min = group.min ?? (group.required ? 1 : 0);
    const max = group.max ?? (group.multiple ? options.length : 1);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < (group.required ? 1 : 0) || max < min || max > options.length || (!group.multiple && max !== 1)) fail("จำนวนตัวเลือกขั้นต่ำหรือสูงสุดไม่ถูกต้อง");
    return { id: group.id, label: text(group.label, "ชื่อกลุ่มตัวเลือก", { empty: false, max: 100 }), required: group.required, multiple: group.multiple, min, max, options };
  });
}

function menuChanges(input, create = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail();
  const result = {};
  for (const [field, max] of [["name", 200], ["description", 2000], ["category", 100]]) {
    if (input[field] !== undefined) result[field] = text(input[field], field, { empty: field === "description", max });
  }
  if (create && !result.name) fail("กรุณากรอกชื่อเมนู");
  if (input.price !== undefined) {
    if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0 || input.price > 100000) fail("ราคาเมนูไม่ถูกต้อง");
    result.price = input.price;
  } else if (create) fail("กรุณากรอกราคาเมนู");
  if (input.cookTime !== undefined) {
    if (!Number.isInteger(input.cookTime) || input.cookTime < 0 || input.cookTime > 240) fail("เวลาทำอาหารต้องเป็นจำนวนเต็ม 0-240 นาที");
    result.cook_time = input.cookTime;
  }
  if (input.isAvailable !== undefined) {
    if (typeof input.isAvailable !== "boolean") fail("สถานะเปิดขายไม่ถูกต้อง");
    result.is_available = input.isAvailable;
  }
  if (input.image !== undefined) {
    if (input.image !== null && (typeof input.image !== "string" || input.image.length > 1_000_000)) fail("รูปภาพเมนูไม่ถูกต้อง");
    result.image = input.image;
  }
  if (input.optionGroups !== undefined) result.option_groups = validateOptionGroups(input.optionGroups);
  if (create) {
    result.category ??= "single";
    result.description ??= "";
    result.cook_time ??= 0;
    result.is_available ??= true;
  }
  return result;
}

module.exports = { menuChanges, validateOptionGroups };
