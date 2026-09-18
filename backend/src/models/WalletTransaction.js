const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },

    type: {
      type: String,
      enum: [
        "topup",
        "payment",
        "refund"
      ],
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    balance_before: {
      type: Number,
      required: true
    },

    balance_after: {
      type: Number,
      required: true
    },

    description: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

walletTransactionSchema.index({
  user_id: 1,
  createdAt: -1
});

walletTransactionSchema.index({
  order_id: 1
});

module.exports = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);