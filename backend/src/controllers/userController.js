const User = require("../models/User");
const { hashPassword } = require("../services/password");
const { userView } = require("../services/user-view");
const { sendError } = require("../utils/http");

const createUser = async (req, res) => {
  const { name, email, password, phone = null, role = "customer" } = req.body || {};
  if (!name || !email || !password) {
    return sendError(res, 400, "VALIDATION_ERROR", "name, email และ password เป็นข้อมูลที่จำเป็น");
  }
  const exists = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (exists) return sendError(res, 409, "EMAIL_EXISTS", "อีเมลนี้ถูกใช้งานแล้ว");

  const user = await User.create({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone,
    role,
    password_hash: await hashPassword(String(password)),
  });
  return res.status(201).json({ user: userView(user) });
};

const getUsers = async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json({ users: users.map(userView) });
};

module.exports = { createUser, getUsers };
