import test from "node:test";
import assert from "node:assert/strict";
import { disablePush, enablePush, logoutWithPushCleanup, reconcileExistingPush } from "../src/features/customer/push-subscription.js";

function fixture({ permission = "granted", existing = true } = {}) {
  const calls = []; let current;
  const subscription = {
    endpoint: "https://fcm.googleapis.com/synthetic-browser",
    toJSON: () => ({ endpoint: subscription.endpoint, keys: { auth: "synthetic", p256dh: "synthetic" } }),
    unsubscribe: async () => { calls.push("browser:unsubscribe"); current = null; return true; },
  };
  current = existing ? subscription : null;
  const registration = { pushManager: {
    getSubscription: async () => current,
    subscribe: async (options) => { calls.push(["browser:subscribe", options]); current = subscription; return current; },
  } };
  const browser = {
    isSecureContext: true, PushManager: function PushManager() {}, atob,
    Notification: { permission, requestPermission: async () => { calls.push("browser:permission"); return permission; } },
    navigator: { serviceWorker: {
      getRegistration: async () => registration,
      register: async (path) => { calls.push(["browser:register", path]); return registration; },
      ready: Promise.resolve(registration),
    } },
  };
  const api = { postJson: async (path, body) => { calls.push([path, body]); return { ok: true }; }, getJson: async (path) => { calls.push([path]); return { ok: true, data: { publicKey: "c3ludGhldGljLWtleQ" } }; } };
  return { browser, subscription, registration, api, calls };
}

test("login reconciles an existing device with the current session without a new permission prompt", async () => {
  const { browser, api, calls, subscription } = fixture();
  assert.equal(await reconcileExistingPush({ browser, ...api }), true);
  assert.deepEqual(calls, [["/customer/push/subscribe", subscription.toJSON()]]);
});

test("silent reconciliation never creates a subscription or asks for permission", async () => {
  for (const options of [{ permission: "default" }, { permission: "denied" }, { existing: false }]) {
    const { browser, api, calls } = fixture(options);
    assert.equal(await reconcileExistingPush({ browser, ...api }), false);
    assert.deepEqual(calls, []);
  }
  assert.equal(await reconcileExistingPush({ browser: {}, postJson: async () => { throw new Error("No API calls expected"); } }), false);
});

test("a browser subscription is enabled only after the server acknowledges its account binding", async () => {
  const { browser } = fixture();
  let release; const pending = new Promise((resolve) => { release = resolve; }); let complete = false;
  const check = reconcileExistingPush({ browser, postJson: () => pending }).then((enabled) => { complete = true; return enabled; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(complete, false);
  release({ ok: true }); assert.equal(await check, true);
  await assert.rejects(() => reconcileExistingPush({ browser, postJson: async () => ({ ok: false, error: { message: "Binding unavailable" } }) }), /Binding unavailable/);
});

test("a failed registration can retry using its existing granted browser subscription", async () => {
  const { browser, api, calls } = fixture({ existing: false });
  let posts = 0;
  const postJson = async (path, body) => { calls.push([path, body]); return { ok: ++posts > 1, error: { message: "Retry registration" } }; };
  await assert.rejects(() => enablePush({ browser, getJson: api.getJson, postJson }), /Retry registration/);
  assert.equal(await enablePush({ browser, getJson: api.getJson, postJson }), true);
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === "browser:subscribe").length, 1);
  assert.equal(calls.includes("browser:permission"), false);
});

test("denied permission prevents a new subscription and server registration", async () => {
  const { browser, api, calls } = fixture({ existing: false, permission: "denied" });
  await assert.rejects(() => enablePush({ browser, ...api }), /อนุญาต/);
  assert.deepEqual(calls, ["browser:permission"]);
});

test("logout removes server and browser subscriptions before clearing the session", async () => {
  const { browser, api, calls } = fixture();
  await logoutWithPushCleanup({ browser, ...api });
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), ["/customer/push/unsubscribe", "browser:unsubscribe", "/auth/logout"]);
  const withoutPush = [];
  await logoutWithPushCleanup({ browser: {}, postJson: async (path) => { withoutPush.push(path); return { ok: true }; } });
  assert.deepEqual(withoutPush, ["/auth/logout"]);
});

test("server or browser cleanup failures preserve the session and remain retryable", async () => {
  const serverFailure = fixture();
  await assert.rejects(() => logoutWithPushCleanup({ browser: serverFailure.browser, postJson: async (path) => { serverFailure.calls.push([path]); return { ok: false, error: { message: "Cannot unsubscribe server" } }; } }), /Cannot unsubscribe server/);
  assert.equal(serverFailure.calls.some((call) => call === "browser:unsubscribe" || call[0] === "/auth/logout"), false);
  const browserFailure = fixture();
  browserFailure.subscription.unsubscribe = async () => { throw new Error("Browser unavailable"); };
  await assert.rejects(() => logoutWithPushCleanup({ browser: browserFailure.browser, ...browserFailure.api }), /Browser unavailable/);
  assert.equal(browserFailure.calls.some((call) => call[0] === "/auth/logout"), false);
  browserFailure.subscription.unsubscribe = async () => false;
  await assert.rejects(() => disablePush({ browser: browserFailure.browser, ...browserFailure.api }), /ยังปิดแจ้งเตือนไม่สำเร็จ/);
  browserFailure.subscription.unsubscribe = async () => true;
  await logoutWithPushCleanup({ browser: browserFailure.browser, ...browserFailure.api });
  assert.equal(browserFailure.calls.at(-1)[0], "/auth/logout");
});

test("merchant binding and logout use merchant endpoints without customer subscription mutations", async () => {
  const { browser, api, calls } = fixture();
  await reconcileExistingPush({ browser, ...api, prefix: "/merchant" });
  await logoutWithPushCleanup({ browser, ...api, prefix: "/merchant" });
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), ["/merchant/push/subscribe", "/merchant/push/unsubscribe", "browser:unsubscribe", "/auth/logout"]);
  assert.equal(calls.some((call) => Array.isArray(call) && call[0].startsWith("/customer")), false);
});

test("push helper rejects arbitrary API prefixes", async () => {
  const { browser, api } = fixture();
  await assert.rejects(() => reconcileExistingPush({ browser, ...api, prefix: "/admin" }), /ประเภทบัญชี/);
});
