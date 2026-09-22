const mongoose = require("mongoose");
const Store = require("../models/Store");
const Menu = require("../models/Menu");
const { sendError } = require("../utils/http");

function storeView(store) {
  return {
    id: String(store._id),
    clientId: store.client_id,
    name: store.name,
    description: store.description,
    address: store.address,
    phone: store.phone,
    rating: store.rating,
    openingHours: store.opening_hours,
    coverImage: store.cover_image,
    logo: store.logo,
    isOpen: store.is_open,
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

async function listRestaurants(_req, res) {
  const stores = await Store.find({}).sort({ name: 1 });
  return res.json({ restaurants: stores.map(storeView) });
}

async function getRestaurant(req, res) {
  const store = await Store.findOne(storeLookup(req.params.id));
  if (!store) return sendError(res, 404, "RESTAURANT_NOT_FOUND", "ไม่พบร้านอาหาร");
  return res.json({ restaurant: storeView(store) });
}

async function getRestaurantMenu(req, res) {
  const store = await Store.findOne(storeLookup(req.params.id));
  if (!store) return sendError(res, 404, "RESTAURANT_NOT_FOUND", "ไม่พบร้านอาหาร");
  const menus = await Menu.find({ store_id: store._id }).sort({ category: 1, name: 1 });
  return res.json({ restaurant: storeView(store), menus: menus.map(menuView) });
}

module.exports = { listRestaurants, getRestaurant, getRestaurantMenu, storeView, menuView };
