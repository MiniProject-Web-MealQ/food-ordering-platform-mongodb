const mongoose = require("mongoose");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Store = require("../models/Store");
const { menuView, storeView } = require("./publicController");
const { orderView } = require("./orderController");
const { sendError } = require("../utils/http");

async function getMerchantStore(user) {
  return Store.findOne({ owner_id: user._id });
}

async function requireMerchantStore(req, res) {
  const store = await getMerchantStore(req.user);
  if (!store) {
    sendError(res, 404, "STORE_NOT_FOUND", "ไม่พบร้านที่ผูกกับบัญชี Merchant นี้");
    return null;
  }
  return store;
}

async function dashboard(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;

  const [pending, preparing, completed, menuCount, recentOrders] = await Promise.all([
    Order.countDocuments({ store_id: store._id, status: { $in: ["pending", "confirmed"] } }),
    Order.countDocuments({ store_id: store._id, status: "preparing" }),
    Order.countDocuments({ store_id: store._id, status: "completed" }),
    Menu.countDocuments({ store_id: store._id }),
    Order.find({ store_id: store._id }).sort({ createdAt: -1 }).limit(5).populate("customer_id", "name email"),
  ]);

  return res.json({
    store: storeView(store),
    summary: { newOrders: pending, preparing, completed, menuCount },
    recentOrders: recentOrders.map((order) => orderView(order)),
  });
}

async function listOrders(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const orders = await Order.find({ store_id: store._id })
    .sort({ createdAt: -1 })
    .populate("customer_id", "name email");
  const queues = await Queue.find({ order_id: { $in: orders.map((order) => order._id) } });
  const queueByOrder = new Map(queues.map((queue) => [String(queue.order_id), queue]));
  return res.json({ orders: orders.map((order) => orderView(order, queueByOrder.get(String(order._id)))) });
}

async function getOrder(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const query = mongoose.isValidObjectId(req.params.id)
    ? { _id: req.params.id, store_id: store._id }
    : { order_number: req.params.id, store_id: store._id };
  const order = await Order.findOne(query).populate("customer_id", "name email");
  if (!order) return sendError(res, 404, "ORDER_NOT_FOUND", "ไม่พบออเดอร์ของร้านนี้");
  const queue = await Queue.findOne({ order_id: order._id });
  return res.json({ order: orderView(order, queue) });
}

const STATUS_QUEUE_MAP = {
  pending: "waiting",
  confirmed: "waiting",
  preparing: "preparing",
  ready: "ready",
  completed: "completed",
  cancelled: "cancelled",
};

async function updateOrderStatus(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const status = String(req.body?.status || "").toLowerCase();
  if (!Object.keys(STATUS_QUEUE_MAP).includes(status)) {
    return sendError(res, 400, "INVALID_STATUS", "สถานะออเดอร์ไม่ถูกต้อง");
  }

  const query = mongoose.isValidObjectId(req.params.id)
    ? { _id: req.params.id, store_id: store._id }
    : { order_number: req.params.id, store_id: store._id };
  const order = await Order.findOne(query).populate("customer_id", "name email");
  if (!order) return sendError(res, 404, "ORDER_NOT_FOUND", "ไม่พบออเดอร์ของร้านนี้");

  order.status = status;
  if (status === "completed") order.receive_time = new Date();
  await order.save();

  const queue = await Queue.findOne({ order_id: order._id });
  if (queue) {
    queue.status = STATUS_QUEUE_MAP[status];
    if (status === "ready") queue.called_at = new Date();
    if (status === "completed") queue.completed_at = new Date();
    await queue.save();
  }

  const payload = orderView(order, queue);
  const event = {
    orderId: String(order._id),
    orderNumber: order.order_number,
    status: order.status,
    changedAt: Date.now(),
  };
  const io = req.app.get("io");
  io?.to(`user:${order.customer_id._id}`).emit("order:status", event);
  io?.to(`store:${store._id}`).emit("order:status", event);
  return res.json({ order: payload });
}

async function listMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const menus = await Menu.find({ store_id: store._id }).sort({ category: 1, name: 1 });
  return res.json({ menus: menus.map(menuView) });
}

async function createMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const { name, description = "", category = "single", price, image = null, cookTime = 0 } = req.body || {};
  if (!name?.trim() || Number.isNaN(Number(price)) || Number(price) < 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณากรอกชื่อเมนูและราคาให้ถูกต้อง");
  }
  const menu = await Menu.create({
    store_id: store._id,
    name: name.trim(),
    description: String(description || "").trim(),
    category: String(category || "single").trim(),
    price: Number(price),
    image,
    cook_time: Number(cookTime) || 0,
    is_available: true,
  });
  return res.status(201).json({ menu: menuView(menu) });
}

async function getMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const menu = await Menu.findOne({ _id: req.params.id, store_id: store._id });
  if (!menu) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");
  return res.json({ menu: menuView(menu) });
}

async function updateMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const allowed = {};
  const map = {
    name: "name",
    description: "description",
    category: "category",
    price: "price",
    image: "image",
    cookTime: "cook_time",
    isAvailable: "is_available",
  };
  for (const [inputKey, dbKey] of Object.entries(map)) {
    if (req.body?.[inputKey] !== undefined) allowed[dbKey] = req.body[inputKey];
  }
  if (allowed.price !== undefined) allowed.price = Number(allowed.price);
  if (allowed.cook_time !== undefined) allowed.cook_time = Number(allowed.cook_time) || 0;

  const menu = await Menu.findOneAndUpdate({ _id: req.params.id, store_id: store._id }, allowed, {
    new: true,
    runValidators: true,
  });
  if (!menu) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");
  return res.json({ menu: menuView(menu) });
}

async function deleteMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const menu = await Menu.findOneAndDelete({ _id: req.params.id, store_id: store._id });
  if (!menu) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");
  return res.json({ ok: true });
}

async function getStore(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  return res.json({ store: storeView(store) });
}

async function updateStore(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const { name, description, phone, isOpen, openingHours } = req.body || {};
  if (name !== undefined) store.name = String(name).trim();
  if (description !== undefined) store.description = String(description);
  if (phone !== undefined) store.phone = String(phone);
  if (isOpen !== undefined) store.is_open = Boolean(isOpen);
  if (openingHours?.open !== undefined) store.opening_hours.open_time = openingHours.open;
  if (openingHours?.close !== undefined) store.opening_hours.close_time = openingHours.close;
  await store.save();
  return res.json({ store: storeView(store) });
}

module.exports = {
  dashboard,
  listOrders,
  getOrder,
  updateOrderStatus,
  listMenu,
  createMenu,
  getMenu,
  updateMenu,
  deleteMenu,
  getStore,
  updateStore,
};
