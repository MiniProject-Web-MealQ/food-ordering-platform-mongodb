const crypto = require("crypto");
const mongoose = require("mongoose");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Store = require("../models/Store");
const User = require("../models/User");
const Promotion = require("../models/Promotion");
const { money, validateOrderInput, priceOrderItem } = require("../services/order-pricing");
const { changeBalance } = require("../services/wallet");
const { cancelOrder } = require("../services/order-lifecycle");
const { sendError } = require("../utils/http");
const { checkoutIdentity } = require("../services/checkout");
const { getSettings } = require("../services/settings");
const { demoPaymentsEnabled, paymentCapabilities } = require("../services/payment-config");
const { snapshotStore, orderStoreView } = require("../services/order-store-view");

function makeOrderNumber() {
  const suffix = `${Date.now()}${crypto.randomBytes(6).toString("hex")}`;
  return `MQ${suffix}`;
}

function orderView(order, queue = null) {
  const customer = order.customer_id && typeof order.customer_id === "object" ? order.customer_id : null;
  return {
    id: String(order._id),
    orderNumber: order.order_number,
    customer: customer
      ? { id: String(customer._id), name: customer.name, email: customer.email }
      : { id: String(order.customer_id) },
    store: orderStoreView(order),
    items: order.items.map((item) => ({
      menuId: String(item.menu_id),
      clientMenuId: item.client_menu_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      totalPrice: item.total_price,
      selections: item.selections,
      selectedOptions: item.selected_options,
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

async function replayCheckout(identity, res) {
  if (!identity) return false;
  const order = await Order.findOne({ checkout_key: identity.key }).populate("store_id", "name client_id").populate("customer_id", "name email");
  if (!order) return false;
  if (order.checkout_fingerprint !== identity.fingerprint) {
    sendError(res, 409, "IDEMPOTENCY_CONFLICT", "คำขอเดิมมีรายการอาหารหรือวิธีชำระเงินต่างกัน กรุณาตรวจสอบออเดอร์");
  } else if (!order.checkout_completed) {
    sendError(res, 409, "CHECKOUT_IN_PROGRESS", "กำลังตรวจสอบคำสั่งซื้อเดิม กรุณาลองอีกครั้งด้วยคำขอเดิม");
  } else {
    res.status(201).json({ order: orderView(order, await Queue.findOne({ order_id: order._id })) });
  }
  return true;
}

async function createOrder(req, res) {
  let paymentMethod;
  let identity;
  try { paymentMethod = validateOrderInput(req.body); }
  catch (error) { return sendError(res, error.status || 400, error.code, error.message); }
  try { identity = checkoutIdentity(req); }
  catch (error) { return sendError(res, error.status, error.code, error.message); }
  if (await replayCheckout(identity, res)) return;
  if (!paymentCapabilities().paymentMethods.includes(paymentMethod)) {
    return sendError(res, 501, "PAYMENT_NOT_CONFIGURED", "ยังไม่ได้เชื่อมต่อผู้ให้บริการชำระเงินจริง");
  }
  const settings = await getSettings();
  if (!settings.accepting_orders) return sendError(res, 503, "ORDERS_PAUSED", "ระบบหยุดรับออเดอร์ชั่วคราว กรุณาลองใหม่ภายหลัง");
  const serviceFee = settings.service_fee;
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
  if (store.owner_id && !await User.exists({ _id: store.owner_id, status: "active", role: { $in: ["merchant", "staff"] } })) return sendError(res, 409, "STORE_UNAVAILABLE", "ร้านนี้หยุดรับออเดอร์ชั่วคราว");
  if (!require("../services/store-hours").isStoreOpen(store)) return sendError(res, 409, "STORE_CLOSED", "ร้านปิดรับออเดอร์อยู่ในขณะนี้");
  let items;
  try { items = resolved.map(({ input, menu }) => priceOrderItem(menu, input)); }
  catch (error) { return sendError(res, error.status || 400, error.code, error.message); }
  const subtotal = money(items.reduce((sum, item) => sum + item.total_price, 0));
  let promotion = null;
  let discount = 0;
  try { ({ promotion, discount } = await require("../services/customer-coupons").resolveForCheckout(req.user._id, req.body, store._id, subtotal)); }
  catch (error) { if (error.status && error.code) return sendError(res, error.status, error.code, error.message); throw error; }
  const totalPrice = money(subtotal + serviceFee - discount);
  if (req.body.expectedTotal !== undefined && (!Number.isFinite(req.body.expectedTotal) || req.body.expectedTotal !== totalPrice)) return sendError(res, 409, "PRICE_CHANGED", "ราคาหรือส่วนลดเปลี่ยนแล้ว กรุณากลับไปตรวจสอบยอดชำระอีกครั้ง", { total: totalPrice });
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
  if (!locked) {
    if (await replayCheckout(identity, res)) return;
    return sendError(res, 409, "STORE_BUSY", "ร้านกำลังรับคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
  }
  let order = null;
  try {
    if (await replayCheckout(identity, res)) return;
    if (store.owner_id && !await User.exists({ _id: store.owner_id, status: "active", role: { $in: ["merchant", "staff"] } })) return sendError(res, 409, "STORE_UNAVAILABLE", "ร้านนี้หยุดรับออเดอร์ชั่วคราว");
    const maxQueue = Math.max(1, Number(locked.queue?.max_queue || 50));
    const active = await Queue.countDocuments({ store_id: store._id, status: { $in: ["waiting", "preparing", "ready"] } });
    if (active >= maxQueue) return sendError(res, 409, "QUEUE_FULL", `คิวของร้านเต็มแล้ว (${maxQueue} คิว) กรุณาลองใหม่ภายหลัง`);
    order = await Order.create({
      order_number: makeOrderNumber(), customer_id: req.user._id, store_id: store._id, store_snapshot: snapshotStore(store),
      ...(identity ? { checkout_key: identity.key, checkout_fingerprint: identity.fingerprint } : {}),
      stock_requirements: require("../services/inventory").requirements(resolved),
      items, subtotal, service_fee: serviceFee, discount, total_price: totalPrice,
      payment_method: paymentMethod, payment_status: "pending",
      payment_mode: demoPaymentsEnabled() ? "sandbox" : "wallet",
      promotion: promotion ? { promotion_id: promotion._id, code: promotion.code, discount_type: promotion.discount_type, discount_value: promotion.discount_value } : undefined,
      status: "pending", checkout_completed: false,
    });
    if (!require("../services/store-hours").isStoreOpen(locked)) throw Object.assign(new Error("ร้านปิดตามเวลาแล้ว"), { status: 409, code: "STORE_CLOSED" });
    if (promotion) {
      const customerUsage = `usage_by_customer.${req.user._id}`;
      const constraints = [];
      if (promotion.usage_limit != null) constraints.push({ $lt: ["$used_count", promotion.usage_limit] });
      if (promotion.per_user_limit != null) constraints.push({ $lt: [{ $ifNull: [`$${customerUsage}`, 0] }, promotion.per_user_limit] });
      const query = { _id: promotion._id, [`checkout_claims.${order._id}`]: { $exists: false }, is_active: true, start_date: { $lte: new Date() }, expire_date: { $gt: new Date() },
        store_id: promotion.store_id || null, code: promotion.code, discount_type: promotion.discount_type, discount_value: promotion.discount_value,
        minimum_order: promotion.minimum_order || 0, max_discount: promotion.max_discount ?? null,
        usage_limit: promotion.usage_limit ?? null, per_user_limit: promotion.per_user_limit ?? null };
      if (constraints.length) query.$expr = { $and: constraints };
      const claimed = await Promotion.findOneAndUpdate(query, { $inc: { used_count: 1, [customerUsage]: 1 }, $set: { [`checkout_claims.${order._id}`]: true } }, { returnDocument: "after" });
      if (!claimed) throw Object.assign(new Error("คูปองนี้ถูกใช้ครบสิทธิ์แล้ว"), { status: 409, code: "COUPON_LIMIT" });
    }
    await require("../services/inventory").reserve(order);
    if (paymentMethod === "wallet" && totalPrice > 0) {
      await changeBalance({ userId: req.user._id, amount: -totalPrice, type: "payment", orderId: order._id, key: `order:${order._id}:payment`, description: `ชำระออเดอร์ ${order.order_number}` });
    }
    order.payment_status = paymentMethod === "wallet" ? "paid" : "simulated";
    const paid = await Order.updateOne({ _id: order._id, checkout_completed: false, status: "pending" }, { $set: { payment_status: order.payment_status } });
    if (!paid.matchedCount) throw Object.assign(new Error("ออเดอร์ถูกยกเลิกแล้ว"), { status: 409, code: "CHECKOUT_ABORTED" });
    const previous = await Queue.findOne({ store_id: store._id }).sort({ queue_number: -1 });
    await Store.updateOne({ _id: store._id }, { $max: { queue_sequence: previous?.queue_number || 0 } });
    const numbered = await Store.findByIdAndUpdate(store._id, { $inc: { queue_sequence: 1 } }, { returnDocument: "after" });
    const queue = await Queue.create({ order_id: order._id, store_id: store._id, queue_number: numbered.queue_sequence, receive_code: String(crypto.randomInt(1000, 10000)), status: "waiting" });
    const finished = await Order.updateOne({ _id: order._id, checkout_completed: false, status: "pending" }, { $set: { checkout_completed: true, notification_pending: true }, $push: { notification_events: { status: "pending", at: new Date(), payment_status: order.payment_status } } });
    if (!finished.matchedCount) throw Object.assign(new Error("ออเดอร์ถูกยกเลิกแล้ว"), { status: 409, code: "CHECKOUT_ABORTED" });
    const fullOrder = await Order.findById(order._id).populate("customer_id", "name email").populate("store_id", "name client_id");
    await require("../services/notifications").recordOrder(fullOrder).catch((error) => console.error("Notification failed", error.name));
    const payload = orderView(fullOrder, queue);
    req.app.get("io")?.to(`store:${store._id}`).emit("order:new", payload);
    req.app.get("io")?.to(`user:${req.user._id}`).emit("order:created", payload);
    return res.status(201).json({ order: payload });
  } catch (error) {
    if (order) await require("../services/checkout-recovery").compensate(order, "สร้างออเดอร์ไม่สำเร็จ");
    if (!order && error.code === 11000 && await replayCheckout(identity, res)) return;
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
  await require("../services/notifications").recordOrder(fullOrder).catch((error) => console.error("Notification failed", error.name));
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
  if (order.store_id?.name) {
    const ratings = await Order.aggregate([
      { $match: { store_id: order.store_id._id, status: "completed", "review.rating": { $gte: 1 } } },
      { $group: { _id: null, average: { $avg: "$review.rating" }, count: { $sum: 1 } } },
    ]);
    if (ratings[0]) await Store.updateOne({ _id: order.store_id._id }, { $set: { rating: { average: money(ratings[0].average), count: ratings[0].count } } });
  }
  const queue = await Queue.findOne({ order_id: order._id });
  return res.json({ order: orderView(order, queue) });
}

module.exports = { createOrder, listMyOrders, getMyOrder, cancelMyOrder, reviewMyOrder, orderView };
