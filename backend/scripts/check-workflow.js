const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const base = process.env.API_BASE || "http://localhost:5000/api/v1";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname)) throw new Error("Run this verification only against a local backend");
const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const emails = [`check-customer-${suffix}@mealq.local`, `check-merchant-${suffix}@mealq.local`];
const users = [];
const stores = [];
let passes = 0;
const pass = (name) => { passes++; console.log(`[PASS] ${name}`); };

function client() {
  let cookie = "";
  return {
    get cookie() { return cookie; },
    async request(method, route, body, expected = 200, headers = {}) {
      const response = await fetch(`${base}${route}`, { method, headers: { Origin: "http://localhost:5174", ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      for (const value of response.headers.getSetCookie()) if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
      const payload = await response.json();
      assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(payload)}`);
      return payload;
    },
  };
}

async function cleanup() {
  if (!users.length && !stores.length) return;
  await mongoose.connect(process.env.MONGO_URI);
  const User = require("../src/models/User");
  const Store = require("../src/models/Store");
  const Menu = require("../src/models/Menu");
  const Order = require("../src/models/Order");
  const Queue = require("../src/models/Queue");
  const Wallet = require("../src/models/Wallet");
  const WalletTransaction = require("../src/models/WalletTransaction");
  const CustomerProfile = require("../src/models/CustomerProfile");
  const Promotion = require("../src/models/Promotion");
  const AdminActivity = require("../src/models/AdminActivity");
  const orderIds = (await Order.find({ customer_id: { $in: users } }).select("_id")).map((item) => item._id);
  const promotionIds = (await Promotion.find({ store_id: { $in: stores } }).select("_id")).map((item) => item._id);
  const targetIds = [...users, ...stores, ...orderIds, ...promotionIds].map(String);
  await Promise.all([
    Queue.deleteMany({ order_id: { $in: orderIds } }),
    WalletTransaction.deleteMany({ user_id: { $in: users } }),
    Wallet.deleteMany({ user_id: { $in: users } }),
    CustomerProfile.deleteMany({ user_id: { $in: users } }),
    Order.deleteMany({ _id: { $in: orderIds } }),
    Menu.deleteMany({ store_id: { $in: stores } }),
    Promotion.deleteMany({ _id: { $in: promotionIds } }),
    AdminActivity.deleteMany({ target_id: { $in: targetIds } }),
  ]);
  await Store.deleteMany({ _id: { $in: stores } });
  await User.deleteMany({ _id: { $in: users }, email: { $in: emails } });
  await mongoose.disconnect();
}

async function run() {
  const guest = client(); const customer = client(); const merchant = client(); const admin = client();
  const health = await guest.request("GET", "/health");
  assert.equal(health.database, "connected");
  const preflight = await fetch(`${base}/auth/login`, { method: "OPTIONS", headers: { Origin: "http://localhost:5174", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "http://localhost:5174");
  pass("API and cookie preflight work when Vite uses port 5174");
  await guest.request("GET", "/admin/state", undefined, 401);
  await guest.request("POST", "/auth/register", { name: "Invalid", email: `invalid-${suffix}@mealq.local`, password: "Check123!", role: "ADMIN" }, 400);
  pass("Public endpoints cannot create or access administrator accounts");
  const c = await customer.request("POST", "/auth/register", { name: "Workflow Customer", email: emails[0], password: "Check123!", role: "CUSTOMER" }, 201);
  users.push(c.user.id);
  const m = await merchant.request("POST", "/auth/register", { name: "Workflow Merchant", email: emails[1], password: "Check123!", role: "MERCHANT" }, 201);
  users.push(m.user.id); stores.push(m.store.id);
  assert.equal(m.user.role, "MERCHANT");
  await customer.request("GET", "/merchant/store", undefined, 403);
  await merchant.request("GET", "/admin/state", undefined, 403);
  pass("Registration creates real sessions and enforces each account role");

  await customer.request("PATCH", "/customer/profile", { name: "Saved Customer", phone: "0812345678" });
  assert.equal((await customer.request("GET", "/auth/me")).user.name, "Saved Customer");
  await merchant.request("PATCH", "/merchant/store", { name: `Workflow Store ${suffix}`, address: { detail: "Test pickup point" }, maxQueue: 2, isOpen: true });
  let menu = (await merchant.request("POST", "/merchant/menu", { name: "Workflow dish", category: "single", price: 60, cookTime: 5, isAvailable: true }, 201)).menu;
  menu = (await merchant.request("PATCH", `/merchant/menu/${menu.id}`, { price: 75 })).menu;
  const catalogue = await guest.request("GET", `/restaurants/${m.store.id}/menu`);
  assert.equal(catalogue.restaurant.address.detail, "Test pickup point");
  assert.equal(catalogue.menus.find((item) => item.id === menu.id).price, 75);
  await customer.request("PUT", "/customer/favorites", { restaurants: [m.store.id], menus: [menu.id] });
  assert.equal((await customer.request("GET", "/customer/favorites")).favorites.menus[0], menu.id);
  pass("Profile, merchant edits, public catalogue and favorites persist through the API");

  const orderBody = { items: [{ menuId: menu.id, quantity: 2, selections: {}, price: 1 }], paymentMethod: "wallet" };
  const insufficient = await customer.request("POST", "/orders", orderBody, 409);
  assert.equal(insufficient.error.code, "INSUFFICIENT_BALANCE");
  const topupKey = crypto.randomUUID();
  await customer.request("POST", "/customer/wallet/topup", { amount: 1000 }, 201, { "Idempotency-Key": topupKey });
  await customer.request("POST", "/customer/wallet/topup", { amount: 1000 }, 201, { "Idempotency-Key": topupKey });
  assert.equal((await customer.request("GET", "/customer/wallet")).wallet.balance, 1000);
  pass("Wallet rejects insufficient funds and credits a repeated topup only once");

  let order = (await customer.request("POST", "/orders", orderBody, 201)).order;
  assert.equal(order.subtotal, 150); assert.equal(order.totalPrice, 154); assert.equal(order.paymentStatus, "paid");
  assert.equal((await customer.request("GET", "/customer/wallet")).wallet.balance, 846);
  await merchant.request("PATCH", `/merchant/orders/${order.orderNumber}/status`, { status: "ready" }, 409);
  for (const status of ["confirmed", "preparing", "ready"]) order = (await merchant.request("PATCH", `/merchant/orders/${order.orderNumber}/status`, { status })).order;
  await merchant.request("POST", `/merchant/orders/${order.orderNumber}/receive`, { receiveCode: "0000" }, 409);
  order = (await merchant.request("POST", `/merchant/orders/${order.orderNumber}/receive`, { receiveCode: order.pickupCode })).order;
  assert.equal(order.status, "completed");
  await customer.request("POST", `/orders/${order.orderNumber}/review`, { rating: 5, text: "Workflow verified", tags: ["อร่อย"] });
  assert.equal((await guest.request("GET", `/restaurants/${m.store.id}`)).restaurant.rating.average, 5);
  pass("Server prices, kitchen statuses, pickup code and verified customer review work end to end");

  const cancelOrder = (await customer.request("POST", "/orders", { ...orderBody, items: [{ menuId: menu.id, quantity: 1 }] }, 201)).order;
  await customer.request("PATCH", `/orders/${cancelOrder.orderNumber}/cancel`, { reason: "Workflow cancellation" });
  await customer.request("PATCH", `/orders/${cancelOrder.orderNumber}/cancel`, { reason: "Workflow cancellation retry" });
  assert.equal((await customer.request("GET", "/customer/wallet")).wallet.balance, 846);
  assert.equal((await customer.request("GET", `/orders/${cancelOrder.orderNumber}`)).order.paymentStatus, "refunded");
  pass("Cancellation refunds Wallet exactly once, including a repeated request");

  await admin.request("POST", "/auth/login", { email: process.env.CHECK_ADMIN_EMAIL || "admin@mealq.local", password: process.env.CHECK_ADMIN_PASSWORD || "Admin123!", portal: "ADMIN" });
  const snapshot = await admin.request("GET", "/admin/state");
  assert.ok(snapshot.users.some((user) => String(user._id) === c.user.id));
  assert.equal(JSON.stringify(snapshot).includes("password_hash"), false);
  await admin.request("POST", "/admin/promotions", { code: `CHECK${suffix.toUpperCase()}`, title: "Workflow discount", store_id: m.store.id, discount_type: "percentage", discount_value: 10, minimum_order: 0, start_date: Date.now() - 1000, expire_date: Date.now() + 3600000, is_active: true }, 201);
  const couponOrder = (await customer.request("POST", "/orders", { ...orderBody, couponCode: `CHECK${suffix.toUpperCase()}` }, 201)).order;
  assert.equal(couponOrder.discount, 15); assert.equal(couponOrder.totalPrice, 139);
  await admin.request("POST", `/admin/orders/${couponOrder.id}/cancel`, { reason: "Workflow admin cancellation" });
  assert.equal((await customer.request("GET", "/customer/wallet")).wallet.balance, 846);
  const adjustmentKey = crypto.randomUUID();
  await admin.request("POST", `/admin/wallets/${c.user.id}/adjust`, { amount: 20, reason: "Workflow wallet adjustment", key: adjustmentKey });
  await admin.request("POST", `/admin/wallets/${c.user.id}/adjust`, { amount: 20, reason: "Workflow wallet adjustment", key: adjustmentKey });
  assert.equal((await customer.request("GET", "/customer/wallet")).wallet.balance, 866);
  pass("Admin reads real data, manages promotions, cancels with refunds and adjusts Wallet once");

  await admin.request("PATCH", `/admin/stores/${m.store.id}`, { status: "suspended", reason: "Workflow store suspension" });
  await guest.request("GET", `/restaurants/${m.store.id}`, undefined, 404);
  await customer.request("POST", "/orders", orderBody, 404);
  await admin.request("PATCH", `/admin/stores/${m.store.id}`, { status: "active" });
  await merchant.request("PATCH", "/merchant/store", { isOpen: true });
  await admin.request("PATCH", `/admin/users/${c.user.id}`, { status: "suspended", reason: "Workflow user suspension" });
  await customer.request("GET", "/auth/me", undefined, 403);
  await admin.request("PATCH", `/admin/users/${c.user.id}`, { status: "active" });
  await customer.request("GET", "/auth/me", undefined, 401);
  pass("Suspending a store blocks new sales and suspending an account revokes its old session");

  await customer.request("POST", "/auth/login", { email: emails[0], password: "Check123!", portal: "CUSTOMER" });
  const oldCookie = customer.cookie;
  await customer.request("PATCH", "/auth/password", { currentPassword: "Check123!", newPassword: "Check456!" });
  const oldSession = await fetch(`${base}/auth/me`, { headers: { Cookie: oldCookie } });
  assert.equal(oldSession.status, 401);
  const reset = await guest.request("POST", "/auth/forgot-password", { email: emails[0] });
  assert.ok(reset.devResetToken);
  await guest.request("POST", "/auth/reset-password", { token: reset.devResetToken, password: "Check789!" });
  await guest.request("POST", "/auth/reset-password", { token: reset.devResetToken, password: "Check789!" }, 400);
  await customer.request("POST", "/auth/login", { email: emails[0], password: "Check789!", portal: "CUSTOMER" });
  assert.ok((await customer.request("GET", "/orders")).orders.some((item) => item.orderNumber === order.orderNumber));
  await customer.request("POST", "/auth/logout");
  await customer.request("GET", "/auth/me", undefined, 401);
  pass("Password changes revoke old sessions, reset links work once, history persists and logout clears authentication");
  console.log(`${passes} workflow groups passed. Only disposable fixture records are removed after verification.`);
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); } catch (error) { console.error("Fixture cleanup failed:", error.message); process.exitCode = 1; await mongoose.disconnect(); }
});
