const mongoose = require("mongoose");
const CustomerCoupon = require("../models/CustomerCoupon");
const Promotion = require("../models/Promotion");
const Store = require("../models/Store");
const User = require("../models/User");
const { couponSelection } = require("./coupon-input");
const { promotionDiscount } = require("./order-pricing");
const { sendError } = require("../utils/http");

const fail = (code, message, status = 400) => Object.assign(new Error(message), { code, message, status });
const id = (value) => value?._id || value;
function usedBy(promotion, userId) {
  const usage = promotion?.usage_by_customer;
  return Number(usage?.get ? usage.get(String(userId)) || 0 : usage?.[String(userId)] || 0);
}
function publicPromotionView(promotion, store = null) {
  return {
    id: String(promotion._id), storeId: promotion.store_id ? String(id(promotion.store_id)) : null,
    storeName: store?.name || null, code: promotion.code, title: promotion.title, description: promotion.description || "",
    discountType: promotion.discount_type, discountValue: promotion.discount_value,
    minimumOrder: promotion.minimum_order || 0, maxDiscount: promotion.max_discount ?? null,
    startsAt: promotion.start_date, expiresAt: promotion.expire_date, updatedAt: promotion.updatedAt,
    perUserLimit: promotion.per_user_limit ?? null, usageLimit: promotion.usage_limit ?? null,
    usedCount: Number(promotion.used_count || 0),
    remainingGlobalUses: promotion.usage_limit == null ? null : Math.max(0, promotion.usage_limit - Number(promotion.used_count || 0)),
  };
}
async function storeVisibility(storeIds) {
  const stores = await Store.find({ _id: { $in: storeIds } }).lean();
  const owners = await User.find({ _id: { $in: stores.map((store) => store.owner_id).filter(Boolean) }, status: "active", role: { $in: ["merchant", "staff"] } }).select("_id").lean();
  const activeOwners = new Set(owners.map((owner) => String(owner._id)));
  return new Map(stores.map((store) => [String(store._id), { store, visible: (!store.status || store.status === "active") && (!store.owner_id || activeOwners.has(String(store.owner_id))) }]));
}
function availability(promotion, userId, storeInfo, now = new Date()) {
  if (!promotion) return { canUse: false, unavailableReason: "คูปองนี้ถูกลบแล้ว", remainingUses: 0 };
  const remainingUses = promotion.per_user_limit == null ? null : Math.max(0, promotion.per_user_limit - usedBy(promotion, userId));
  let reason = null;
  if (!promotion.is_active) reason = "คูปองนี้ถูกปิดใช้งานแล้ว";
  else if (promotion.store_id && !storeInfo?.visible) reason = "ร้านของคูปองนี้ไม่เปิดให้บริการแล้ว";
  else if (new Date(promotion.expire_date) <= now) reason = "คูปองนี้หมดอายุแล้ว";
  else if (new Date(promotion.start_date) > now) reason = "ยังไม่ถึงเวลาใช้คูปองนี้";
  else if (promotion.usage_limit != null && promotion.used_count >= promotion.usage_limit) reason = "คูปองนี้ถูกใช้ครบจำนวนแล้ว";
  else if (remainingUses !== null && remainingUses <= 0) reason = "คุณใช้คูปองนี้ครบสิทธิ์แล้ว";
  return { canUse: !reason, unavailableReason: reason, remainingUses };
}
function couponView(collection, promotion, storeInfo, userId) {
  const data = promotion ? publicPromotionView(promotion, storeInfo?.store) : collection.snapshot || {};
  return { ...data, id: String(collection.promotion_id), promotionId: String(collection.promotion_id),
    collectedAt: collection.collected_at, ...availability(promotion, userId, storeInfo) };
}
async function views(collections, userId) {
  const promotions = await Promotion.find({ _id: { $in: collections.map((row) => row.promotion_id) } });
  const byId = new Map(promotions.map((promotion) => [String(promotion._id), promotion]));
  const stores = await storeVisibility(promotions.map((promotion) => promotion.store_id).filter(Boolean));
  return collections.map((row) => {
    const promotion = byId.get(String(row.promotion_id));
    return couponView(row, promotion, promotion?.store_id ? stores.get(String(promotion.store_id)) : null, userId);
  });
}
async function list(req, res) {
  const collections = await CustomerCoupon.find({ user_id: req.user._id }).sort({ collected_at: -1, _id: -1 });
  return res.json({ coupons: await views(collections, req.user._id) });
}
async function collect(req, res) {
  if (!mongoose.isValidObjectId(req.params.promotionId)) return sendError(res, 400, "INVALID_COUPON", "รหัสคูปองไม่ถูกต้อง");
  const key = { user_id: req.user._id, promotion_id: req.params.promotionId };
  const existing = await CustomerCoupon.findOne(key);
  if (existing) return res.json({ coupon: (await views([existing], req.user._id))[0] });
  const promotion = await Promotion.findById(req.params.promotionId);
  if (!promotion) return sendError(res, 404, "COUPON_NOT_FOUND", "ไม่พบคูปองนี้");
  const stores = await storeVisibility(promotion.store_id ? [promotion.store_id] : []);
  const store = promotion.store_id ? stores.get(String(promotion.store_id)) : null;
  const state = availability(promotion, req.user._id, store);
  // An upcoming coupon can be saved in advance, but cannot be redeemed yet.
  if (!promotion.is_active || new Date(promotion.expire_date) <= new Date() || (promotion.store_id && !store?.visible)) return sendError(res, 409, "COUPON_UNAVAILABLE", state.unavailableReason);
  if ((promotion.usage_limit != null && promotion.used_count >= promotion.usage_limit) || state.remainingUses === 0) return sendError(res, 409, "COUPON_LIMIT", state.unavailableReason);
  let collection;
  let created = true;
  try { collection = await CustomerCoupon.create({ ...key, snapshot: publicPromotionView(promotion, store?.store) }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    collection = await CustomerCoupon.findOne(key); created = false;
  }
  return res.status(created ? 201 : 200).json({ coupon: (await views([collection], req.user._id))[0] });
}
async function resolveForCheckout(userId, input, storeId, subtotal) {
  const selection = couponSelection(input);
  if (!selection.couponId && !selection.couponCode) return { promotion: null, discount: 0 };
  let promotion;
  if (selection.couponId) {
    if (!await CustomerCoupon.exists({ user_id: userId, promotion_id: selection.couponId })) throw fail("COUPON_NOT_COLLECTED", "กรุณาเก็บคูปองนี้เข้าบัญชีก่อนใช้งาน", 403);
    promotion = await Promotion.findById(selection.couponId);
  } else {
    const owned = await CustomerCoupon.find({ user_id: userId }).select("promotion_id");
    const matching = await Promotion.find({ _id: { $in: owned.map((row) => row.promotion_id) }, code: selection.couponCode });
    const applicable = matching.filter((row) => !row.store_id || String(row.store_id) === String(storeId));
    if (!applicable.length) throw matching.length ? fail("COUPON_WRONG_STORE", "คูปองนี้ใช้กับร้านอื่นเท่านั้น") : fail("COUPON_NOT_COLLECTED", "กรุณาเก็บคูปองนี้เข้าบัญชีก่อนใช้งาน", 403);
    if (applicable.length > 1) throw fail("COUPON_AMBIGUOUS", "มีคูปองรหัสเดียวกันหลายใบ กรุณาเลือกคูปองที่ต้องการใช้", 409);
    promotion = applicable[0];
  }
  if (!promotion) throw fail("INVALID_COUPON", "คูปองไม่ถูกต้องหรือถูกลบแล้ว");
  if (selection.couponCode && selection.couponCode !== promotion.code) throw fail("COUPON_MISMATCH", "รหัสคูปองไม่ตรงกับคูปองที่เลือก");
  if (promotion.store_id && String(promotion.store_id) !== String(storeId)) throw fail("COUPON_WRONG_STORE", "คูปองนี้ใช้กับร้านอื่นเท่านั้น");
  const discount = promotionDiscount(promotion, subtotal);
  if (promotion.per_user_limit != null && usedBy(promotion, userId) >= promotion.per_user_limit) throw fail("COUPON_LIMIT", "คุณใช้คูปองนี้ครบสิทธิ์แล้ว", 409);
  return { promotion, discount };
}

module.exports = { publicPromotionView, availability, usedBy, list, collect, resolveForCheckout };
