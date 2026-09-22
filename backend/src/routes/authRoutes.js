const express = require("express");
const controller = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");

const router = express.Router();
router.post("/register", asyncHandler(controller.register));
router.post("/login", asyncHandler(controller.login));
router.post("/logout", controller.logout);
router.get("/me", requireAuth, asyncHandler(controller.me));
router.post("/forgot-password", asyncHandler(controller.forgotPassword));
router.post("/reset-password", asyncHandler(controller.resetPassword));
router.get("/google", controller.googleNotConfigured);

module.exports = router;
