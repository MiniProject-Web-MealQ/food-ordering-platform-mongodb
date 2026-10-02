const express = require("express");
const controller = require("../controllers/orderController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");

const router = express.Router();
router.use(requireAuth, requireRole("customer"));
router.post("/", asyncHandler(controller.createOrder));
router.get("/", asyncHandler(controller.listMyOrders));
router.patch("/:id/cancel", asyncHandler(controller.cancelMyOrder));
router.post("/:id/review", asyncHandler(controller.reviewMyOrder));
router.get("/:id", asyncHandler(controller.getMyOrder));
module.exports = router;
