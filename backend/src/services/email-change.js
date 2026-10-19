const crypto = require("crypto");
const EmailChange = require("../models/EmailChange");
const User = require("../models/User");
const { validEmail } = require("./auth-validation");
const { rateLimit, hashOtp, otpError } = require("./registration-otp");
const { mailConfigured, sendEmailChangeOtp } = require("./mail");
const { setSessionCookie } = require("./session");
const { userView } = require("./user-view");

async function start(req, res) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!validEmail(email) || email === req.user.email) throw otpError(400, "INVALID_EMAIL", "กรอกอีเมลใหม่ที่ถูกต้อง");
  if (!mailConfigured()) throw otpError(503, "EMAIL_NOT_CONFIGURED", "ยังไม่ได้ตั้งค่าระบบส่งอีเมล");
  await rateLimit(req.user.id, "change-email-send", 10);
  if (await User.exists({ email })) throw otpError(409, "EMAIL_EXISTS", "อีเมลนี้ถูกใช้งานแล้ว");
  const now = new Date();
  await EmailChange.updateOne({ _id: req.user._id, window_end: { $lte: now } }, { $set: { send_count: 0, window_end: new Date(Date.now() + 3600000) } });
  const ticket = crypto.randomBytes(24).toString("hex");
  const code = String(crypto.randomInt(1000000)).padStart(6, "0");
  let challenge;
  try {
    challenge = await EmailChange.findOneAndUpdate({ _id: req.user._id, resend_after: { $lte: now }, send_count: { $lt: 5 } }, {
      $set: { email, original_email: req.user.email, session_version: req.user.session_version || 0, ticket, otp_hash: hashOtp(ticket, code), ready: false, attempts: 5, expires_at: new Date(Date.now() + 600000), resend_after: new Date(Date.now() + 60000), delete_after: new Date(Date.now() + 86400000) },
      $inc: { send_count: 1 }, $setOnInsert: { window_end: new Date(Date.now() + 3600000) },
    }, { upsert: true, returnDocument: "after" });
  } catch (error) { if (error.code !== 11000) throw error; throw otpError(429, "OTP_SEND_LIMIT", "กรุณารอ 1 นาที หรือส่งครบ 5 ครั้งให้รอ 1 ชั่วโมง"); }
  try { await sendEmailChangeOtp(email, code); } catch { throw otpError(503, "EMAIL_SEND_FAILED", "ส่ง OTP ไม่สำเร็จ กรุณาลองใหม่ใน 1 นาที"); }
  await EmailChange.updateOne({ _id: req.user._id, ticket }, { $set: { ready: true } });
  res.status(202).json({ ticket, email, expiresAt: challenge.expires_at, resendAfter: challenge.resend_after });
}

async function verify(req, res) {
  await rateLimit(req.user.id, "change-email-verify", 50);
  const { ticket, code } = req.body || {};
  if (!/^[a-f0-9]{48}$/.test(ticket || "") || !/^\d{6}$/.test(code || "")) throw otpError(400, "INVALID_OTP", "กรอก OTP ตัวเลข 6 หลัก");
  const query = { _id: req.user._id, ticket, original_email: req.user.email, session_version: req.user.session_version || 0, ready: true, expires_at: { $gt: new Date() } };
  const challenge = await EmailChange.findOneAndUpdate({ ...query, attempts: { $gt: 0 } }, { $inc: { attempts: -1 } }, { returnDocument: "before" }).select("+otp_hash");
  if (!challenge) throw otpError(410, "OTP_EXPIRED", "OTP หมดอายุหรือกรอกผิดครบจำนวน กรุณาขอใหม่");
  if (!crypto.timingSafeEqual(Buffer.from(challenge.otp_hash, "hex"), Buffer.from(hashOtp(ticket, code), "hex"))) throw otpError(400, "OTP_MISMATCH", "OTP ไม่ถูกต้อง");
  const claimed = await EmailChange.findOneAndUpdate({ ...query, otp_hash: challenge.otp_hash }, { $set: { ready: false } }, { returnDocument: "after" });
  if (!claimed) throw otpError(409, "OTP_ALREADY_USED", "OTP นี้ถูกใช้แล้ว");
  const user = await User.findOneAndUpdate({ _id: req.user._id, email: req.user.email, session_version: req.user.session_version || 0 }, { $set: { email: challenge.email, email_verified_at: new Date(), google_id: null, reset_token_hash: null, reset_token_expires: null }, $inc: { session_version: 1 } }, { returnDocument: "after", runValidators: true });
  if (!user) throw otpError(409, "ACCOUNT_CHANGED", "ข้อมูลบัญชีเปลี่ยน กรุณาเข้าสู่ระบบใหม่");
  await EmailChange.deleteOne({ _id: req.user._id, ticket });
  req.app.get("io")?.in(`user:${user.id}`).disconnectSockets(true);
  setSessionCookie(res, user.id, true, user.session_version);
  res.json({ user: userView(user) });
}
module.exports = { start, verify };
