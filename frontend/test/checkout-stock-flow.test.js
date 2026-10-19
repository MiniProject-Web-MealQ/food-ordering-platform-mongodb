import assert from "node:assert/strict";
import test from "node:test";
import { submitStockCheckedOrder } from "../src/features/customer/checkout-stock-flow.js";
import { checkoutBody } from "../src/features/customer/order-request.js";
import { checkoutAttempt, finishCheckout, markCheckoutSubmitted, pendingSubmittedCheckout, submittedCheckout } from "../src/features/customer/checkout-attempt.js";

const available = () => ({ ok: true, data: { available: true } });
const session = () => ({ ok: true, data: { user: { id: "customer-a" } } });
const order = () => ({ ok: true, data: { order: { orderNumber: "MQ-SYNTHETIC", totalPrice: 95 } } });
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
function fixture(overrides = {}) {
  const flags = { active: true, owner: true, submitted: false };
  const calls = { stock: 0, session: 0, mark: 0, create: 0 };
  const events = [];
  const run = () => submitStockCheckedOrder({
    alreadySubmitted: flags.submitted,
    ownerId: "customer-a", isActive: () => flags.active, isOwner: () => flags.owner,
    checkStock: async () => { calls.stock++; events.push("stock"); return overrides.checkStock ? overrides.checkStock() : available(); },
    verifySession: async () => { calls.session++; events.push("session"); return overrides.verifySession ? overrides.verifySession() : session(); },
    markSubmitted: () => { calls.mark++; events.push("mark"); flags.submitted = true; overrides.markSubmitted?.(); },
    createOrder: async () => { calls.create++; events.push("create"); return overrides.createOrder ? overrides.createOrder() : order(); },
    onPhase: (phase) => events.push(phase),
  });
  return { flags, calls, events, run };
}
function storage(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "sessionStorage", original); else delete globalThis.sessionStorage; });
}
const cart = { restaurantId: "store-a", couponId: "coupon-a", couponCode: "SAVE", items: [{ menuId: "meal-a", qty: 2, selections: { spice: ["mild"] }, note: "ไม่ใส่หอม" }] };

test("fresh checkout checks real availability and session before marking or creating an order", async () => {
  const flow = fixture();
  const response = await flow.run();
  assert.equal(response.ok, true);
  assert.equal(response.preflight, false);
  assert.deepEqual(flow.events, ["checking-stock", "stock", "session", "sending-order", "mark", "create"]);
  assert.deepEqual(flow.calls, { stock: 1, session: 1, mark: 1, create: 1 });
});

test("stock and missing-recipe failures preserve friendly shortages and never mark, create or reserve a retry receipt", async (t) => {
  storage(t);
  const key = checkoutAttempt(cart, "wallet", 95, "customer-a");
  for (const code of ["OUT_OF_STOCK", "RECIPE_NOT_CONFIGURED"]) {
    const error = { code, message: "เมนูนี้ยังไม่พร้อม กรุณาปรับตะกร้า", details: { shortages: [{ menuId: "meal-a", name: "ข้าวกะเพรา" }] } };
    const flow = fixture({ checkStock: async () => ({ ok: false, status: 409, error }), markSubmitted: () => markCheckoutSubmitted(cart, "wallet", 95, key, "customer-a") });
    const response = await flow.run();
    assert.deepEqual(response, { ok: false, status: 409, error, preflight: true });
    assert.deepEqual(flow.calls, { stock: 1, session: 0, mark: 0, create: 0 });
    assert.equal(flow.flags.submitted, false);
    assert.equal(pendingSubmittedCheckout("customer-a"), null);
    assert.equal(submittedCheckout(cart, "wallet", "customer-a"), null);
    assert.equal(checkoutAttempt(cart, "wallet", 95, "customer-a"), key);
  }
});

test("unknown availability and both returned/thrown network failures fail closed without an infinite request", async () => {
  for (const checkStock of [
    async () => undefined,
    async () => ({ ok: true, data: { available: false } }),
    async () => ({ ok: true, data: {} }),
    async () => ({ ok: false, error: { code: "NETWORK_ERROR", message: "เชื่อมต่อไม่ได้" } }),
    async () => { throw new Error("disconnected"); },
  ]) {
    const flow = fixture({ checkStock });
    const response = await flow.run();
    assert.equal(response.ok, false);
    assert.equal(response.preflight, true);
    assert.ok(["NETWORK_ERROR", "STOCK_CHECK_FAILED"].includes(response.error.code));
    assert.equal(flow.calls.mark, 0);
    assert.equal(flow.calls.create, 0);
    assert.equal(flow.flags.submitted, false);
  }
});

test("unmounted or changed-owner views cannot submit after a slow stock check resolves", async () => {
  for (const changed of ["active", "owner"]) {
    const stock = deferred();
    const flow = fixture({ checkStock: () => stock.promise });
    const pending = flow.run();
    flow.flags[changed] = false;
    stock.resolve(available());
    const response = await pending;
    assert.equal(changed === "active" ? response.cancelled : response.error.code, changed === "active" ? true : "AUTH_REQUIRED");
    assert.equal(flow.calls.mark, 0);
    assert.equal(flow.calls.create, 0);
    assert.equal(flow.flags.submitted, false);
  }
});

