const mongoose = require("mongoose");
const User = require("../models/User");
const Store = require("../models/Store");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Promotion = require("../models/Promotion");
const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const AdminActivity = require("../models/AdminActivity");
const { hashPassword } = require("../services/password");
const { sendError } = require("../utils/http");
const { changeBalance } = require("../services/wallet");
const { cancelOrder: cancelOrderWithRefund } = require("../services/order-lifecycle");
const SystemSettings = require("../models/SystemSettings");
const { getSettings } = require("../services/settings");
const { capabilities, forgotPassword } = require("./authController");

async function settings(req, res) {
  const config = await getSettings();
  let services;
  capabilities(req, { json: (value) => { services = value; } });
  return res.json({ settings: config, services });
}

async function updateSettings(req, res) {
  const { service_fee, accepting_orders } = req.body || {};
  if (!Number.isFinite(service_fee) || service_fee < 0 || service_fee > 1000 || Math.abs(service_fee * 100 - Math.round(service_fee * 100)) > 1e-7 || typeof accepting_orders !== "boolean") return sendError(res, 400, "VALIDATION_ERROR", "ตรวจสอบค่าบริการ 0–1,000 บาทและสถานะรับออเดอร์");
  const config = await SystemSettings.findByIdAndUpdate("global", { $set: { service_fee, accepting_orders } }, { upsert: true, returnDocument: "after", runValidators: true });
  await audit(req, "settings.update", "settings", config, `ค่าบริการ ${service_fee} บาท · รับออเดอร์ ${accepting_orders}`);
  return res.json({ ok: true, settings: config });
}

async function resetUserPassword(req, res) {
  if (!validId(req.params.id)) return sendError(res, 404, "NOT_FOUND", "ไม่พบผู้ใช้");
  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 404, "NOT_FOUND", "ไม่พบผู้ใช้");
  if (user.status === "suspended") return sendError(res, 409, "ACCOUNT_SUSPENDED", "เปิดใช้งานบัญชีก่อนส่งคำขอตั้งรหัสผ่าน");
  // Capture the shared reset flow so the administrator action is audited before responding.
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await forgotPassword({ body: { email: user.email } }, response);
  if (response.code === 200) await audit(req, "user.resetPassword", "user", user);
  return res.status(response.code).json(response.body);
}

const validId = (id) => mongoose.isValidObjectId(id);
const id = (value) => value == null ? null : String(value);
const time = (value) => value ? new Date(value).getTime() : null;
const plain = (document) => ({ ...document, _id: id(document._id), created_at: time(document.createdAt), updated_at: time(document.updatedAt) });
const userFields = (user) => ({
  _id: id(user._id), name: user.name, email: user.email, phone: user.phone || null, store_id: id(user.store_id),
  role: user.role, status: user.status || "active", status_note: user.status_note || null,
  must_change_password: Boolean(user.must_change_password), created_at: time(user.createdAt), updated_at: time(user.updatedAt),
});
const sessionFields = (user) => ({ user_id: id(user._id), name: user.name, email: user.email, must_change_password: Boolean(user.must_change_password) });

async function audit(req, action, targetType, target, detail = null) {
  await AdminActivity.create({
    actor_id: req.user._id,
    action,
    target_type: targetType,
    target_id: String(target._id),
    target_label: target.name || target.code || target.order_number || String(target._id),
    detail,
  });
}

