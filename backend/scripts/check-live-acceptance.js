/*
 * Production acceptance checks. This deliberately retains clearly labelled fixtures.
 * Run only after a fresh MongoDB backup; no real account/store is edited or deleted.
 * Execute in the deployed API container so its existing runtime credentials stay there.
 */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const Order = require("../src/models/Order");
const Ingredient = require("../src/models/Ingredient");
const { hashPassword } = require("../src/services/password");
const { cancelOrder } = require("../src/services/order-lifecycle");

const stamp = new Date().toISOString().replace(/[-:.]/g, "");
const suffix = `${stamp.slice(0, 15).toLowerCase()}-${crypto.randomBytes(3).toString("hex")}`;
const label = `DEMO Acceptance ${suffix}`;
const base = process.env.MEALQ_ACCEPTANCE_BASE || "http://127.0.0.1:5000/api/v1";
const origin = "https://mealq.site";
const password = `Demo-${crypto.randomBytes(32).toString("base64url")}9`;
const users = []; const results = []; let storeId; let ingredientId; let dishId;
const report = { timestamp: new Date().toISOString(), label, origin, backup: process.env.MEALQ_ACCEPTANCE_BACKUP, checks: results };
const pass = (name) => { results.push(name); console.log(`[PASS] ${name}`); };
const digest = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function client() {
  let cookie = "";
  return async function request(method, route, body, expected = 200, key) {
    const response = await fetch(base + route, {
      method, headers: { Origin: origin, "X-Forwarded-Proto": "https", ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(key ? { "Idempotency-Key": key } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
    });
    for (const value of response.headers.getSetCookie()) if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
    return data;
  };
}
const guest = client(); const admin = client(); const merchant = client(); const customer = client();

async function untouchedStores() {
  return Store.find(storeId ? { _id: { $ne: storeId } } : {}).select("name owner_id status is_open opening_hours queue").sort({ _id: 1 }).lean();
}
async function createFixture(role) {
  const user = await User.create({ name: `${label} ${role}`, email: `acceptance-${role}-${suffix}@mealq.invalid`, role, password_hash: await hashPassword(password), email_verified_at: new Date(), status_note: "Automated acceptance fixture; no outbound email" });
  users.push(user);
  return user;
}
const bangkokMinute = () => (new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 420) % 1440;
const time = (minute) => { const n = ((minute % 1440) + 1440) % 1440; return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };

async function run() {
  assert.equal(process.env.MEALQ_LIVE_ACCEPTANCE, "confirm-fixture-writes", "Explicit live fixture-write flag is required");
  assert.match(report.backup || "", /^\/home\/linapspi4\/mealq-app\/shared\/backups\/mealq-before-live-acceptance-\d{8}T\d{6}Z\.archive\.gz$/, "Fresh host backup path is required");
  assert.equal(process.env.NODE_ENV, "production");
  assert.ok(process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  assert.equal(mongoose.connection.name, "mealq", "This script targets only the designated MealQ production database");
  assert.equal((await guest("GET", "/health")).database, "connected");
  const capabilities = await guest("GET", "/auth/capabilities");
  report.capabilities = capabilities;
  const existingStores = digest(await untouchedStores());
  await guest("GET", "/admin/state", undefined, 401);
  pass("Live API health and unauthenticated administrator access protection");

  const a = await createFixture("admin"); const m = await createFixture("merchant"); const c = await createFixture("customer");
  await admin("POST", "/auth/login", { email: a.email, password, portal: "admin" });
  const loggedMerchant = await merchant("POST", "/auth/login", { email: m.email, password, portal: "merchant" });
  await customer("POST", "/auth/login", { email: c.email, password, portal: "customer" });
  storeId = loggedMerchant.store.id;
  await merchant("GET", "/admin/state", undefined, 403);
  await customer("GET", "/merchant/store", undefined, 403);
  assert.equal((await merchant("GET", "/merchant/store")).store.status, "pending");
  await merchant("PATCH", "/merchant/store", { isOpen: true }, 409);
  await guest("GET", `/restaurants/${storeId}`, undefined, 404);
  pass("Dedicated customer, merchant and admin sessions enforce role gates; a new merchant remains pending and cannot sell");

  await admin("PATCH", `/admin/stores/${storeId}`, { status: "active" });
  await merchant("PATCH", "/merchant/store", { name: `${label} — ร้านทดสอบ Demo`, description: "DEMO ONLY — retained acceptance fixture; no real food, payments or delivery. ร้านตัวอย่างสำหรับทดสอบระบบ", address: { detail: "DEMO pickup point — not a real shop" }, maxQueue: 5, isOpen: true });
  const ingredient = (await merchant("POST", "/merchant/inventory", { name: "DEMO egg / ไข่ตัวอย่าง", unit: "piece", quantity: 30, lowStockThreshold: 5 }, 201)).ingredient;
  ingredientId = ingredient.id;
  const menu = (await merchant("POST", "/merchant/menu", { name: "DEMO Japanese egg bowl / ข้าวไข่ตัวอย่าง", category: "single", cuisine: "japanese", price: 40, cookTime: 5, isAvailable: true, ingredients: [{ ingredientId, quantity: 2, unit: "piece" }] }, 201)).menu;
  dishId = menu.id;
  const catalogue = await guest("GET", `/restaurants/${storeId}/menu`);
  assert.equal(catalogue.restaurant.status, "active");
  assert.equal(catalogue.menus.find((item) => item.id === dishId).cuisine, "japanese");
  await merchant("PATCH", `/merchant/menu/${dishId}`, { ingredients: [{ ingredientId, quantity: 2, unit: "kg" }] }, 400);
  pass("Admin approval publishes the DEMO shop; stock, recipe quantity/unit and Japanese cuisine persist through production APIs");

  let minute = bangkokMinute();
  await merchant("PATCH", "/merchant/store", { openingHours: { automatic: true, open: time(minute + 60), close: time(minute + 120) } });
  assert.equal((await guest("GET", `/restaurants/${storeId}`)).restaurant.isOpen, false);
  const orderBody = { items: [{ menuId: dishId, quantity: 2, selections: {} }], paymentMethod: "wallet" };
  const closed = await customer("POST", "/orders", orderBody, 409, `hours-${suffix}`);
  assert.equal(closed.error.code, "STORE_CLOSED");
  minute = bangkokMinute();
  await merchant("PATCH", "/merchant/store", { openingHours: { automatic: true, open: time(minute - 60), close: time(minute + 60) } });
  assert.equal((await guest("GET", `/restaurants/${storeId}`)).restaurant.isOpen, true);
  pass("Automatic Bangkok store hours agree with the catalogue and reject checkout while closed");

  const topupKey = `topup-${suffix}`;
  await customer("POST", "/customer/wallet/topup", { amount: 1000 }, 201, topupKey);
  await customer("POST", "/customer/wallet/topup", { amount: 1000 }, 201, topupKey);
  assert.equal((await customer("GET", "/customer/wallet")).wallet.balance, 1000);
  const checkoutKey = `checkout-${suffix}`;
  const sale = (await customer("POST", "/orders", orderBody, 201, checkoutKey)).order;
  assert.equal(sale.paymentMethod, "wallet"); assert.equal(sale.paymentStatus, "paid");
  assert.equal(sale.paymentMode, "sandbox", "Wallet must remain demo money");
  const repeated = (await customer("POST", "/orders", orderBody, 201, checkoutKey)).order;
  assert.equal(repeated.id, sale.id);
  const balanceAfterSale = 1000 - sale.totalPrice;
  assert.equal((await customer("GET", "/customer/wallet")).wallet.balance, balanceAfterSale);
  assert.equal((await Ingredient.findById(ingredientId)).quantity, 26);
  pass("DEMO Wallet self topup, server-calculated checkout, stock debit and duplicate-request protection");

  await merchant("PATCH", `/merchant/orders/${sale.id}/status`, { status: "ready" }, 409);
  let ready;
  for (const status of ["confirmed", "preparing", "ready"]) ready = (await merchant("PATCH", `/merchant/orders/${sale.id}/status`, { status })).order;
  const wrongCode = String((Number(ready.pickupCode) + 1) % 10000).padStart(4, "0");
  await merchant("POST", `/merchant/orders/${sale.id}/receive`, { receiveCode: wrongCode }, 409);
  const received = (await merchant("POST", `/merchant/orders/${sale.id}/receive`, { receiveCode: ready.pickupCode })).order;
  assert.equal(received.status, "completed");
  assert.equal((await customer("GET", `/orders/${sale.id}`)).order.status, "completed");
  assert.equal((await merchant("GET", "/merchant/dashboard")).summary.revenue, sale.totalPrice);
  pass("Kitchen status sequence, wrong-code rejection, confirmed pickup and paid merchant sales report");

  const cancelled = (await customer("POST", "/orders", { ...orderBody, items: [{ menuId: dishId, quantity: 1 }] }, 201, `cancel-${suffix}`)).order;
  assert.equal((await Ingredient.findById(ingredientId)).quantity, 24);
  await customer("PATCH", `/orders/${cancelled.id}/cancel`, { reason: "DEMO acceptance cancellation" });
  await customer("PATCH", `/orders/${cancelled.id}/cancel`, { reason: "DEMO acceptance cancellation retry" });
  assert.equal((await customer("GET", `/orders/${cancelled.id}`)).order.paymentStatus, "refunded");
  assert.equal((await customer("GET", "/customer/wallet")).wallet.balance, balanceAfterSale);
  assert.equal((await Ingredient.findById(ingredientId)).quantity, 26);
  assert.equal((await merchant("GET", "/merchant/dashboard")).summary.revenue, sale.totalPrice);
  pass("Cancellation refunds DEMO Wallet and restores stock exactly once; cancelled sales are excluded");

  await merchant("PATCH", `/merchant/inventory/${ingredientId}`, { adjustment: -25 });
  assert.equal((await guest("GET", `/restaurants/${storeId}/menu`)).menus.find((item) => item.id === dishId).isAvailable, false);
  await customer("POST", "/orders", { ...orderBody, items: [{ menuId: dishId, quantity: 1 }] }, 409, `soldout-${suffix}`);
  assert.equal((await customer("GET", "/customer/wallet")).wallet.balance, balanceAfterSale);
  assert.equal((await merchant("GET", "/merchant/inventory")).ingredients.find((item) => item.id === ingredientId).lowStock, true);
  await merchant("PATCH", `/merchant/inventory/${ingredientId}`, { adjustment: 25 });
  pass("Insufficient ingredients hide sold-out menus, show low stock and reject orders without charging");

  const simulated = (await customer("POST", "/orders", { ...orderBody, items: [{ menuId: dishId, quantity: 1 }], paymentMethod: "promptpay" }, 201, `promptpay-${suffix}`)).order;
  assert.equal(simulated.paymentStatus, "simulated"); assert.equal(simulated.paymentMode, "sandbox");
  assert.equal((await customer("GET", "/customer/wallet")).wallet.balance, balanceAfterSale);
  await merchant("PATCH", `/merchant/orders/${simulated.id}/status`, { status: "cancelled" });
  assert.equal((await Ingredient.findById(ingredientId)).quantity, 26);
  assert.equal((await merchant("GET", "/merchant/dashboard")).summary.revenue, sale.totalPrice);
  pass("PromptPay remains simulated; merchant cancellation restores stock without affecting Wallet");

  const deadline = Date.now() + 5000; let notices;
  do { notices = (await customer("GET", "/customer/notifications")).notifications; if (notices.some((item) => item.kind === "ready")) break; await new Promise((resolve) => setTimeout(resolve, 100)); } while (Date.now() < deadline);
  assert.ok(notices.some((item) => item.kind === "ready"), "A ready notification must be persisted");
  assert.equal(digest(await untouchedStores()), existingStores);
  pass("Ready notifications are retained and existing non-fixture stores remain unchanged");
  report.storeId = storeId; report.menuId = dishId; report.ingredientId = ingredientId;
  report.orders = { completed: sale.id, customerCancelled: cancelled.id, merchantCancelledPromptPay: simulated.id };
  report.walletBalance = balanceAfterSale; report.stockQuantity = 26;
}

async function safeguardFixtures() {
  if (mongoose.connection.readyState !== 1) return;
  if (storeId) {
    // Compensate only this run's unfinished fixtures, never other stores' orders.
    const unfinished = await Order.find({ store_id: storeId, status: { $in: ["pending", "confirmed", "preparing"] }, checkout_completed: { $ne: false } });
    for (const order of unfinished) await cancelOrder({ _id: order._id, store_id: storeId }, { allowedStatuses: ["pending", "confirmed", "preparing"], reason: "DEMO acceptance safety close", by: "system" });
    await Store.updateOne({ _id: storeId, owner_id: users.find((user) => user.role === "merchant")?._id }, { $set: { is_open: false, opening_hours: { automatic: true, open_time: "09:00", close_time: "21:00" }, status_note: "DEMO acceptance fixture; manually closed after verification" } });
  }
  for (const user of users) await User.updateOne({ _id: user._id, email: user.email }, { $inc: { session_version: 1 }, $set: { ...(user.role === "merchant" ? {} : { status: "suspended" }), status_note: "Retained DEMO acceptance fixture; all acceptance sessions revoked" } });
  report.retained = { storeId, storeManuallyClosed: Boolean(storeId), schedule: "09:00–21:00 Asia/Bangkok", accounts: users.map((user) => ({ id: String(user._id), role: user.role, disabled: user.role !== "merchant", sessionsRevoked: true })) };
}

(async () => {
  try { await run(); report.passed = results.length; report.ok = true; }
  catch (error) { report.ok = false; report.failed = error.message; process.exitCode = 1; }
  finally {
    try { await safeguardFixtures(); } catch (error) { report.safeguardError = error.message; report.ok = false; process.exitCode = 1; }
    await mongoose.disconnect();
    // Passwords, session cookies and tokens are deliberately absent from this report.
    console.log("MEALQ_ACCEPTANCE_REPORT=" + JSON.stringify(report));
  }
})();
