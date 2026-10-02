const express = require("express");
const controller = require("../controllers/customerController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");

const router = express.Router();
router.use(requireAuth, requireRole("customer"));
router.get("/profile", asyncHandler(controller.getProfile));
router.patch("/profile", asyncHandler(controller.updateProfile));
router.get("/favorites", asyncHandler(controller.getFavorites));
router.put("/favorites", asyncHandler(controller.updateFavorites));
router.patch("/settings", asyncHandler(controller.updateSettings));
router.get("/wallet", asyncHandler(controller.getWallet));
router.post("/wallet/topup", asyncHandler(controller.topupWallet));
module.exports = router;
