const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Store = require("../models/Store");
const Menu = require("../models/Menu");
const CustomerProfile = require("../models/CustomerProfile");
const WalletTransaction = require("../models/WalletTransaction");
const { userView } = require("../services/user-view");
const { ensureWallet, changeBalance } = require("../services/wallet");
const { sendError } = require("../utils/http");
const { demoPaymentsEnabled } = require("../services/payment-config");

async function ensureProfile(userId) {
  try {
    return await CustomerProfile.findOneAndUpdate({ user_id: userId }, { $setOnInsert: { user_id: userId } }, {
      upsert: true, returnDocument: "after", setDefaultsOnInsert: true,
    });
  } catch (error) {
    if (error.code === 11000) return CustomerProfile.findOne({ user_id: userId });
    throw error;
  }
}

async function getProfile(req, res) {
  const profile = await ensureProfile(req.user._id);
  return res.json({ user: userView(req.user), settings: profile.settings });
}

async function updateProfile(req, res) {
  const { name, email, phone } = req.body || {};
  const changes = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) return sendError(res, 400, "INVALID_NAME", "ชื่อต้องมีความยาว 1-100 ตัวอักษร");
    changes.name = name.trim();
  }
  if (email !== undefined) {
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return sendError(res, 400, "INVALID_EMAIL", "รูปแบบอีเมลไม่ถูกต้อง");
    if (email.trim().toLowerCase() !== req.user.email) return sendError(res, 409, "EMAIL_VERIFICATION_REQUIRED", "กรุณายืนยันอีเมลใหม่ด้วย OTP ก่อนเปลี่ยน");
  }
  if (phone !== undefined) {
    const normalized = phone === null ? null : typeof phone === "string" ? phone.replace(/[\s-]/g, "") : undefined;
    if (normalized === undefined || (normalized && !/^\+?[0-9]{8,15}$/.test(normalized))) return sendError(res, 400, "INVALID_PHONE", "รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง");
    changes.phone = normalized || null;
  }
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: changes }, { returnDocument: "after", runValidators: true });
    return res.json({ user: userView(user) });
  } catch (error) {
    if (error.code === 11000) return sendError(res, 409, "EMAIL_EXISTS", "อีเมลนี้ถูกใช้งานแล้ว");
    throw error;
  }
}

async function getFavorites(req, res) {
  const profile = await ensureProfile(req.user._id);
  return res.json({ favorites: { restaurants: await normalizeIds(Store, profile.favorites.restaurants), menus: await normalizeIds(Menu, profile.favorites.menus) } });
}

async function normalizeIds(model, input) {
  if (!Array.isArray(input) || input.length > 300 || input.some((id) => typeof id !== "string" || !id || id.length > 100)) return null;
  const ids = [...new Set(input)];
  const objectIds = ids.filter((id) => mongoose.isValidObjectId(id));
  const records = await model.find({ $or: [{ client_id: { $in: ids } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])] }).select("client_id");
  const byId = new Map(records.flatMap((record) => [[String(record._id), record.client_id || String(record._id)], ...(record.client_id ? [[record.client_id, record.client_id]] : [])]));
  return [...new Set(ids.filter((id) => byId.has(id)).map((id) => byId.get(id)))];
}

async function updateFavorites(req, res) {
  const input = req.body?.favorites || req.body;
  const [restaurants, menus] = await Promise.all([normalizeIds(Store, input?.restaurants), normalizeIds(Menu, input?.menus)]);
  if (!restaurants || !menus) return sendError(res, 400, "INVALID_FAVORITES", "รายการโปรดมีร้านหรือเมนูที่ไม่ถูกต้อง");
  const profile = await CustomerProfile.findOneAndUpdate({ user_id: req.user._id }, { $set: { favorites: { restaurants, menus } } }, {
    upsert: true, returnDocument: "after", setDefaultsOnInsert: true,
  });
  return res.json({ favorites: profile.favorites });
}

async function updateSettings(req, res) {
  const changes = {};
  for (const key of ["notifyReady", "promotions"]) {
    if (req.body?.[key] !== undefined) {
      if (typeof req.body[key] !== "boolean") return sendError(res, 400, "INVALID_SETTINGS", "การตั้งค่าไม่ถูกต้อง");
      changes[`settings.${key}`] = req.body[key];
    }
  }
  if (req.body?.paymentMethod !== undefined) {
    if (!["promptpay", "card", "banking", "wallet"].includes(req.body.paymentMethod)) return sendError(res, 400, "INVALID_SETTINGS", "วิธีชำระเงินไม่ถูกต้อง");
    changes["settings.paymentMethod"] = req.body.paymentMethod;
  }
  const profile = await ensureProfile(req.user._id);
  const updated = await CustomerProfile.findByIdAndUpdate(profile._id, { $set: changes }, { returnDocument: "after" });
  return res.json({ settings: updated.settings });
}

function transactionView(tx) {
  return { id: String(tx._id), type: tx.type, amount: tx.amount * (tx.direction === "debit" || tx.type === "payment" ? -1 : 1), description: tx.description, balanceBefore: tx.balance_before, balanceAfter: tx.balance_after, createdAt: tx.createdAt };
}

async function getWallet(req, res) {
  const [wallet, transactions] = await Promise.all([ensureWallet(req.user._id), WalletTransaction.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(100)]);
  return res.json({ wallet: { balance: wallet.balance }, transactions: transactions.map(transactionView), sandboxTopup: demoPaymentsEnabled() });
}

async function topupWallet(req, res) {
  if (!demoPaymentsEnabled()) return sendError(res, 501, "PAYMENT_NOT_CONFIGURED", "ยังไม่ได้เชื่อมต่อผู้ให้บริการเติมเงินจริง");
  const amount = req.body?.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1 || amount > 10000 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7) return sendError(res, 400, "INVALID_AMOUNT", "เติมเงินทดสอบได้ตั้งแต่ 1-10,000 บาท");
  const requestKey = req.headers["idempotency-key"] || crypto.randomUUID();
  if (typeof requestKey !== "string" || !/^[\w-]{1,100}$/.test(requestKey)) return sendError(res, 400, "INVALID_REQUEST_KEY", "รหัสคำขอไม่ถูกต้อง");
  try {
    const result = await changeBalance({ userId: req.user._id, amount, type: "topup", key: `topup:${req.user._id}:${requestKey}`, description: "เติมเงินในโหมดทดสอบ (ไม่มีการตัดเงินจริง)" });
    return res.status(201).json({ wallet: { balance: result.wallet.balance }, transaction: transactionView(result.transaction), paymentMode: "sandbox" });
  } catch (error) {
    if (error.code && error.status) return sendError(res, error.status, error.code, error.message);
    throw error;
  }
}

module.exports = { getProfile, updateProfile, getFavorites, updateFavorites, updateSettings, getWallet, topupWallet };
