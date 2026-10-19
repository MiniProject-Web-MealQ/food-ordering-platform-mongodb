"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { RUN_ID, stores } = require("./catalogue-v2-manifest");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const Menu = require("../src/models/Menu");
const Ingredient = require("../src/models/Ingredient");
const Promotion = require("../src/models/Promotion");
const CustomerCoupon = require("../src/models/CustomerCoupon");
const Order = require("../src/models/Order");
const Queue = require("../src/models/Queue");
const PushSubscription = require("../src/models/PushSubscription");
const EmailChange = require("../src/models/EmailChange");
const PendingRegistration = require("../src/models/PendingRegistration");
const SystemSettings = require("../src/models/SystemSettings");
const Notification = require("../src/models/Notification");
const EmailOutbox = require("../src/models/EmailOutbox");
const { hashPassword } = require("../src/services/password");
const { snapshotStore } = require("../src/services/order-store-view");
const { publicPromotionView } = require("../src/services/customer-coupons");
const EJSON = mongoose.mongo.BSON.EJSON;
const digest = (value) => crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : EJSON.stringify(value, { relaxed: false })).digest("hex");
const ids = (rows) => rows.map((row) => row._id);
const stableId = (kind, slug) => new mongoose.Types.ObjectId(digest(`${RUN_ID}:${kind}:${slug}`).slice(0, 24));
const preparedIds = {
  users: stores.map((store) => stableId("user", store.slug)),
  stores: stores.map((store) => stableId("store", store.slug)),
  menus: stores.flatMap((store) => store.menus.map((menu) => stableId("menu", `${store.slug}:${menu.slug}`))),
  ingredients: stores.flatMap((store) => store.menus.map((menu) => stableId("ingredient", `${store.slug}:${menu.slug}`))),
};
const manifestHash = digest(stores);
const models = { users: User, stores: Store, menus: Menu, ingredients: Ingredient, promotions: Promotion,
  customerCoupons: CustomerCoupon, pushSubscriptions: PushSubscription, emailChanges: EmailChange, pendingRegistrations: PendingRegistration };
const RESET_REASON = "รีเซ็ตชุดร้านค้าสาธิตตามคำขอผู้ดูแล";

function privateDir(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") assert.equal(fs.statSync(directory).mode & 0o077, 0, "Reset directory must be private (0700)");
}
function writeNew(file, value) {
  fs.writeFileSync(file, EJSON.stringify(value, null, 2, { relaxed: false }) + "\n", { flag: "wx", mode: 0o600 });
}
function read(file) { return EJSON.parse(fs.readFileSync(file, "utf8"), { relaxed: false }); }
function marker(workDir, phase, value) {
  const file = path.join(workDir, `${phase}.json`);
  if (!fs.existsSync(file)) writeNew(file, { runId: RUN_ID, at: new Date(), ...value });
  return read(file);
}
function validateManifest() {
  assert.equal(stores.length, 6);
  assert.equal(new Set(stores.map((row) => row.slug)).size, stores.length);
  assert.equal(stores.flatMap((row) => row.menus).length, 48);
  assert.deepEqual([...new Set(stores.map((row) => row.cuisine))].sort(), ["dessert", "drink", "fastfood", "japanese", "korean", "thai"]);
  for (const store of stores) {
    assert.equal(store.menus.length, 8);
    assert.equal(new Set(store.menus.map((row) => row.slug)).size, 8);
    assert.match(store.slug, /^[a-z0-9-]+$/);
    for (const menu of store.menus) {
      assert.ok(["single", "noodle", "drink", "dessert"].includes(menu.category));
      assert.ok(menu.price > 0 && menu.description && menu.name && menu.cuisine === store.cuisine);
      assert.equal(menu.image, `/catalogue/${RUN_ID}/${store.slug}/${menu.slug}.webp`);
      for (const group of menu.optionGroups) {
        assert.ok(group.id && group.options.length > 0);
        assert.equal(new Set(group.options.map((row) => row.id)).size, group.options.length);
        if (group.required) assert.equal(group.options.filter((row) => row.default).length, 1);
      }
    }
  }
}

