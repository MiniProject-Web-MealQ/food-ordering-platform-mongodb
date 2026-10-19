import assert from "node:assert/strict";
import test from "node:test";
import { createSettingsOperationQueue, createSettingsScope, pushPermissionFromGesture } from "../src/features/customer/notification-settings-lifecycle.js";
import { disablePush, enablePush, reconcileExistingPush } from "../src/features/customer/push-subscription.js";
import { loadNotificationPreferences, saveNotificationPreferences } from "../src/features/customer/notification-preferences.js";

function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function device({ existing = true, permission = "granted" } = {}) {
  const calls = [];
  let current;
  const subscription = {
    endpoint: "https://fcm.googleapis.com/synthetic-settings-lifecycle",
    toJSON: () => ({ endpoint: subscription.endpoint, keys: { auth: "synthetic", p256dh: "synthetic" } }),
    unsubscribe: async () => { calls.push("browser:unsubscribe"); current = null; return true; },
  };
  current = existing ? subscription : null;
  const registration = { pushManager: {
    getSubscription: async () => current,
    subscribe: async () => { calls.push("browser:subscribe"); current = subscription; return current; },
  } };
  const browser = {
    isSecureContext: true, PushManager: function PushManager() {}, atob,
    Notification: { permission, requestPermission: () => { calls.push("browser:permission"); browser.Notification.permission = "granted"; return Promise.resolve("granted"); } },
    navigator: { serviceWorker: { getRegistration: async () => registration, register: async () => registration, ready: Promise.resolve(registration) } },
  };
  const api = { getJson: async () => ({ ok: true, data: { publicKey: "c3ludGhldGljLWtleQ" } }), postJson: async (path) => { calls.push(path); return { ok: true }; } };
  return { browser, api, calls };
}

test("a device page remounted during disable waits for browser cleanup and displays the actual disabled state", async () => {
  const queue = createSettingsOperationQueue();
  const { browser, api, calls } = device();
  const started = deferred(), release = deferred();
  const postJson = async (path) => { calls.push(path); if (path.endsWith("unsubscribe")) { started.resolve(); await release.promise; } return { ok: true }; };
  const disabling = queue.run(() => disablePush({ browser, postJson, prefix: "/merchant" }));
  await started.promise;
  let displayed = null;
  const remounted = queue.run(() => reconcileExistingPush({ browser, postJson: api.postJson, prefix: "/merchant" })).then((enabled) => { displayed = enabled; });
  await Promise.resolve();
  assert.equal(displayed, null);
  release.resolve();
  assert.equal(await disabling, false);
  await remounted;
  assert.equal(displayed, false);
  assert.deepEqual(calls, ["/merchant/push/unsubscribe", "browser:unsubscribe"]);
});

test("a remounted device page waits for pending enable and does not publish its discarded owner's completion", async () => {
  const queue = createSettingsOperationQueue();
  const scope = createSettingsScope();
  const { browser, api, calls } = device({ existing: false });
  const started = deferred(), release = deferred();
  let bindings = 0, stalePublishes = 0;
  const postJson = async (path) => { calls.push(path); if (++bindings === 1) { started.resolve(); await release.promise; } return { ok: true }; };
  const enabling = queue.run(() => enablePush({ browser, getJson: api.getJson, postJson, prefix: "/merchant" })).then(() => { if (scope.isCurrent()) stalePublishes++; });
  await started.promise;
  scope.dispose();
  const remounted = queue.run(() => reconcileExistingPush({ browser, postJson, prefix: "/merchant" }));
  release.resolve();
  await enabling;
  assert.equal(await remounted, true);
  assert.equal(stalePublishes, 0);
  assert.equal(calls.filter((value) => value === "browser:subscribe").length, 1);
  assert.equal(calls.some((value) => value.startsWith("/customer/")), false);
  assert.equal(calls.includes("browser:permission"), false);
});

test("permission preparation starts in the click gesture even when earlier async settings work is pending", async () => {
  const queue = createSettingsOperationQueue();
  const { browser, api, calls } = device({ existing: false, permission: "default" });
  const started = deferred(), release = deferred();
  const prior = queue.run(async () => { started.resolve(); await release.promise; });
  await started.promise;
  let inGesture = true;
  browser.Notification.requestPermission = () => { assert.equal(inGesture, true); calls.push("browser:permission"); browser.Notification.permission = "granted"; return Promise.resolve("granted"); };
  const permission = pushPermissionFromGesture(browser);
  assert.deepEqual(calls, ["browser:permission"]);
  const enabling = queue.run(async () => { assert.equal((await permission).permission, "granted"); return enablePush({ browser, ...api, prefix: "/merchant" }); });
  inGesture = false;
  release.resolve();
  await prior;
  assert.equal(await enabling, true);
  assert.equal(calls.filter((value) => value === "browser:permission").length, 1);
});

