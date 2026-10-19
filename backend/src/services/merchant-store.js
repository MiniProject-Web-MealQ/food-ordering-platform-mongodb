const Store = require("../models/Store");
function accountStore(user) {
  return user.role === "staff" ? Store.findOne({ _id: user.store_id || null }) : Store.findOne({ owner_id: user._id });
}
module.exports = { accountStore };