test("session revalidation blocks account changes and failures after stock was checked", async () => {
  for (const verifySession of [
    async () => ({ ok: true, data: { user: { id: "customer-b" } } }),
    async () => ({ ok: false, error: { code: "NETWORK_ERROR", message: "ไม่ทราบบัญชี" } }),
    async () => { throw new Error("session disconnected"); },
  ]) {
    const flow = fixture({ verifySession });
    const response = await flow.run();
    assert.equal(response.ok, false);
    assert.equal(response.preflight, true);
    assert.equal(flow.calls.stock, 1);
    assert.equal(flow.calls.mark, 0);
    assert.equal(flow.calls.create, 0);
  }
  for (const changed of ["active", "owner"]) {
    const check = deferred(); const started = deferred();
    const flow = fixture({ verifySession: () => { started.resolve(); return check.promise; } });
    const pending = flow.run();
    await started.promise;
    flow.flags[changed] = false;
    check.resolve(session());
    const response = await pending;
    assert.equal(changed === "active" ? response.cancelled : response.error.code, changed === "active" ? true : "AUTH_REQUIRED");
    assert.equal(flow.calls.mark, 0);
    assert.equal(flow.calls.create, 0);
  }
});

test("an unsubmitted retry checks stock again instead of skipping a prior preflight failure", async () => {
  let attempts = 0;
  const flow = fixture({ checkStock: async () => ++attempts === 1 ? { ok: false, status: 409, error: { code: "OUT_OF_STOCK", message: "ไม่พอ" } } : available() });
  assert.equal((await flow.run()).ok, false);
  assert.equal(flow.flags.submitted, false);
  assert.equal((await flow.run()).ok, true);
  assert.deepEqual(flow.calls, { stock: 2, session: 1, mark: 1, create: 1 });
});

test("uncertain submitted retries preserve the original request key/body/total and perform zero extra stock checks", async (t) => {
  storage(t);
  const key = checkoutAttempt(cart, "wallet", 95, "customer-a");
  const requests = [];
  let number = 0;
  const flow = fixture({
    markSubmitted: () => markCheckoutSubmitted(cart, "wallet", 95, key, "customer-a"),
    createOrder: async () => {
      requests.push({ key, body: checkoutBody(cart, "wallet", 95) });
      if (++number === 1) throw new Error("connection lost after sending");
      return order();
    },
  });
  const first = await flow.run();
  assert.equal(first.ok, false);
  assert.equal(first.preflight, false);
  assert.equal(flow.flags.submitted, true);
  assert.deepEqual(pendingSubmittedCheckout("customer-a"), { key, total: 95 });
  const second = await flow.run();
  assert.equal(second.ok, true);
  assert.deepEqual(flow.calls, { stock: 1, session: 2, mark: 1, create: 2 });
  assert.deepEqual(requests[1], requests[0]);
  assert.equal(requests[1].body.expectedTotal, 95);
  assert.deepEqual(submittedCheckout(cart, "wallet", "customer-a"), { key, total: 95 });
  finishCheckout(key);
});

test("recovery replays an already-submitted order even when stock could now be empty or recipes removed", async () => {
  const flow = fixture({ checkStock: async () => { throw new Error("recovery must not check stock"); }, markSubmitted: () => { throw new Error("recovery must not create a second receipt"); } });
  flow.flags.submitted = true;
  const response = await flow.run();
  assert.equal(response.ok, true);
  assert.deepEqual(flow.calls, { stock: 0, session: 1, mark: 0, create: 1 });
  assert.deepEqual(flow.events, ["session", "recovering-order", "create"]);
});

test("CHECKOUT_IN_PROGRESS and views abandoned after create keep the submitted receipt for recovery", async () => {
  const inProgress = { ok: false, status: 409, error: { code: "CHECKOUT_IN_PROGRESS", message: "กำลังยืนยันคำขอเดิม" } };
  const flow = fixture({ createOrder: async () => inProgress });
  assert.deepEqual(await flow.run(), { ...inProgress, preflight: false });
  assert.equal(flow.flags.submitted, true);
  for (const changed of ["active", "owner"]) {
    const response = deferred(); const started = deferred();
    const pendingFlow = fixture({ createOrder: () => { started.resolve(); return response.promise; } });
    const pending = pendingFlow.run();
    await started.promise;
    pendingFlow.flags[changed] = false;
    response.resolve(order());
    const result = await pending;
    assert.equal(changed === "active" ? result.cancelled : result.error.code, changed === "active" ? true : "AUTH_REQUIRED");
    assert.equal(pendingFlow.flags.submitted, true);
    assert.equal(pendingFlow.calls.mark, 1);
    assert.equal(pendingFlow.calls.create, 1);
    if (changed === "owner") assert.equal(result.preflight, false);
  }
});
