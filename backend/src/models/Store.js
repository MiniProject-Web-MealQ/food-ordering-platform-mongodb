const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    address: {
      detail: String,
      province: String,
      district: String,
      postal_code: String
    },

    phone: String,

    rating: {
      average: {
        type: Number,
        default: 0
      },

      count: {
        type: Number,
        default: 0
      }
    },

    queue: {
      max_queue: {
        type: Number,
        default: 50
      }
    },

    opening_hours: {
      open_time: String,
      close_time: String
    },

    cover_image: String,

    logo: String,

    is_open: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Store", storeSchema);