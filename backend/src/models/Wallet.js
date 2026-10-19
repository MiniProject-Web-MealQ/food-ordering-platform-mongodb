const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    blocked_keys: { type: [String], default: [], select: false },
    ledger_keys: { type: [String], default: [], select: false },
    ledger_results: { type: mongoose.Schema.Types.Mixed, default: {}, select: false }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Wallet",
  walletSchema
);
