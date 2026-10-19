const Ingredient = require("../models/Ingredient");
const fail = (message) => Object.assign(new Error(message), { status: 409, code: "OUT_OF_STOCK" });
function requirements(resolved) {
  const totals = new Map();
  for (const { input, menu } of resolved) for (const recipe of menu.ingredients || []) {
    const id = String(recipe.ingredient_id);
    const row = totals.get(id) || { ingredient_id: id, quantity: 0, unit: recipe.unit };
    row.quantity = Math.round((row.quantity + recipe.quantity * input.quantity) * 1000000) / 1000000;
    totals.set(id, row);
  }
  return [...totals.values()];
}
async function reserve(order) {
  const key = `reservations.${order._id}`;
  for (const row of order.stock_requirements || []) {
    const changed = await Ingredient.findOneAndUpdate({ _id: row.ingredient_id, store_id: order.store_id, is_active: true, unit: row.unit, quantity: { $gte: row.quantity }, [key]: { $exists: false } }, { $inc: { quantity: -row.quantity }, $set: { [key]: { quantity: row.quantity, released: false } } });
    if (!changed) throw fail("วัตถุดิบไม่พอหรือถูกเปลี่ยน กรุณาตรวจสอบเมนูใหม่");
  }
}
async function release(order) {
  const key = `reservations.${order._id}`;
  for (const row of order.stock_requirements || []) {
    // Tombstones also fence a checkout that resumes after recovery started.
    await Ingredient.updateOne({ _id: row.ingredient_id, [key]: { $exists: false } }, { $set: { [key]: { quantity: row.quantity, released: true } } });
    await Ingredient.updateOne({ _id: row.ingredient_id, [`${key}.released`]: false }, { $inc: { quantity: row.quantity }, $set: { [`${key}.released`]: true } });
  }
}
async function validateRecipe(fields, storeId) {
  if (!fields.ingredients) return;
  for (const row of fields.ingredients) {
    if (!await Ingredient.exists({ _id: row.ingredient_id, store_id: storeId, is_active: true, unit: row.unit })) throw Object.assign(new Error("วัตถุดิบหรือหน่วยไม่ตรงกับสต็อกของร้าน"), { status: 400, code: "INVALID_RECIPE" });
  }
}
module.exports = { requirements, reserve, release, validateRecipe };
