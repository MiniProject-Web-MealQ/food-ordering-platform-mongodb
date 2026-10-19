const crypto = require("crypto");
const User = require("../models/User");
const { hashPassword } = require("../services/password");
const { parseCookies, setSessionCookie } = require("../services/session");
const { normalizeRole, validEmail } = require("../services/auth-validation");
const { createCorsOptions } = require("../config/cors");
const { ensureMerchantStore } = require("./authController");
const { sendError } = require("../utils/http");

const COOKIE = "mealq_google_state";
const cookieOptions = (req) => ({ httpOnly: true, sameSite: "lax", secure: req.secure || process.env.NODE_ENV === "production" || req.headers["x-forwarded-proto"] === "https", path: "/api/v1/auth/google" });
const secret = () => process.env.SESSION_SECRET || "mealq-dev-change-me";
const sign = (value) => crypto.createHmac("sha256", secret()).update(value).digest("base64url");
const configured = () => process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
const frontendOrigin = () => new URL((process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim()).origin;
const callbackUrl = () => process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/v1/auth/google/callback";

function start(req, res) {
  if (!configured()) return sendError(res, 503, "GOOGLE_AUTH_NOT_CONFIGURED", "Google Login ยังไม่เปิดใช้งาน");
  const portal = normalizeRole(req.query.portal);
  if (!portal) return sendError(res, 400, "INVALID_ROLE", "ประเภทบัญชีไม่ถูกต้อง");
  let origin = frontendOrigin();
  if (typeof req.query.returnOrigin === "string") {
    createCorsOptions(process.env.FRONTEND_URL || origin).origin(req.query.returnOrigin, (error, allowed) => {
      if (!error && allowed) origin = req.query.returnOrigin;
    });
  }
  const nonce = crypto.randomBytes(32).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ nonce, portal, origin, expires: Date.now() + 600000 })).toString("base64url");
  res.cookie(COOKIE, nonce, { ...cookieOptions(req), maxAge: 600000 });
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: callbackUrl(), response_type: "code", scope: "openid email profile", state: `${payload}.${sign(payload)}`, prompt: "select_account" });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function callback(req, res) {
  res.clearCookie(COOKIE, cookieOptions(req));
  let state;
  try {
    if (!configured() || typeof req.query.state !== "string") throw new Error("state");
    const [payload, signature, extra] = req.query.state.split(".");
    const expected = Buffer.from(sign(payload));
    const provided = Buffer.from(signature || "");
    if (extra || expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) throw new Error("state");
    state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (state.expires <= Date.now() || parseCookies(req.headers.cookie)[COOKIE] !== state.nonce) throw new Error("state");
  } catch {
    return res.redirect(`${frontendOrigin()}/login?authError=invalid-state`);
  }
  const failure = (code) => res.redirect(`${state.origin}/login?role=${state.portal}&authError=${code}`);
  if (typeof req.query.code !== "string" || req.query.error) return failure("google-cancelled");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: callbackUrl(), grant_type: "authorization_code" }), signal: AbortSignal.timeout(10000) });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) return failure("google-failed");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000) });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email_verified || !validEmail(profile.email) || typeof profile.sub !== "string") return failure("google-failed");
    let user = await User.findOne({ email: profile.email.toLowerCase() });
    if (user && user.role !== state.portal) return failure("role-mismatch");
    if (user?.status === "suspended") return failure("account-suspended");
    if (!user) user = await User.create({ name: profile.name || profile.email.split("@")[0], email: profile.email.toLowerCase(), google_id: profile.sub, role: state.portal, password_hash: await hashPassword(crypto.randomBytes(32).toString("hex")) });
    else if (!user.google_id) { user.google_id = profile.sub; await user.save(); }
    else if (user.google_id !== profile.sub) return failure("google-failed");
    if (!user.email_verified_at) { user.email_verified_at = new Date(); await user.save(); }
    await ensureMerchantStore(user);
    setSessionCookie(res, user._id, true, user.session_version);
    return res.redirect(`${state.origin}${state.portal === "merchant" ? "/merchant/dashboard" : "/customer"}`);
  } catch {
    return failure("google-failed");
  }
}

module.exports = { start, callback };
