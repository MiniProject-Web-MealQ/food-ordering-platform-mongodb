const crypto = require("crypto");
const mongoose = require("mongoose");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Store = require("../models/Store");
const Promotion = require("../models/Promotion");
const { money, validateOrderInput, priceOrderItem, promotionDiscount } = require("../services/order-pricing");
const { changeBalance, refundOrderPayment } = require("../services/wallet");
const { cancelOrder } = require("../services/order-lifecycle");
const { sendError } = require("../utils/http");

const SERVICE_FEE = 4;

function makeOrderNumber() {
  const suffix = `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
  return `MQ${suffix}`;
}

function orderView(order, queue = null) {
  const customer = order.customer_id && typeof order.customer_id === "object" ? order.customer_id : null;
  const store = order.store_id && typeof order.store_id === "object" ? order.store_id : null;
  return {
    id: String(order._id),
    orderNumber: order.order_number,
    customer: customer
      ? { id: String(customer._id), name: customer.name, email: customer.email }
      : { id: String(order.customer_id) },
    store: store ? { id: String(store._id), name: store.name, clientId: store.client_id } : { id: String(order.store_id) },
    items: order.items.map((item) => ({
      menuId: String(item.menu_id),
      clientMenuId: item.client_menu_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      totalPrice: item.total_price,
      selections: item.selections,
      note: item.note,
    })),
    subtotal: order.subtotal,
    serviceFee: order.service_fee,
    discount: order.discount,
    totalPrice: order.total_price,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status || "pending",
    paymentMode: order.payment_mode || "sandbox",
    cancelledReason: order.cancelled_reason || "",
    cancelledBy: order.cancelled_by || null,
    cancelledAt: order.cancelled_at || null,
    review: order.review?.rating ? { rating: order.review.rating, tags: order.review.tags || [], text: order.review.text || "", updatedAt: order.review.updated_at } : null,
    status: order.status,
    queueNumber: queue?.queue_number ?? null,
    pickupCode: queue?.receive_code ?? null,
    queueStatus: queue?.status ?? null,
    queueCalledAt: queue?.called_at ?? null,
    queueCompletedAt: queue?.completed_at ?? null,
    receiveTime: order.receive_time ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function createOrder(req, res) {
  let paymentMethod;
  try { paymentMethod = validateOrderInput(req.body); }
  catch (error) { return sendError(res, error.status || 400, error.code, error.message); }
  if (paymentMethod !== "wallet" && process.env.NODE_ENV === "production") {
    return sendError(res, 501, "PAYMENT_NOT_CONFIGURED", "ยังไม่ได้เชื่อมต่อผู้ให้บริการชำระเงินจริง");
  }
  const inputItems = req.body.items;
  const clientIds = [...new Set(inputItems.map((item) => item.menuId))];
  const objectIds = clientIds.filter((id) => mongoose.isValidObjectId(id));
  const menus = await Menu.find({ $or: [
    { client_id: { $in: clientIds } },
    ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
  ] });
  const byClientId = new Map(menus.map((menu) => [menu.client_id, menu]));
  const byId = new Map(menus.map((menu) => [String(menu._id), menu]));
  const resolved = inputItems.map((input) => ({ input, menu: byClientId.get(input.menuId) || byId.get(input.menuId) }));
  if (resolved.some(({ menu }) => !menu)) return sendError(res, 404, "MENU_NOT_FOUND", "มีเมนูที่ไม่มีหรือถูกลบแล้ว กรุณาตรวจสอบตะกร้า");
  const storeId = String(resolved[0].menu.store_id);
  if (resolved.some(({ menu }) => String(menu.store_id) !== storeId)) return sendError(res, 400, "MULTI_STORE_ORDER", "หนึ่งออเดอร์สั่งได้จากร้านเดียวเท่านั้น");
  const store = await Store.findById(storeId);
  if (!store || (store.status && store.status !== "active")) return sendError(res, 404, "RESTAURANT_NOT_FOUND", "ไม่พบร้านอาหารที่เปิดให้บริการ");
  if (!store.is_open) return sendError(res, 409, "STORE_CLOSED", "ร้านปิดรับออเดอร์อยู่ในขณะนี้");
  let items;
  try { items = resolved.map(({ input, menu }) => priceOrderItem(menu, input)); }
  catch (error) { return sendError(res, error.status || 400, error.code, error.message); }
  const subtotal = money(items.reduce((sum, item) => sum + item.total_price, 0));
  const couponCode = String(req.body.couponCode || "").trim().toUpperCase();
  let promotion = null;
  let discount = 0;
  if (couponCode) {
    promotion = await Promotion.findOne({ code: couponCode, $or: [{ store_id: store._id }, { store_id: null }] }).sort({ store_id: -1 });
    try { discount = promotionDiscount(promotion, subtotal); }
    catch (error) { return sendError(res, error.status || 400, error.code, error.message); }
  }
  const totalPrice = money(subtotal + SERVICE_FEE - discount);
  // A leased database lock prevents simultaneous checkouts from exceeding the
  // store's queue limit, including when several backend processes run.
  const lockId = crypto.randomUUID();
  const now = new Date();
  const locked = await Store.findOneAndUpdate({
    _id: store._id, is_open: true, $and: [
      { $or: [{ status: "active" }, { status: { $exists: false } }] },
      { $or: [{ checkout_lock_until: null }, { checkout_lock_until: { $lte: now } }] },
    ],
  }, { $set: { checkout_lock: lockId, checkout_lock_until: new Date(Date.now() + 60_000) } }, { returnDocument: "after" });
  if (!locked) return sendError(res, 409, "STORE_BUSY", "ร้านกำลังรับคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
  let order = null;
  let promotionClaimed = false;
  let walletDebited = false;
  try {
    const maxQueue = Math.max(1, Number(locked.queue?.max_queue || 50));
    const active = await Queue.countDocuments({ store_id: store._id, status: { $in: ["waiting", "preparing", "ready"] } });
    if (active >= maxQueue) return sendError(res, 409, "QUEUE_FULL", `คิวของร้านเต็มแล้ว (${maxQueue} คิว) กรุณาลองใหม่ภายหลัง`);
    if (promotion) {
      const customerUsage = `usage_by_customer.${req.user._id}`;
      const constraints = [];
      if (promotion.usage_limit != null) constraints.push({ $lt: ["$used_count", promotion.usage_limit] });
      if (promotion.per_user_limit != null) constraints.push({ $lt: [{ $ifNull: [`$${customerUsage}`, 0] }, promotion.per_user_limit] });
      const query = { _id: promotion._id, is_active: true, start_date: { $lte: new Date() }, expire_date: { $gt: new Date() } };
      if (constraints.length) query.$expr = { $and: constraints };
      const claimed = await Promotion.findOneAndUpdate(query, { $inc: { used_count: 1, [customerUsage]: 1 } }, { returnDocument: "after" });
      if (!claimed) return sendError(res, 409, "COUPON_LIMIT", "คูปองนี้ถูกใช้ครบจำนวนหรือคุณใช้ครบสิทธิ์แล้ว");
      promotionClaimed = true;
    }
    order = await Order.create({
      order_number: makeOrderNumber(), customer_id: req.user._id, store_id: store._id,
      items, subtotal, service_fee: SERVICE_FEE, discount, total_price: totalPrice,
      payment_method: paymentMethod, payment_status: "pending",
      payment_mode: paymentMethod === "wallet" ? "wallet" : "sandbox",
      promotion: promotion ? { promotion_id: promotion._id, code: couponCode, discount_type: promotion.discount_type, discount_value: promotion.discount_value } : undefined,
      status: "pending",
    });
    if (paymentMethod === "wallet" && totalPrice > 0) {
      try {
        await changeBalance({ userId: req.user._id, amount: -totalPrice, type: "payment", orderId: order._id, key: `order:${order._id}:payment`, description: `ชำระออเดอร์ ${order.order_number}` });
      } catch (error) {
        // A failed ledger write can follow a successful atomic debit. Querying
        // the wallet marker lets cancellation refund that debit safely.
        const Wallet = require("../models/Wallet");
        const marker = await Wallet.exists({ user_id: req.user._id, ledger_keys: `order:${order._id}:payment` });
        walletDebited = Boolean(marker);
        throw error;
      }
      walletDebited = true;
    }
    order.payment_status = paymentMethod === "wallet" ? "paid" : "simulated";
    await order.save();
    const previous = await Queue.findOne({ store_id: store._id }).sort({ queue_number: -1 });
    await Store.updateOne({ _id: store._id }, { $max: { queue_sequence: previous?.queue_number || 0 } });
    const numbered = await Store.findByIdAndUpdate(store._id, { $inc: { queue_sequence: 1 } }, { returnDocument: "after" });
    const queue = await Queue.create({ order_id: order._id, store_id: store._id, queue_number: numbered.queue_sequence, receive_code: String(crypto.randomInt(1000, 10000)), status: "waiting" });
    const fullOrder = await Order.findById(order._id).populate("customer_id", "name email").populate("store_id", "name client_id");
    const payload = orderView(fullOrder, queue);
    req.app.get("io")?.to(`store:${store._id}`).emit("order:new", payload);
    req.app.get("io")?.to(`user:${req.user._id}`).emit("order:created", payload);
    return res.status(201).json({ order: payload });
  } catch (error) {
    if (order) {
      order.status = "cancelled";
      order.payment_status = walletDebited ? "paid" : "failed";
      order.cancelled_reason = "สร้างออเดอร์ไม่สำเร็จ";
      order.cancelled_by = "system";
      order.cancelled_at = new Date();
      await order.save();
      await Queue.updateOne({ order_id: order._id }, { $set: { status: "cancelled" } });
      if (walletDebited) await refundOrderPayment(order);
    }
    if (promotionClaimed) await Promotion.updateOne({ _id: promotion._id }, { $inc: { used_count: -1, [`usage_by_customer.${req.user._id}`]: -1 } });
    if (error.status && error.code) return sendError(res, error.status, error.code, error.message);
    throw error;
  } finally {
    await Store.updateOne({ _id: store._id, checkout_lock: lockId }, { $set: { checkout_lock: null, checkout_lock_until: null } });
  }
}

async function listMyOrders(req, res) {
  const orders = await Order.find({ customer_id: req.user._id })
    .sort({ createdAt: -1 })
    .populate("store_id", "name client_id");
  const queues = await Queue.find({ order_id: { $in: orders.map((order) => order._id) } });
  const queueByOrder = new Map(queues.map((queue) => [String(queue.order_id), queue]));
  return res.json({ orders: orders.map((order) => orderView(order, queueByOrder.get(String(order._id)))) });
}

async function getMyOrder(req, res) {
  const query = mongoose.isValidObjectId(req.params.id)
    ? { _id: req.params.id, customer_id: req.user._id }
    : { order_number: req.params.id, customer_id: req.user._id };
  const order = await Order.findOne(query).populate("store_id", "name client_id");
  if (!order) return sendError(res, 404, "ORDER_NOT_FOUND", "ไม่พบออเดอร์");
  const queue = await Queue.findOne({ order_id: order._id });
  return res.json({ order: orderView(order, queue) });
}

async function cancelMyOrder(req, res) {
  const query = mongoose.isValidObjectId(req.params.id)
    ? { _id: req.params.id, customer_id: req.user._id }
    : { order_number: req.params.id, customer_id: req.user._id };
  const order = await cancelOrder(query, { reason: req.body?.reason || "ลูกค้ายกเลิกออเดอร์" });
  if (!order) {
    const exists = await Order.exists(query);
    return sendError(res, exists ? 409 : 404, exists ? "ORDER_CANNOT_CANCEL" : "ORDER_NOT_FOUND", exists ? "ยกเลิกได้ก่อนร้านเริ่มทำอาหารเท่านั้น" : "ไม่พบออเดอร์");
  }
  const fullOrder = await Order.findById(order._id).populate("store_id", "name client_id");
  const queue = await Queue.findOne({ order_id: order._id });
  const event = { orderId: String(order._id), orderNumber: order.order_number, status: "cancelled", changedAt: Date.now() };
  req.app.get("io")?.to(`store:${order.store_id}`).emit("order:status", event);
  req.app.get("io")?.to(`user:${req.user._id}`).emit("order:status", event);
  return res.json({ order: orderView(fullOrder, queue) });
}

async function reviewMyOrder(req, res) {
  const { rating, tags = [], text = "" } = req.body || {};
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5 || !Array.isArray(tags) || tags.length > 10 || tags.some((tag) => typeof tag !== "string" || tag.length > 50) || typeof text !== "string" || text.length > 2000) {
    return sendError(res, 400, "INVALID_REVIEW", "กรุณาให้คะแนน 1-5 ดาวและรีวิวไม่เกิน 2,000 ตัวอักษร");
  }
  const query = mongoose.isValidObjectId(req.params.id)
    ? { _id: req.params.id, customer_id: req.user._id }
    : { order_number: req.params.id, customer_id: req.user._id };
  const order = await Order.findOneAndUpdate({ ...query, status: "completed" }, {
    $set: { review: { rating, tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))], text: text.trim(), updated_at: new Date() } },
  }, { returnDocument: "after", runValidators: true }).populate("store_id", "name client_id");
  if (!order) {
    const exists = await Order.exists(query);
    return sendError(res, exists ? 409 : 404, exists ? "ORDER_NOT_COMPLETED" : "ORDER_NOT_FOUND", exists ? "รีวิวได้หลังรับอาหารเสร็จแล้วเท่านั้น" : "ไม่พบออเดอร์");
  }
  const ratings = await Order.aggregate([
    { $match: { store_id: order.store_id._id, status: "completed", "review.rating": { $gte: 1 } } },
    { $group: { _id: null, average: { $avg: "$review.rating" }, count: { $sum: 1 } } },
  ]);
  if (ratings[0]) await Store.updateOne({ _id: order.store_id._id }, { $set: { rating: { average: money(ratings[0].average), count: ratings[0].count } } });
  const queue = await Queue.findOne({ order_id: order._id });
  return res.json({ order: orderView(order, queue) });
}

module.exports = { createOrder, listMyOrders, getMyOrder, cancelMyOrder, reviewMyOrder, orderView };
