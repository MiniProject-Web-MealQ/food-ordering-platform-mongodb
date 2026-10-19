// Real HTTP + MongoDB; no timers or external SMTP/push. Only a random test DB.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const Menu = require("../src/models/Menu");
const Promotion = require("../src/models/Promotion");
const CustomerCoupon = require("../src/models/CustomerCoupon");
const Order = require("../src/models/Order");
const Wallet = require("../src/models/Wallet");
const { hashPassword } = require("../src/services/password");
const { compensate } = require("../src/services/checkout-recovery");
const { releasePromotionClaim } = require("../src/services/promotion-claims");
const database = `mealq_coupon_${crypto.randomBytes(8).toString("hex")}`;
const password = `Synthetic-${crypto.randomBytes(20).toString("hex")}9`;
let connected = false, server, base, passes = 0, couponIndex = 0;
let aliceUser, bobUser, poorUser, storeA, storeB, menuA, menuB;
const pass = (label) => { passes++; console.log(`[PASS] ${label}`); };
const id = () => new mongoose.Types.ObjectId();
function client() {
  let cookie = "";
  return async (method, route, body, expected = 200, key) => {
    const response = await fetch(base + route, { method, headers: { Cookie: cookie, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    for (const value of response.headers.getSetCookie()) if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
    const data = await response.json();
    if (expected !== null) assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
    return { ...data, httpStatus: response.status };
  };
}
const alice = client(), bob = client(), poor = client(), guest = client(), merchant = client();
async function user(role = "customer") { return User.create({ name: "Synthetic coupon fixture", email: `${id()}@coupon-fixture.invalid`, role, status: "active", email_verified_at: new Date(), password_hash: await hashPassword(password) }); }
async function login(request, account) { return request("POST", "/auth/login", { email: account.email, password, portal: account.role }); }
async function promo(fields = {}) { return Promotion.create({ code: `SAVE${++couponIndex}`, title: "Synthetic coupon", discount_type: "fixed", discount_value: 10, minimum_order: 0, start_date: new Date(Date.now() - 10000), expire_date: new Date(Date.now() + 3600000), ...fields }); }
async function collect(request, promotion, status = 201) { return (await request("POST", `/customer/coupons/${promotion._id}/collect`, {}, status)).coupon; }
function body(promotion, { menu = menuA, quantity = 1, ...fields } = {}) { return { items: [{ menuId: String(menu._id), quantity }], paymentMethod: "wallet", ...(promotion ? { couponId: String(promotion._id), couponCode: promotion.code } : {}), ...fields }; }
async function buy(request, promotion, fields = {}, status = 201, key = crypto.randomUUID()) { return request("POST", "/orders", body(promotion, fields), status, key); }
async function balance(account) { return (await Wallet.findOne({ user_id: account._id }))?.balance || 0; }

async function run() {
  const uri = new URL(process.env.COUPON_TEST_MONGO_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27018/mealq");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname), "Coupon tests refuse remote MongoDB");
  uri.pathname = `/${database}`;
  Object.assign(process.env, { NODE_ENV: "development", PAYMENT_MODE: "demo", FRONTEND_URL: "http://localhost:5173", SESSION_SECRET: crypto.randomUUID(), SMTP_HOST: "", SMTP_FROM: "" });
  await mongoose.connect(uri.href, { serverSelectionTimeoutMS: 5000 }); connected = true;
  await Promise.all([User, Store, Menu, Promotion, CustomerCoupon, Order, Wallet].map((model) => model.init()));
  const app = express(); app.use(express.json());
  app.use("/api/v1/auth", require("../src/routes/authRoutes"));
  app.use("/api/v1/customer", require("../src/routes/customerRoutes"));
  app.use("/api/v1/orders", require("../src/routes/orderRoutes"));
  app.use("/api/v1", require("../src/routes/publicRoutes"));
  app.use((error, _req, res, _next) => { if (!error.status) console.error("Synthetic API failure", error.name, error.code); res.status(error.status || 500).json({ error: { code: error.code || "INTERNAL_ERROR", message: error.message } }); });
  server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  [aliceUser, bobUser, poorUser] = await Promise.all([user(), user(), user()]);
  const ownerA = await user("merchant"), ownerB = await user("merchant");
  storeA = await Store.create({ name: "Coupon A", owner_id: ownerA._id, status: "active", is_open: true, queue: { max_queue: 500 } });
  storeB = await Store.create({ name: "Coupon B", owner_id: ownerB._id, status: "active", is_open: true, queue: { max_queue: 500 } });
  await User.updateOne({ _id: ownerA._id }, { $set: { store_id: storeA._id } });
  menuA = await Menu.create({ name: "Synthetic rice A", category: "อาหาร", store_id: storeA._id, price: 40, is_available: true });
  menuB = await Menu.create({ name: "Synthetic rice B", category: "อาหาร", store_id: storeB._id, price: 40, is_available: true });
  await login(alice, aliceUser); await login(bob, bobUser); await login(poor, poorUser); await login(merchant, ownerA);
  await alice("POST", "/customer/wallet/topup", { amount: 5000 }, 201, crypto.randomUUID());
  await bob("POST", "/customer/wallet/topup", { amount: 5000 }, 201, crypto.randomUUID());
  const first = await promo();
  await guest("GET", "/customer/coupons", undefined, 401);
  await guest("POST", `/customer/coupons/${first._id}/collect`, {}, 401);
  await merchant("POST", `/customer/coupons/${first._id}/collect`, {}, 403);
  const simultaneous = await Promise.all([alice("POST", `/customer/coupons/${first._id}/collect`, {}, null), alice("POST", `/customer/coupons/${first._id}/collect`, {}, null)]);
  assert.deepEqual(simultaneous.map((value) => value.httpStatus).sort(), [200, 201]);
  assert.equal(await CustomerCoupon.countDocuments({ user_id: aliceUser._id, promotion_id: first._id }), 1);
  const again = await collect(alice, first, 200);
  assert.equal(again.id, String(first._id)); assert.equal(again.promotionId, String(first._id)); assert.equal(again.remainingUses, null);
  assert.equal((await alice("GET", "/customer/coupons")).coupons.length, 1);
  assert.equal((await bob("GET", "/customer/coupons")).coupons.length, 0);
  await bob("POST", `/customer/coupons/${first._id}/collect`, { user_id: String(aliceUser._id) }, 201);
  assert.equal(await CustomerCoupon.countDocuments({ promotion_id: first._id }), 2);
  assert.equal((await Promotion.findById(first._id)).used_count, 0);
  pass("Authenticated customer-only collection is persistent, isolated, unique and idempotent; saving does not consume a use");

  const unowned = await promo();
  assert.equal((await buy(alice, unowned, {}, 403)).error.code, "COUPON_NOT_COLLECTED");
  for (const malformed of [{ couponId: [String(first._id)] }, { couponId: {} }, { couponCode: [first.code] }, { couponCode: {} }, { couponCodes: [first.code] }, { couponIds: [] }, { coupons: [] }, { couponCode: `${first.code},OTHER` }]) {
    await buy(alice, first, malformed, 400);
  }
  assert.equal((await buy(alice, first, { couponCode: "OTHER" }, 400)).error.code, "COUPON_MISMATCH");
  const plain = await buy(alice, null);
  assert.equal(plain.order.discount, 0); assert.equal(plain.order.totalPrice, 44);
  pass("Checkout requires an owned coupon and strictly rejects arrays, objects, mismatched codes and stacking fields");

  const scope = await promo({ store_id: storeA._id }); await collect(alice, scope);
  assert.equal((await buy(alice, scope, { menu: menuB }, 400)).error.code, "COUPON_WRONG_STORE");
  const limited = await promo({ discount_type: "percentage", discount_value: 50, max_discount: 7, minimum_order: 80 }); await collect(alice, limited);
  assert.equal((await buy(alice, limited, {}, 400)).error.code, "COUPON_MINIMUM");
  const changedPrice = await buy(alice, limited, { quantity: 2, expectedTotal: 1 }, 409);
  assert.equal(changedPrice.error.code, "PRICE_CHANGED"); assert.equal(changedPrice.error.details.total, 77);
  const capped = (await buy(alice, limited, { quantity: 2, expectedTotal: 77 })).order;
  assert.equal(capped.discount, 7); assert.equal(capped.totalPrice, 77);
  pass("Server validates store scope, minimum subtotal, percentage caps and expected total without trusting client discounts");

  const expired = await promo(); await collect(alice, expired);
  await Promotion.updateOne({ _id: expired._id }, { $set: { expire_date: new Date(Date.now() - 1) } });
  assert.equal((await collect(alice, expired, 200)).canUse, false);
  await buy(alice, expired, {}, 400);
  const disabled = await promo({ is_active: false }); await collect(alice, disabled, 409);
  const savedDisabled = await promo(); await collect(alice, savedDisabled);
  await Promotion.updateOne({ _id: savedDisabled._id }, { $set: { is_active: false } });
  assert.equal((await collect(alice, savedDisabled, 200)).canUse, false);
  await buy(alice, savedDisabled, {}, 400);
  const future = await promo({ start_date: new Date(Date.now() + 60000) });
  assert.equal((await collect(alice, future)).canUse, false);
  await buy(alice, future, {}, 400);
  const past = await promo({ expire_date: new Date(Date.now() - 1000) }); await collect(alice, past, 409);
  const hidden = await promo({ store_id: storeB._id });
  await Store.updateOne({ _id: storeB._id }, { $set: { status: "pending" } }); await collect(alice, hidden, 409);
  await Store.updateOne({ _id: storeB._id }, { $set: { status: "active", is_open: false } });
  assert.equal((await collect(alice, hidden)).canUse, true);
  await Store.updateOne({ _id: storeB._id }, { $set: { is_open: true } });
  const missingId = id();
  await CustomerCoupon.create({ user_id: aliceUser._id, promotion_id: missingId, snapshot: { code: "REMOVED", title: "Removed fixture", description: "Synthetic missing reference" } });
  const wallet = (await alice("GET", "/customer/coupons")).coupons;
  assert.equal(wallet.find((row) => row.id === String(expired._id)).canUse, false);
  assert.equal(wallet.find((row) => row.id === String(missingId)).title, "Removed fixture");
  assert.equal(wallet.find((row) => row.id === String(missingId)).canUse, false);
  assert.equal(JSON.stringify(wallet).includes("usage_by_customer"), false);
  const publicPromos = (await guest("GET", "/promotions")).promotions;
  assert.ok(publicPromos.every((row) => row.startsAt && !Object.hasOwn(row, "usage_by_customer")));
  pass("Expired/disabled/hidden offers cannot be collected or redeemed; saved unavailable/missing entries remain visible and closed approved stores remain collectable");

  const globalSame = await promo({ code: "SAMECODE", discount_value: 5 });
  const localSame = await promo({ code: "SAMECODE", store_id: storeA._id, discount_value: 9 });
  await collect(alice, globalSame);
  const codeOnly = (await buy(alice, null, { couponCode: "samecode" })).order;
  assert.equal(String((await Order.findById(codeOnly.id)).promotion.promotion_id), String(globalSame._id));
  await collect(alice, localSame);
  assert.equal((await buy(alice, null, { couponCode: "SAMECODE" }, 409)).error.code, "COUPON_AMBIGUOUS");
  assert.equal((await buy(alice, localSame)).order.discount, 9);
  pass("Legacy code-only checkout resolves only collected offers; duplicate global/store codes require an explicit promotion ID");

  const replay = await promo({ per_user_limit: 1 }); await collect(alice, replay);
  const key = crypto.randomUUID(); const request = body(replay);
  const once = await alice("POST", "/orders", request, 201, key);
  const twice = await alice("POST", "/orders", request, 201, key);
  assert.equal(once.order.id, twice.order.id); assert.equal((await Promotion.findById(replay._id)).used_count, 1);
  assert.equal((await alice("POST", "/orders", body(first), 409, key)).error.code, "IDEMPOTENCY_CONFLICT");
  assert.equal((await buy(alice, replay, {}, 409)).error.code, "COUPON_LIMIT");
  assert.equal((await alice("GET", "/customer/coupons")).coupons.find((row) => row.id === String(replay._id)).remainingUses, 0);
  pass("Idempotent replay consumes one use, coupon IDs participate in the fingerprint and per-customer limits remain enforced");

  const scarce = await promo({ usage_limit: 1 }); await collect(alice, scarce);
  const races = await Promise.all([buy(alice, scarce, {}, null), buy(alice, scarce, { menu: menuB }, null)]);
  assert.equal(races.filter((result) => result.httpStatus === 201).length, 1);
  assert.equal(races.filter((result) => result.error?.code === "COUPON_LIMIT").length, 1);
  assert.equal((await Promotion.findById(scarce._id)).used_count, 1);
  pass("An atomic global quota allows one winner across simultaneous checkouts at different stores");

  const personal = await promo({ per_user_limit: 1 }); await collect(alice, personal); await collect(bob, personal);
  const personalRaces = await Promise.all([buy(alice, personal, {}, null), buy(alice, personal, { menu: menuB }, null)]);
  assert.equal(personalRaces.filter((result) => result.httpStatus === 201).length, 1);
  assert.equal(personalRaces.filter((result) => result.error?.code === "COUPON_LIMIT").length, 1);
  await buy(bob, personal);
  assert.equal((await Promotion.findById(personal._id)).used_count, 2);
  const personalWinner = personalRaces.find((result) => result.httpStatus === 201).order;
  await alice("PATCH", `/orders/${personalWinner.id}/cancel`, {});
  assert.equal((await alice("GET", "/customer/coupons")).coupons.find((row) => row.id === String(personal._id)).remainingUses, 1);
  await buy(alice, personal);
  assert.equal((await Promotion.findById(personal._id)).used_count, 2);
  pass("Per-customer quotas serialize across stores, remain independent between customers and become usable immediately after cancellation");

  const reuse = await promo(); await collect(alice, reuse);
  const keep = (await buy(alice, reuse)).order; const cancel = (await buy(alice, reuse, { menu: menuB })).order;
  assert.equal((await Promotion.findById(reuse._id)).usage_by_customer.get(String(aliceUser._id)), 2);
  await alice("PATCH", `/orders/${cancel.id}/cancel`, {});
  await alice("PATCH", `/orders/${cancel.id}/cancel`, {});
  await compensate(await Order.findById(cancel.id)); await compensate(await Order.findById(cancel.id));
  let reused = await Promotion.findById(reuse._id);
  assert.equal(reused.used_count, 1); assert.equal(reused.usage_by_customer.get(String(aliceUser._id)), 1);
  const completed = await Order.findByIdAndUpdate(keep.id, { $set: { status: "completed" } }, { returnDocument: "after" });
  await releasePromotionClaim(completed); assert.equal(await compensate(completed), null);
  assert.equal((await Promotion.findById(reuse._id)).used_count, 1);
  pass("Unlimited collected coupons support multiple orders; cancellation restores one right immediately and repeated cancellation/recovery never releases completed orders");

  const failure = await promo({ usage_limit: 1, per_user_limit: 1 }); await collect(poor, failure);
  const retryKey = crypto.randomUUID();
  assert.equal((await buy(poor, failure, {}, 409, retryKey)).error.code, "INSUFFICIENT_BALANCE");
  const failed = await Order.findOne({ customer_id: poorUser._id, "promotion.promotion_id": failure._id });
  await compensate(failed); await compensate(failed);
  assert.equal((await Promotion.findById(failure._id)).used_count, 0);
  await poor("POST", "/customer/wallet/topup", { amount: 100 }, 201, crypto.randomUUID());
  await buy(poor, failure, {}, 201, retryKey);
  await compensate(failed);
  assert.equal((await Promotion.findById(failure._id)).used_count, 1);
  pass("Failed checkout compensates the exact claim once, releases its idempotency key and cannot decrement a later successful order's use");

  const changed = await promo(); await collect(alice, changed);
  const before = await balance(aliceUser);
  const originalClaim = Promotion.findOneAndUpdate;
  let changedOnce = false;
  Promotion.findOneAndUpdate = function(query, update, options) {
    if (String(query._id) === String(changed._id) && !changedOnce) {
      changedOnce = true;
      return (async () => { await Promotion.updateOne({ _id: changed._id }, { $set: { discount_value: 20 } }); return originalClaim.call(this, query, update, options); })();
    }
    return originalClaim.call(this, query, update, options);
  };
  try { assert.equal((await buy(alice, changed, { expectedTotal: 34 }, 409)).error.code, "COUPON_LIMIT"); }
  finally { Promotion.findOneAndUpdate = originalClaim; }
  assert.equal(await balance(aliceUser), before);
  assert.equal((await Promotion.findById(changed._id)).used_count, 0);
  const blocked = await Order.findOne({ customer_id: aliceUser._id, "promotion.promotion_id": changed._id, status: "cancelled" });
  assert.equal(await Promotion.findOneAndUpdate({ _id: changed._id, [`checkout_claims.${blocked._id}`]: { $exists: false } }, { $inc: { used_count: 1 } }), null);
  assert.equal((await buy(alice, changed, { expectedTotal: 24 })).order.discount, 20);
  pass("An administrator changing discount terms between pricing and claiming rejects the stale checkout before any wallet charge");
  console.log(`${passes} coupon integration groups passed. No external messages or production database were used.`);
}
async function close() {
  if (server) await new Promise((resolve) => server.close(resolve));
  try {
    if (connected && mongoose.connection.readyState === 1) {
      assert.equal(mongoose.connection.name, database); assert.match(database, /^mealq_coupon_[a-f0-9]{16}$/);
      const collections = {};
      for (const { name } of await mongoose.connection.db.listCollections().toArray()) {
        const collection = mongoose.connection.db.collection(name);
        collections[name] = { documents: await collection.find({}).toArray(), indexes: await collection.indexes() };
      }
      const directory = path.join(os.tmpdir(), "mealq-coupon-check-archives"); await fs.mkdir(directory, { recursive: true });
      const file = path.join(directory, `${database}.json`);
      const snapshot = mongoose.mongo.BSON.EJSON.stringify({ database, syntheticOnly: true, savedAt: new Date(), collections }, null, 2);
      await fs.writeFile(file, snapshot, { flag: "wx", mode: 0o600 }); assert.equal(await fs.readFile(file, "utf8"), snapshot);
      await mongoose.connection.dropDatabase(); console.log(`Synthetic database archived before cleanup: ${file}`);
    }
  } finally { await mongoose.disconnect(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(close);
