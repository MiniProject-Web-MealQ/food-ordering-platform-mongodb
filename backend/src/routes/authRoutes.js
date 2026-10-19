const express = require("express");
const controller = require("../controllers/authController");
const google = require("../controllers/googleAuthController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");

const router = express.Router();
router.post("/register", asyncHandler(controller.register));
router.post("/login", asyncHandler(controller.login));
router.post("/logout", controller.logout);
router.get("/me", requireAuth, asyncHandler(controller.me));
router.post("/forgot-password", asyncHandler(controller.forgotPassword));
router.post("/reset-password", asyncHandler(controller.resetPassword));
router.patch("/password", requireAuth, asyncHandler(controller.changePassword));
router.get("/capabilities", controller.capabilities);
router.get("/google", google.start);
router.get("/google/callback", asyncHandler(google.callback));

module.exports = router;
