// Synthetic MongoDB acceptance: archives all collections/indexes before dropping
// its randomly named database. No production URI, SMTP, push or server timers.
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const replacement = require("./catalogue-replacement");
const { stores } = require("./catalogue-v2-manifest");
const User = require("../src/models/User"), Store = require("../src/models/Store"), Menu = require("../src/models/Menu");
const Ingredient = require("../src/models/Ingredient"), Promotion = require("../src/models/Promotion"), CustomerCoupon = require("../src/models/CustomerCoupon");
const Order = require("../src/models/Order"), Queue = require("../src/models/Queue"), Wallet = require("../src/models/Wallet"), WalletTransaction = require("../src/models/WalletTransaction");
const PushSubscription = require("../src/models/PushSubscription"), PendingRegistration = require("../src/models/PendingRegistration"), EmailChange = require("../src/models/EmailChange");
const SystemSettings = require("../src/models/SystemSettings"), Notification = require("../src/models/Notification"), EmailOutbox = require("../src/models/EmailOutbox");
const { hashPassword, verifyPassword } = require("../src/services/password");
const { changeBalance } = require("../src/services/wallet");
const { orderView } = require("../src/controllers/orderController");
const database = `mealq_catalogue_${crypto.randomBytes(8).toString("hex")}`;
const archiveRoot = path.resolve(process.env.CATALOGUE_TEST_ARCHIVE_ROOT || path.join(__dirname, "../.env.catalogue-test-archives"));
const directory = path.join(archiveRoot, database);
let connected = false, checks = 0;
const pass = (label) => { checks++; console.log(`[PASS] ${label}`); };
async function syntheticUser(role) { return User.create({ name: `Synthetic ${role}`, email: `${crypto.randomUUID()}@catalogue-test.invalid`, role, password_hash: await hashPassword(crypto.randomUUID()), status: "active" }); }
function syntheticAssets(assetRoot) {
  // Explicit fixture bytes only; real deployment uses generated and decoded WebP.
  const bytes = Buffer.alloc(128); bytes.write("RIFF"); bytes.writeUInt32LE(120, 4); bytes.write("WEBP", 8);
  for (const store of stores) for (const url of [store.logo, store.banner, ...store.menus.map((dish) => dish.image)]) {
    const file = path.join(assetRoot, url); fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 }); fs.writeFileSync(file, bytes, { flag: "wx", mode: 0o600 });
  }
}
async function captureDatabase(file) {
  const collections = {};
  for (const { name } of await mongoose.connection.db.listCollections().toArray()) {
    const collection = mongoose.connection.db.collection(name);
    collections[name] = { documents: await collection.find().sort({ _id: 1 }).toArray(), indexes: await collection.indexes() };
  }
  const contents = mongoose.mongo.BSON.EJSON.stringify({ database, syntheticOnly: true, at: new Date(), collections }, null, 2);
  fs.writeFileSync(file, contents, { flag: "wx", mode: 0o600 }); assert.equal(fs.readFileSync(file, "utf8"), contents);
  return { file, sha256: replacement.digest(contents), syntheticOnly: true };
}
async function run() {
  const uri = new URL(process.env.CATALOGUE_TEST_MONGO_URI || "mongodb://127.0.0.1:27018/mealq");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname), "Catalogue tests refuse remote MongoDB"); uri.pathname = `/${database}`;
  Object.assign(process.env, { NODE_ENV: "development", PAYMENT_MODE: "demo", SMTP_HOST: "", SMTP_FROM: "", FRONTEND_URL: "http://localhost:5173", SESSION_SECRET: crypto.randomUUID() });
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  await mongoose.connect(uri.href, { serverSelectionTimeoutMS: 5000 }); connected = true;
  await Promise.all([User, Store, Menu, Ingredient, Promotion, CustomerCoupon, Order, Queue, Wallet, WalletTransaction, PushSubscription, PendingRegistration, EmailChange, SystemSettings, Notification, EmailOutbox].map((model) => model.init()));
  const admin = await syntheticUser("admin"), customer = await syntheticUser("customer"), oldOwner = await syntheticUser("merchant"), oldStaff = await syntheticUser("staff");
  const oldStore = await Store.create({ name: "Original kitchen", owner_id: oldOwner._id, client_id: "old-kitchen", status: "active", is_open: true });
  await User.updateMany({ _id: { $in: [oldOwner._id, oldStaff._id] } }, { $set: { store_id: oldStore._id } });
  const oldIngredient = await Ingredient.create({ store_id: oldStore._id, name: "Original portions", quantity: 9, unit: "ที่" });
  const oldMenu = await Menu.create({ store_id: oldStore._id, name: "Original meal", category: "single", cuisine: "thai", price: 100, ingredients: [{ ingredient_id: oldIngredient._id, quantity: 1, unit: "ที่" }] });
  const promotion = await Promotion.create({ store_id: oldStore._id, title: "Original coupon", code: "ORIGINAL", discount_type: "fixed", discount_value: 10, minimum_order: 0, start_date: new Date(Date.now() - 60000), expire_date: new Date(Date.now() + 3600000), used_count: 1, usage_by_customer: { [String(customer._id)]: 1 } });
  const globalPromo = await Promotion.create({ title: "Global coupon", code: "GLOBAL", discount_type: "percentage", discount_value: 5, start_date: new Date(Date.now() - 60000), expire_date: new Date(Date.now() + 3600000) });
  const saved = await CustomerCoupon.create({ user_id: customer._id, promotion_id: promotion._id });
  const globalSaved = await CustomerCoupon.create({ user_id: customer._id, promotion_id: globalPromo._id });
  await changeBalance({ userId: customer._id, amount: 500, type: "topup", key: "synthetic-topup" });
  const active = await Order.create({ order_number: "SYNTHETIC-READY", customer_id: customer._id, store_id: oldStore._id, status: "ready", items: [{ menu_id: oldMenu._id, name: oldMenu.name, price: 100, quantity: 1, total_price: 100 }], subtotal: 100, total_price: 90, discount: 10, payment_method: "wallet", payment_mode: "wallet", payment_status: "paid", promotion: { promotion_id: promotion._id, code: promotion.code, discount_type: "fixed", discount_value: 10 }, stock_requirements: [{ ingredient_id: String(oldIngredient._id), quantity: 1, unit: "ที่" }], notification_events: [{ status: "ready", at: new Date(), payment_status: "paid" }], notification_pending: false });
  await changeBalance({ userId: customer._id, amount: -90, type: "payment", orderId: active._id, key: `order:${active._id}:payment` });
  await Ingredient.updateOne({ _id: oldIngredient._id }, { $set: { [`reservations.${active._id}`]: { quantity: 1, released: false } } });
  await Promotion.updateOne({ _id: promotion._id }, { $set: { [`checkout_claims.${active._id}`]: true } });
  await Queue.create({ order_id: active._id, store_id: oldStore._id, queue_number: 1, receive_code: "1234", status: "ready" });
  const completed = await Order.create({ order_number: "SYNTHETIC-COMPLETED", customer_id: customer._id, store_id: oldStore._id, status: "completed", items: [{ menu_id: oldMenu._id, name: oldMenu.name, price: 100, quantity: 1, total_price: 100 }], subtotal: 100, total_price: 100, payment_status: "simulated", review: { rating: 5, text: "Preserve this review" } });
  await Queue.create({ order_id: completed._id, store_id: oldStore._id, queue_number: 2, receive_code: "5678", status: "completed" });
  await PushSubscription.create({ user_id: oldOwner._id, endpoint: "https://push-fixture.invalid/old", keys: { auth: "fake", p256dh: "fake" } });
  await EmailChange.create({ _id: oldOwner._id, email: "old-change@catalogue-test.invalid", expires_at: new Date(Date.now() + 3600000) });
  await PendingRegistration.create({ email: "pending-merchant@catalogue-test.invalid", registration_id: crypto.randomUUID(), name: "Pending merchant", role: "merchant", password_hash: "synthetic-only", otp_hash: "synthetic-only", expires_at: new Date(Date.now() + 3600000), resend_after: new Date(), window_resets_at: new Date(Date.now() + 3600000), delete_after: new Date(Date.now() + 86400000) });
  const notice = await Notification.create({ user_id: customer._id, event_key: `synthetic:${active._id}`, kind: "ready", title: "Existing notice", body: "Keep history", order_id: String(active._id), push_sent: false });
  const emailJob = await EmailOutbox.create({ user_id: customer._id, order_id: active._id, event_key: `synthetic-email:${active._id}`, role: "customer", event: "ready", event_at: new Date(), preference_generation: "synthetic", to: customer.email, payload: { syntheticOnly: true }, status: "pending" });
  const protectedBefore = replacement.digest(await User.collection.find({ _id: { $in: [admin._id, customer._id] } }).sort({ _id: 1 }).toArray());
  const globalBefore = replacement.digest(await Promotion.collection.findOne({ _id: globalPromo._id }));
  const preview = await replacement.preview();
  assert.equal(preview.old.users, 2); assert.equal(preview.old.stores, 1); assert.equal(preview.old.menus, 1); assert.equal(preview.activeOrders.length, 1);
  const backupProof = await captureDatabase(path.join(directory, "full-before.ejson"));
  const assetRoot = path.join(directory, "assets"); syntheticAssets(assetRoot);
  const workDir = path.join(directory, "replacement");
  await assert.rejects(() => replacement.prepare({ workDir, backupProof, assetRoot }), /Pause accepting_orders/);
  await SystemSettings.create({ _id: "global", accepting_orders: false, service_fee: 4 });
  const staged = await replacement.prepare({ workDir, backupProof, assetRoot });
  assert.equal(staged.staged.menus, 48); assert.equal(await Store.countDocuments({ status: "active" }), 1);
  assert.equal(await User.countDocuments({ role: "merchant", status: "suspended" }), 6);
  const credentials = replacement.read(path.join(workDir, "merchant-credentials.json"));
  assert.equal(new Set(credentials.accounts.map((row) => row.password)).size, 6);
  for (const credential of credentials.accounts) assert.ok(await verifyPassword(credential.password, (await User.findById(credential.userId)).password_hash));
  await replacement.prepare({ workDir, backupProof, assetRoot });
  assert.equal(await User.countDocuments({ role: "merchant" }), 7, "Prepare retry must not duplicate accounts");
  pass("Read-only scope, maintenance gate, staged private credentials, unavailable staged catalogue and idempotent prepare");
  await assert.rejects(() => replacement.apply({ workDir, backupProof, assetRoot }), /Active orders/);
  assert.equal((await Order.findById(active._id)).status, "ready"); assert.ok(await User.findById(oldOwner._id));
  assert.equal(await WalletTransaction.countDocuments({ type: "refund" }), 0);
  pass("Active ready order blocks destructive replacement unless explicit cancellation flag is present");
  const originalDelete = Menu.deleteMany;
  Menu.deleteMany = async () => { throw new Error("Synthetic interruption after promotions cleanup"); };
  try { await assert.rejects(() => replacement.apply({ workDir, backupProof, assetRoot, cancelActive: true }), /Synthetic interruption/); }
  finally { Menu.deleteMany = originalDelete; }
  assert.equal((await Wallet.findOne({ user_id: customer._id })).balance, 500);
  assert.equal(await WalletTransaction.countDocuments({ type: "refund" }), 1);
  assert.equal((await Ingredient.findById(oldIngredient._id)).quantity, 10);
  assert.equal(await Promotion.countDocuments({ _id: promotion._id }), 0);
  const settledArchive = replacement.read(path.join(workDir, "before-delete.ejson"));
  assert.equal(settledArchive.collections.promotions[0].used_count.valueOf(), 0, "Exact promotion claim is restored before deletion");
  pass("Ready order is cancelled, wallet/stock/coupon claim restored once and archived before any catalogue deletion");
  const result = await replacement.apply({ workDir, backupProof, assetRoot, cancelActive: true });
  assert.equal(result.stores, 6); assert.equal(result.menus, 48); assert.equal(result.assets, 60);
  await replacement.apply({ workDir, backupProof, assetRoot, cancelActive: true });
  assert.equal(await WalletTransaction.countDocuments({ type: "refund" }), 1);
  assert.equal((await Wallet.findOne({ user_id: customer._id })).balance, 500);
  assert.equal(replacement.digest(await User.collection.find({ _id: { $in: [admin._id, customer._id] } }).sort({ _id: 1 }).toArray()), protectedBefore);
  assert.equal(replacement.digest(await Promotion.collection.findOne({ _id: globalPromo._id })), globalBefore);
  assert.ok(await CustomerCoupon.findById(saved._id)); assert.ok(await CustomerCoupon.findById(globalSaved._id)); assert.ok(await Notification.findById(notice._id));
  assert.equal(await Notification.countDocuments(), 1); assert.equal(await EmailOutbox.countDocuments(), 1);
  assert.equal((await Notification.findById(notice._id)).push_sent, true);
  assert.equal((await EmailOutbox.findById(emailJob._id)).status, "skipped");
  assert.equal((await EmailOutbox.findById(emailJob._id)).last_error_code, "CATALOGUE_RESET");
  assert.equal(await User.countDocuments({ _id: { $in: [oldOwner._id, oldStaff._id] } }), 0);
  assert.equal(await PushSubscription.countDocuments(), 0); assert.equal(await PendingRegistration.countDocuments(), 0); assert.equal(await EmailChange.countDocuments(), 0);
  const history = await Order.findById(completed._id).populate("store_id", "name client_id");
  assert.equal(orderView(history).store.name, oldStore.name); assert.equal(orderView(history).items[0].name, oldMenu.name); assert.equal(history.review.text, "Preserve this review");
  const cancelled = await Order.findById(active._id).populate("store_id", "name client_id");
  assert.equal(orderView(cancelled).store.name, oldStore.name); assert.equal(cancelled.cancelled_reason, replacement.RESET_REASON); assert.equal(cancelled.payment_status, "refunded");
  assert.equal(cancelled.notification_pending, false); assert.ok(cancelled.notification_events.some((row) => row.status === "cancelled"));
  let couponPayload;
  await require("../src/services/customer-coupons").list({ user: customer }, { json: (value) => { couponPayload = value; } });
  const unavailable = couponPayload.coupons.find((row) => row.id === String(promotion._id));
  assert.equal(unavailable.canUse, false); assert.equal(unavailable.title, "Original coupon"); assert.equal(unavailable.storeName, oldStore.name);
  pass("Interrupted apply resumes safely; retries never double-refund; customer/admin/history/global coupons preserved; no outbound reset messages");
  let publicData;
  await require("../src/controllers/publicController").listMenus({}, { json: (value) => { publicData = value; } });
  assert.equal(publicData.menus.length, 48); assert.equal(new Set(publicData.menus.map((row) => row.cuisine)).size, 6);
  assert.equal(new Set(publicData.menus.map((row) => row.category)).size, 4);
  assert.ok(publicData.menus.every((row) => row.image.startsWith("/catalogue/20261019-v2/") && row.isAvailable));
  const userRef = credentials.accounts[0]; const loginUser = await User.findById(userRef.userId);
  assert.equal(loginUser.status, "active"); assert.equal(loginUser.must_change_password, true); assert.ok(await verifyPassword(userRef.password, loginUser.password_hash));
  pass("Public catalogue exposes all 48 purchasable dishes across six cuisines/four categories and new merchant credentials remain valid");
  console.log(JSON.stringify({ ok: true, groups: checks, database, archiveDirectory: directory, syntheticOnly: true }));
}
async function close() {
  if (!connected) return;
  try {
    assert.equal(mongoose.connection.name, database); assert.match(database, /^mealq_catalogue_[a-f0-9]{16}$/);
    await captureDatabase(path.join(directory, "full-after.ejson"));
    await mongoose.connection.dropDatabase();
    console.log(`Synthetic database archived before cleanup: ${directory}`);
  } finally { await mongoose.disconnect(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(close);
