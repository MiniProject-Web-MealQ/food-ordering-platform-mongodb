import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pushPlatform } from "../src/features/customer/push-platform.js";
import { loadNotificationPreferences, saveNotificationPreferences } from "../src/features/customer/notification-preferences.js";

function browser(userAgent, standalone = false) {
  return { isSecureContext: true, PushManager: function PushManager() {}, Notification: { permission: "default" }, matchMedia: () => ({ matches: standalone }), navigator: { userAgent, serviceWorker: {} } };
}

test("iPhone and iPad require the installed Home Screen app before Web Push is offered", () => {
  const ios = browser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Version/17.2 Mobile Safari/604.1");
  assert.equal(pushPlatform(ios).needsInstall, true);
  assert.equal(pushPlatform(ios).supported, false);
  ios.navigator.standalone = true;
  assert.equal(pushPlatform(ios).supported, true);
  const ipad = browser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15");
  ipad.navigator.platform = "MacIntel"; ipad.navigator.maxTouchPoints = 5;
  assert.equal(pushPlatform(ipad).ios, true);
  assert.equal(pushPlatform(ipad).needsInstall, true);
});

test("older iOS and missing APIs remain unsupported, while Android support is feature detected", () => {
  const old = browser("Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X)", true);
  assert.equal(pushPlatform(old).oldIOS, true); assert.equal(pushPlatform(old).supported, false);
  const supported = browser("Mozilla/5.0 (Linux; Android 14) Chrome/130.0.0.0 Mobile Safari/537.36");
  assert.equal(pushPlatform(supported).android, true); assert.equal(pushPlatform(supported).supported, true);
  delete supported.PushManager;
  assert.equal(pushPlatform(supported).supported, false);
  assert.equal(pushPlatform({}).supported, false);
});

test("email order preferences never opt in implicitly and require an acknowledged strict boolean", async () => {
  const defaults = { emailOrders: false, emailAvailable: true, emailVerified: true };
  const loaded = await loadNotificationPreferences(async (route) => { assert.equal(route, "/auth/notification-preferences"); return { ok: true, data: defaults }; });
  assert.equal(loaded.emailOrders, false);
  let resolve; const response = new Promise((done) => { resolve = done; }); let completed = false;
  const pending = saveNotificationPreferences(async (route, body) => { assert.equal(route, "/auth/notification-preferences"); assert.deepEqual(body, { emailOrders: true }); return response; }, true).then((value) => { completed = true; return value; });
  await new Promise((done) => setImmediate(done)); assert.equal(completed, false);
  resolve({ ok: true, data: { ...defaults, emailOrders: true } }); assert.equal((await pending).emailOrders, true);
  await assert.rejects(() => saveNotificationPreferences(() => { throw new Error("must not call"); }, "true"), /เลือกเปิดหรือปิด/);
});

test("unavailable, unverified and failing email preferences remain explicit rather than showing false success", async () => {
  const view = await loadNotificationPreferences(async () => ({ ok: true, data: { emailOrders: false, emailAvailable: false, emailVerified: false } }));
  assert.deepEqual(view, { emailOrders: false, emailAvailable: false, emailVerified: false });
  await assert.rejects(() => saveNotificationPreferences(async () => ({ ok: false, error: { message: "EMAIL_NOT_VERIFIED" } }), true), /EMAIL_NOT_VERIFIED/);
  await assert.rejects(() => loadNotificationPreferences(async () => ({ ok: true, data: { emailOrders: true } })), /ยังไม่พร้อม/);
});

test("Home Screen manifest and Apple icon refer to locally available correctly sized app assets", async () => {
  const publicRoot = new URL("../public/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", publicRoot), "utf8"));
  assert.equal(manifest.display, "standalone"); assert.equal(manifest.scope, "/"); assert.equal(manifest.start_url, "/");
  for (const icon of manifest.icons) {
    assert.equal(icon.type, "image/png"); assert.match(icon.src, /^\/icons\/mealq-\d+\.png$/);
    const png = await readFile(new URL(icon.src.slice(1), publicRoot));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(icon.sizes, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
  }
  const apple = await readFile(new URL("icons/mealq-180.png", publicRoot)); assert.equal(apple.readUInt32BE(16), 180);
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/icons\/mealq-180.png"/);
});
