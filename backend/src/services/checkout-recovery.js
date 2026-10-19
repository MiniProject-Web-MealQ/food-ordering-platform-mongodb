const crypto = require("crypto");
const Order = require("../models/Order");
const Store = require("../models/Store");
const Wallet = require("../models/Wallet");
const Queue = require("../models/Queue");
const { ensureWallet, changeBalance, refundOrderPayment } = require("./wallet");
const inventory = require("./inventory");

async function compensate(order, reason = "ระบบยกเลิกคำสั่งซื้อที่ไม่สมบูรณ์") {
  order = await Order.findOneAndUpdate({ _id: order._id, $or: [{ checkout_completed: false }, { status: "cancelled" }] }, { $set: { status: "cancelled", cancelled_reason: order.cancelled_reason || reason, cancelled_at: order.cancelled_at || new Date(), cancelled_by: order.cancelled_by || "system" } }, { returnDocument: "after" });
  if (!order) return null;
  const paymentKey = `order:${order._id}:payment`;
  if (order.payment_method === "wallet" && order.total_price > 0) {
    await ensureWallet(order.customer_id);
    // Atomically block a late debit before reading its durable balance marker.
    await Wallet.updateOne({ user_id: order.customer_id }, { $addToSet: { blocked_keys: paymentKey } });
    const debit = await Wallet.exists({ user_id: order.customer_id, ledger_keys: paymentKey });
    if (debit) {
      await changeBalance({ userId: order.customer_id, amount: -order.total_price, type: "payment", orderId: order._id, key: paymentKey, description: `ชำระออเดอร์ ${order.order_number}` });
      order.payment_status = "paid";
      await refundOrderPayment(order);
    } else await Order.updateOne({ _id: order._id }, { $set: { payment_status: "failed" } });
  } else if (!order.checkout_completed) await Order.updateOne({ _id: order._id }, { $set: { payment_status: "failed" } });
  await inventory.release(order);
  await require("./promotion-claims").releasePromotionClaim(order);
  await Queue.updateOne({ order_id: order._id }, { $set: { status: "cancelled" } });
  return Order.findByIdAndUpdate(order._id, { $set: { checkout_completed: true, compensation_completed: true }, ...(!order.checkout_completed ? { $unset: { checkout_key: 1, checkout_fingerprint: 1 } } : {}) }, { returnDocument: "after" });
}
let running = false;
async function recoverCheckouts() {
  if (running) return;
  running = true;
  try {
    const orders = await Order.find({ $or: [{ checkout_completed: false, createdAt: { $lt: new Date(Date.now() - 120000) } }, { status: "cancelled", compensation_completed: { $ne: true } }] }).sort({ createdAt: 1 }).limit(100);
    for (const order of orders) {
      const token = crypto.randomUUID();
      const lock = await Store.findOneAndUpdate({ _id: order.store_id, $or: [{ checkout_lock_until: null }, { checkout_lock_until: { $lte: new Date() } }] }, { $set: { checkout_lock: token, checkout_lock_until: new Date(Date.now() + 60000) } });
      if (!lock) continue;
      try { await compensate(order); }
      finally { await Store.updateOne({ _id: order.store_id, checkout_lock: token }, { $set: { checkout_lock: null, checkout_lock_until: null } }); }
    }
  } finally { running = false; }
}
module.exports = { compensate, recoverCheckouts };
