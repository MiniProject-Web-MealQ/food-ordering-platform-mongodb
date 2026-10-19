const mongoose = require("mongoose");
module.exports = mongoose.model("EmailChange", new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  email: String, original_email: String, session_version: Number,
  ticket: String, otp_hash: { type: String, select: false }, ready: Boolean,
  expires_at: Date, resend_after: Date, attempts: Number,
  send_count: Number, window_end: Date, delete_after: { type: Date, expires: 0 },
}, { timestamps: true }));
