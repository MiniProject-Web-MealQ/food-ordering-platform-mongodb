const mongoose = require("mongoose");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Store = require("../models/Store");
const { menuView, storeView } = require("./publicController");
const { orderView } = require("./orderController");
const { sendError } = require("../utils/http");
const { cancelOrder } = require("../services/order-lifecycle");

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

function orderQuery(id, storeId) {
  return mongoose.isValidObjectId(id)
    ? { _id: id, store_id: storeId }
    : { order_number: id, store_id: storeId };
}

async function findMerchantOrder(id, storeId) {
  return Order.findOne(orderQuery(id, storeId)).populate("customer_id", "name email");
}

async function orderPayload(order) {
  const queue = await Queue.findOne({ order_id: order._id });
  return { queue, payload: orderView(order, queue) };
}

function emitOrderStatus(req, store, order) {
  const customerId = order.customer_id?._id || order.customer_id;
  const event = {
    orderId: String(order._id),
    orderNumber: order.order_number,
    status: order.status,
    changedAt: Date.now(),
  };
  const io = req.app.get("io");
  if (customerId) io?.to(`user:${customerId}`).emit("order:status", event);
  io?.to(`store:${store._id}`).emit("order:status", event);
}

async function dashboard(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [pending, preparing, ready, completed, menuCount, recentOrders, todayOrders] = await Promise.all([
    Order.countDocuments({ store_id: store._id, status: { $in: ["pending", "confirmed"] } }),
    Order.countDocuments({ store_id: store._id, status: "preparing" }),
    Order.countDocuments({ store_id: store._id, status: "ready" }),
    Order.countDocuments({ store_id: store._id, status: "completed", createdAt: { $gte: startOfDay } }),
    Menu.countDocuments({ store_id: store._id }),
    Order.find({ store_id: store._id }).sort({ createdAt: -1 }).limit(5).populate("customer_id", "name email"),
    Order.find({ store_id: store._id, createdAt: { $gte: startOfDay }, status: { $ne: "cancelled" } }).select("total_price"),
  ]);

  return res.json({
    store: storeView(store),
    summary: {
      newOrders: pending,
      preparing,
      ready,
      completed,
      menuCount,
      revenue: todayOrders.reduce((sum, order) => sum + Number(order.total_price || 0), 0),
    },
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
  const order = await findMerchantOrder(req.params.id, store._id);
  if (!order) return sendError(res, 404, "ORDER_NOT_FOUND", "ไม่พบออเดอร์ของร้านนี้");
  const { payload } = await orderPayload(order);
  return res.json({ order: payload });
}

const STATUS_QUEUE_MAP = {
  pending: "waiting",
  confirmed: "waiting",
  preparing: "preparing",
  ready: "ready",
  completed: "completed",
  cancelled: "cancelled",
};

const ALLOWED_TRANSITIONS = {
  pending: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(["preparing", "cancelled"]),
  preparing: new Set(["ready", "cancelled"]),
  ready: new Set([]),
  completed: new Set([]),
  cancelled: new Set([]),
};

async function updateOrderStatus(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  const status = String(req.body?.status || "").toLowerCase();
  if (!Object.keys(STATUS_QUEUE_MAP).includes(status)) {
    return sendError(res, 400, "INVALID_STATUS", "สถานะออเดอร์ไม่ถูกต้อง");
  }
  if (status === "completed") {
    return sendError(res, 409, "RECEIVE_CODE_REQUIRED", "ต้องยืนยันรหัสรับอาหารก่อนปิดออเดอร์");
  }

  let order = await findMerchantOrder(req.params.id, store._id);
  if (!order) return sendError(res, 404, "ORDER_NOT_FOUND", "ไม่พบออเดอร์ของร้านนี้");

  if (order.status === status) {
    const { payload } = await orderPayload(order);
    return res.json({ order: payload });
  }

  if (!ALLOWED_TRANSITIONS[order.status]?.has(status)) {
    return sendError(
      res,
      409,
      "INVALID_STATUS_TRANSITION",
      `เปลี่ยนสถานะจาก ${order.status} เป็น ${status} ไม่ได้`,
    );
  }

  if (status === "cancelled") {
    const cancelled = await cancelOrder({ _id: order._id, store_id: store._id }, { allowedStatuses: ["pending", "confirmed", "preparing"], reason: "ร้านค้ายกเลิกออเดอร์", by: "merchant" });
    if (!cancelled) return sendError(res, 409, "ORDER_CHANGED", "สถานะออเดอร์เปลี่ยนแล้ว กรุณาโหลดใหม่");
    order = await findMerchantOrder(req.params.id, store._id);
  } else {
    const updated = await Order.findOneAndUpdate({ _id: order._id, store_id: store._id, status: order.status }, { $set: { status } }, { returnDocument: "after" }).populate("customer_id", "name email");
    if (!updated) return sendError(res, 409, "ORDER_CHANGED", "สถานะออเดอร์เปลี่ยนแล้ว กรุณาโหลดใหม่");
    order = updated;
  }

  const queue = await Queue.findOne({ order_id: order._id });
  if (queue) {
    queue.status = STATUS_QUEUE_MAP[status];
    if (status === "ready" && !queue.called_at) queue.called_at = new Date();
    await queue.save();
  }

  const payload = orderView(order, queue);
  emitOrderStatus(req, store, order);
  return res.json({ order: payload });
}

async function receiveOrder(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;

  const receiveCode = String(req.body?.receiveCode || "").trim();
  if (!/^\d{4}$/.test(receiveCode)) {
    return sendError(res, 400, "INVALID_RECEIVE_CODE", "รหัสรับอาหารต้องเป็นตัวเลข 4 หลัก");
  }

  let order = await findMerchantOrder(req.params.id, store._id);
  if (!order) return sendError(res, 404, "ORDER_NOT_FOUND", "ไม่พบออเดอร์ของร้านนี้");

  const queue = await Queue.findOne({ order_id: order._id });
  if (!queue) return sendError(res, 409, "QUEUE_NOT_FOUND", "ไม่พบข้อมูลคิวของออเดอร์นี้");
  if (queue.receive_code !== receiveCode) {
    return sendError(res, 409, "RECEIVE_CODE_MISMATCH", "รหัสรับอาหารไม่ตรงกับออเดอร์นี้");
  }

  if (order.status === "completed") {
    return res.json({ order: orderView(order, queue) });
  }
  if (order.status !== "ready") {
    return sendError(res, 409, "ORDER_NOT_READY", "ออเดอร์นี้ยังไม่อยู่ในสถานะพร้อมรับอาหาร");
  }

  const now = new Date();
  const completed = await Order.findOneAndUpdate({ _id: order._id, store_id: store._id, status: "ready" }, { $set: { status: "completed", receive_time: now } }, { returnDocument: "after" }).populate("customer_id", "name email");
  if (!completed) {
    order = await findMerchantOrder(req.params.id, store._id);
    if (order?.status === "completed") return res.json({ order: orderView(order, await Queue.findOne({ order_id: order._id })) });
    return sendError(res, 409, "ORDER_CHANGED", "สถานะออเดอร์เปลี่ยนแล้ว กรุณาโหลดใหม่");
  }
  order = completed;
  queue.status = "completed";
  queue.completed_at = now;
  await queue.save();

  const soldByMenu = new Map();
  for (const item of order.items) {
    const id = String(item.menu_id);
    soldByMenu.set(id, (soldByMenu.get(id) || 0) + Number(item.quantity || 0));
  }
  if (soldByMenu.size > 0) {
    await Menu.bulkWrite(
      [...soldByMenu.entries()].map(([menuId, quantity]) => ({
        updateOne: { filter: { _id: menuId, store_id: store._id }, update: { $inc: { sold_quantity: quantity } } },
      })),
    );
  }

  emitOrderStatus(req, store, order);
  return res.json({ order: orderView(order, queue) });
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
  const {
    name,
    description = "",
    category = "single",
    price,
    image = null,
    cookTime = 0,
    isAvailable = true,
  } = req.body || {};
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
    cook_time: Math.max(0, Number(cookTime) || 0),
    is_available: Boolean(isAvailable),
  });
  return res.status(201).json({ menu: menuView(menu) });
}

