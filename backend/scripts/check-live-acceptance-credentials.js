// Publish private credentials only for a completed, explicitly identified DEMO run.
// The credential file is written before password/status changes and is never printed.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const { hashPassword } = require("../src/services/password");

(async () => {
  try {
    assert.equal(process.env.MEALQ_ENABLE_DEMO_ACCOUNTS, "confirm-fixture-only");
    assert.match(process.env.MEALQ_ACCEPTANCE_BACKUP || "", /^\/home\/linapspi4\/mealq-app\/shared\/backups\/mealq-before-live-acceptance-\d{8}T\d{6}Z\.archive\.gz$/);
    const ids = { customer: process.env.MEALQ_DEMO_CUSTOMER_ID, merchant: process.env.MEALQ_DEMO_MERCHANT_ID };
    const storeId = process.env.MEALQ_DEMO_STORE_ID;
    for (const id of [...Object.values(ids), storeId]) assert.match(id || "", /^[a-f0-9]{24}$/);
    const output = process.env.MEALQ_DEMO_CREDENTIAL_FILE;
    assert.match(output || "", /^\/tmp\/mealq-demo-credentials-\d{8}T\d{6}Z\.json$/);
    await mongoose.connect(process.env.MONGO_URI);
    assert.equal(mongoose.connection.name, "mealq");
    const store = await Store.findOne({ _id: storeId, owner_id: ids.merchant });
    assert.ok(store && store.name.startsWith("DEMO Acceptance "));
    const credentials = [];
    for (const role of ["customer", "merchant"]) {
      const user = await User.findOne({ _id: ids[role], role });
      assert.ok(user && user.name.startsWith("DEMO Acceptance ") && /^acceptance-(customer|merchant)-[a-z0-9-]+@mealq\.invalid$/.test(user.email), "Only this completed run's labelled acceptance accounts can be enabled");
      const email = `demo-${role}-20261019@mealq.invalid`;
      const existing = await User.findOne({ email });
      assert.ok(!existing || String(existing._id) === ids[role], "Refuse to replace an existing account");
      credentials.push({ role, userId: ids[role], email, password: `MealQ-${crypto.randomBytes(18).toString("base64url")}9!` });
    }
    const info = { website: "https://mealq.site", createdAt: new Date().toISOString(), backup: process.env.MEALQ_ACCEPTANCE_BACKUP, store: { id: storeId, name: store.name, manualOpen: false, automaticHours: "09:00–21:00 Asia/Bangkok" }, accounts: credentials, notes: ["These reserved .invalid emails are login identifiers for demo accounts and cannot receive OTP/reset mail.", "Customer wallet has demo money only; customer can self top up.", "Merchant is approved; open the demo store manually in store settings to test sales.", "The temporary acceptance administrator stays suspended; existing administrators are unchanged.", "Keep this file private. Do not commit, publish or bundle it into frontend assets."] };
    fs.writeFileSync(output, JSON.stringify(info, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    for (const row of credentials) {
      const passwordHash = await hashPassword(row.password);
      const updated = await User.updateOne({ _id: row.userId, role: row.role, name: /^DEMO Acceptance / }, { $set: { email: row.email, password_hash: passwordHash, status: "active", status_note: "Reusable DEMO account — acceptance only; no real money" }, $inc: { session_version: 1 } });
      assert.equal(updated.matchedCount, 1);
      const response = await fetch("http://127.0.0.1:5000/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://mealq.site" }, body: JSON.stringify({ email: row.email, password: row.password, portal: row.role }), signal: AbortSignal.timeout(10000) });
      const payload = await response.json();
      assert.equal(response.status, 200, `DEMO ${row.role} login failed`);
      assert.equal(payload.user.id, row.userId);
      // Revoke the verification cookie; credentials remain usable for the human tester.
      await User.updateOne({ _id: row.userId }, { $inc: { session_version: 1 } });
    }
    console.log(JSON.stringify({ ok: true, credentialFile: output, accounts: credentials.map(({ role, email, userId }) => ({ role, email, userId })), storeId, manuallyClosed: !store.is_open, existingActiveAdminCount: await User.countDocuments({ role: "admin", status: "active", name: { $not: /^DEMO Acceptance / } }) }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
