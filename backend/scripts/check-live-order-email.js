/*
 * GATED production acceptance: sends four order emails ONLY to the human's
 * explicitly authorized Gmail plus-aliases. Do not run during local test suites.
 * Root must verify a fresh host backup, then supply every confirmation below.
 * No production account/store is edited and no fixture or file is deleted.
 */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const Order = require("../src/models/Order");
const Outbox = require("../src/models/EmailOutbox");
const { hashPassword } = require("../src/services/password");

const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
const suffix = `${stamp.toLowerCase()}-${crypto.randomBytes(3).toString("hex")}`;
const label = `DEMO Email Acceptance ${suffix}`;
const base = "http://127.0.0.1:5000/api/v1";
const users = [];
let storeId, order, privateFile;
const report = { label, at: new Date().toISOString(), ok: false };

function client() {
  let cookie = "";
  return async (method, route, body, expected = 200, key) => {
    const response = await fetch(base + route, { method, headers: { Origin: "https://mealq.site", Cookie: cookie, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
    for (const value of response.headers.getSetCookie()) if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
    return data;
  };
}
const customer = client(); const merchant = client(); const admin = client();
async function waitFor(check, message, timeout = 20000) {
  const until = Date.now() + timeout;
  do { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 100)); } while (Date.now() < until);
  assert.fail(message);
}
async function fixtureDeliveryStatus() {
  // Read only this fixture's receipts; the normal background worker delivers.
  // Never invoke a shared dispatcher from this acceptance script.
  return Outbox.find({ order_id: order.id }).select("event role status attempts last_error_code").lean();
}

async function run() {
  assert.equal(process.env.MEALQ_LIVE_ORDER_EMAIL, "CONFIRM_4_EMAILS_TO_OWNED_GMAIL");
  const ownerGmail = process.env.MEALQ_ALLOWED_GMAIL || "";
  assert.match(ownerGmail, /^[a-z0-9](?:[a-z0-9.]{0,62}[a-z0-9])?@gmail\.com$/, "Supply the explicitly authorized primary Gmail mailbox in lowercase, without a plus tag");
  assert.equal(ownerGmail.includes(".."), false);
  assert.equal(process.env.MEALQ_CONFIRM_GMAIL, ownerGmail, "Confirm the exact owned Gmail allowlist a second time");
  assert.equal(process.env.NODE_ENV, "production");
  const backup = process.env.MEALQ_ACCEPTANCE_BACKUP || "";
  const match = backup.match(/^\/home\/linapspi4\/mealq-app\/shared\/backups\/mealq-[a-z0-9-]+-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.archive\.gz$/);
  assert.ok(match, "Supply a verified, fresh timestamped host MongoDB backup path");
  const backupAt = Date.UTC(...match.slice(1).map((value, index) => Number(value) - (index === 1 ? 1 : 0)));
  assert.ok(Date.now() - backupAt >= 0 && Date.now() - backupAt <= 15 * 60000, "Backup must be from the last 15 minutes");
  privateFile = process.env.MEALQ_DEMO_CREDENTIAL_FILE;
  assert.match(privateFile || "", /^\/tmp\/mealq-live-order-email-\d{8}T\d{6}Z\.json$/);
  await mongoose.connect(process.env.MONGO_URI);
  assert.equal(mongoose.connection.name, "mealq");
  const capabilities = await client()("GET", "/auth/capabilities");
  assert.equal(capabilities.email, true); assert.equal(capabilities.paymentMode, "sandbox");

  const planned = ["customer", "merchant", "admin"].map((role) => ({ id: String(new mongoose.Types.ObjectId()), role, email: `${ownerGmail.split("@")[0]}+mealq-${role}-${suffix}@gmail.com`, password: `MealQ-${crypto.randomBytes(20).toString("base64url")}9!` }));
  for (const row of planned) assert.equal(row.email.replace(/\+[^@]+(?=@)/, ""), ownerGmail);
  fs.writeFileSync(privateFile, JSON.stringify({ website: "https://mealq.site", label, backup, accounts: planned.filter((row) => row.role !== "admin"), note: "Temporary admin password is never retained. After the human confirms both roles' email, disable emailOrders on these two demo accounts. Do not publish this file." }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  report.credentials = privateFile;
  for (const row of planned) {
    const user = await User.create({ _id: row.id, name: `${label} ${row.role}`, email: row.email, role: row.role, status: "active", email_verified_at: new Date(), password_hash: await hashPassword(row.password), status_note: "Owned Gmail plus-alias production acceptance fixture" });
    users.push(user);
    await ({ customer, merchant, admin }[row.role])("POST", "/auth/login", { email: row.email, password: row.password, portal: row.role });
  }
  const owner = users.find((user) => user.role === "merchant");
  storeId = String((await Store.findOne({ owner_id: owner._id }))._id);
  report.storeId = storeId;
  await admin("PATCH", `/admin/stores/${storeId}`, { status: "active" });
  await merchant("PATCH", "/merchant/store", { name: label, description: "DEMO ONLY: four order-notification emails to the owner's Gmail aliases; no real food or payment.", isOpen: true, maxQueue: 3 });
  const ingredient = (await merchant("POST", "/merchant/inventory", { name: "DEMO email test portions", quantity: 10, unit: "portion" }, 201)).ingredient;
  report.ingredientId = ingredient.id;
  const menu = (await merchant("POST", "/merchant/menu", { name: "DEMO email test dish", price: 10, category: "single", isAvailable: true, ingredients: [{ ingredientId: ingredient.id, quantity: 1, unit: "portion" }] }, 201)).menu;
  await customer("PATCH", "/auth/notification-preferences", { emailOrders: true });
  await merchant("PATCH", "/auth/notification-preferences", { emailOrders: true });
  await customer("POST", "/customer/wallet/topup", { amount: 100 }, 201, `owned-email-topup-${suffix}`);
  order = (await customer("POST", "/orders", { items: [{ menuId: menu.id, quantity: 1 }], paymentMethod: "wallet" }, 201, `owned-email-order-${suffix}`)).order;
  report.orderId = order.id;
  await waitFor(async () => await Outbox.countDocuments({ order_id: order.id }) === 2, "Expected only the customer-paid and merchant-new fixture jobs");
  await waitFor(async () => await Outbox.countDocuments({ order_id: order.id, status: "sent" }) === 2, "Background worker has not confirmed the first two fixture emails", 60000);
  await customer("PATCH", `/orders/${order.id}/cancel`, { reason: "DEMO owned-Gmail order email acceptance" });
  await waitFor(async () => await Outbox.countDocuments({ order_id: order.id }) === 4, "Expected customer and merchant cancellation fixture jobs");
  await waitFor(async () => await Outbox.countDocuments({ order_id: order.id, status: "sent" }) === 4, "Background worker has not confirmed all four fixture emails", 60000);
  report.ok = true; report.backup = backup; report.orderId = order.id; report.storeId = storeId;
  report.delivery = await fixtureDeliveryStatus();
  report.credentials = privateFile;
  report.recipients = planned.filter((row) => row.role !== "admin").map(({ role, email }) => ({ role, email }));
  report.followup = "Ask the owner to confirm Gmail receipt for both roles, then turn emailOrders off on these two fixtures. SMTP acceptance is not proof of inbox receipt.";
}

(async () => {
  try { await run(); }
  catch (error) { report.error = error.message; process.exitCode = 1; }
  finally {
    try {
      if (mongoose.connection.readyState === 1) {
        if (!report.ok && order && storeId) {
          const unfinished = await Order.findOne({ _id: order.id, store_id: storeId, customer_id: users.find((user) => user.role === "customer")?._id, status: { $in: ["pending", "confirmed"] }, checkout_completed: { $ne: false } });
          if (unfinished) {
            try {
              await customer("PATCH", `/orders/${order.id}/cancel`, { reason: "DEMO email acceptance recovery after interrupted check" });
              report.recoveryCancellation = "Own fixture order cancelled through the normal customer API; demo refund and at most the two intended cancellation emails queued";
            } catch {
              report.manualRecoveryRequired = "The fixture order remains unfinished. Review only the reported store/order/account IDs, cancel through the authorized normal API and inspect its four expected email receipts before retrying.";
            }
          }
        }
        if (order) report.delivery = await fixtureDeliveryStatus();
        if (storeId) await Store.updateOne({ _id: storeId, owner_id: users.find((user) => user.role === "merchant")?._id, name: label }, { $set: { is_open: false, status_note: "DEMO email acceptance complete; manually closed" } });
        const temporaryAdmin = users.find((user) => user.role === "admin");
        if (temporaryAdmin) await User.updateOne({ _id: temporaryAdmin._id, name: `${label} admin` }, { $set: { status: "suspended", status_note: "Temporary acceptance administrator disabled" }, $inc: { session_version: 1 } });
        for (const user of users.filter((row) => row.role !== "admin")) await User.updateOne({ _id: user._id, name: `${label} ${user.role}` }, { $inc: { session_version: 1 } });
      }
    } catch (error) { report.safeguardError = error.message; process.exitCode = 1; }
    await mongoose.disconnect();
    console.log("MEALQ_LIVE_ORDER_EMAIL_REPORT=" + JSON.stringify(report));
  }
})();
