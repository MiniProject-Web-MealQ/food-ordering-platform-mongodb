/**
 * ตัวเลือกเสริมของเมนู (Menu.option_groups) เช่น ระดับความเผ็ด ความหวาน เลือกเส้น เพิ่มพิเศษ
 *
 * รูปแบบใน state (snake_case ตาม model):
 *   { id, label, required, multiple, min, max, options: [{ id, label, price, default, is_available }] }
 * backend ตรวจตาม services/menu-validation.js (branch remaining-integration):
 *   id ต้องเป็น a-z 0-9 _ - (ภาษาไทยไม่ได้) จึงสร้าง id ให้เอง ส่วนชื่อที่ลูกค้าเห็นอยู่ใน label
 *
 * ในฟอร์มเก็บราคาและจำนวนสูงสุดเป็นข้อความตามที่พิมพ์ toOptionGroupFields() แปลงเป็นตัวเลขตอนบันทึก
 */

export const OPTION_LIMITS = { groups: 10, options: 20, labelMax: 60, priceMax: 1000 };

/** ชุดสำเร็จรูปที่ร้านกดเพิ่มได้ในปุ่มเดียว แล้วแก้ต่อเองได้ */
export const OPTION_PRESETS = [
  {
    id: "spice",
    label: "ระดับความเผ็ด",
    required: true,
    multiple: false,
    options: [
      { id: "none", label: "ไม่เผ็ด", price: 0 },
      { id: "mild", label: "เผ็ดน้อย", price: 0 },
      { id: "normal", label: "เผ็ดปกติ", price: 0, default: true },
      { id: "hot", label: "เผ็ดมาก", price: 0 },
    ],
  },
  {
    id: "sweetness",
    label: "ระดับความหวาน",
    required: true,
    multiple: false,
    options: [
      { id: "normal", label: "หวานปกติ", price: 0, default: true },
      { id: "less", label: "หวานน้อย", price: 0 },
      { id: "none", label: "ไม่หวาน", price: 0 },
    ],
  },
  {
    id: "temperature",
    label: "อุณหภูมิ",
    required: true,
    multiple: false,
    options: [
      { id: "cold", label: "เย็น", price: 0, default: true },
      { id: "hot", label: "ร้อน", price: 0 },
      { id: "frappe", label: "ปั่น", price: 10 },
    ],
  },
  {
    id: "noodle",
    label: "เลือกเส้น",
    required: true,
    multiple: false,
    options: [
      { id: "small", label: "เส้นเล็ก", price: 0, default: true },
      { id: "big", label: "เส้นใหญ่", price: 0 },
      { id: "vermicelli", label: "เส้นหมี่", price: 0 },
      { id: "egg", label: "บะหมี่", price: 0 },
    ],
  },
  {
    id: "extras",
    label: "เพิ่มพิเศษ",
    required: false,
    multiple: true,
    options: [
      { id: "pork", label: "เพิ่มหมู", price: 15 },
      { id: "beef", label: "เพิ่มเนื้อ", price: 20 },
      { id: "seafood", label: "เพิ่มทะเล", price: 30 },
      { id: "fried-egg", label: "ไข่ดาว", price: 10 },
    ],
  },
];

/** สร้าง id ใหม่ที่ backend ยอมรับ (เรียกจาก event handler เท่านั้น ไม่เรียกตอน render) */
export function newOptionId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function optionToValue(option) {
  return {
    id: option.id,
    label: option.label ?? "",
    price: String(option.price ?? 0),
    default: Boolean(option.default),
    is_available: option.is_available !== false,
  };
}

/** แปลงกลุ่มจาก state/ชุดสำเร็จรูป เป็นค่าที่ใช้ในฟอร์ม (ราคา/จำนวนเป็นข้อความ) */
export function groupToValue(group) {
  const options = (group.options ?? []).map(optionToValue);
  const max = group.multiple && group.max && group.max < options.length ? String(group.max) : "";
  return { id: group.id, label: group.label ?? "", required: Boolean(group.required), multiple: Boolean(group.multiple), max, options };
}

/** ชุดสำเร็จรูป / กลุ่มที่คัดลอกจากเมนูอื่น: ถ้า id ชนกับกลุ่มที่มีอยู่ ใช้ id ใหม่ */
export function copyGroup(group, existing) {
  const value = groupToValue(group);
  if (existing.some((g) => g.id === value.id)) value.id = newOptionId("g");
  return value;
}

export function emptyGroup() {
  return {
    id: newOptionId("g"),
    label: "",
    required: false,
    multiple: false,
    max: "",
    options: [{ id: newOptionId("o"), label: "", price: "0", default: false, is_available: true }],
  };
}

export function emptyOption() {
  return { id: newOptionId("o"), label: "", price: "0", default: false, is_available: true };
}

/** id ของช่องในฟอร์ม ใช้ทั้งแสดง error และย้าย focus ไปช่องแรกที่ผิด */
export const optionFieldId = {
  groupLabel: (g) => `og-${g}-label`,
  groupMax: (g) => `og-${g}-max`,
  groupOptions: (g) => `og-${g}-add`,
  optionLabel: (g, o) => `og-${g}-o-${o}-label`,
  optionPrice: (g, o) => `og-${g}-o-${o}-price`,
};

