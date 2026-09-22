const express = require("express");
const controller = require("../controllers/publicController");
const { asyncHandler } = require("../utils/http");

const router = express.Router();
router.get("/restaurants", asyncHandler(controller.listRestaurants));
router.get("/restaurants/:id", asyncHandler(controller.getRestaurant));
router.get("/restaurants/:id/menu", asyncHandler(controller.getRestaurantMenu));
module.exports = router;