async function getMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");
  const menu = await Menu.findOne({ _id: req.params.id, store_id: store._id });
  if (!menu) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");
  return res.json({ menu: menuView(menu) });
}

async function updateMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");

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
  if (allowed.name !== undefined) allowed.name = String(allowed.name).trim();
  if (allowed.description !== undefined) allowed.description = String(allowed.description).trim();
  if (allowed.category !== undefined) allowed.category = String(allowed.category).trim();
  if (allowed.price !== undefined) allowed.price = Number(allowed.price);
  if (allowed.cook_time !== undefined) allowed.cook_time = Math.max(0, Number(allowed.cook_time) || 0);
  if (allowed.is_available !== undefined) allowed.is_available = Boolean(allowed.is_available);
  if (allowed.name === "" || (allowed.price !== undefined && (!Number.isFinite(allowed.price) || allowed.price < 0))) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณากรอกชื่อเมนูและราคาให้ถูกต้อง");
  }

  const menu = await Menu.findOneAndUpdate({ _id: req.params.id, store_id: store._id }, allowed, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!menu) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");
  return res.json({ menu: menuView(menu) });
}

async function deleteMenu(req, res) {
  const store = await requireMerchantStore(req, res);
  if (!store) return;
  if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนูนี้");
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
  const { name, description, phone, isOpen, openingHours, address, maxQueue } = req.body || {};

  if (name !== undefined) {
    const value = String(name).trim();
    if (!value) return sendError(res, 400, "VALIDATION_ERROR", "ชื่อร้านห้ามว่าง");
    store.name = value;
  }
  if (description !== undefined) store.description = String(description).trim();
  if (phone !== undefined) store.phone = String(phone).trim();
  if (isOpen !== undefined) store.is_open = Boolean(isOpen);

  if (openingHours) {
    if (openingHours.open !== undefined) store.opening_hours.open_time = String(openingHours.open);
    if (openingHours.close !== undefined) store.opening_hours.close_time = String(openingHours.close);
  }

  if (address && typeof address === "object") {
    if (address.detail !== undefined) store.address.detail = String(address.detail).trim();
    if (address.province !== undefined) store.address.province = String(address.province).trim();
    if (address.district !== undefined) store.address.district = String(address.district).trim();
    if (address.postalCode !== undefined) store.address.postal_code = String(address.postalCode).trim();
  }

  if (maxQueue !== undefined) {
    const value = Number.parseInt(maxQueue, 10);
    if (!Number.isInteger(value) || value < 1 || value > 500) {
      return sendError(res, 400, "VALIDATION_ERROR", "จำนวนคิวสูงสุดต้องอยู่ระหว่าง 1-500");
    }
    store.queue.max_queue = value;
  }

  await store.save();
  return res.json({ store: storeView(store) });
}

module.exports = {
  dashboard,
  listOrders,
  getOrder,
  updateOrderStatus,
  receiveOrder,
  listMenu,
  createMenu,
  getMenu,
  updateMenu,
  deleteMenu,
  getStore,
  updateStore,
};
