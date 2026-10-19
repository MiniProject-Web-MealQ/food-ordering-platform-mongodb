const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { createCorsOptions } = require("./config/cors");
const authRoutes = require("./routes/authRoutes");
const publicRoutes = require("./routes/publicRoutes");
const orderRoutes = require("./routes/orderRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const customerRoutes = require("./routes/customerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const User = require("./models/User");
const { parseCookies, verifySessionToken, COOKIE_NAME } = require("./services/session");
const { sendError } = require("./utils/http");
const { accountStore } = require("./services/merchant-store");

dotenv.config();

const app = express();
app.disable("x-powered-by");
// Pi uses cloudflared -> nginx -> API. Count both trusted hops so OTP limits
// apply to each customer rather than sharing the connector's loopback address.
app.set("trust proxy", process.env.TRUST_PROXY_HOPS === "2" ? 2 : 1);
const server = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const corsOptions = createCorsOptions(FRONTEND_URL);

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

const io = new Server(server, {
  cors: corsOptions,
});
app.set("io", io);

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "MealQ API is running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/v1/media/:kind/:id/:field", require("./utils/http").asyncHandler(require("./services/media").serve));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/customer", customerRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/merchant", merchantRoutes);
app.use("/api/v1", publicRoutes);

io.use(async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const payload = verifySessionToken(cookies[COOKIE_NAME]);
    if (!payload) return cookies[COOKIE_NAME] ? next(new Error("AUTH_REQUIRED")) : next();
    const user = await User.findById(payload.sub);
    if (!user || user.status === "suspended" || (payload.ver ?? 0) !== (user.session_version ?? 0)) return next(new Error("AUTH_REQUIRED"));
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
      const store = await accountStore(user);
      if (store) socket.join(`store:${store._id}`);
    }
  }

  socket.on("disconnect", () => {});
});

const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/") && req.accepts("html")) return res.sendFile(path.join(frontendDist, "index.html"));
    return next();
  });
}

app.use((req, res) => sendError(res, 404, "NOT_FOUND", `ไม่พบ ${req.method} ${req.originalUrl}`));

app.use((error, _req, res, _next) => {
  // Parser/provider errors may contain request bodies or SMTP details.
  console.error("Request failed", { name: error.name, code: error.code || error.type || "INTERNAL_ERROR" });
  if (error.status === 403) return sendError(res, 403, error.code || "FORBIDDEN", "เว็บไซต์นี้ไม่มีสิทธิ์เชื่อมต่อ API");
  if (error.type === "entity.parse.failed") return sendError(res, 400, "INVALID_JSON", "รูปแบบข้อมูล JSON ไม่ถูกต้อง");
  if (error.type === "entity.too.large") return sendError(res, 413, "PAYLOAD_TOO_LARGE", "ขนาดข้อมูลเกินกำหนด");
  if (error.code && [400, 409, 410, 429, 503].includes(error.status)) return sendError(res, error.status, error.code, error.message, error.details);
  if (["ValidationError", "CastError"].includes(error.name)) return sendError(res, 400, "VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง");
  if (error?.code === 11000) return sendError(res, 409, "DUPLICATE", "ข้อมูลนี้มีอยู่ในระบบแล้ว");
  return sendError(res, 500, "INTERNAL_ERROR", "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์");
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    await require("./models/Order").init();
    await require("./models/CustomerCoupon").init();
    await Promise.all([require("./models/EmailChange").init(), require("./models/Ingredient").init(), require("./models/PushSubscription").init()]);
    await Promise.all([require("./models/PendingRegistration").init(), require("./models/AuthRateLimit").init()]);
    await require("./services/checkout-recovery").recoverCheckouts();
    const recoveryTimer = setInterval(() => require("./services/checkout-recovery").recoverCheckouts().catch((error) => console.error("Recovery failed", error.name)), 30000);
    recoveryTimer.unref();
    await require("./models/Notification").init();
    await Promise.all([require("./models/EmailOutbox").init(), require("./models/EmailNotificationState").init()]);
    await require("./services/order-email").ensureEmailWatermark();
    await require("./services/notifications").pushConfig();
    const notificationTimer = setInterval(() => require("./services/notifications").deliverPending().catch((error) => console.error("Push failed", error.name)), 10000);
    notificationTimer.unref();
    let emailDeliveryRunning = false;
    const emailTimer = setInterval(async () => {
      if (emailDeliveryRunning) return;
      emailDeliveryRunning = true;
      try { await require("./services/order-email").deliverOrderEmails(); }
      catch (error) { console.error("Order email worker failed", error.name); }
      finally { emailDeliveryRunning = false; }
    }, 10000);
    emailTimer.unref();
    server.listen(PORT, () => {
      console.log(`MongoDB connected`);
      console.log(`Server running on http://localhost:${server.address().port}`);
      process.send?.({ type: "ready", port: server.address().port });
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

function shutdown() {
  io.close();
  server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
