const mongoose = require("mongoose");
module.exports = mongoose.model("SystemSettings", new mongoose.Schema({
  _id: { type: String, default: "global" },
  service_fee: { type: Number, default: 4, min: 0, max: 1000 },
  accepting_orders: { type: Boolean, default: true },
}, { timestamps: true }));
