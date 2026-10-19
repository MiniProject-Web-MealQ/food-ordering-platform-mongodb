const crypto = require("crypto");
const PendingRegistration = require("../models/PendingRegistration");
const AuthRateLimit = require("../models/AuthRateLimit");
const User = require("../models/User");
const { hashPassword } = require("./password");
const { mailConfigured, sendRegistrationOtp } = require("./mail");

const OTP_LIFETIME = 10 * 60 * 1000;
const RESEND_DELAY = 60 * 1000;
const WINDOW = 60 * 60 * 1000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;

const otpError = (status, code, message, details) => Object.assign(new Error(message), { status, code, details });
const validRegistrationId = (value) => typeof value === "string" && /^[a-f0-9]{48}$/.test(value);
const digest = (value) => crypto.createHmac("sha256", process.env.SESSION_SECRET || "mealq-dev-change-me").update(value).digest("hex");
const hashOtp = (registrationId, code) => digest(`${registrationId}:${code}`);

async function rateLimit(ip, action, maximum) {
  const now = Date.now();
  const key = `${action}:${Math.floor(now / WINDOW)}:${digest(String(ip || "unknown"))}`;
  const update = { $inc: { count: 1 }, $setOnInsert: { expires_at: new Date(now + 2 * WINDOW) } };
  let row;
  try { row = await AuthRateLimit.findByIdAndUpdate(key, update, { upsert: true, returnDocument: "after" }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    row = await AuthRateLimit.findByIdAndUpdate(key, { $inc: { count: 1 } }, { returnDocument: "after" });
  }
  if (row.count > maximum) throw otpError(429, "OTP_RATE_LIMIT", "ส่งคำขอมากเกินไป กรุณาลองใหม่ภายหลัง");
}

function challengeView(challenge) {
  return { verificationRequired: true, registrationId: challenge.registration_id, email: challenge.email, expiresAt: challenge.expires_at, resendAfter: challenge.resend_after };
}

async function issueOtp(fields, ip, registrationId = null, previousOtpHash = null) {
  if (!mailConfigured()) throw otpError(503, "EMAIL_NOT_CONFIGURED", "ระบบส่งอีเมลยังไม่พร้อม กรุณาลองสมัครใหม่ภายหลัง");
  await rateLimit(ip, "registration-send", 20);
  const now = new Date();
  if (await User.exists({ email: fields.email })) throw otpError(409, "EMAIL_EXISTS", "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ");
  const { password, ...draft } = fields;
  if (password !== undefined) draft.password_hash = await hashPassword(password);
  // Check retention and reset the hourly budget without waiting for TTL deletion.
  await PendingRegistration.deleteOne({ email: fields.email, delete_after: { $lte: now } });
  await PendingRegistration.updateOne({ email: fields.email, window_resets_at: { $lte: now } }, { $set: { send_count: 0, window_resets_at: new Date(now.getTime() + WINDOW) } });
  const id = registrationId || crypto.randomBytes(24).toString("hex");
  let code;
  do { code = String(crypto.randomInt(0, 1000000)).padStart(6, "0"); } while (previousOtpHash === hashOtp(id, code));
  const query = {
    email: fields.email,
    ...(registrationId ? { registration_id: registrationId } : {}),
    resend_after: { $lte: now },
    send_count: { $lt: MAX_SENDS },
  };
  // A new signup rotates the ticket; every resend invalidates the previous code.
  const changes = { $set: {
    ...draft, registration_id: id, otp_hash: hashOtp(id, code), ready: false,
    expires_at: new Date(now.getTime() + OTP_LIFETIME), resend_after: new Date(now.getTime() + RESEND_DELAY), attempts_remaining: MAX_ATTEMPTS,
    delete_after: new Date(now.getTime() + 24 * WINDOW),
  }, $inc: { send_count: 1 }, $setOnInsert: { window_resets_at: new Date(now.getTime() + WINDOW) } };
  let challenge;
  try {
    challenge = await PendingRegistration.findOneAndUpdate(query, changes, { upsert: !registrationId, returnDocument: "after", setDefaultsOnInsert: false, runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    challenge = null;
  }
  if (!challenge) {
    const previous = await PendingRegistration.findOne({ email: fields.email });
    if (!previous || (registrationId && previous.registration_id !== registrationId)) throw otpError(410, "REGISTRATION_EXPIRED", "คำขอสมัครนี้หมดอายุหรือถูกแทนที่แล้ว กรุณาสมัครใหม่");
    const waitUntil = previous.send_count >= MAX_SENDS ? previous.window_resets_at : previous.resend_after;
    throw otpError(429, "OTP_SEND_LIMIT", previous.send_count >= MAX_SENDS ? "ส่ง OTP ครบ 5 ครั้งแล้ว กรุณาลองสมัครใหม่หลังครบหนึ่งชั่วโมง" : "กรุณารอก่อนส่ง OTP อีกครั้ง", { retryAfter: waitUntil });
  }
  try {
    await sendRegistrationOtp(fields.email, code);
  } catch {
    // Keep the cooldown on failed deliveries as well; never return an OTP to clients.
    throw otpError(503, "EMAIL_SEND_FAILED", "ส่ง OTP ไม่สำเร็จ กรุณาตรวจอีเมลและลองอีกครั้งใน 1 นาที");
  }
  const published = await PendingRegistration.findOneAndUpdate({ _id: challenge._id, registration_id: id, otp_hash: hashOtp(id, code) }, { $set: { ready: true } }, { returnDocument: "after" });
  if (!published) throw otpError(409, "OTP_CHANGED", "มีการขอรหัสใหม่แล้ว กรุณาใช้คำขอล่าสุด");
  return challengeView(published);
}

async function startRegistration(fields, ip) {
  return issueOtp(fields, ip);
}

async function resendOtp(registrationId, ip) {
  if (!validRegistrationId(registrationId)) throw otpError(400, "INVALID_REGISTRATION", "คำขอยืนยันอีเมลไม่ถูกต้อง");
  const previous = await PendingRegistration.findOne({ registration_id: registrationId, delete_after: { $gt: new Date() } }).select("+password_hash +otp_hash");
  if (!previous) throw otpError(410, "REGISTRATION_EXPIRED", "คำขอสมัครหมดอายุ กรุณาสมัครใหม่");
  return issueOtp({ email: previous.email, name: previous.name, phone: previous.phone, role: previous.role, password_hash: previous.password_hash }, ip, registrationId, previous.otp_hash);
}

async function consumeOtp(registrationId, code, ip) {
  await rateLimit(ip, "registration-verify", 100);
  if (!validRegistrationId(registrationId) || typeof code !== "string" || !/^\d{6}$/.test(code)) throw otpError(400, "INVALID_OTP", "กรอก OTP ตัวเลข 6 หลักจากอีเมล");
  const now = new Date();
  const attempt = await PendingRegistration.findOneAndUpdate({ registration_id: registrationId, ready: true, expires_at: { $gt: now }, delete_after: { $gt: now }, attempts_remaining: { $gt: 0 } }, { $inc: { attempts_remaining: -1 } }, { returnDocument: "before" }).select("+otp_hash +password_hash");
  if (!attempt) {
    const current = await PendingRegistration.findOne({ registration_id: registrationId });
    if (current && current.attempts_remaining <= 0) throw otpError(429, "OTP_ATTEMPTS_EXCEEDED", "กรอกรหัสผิดครบ 5 ครั้งแล้ว กรุณาขอ OTP ใหม่");
    throw otpError(410, "OTP_EXPIRED", "OTP หมดอายุ ถูกใช้แล้ว หรือมีรหัสใหม่ กรุณาขอรหัสอีกครั้ง");
  }
  const actual = Buffer.from(hashOtp(registrationId, code), "hex");
  const expected = Buffer.from(attempt.otp_hash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw otpError(attempt.attempts_remaining === 1 ? 429 : 400, attempt.attempts_remaining === 1 ? "OTP_ATTEMPTS_EXCEEDED" : "OTP_MISMATCH", attempt.attempts_remaining === 1 ? "กรอกรหัสผิดครบ 5 ครั้งแล้ว กรุณาขอ OTP ใหม่" : "OTP ไม่ถูกต้อง กรุณาตรวจอีเมลแล้วลองอีกครั้ง");
  const consumed = await PendingRegistration.findOneAndDelete({ _id: attempt._id, registration_id: registrationId, otp_hash: attempt.otp_hash, ready: true, expires_at: { $gt: new Date() }, delete_after: { $gt: new Date() } }).select("+password_hash");
  if (!consumed) throw otpError(409, "OTP_ALREADY_USED", "รหัสนี้ถูกใช้หรือเปลี่ยนแล้ว กรุณาเข้าสู่ระบบหรือสมัครใหม่");
  return consumed;
}

module.exports = { startRegistration, resendOtp, consumeOtp, rateLimit, hashOtp, otpError };
