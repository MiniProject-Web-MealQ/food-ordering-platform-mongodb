const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menu_id: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", required: true },
    client_menu_id: { type: String, default: null },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total_price: { type: Number, required: true, min: 0 },
    selections: { type: mongoose.Schema.Types.Mixed, default: {} },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const orderPromotionSchema = new mongoose.Schema(
  {
    promotion_id: { type: mongoose.Schema.Types.ObjectId, ref: "Promotion" },
    code: String,
    discount_type: String,
    discount_value: Number,
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    order_number: { type: String, required: true, unique: true, index: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    store_id: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    service_fee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total_price: { type: Number, required: true, min: 0 },
    promotion: orderPromotionSchema,
    payment_method: { type: String, default: "promptpay" },
    payment_status: { type: String, enum: ["pending", "paid", "simulated", "refunded", "failed"], default: "pending" },
    payment_mode: { type: String, enum: ["wallet", "sandbox"], default: "sandbox" },
    cancelled_reason: { type: String, default: "" },
    cancelled_by: { type: String, enum: ["customer", "merchant", "admin", "system"], default: null },
    cancelled_at: { type: Date, default: null },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      tags: { type: [String], default: undefined },
      text: { type: String, default: "" },
      updated_at: Date,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
      default: "pending",
    },
    order_date: { type: Date, default: Date.now },
    receive_time: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ customer_id: 1, createdAt: -1 });
orderSchema.index({ store_id: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
