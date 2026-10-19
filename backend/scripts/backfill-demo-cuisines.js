const path = require("node:path");
const { pathToFileURL } = require("node:url");
const mongoose = require("mongoose");
const Menu = require("../src/models/Menu");

async function backfill(apply = false) {
  const { MENU_ITEMS } = await import(pathToFileURL(path.resolve(__dirname, "../../frontend/src/features/customer/mock-data.js")).href);
  const counts = {};
  for (const item of MENU_ITEMS) {
    // Exact seeded identity/name only; preserve merchant edits and all explicit cuisines.
    const query = { client_id: item.id, name: item.name, $or: [{ cuisine: { $exists: false } }, { cuisine: null }] };
    const cuisine = item.cuisine || "thai";
    const count = apply ? (await Menu.updateOne(query, { $set: { cuisine } })).modifiedCount : await Menu.countDocuments(query);
    counts[cuisine] = (counts[cuisine] || 0) + count;
  }
  console.log(JSON.stringify({ apply, counts }));
}
if (require.main === module) {
  require("dotenv").config({ quiet: true });
  mongoose.connect(process.env.MONGO_URI).then(() => backfill(process.argv.includes("--apply"))).catch((error) => { console.error(error.name); process.exitCode = 1; }).finally(() => mongoose.disconnect());
}
module.exports = { backfill };
