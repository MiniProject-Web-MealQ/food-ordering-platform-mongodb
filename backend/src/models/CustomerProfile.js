const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  favorites: {
    restaurants: { type: [String], default: [] },
    menus: { type: [String], default: [] },
  },
  settings: {
    notifyReady: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ["promptpay", "card", "banking", "wallet"], default: "promptpay" },
  },
}, { timestamps: true });

module.exports = mongoose.model("CustomerProfile", schema);