async function captureTargets() {
  const targets = {};
  const queries = {
    users: { role: { $in: ["merchant", "staff"] }, _id: { $nin: preparedIds.users } },
    stores: { _id: { $nin: preparedIds.stores } }, menus: { _id: { $nin: preparedIds.menus } },
    ingredients: { _id: { $nin: preparedIds.ingredients } }, promotions: { store_id: { $ne: null } },
  };
  for (const [key, query] of Object.entries(queries)) targets[key] = await models[key].collection.find(query).sort({ _id: 1 }).toArray();
  const userIds = ids(targets.users);
  queries.pushSubscriptions = { user_id: { $in: userIds } };
  queries.emailChanges = { _id: { $in: userIds } };
  queries.pendingRegistrations = { role: "merchant" };
  queries.customerCoupons = { promotion_id: { $in: ids(targets.promotions) } };
  for (const key of ["pushSubscriptions", "emailChanges", "pendingRegistrations", "customerCoupons"]) targets[key] = await models[key].collection.find(queries[key]).sort({ _id: 1 }).toArray();
  const orderQuery = { store_id: { $in: ids(targets.stores) } };
  targets.orders = await Order.collection.find(orderQuery).sort({ _id: 1 }).toArray();
  targets.queues = await Queue.collection.find({ $or: [{ store_id: { $in: ids(targets.stores) } }, { order_id: { $in: ids(targets.orders) } }] }).sort({ _id: 1 }).toArray();
  targets.notifications = await Notification.collection.find({ order_id: { $in: ids(targets.orders).map(String) } }).sort({ _id: 1 }).toArray();
  targets.emailOutbox = await EmailOutbox.collection.find({ order_id: { $in: ids(targets.orders) } }).sort({ _id: 1 }).toArray();
  return targets;
}
function targetCounts(targets) { return Object.fromEntries(Object.entries(targets).map(([key, rows]) => [key, rows.length])); }
async function preview() {
  const targets = await captureTargets();
  const active = targets.orders.filter((row) => !["completed", "cancelled"].includes(row.status) || row.checkout_completed === false);
  return { runId: RUN_ID, manifestHash, database: mongoose.connection.name, old: targetCounts(targets),
    oldStoreNames: targets.stores.map((row) => row.name), activeOrders: active.map((row) => ({ id: String(row._id), number: row.order_number, status: row.status, paymentMethod: row.payment_method, total: row.total_price })),
    newStores: stores.map((store) => ({ name: store.name, slug: store.slug, cuisine: store.cuisine, menus: store.menus.length })),
    preserved: ["customer/admin accounts", "wallets and ledger", "orders and queue history", "inbox and email history", "global promotions", "collected coupon snapshots"] };
}

