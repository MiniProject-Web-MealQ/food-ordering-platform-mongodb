const express = require("express");
const { createUser, getUsers } = require("../controllers/userController");
const { asyncHandler } = require("../utils/http");

const router = express.Router();
router.post("/", asyncHandler(createUser));
router.get("/", asyncHandler(getUsers));
module.exports = router;
