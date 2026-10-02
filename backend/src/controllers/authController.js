const crypto = require("crypto");
const User = require("../models/User");
const Store = require("../models/Store");
const { hashPassword, verifyPassword } = require("../services/password");
const { setSessionCookie, clearSessionCookie } = require("../services/session");
const { userView } = require("../services/user-view");
const { sendError } = require("../utils/http");
const { validEmail, validPassword, normalizeRole } = require("../services/auth-validation");
const { mailConfigured, sendResetEmail } = require("../services/mail");

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
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100 || !validEmail(email) || typeof password !== "string" || (phone !== null && typeof phone !== "string")) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ");
  }
  if (!validPassword(password)) {
    return sendError(res, 400, "WEAK_PASSWORD", "รหัสผ่านต้องมี 8–128 ตัวอักษร มีทั้งตัวอักษรและตัวเลข");
  }
  const accountRole = normalizeRole(role);
  if (!accountRole) return sendError(res, 400, "INVALID_ROLE", "สมัครได้เฉพาะบัญชีลูกค้าหรือร้านค้า");

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return sendError(res, 409, "EMAIL_EXISTS", "อีเมลนี้ถูกใช้งานแล้ว");

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone || null,
    password_hash: await hashPassword(String(password)),
    role: accountRole,
  });

  const store = await ensureMerchantStore(user);
  setSessionCookie(res, user._id, true, user.session_version);
  return res.status(201).json({
    user: userView(user),
    store: store ? { id: String(store._id), name: store.name } : null,
  });
}

async function login(req, res) {
  const { email, password, rememberMe = true, portal } = req.body || {};
  if (!validEmail(email) || typeof password !== "string" || !password || password.length > 128 || typeof rememberMe !== "boolean") {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณากรอกอีเมลและรหัสผ่าน");
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  const valid = user ? await verifyPassword(String(password), user.password_hash) : false;
  if (!user || !valid) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  if (user.status === "suspended") return sendError(res, 403, "ACCOUNT_SUSPENDED", "บัญชีนี้ถูกระงับการใช้งาน");
  const expectedRole = normalizeRole(portal, true);
  if (!expectedRole || (portal && expectedRole !== user.role && !(expectedRole === "merchant" && user.role === "staff"))) {
    return sendError(res, 403, "ROLE_MISMATCH", "บัญชีนี้ไม่ได้อยู่ในประเภทที่เลือก");
  }

  const store = await ensureMerchantStore(user);
  setSessionCookie(res, user._id, rememberMe, user.session_version);
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
  if (!validEmail(req.body?.email)) return sendError(res, 400, "VALIDATION_ERROR", "รูปแบบอีเมลไม่ถูกต้อง");
  if (process.env.NODE_ENV === "production" && !mailConfigured()) {
    return sendError(res, 503, "EMAIL_NOT_CONFIGURED", "ระบบส่งอีเมลยังไม่พร้อม กรุณาติดต่อผู้ดูแล");
  }
  const email = req.body.email.trim().toLowerCase();
  const user = await User.findOne({ email });
  let devResetToken = null;
  if (user) {
    devResetToken = crypto.randomBytes(24).toString("hex");
    user.reset_token_hash = crypto.createHash("sha256").update(devResetToken).digest("hex");
    user.reset_token_expires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    if (mailConfigured()) {
      const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
      await sendResetEmail(email, `${frontendUrl}/reset-password?token=${devResetToken}`);
    }
  }

  const payload = { message: "ถ้ามีบัญชีนี้ ระบบได้สร้างคำขอเปลี่ยนรหัสผ่านแล้ว" };
  if (process.env.NODE_ENV !== "production" && devResetToken) payload.devResetToken = devResetToken;
  return res.json(payload);
}

async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (!validPassword(password)) {
    return sendError(res, 400, "WEAK_PASSWORD", "รหัสผ่านต้องมี 8–128 ตัวอักษร มีทั้งตัวอักษรและตัวเลข");
  }
  if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) return sendError(res, 400, "INVALID_RESET_TOKEN", "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const filter = { reset_token_hash: tokenHash, reset_token_expires: { $gt: new Date() }, status: { $ne: "suspended" } };
  if (!await User.exists(filter)) return sendError(res, 400, "INVALID_RESET_TOKEN", "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว");
  const user = await User.findOneAndUpdate(filter, { $set: { password_hash: await hashPassword(password), must_change_password: false, reset_token_hash: null, reset_token_expires: null }, $inc: { session_version: 1 } });
  if (!user) return sendError(res, 400, "INVALID_RESET_TOKEN", "ลิงก์นี้ถูกใช้แล้ว");
  clearSessionCookie(res);
  return res.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || currentPassword.length > 128 || !validPassword(newPassword)) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรอกรหัสผ่านเดิมและรหัสผ่านใหม่ที่มี 8–128 ตัวอักษร มีตัวอักษรและตัวเลข");
  }
  if (!await verifyPassword(currentPassword, req.user.password_hash)) return sendError(res, 400, "INVALID_PASSWORD", "รหัสผ่านเดิมไม่ถูกต้อง");
  req.user.password_hash = await hashPassword(newPassword);
  req.user.must_change_password = false;
  req.user.session_version = (req.user.session_version || 0) + 1;
  req.user.reset_token_hash = null;
  req.user.reset_token_expires = null;
  await req.user.save();
  req.app.get("io")?.in(`user:${req.user._id}`).disconnectSockets(true);
  setSessionCookie(res, req.user._id, true, req.user.session_version);
  return res.json({ user: userView(req.user), message: "เปลี่ยนรหัสผ่านแล้ว" });
}

function capabilities(_req, res) {
  return res.json({ google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), email: mailConfigured(), paymentMode: process.env.NODE_ENV === "production" ? "live" : "sandbox" });
}

function googleNotConfigured(_req, res) {
  return sendError(res, 501, "GOOGLE_AUTH_NOT_CONFIGURED", "Google Sign-In ยังไม่ได้ตั้งค่าในโปรเจกต์นี้");
}

module.exports = { register, login, logout, me, forgotPassword, resetPassword, changePassword, capabilities, googleNotConfigured, ensureMerchantStore };
