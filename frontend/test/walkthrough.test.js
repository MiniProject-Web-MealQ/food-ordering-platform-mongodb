import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_DURATION_MS, DEMO_ORDER, DEMO_STEPS, clampStepIndex, getDemoProgress, getDemoStep, nextDemoIndex } from "../src/features/demo/walkthrough-data.js";

test("the fictional order keeps its queue, food, fee and payment totals consistent throughout the walkthrough", () => {
  assert.equal(DEMO_ORDER.subtotal + DEMO_ORDER.serviceFee, DEMO_ORDER.total);
  assert.equal(DEMO_ORDER.walletTopup - DEMO_ORDER.total, DEMO_ORDER.walletAfterPayment);
  assert.equal(DEMO_ORDER.quantity, 1);
  assert.match(DEMO_ORDER.number, /^MQ-DEMO-/);
  assert.match(DEMO_ORDER.queue, /^\d{3}$/);
  assert.match(DEMO_ORDER.pickupCode, /^\d{4}$/);
  const paid = DEMO_STEPS.find((step) => step.id === "checkout");
  assert.match(paid.title, /Wallet Demo/);
  assert.ok(paid.description.includes(String(DEMO_ORDER.total)));
  assert.match(paid.description, /จำลอง/);
  assert.ok(paid.customerCaption.includes(String(DEMO_ORDER.walletAfterPayment)));
  assert.ok(DEMO_STEPS.find((step) => step.id === "queued").description.includes(DEMO_ORDER.number));
  assert.ok(DEMO_STEPS.find((step) => step.id === "pickup").description.includes(DEMO_ORDER.pickupCode));
});

test("a new customer self tops up fake Wallet money before attempting payment", () => {
  const topupIndex = DEMO_STEPS.findIndex((step) => step.id === "wallet-topup");
  const checkoutIndex = DEMO_STEPS.findIndex((step) => step.id === "checkout");
  const cartIndex = DEMO_STEPS.findIndex((step) => step.id === "cart");
  assert.ok(topupIndex > cartIndex && topupIndex < checkoutIndex);
  const topup = getDemoStep(topupIndex);
  assert.equal(topup.actor, "customer"); assert.equal(topup.customerView, "wallet");
  assert.equal(topup.merchantView, "waiting");
  assert.match(topup.description, /0 บาท/); assert.match(topup.description, /กดเติมเอง/);
  assert.ok(topup.description.includes(String(DEMO_ORDER.walletTopup)));
  assert.match(topup.description, /เงินจำลอง/);
  assert.ok(DEMO_ORDER.walletTopup >= DEMO_ORDER.total);
});

test("the two-sided story starts with truthful login and only receives the merchant order after checkout", () => {
  assert.equal(DEMO_STEPS[0].id, "login");
  assert.match(DEMO_STEPS[0].description, /Google Login/);
  assert.match(DEMO_STEPS[0].description, /อีเมลและยืนยัน OTP/);
  assert.match(DEMO_STEPS[0].merchantCaption, /อนุมัติแล้ว/);
  const checkoutIndex = DEMO_STEPS.findIndex((step) => step.id === "checkout");
  const newOrderIndex = DEMO_STEPS.findIndex((step) => step.merchantView === "new-order");
  assert.ok(newOrderIndex > checkoutIndex);
  assert.ok(DEMO_STEPS.slice(0, checkoutIndex + 1).every((step) => step.merchantView === "waiting"));
  assert.deepEqual(DEMO_STEPS.slice(newOrderIndex).map((step) => step.merchantView), ["new-order", "confirmed", "preparing", "ready", "verify-pickup", "completed"]);
});

test("food handoff remains gated on merchant code or QR verification before either side is completed", () => {
  const pickupIndex = DEMO_STEPS.findIndex((step) => step.id === "pickup");
  const pickup = getDemoStep(pickupIndex);
  assert.equal(pickup.actor, "merchant");
  assert.equal(pickup.merchantView, "verify-pickup");
  assert.match(pickup.merchantCaption, /กรอกรหัส/); assert.match(pickup.merchantCaption, /QR/);
  assert.match(pickup.merchantCaption, /กดยืนยันรับอาหาร/);
  assert.ok(DEMO_STEPS.slice(0, pickupIndex + 1).every((step) => step.customerView !== "completed" && step.merchantView !== "completed"));
  assert.equal(getDemoStep(pickupIndex + 1).id, "completed");
  assert.match(getDemoStep(pickupIndex + 1).description, /หลังร้านยืนยันรหัสรับอาหารสำเร็จ/);
});

test("each animated stage has unique identity, both role captions and a readable bounded display duration", () => {
  assert.equal(new Set(DEMO_STEPS.map((step) => step.id)).size, DEMO_STEPS.length);
  for (const step of DEMO_STEPS) {
    assert.ok(["customer", "merchant", "both"].includes(step.actor));
    for (const field of ["title", "description", "customerView", "merchantView", "customerCaption", "merchantCaption"]) assert.ok(typeof step[field] === "string" && step[field].length > 0, `${step.id}: ${field}`);
    assert.ok(step.durationMs >= 6000 && step.durationMs <= 9000);
  }
  assert.equal(DEMO_DURATION_MS, 83000);
});

test("seeking has explicit bounds but unknown states never masquerade as a completed order", () => {
  const end = DEMO_STEPS.length - 1;
  assert.equal(clampStepIndex(-1), 0); assert.equal(clampStepIndex(999), end);
  assert.equal(clampStepIndex(2.9), 2);
  for (const input of [undefined, null, "completed", "10", NaN, Infinity, -Infinity, {}, -1, end + 1, 2.5]) {
    assert.equal(getDemoStep(input), null);
    assert.equal(getDemoProgress(input), 0);
    assert.equal(nextDemoIndex(input), 0);
  }
  assert.equal(getDemoStep(0).id, "login"); assert.equal(getDemoStep(end).id, "completed");
  assert.equal(getDemoProgress(0), 0); assert.equal(getDemoProgress(end), 100);
});

test("playback moves forward deterministically and stays finished until an explicit restart", () => {
  let index = 0; const visited = [];
  for (let count = 0; count < DEMO_STEPS.length; count++) { visited.push(getDemoStep(index).id); index = nextDemoIndex(index); }
  assert.equal(new Set(visited).size, DEMO_STEPS.length);
  const end = DEMO_STEPS.length - 1;
  assert.equal(index, end); assert.equal(nextDemoIndex(index), end);
  const progress = DEMO_STEPS.map((_step, position) => getDemoProgress(position));
  assert.ok(progress.every((value, position) => position === 0 || value > progress[position - 1]));
  assert.equal(clampStepIndex(0), 0);
});
