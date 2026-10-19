function invalid(code, message, status = 400) {
  throw Object.assign(new Error(message), { code, status });
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateOrderInput(input) {
  require("./coupon-input").couponSelection(input || {});
  if (!Array.isArray(input?.items) || input.items.length === 0) invalid("EMPTY_ORDER", "ตะกร้ายังไม่มีรายการอาหาร");
  if (input.items.length > 50) invalid("TOO_MANY_ITEMS", "สั่งได้ไม่เกิน 50 รายการต่อออเดอร์");
  for (const item of input.items) {
    if (!item || typeof item.menuId !== "string" || !item.menuId.trim()) invalid("INVALID_MENU", "รหัสเมนูไม่ถูกต้อง");
    if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      invalid("INVALID_QUANTITY", "จำนวนอาหารต้องเป็นจำนวนเต็มตั้งแต่ 1-99");
    }
    if (item.note !== undefined && (typeof item.note !== "string" || item.note.length > 500)) invalid("INVALID_NOTE", "หมายเหตุต้องไม่เกิน 500 ตัวอักษร");
  }
  const paymentMethod = input.paymentMethod || "promptpay";
  if (!["promptpay", "card", "banking", "wallet"].includes(paymentMethod)) invalid("INVALID_PAYMENT_METHOD", "วิธีชำระเงินไม่ถูกต้อง");
  return paymentMethod;
}

function priceOrderItem(menu, input) {
  if (!menu.is_available) invalid("MENU_UNAVAILABLE", "มีเมนูที่ปิดขายอยู่ในตะกร้า", 409);
  const selections = input.selections || {};
  if (typeof selections !== "object" || Array.isArray(selections)) invalid("INVALID_OPTIONS", "ตัวเลือกอาหารไม่ถูกต้อง");
  const groups = menu.option_groups || [];
  const groupIds = new Set(groups.map((group) => group.id));
  if (Object.keys(selections).some((key) => !groupIds.has(key))) invalid("INVALID_OPTIONS", "มีกลุ่มตัวเลือกอาหารที่ไม่มีในเมนู");
  const clean = {};
  const selectedOptions = [];
  let extra = 0;
  for (const group of groups) {
    const selected = selections[group.id] || [];
    if (!Array.isArray(selected) || selected.some((id) => typeof id !== "string") || new Set(selected).size !== selected.length) {
      invalid("INVALID_OPTIONS", "ตัวเลือกอาหารซ้ำหรือไม่ถูกต้อง");
    }
    const min = group.required ? Math.max(1, Number(group.min || 1)) : Number(group.min || 0);
    const max = group.multiple ? Number(group.max ?? group.options?.length ?? 0) : 1;
    if (selected.length < min || selected.length > max) invalid("INVALID_OPTIONS", `กรุณาเลือก ${group.label || group.id} ให้ครบและถูกต้อง`);
    for (const id of selected) {
      const option = (group.options || []).find((candidate) => candidate.id === id);
      if (!option || option.isAvailable === false || option.is_available === false) invalid("INVALID_OPTIONS", "ตัวเลือกอาหารนี้ไม่มีหรือปิดขายแล้ว");
      const surcharge = Number(option.price || 0);
      if (!Number.isFinite(surcharge) || surcharge < 0) invalid("INVALID_MENU_PRICE", "ราคาเมนูไม่ถูกต้อง", 409);
      extra += surcharge;
      selectedOptions.push({ groupId: group.id, optionId: id, groupLabel: group.label || group.id, label: option.label || id, price: surcharge });
    }
    clean[group.id] = selected;
  }
  const price = money(Number(menu.price) + extra);
  if (!Number.isFinite(price) || price < 0) invalid("INVALID_MENU_PRICE", "ราคาเมนูไม่ถูกต้อง", 409);
  return {
    menu_id: menu._id, client_menu_id: menu.client_id, name: menu.name,
    price, quantity: input.quantity, total_price: money(price * input.quantity),
    selections: clean, selected_options: selectedOptions, cook_time: Number(menu.cook_time || 5), note: (input.note || "").trim(),
  };
}

function promotionDiscount(promotion, subtotal, now = new Date()) {
  if (!promotion || !promotion.is_active || new Date(promotion.start_date) > now || new Date(promotion.expire_date) <= now) {
    invalid("INVALID_COUPON", "คูปองไม่ถูกต้องหรือหมดอายุแล้ว");
  }
  if (subtotal < Number(promotion.minimum_order || 0)) invalid("COUPON_MINIMUM", `ยอดอาหารขั้นต่ำสำหรับคูปองนี้คือ ${promotion.minimum_order} บาท`);
  if (promotion.usage_limit !== null && promotion.usage_limit !== undefined && promotion.used_count >= promotion.usage_limit) invalid("COUPON_LIMIT", "คูปองนี้ถูกใช้ครบจำนวนแล้ว", 409);
  const raw = promotion.discount_type === "percentage" ? subtotal * promotion.discount_value / 100 : promotion.discount_value;
  return money(Math.min(subtotal, raw, promotion.max_discount ?? Infinity));
}

module.exports = { money, validateOrderInput, priceOrderItem, promotionDiscount };
