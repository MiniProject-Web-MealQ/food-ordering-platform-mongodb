const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const User = require("../src/models/User");
const authRoutes = require("../src/routes/authRoutes");

test("registration fails closed without SMTP rather than creating an account or exposing an OTP", async (t) => {
  const saved = { SMTP_HOST: process.env.SMTP_HOST, SMTP_FROM: process.env.SMTP_FROM };
  delete process.env.SMTP_HOST; delete process.env.SMTP_FROM;
  t.after(() => Object.entries(saved).forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; }));
  t.mock.method(User, "findOne", async () => null);
  const create = t.mock.method(User, "create", async () => { throw new Error("An unverified account must not be created"); });
  const app = express(); app.use(express.json()); app.use("/auth", authRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Test", email: "test@mealq.local", password: "Customer123!", role: "CUSTOMER" }) });
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.error.code, "EMAIL_NOT_CONFIGURED");
  assert.equal(payload.code, undefined);
  assert.equal(payload.user, undefined);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(create.mock.callCount(), 0);
});
