// Explicit, two-phase production replacement. This is never imported by startup.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const replacement = require("./catalogue-replacement");

async function run() {
  const phase = process.argv[2];
  assert.ok(["preview", "prepare", "apply", "verify"].includes(phase), "Use preview, prepare, apply or verify");
  assert.equal(process.env.NODE_ENV, "production");
  assert.equal(process.env.PAYMENT_MODE, "demo", "Demo catalogue only");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  assert.equal(mongoose.connection.name, "mealq", "Refuse an unexpected production database");
  if (phase === "preview") { console.log(JSON.stringify(await replacement.preview())); return; }
  assert.equal(process.env.MEALQ_CATALOGUE_GUARD, `REPLACE_ALL_MERCHANTS_STORES_MENUS:${replacement.RUN_ID}`);
  const workDir = process.env.MEALQ_CATALOGUE_WORKDIR;
  assert.ok(/^\/safety\/catalogue-reset-\d{8}T\d{6}Z$/.test(workDir || ""), "Use an explicit private safety directory");
  const assetRoot = process.env.MEALQ_CATALOGUE_ASSET_ROOT;
  let backupProof = null;
  if (phase !== "verify") {
    assert.equal(process.env.MEALQ_API_STOPPED, "YES", "Operator must stop MealQ API/workers before mutation");
    const file = process.env.MEALQ_CATALOGUE_BACKUP;
    assert.ok(/^\/safety\/[A-Za-z0-9_+./-]+\.archive\.gz$/.test(file || ""));
    assert.ok(path.resolve(file).startsWith("/safety/"), "Backup must be mounted in /safety");
    const stat = fs.statSync(file);
    assert.ok(stat.size > 100 && Date.now() - stat.mtimeMs >= 0 && Date.now() - stat.mtimeMs < 60 * 60000, "Backup must be fresh (under one hour)");
    const bytes = fs.readFileSync(file);
    assert.equal(bytes[0], 0x1f); assert.equal(bytes[1], 0x8b);
    const expected = process.env.MEALQ_CATALOGUE_BACKUP_SHA256;
    assert.match(expected || "", /^[a-f0-9]{64}$/);
    assert.equal(replacement.digest(bytes), expected, "Full Mongo archive checksum failed");
    backupProof = { file, sha256: expected, bytes: stat.size, verifiedAt: new Date() };
  }
  const options = { workDir, backupProof, assetRoot, cancelActive: process.argv.includes("--cancel-active") };
  console.log(JSON.stringify(await replacement[phase](options)));
}

run().catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message, code: error.code || null, recovery: "Keep API stopped; preserve /safety archives and resume the same prepared run or restore the verified full snapshot. Never rerun the default seed." })); process.exitCode = 1; }).finally(() => mongoose.disconnect());