async function state(req, res) {
  if (req.user.must_change_password) return res.json({
    session: sessionFields(req.user), users: [userFields(req.user)],
    stores: [], menus: [], orders: [], promotions: [], wallets: [], wallet_transactions: [], activity: [], settings: null,
  });
  const [users, stores, menus, orders, queues, promotions, wallets, transactions, activity] = await Promise.all([
    User.find().select("-password_hash -reset_token_hash -reset_token_expires -session_version -google_id").sort({ createdAt: -1 }).lean(),
    Store.find().sort({ createdAt: -1 }).lean(),
    Menu.find().lean(),
    Order.find().sort({ createdAt: -1 }).lean(),
    Queue.find().lean(),
    Promotion.find().sort({ createdAt: -1 }).lean(),
    Wallet.find().lean(),
    WalletTransaction.find().sort({ createdAt: -1 }).lean(),
    AdminActivity.find().sort({ createdAt: -1 }).limit(500).lean(),
  ]);
  const queuesByOrder = new Map(queues.map((queue) => [id(queue.order_id), queue]));
  return res.json({
    session: sessionFields(req.user),
    users: users.map(userFields),
    stores: stores.map((store) => ({ ...plain(store), logo: require("../services/media").imageUrl(store, "logo", "store"), cover_image: require("../services/media").imageUrl(store, "cover_image", "store"), owner_id: id(store.owner_id), status: store.status || "active" })),
    menus: menus.map((menu) => ({ ...plain(menu), image: require("../services/media").imageUrl(menu, "image", "menu"), store_id: id(menu.store_id) })),
    orders: orders.map((order) => ({
      ...plain(order), customer_id: id(order.customer_id), store_id: id(order.store_id), order_date: time(order.order_date || order.createdAt), receive_time: time(order.receive_time),
      queue: queuesByOrder.has(id(order._id)) ? { ...queuesByOrder.get(id(order._id)), _id: id(queuesByOrder.get(id(order._id))._id) } : { queue_number: null, receive_code: "–" },
      cancel: order.cancelled_reason ? { by: order.cancelled_by === "merchant" ? "store" : order.cancelled_by, reason: order.cancelled_reason, at: time(order.cancelled_at || order.updatedAt) } : null,
      refund: order.payment_status === "refunded" ? { amount: order.total_price, method: "wallet", at: time(order.updatedAt), note: "คืนเงินอัตโนมัติเมื่อยกเลิก" } : null,
    })),
    promotions: promotions.map((promotion) => ({ ...plain(promotion), store_id: id(promotion.store_id), start_date: time(promotion.start_date), expire_date: time(promotion.expire_date) })),
    wallets: wallets.map((wallet) => ({ _id: id(wallet._id), user_id: id(wallet.user_id), balance: wallet.balance })),
    wallet_transactions: transactions.map((tx) => ({
      ...plain(tx), user_id: id(tx.user_id), order_id: id(tx.order_id), type: tx.type === "adjustment" ? "adjust" : tx.type,
      amount: tx.direction === "debit" || (tx.type === "payment" && tx.direction !== "credit") ? -Math.abs(tx.amount) : tx.amount,
    })),
    activity: activity.map((entry) => ({ ...plain(entry), actor_id: id(entry.actor_id), at: time(entry.createdAt) })),
    settings: null,
  });
}

async function updateStore(req, res) {
  if (!validId(req.params.id)) return sendError(res, 404, "NOT_FOUND", "ไม่พบร้าน");
  const store = await Store.findById(req.params.id);
  if (!store) return sendError(res, 404, "NOT_FOUND", "ไม่พบร้าน");
  const body = req.body || {};
  const reason = String(body.reason || "").trim();
  let action = "store.update";
  if (body.status !== undefined) {
    if (!["pending", "active", "suspended", "rejected"].includes(body.status)) return sendError(res, 400, "VALIDATION_ERROR", "สถานะร้านไม่ถูกต้อง");
    if (["suspended", "rejected"].includes(body.status) && reason.length < 5) return sendError(res, 400, "VALIDATION_ERROR", "ใส่เหตุผลอย่างน้อย 5 ตัวอักษร");
    action = body.status === "active" ? (store.status === "pending" ? "store.approve" : "store.activate") : `store.${body.status === "suspended" ? "suspend" : "reject"}`;
    store.status = body.status;
    store.status_note = reason || null;
    if (body.status !== "active") store.is_open = false;
  }
  if (body.is_open !== undefined) {
    if (typeof body.is_open !== "boolean") return sendError(res, 400, "VALIDATION_ERROR", "สถานะเปิดร้านไม่ถูกต้อง");
    if (body.is_open && store.status !== "active") return sendError(res, 409, "STORE_INACTIVE", "ต้องอนุมัติร้านก่อนเปิดร้าน");
    store.is_open = body.is_open;
    action = body.is_open ? "store.update" : "store.forceClose";
  }
  if (body.address !== undefined) {
    if (typeof body.address !== "string" || !body.address.trim()) return sendError(res, 400, "VALIDATION_ERROR", "กรอกจุดรับอาหาร");
    store.address = { ...(store.address?.toObject?.() || store.address), detail: body.address.trim() };
  }
  if (body.maxQueue !== undefined) {
    if (!Number.isInteger(body.maxQueue) || body.maxQueue < 1 || body.maxQueue > 200) return sendError(res, 400, "VALIDATION_ERROR", "จำนวนคิวต้องอยู่ระหว่าง 1–200");
    store.queue.max_queue = body.maxQueue;
  }
  await store.save();
  await audit(req, action, "store", store, reason || null);
  return res.json({ ok: true });
}

