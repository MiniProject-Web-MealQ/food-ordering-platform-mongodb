const mongoose = require("mongoose");
const Store = require("../models/Store");
const Menu = require("../models/Menu");
const Order = require("../models/Order");
const Queue = require("../models/Queue");
const Promotion = require("../models/Promotion");
const { sendError } = require("../utils/http");

function storeView(store, activeQueue = 0) {
  return {
    id: String(store._id),
    clientId: store.client_id,
    name: store.name,
    description: store.description,
    address: store.address,
    phone: store.phone,
    rating: store.rating,
    openingHours: store.opening_hours,
    queue: { maxQueue: Number(store.queue?.max_queue ?? 50), activeCount: activeQueue },
    coverImage: store.cover_image,
    logo: store.logo,
    isOpen: store.is_open,
    status: store.status || "active",
  };
}

function menuView(menu) {
  return {
    id: String(menu._id),
    clientId: menu.client_id,
    storeId: String(menu.store_id),
    name: menu.name,
    description: menu.description,
    category: menu.category,
    price: menu.price,
    image: menu.image,
    optionGroups: menu.option_groups,
    soldQuantity: menu.sold_quantity,
    cookTime: menu.cook_time,
    isAvailable: menu.is_available,
  };
}

function storeLookup(id) {
  return mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { client_id: id }] } : { client_id: id };
}

const ACTIVE_STORE = { $or: [{ status: "active" }, { status: { $exists: false } }] };

async function listRestaurants(_req, res) {
  const stores = await Store.find(ACTIVE_STORE).sort({ name: 1 });
  const queues = await Queue.aggregate([
    { $match: { store_id: { $in: stores.map((store) => store._id) }, status: { $in: ["waiting", "preparing", "ready"] } } },
    { $group: { _id: "$store_id", count: { $sum: 1 } } },
  ]);
  const counts = new Map(queues.map((queue) => [String(queue._id), queue.count]));
  return res.json({ restaurants: stores.map((store) => storeView(store, counts.get(String(store._id)) || 0)) });
}

async function getRestaurant(req, res) {
  const store = await Store.findOne({ $and: [storeLookup(req.params.id), ACTIVE_STORE] });
  if (!store) return sendError(res, 404, "RESTAURANT_NOT_FOUND", "ไม่พบร้านอาหาร");
  const active = await Queue.countDocuments({ store_id: store._id, status: { $in: ["waiting", "preparing", "ready"] } });
  return res.json({ restaurant: storeView(store, active) });
}

async function getRestaurantMenu(req, res) {
  const store = await Store.findOne({ $and: [storeLookup(req.params.id), ACTIVE_STORE] });
  if (!store) return sendError(res, 404, "RESTAURANT_NOT_FOUND", "ไม่พบร้านอาหาร");
  const menus = await Menu.find({ store_id: store._id }).sort({ category: 1, name: 1 });
  const active = await Queue.countDocuments({ store_id: store._id, status: { $in: ["waiting", "preparing", "ready"] } });
  return res.json({ restaurant: storeView(store, active), menus: menus.map(menuView) });
}

async function listMenus(_req, res) {
  const stores = await Store.find(ACTIVE_STORE).select("_id");
  const menus = await Menu.find({ store_id: { $in: stores.map((store) => store._id) } }).sort({ name: 1 });
  return res.json({ menus: menus.map(menuView) });
}

async function getRestaurantReviews(req, res) {
  const store = await Store.findOne({ $and: [storeLookup(req.params.id), ACTIVE_STORE] });
  if (!store) return sendError(res, 404, "RESTAURANT_NOT_FOUND", "ไม่พบร้านอาหาร");
  const orders = await Order.find({ store_id: store._id, status: "completed", "review.rating": { $gte: 1 } })
    .sort({ "review.updated_at": -1 }).limit(100).populate("customer_id", "name");
  return res.json({ reviews: orders.map((order) => ({
    id: String(order._id), author: order.customer_id?.name || "ลูกค้า", rating: order.review.rating,
    text: order.review.text || "", tags: order.review.tags || [], createdAt: order.review.updated_at,
    daysAgo: Math.max(0, Math.floor((Date.now() - new Date(order.review.updated_at).getTime()) / 86_400_000)),
  })) });
}

async function listPromotions(req, res) {
  const stores = await Store.find(ACTIVE_STORE).select("_id");
  const now = new Date();
  const promotions = await Promotion.find({ is_active: true, start_date: { $lte: now }, expire_date: { $gt: now }, $or: [{ store_id: null }, { store_id: { $in: stores.map((store) => store._id) } }] });
  return res.json({ promotions: promotions.map((promotion) => ({
    id: String(promotion._id), storeId: promotion.store_id ? String(promotion.store_id) : null,
    code: promotion.code, title: promotion.title, description: promotion.description,
    discountType: promotion.discount_type, discountValue: promotion.discount_value,
    minimumOrder: promotion.minimum_order, maxDiscount: promotion.max_discount, expiresAt: promotion.expire_date,
  })) });
}

module.exports = { listRestaurants, getRestaurant, getRestaurantMenu, listMenus, getRestaurantReviews, listPromotions, storeView, menuView };