/** ตรวจกลุ่มตัวเลือก คืน { [fieldId]: ข้อความ } เรียงตามลำดับในฟอร์ม */
export function validateOptionGroups(groups) {
  const errors = {};
  const groupLabels = new Set();
  groups.forEach((group, g) => {
    const label = group.label.trim();
    if (!label) errors[optionFieldId.groupLabel(g)] = "ตั้งชื่อกลุ่ม เช่น ระดับความเผ็ด";
    else if (label.length > OPTION_LIMITS.labelMax) errors[optionFieldId.groupLabel(g)] = `ชื่อกลุ่มยาวได้ไม่เกิน ${OPTION_LIMITS.labelMax} ตัวอักษร`;
    else if (groupLabels.has(label)) errors[optionFieldId.groupLabel(g)] = "มีกลุ่มชื่อนี้แล้ว";
    groupLabels.add(label);

    const optionLabels = new Set();
    group.options.forEach((option, o) => {
      const text = option.label.trim();
      if (!text) errors[optionFieldId.optionLabel(g, o)] = "ตั้งชื่อตัวเลือก";
      else if (text.length > OPTION_LIMITS.labelMax) errors[optionFieldId.optionLabel(g, o)] = `ยาวได้ไม่เกิน ${OPTION_LIMITS.labelMax} ตัวอักษร`;
      else if (optionLabels.has(text)) errors[optionFieldId.optionLabel(g, o)] = "ชื่อซ้ำในกลุ่มนี้";
      optionLabels.add(text);
      const price = option.price.trim();
      if (!/^\d+$/.test(price) || Number(price) > OPTION_LIMITS.priceMax) {
        errors[optionFieldId.optionPrice(g, o)] = `ราคาเพิ่มต้องเป็นจำนวนเต็ม 0–${OPTION_LIMITS.priceMax}`;
      }
    });

    if (group.options.length === 0) errors[optionFieldId.groupOptions(g)] = "ต้องมีตัวเลือกอย่างน้อย 1 อย่าง";
    else if (group.required && !group.options.some((o) => o.is_available)) {
      errors[optionFieldId.groupOptions(g)] = "กลุ่มที่บังคับเลือกต้องมีตัวเลือกที่มีขายอย่างน้อย 1 อย่าง";
    }
    if (group.multiple && group.max.trim()) {
      const max = Number(group.max);
      const min = group.required ? 1 : 0;
      if (!/^\d+$/.test(group.max.trim()) || max < Math.max(1, min) || max > group.options.length) {
        errors[optionFieldId.groupMax(g)] = `เลือกได้สูงสุดต้องอยู่ระหว่าง ${Math.max(1, min)}–${group.options.length} (เว้นว่าง = ไม่จำกัด)`;
      }
    }
  });
  return errors;
}

/** แปลงค่าจากฟอร์มกลับเป็นรูปแบบ model (ตัวเลขจริง min/max ตามที่ backend ตรวจ) */
export function toOptionGroupFields(groups) {
  return groups.map((group) => {
    const options = group.options.map((o) => ({
      id: o.id,
      label: o.label.trim(),
      price: Number(o.price),
      // ค่าเริ่มต้นมีความหมายเฉพาะกลุ่มเลือก 1 อย่าง และต้องเป็นตัวเลือกที่มีขาย
      default: !group.multiple && o.default && o.is_available,
      is_available: o.is_available,
    }));
    const min = group.required ? 1 : 0;
    const max = group.multiple ? (group.max.trim() ? Number(group.max) : options.length) : 1;
    return { id: group.id, label: group.label.trim(), required: group.required, multiple: group.multiple, min, max, options };
  });
}

/**
 * backend เก็บตัวเลือกที่ส่งไปจริงไหม (เทียบ id ของกลุ่มและจำนวนตัวเลือกกับเมนูที่ API ตอบกลับ)
 * ใช้ตรวจว่าข้อมูลที่ตอบกลับตรงกับตัวเลือกที่ส่งไป
 */
export function optionGroupsStored(sentGroups, savedMenu) {
  const saved = savedMenu?.optionGroups ?? [];
  return (
    sentGroups.length === saved.length &&
    sentGroups.every((group, i) => saved[i]?.id === group.id && (saved[i]?.options?.length ?? 0) === group.options.length)
  );
}

/** แปลงตัวเลือกที่ลูกค้าเลือกในออเดอร์ ({ groupId: [optionId] }) เป็นชื่อสำหรับครัว */
export function selectionLabels(selections, menu, snapshot) {
  if (Array.isArray(snapshot)) return snapshot.map((option) => ({ key: `${option.groupId}:${option.optionId}`, text: option.label, extra: option.price > 0 }));
  if (!selections || typeof selections !== "object") return [];
  const labels = [];
  for (const [groupId, optionIds] of Object.entries(selections)) {
    const group = menu?.option_groups?.find((g) => g.id === groupId);
    for (const optionId of [].concat(optionIds ?? [])) {
      const option = group?.options.find((o) => o.id === optionId);
      // Legacy orders without a snapshot fall back to the current menu or raw id.
      const name = option?.label ?? optionId;
      labels.push({ key: `${groupId}:${optionId}`, text: group?.multiple ? `+${name}` : name, extra: (option?.price ?? 0) > 0 });
    }
  }
  return labels;
}
