const mongoose = require("mongoose");
module.exports = mongoose.model("PushSubscription", new mongoose.Schema({ user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }, endpoint: { type: String, unique: true }, keys: { auth: String, p256dh: String } }, { timestamps: true }));
