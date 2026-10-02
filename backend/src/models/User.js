const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    phone: { type: String, default: null },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    status_note: { type: String, default: null },
    must_change_password: { type: Boolean, default: false },
    session_version: { type: Number, default: 0 },
    google_id: { type: String, default: null, index: true },
    reset_token_hash: { type: String, default: null },
    reset_token_expires: { type: Date, default: null },
    role: {
      type: String,
      enum: ["customer", "merchant", "staff", "admin"],
      default: "customer",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
