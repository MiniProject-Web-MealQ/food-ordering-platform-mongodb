const crypto = require("crypto");
const User = require("../models/User");
const Store = require("../models/Store");
const { hashPassword, verifyPassword } = require("../services/password");
const { setSessionCookie, clearSessionCookie } = require("../services/session");
const { userView } = require("../services/user-view");
const { sendError } = require("../utils/http");

const resetTokens = new Map();

function normalizeRole(input) {
  const role = String(input || "CUSTOMER").toUpperCase();
  return role === "MERCHANT" ? "merchant" : "customer";
}

async function ensureMerchantStore(user) {
  if (user.role !== "merchant") return null;
  let store = await Store.findOne({ owner_id: user._id });
  if (!store) {
    store = await Store.create({
      owner_id: user._id,
      name: user.name || "ร้านของฉัน",
      description: "ร้านค้าที่สร้างจากบัญชี Merchant",
      is_open: true,
    });
  }
  return store;
}

async function register(req, res) {
  const { name, email, phone = null, password, role } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ");
  }
  if (String(password).length < 8) {
    return sendError(res, 400, "WEAK_PASSWORD", "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return sendError(res, 409, "EMAIL_EXISTS", "อีเมลนี้ถูกใช้งานแล้ว");

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone || null,
    password_hash: await hashPassword(String(password)),
    role: normalizeRole(role),
  });

  const store = await ensureMerchantStore(user);
  setSessionCookie(res, user._id, true);
  return res.status(201).json({
    user: userView(user),
    store: store ? { id: String(store._id), name: store.name } : null,
  });
}

async function login(req, res) {
  const { email, password, rememberMe = true, portal } = req.body || {};
  if (!email || !password) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณากรอกอีเมลและรหัสผ่าน");
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  const valid = user ? await verifyPassword(String(password), user.password_hash) : false;
  if (!user || !valid) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  const expectedRole = normalizeRole(portal);
  if (portal && expectedRole !== user.role && !(expectedRole === "merchant" && ["staff", "admin"].includes(user.role))) {
    return sendError(res, 403, "ROLE_MISMATCH", "บัญชีนี้ไม่ได้อยู่ในประเภทที่เลือก");
  }

  const store = await ensureMerchantStore(user);
  setSessionCookie(res, user._id, Boolean(rememberMe));
  return res.json({
    user: userView(user),
    store: store ? { id: String(store._id), name: store.name } : null,
  });
}

async function logout(_req, res) {
  clearSessionCookie(res);
  return res.json({ ok: true });
}

async function me(req, res) {
  const store = await ensureMerchantStore(req.user);
  return res.json({
    user: userView(req.user),
    store: store ? { id: String(store._id), name: store.name } : null,
  });
}

async function forgotPassword(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const user = email ? await User.findOne({ email }) : null;
  let devResetToken = null;
  if (user) {
    devResetToken = crypto.randomBytes(24).toString("hex");
    resetTokens.set(devResetToken, { userId: String(user._id), expiresAt: Date.now() + 15 * 60 * 1000 });
  }

  const payload = { message: "ถ้ามีบัญชีนี้ ระบบได้สร้างคำขอเปลี่ยนรหัสผ่านแล้ว" };
  if (process.env.NODE_ENV !== "production" && devResetToken) payload.devResetToken = devResetToken;
  return res.json(payload);
}

async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    return sendError(res, 400, "INVALID_RESET_TOKEN", "ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุแล้ว");
  }
  if (!password || String(password).length < 8) {
    return sendError(res, 400, "WEAK_PASSWORD", "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }

  const user = await User.findById(entry.userId);
  if (!user) return sendError(res, 400, "INVALID_RESET_TOKEN", "ไม่พบบัญชีสำหรับคำขอนี้");
  user.password_hash = await hashPassword(String(password));
  await user.save();
  resetTokens.delete(token);
  return res.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
}

function googleNotConfigured(_req, res) {
  return sendError(res, 501, "GOOGLE_AUTH_NOT_CONFIGURED", "Google Sign-In ยังไม่ได้ตั้งค่าในโปรเจกต์นี้");
}

module.exports = { register, login, logout, me, forgotPassword, resetPassword, googleNotConfigured };
