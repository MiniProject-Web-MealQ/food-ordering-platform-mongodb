const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  event_key: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  role: { type: String, enum: ["customer", "merchant"], required: true },
  event: { type: String, required: true },
  event_at: { type: Date, required: true },
  preference_generation: { type: String, required: true },
  to: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["pending", "sending", "sent", "skipped", "failed"], default: "pending" },
  attempts: { type: Number, default: 0 },
  available_at: { type: Date, default: Date.now },
  lease_until: { type: Date, default: null },
  lease_id: { type: String, default: null },
  last_error_code: { type: String, default: null },
  sent_at: { type: Date, default: null },
}, { timestamps: true });
schema.index({ status: 1, available_at: 1, lease_until: 1 });
module.exports = mongoose.model("EmailOutbox", schema);
