const mongoose = require("mongoose");

const adminActivitySchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    target_type: { type: String, required: true },
    target_id: { type: String, required: true },
    target_label: { type: String, required: true },
    detail: { type: String, default: null },
  },
  { timestamps: true },
);

adminActivitySchema.index({ createdAt: -1 });
module.exports = mongoose.model("AdminActivity", adminActivitySchema);
