const mongoose = require("mongoose");
module.exports = mongoose.model("PushConfig", new mongoose.Schema({ _id: String, publicKey: String, privateKey: { type: String, select: false } }));
