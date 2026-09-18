const mongoose = require("mongoose");

const ingredientSchema = new mongoose.Schema(
  {
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    },

    unit: {
      type: String,
      required: true
    },

    low_stock_threshold: {
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

ingredientSchema.index(
  { store_id: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "Ingredient",
  ingredientSchema
);