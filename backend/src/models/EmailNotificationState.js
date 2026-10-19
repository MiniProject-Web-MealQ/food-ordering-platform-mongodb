const mongoose = require("mongoose");

module.exports = mongoose.model("EmailNotificationState", new mongoose.Schema({
  _id: String,
  enabled_at: { type: Date, required: true },
}, { timestamps: true }));
