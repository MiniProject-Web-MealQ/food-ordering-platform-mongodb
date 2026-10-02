const crypto = require("crypto");

const COOKIE_NAME = "mealq_session";

function secret() {
  if (process.env.NODE_ENV === "production" && (!process.env.SESSION_SECRET || ["change-this-for-real-deployment", "mealq-dev-change-me"].includes(process.env.SESSION_SECRET))) {
    throw new Error("Set a unique SESSION_SECRET before running in production");
  }
  return process.env.SESSION_SECRET || "mealq-dev-change-me";
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function signature(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function createSessionToken(userId, maxAgeMs, version = 0) {
  const payload = encode({ sub: String(userId), exp: Date.now() + maxAgeMs, ver: version });
  return `${payload}.${signature(payload)}`;
}

function verifySessionToken(token) {
  if (typeof token !== "string") return null;
  const [payload, sig, extra] = token.split(".");
  if (extra) return null;
  if (!payload || !sig) return null;

  const expected = signature(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const data = decode(payload);
  if (typeof data?.sub !== "string" || !/^[a-f0-9]{24}$/i.test(data.sub) || !Number.isFinite(data?.exp) || data.exp <= Date.now()) return null;
  return data;
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index < 0) return [part, ""];
        try { return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]; }
        catch { return [part.slice(0, index), ""]; }
      }),
  );
}

function tokenFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[COOKIE_NAME] || null;
}

function sessionCookieOptions(res) {
  const req = res.req;
  const forwardedProto = req?.headers["x-forwarded-proto"]?.split(",")[0].trim();
  const https = req?.secure || forwardedProto === "https" || req?.headers.origin?.startsWith("https://");
  return {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: Boolean(https || process.env.NODE_ENV === "production"),
    path: "/",
  };
}

function setSessionCookie(res, userId, rememberMe = true, version = 0) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const token = createSessionToken(userId, maxAge, version);
  res.cookie(COOKIE_NAME, token, {
    ...sessionCookieOptions(res),
    ...(rememberMe ? { maxAge } : {}),
  });
  return token;
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, sessionCookieOptions(res));
}

module.exports = {
  COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  parseCookies,
  tokenFromRequest,
  setSessionCookie,
  clearSessionCookie,
};
