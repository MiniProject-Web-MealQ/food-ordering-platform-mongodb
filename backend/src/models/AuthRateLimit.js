const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  _id: String,
  count: { type: Number, default: 0 },
  expires_at: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model("AuthRateLimit", schema);