test("an email page remount loads after the pending save and old account responses cannot overwrite the new account", async () => {
  const queue = createSettingsOperationQueue();
  const oldScope = createSettingsScope(), nextScope = createSettingsScope();
  const started = deferred(), release = deferred();
  let state = { owner: "new-account", data: null }, reads = 0;
  const oldSave = queue.run(() => saveNotificationPreferences(async (path, body) => {
    assert.equal(path, "/auth/notification-preferences"); assert.deepEqual(body, { emailOrders: true });
    started.resolve(); await release.promise;
    return { ok: true, data: { emailOrders: true, emailVerified: true, emailAvailable: true } };
  }, true)).then((data) => { if (oldScope.isCurrent()) state = { owner: "old-account", data }; });
  await started.promise;
  oldScope.dispose();
  const newLoad = queue.run(() => loadNotificationPreferences(async (path) => {
    assert.equal(path, "/auth/notification-preferences"); reads++;
    return { ok: true, data: { emailOrders: false, emailVerified: true, emailAvailable: true } };
  })).then((data) => { if (nextScope.isCurrent()) state = { owner: "new-account", data }; });
  assert.equal(reads, 0);
  release.resolve();
  await Promise.all([oldSave, newLoad]);
  assert.deepEqual(state, { owner: "new-account", data: { emailOrders: false, emailVerified: true, emailAvailable: true } });
  assert.equal(reads, 1);
});

test("remounting the same email account during a save loads the acknowledged preference after the save settles", async () => {
  const queue = createSettingsOperationQueue();
  const oldScope = createSettingsScope();
  const started = deferred(), release = deferred();
  let saved = false, published = null;
  const data = () => ({ emailOrders: saved, emailVerified: true, emailAvailable: true });
  const saving = queue.run(() => saveNotificationPreferences(async (_path, body) => {
    started.resolve(); await release.promise; saved = body.emailOrders;
    return { ok: true, data: data() };
  }, true)).then((value) => { if (oldScope.isCurrent()) published = value; });
  await started.promise;
  oldScope.dispose();
  const remounted = queue.run(() => loadNotificationPreferences(async () => ({ ok: true, data: data() })));
  release.resolve();
  await saving;
  assert.equal(published, null);
  assert.equal((await remounted).emailOrders, true);
});

test("denied permission never creates a subscription, and mount reconciliation never asks for permission", async () => {
  const queue = createSettingsOperationQueue();
  const { browser, api, calls } = device({ permission: "default", existing: false });
  assert.equal(await queue.run(() => reconcileExistingPush({ browser, ...api, prefix: "/merchant" })), false);
  assert.deepEqual(calls, []);
  browser.Notification.requestPermission = () => { calls.push("browser:permission"); browser.Notification.permission = "denied"; return Promise.resolve("denied"); };
  const permission = pushPermissionFromGesture(browser);
  await assert.rejects(queue.run(async () => {
    if ((await permission).permission !== "granted") throw new Error("Permission denied");
    return enablePush({ browser, ...api, prefix: "/merchant" });
  }), /Permission denied/);
  assert.equal(await queue.run(() => reconcileExistingPush({ browser, ...api, prefix: "/merchant" })), false);
  assert.deepEqual(calls, ["browser:permission"]);
});

test("a thrown unsubscribe network failure preserves the browser state and the next reconciliation can retry", async () => {
  const queue = createSettingsOperationQueue();
  const { browser, api, calls } = device();
  await assert.rejects(queue.run(() => disablePush({ browser, prefix: "/merchant", postJson: async () => { throw new Error("Network disconnected"); } })), /Network disconnected/);
  assert.equal(calls.includes("browser:unsubscribe"), false);
  assert.equal(await queue.run(() => reconcileExistingPush({ browser, ...api, prefix: "/merchant" })), true);
  assert.deepEqual(calls, ["/merchant/push/subscribe"]);
});

test("failed actions do not poison subsequent mount reads and rejected permission preparation stays handled", async () => {
  const queue = createSettingsOperationQueue();
  const permissionError = new Error("Synthetic permission failure");
  const permission = pushPermissionFromGesture({ Notification: { permission: "default", requestPermission: () => Promise.reject(permissionError) } });
  await Promise.resolve();
  assert.strictEqual((await permission).error, permissionError);
  await assert.rejects(queue.run(async () => { throw new Error("Synthetic failed save"); }), /failed save/);
  assert.equal(await queue.run(async () => false), false);
  const scope = createSettingsScope(); scope.dispose();
  let reads = 0;
  await queue.run(() => { if (scope.isCurrent()) reads++; });
  assert.equal(reads, 0);
});
