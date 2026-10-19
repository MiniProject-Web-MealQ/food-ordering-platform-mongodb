const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  registration_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, default: null },
  password_hash: { type: String, required: true, select: false },
  role: { type: String, enum: ["customer", "merchant"], required: true },
  otp_hash: { type: String, required: true, select: false },
  ready: { type: Boolean, default: false },
  expires_at: { type: Date, required: true },
  resend_after: { type: Date, required: true },
  attempts_remaining: { type: Number, default: 5 },
  send_count: { type: Number, default: 0 },
  window_resets_at: { type: Date, required: true },
  delete_after: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = mongoose.model("PendingRegistration", schema);
