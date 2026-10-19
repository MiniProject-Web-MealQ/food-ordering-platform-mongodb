const mongoose = require("mongoose");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Store = require("../models/Store");
const { menuView, storeView } = require("./publicController");
const { orderView } = require("./orderController");
const { sendError } = require("../utils/http");
const { cancelOrder } = require("../services/order-lifecycle");
const { menuChanges, imageValue } = require("../services/menu-validation");
const { accountStore } = require("../services/merchant-store");

async function getMerchantStore(user) {
  return accountStore(user);
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

async function emitOrderStatus(req, store, order) {
  await require("../services/notifications").recordOrder(order).catch((error) => console.error("Notification failed", error.name));
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
    Order.find({ store_id: store._id, createdAt: { $gte: startOfDay }, status: { $ne: "cancelled" }, payment_status: { $in: ["paid", "simulated"] }, checkout_completed: { $ne: false } }).select("total_price"),
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
  if (order.checkout_completed === false) return sendError(res, 409, "CHECKOUT_IN_PROGRESS", "กำลังยืนยันการชำระเงิน กรุณารอให้ออเดอร์เสร็จสมบูรณ์");

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
    const updated = await Order.findOneAndUpdate({ _id: order._id, store_id: store._id, status: order.status }, { $set: { status, notification_pending: true }, $push: { notification_events: { status, at: new Date(), payment_status: order.payment_status } } }, { returnDocument: "after" }).populate("customer_id", "name email");
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
  await emitOrderStatus(req, store, order);
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
  const completed = await Order.findOneAndUpdate({ _id: order._id, store_id: store._id, status: "ready" }, { $set: { status: "completed", receive_time: now, notification_pending: true }, $push: { notification_events: { status: "completed", at: now, payment_status: order.payment_status } } }, { returnDocument: "after" }).populate("customer_id", "name email");
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

  await emitOrderStatus(req, store, order);
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
  let fields;
  try { fields = menuChanges(req.body, true); }
  catch (error) { return sendError(res, error.status || 400, error.code || "VALIDATION_ERROR", error.message); }
  if (fields.image?.startsWith("/api/v1/media/")) return sendError(res, 400, "INVALID_IMAGE", "กรุณาอัปโหลดรูปเมนูใหม่");
  await require("../services/inventory").validateRecipe(fields, store._id);
  const menu = await Menu.create({ store_id: store._id, ...fields });
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

  let allowed;
  try { allowed = menuChanges(req.body); }
  catch (error) { return sendError(res, error.status || 400, error.code || "VALIDATION_ERROR", error.message); }
  if (!Object.keys(allowed).length) return sendError(res, 400, "VALIDATION_ERROR", "ไม่มีข้อมูลเมนูที่ต้องการแก้ไข");

  if (allowed.image?.startsWith(`/api/v1/media/menu/${req.params.id}/image?`)) delete allowed.image;
  if (allowed.image?.startsWith("/api/v1/media/")) return sendError(res, 400, "INVALID_IMAGE", "กรุณาอัปโหลดรูปเมนูใหม่");
  await require("../services/inventory").validateRecipe(allowed, store._id);
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
  if (req.body?.coordinates !== undefined) {
    const value = req.body.coordinates;
    if (value !== null && (!Number.isFinite(value?.latitude) || Math.abs(value.latitude) > 90 || !Number.isFinite(value?.longitude) || Math.abs(value.longitude) > 180)) return sendError(res, 400, "VALIDATION_ERROR", "พิกัดร้านไม่ถูกต้อง");
    store.coordinates = value;
  }
  try {
    for (const [input, field] of [["logo", "logo"], ["coverImage", "cover_image"]]) {
      if (req.body?.[input] !== undefined && !String(req.body[input]).startsWith(`/api/v1/media/store/${store._id}/${field}?`)) store[field] = imageValue(req.body[input], 450000);
    }
  } catch (error) { return sendError(res, 400, "VALIDATION_ERROR", error.message); }

  if (name !== undefined) {
    const value = String(name).trim();
    if (!value) return sendError(res, 400, "VALIDATION_ERROR", "ชื่อร้านห้ามว่าง");
    store.name = value;
  }
  if (description !== undefined) store.description = String(description).trim();
  if (phone !== undefined) store.phone = String(phone).trim();
  if (isOpen !== undefined) {
    if (typeof isOpen !== "boolean") return sendError(res, 400, "VALIDATION_ERROR", "สถานะเปิดร้านไม่ถูกต้อง");
    if (isOpen && store.status !== "active") return sendError(res, 409, "STORE_INACTIVE", "ร้านยังไม่ได้รับอนุมัติหรือถูกระงับ");
    store.is_open = isOpen;
  }

  if (openingHours) {
    const { validTime } = require("../services/store-hours");
    if ((openingHours.open !== undefined && !validTime(openingHours.open)) || (openingHours.close !== undefined && !validTime(openingHours.close)) || (openingHours.automatic !== undefined && typeof openingHours.automatic !== "boolean")) return sendError(res, 400, "INVALID_HOURS", "เวลาเปิดปิดไม่ถูกต้อง");
    if (openingHours.automatic !== undefined) store.opening_hours.automatic = openingHours.automatic;
    if (openingHours.automatic && (!validTime(openingHours.open ?? store.opening_hours.open_time) || !validTime(openingHours.close ?? store.opening_hours.close_time))) return sendError(res, 400, "INVALID_HOURS", "กรุณากำหนดเวลาเปิดและปิดก่อนเปิดอัตโนมัติ");
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
    const value = maxQueue;
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
