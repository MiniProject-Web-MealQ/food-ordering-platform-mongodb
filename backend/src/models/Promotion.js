const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null
    },

    title: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    discount_type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true
    },

    discount_value: {
      type: Number,
      required: true,
      min: 0
    },

    minimum_order: {
      type: Number,
      default: 0
    },
    max_discount: { type: Number, default: null, min: 0 },
    per_user_limit: { type: Number, default: null, min: 1 },
    usage_by_customer: { type: Map, of: Number, default: {} },

    start_date: {
      type: Date,
      required: true
    },

    expire_date: {
      type: Date,
      required: true
    },

    usage_limit: {
      type: Number,
      default: null
    },

    used_count: {
      type: Number,
      default: 0
    },

    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

promotionSchema.index(
  {
    store_id: 1,
    code: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "Promotion",
  promotionSchema
);
