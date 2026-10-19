const round = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
const finite = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

export function couponLabel(coupon) {
  return coupon.discountType === "percentage" ? `ลด ${coupon.discountValue}%` : `ลด ฿${coupon.discountValue}`;
}

/** Eligibility is recalculated for this basket; the server still validates ownership and quotas at payment. */
export function couponEligibility(coupon, { restaurantIds = [], subtotal = null, now = Date.now(), requireSaved = true, forCollection = false } = {}) {
  const fail = (reason) => ({ eligible: false, reason, discount: 0 });
  if (!coupon) return fail("ไม่พบคูปองที่เลือก กรุณาเลือกใหม่หรือไม่ใช้คูปอง");
  if (requireSaved && (!coupon.collectedAt || coupon.canUse !== true)) return fail(coupon.unavailableReason || "คูปองนี้ยังใช้กับบัญชีนี้ไม่ได้ กรุณาเก็บคูปองหรือเลือกใหม่");
  if (coupon.canUse === false) return fail(coupon.unavailableReason || "คูปองนี้ไม่พร้อมใช้งาน");
  if ((coupon.startsAt && !Number.isFinite(new Date(coupon.startsAt).getTime())) || (coupon.expiresAt && !Number.isFinite(new Date(coupon.expiresAt).getTime()))) return fail("ข้อมูลช่วงเวลาใช้คูปองไม่สมบูรณ์ กรุณาเลือกใหม่");
  if (!forCollection && coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return fail("ยังไม่ถึงเวลาใช้คูปอง");
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= now) return fail("คูปองหมดอายุแล้ว");
  if (finite(coupon.remainingUses) && Number(coupon.remainingUses) <= 0) return fail("ใช้ครบสิทธิ์ของบัญชีนี้แล้ว");
  if (finite(coupon.remainingGlobalUses) && Number(coupon.remainingGlobalUses) <= 0) return fail("คูปองถูกใช้ครบจำนวนแล้ว");
  const scopedStore = coupon.storeId || coupon.restaurantId;
  if (scopedStore && restaurantIds.length && !restaurantIds.includes(scopedStore)) return fail(`ใช้ได้เฉพาะร้าน ${coupon.storeName || "ที่กำหนด"}`);
  const minimum = Number(coupon.minimumOrder || 0);
  if (subtotal !== null && subtotal < minimum) return fail(`ยอดอาหารขั้นต่ำ ฿${minimum.toLocaleString("th-TH")} (ขาดอีก ฿${round(minimum - subtotal).toLocaleString("th-TH")})`);
  const value = Number(coupon.discountValue);
  if (!["percentage", "fixed"].includes(coupon.discountType) || !Number.isFinite(value) || value <= 0) return fail("ข้อมูลส่วนลดไม่สมบูรณ์ กรุณาเลือกคูปองใหม่");
  let discount = subtotal === null ? 0 : coupon.discountType === "percentage" ? subtotal * value / 100 : value;
  if (finite(coupon.maxDiscount)) discount = Math.min(discount, Math.max(0, Number(coupon.maxDiscount)));
  discount = round(Math.min(Math.max(0, subtotal || 0), Math.max(0, discount)));
  return { eligible: true, reason: null, discount };
}

/** Select by canonical ID only: identical public codes may belong to different stores. Never auto-select. */
export function selectedCoupon(cart, savedCoupons, context = {}) {
  if (!cart.couponId && !cart.couponCode) return { coupon: null, selected: null, issue: null, discount: 0 };
  if (!cart.couponId || typeof cart.couponId !== "string") return { coupon: null, selected: null, issue: "กรุณาเลือกคูปองที่เก็บไว้ใหม่ หรือเลือกไม่ใช้คูปอง", discount: 0 };
  const selected = savedCoupons.find((coupon) => coupon.id === cart.couponId) || null;
  const eligibility = couponEligibility(selected, context);
  if (!eligibility.eligible) return { coupon: null, selected, issue: eligibility.reason, discount: 0 };
  if (cart.couponCode !== selected.code) return { coupon: null, selected, issue: "รายละเอียดคูปองเปลี่ยนแล้ว กรุณาเลือกคูปองใหม่", discount: 0 };
  return { coupon: selected, selected, issue: null, discount: eligibility.discount };
}

export function mergeCollectedCoupon(coupons, coupon) {
  if (!coupon?.id) return coupons;
  return coupons.some((saved) => saved.id === coupon.id) ? coupons.map((saved) => saved.id === coupon.id ? coupon : saved) : [coupon, ...coupons];
}
