const User = require("../models/User");
const { tokenFromRequest, verifySessionToken } = require("../services/session");
const { sendError } = require("../utils/http");

async function optionalAuth(req, _res, next) {
  try {
    const token = tokenFromRequest(req);
    const payload = verifySessionToken(token);
    req.user = payload ? await User.findById(payload.sub) : null;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = tokenFromRequest(req);
    const payload = verifySessionToken(token);
    if (!payload) return sendError(res, 401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน");

    const user = await User.findById(payload.sub);
    if (!user) return sendError(res, 401, "AUTH_REQUIRED", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, "FORBIDDEN", "บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้");
    }
    next();
  };
}

module.exports = { optionalAuth, requireAuth, requireRole };
