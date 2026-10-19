const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { fork } = require("node:child_process");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { hashPassword } = require("../src/services/password");
const User = require("../src/models/User");
const Order = require("../src/models/Order");
const WalletTransaction = require("../src/models/WalletTransaction");
const AdminActivity = require("../src/models/AdminActivity");
const { startTestSmtp } = require("./fixtures/smtp-inbox");

const uri = new URL(process.env.MONGO_URI || "mongodb://127.0.0.1:27018/mealq");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(uri.hostname), "Regression fixtures require local MongoDB");
const database = `mealq_regression_${crypto.randomBytes(8).toString("hex")}`;
uri.pathname = `/${database}`;
let server;
let base;
let passes = 0;
let mail;
const pass = (name) => { passes++; console.log(`[PASS] ${name}`); };
function client() {
  let cookie = "";
  return async function request(method, route, body, expected = 200, headers = {}) {
    const response = await fetch(`${base}${route}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), "content-type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const value of response.headers.getSetCookie()) if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
    const payload = await response.json();
    const registration = method === "POST" && route === "/auth/register" && expected === 201;
    if (expected !== null) assert.equal(response.status, registration ? 202 : expected, `${method} ${route}: ${JSON.stringify(payload)}`);
    if (registration) return request("POST", "/auth/register/verify", { registrationId: payload.registrationId, code: mail.codeFor(body.email) }, 201);
    return { ...payload, httpStatus: response.status };
  };
}
async function start(mode, paymentMode = "demo", delayedCheckout = false) {
  server = fork(path.resolve(__dirname, delayedCheckout ? "fixtures/delayed-checkout-server.js" : "../src/server.js"), [], { cwd: path.resolve(__dirname, ".."), env: { ...process.env, ...mail.env, PORT: "0", MONGO_URI: uri.href, NODE_ENV: mode, PAYMENT_MODE: paymentMode, SESSION_SECRET: crypto.randomUUID(), GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  server.stderr.on("data", (data) => process.stderr.write(data));
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Backend readiness timed out")), 15000);
    server.once("error", (error) => { clearTimeout(timeout); reject(error); });
    server.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Backend exited: ${code}`)); });
    server.on("message", (message) => { if (message.type === "ready") { clearTimeout(timeout); base = `http://127.0.0.1:${message.port}/api/v1`; resolve(); } });
  });
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const child = server;
  await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); });
  server = null;
}

