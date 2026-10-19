const Order = require("../models/Order");
const Ingredient = require("../models/Ingredient");
async function enrichMenus(menus) {
  if (!menus.length) return menus;
  const [sales, stock] = await Promise.all([
    Order.aggregate([{ $match: { checkout_completed: { $ne: false }, status: { $ne: "cancelled" }, payment_status: { $in: ["paid", "simulated"] }, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) }, "items.menu_id": { $in: menus.map((m) => m._id) } } }, { $unwind: "$items" }, { $group: { _id: "$items.menu_id", quantity: { $sum: "$items.quantity" } } }]),
    Ingredient.find({ store_id: { $in: menus.map((m) => m.store_id) } }).select("quantity unit is_active").lean(),
  ]);
  const quantities = new Map(sales.map((row) => [String(row._id), row.quantity]));
  const stockById = new Map(stock.map((row) => [String(row._id), row]));
  return menus.map((menu) => {
    const row = menu.toObject(); row.weekly_orders = quantities.get(String(row._id)) || 0;
    row.is_available = row.is_available && row.ingredients.every((recipe) => { const ingredient = stockById.get(String(recipe.ingredient_id)); return ingredient?.is_active && ingredient.unit === recipe.unit && ingredient.quantity >= recipe.quantity; });
    return row;
  });
}
module.exports = { enrichMenus };
