const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    client_id: { type: String, unique: true, sparse: true, trim: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    address: {
      detail: String,
      province: String,
      district: String,
      postal_code: String,
    },
    phone: String,
    coordinates: { latitude: Number, longitude: Number },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    queue: {
      max_queue: { type: Number, default: 50 },
    },
    opening_hours: {
      automatic: { type: Boolean, default: false },
      open_time: String,
      close_time: String,
    },
    cover_image: String,
    logo: String,
    is_open: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "active", "suspended", "rejected"], default: "pending" },
    status_note: { type: String, default: null },
    queue_sequence: { type: Number, default: 0, min: 0 },
    checkout_lock: { type: String, default: null, select: false },
    checkout_lock_until: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Store", storeSchema);