async function run() {
  await mongoose.connect(uri.href);
  mail = await startTestSmtp();
  await User.create({ name: "Regression Admin", email: "regression-admin@mealq.local", role: "admin", password_hash: await hashPassword("Regression123!") });
  await start("development");
  const customer = client(), merchant = client(), admin = client(), staff = client();
  await admin("POST", "/auth/login", { email: "regression-admin@mealq.local", password: "Regression123!", portal: "ADMIN" });
  const c = await customer("POST", "/auth/register", { name: "Customer", email: "regression-customer@mealq.local", password: "Regression123!", role: "CUSTOMER" }, 201);
  const m = await merchant("POST", "/auth/register", { name: "Merchant", email: "regression-merchant@mealq.local", password: "Regression123!", role: "MERCHANT" }, 201);
  const s = await staff("POST", "/auth/register", { name: "Staff", email: "regression-staff@mealq.local", password: "Regression123!", role: "CUSTOMER" }, 201);
  const group = { id: "extras", label: "Extras", multiple: true, required: false, options: [{ id: "egg", label: "Original egg", price: 10 }] };
  const { menu } = await merchant("POST", "/merchant/menu", { name: "Meal", price: 65, cookTime: 8, optionGroups: [group] }, 201);
  const pendingStore = (await merchant("GET", "/merchant/store")).store;
  assert.equal(pendingStore.status, "pending");
  assert.equal(pendingStore.isOpen, false);
  await merchant("PATCH", "/merchant/store", { isOpen: true }, 409);
  await merchant("PATCH", "/merchant/store", { status: "active", is_open: true });
  assert.equal((await merchant("GET", "/merchant/store")).store.status, "pending");
  await customer("GET", `/restaurants/${m.store.id}`, undefined, 404);
  await customer("POST", "/orders", { items: [{ menuId: menu.id, quantity: 1 }], paymentMethod: "promptpay" }, 404);
  await merchant("PATCH", `/admin/stores/${m.store.id}`, { status: "active" }, 403);
  await admin("PATCH", `/admin/stores/${m.store.id}`, { status: "active" });
  assert.equal((await merchant("GET", "/merchant/store")).store.isOpen, false);
  await merchant("PATCH", "/merchant/store", { isOpen: true });
  pass("New merchants can prepare menus but only an admin can approve them before sales");
  assert.equal(menu.optionGroups[0].options[0].label, "Original egg");
  await merchant("PATCH", `/merchant/menu/${menu.id}`, { isAvailable: "false" }, 400);
  const image = "data:image/png;base64,aGVsbG8=";
  await merchant("PATCH", "/merchant/store", { logo: image, coverImage: image, coordinates: { latitude: 13.75, longitude: 100.5 } });
  const saved = await merchant("GET", "/merchant/store");
  assert.match(saved.store.logo, /^\/api\/v1\/media\/store\//); assert.match(saved.store.coverImage, /^\/api\/v1\/media\/store\//);
  const photo = await fetch(new URL(saved.store.logo, base)); assert.equal(await photo.text(), "hello");
  const publicMenu = await customer("GET", `/restaurants/${m.store.id}/menu`);
  assert.equal(publicMenu.menus[0].optionGroups[0].options[0].label, "Original egg");
  assert.equal(publicMenu.restaurant.coordinates.latitude, 13.75);
  pass("Menu options, strict booleans, store images and coordinates persist through real routes");

  await customer("POST", "/customer/wallet/topup", { amount: 1000 }, 201, { "Idempotency-Key": crypto.randomUUID() });
  await admin("POST", "/admin/promotions", { code: "REVIEW10", title: "Ten percent", discount_type: "percentage", discount_value: 10, minimum_order: 0, store_id: m.store.id, is_active: true, start_date: new Date(Date.now() - 1000), expire_date: new Date(Date.now() + 3600000) }, 201);
  const collectedPromotion = await require("../src/models/Promotion").findOne({ code: "REVIEW10", store_id: m.store.id });
  await customer("POST", `/customer/coupons/${collectedPromotion._id}/collect`, {}, 201);
  const body = { items: [{ menuId: menu.id, quantity: 1, selections: {} }], couponCode: "REVIEW10", paymentMethod: "wallet", expectedTotal: 62.5 };
  assert.equal((await customer("POST", "/orders", { ...body, expectedTotal: 62 }, 409)).error.code, "PRICE_CHANGED");
  const key = crypto.randomUUID();
  const results = await Promise.all([customer("POST", "/orders", body, null, { "Idempotency-Key": key }), customer("POST", "/orders", body, null, { "Idempotency-Key": key })]);
  assert.ok(results.some((result) => result.httpStatus === 201));
  assert.ok(results.every((result) => [201, 409].includes(result.httpStatus)));
  const first = results.find((result) => result.httpStatus === 201).order;
  const replay = await customer("POST", "/orders", body, 201, { "Idempotency-Key": key });
  assert.equal(replay.order.id, first.id);
  assert.equal(replay.order.totalPrice, 62.5);
  assert.equal((await customer("GET", "/customer/wallet")).wallet.balance, 937.5);
  assert.equal(await Order.countDocuments({ customer_id: c.user.id, status: { $ne: "cancelled" } }), 1);
  assert.equal(await WalletTransaction.countDocuments({ user_id: c.user.id, type: "payment" }), 1);
  assert.equal((await customer("POST", "/orders", { ...body, paymentMethod: "card" }, 409, { "Idempotency-Key": key })).error.code, "IDEMPOTENCY_CONFLICT");
  pass("Concurrent/repeated checkout debits once, replays the same order and rejects changed totals/body");

  const second = (await customer("POST", "/orders", { items: [{ menuId: menu.id, quantity: 1, selections: { extras: ["egg"] } }], paymentMethod: "wallet" }, 201, { "Idempotency-Key": crypto.randomUUID() })).order;
  await merchant("PATCH", `/merchant/menu/${menu.id}`, { optionGroups: [{ ...group, options: [{ ...group.options[0], label: "Renamed egg" }] }] });
  assert.equal((await customer("GET", `/orders/${second.id}`)).order.items[0].selectedOptions[0].label, "Original egg");
  await customer("PATCH", `/orders/${second.id}/cancel`, {});
  await merchant("PATCH", `/merchant/orders/${first.id}/status`, { status: "confirmed" });
  await merchant("PATCH", `/merchant/orders/${first.id}/status`, { status: "preparing" });
  const queue = (await customer("GET", `/restaurants/${m.store.id}`)).restaurant.queue;
  assert.equal(queue.nowServing, first.queueNumber);
  assert.equal(queue.activeCount, 1);
  assert.equal(queue.nextNumber, second.queueNumber + 1);
  assert.deepEqual(queue.activeNumbers, [first.queueNumber]);
  await merchant("PATCH", `/merchant/orders/${first.id}/status`, { status: "ready" });
  await merchant("POST", `/merchant/orders/${first.id}/receive`, { receiveCode: first.pickupCode });
  assert.equal((await customer("GET", `/restaurants/${m.store.id}`)).restaurant.queue.nowServing, null);
  pass("Option history survives edits; queue status, gaps and next number reflect persisted orders");

  await admin("PATCH", `/admin/users/${s.user.id}`, { role: "staff" }, 400);
  await admin("PATCH", `/admin/users/${s.user.id}`, { role: "staff", storeId: m.store.id });
  await staff("POST", "/auth/login", { email: "regression-staff@mealq.local", password: "Regression123!", portal: "MERCHANT" });
  assert.equal((await staff("GET", "/merchant/store")).store.id, m.store.id);
  await staff("POST", "/merchant/menu", { name: "Staff dish", price: 20 }, 201);
  await admin("PATCH", `/admin/users/${m.user.id}`, { status: "suspended", reason: "Regression suspension" });
  assert.equal((await customer("GET", `/restaurants/${m.store.id}`)).restaurant.isOpen, false);
  await customer("POST", "/orders", body, 409);
  await merchant("GET", "/merchant/store", undefined, 403);
  pass("Staff accounts belong to a selected store; suspended owners stop sales and lose sessions");

  await admin("PATCH", `/admin/users/${m.user.id}`, { status: "active" });
  await merchant("POST", "/auth/login", { email: "regression-merchant@mealq.local", password: "Regression123!", portal: "MERCHANT" });
  await merchant("PATCH", "/merchant/store", { isOpen: true });
  await admin("PATCH", "/admin/settings", { service_fee: 2.5, accepting_orders: false });
  assert.equal((await customer("GET", "/config")).serviceFee, 2.5);
  assert.equal((await customer("POST", "/orders", body, 503)).error.code, "ORDERS_PAUSED");
  await admin("PATCH", "/admin/settings", { service_fee: 2.5, accepting_orders: true });
  const configured = await customer("POST", "/orders", { ...body, expectedTotal: 61 }, 201, { "Idempotency-Key": crypto.randomUUID() });
  assert.equal(configured.order.serviceFee, 2.5);
  await admin("POST", `/admin/users/${c.user.id}/reset-password`, {});
  assert.equal(await AdminActivity.countDocuments({ target_id: c.user.id, action: "user.resetPassword" }), 1);
  pass("Admin settings persist, pause sales, change service fees and audit password-reset requests");

  await stop();
  await start("production", "wallet");
  const prodCustomer = client();
  const availability = await prodCustomer("GET", "/auth/capabilities");
  assert.deepEqual(availability.paymentMethods, ["wallet"]);
  await prodCustomer("POST", "/auth/login", { email: "regression-customer@mealq.local", password: "Regression123!", portal: "CUSTOMER" });
  await prodCustomer("POST", "/orders", { ...body, paymentMethod: "card" }, 501);
  await prodCustomer("POST", "/customer/wallet/topup", { amount: 100 }, 501);
  const productionOrder = await prodCustomer("POST", "/orders", { ...body, expectedTotal: 61 }, 201, { "Idempotency-Key": crypto.randomUUID() });
  assert.equal(productionOrder.order.paymentMode, "wallet");
  assert.equal(productionOrder.order.paymentStatus, "paid");
  pass("Production accepts Wallet checkout and blocks unconfigured external payments/topups");

  await stop();
  await start("production", "demo");
  const demoCustomer = client();
  const demoCapabilities = await demoCustomer("GET", "/auth/capabilities");
  assert.deepEqual(demoCapabilities.paymentMethods, ["wallet", "promptpay"]);
  assert.equal(demoCapabilities.sandboxTopup, true);
  await demoCustomer("POST", "/auth/login", { email: "regression-customer@mealq.local", password: "Regression123!", portal: "CUSTOMER" });
  const beforeTopup = (await demoCustomer("GET", "/customer/wallet")).wallet.balance;
  const demoTopupKey = crypto.randomUUID();
  await demoCustomer("POST", "/customer/wallet/topup", { amount: 300 }, 201, { "Idempotency-Key": demoTopupKey });
  await demoCustomer("POST", "/customer/wallet/topup", { amount: 300 }, 201, { "Idempotency-Key": demoTopupKey });
  assert.equal((await demoCustomer("GET", "/customer/wallet")).wallet.balance, beforeTopup + 300);
  const demoWalletOrder = await demoCustomer("POST", "/orders", { ...body, expectedTotal: 61 }, 201, { "Idempotency-Key": crypto.randomUUID() });
  assert.equal(demoWalletOrder.order.paymentMode, "sandbox");
  assert.equal(demoWalletOrder.order.paymentStatus, "paid");
  await demoCustomer("PATCH", `/orders/${demoWalletOrder.order.id}/cancel`, {});
  assert.equal((await demoCustomer("GET", "/customer/wallet")).wallet.balance, beforeTopup + 300);
  const demoPromptPay = await demoCustomer("POST", "/orders", { ...body, paymentMethod: "promptpay", expectedTotal: 61 }, 201, { "Idempotency-Key": crypto.randomUUID() });
  assert.equal(demoPromptPay.order.paymentMode, "sandbox");
  assert.equal(demoPromptPay.order.paymentStatus, "simulated");
  assert.equal((await demoCustomer("GET", "/customer/wallet")).wallet.balance, beforeTopup + 300);
  pass("Deployed demo supports self-service retry-safe Wallet topups, payment/refund and simulated PromptPay");

  await stop();
  await start("development", "demo", true);
  const raceCustomer = client(), raceMerchant = client();
  await raceCustomer("POST", "/auth/login", { email: "regression-customer@mealq.local", password: "Regression123!", portal: "CUSTOMER" });
  await raceMerchant("POST", "/auth/login", { email: "regression-merchant@mealq.local", password: "Regression123!", portal: "MERCHANT" });
  const raceBalance = (await raceCustomer("GET", "/customer/wallet")).wallet.balance;
  const raceKey = crypto.randomUUID();
  const checkout = raceCustomer("POST", "/orders", { ...body, expectedTotal: 61 }, 201, { "Idempotency-Key": raceKey });
  let inProgress;
  const deadline = Date.now() + 5000;
  while (!inProgress && Date.now() < deadline) {
    inProgress = await Order.findOne({ checkout_key: `${c.user.id}:${raceKey}`, checkout_completed: false });
    if (!inProgress) await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(inProgress, "The delayed server must expose an unfinished checkout");
  await raceCustomer("PATCH", `/orders/${inProgress._id}/cancel`, {}, 409);
  assert.equal((await raceMerchant("PATCH", `/merchant/orders/${inProgress._id}/status`, { status: "confirmed" }, 409)).error.code, "CHECKOUT_IN_PROGRESS");
  const finished = (await checkout).order;
  assert.equal(finished.status, "pending");
  await raceCustomer("PATCH", `/orders/${finished.id}/cancel`, {});
  const cancelled = (await raceCustomer("GET", `/orders/${finished.id}`)).order;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.paymentStatus, "refunded");
  assert.equal(cancelled.queueStatus, "cancelled");
  assert.equal((await raceCustomer("GET", "/customer/wallet")).wallet.balance, raceBalance);
  pass("Cancellation and kitchen acceptance wait for checkout; later cancellation refunds Wallet and closes its queue");
}

run().then(() => console.log(`${passes} regression groups passed.`)).catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await stop();
  if (mail) await mail.close();
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, database);
    assert.ok(database.startsWith("mealq_regression_"));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log("Removed the isolated regression database.");
  }
});
