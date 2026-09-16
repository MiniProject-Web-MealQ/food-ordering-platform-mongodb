const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true
    },

    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    queue_number: {
      type: Number,
      required: true
    },

    receive_code: {
      type: String,
      required: true
    },

    status: {
      type: String,

      enum: [
        "waiting",
        "preparing",
        "ready",
        "completed",
        "cancelled"
      ],

      default: "waiting"
    },

    called_at: {
      type: Date,
      default: null
    },

    completed_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

queueSchema.index({
  store_id: 1,
  queue_number: 1
});

module.exports = mongoose.model("Queue", queueSchema);