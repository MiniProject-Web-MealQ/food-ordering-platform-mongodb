const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menu_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    total_price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const orderPromotionSchema = new mongoose.Schema(
  {
    promotion_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion"
    },

    code: String,

    discount_type: String,

    discount_value: Number
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    items: {
      type: [orderItemSchema],
      required: true
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    discount: {
      type: Number,
      default: 0,
      min: 0
    },

    total_price: {
      type: Number,
      required: true,
      min: 0
    },

    promotion: orderPromotionSchema,

    status: {
      type: String,

      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled"
      ],

      default: "pending"
    },

    order_date: {
      type: Date,
      default: Date.now
    },

    receive_time: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({
  customer_id: 1,
  createdAt: -1
});

orderSchema.index({
  store_id: 1,
  createdAt: -1
});

module.exports = mongoose.model("Order", orderSchema);