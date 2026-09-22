const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const publicRoutes = require("./routes/publicRoutes");
const orderRoutes = require("./routes/orderRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");
const Store = require("./models/Store");
const { parseCookies, verifySessionToken, COOKIE_NAME } = require("./services/session");
const { sendError } = require("./utils/http");

dotenv.config();

const app = express();
const server = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = FRONTEND_URL.split(",").map((value) => value.trim()).filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});
app.set("io", io);

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "MealQ API is running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/merchant", merchantRoutes);
app.use("/api/v1", publicRoutes);
app.use("/api/users", userRoutes); // legacy route for DB testing

io.use(async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const payload = verifySessionToken(cookies[COOKIE_NAME]);
    if (!payload) return next();
    const user = await User.findById(payload.sub);
    if (!user) return next();
    socket.data.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
});

io.on("connection", async (socket) => {
  const user = socket.data.user;
  if (user) {
    socket.join(`user:${user._id}`);
    if (["merchant", "staff", "admin"].includes(user.role)) {
      const store = await Store.findOne({ owner_id: user._id });
      if (store) socket.join(`store:${store._id}`);
    }
  }

  socket.on("disconnect", () => {});
});

app.use((req, res) => sendError(res, 404, "NOT_FOUND", `ไม่พบ ${req.method} ${req.originalUrl}`));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) return sendError(res, 409, "DUPLICATE", "ข้อมูลนี้มีอยู่ในระบบแล้ว");
  return sendError(res, 500, "INTERNAL_ERROR", "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`MongoDB connected`);
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
