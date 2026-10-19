const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  promotion_id: { type: mongoose.Schema.Types.ObjectId, ref: "Promotion", required: true },
  collected_at: { type: Date, default: Date.now },
  // Retain an intelligible wallet entry if an administrator removes a promotion.
  snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
schema.index({ user_id: 1, promotion_id: 1 }, { unique: true });
schema.index({ user_id: 1, collected_at: -1 });
module.exports = mongoose.model("CustomerCoupon", schema);
