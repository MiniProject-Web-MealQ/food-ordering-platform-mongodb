// Explicit production seed: add one administrator and reuse the approved demo
// merchant. Never reset existing passwords, run the catalogue seed or delete data.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const { hashPassword, verifyPassword } = require("../src/services/password");

const merchantId = "6ad604078f01f377ac06e76c";
const storeId = "6ad60407ffd68e1d1562b4f3";
const adminEmail = "demo-admin-20261019@mealq.invalid";
const adminName = "DEMO Administrator 20261019";
const newAdminId = new mongoose.Types.ObjectId();
const digest = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
let created = false;

function client() {
  let cookie = "";
  return async (method, route, body, expected = 200) => {
    const response = await fetch(`http://127.0.0.1:5000/api/v1${route}`, {
      method,
      headers: { Origin: "https://mealq.site", "Content-Type": "application/json", Cookie: cookie },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    for (const value of response.headers.getSetCookie()) {
      if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
    }
    assert.equal(response.status, expected, `${method} ${route} returned ${response.status}`);
    return response.json();
  };
}

async function run() {
  assert.equal(process.env.MEALQ_SEED_ACCESS, "CREATE_ADMIN_REUSE_APPROVED_DEMO_MERCHANT");
  assert.equal(process.env.NODE_ENV, "production");
  const backup = process.env.MEALQ_SEED_BACKUP || "";
  const match = backup.match(/^\/home\/linapspi4\/mealq-app\/shared\/backups\/mealq-before-demo-access-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.archive\.gz$/);
  assert.ok(match, "A verified timestamped host backup is required");
  const backupAt = Date.UTC(...match.slice(1).map((value, index) => Number(value) - (index === 1 ? 1 : 0)));
  assert.ok(Date.now() >= backupAt && Date.now() - backupAt < 15 * 60000, "Backup must be less than 15 minutes old");
  const source = process.env.MEALQ_EXISTING_DEMO_FILE || "";
  const output = process.env.MEALQ_SEED_CREDENTIAL_FILE || "";
  assert.match(source, /^\/tmp\/mealq-existing-demo-\d{8}T\d{6}Z\.json$/);
  assert.match(output, /^\/tmp\/mealq-demo-access-\d{8}T\d{6}Z\.json$/);
  assert.equal(fs.statSync(source).mode & 0o077, 0, "Existing credentials must be private");
  const merchantCredential = JSON.parse(fs.readFileSync(source, "utf8")).accounts.find((row) => row.role === "merchant");
  assert.ok(merchantCredential);
  assert.equal(merchantCredential.userId || merchantCredential.id, merchantId);
  assert.equal(merchantCredential.email, "demo-merchant-20261019@mealq.invalid");
  assert.equal(typeof merchantCredential.password, "string");

  await mongoose.connect(process.env.MONGO_URI);
  assert.equal(mongoose.connection.name, "mealq");
  assert.equal(await User.exists({ email: adminEmail }), null, "Refuse to overwrite an existing administrator");
  const merchant = await User.findOne({ _id: merchantId, role: "merchant", status: "active", email: merchantCredential.email });
  assert.ok(merchant && merchant.name.startsWith("DEMO Acceptance "));
  assert.ok(await verifyPassword(merchantCredential.password, merchant.password_hash), "Existing merchant password no longer matches; do not reset it");
  const store = await Store.findOne({ _id: storeId, owner_id: merchantId, status: "active" });
  assert.ok(store && store.name.startsWith("DEMO Acceptance "));
  const adminsBefore = digest(await User.find({ role: "admin" }).sort({ _id: 1 }).lean());
  const merchantBefore = digest(merchant.toObject());
  const storeBefore = digest({ name: store.name, owner: String(store.owner_id), status: store.status, isOpen: store.is_open, hours: store.opening_hours.toObject() });
  const password = `MealQ-${crypto.randomBytes(24).toString("base64url")}9!`;
  const credentials = {
    website: "https://mealq.site", createdAt: new Date().toISOString(), backup,
    store: { id: storeId, name: store.name, status: store.status, manualOpen: store.is_open, automaticHoursEnabled: Boolean(store.opening_hours.automatic), automaticHours: `${store.opening_hours.open_time || "unset"}–${store.opening_hours.close_time || "unset"} Asia/Bangkok` },
    accounts: [
      { role: "admin", userId: String(newAdminId), email: adminEmail, password, loginUrl: "https://mealq.site/admin/login", mustChangePassword: true },
      { role: "merchant", userId: merchantId, email: merchant.email, password: merchantCredential.password, loginUrl: "https://mealq.site/merchant/login", mustChangePassword: Boolean(merchant.must_change_password) },
    ],
    notes: ["Administrator must set a new personal password on first login. The saved initial password then stops working.", "Merchant password, store approval, schedule, stock and manual-open state are preserved.", "Reserved .invalid identifiers cannot receive OTP or reset mail. Keep this file private; never commit or publish it."],
  };
  fs.writeFileSync(output, JSON.stringify(credentials, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  await User.create({ _id: newAdminId, name: adminName, email: adminEmail, role: "admin", status: "active", must_change_password: true, password_hash: await hashPassword(password), status_note: "Administrator explicitly requested by project owner; first-login password change required" });
  created = true;

  const admin = client();
  const adminLogin = await admin("POST", "/auth/login", { email: adminEmail, password, portal: "admin" });
  assert.equal(adminLogin.user.id, String(newAdminId));
  assert.equal(adminLogin.user.mustChangePassword, true);
  const adminState = await admin("GET", "/admin/state");
  assert.equal(adminState.session.user_id, String(newAdminId));
  assert.equal(adminState.session.must_change_password, true);
  const gate = await admin("GET", "/admin/settings", undefined, 403);
  assert.equal(gate.error?.code || gate.code, "PASSWORD_CHANGE_REQUIRED");
  await admin("POST", "/auth/logout");
  await User.updateOne({ _id: newAdminId, email: adminEmail, name: adminName, role: "admin" }, { $inc: { session_version: 1 } });

  const merchantClient = client();
  const merchantLogin = await merchantClient("POST", "/auth/login", { email: merchant.email, password: merchantCredential.password, portal: "merchant" });
  assert.equal(merchantLogin.user.id, merchantId);
  assert.equal(merchantLogin.store.id, storeId);
  const merchantStore = await merchantClient("GET", "/merchant/store");
  assert.equal(merchantStore.store.id, storeId);
  await merchantClient("POST", "/auth/logout");
  assert.equal(digest(await User.find({ role: "admin", _id: { $ne: newAdminId } }).sort({ _id: 1 }).lean()), adminsBefore, "Existing administrators changed");
  assert.equal(digest((await User.findById(merchantId)).toObject()), merchantBefore, "Existing merchant changed");
  const afterStore = await Store.findById(storeId);
  assert.equal(digest({ name: afterStore.name, owner: String(afterStore.owner_id), status: afterStore.status, isOpen: afterStore.is_open, hours: afterStore.opening_hours.toObject() }), storeBefore, "Existing store settings changed");
  console.log(JSON.stringify({ ok: true, credentialFile: output, admin: { userId: String(newAdminId), email: adminEmail, mustChangePassword: true }, merchant: { userId: merchantId, email: merchant.email, reused: true }, storeId, existingAccountsUnchanged: true, loginChecks: "admin and merchant HTTP 200; administrator first-password gate HTTP 403 verified" }));
}

run().catch(async (error) => {
  let createdAdminSuspended = false;
  if (created) {
    try {
      const result = await User.updateOne({ _id: newAdminId, email: adminEmail, name: adminName, role: "admin" }, { $set: { status: "suspended", status_note: "Seed verification failed; retained for owner review" }, $inc: { session_version: 1 } });
      createdAdminSuspended = result.acknowledged === true && result.matchedCount === 1;
    } catch { /* The report below explicitly flags unconfirmed suspension. */ }
  }
  console.error(JSON.stringify({ ok: false, error: error.message, createdAdminSuspended, manualReviewRequired: created && !createdAdminSuspended, credentialFile: process.env.MEALQ_SEED_CREDENTIAL_FILE || null }));
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
