const crypto = require("crypto");
const mongoose = require("mongoose");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Store = require("../models/Store");
const { sendError } = require("../utils/http");

const SERVICE_FEE = 4;

function makeOrderNumber() {
  const suffix = `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
  return `MQ${suffix}`;
}

function optionsPrice(menu, selections = {}) {
  let extra = 0;
  for (const group of menu.option_groups || []) {
    const selected = Array.isArray(selections?.[group.id]) ? selections[group.id] : [];
    for (const optionId of selected) {
      const option = (group.options || []).find((candidate) => candidate.id === optionId);
      if (option) extra += Number(option.price || 0);
    }
  }
  return extra;
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
    status: order.status,
    queueNumber: queue?.queue_number ?? null,
    pickupCode: queue?.receive_code ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function createOrder(req, res) {
  const inputItems = Array.isArray(req.body?.items) ? req.body.items : [];
  if (inputItems.length === 0) return sendError(res, 400, "EMPTY_ORDER", "ตะกร้ายังไม่มีรายการอาหาร");

  const clientIds = [...new Set(inputItems.map((item) => item.menuId).filter(Boolean))];
  const objectIds = inputItems
    .map((item) => item.menuId)
    .filter((id) => mongoose.isValidObjectId(id));

  const menus = await Menu.find({
    $or: [
      { client_id: { $in: clientIds } },
      ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
    ],
  });

  const byClientId = new Map(menus.map((menu) => [menu.client_id, menu]));
  const byId = new Map(menus.map((menu) => [String(menu._id), menu]));
  const resolved = inputItems.map((item) => ({ input: item, menu: byClientId.get(item.menuId) || byId.get(item.menuId) }));
  const missing = resolved.find(({ menu }) => !menu);
  if (missing) {
    return sendError(
      res,
      400,
      "MENU_NOT_IN_DATABASE",
      `เมนู ${missing.input.menuId} ยังไม่มีใน MongoDB กรุณารัน npm run seed ที่ backend ก่อน`,
    );
  }
  if (resolved.some(({ menu }) => !menu.is_available)) {
    return sendError(res, 409, "MENU_UNAVAILABLE", "มีเมนูที่ปิดขายอยู่ในตะกร้า");
  }

  const storeId = String(resolved[0].menu.store_id);
  if (resolved.some(({ menu }) => String(menu.store_id) !== storeId)) {
    return sendError(res, 400, "MULTI_STORE_ORDER", "หนึ่งออเดอร์สามารถสั่งได้จากร้านเดียวเท่านั้น");
  }

  const store = await Store.findById(storeId);
  if (!store) return sendError(res, 404, "RESTAURANT_NOT_FOUND", "ไม่พบร้านอาหารของรายการนี้");
  if (!store.is_open) return sendError(res, 409, "STORE_CLOSED", "ร้านปิดรับออเดอร์อยู่ในขณะนี้");

  const items = resolved.map(({ input, menu }) => {
    const quantity = Math.max(1, Number.parseInt(input.quantity, 10) || 1);
    const unitPrice = Number(menu.price) + optionsPrice(menu, input.selections || {});
    return {
      menu_id: menu._id,
      client_menu_id: menu.client_id,
      name: menu.name,
      price: unitPrice,
      quantity,
      total_price: unitPrice * quantity,
      selections: input.selections || {},
      note: String(input.note || "").trim(),
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const couponCode = String(req.body?.couponCode || "").trim().toUpperCase();
  const discount = couponCode === "LUNCH10" ? Math.round(subtotal * 0.1) : 0;
  const totalPrice = Math.max(0, subtotal + SERVICE_FEE - discount);

  const order = await Order.create({
    order_number: makeOrderNumber(),
    customer_id: req.user._id,
    store_id: store._id,
    items,
    subtotal,
    service_fee: SERVICE_FEE,
    discount,
    total_price: totalPrice,
    payment_method: req.body?.paymentMethod || "promptpay",
    promotion: couponCode
      ? { code: couponCode, discount_type: "percentage", discount_value: couponCode === "LUNCH10" ? 10 : 0 }
      : undefined,
    status: "pending",
  });

  const previousQueue = await Queue.findOne({ store_id: store._id }).sort({ queue_number: -1 });
  const queueNumber = (previousQueue?.queue_number || 0) + 1;
  const queue = await Queue.create({
    order_id: order._id,
    store_id: store._id,
    queue_number: queueNumber,
    receive_code: String(Math.floor(1000 + Math.random() * 9000)),
    status: "waiting",
  });

  const fullOrder = await Order.findById(order._id).populate("customer_id", "name email").populate("store_id", "name client_id");
  const payload = orderView(fullOrder, queue);
  req.app.get("io")?.to(`store:${store._id}`).emit("order:new", payload);
  req.app.get("io")?.to(`user:${req.user._id}`).emit("order:created", payload);

  return res.status(201).json({ order: payload });
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

module.exports = { createOrder, listMyOrders, getMyOrder, orderView };
