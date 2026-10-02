const Order = require("../models/Order");
const Queue = require("../models/Queue");
const { refundOrderPayment } = require("./wallet");

async function cancelOrder(query, { allowedStatuses = ["pending", "confirmed"], reason = "", by = "customer" } = {}) {
  let order = await Order.findOneAndUpdate({ ...query, status: { $in: allowedStatuses } }, {
    $set: { status: "cancelled", cancelled_reason: String(reason).trim().slice(0, 500), cancelled_by: by, cancelled_at: new Date() },
  }, { returnDocument: "after" });
  if (!order) {
    // A cancellation retry must finish a pending refund rather than applying it twice.
    order = await Order.findOne({ ...query, status: "cancelled" });
    if (!order) return null;
  }
  await Queue.updateOne({ order_id: order._id }, { $set: { status: "cancelled" } });
  return refundOrderPayment(order);
}

module.exports = { cancelOrder };