async function updateUser(req, res) {
  if (!validId(req.params.id)) return sendError(res, 404, "NOT_FOUND", "ไม่พบผู้ใช้");
  if (String(req.user._id) === req.params.id) return sendError(res, 409, "SELF_MODIFICATION", "เปลี่ยนสิทธิ์หรือระงับบัญชีตัวเองไม่ได้");
  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 404, "NOT_FOUND", "ไม่พบผู้ใช้");
  const { status, role, reason = "" } = req.body || {};
  if (status !== undefined && !["active", "suspended"].includes(status)) return sendError(res, 400, "VALIDATION_ERROR", "สถานะบัญชีไม่ถูกต้อง");
  if (role !== undefined && !["admin", "customer", "merchant", "staff"].includes(role)) return sendError(res, 400, "VALIDATION_ERROR", "ประเภทบัญชีไม่ถูกต้อง");
  if (status === "suspended" && String(reason).trim().length < 5) return sendError(res, 400, "VALIDATION_ERROR", "ใส่เหตุผลอย่างน้อย 5 ตัวอักษร");
  const changes = {};
  if (status !== undefined) { changes.status = status; changes.status_note = String(reason).trim() || null; }
  const oldRole = user.role;
  if (role !== undefined) changes.role = role;
  if ((role || user.role) === "staff" && (role !== undefined || req.body?.storeId !== undefined)) {
    const storeId = req.body?.storeId || user.store_id;
    if (!validId(storeId) || !await Store.exists({ _id: storeId })) return sendError(res, 400, "STORE_REQUIRED", "กรุณาเลือกร้านที่พนักงานทำงาน");
    changes.store_id = storeId;
  } else if (role !== undefined && role !== "staff") changes.store_id = null;
  if (!Object.keys(changes).length) return sendError(res, 400, "VALIDATION_ERROR", "ระบุสถานะหรือประเภทบัญชีที่ต้องการแก้ไข");
  await User.findByIdAndUpdate(user._id, { $set: changes, $inc: { session_version: 1 } }, { runValidators: true });
  if (["merchant", "staff"].includes(user.role) && (status === "suspended" || (role !== undefined && role !== user.role))) {
    await Store.updateMany({ owner_id: user._id }, { $set: { is_open: false } });
  }
  req.app.get("io")?.in(`user:${user._id}`).disconnectSockets(true);
  await audit(req, role !== undefined ? "user.role" : status === "suspended" ? "user.suspend" : "user.activate", "user", user, role !== undefined ? `${oldRole} → ${role}` : String(reason).trim() || null);
  return res.json({ ok: true });
}

async function createAdmin(req, res) {
  const { name, email, phone, password } = req.body || {};
  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return sendError(res, 400, "VALIDATION_ERROR", "ตรวจสอบชื่อ อีเมล และรหัสผ่าน (อย่างน้อย 8 ตัว มีตัวใหญ่ ตัวเล็ก และตัวเลข)");
  }
  const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone || null, password_hash: await hashPassword(password), role: "admin", status: "active", must_change_password: true });
  await audit(req, "user.addAdmin", "user", user);
  return res.status(201).json({ ok: true, id: String(user._id) });
}

