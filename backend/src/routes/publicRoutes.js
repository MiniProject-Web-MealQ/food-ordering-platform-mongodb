const express = require("express");
const controller = require("../controllers/publicController");
const { asyncHandler } = require("../utils/http");

const router = express.Router();
router.get("/config", asyncHandler(controller.config));
router.get("/restaurants", asyncHandler(controller.listRestaurants));
router.get("/restaurants/:id", asyncHandler(controller.getRestaurant));
router.get("/restaurants/:id/menu", asyncHandler(controller.getRestaurantMenu));
router.get("/restaurants/:id/reviews", asyncHandler(controller.getRestaurantReviews));
router.get("/menus", asyncHandler(controller.listMenus));
router.get("/promotions", asyncHandler(controller.listPromotions));
module.exports = router;
