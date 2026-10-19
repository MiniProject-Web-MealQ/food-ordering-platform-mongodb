import test from "node:test";
import assert from "node:assert/strict";
import { loadRegistrationChallenge, saveRegistrationChallenge } from "../src/features/auth/registration-challenge.js";

test("registration can resume after reload without persisting the password or OTP", (t) => {
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "sessionStorage", original); else delete globalThis.sessionStorage; });
  const challenge = { verificationRequired: true, registrationId: "a".repeat(48), email: "test@mealq.local", expiresAt: "2026-10-19T10:10:00Z", resendAfter: "2026-10-19T10:01:00Z" };
  saveRegistrationChallenge({ ...challenge, password: "NeverStoreThis123!", code: "123456" });
  assert.deepEqual(loadRegistrationChallenge(), challenge);
  assert.ok([...values.values()].every((value) => !value.includes("NeverStoreThis") && !value.includes("123456")));
  saveRegistrationChallenge(null);
  assert.equal(loadRegistrationChallenge(), null);
  values.set("mealq.registration.v1", "invalid JSON");
  assert.equal(loadRegistrationChallenge(), null);
});
