"use strict";

// Mechanical derivatives only: preserve framing, colours and the original PNGs.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { RUN_ID, stores } = require("../../backend/scripts/catalogue-v2-manifest.js");

const WORKSPACE = path.resolve(__dirname, "../..");
const SOURCE_ROOT = path.join(WORKSPACE, "output", "imagegen", `catalogue-${RUN_ID}`);
const PUBLIC_ROOT = path.join(WORKSPACE, "frontend", "public");
const QUALITY = 82;
const LIMITS = { logo: 384, banner: 1600, menu: 720 };
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const relative = (file) => path.relative(WORKSPACE, file).split(path.sep).join("/");

function assetPlan() {
  const assets = stores.flatMap((store) => [
    { store: store.slug, slug: "logo", kind: "logo", url: store.logo },
    { store: store.slug, slug: "banner", kind: "banner", url: store.banner },
    ...store.menus.map((menu) => ({ store: store.slug, slug: menu.slug, kind: "menu", url: menu.image })),
  ]);
  if (stores.length !== 6 || stores.some((store) => store.menus.length !== 8) || assets.length !== 60) {
    throw new Error("Catalogue must define 6 stores, 8 menus per store, and 60 image assets");
  }
  if (new Set(stores.map((store) => store.slug)).size !== 6 || new Set(assets.map((asset) => asset.url)).size !== 60) {
    throw new Error("Catalogue store slugs and image references must be unique");
  }
  for (const asset of assets) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.store) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.slug)) {
      throw new Error("Catalogue asset slug is unsafe");
    }
    const expected = `/catalogue/${RUN_ID}/${asset.store}/${asset.slug}.webp`;
    if (asset.url !== expected) throw new Error(`Unexpected image reference: ${asset.url}`);
    asset.source = path.join(SOURCE_ROOT, asset.store, `${asset.slug}.png`);
    asset.target = path.join(PUBLIC_ROOT, "catalogue", RUN_ID, asset.store, `${asset.slug}.webp`);
  }
  return assets;
}

async function isFile(file) {
  try { return (await fs.stat(file)).isFile(); }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

function loadSharp() {
  try { return require(process.env.MEALQ_SHARP_MODULE || "sharp"); }
  catch (error) {
    throw new Error("Sharp is unavailable. Set MEALQ_SHARP_MODULE to the existing bundled Sharp module; do not install dependencies automatically.", { cause: error });
  }
}

async function packageAssets({ allowPartial = false } = {}) {
  const assets = assetPlan();
  const missing = [];
  const available = [];
  for (const asset of assets) (await isFile(asset.source) ? available : missing).push(asset);
  if (missing.length && !allowPartial) {
    throw new Error(`Strict packaging requires all 60 originals; missing ${missing.length}: ${missing.map((asset) => `${asset.store}/${asset.slug}`).join(", ")}`);
  }
  if (!available.length) throw new Error("No PNG originals are available to package");

  const sharp = loadSharp();
  const stamp = new Date().toISOString().replace(/[-:.]/g, "");
  const batch = `${stamp}-${process.pid}-${crypto.randomBytes(3).toString("hex")}`;
  const records = [];
  for (const asset of available) {
    const sourceBytes = await fs.readFile(asset.source);
    const source = await sharp(sourceBytes).metadata();
    if (source.format !== "png" || !source.width || !source.height || (source.pages || 1) !== 1) {
      throw new Error(`Expected one still PNG image: ${relative(asset.source)}`);
    }
    const maxEdge = LIMITS[asset.kind];
    const { data, info } = await sharp(sourceBytes)
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });
    if (info.format !== "webp" || !info.width || !info.height || Math.max(info.width, info.height) > maxEdge) {
      throw new Error(`Invalid WebP derivative: ${asset.url}`);
    }
    const sourceSha256 = digest(sourceBytes);
    const outputSha256 = digest(data);
    let action = "created";
    let backup = null;
    if (await isFile(asset.target)) {
      const previous = await fs.readFile(asset.target);
      if (digest(previous) === outputSha256) action = "unchanged";
      else {
        const backupFile = path.join(SOURCE_ROOT, "derivative-backups", batch, asset.store, `${asset.slug}.webp`);
        await fs.mkdir(path.dirname(backupFile), { recursive: true });
        await fs.writeFile(backupFile, previous, { flag: "wx" });
        if (digest(await fs.readFile(backupFile)) !== digest(previous)) throw new Error("Derivative backup verification failed");
        backup = { path: relative(backupFile), bytes: previous.length, sha256: digest(previous) };
        action = "replaced-after-backup";
      }
    }
    if (action !== "unchanged") {
      await fs.mkdir(path.dirname(asset.target), { recursive: true });
      const stagedFile = `${asset.target}.${batch}.pending`;
      await fs.writeFile(stagedFile, data, { flag: "wx" });
      if (digest(await fs.readFile(stagedFile)) !== outputSha256) throw new Error("Staged derivative verification failed");
      await fs.rename(stagedFile, asset.target);
    }
    const verifiedOutput = await fs.readFile(asset.target);
    const verifiedImage = await sharp(verifiedOutput).metadata();
    if (digest(verifiedOutput) !== outputSha256 || verifiedImage.format !== "webp" || verifiedImage.width !== info.width || verifiedImage.height !== info.height) {
      throw new Error(`Saved image verification failed: ${asset.url}`);
    }
    if (digest(await fs.readFile(asset.source)) !== sourceSha256) throw new Error("Source changed while packaging; rerun with stable originals");
    records.push({
      store: asset.store, slug: asset.slug, kind: asset.kind, url: asset.url, action,
      source: { path: relative(asset.source), bytes: sourceBytes.length, sha256: sourceSha256, width: source.width, height: source.height },
      output: { path: relative(asset.target), bytes: data.length, sha256: outputSha256, width: info.width, height: info.height },
      ...(backup ? { backup } : {}),
    });
  }
  const complete = records.length === 60 && missing.length === 0;
  const report = {
    schemaVersion: 1, runId: RUN_ID, generatedAt: new Date().toISOString(), complete,
    mode: allowPartial ? "allow-partial" : "strict", expectedCount: 60, packagedCount: records.length,
    settings: { format: "webp", quality: QUALITY, fit: "inside", withoutEnlargement: true, maxEdge: LIMITS },
    missing: missing.map((asset) => ({ store: asset.store, slug: asset.slug, source: relative(asset.source) })), assets: records,
  };
  const manifestFile = path.join(SOURCE_ROOT, `web-assets${complete && !allowPartial ? "" : "-partial"}-${batch}.json`);
  await fs.mkdir(SOURCE_ROOT, { recursive: true });
  await fs.writeFile(manifestFile, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({
    complete, expected: 60, packaged: records.length, missing: missing.length,
    created: records.filter((record) => record.action === "created").length,
    unchanged: records.filter((record) => record.action === "unchanged").length,
    replacedAfterBackup: records.filter((record) => record.action === "replaced-after-backup").length,
    manifest: relative(manifestFile), outputBytes: records.reduce((sum, record) => sum + record.output.bytes, 0),
  }, null, 2));
  return report;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--allow-partial")) {
    console.error("Usage: node frontend/scripts/prepare-catalogue-assets.cjs [--allow-partial]");
    process.exitCode = 1;
  } else packageAssets({ allowPartial: args.includes("--allow-partial") }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { assetPlan, packageAssets };