async function assertMaintenance() {
  assert.equal((await SystemSettings.findById("global"))?.accepting_orders, false, "Pause accepting_orders before preparing or applying the replacement");
}
function assertAssets(assetRoot) {
  assert.ok(assetRoot && path.isAbsolute(assetRoot), "Absolute directory containing catalogue assets is required");
  const files = stores.flatMap((store) => [store.logo, store.banner, ...store.menus.map((menu) => menu.image)]);
  for (const url of files) {
    const file = path.join(assetRoot, url.replace(/^\//, ""));
    const bytes = fs.readFileSync(file);
    assert.ok(bytes.length >= 100, `Missing or empty asset ${url}`);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `Expected WebP asset ${url}`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `Expected WebP asset ${url}`);
  }
  return files.length;
}

async function ensureDocument(model, document, identity) {
  const existing = await model.collection.findOne({ _id: document._id });
  if (existing) {
    for (const [key, expected] of Object.entries(identity)) assert.equal(String(existing[key]), String(expected), `Staged ${model.modelName} identity conflict (${key})`);
    return;
  }
  await model.create(document);
}
async function assertStagedCatalogue() {
  for (const store of stores) {
    const storeId = stableId("store", store.slug), userId = stableId("user", store.slug);
    const owner = await User.findById(userId), row = await Store.findById(storeId);
    assert.ok(owner && owner.role === "merchant" && owner.status === "suspended" && String(owner.store_id) === String(storeId), "Prepared owner must remain suspended until activation");
    assert.ok(row && row.status === "pending" && row.is_open === false && String(row.owner_id) === String(userId), "Prepared store must remain pending and closed");
    assert.equal(row.name, store.name); assert.equal(row.logo, store.logo); assert.equal(row.cover_image, store.banner);
    const menus = await Menu.find({ store_id: storeId }).lean(); assert.equal(menus.length, 8);
    for (const dish of store.menus) {
      const menu = menus.find((value) => String(value._id) === String(stableId("menu", `${store.slug}:${dish.slug}`))); assert.ok(menu);
      assert.equal(menu.name, dish.name); assert.equal(menu.price, dish.price); assert.equal(menu.image, dish.image);
      assert.equal(menu.is_available, false); assert.equal(menu.category, dish.category); assert.equal(menu.cuisine, store.cuisine);
      assert.deepEqual(menu.option_groups, dish.optionGroups);
      const ingredientId = stableId("ingredient", `${store.slug}:${dish.slug}`), ingredient = await Ingredient.findById(ingredientId);
      assert.ok(ingredient && String(ingredient.store_id) === String(storeId) && ingredient.quantity === 100 && ingredient.unit === "ที่" && ingredient.is_active);
      assert.equal(menu.ingredients.length, 1); assert.equal(String(menu.ingredients[0].ingredient_id), String(ingredientId)); assert.equal(menu.ingredients[0].quantity, 1);
    }
  }
}
async function prepare({ workDir, backupProof, assetRoot }) {
  validateManifest(); await assertMaintenance(); assertAssets(assetRoot); privateDir(workDir);
  const planFile = path.join(workDir, "plan.json"), targetFile = path.join(workDir, "targets.ejson");
  let plan;
  if (!fs.existsSync(planFile)) {
    assert.ok(!fs.existsSync(targetFile), "Orphan target archive requires operator review; do not overwrite");
    const targets = await captureTargets();
    const protectedRows = await User.collection.find({ role: { $in: ["customer", "admin"] } }).sort({ _id: 1 }).toArray();
    const indexRecords = {};
    for (const collection of await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()) indexRecords[collection.name] = await mongoose.connection.db.collection(collection.name).indexes();
    writeNew(targetFile, { runId: RUN_ID, createdAt: new Date(), targets, indexes: indexRecords });
    plan = { runId: RUN_ID, createdAt: new Date(), manifestHash, database: mongoose.connection.name, backupProof,
      archiveSha256: digest(fs.readFileSync(targetFile)), targetCounts: targetCounts(targets), protectedUsersHash: digest(protectedRows),
      protectedUserIds: ids(protectedRows), orderIds: ids(targets.orders), queueIds: ids(targets.queues), notificationIds: ids(targets.notifications), emailOutboxIds: ids(targets.emailOutbox) };
    writeNew(planFile, plan);
  } else plan = read(planFile);
  assert.equal(plan.runId, RUN_ID); assert.equal(plan.manifestHash, manifestHash); assert.equal(plan.database, mongoose.connection.name);
  assert.equal(digest(fs.readFileSync(targetFile)), plan.archiveSha256, "Target archive checksum mismatch");
  const credentialFile = path.join(workDir, "merchant-credentials.json");
  if (!fs.existsSync(credentialFile)) writeNew(credentialFile, { runId: RUN_ID, createdAt: new Date(), website: "https://mealq.site", accounts: stores.map((store) => ({
    role: "merchant", store: store.name, storeId: String(stableId("store", store.slug)), userId: String(stableId("user", store.slug)),
    email: `${store.slug}.${RUN_ID}@mealq.invalid`, password: `MealQ-${crypto.randomBytes(24).toString("base64url")}9!`,
    loginUrl: "https://mealq.site/merchant/login", mustChangePassword: true,
  })), notes: ["Demo restaurant credentials: keep private and change the initial password on first login.", "Reserved .invalid addresses cannot receive email. Set and verify a real email before enabling email notifications."] });
  const credentials = read(credentialFile);
  assert.equal(credentials.runId, RUN_ID); assert.equal(credentials.accounts.length, stores.length);
  for (const store of stores) {
    const userId = stableId("user", store.slug), storeId = stableId("store", store.slug);
    const credential = credentials.accounts.find((row) => row.userId === String(userId)); assert.ok(credential);
    await ensureDocument(User, { _id: userId, name: `ผู้ดูแล ${store.name}`, email: credential.email, password_hash: await hashPassword(credential.password), role: "merchant", store_id: storeId,
      status: "suspended", status_note: `จัดเตรียมชุดร้านสาธิต ${RUN_ID}`, must_change_password: true, email_order_notifications: false }, { email: credential.email, role: "merchant", store_id: storeId });
    await ensureDocument(Store, { _id: storeId, client_id: `catalogue-${RUN_ID}-${store.slug}`, owner_id: userId, name: store.name,
      description: store.description, address: { detail: "ศูนย์อาหาร MealQ · ร้านสาธิต", province: "ชลบุรี" },
      logo: store.logo, cover_image: store.banner, status: "pending", is_open: false,
      status_note: `จัดเตรียมชุดร้านสาธิต ${RUN_ID}`, opening_hours: { automatic: false, open_time: "09:00", close_time: "21:00" }, queue: { max_queue: 50 } }, { client_id: `catalogue-${RUN_ID}-${store.slug}`, owner_id: userId });
    for (const menu of store.menus) {
      const menuId = stableId("menu", `${store.slug}:${menu.slug}`), ingredientId = stableId("ingredient", `${store.slug}:${menu.slug}`);
      await ensureDocument(Ingredient, { _id: ingredientId, store_id: storeId, name: `โควตาจำลอง ${menu.name}`, quantity: 100, unit: "ที่", low_stock_threshold: 10, is_active: true }, { store_id: storeId, name: `โควตาจำลอง ${menu.name}` });
      await ensureDocument(Menu, { _id: menuId, client_id: `catalogue-${RUN_ID}-${store.slug}-${menu.slug}`, store_id: storeId,
        name: menu.name, description: menu.description, cuisine: menu.cuisine, category: menu.category, price: menu.price, image: menu.image,
        ingredients: [{ ingredient_id: ingredientId, quantity: 1, unit: "ที่" }], option_groups: menu.optionGroups, cook_time: menu.cookTime, is_available: false },
      { store_id: storeId, client_id: `catalogue-${RUN_ID}-${store.slug}-${menu.slug}` });
    }
  }
  await assertStagedCatalogue();
  marker(workDir, "prepared", { counts: { users: 6, stores: 6, menus: 48, ingredients: 48 }, targetArchiveSha256: plan.archiveSha256 });
  return { ok: true, phase: "prepared", runId: RUN_ID, targetCounts: plan.targetCounts, credentialFile, staged: { users: 6, stores: 6, menus: 48, ingredients: 48 } };
}

async function cancelForReset(orderId) {
  let order = await Order.findById(orderId);
  if (!order || order.status === "completed") return;
  if (order.status !== "cancelled") {
    const at = new Date();
    order = await Order.findOneAndUpdate({ _id: orderId, status: { $in: ["pending", "confirmed", "preparing", "ready"] } }, {
      $set: { status: "cancelled", cancelled_reason: RESET_REASON, cancelled_by: "admin", cancelled_at: at, notification_pending: false },
      $push: { notification_events: { status: "cancelled", at, payment_status: order.payment_status, cancelled_by: "admin" } },
    }, { returnDocument: "after" });
  }
  if (order) {
    const settled = await require("../src/services/checkout-recovery").compensate(order, RESET_REASON);
    if (settled?.cancelled_reason === RESET_REASON && settled.cancelled_by === "admin") {
      // Keep inbox/outbox history, but do not send a stale "ready" message after
      // the maintenance cancellation. The API/workers must already be stopped.
      await Notification.collection.updateMany({ order_id: String(orderId), push_sent: { $ne: true } }, { $set: { push_sent: true, push_skipped_reason: "CATALOGUE_RESET" } });
      await EmailOutbox.updateMany({ order_id: orderId, status: { $in: ["pending", "sending", "failed"] } }, { $set: { status: "skipped", lease_until: null, lease_id: null, last_error_code: "CATALOGUE_RESET" } });
    }
  }
}

async function apply({ workDir, backupProof, assetRoot, cancelActive = false }) {
  await assertMaintenance(); assertAssets(assetRoot);
  const plan = read(path.join(workDir, "plan.json"));
  assert.equal(plan.runId, RUN_ID); assert.equal(plan.manifestHash, manifestHash); assert.equal(plan.database, mongoose.connection.name);
  const targetFile = path.join(workDir, "targets.ejson");
  assert.equal(digest(fs.readFileSync(targetFile)), plan.archiveSha256, "Target archive checksum mismatch");
  const { targets } = read(targetFile);
  const startedFile = path.join(workDir, "apply-started.json");
  if (!fs.existsSync(startedFile)) {
    assert.ok(fs.existsSync(path.join(workDir, "prepared.json")), "Complete prepare before apply");
    await assertStagedCatalogue();
    const current = await captureTargets();
    for (const key of Object.keys(models)) assert.equal(digest(current[key]), digest(targets[key]), `Old ${key} changed after capture; stop and review before deleting`);
    assert.ok(cancelActive || !current.orders.some((row) => !["completed", "cancelled"].includes(row.status) || row.checkout_completed === false), "Active orders require explicit --cancel-active");
    assert.equal(digest(await User.collection.find({ _id: { $in: plan.protectedUserIds } }).sort({ _id: 1 }).toArray()), plan.protectedUsersHash, "Customer/admin accounts changed since preparation");
    marker(workDir, "apply-started", { backupProof, targetArchiveSha256: plan.archiveSha256, cancelActive });
  }
  const started = read(startedFile);
  assert.ok(cancelActive || !started.cancelActive, "Resuming a cancelling run still requires --cancel-active");

  // Preserve store identity before populate can lose a deleted store reference.
  for (const store of targets.stores) await Order.updateMany({ store_id: store._id }, { $set: { store_snapshot: snapshotStore(store) } }, { timestamps: false });
  for (const promotion of targets.promotions) {
    const store = targets.stores.find((row) => String(row._id) === String(promotion.store_id));
    await CustomerCoupon.updateMany({ promotion_id: promotion._id }, { $set: { snapshot: publicPromotionView(promotion, store) } });
  }
  for (const order of targets.orders) {
    if (order.status === "completed") continue;
    const fresh = await Order.findById(order._id);
    if (fresh && !["completed", "cancelled"].includes(fresh.status)) assert.ok(cancelActive, "Refuse active order without cancellation flag");
    await cancelForReset(order._id);
  }
  assert.equal(await Order.countDocuments({ store_id: { $in: ids(targets.stores) }, $or: [{ status: { $nin: ["completed", "cancelled"] } }, { checkout_completed: false }] }), 0, "An old checkout/order is still active");
  await Queue.updateMany({ _id: { $in: ids(targets.queues) }, status: { $in: ["waiting", "preparing", "ready"] } }, { $set: { status: "cancelled" } });
  marker(workDir, "old-orders-settled", { preservedOrderCount: targets.orders.length, preservedQueueCount: targets.queues.length });

  // An additional immutable archive captures post-compensation state immediately
  // before deleting catalogue/account rows. Never delete collections wholesale.
  if (!fs.existsSync(path.join(workDir, "before-delete.ejson"))) {
    const collections = {};
    for (const [key, model] of Object.entries(models)) collections[key] = await model.collection.find({ _id: { $in: ids(targets[key]) } }).sort({ _id: 1 }).toArray();
    collections.orders = await Order.collection.find({ _id: { $in: ids(targets.orders) } }).sort({ _id: 1 }).toArray();
    collections.queues = await Queue.collection.find({ _id: { $in: ids(targets.queues) } }).sort({ _id: 1 }).toArray();
    collections.notifications = await Notification.collection.find({ _id: { $in: ids(targets.notifications) } }).sort({ _id: 1 }).toArray();
    collections.emailOutbox = await EmailOutbox.collection.find({ _id: { $in: ids(targets.emailOutbox) } }).sort({ _id: 1 }).toArray();
    writeNew(path.join(workDir, "before-delete.ejson"), { runId: RUN_ID, at: new Date(), collections });
  }
  const deleteArchive = read(path.join(workDir, "before-delete.ejson"));
  assert.equal(deleteArchive.runId, RUN_ID, "Pre-delete archive is invalid");
  for (const key of Object.keys(models)) assert.deepEqual(ids(deleteArchive.collections[key]).map(String), ids(targets[key]).map(String), `Pre-delete ${key} archive is incomplete`);
  const deleteKeys = ["pushSubscriptions", "emailChanges", "pendingRegistrations", "promotions", "menus", "ingredients", "stores", "users"];
  for (const key of deleteKeys) {
    const query = { _id: { $in: ids(targets[key]) } };
    if (key === "users") query.role = { $in: ["merchant", "staff"] };
    const result = await models[key].deleteMany(query);
    marker(workDir, `removed-${key}`, { count: result.deletedCount, targetIds: ids(targets[key]) });
  }
  marker(workDir, "old-catalogue-removed", { targetCounts: plan.targetCounts });
  await User.updateMany({ _id: { $in: preparedIds.users }, role: "merchant" }, { $set: { status: "active", status_note: `บัญชีร้านสาธิต ${RUN_ID}` } });
  await Menu.updateMany({ _id: { $in: preparedIds.menus } }, { $set: { is_available: true } });
  await Store.updateMany({ _id: { $in: preparedIds.stores } }, { $set: { status: "active", status_note: `ร้านสาธิตได้รับอนุมัติโดยผู้ดูแล ${RUN_ID}`, is_open: true } });
  const result = await verify({ workDir, assetRoot });
  marker(workDir, "applied", result);
  return { ...result, phase: "applied" };
}

async function verify({ workDir, assetRoot }) {
  validateManifest(); const assetCount = assertAssets(assetRoot);
  const plan = read(path.join(workDir, "plan.json"));
  assert.equal(plan.manifestHash, manifestHash); assert.equal(plan.database, mongoose.connection.name);
  const { targets } = read(path.join(workDir, "targets.ejson"));
  const storeRows = await Store.find().lean(); assert.equal(storeRows.length, 6);
  assert.equal(await User.countDocuments({ role: { $in: ["merchant", "staff"] } }), 6);
  assert.equal(await Menu.countDocuments(), 48); assert.equal(await Ingredient.countDocuments(), 48);
  for (const store of stores) {
    const row = storeRows.find((value) => String(value._id) === String(stableId("store", store.slug))); assert.ok(row);
    assert.equal(row.name, store.name); assert.equal(row.status, "active"); assert.equal(row.is_open, true);
    assert.equal(row.logo, store.logo); assert.equal(row.cover_image, store.banner);
    const owner = await User.findById(stableId("user", store.slug));
    assert.ok(owner && owner.status === "active" && owner.role === "merchant" && String(owner.store_id) === String(row._id));
    assert.equal(owner.email_order_notifications, false);
    const menus = await Menu.find({ store_id: row._id }).lean(); assert.equal(menus.length, 8);
    for (const dish of store.menus) {
      const menu = menus.find((value) => value.client_id === `catalogue-${RUN_ID}-${store.slug}-${dish.slug}`); assert.ok(menu);
      assert.equal(menu.name, dish.name); assert.equal(menu.category, dish.category); assert.equal(menu.cuisine, store.cuisine);
      assert.equal(menu.price, dish.price); assert.equal(menu.image, dish.image); assert.equal(menu.is_available, true);
      assert.equal(menu.ingredients.length, 1); assert.equal(menu.ingredients[0].quantity, 1);
    }
  }
  assert.equal(digest(await User.collection.find({ _id: { $in: plan.protectedUserIds } }).sort({ _id: 1 }).toArray()), plan.protectedUsersHash, "Customer/admin accounts were modified");
  assert.equal(await Order.countDocuments({ _id: { $in: plan.orderIds } }), plan.orderIds.length, "Historical order was deleted");
  assert.equal(await Queue.countDocuments({ _id: { $in: plan.queueIds } }), plan.queueIds.length, "Historical queue was deleted");
  assert.equal(await CustomerCoupon.countDocuments({ _id: { $in: ids(targets.customerCoupons) } }), targets.customerCoupons.length, "Saved coupon history was deleted");
  assert.equal(await Notification.countDocuments({ _id: { $in: plan.notificationIds } }), plan.notificationIds.length, "Inbox history was deleted");
  assert.equal(await EmailOutbox.countDocuments({ _id: { $in: plan.emailOutboxIds } }), plan.emailOutboxIds.length, "Email history was deleted");
  for (const key of ["users", "stores", "menus", "ingredients", "promotions", "pushSubscriptions", "emailChanges", "pendingRegistrations"]) assert.equal(await models[key].countDocuments({ _id: { $in: ids(targets[key]) } }), 0, `Old ${key} remains`);
  assert.equal(await Order.countDocuments({ _id: { $in: plan.orderIds }, $or: [{ status: { $nin: ["completed", "cancelled"] } }, { checkout_completed: false }] }), 0);
  return { ok: true, runId: RUN_ID, stores: 6, merchants: 6, menus: 48, assets: assetCount, cuisines: stores.map((store) => store.cuisine),
    historicalOrdersPreserved: plan.orderIds.length, historicalQueuesPreserved: plan.queueIds.length, savedCouponsPreserved: targets.customerCoupons.length,
    archiveSha256: plan.archiveSha256, noOutboundMessageCalls: true };
}

module.exports = { RUN_ID, manifestHash, preparedIds, stableId, validateManifest, preview, prepare, apply, verify, digest, read, writeNew, RESET_REASON };
