const test = require("node:test");
const assert = require("node:assert/strict");
const Store = require("../src/models/Store");
const { capabilities, ensureMerchantStore } = require("../src/controllers/authController");
const { paymentCapabilities } = require("../src/services/payment-config");

test("a deployed demo offers PromptPay and self-service Wallet topups independently of NODE_ENV", (t) => {
  const saved = { NODE_ENV: process.env.NODE_ENV, PAYMENT_MODE: process.env.PAYMENT_MODE };
  t.after(() => Object.entries(saved).forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; }));
  process.env.NODE_ENV = "production";
  delete process.env.PAYMENT_MODE;
  let body;
  capabilities({}, { json(value) { body = value; } });
  assert.deepEqual(body.paymentMethods, ["wallet", "promptpay"]);
  assert.equal(body.sandboxTopup, true);
  assert.equal(body.paymentMode, "sandbox");
  process.env.PAYMENT_MODE = "wallet";
  assert.deepEqual(paymentCapabilities(), { paymentMode: "wallet", paymentMethods: ["wallet"], sandboxTopup: false });
  process.env.PAYMENT_MODE = "invalid";
  assert.equal(paymentCapabilities().sandboxTopup, false);
});

test("new stores require approval, including the shared password/Google merchant onboarding flow", async (t) => {
  const user = { _id: "1234567890abcdef12345678", role: "merchant", name: "New merchant" };
  const defaults = new Store({ name: "Default store" });
  assert.equal(defaults.status, "pending");
  assert.equal(defaults.is_open, false);
  t.mock.method(Store, "findOne", async () => null);
  t.mock.method(Store, "create", async (fields) => new Store(fields));
  const created = await ensureMerchantStore(user);
  assert.equal(created.status, "pending");
  assert.equal(created.is_open, false);
  const existing = { status: "active", is_open: true };
  t.mock.method(Store, "findOne", async () => existing);
  assert.equal(await ensureMerchantStore(user), existing);
});
