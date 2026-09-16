const mongoose = require("mongoose");

const menuIngredientSchema = new mongoose.Schema(
  {
    ingredient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
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
    }
  },
  {
    _id: false
  }
);

const menuSchema = new mongoose.Schema(
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

    description: {
      type: String,
      default: ""
    },

    category: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    image: {
      type: String,
      default: null
    },

    ingredients: [menuIngredientSchema],

    sold_quantity: {
      type: Number,
      default: 0
    },

    cook_time: {
      type: Number,
      default: 0
    },

    is_available: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

menuSchema.index({
  store_id: 1
});

menuSchema.index({
  store_id: 1,
  category: 1
});

module.exports = mongoose.model("Menu", menuSchema);