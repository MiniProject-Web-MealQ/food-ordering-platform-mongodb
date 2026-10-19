const SystemSettings = require("../models/SystemSettings");
async function getSettings() {
  return await SystemSettings.findById("global").lean() || { _id: "global", service_fee: 4, accepting_orders: true };
}
module.exports = { getSettings };
