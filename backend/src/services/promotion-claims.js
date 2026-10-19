const Promotion = require("../models/Promotion");

async function releasePromotionClaim(order) {
  if (!order || order.status !== "cancelled" || !order.promotion?.promotion_id) return;
  const marker = `checkout_claims.${order._id}`;
  const userId = order.customer_id?._id || order.customer_id;
  // A tombstone fences a failed checkout that resumes after cancellation.
  await Promotion.updateOne({ _id: order.promotion.promotion_id, [marker]: { $exists: false } }, { $set: { [marker]: false } });
  // The claim receipt and both counters change together, exactly once.
  await Promotion.updateOne({ _id: order.promotion.promotion_id, [marker]: true }, {
    $inc: { used_count: -1, [`usage_by_customer.${userId}`]: -1 }, $set: { [marker]: false },
  });
}

module.exports = { releasePromotionClaim };
