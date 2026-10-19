const invalid = (message = "หนึ่งออเดอร์ใช้คูปองได้เพียง 1 ใบ") => Object.assign(new Error(message), { status: 400, code: "INVALID_COUPON_SELECTION" });

function couponSelection(input = {}) {
  for (const key of ["coupons", "couponIds", "couponCodes", "coupon", "promotions", "promotionIds", "promotionCodes"]) {
    if (Object.hasOwn(input, key)) throw invalid();
  }
  // Older clients send null when no coupon is selected.
  if (input.couponCode != null && typeof input.couponCode !== "string") throw invalid();
  const couponCode = (input.couponCode || "").trim().toUpperCase();
  if (couponCode && !/^[A-Z0-9]{3,20}$/.test(couponCode)) throw invalid("รหัสคูปองไม่ถูกต้อง กรุณาเลือกคูปองเพียง 1 ใบ");
  let couponId;
  if (Object.hasOwn(input, "couponId")) {
    if (typeof input.couponId !== "string" || !/^[a-f0-9]{24}$/i.test(input.couponId.trim())) throw invalid("รหัสอ้างอิงคูปองไม่ถูกต้อง");
    couponId = input.couponId.trim().toLowerCase();
  }
  return { couponCode, ...(couponId !== undefined ? { couponId } : {}) };
}

module.exports = { couponSelection };
