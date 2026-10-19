const Order = require("../models/Order");
const Queue = require("../models/Queue");
const { refundOrderPayment } = require("./wallet");

async function cancelOrder(query, { allowedStatuses = ["pending", "confirmed"], reason = "", by = "customer" } = {}) {
  const at = new Date();
  let order = await Order.findOneAndUpdate({ ...query, checkout_completed: { $ne: false }, status: { $in: allowedStatuses } }, [{
    $set: { status: "cancelled", cancelled_reason: { $literal: String(reason).trim().slice(0, 500) }, cancelled_by: by, cancelled_at: at, notification_pending: true,
      notification_events: { $concatArrays: [{ $ifNull: ["$notification_events", []] }, [{ status: "cancelled", at, payment_status: "$payment_status", cancelled_by: by }]] },
    },
  }], { returnDocument: "after", updatePipeline: true });
  if (!order) {
    // A cancellation retry must finish a pending refund rather than applying it twice.
    order = await Order.findOne({ ...query, status: "cancelled" });
    if (!order) return null;
  }
  await Queue.updateOne({ order_id: order._id }, { $set: { status: "cancelled" } });
  await require("./inventory").release(order);
  await require("./promotion-claims").releasePromotionClaim(order);
  return refundOrderPayment(order);
}

module.exports = { cancelOrder };
