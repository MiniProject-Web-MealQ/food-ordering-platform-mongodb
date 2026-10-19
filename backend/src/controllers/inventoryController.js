const mongoose = require("mongoose");
const Ingredient = require("../models/Ingredient");
const { accountStore } = require("../services/merchant-store");
const fail = (message) => Object.assign(new Error(message), { status: 400, code: "INVALID_INVENTORY" });
const view = (row) => ({ id: String(row._id), name: row.name, unit: row.unit, quantity: row.quantity, lowStockThreshold: row.low_stock_threshold, lowStock: row.quantity <= row.low_stock_threshold, isActive: row.is_active });
async function storeFor(req) { const store = await accountStore(req.user); if (!store) throw Object.assign(new Error("ไม่พบร้าน"), { status: 404, code: "STORE_NOT_FOUND" }); return store; }
async function list(req, res) { const store = await storeFor(req); res.json({ ingredients: (await Ingredient.find({ store_id: store._id }).sort({ name: 1 })).map(view) }); }
async function create(req, res) {
  const store = await storeFor(req); const { name, unit, quantity = 0, lowStockThreshold = 0 } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 100 || typeof unit !== "string" || !unit.trim() || unit.length > 40 || !Number.isFinite(quantity) || quantity < 0 || quantity > 1000000 || !Number.isFinite(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1000000) throw fail("ตรวจชื่อ หน่วย จำนวน และจุดแจ้งเตือนวัตถุดิบ");
  res.status(201).json({ ingredient: view(await Ingredient.create({ store_id: store._id, name: name.trim(), unit: unit.trim(), quantity, low_stock_threshold: lowStockThreshold })) });
}
async function adjust(req, res) {
  const store = await storeFor(req); const { adjustment, lowStockThreshold } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id) || (adjustment !== undefined && (!Number.isFinite(adjustment) || Math.abs(adjustment) > 1000000)) || (lowStockThreshold !== undefined && (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1000000))) throw fail("จำนวนปรับสต็อกไม่ถูกต้อง");
  const query = { _id: req.params.id, store_id: store._id };
  if (adjustment < 0) query.quantity = { $gte: -adjustment };
  const changes = { $inc: { quantity: adjustment || 0 } };
  if (lowStockThreshold !== undefined) changes.$set = { low_stock_threshold: lowStockThreshold };
  const row = await Ingredient.findOneAndUpdate(query, changes, { returnDocument: "after", runValidators: true });
  if (!row) throw fail("ไม่พบวัตถุดิบหรือจำนวนคงเหลือไม่พอ");
  res.json({ ingredient: view(row) });
}
module.exports = { list, create, adjust };