function promotionFields(body, previous = {}) {
  const fields = {};
  for (const key of ["code", "title", "description", "discount_type", "discount_value", "max_discount", "minimum_order", "start_date", "expire_date", "usage_limit", "per_user_limit", "store_id", "is_active"]) {
    // Quota counters and claim receipts belong to atomic checkout updates only.
    if (Object.hasOwn(previous, key)) fields[key] = previous[key];
    if (Object.hasOwn(body, key)) fields[key] = body[key];
  }
  fields.code = String(fields.code || "").trim().toUpperCase();
  fields.title = String(fields.title || "").trim();
  const start = new Date(fields.start_date); const expire = new Date(fields.expire_date);
  if (!/^[A-Z0-9]{3,20}$/.test(fields.code) || !fields.title || !["percentage", "fixed"].includes(fields.discount_type) || !Number.isFinite(fields.discount_value) || fields.discount_value <= 0 || (fields.discount_type === "percentage" && fields.discount_value > 100)) return null;
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(expire.getTime()) || expire < start) return null;
  if (fields.store_id != null && !validId(fields.store_id)) return null;
  if (fields.minimum_order !== undefined && (!Number.isFinite(fields.minimum_order) || fields.minimum_order < 0)) return null;
  if (fields.usage_limit != null && (!Number.isInteger(fields.usage_limit) || fields.usage_limit < 1)) return null;
  if (fields.max_discount != null && (!Number.isFinite(fields.max_discount) || fields.max_discount <= 0)) return null;
  if (fields.per_user_limit != null && (!Number.isInteger(fields.per_user_limit) || fields.per_user_limit < 1)) return null;
  if (typeof fields.is_active !== "boolean") return null;
  return fields;
}

async function createPromotion(req, res) {
  const fields = promotionFields(req.body || {});
  if (!fields) return sendError(res, 400, "VALIDATION_ERROR", "ข้อมูลคูปองไม่ถูกต้อง");
  if (fields.store_id && !await Store.exists({ _id: fields.store_id })) return sendError(res, 404, "NOT_FOUND", "ไม่พบร้าน");
  const promotion = await Promotion.create(fields);
  await audit(req, "promotion.create", "promotion", promotion);
  return res.status(201).json({ ok: true });
}

async function updatePromotion(req, res) {
  if (!validId(req.params.id)) return sendError(res, 404, "NOT_FOUND", "ไม่พบคูปอง");
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) return sendError(res, 404, "NOT_FOUND", "ไม่พบคูปอง");
  const fields = promotionFields(req.body || {}, promotion.toObject());
  if (!fields) return sendError(res, 400, "VALIDATION_ERROR", "ข้อมูลคูปองไม่ถูกต้อง");
  if (fields.store_id && !await Store.exists({ _id: fields.store_id })) return sendError(res, 404, "NOT_FOUND", "ไม่พบร้าน");
  Object.assign(promotion, fields);
  await promotion.save();
  await audit(req, "promotion.update", "promotion", promotion);
  return res.json({ ok: true });
}

async function cancelOrder(req, res) {
  if (!validId(req.params.id)) return sendError(res, 404, "NOT_FOUND", "ไม่พบออเดอร์");
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 5) return sendError(res, 400, "VALIDATION_ERROR", "ใส่เหตุผลอย่างน้อย 5 ตัวอักษร");
  const order = await cancelOrderWithRefund({ _id: req.params.id }, { allowedStatuses: ["pending", "confirmed", "preparing", "ready"], reason, by: "admin" });
  if (!order) return sendError(res, 409, "ORDER_FINISHED", "ออเดอร์นี้จบแล้วหรือไม่พบออเดอร์");
  await audit(req, "order.cancel", "order", order, reason);
  const event = { orderId: String(order._id), orderNumber: order.order_number, status: "cancelled" };
  req.app.get("io")?.to(`store:${order.store_id}`).emit("order:status", event);
  req.app.get("io")?.to(`user:${order.customer_id}`).emit("order:status", event);
  return res.json({ ok: true });
}

async function adjustWallet(req, res) {
  if (!validId(req.params.id) || !await User.exists({ _id: req.params.id })) return sendError(res, 404, "NOT_FOUND", "ไม่พบผู้ใช้");
  const { amount, key } = req.body || {};
  const reason = String(req.body?.reason || "").trim();
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000 || reason.length < 5 || typeof key !== "string" || !/^[a-zA-Z0-9-]{8,100}$/.test(key)) return sendError(res, 400, "VALIDATION_ERROR", "ตรวจสอบจำนวนเงิน เหตุผล และรหัสคำขอ");
  const result = await changeBalance({ userId: req.params.id, amount, type: "adjustment", description: reason, key: `admin:${req.user._id}:${key}` });
  const user = await User.findById(req.params.id);
  await audit(req, "wallet.adjust", "user", user, `${amount > 0 ? "+" : ""}${amount} บาท · ${reason}`);
  return res.json({ ok: true, balance: result.wallet.balance });
}

module.exports = { settings, updateSettings, resetUserPassword, state, updateStore, updateUser, createAdmin, createPromotion, updatePromotion, cancelOrder, adjustWallet };
