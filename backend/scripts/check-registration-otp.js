const assert = require("node:assert/strict");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { startIsolatedServer } = require("./fixtures/isolated-server");
const User = require("../src/models/User");
const Store = require("../src/models/Store");
const PendingRegistration = require("../src/models/PendingRegistration");
const AuthRateLimit = require("../src/models/AuthRateLimit");
let runtime, passes = 0;
const pass = (message) => { passes++; console.log(`[PASS] ${message}`); };
const signup = (email, role = "CUSTOMER") => ({ name: "OTP Test", email, password: "OtpTest123!", role });
const wrong = (code) => String((Number(code) + 1) % 1000000).padStart(6, "0");
const unlockResend = (registrationId) => PendingRegistration.updateOne({ registration_id: registrationId }, { $set: { resend_after: new Date(Date.now() - 1000) } });
function client() {
  let cookie = "";
  return async (method, route, body, expected = 200) => {
    const response = await fetch(runtime.base + route, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const cookies = response.headers.getSetCookie();
    for (const value of cookies) if (value.startsWith("mealq_session=")) cookie = value.split(";")[0];
    const data = await response.json();
    if (expected !== null) assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
    return { status: response.status, data, cookies };
  };
}
async function run() {
  runtime = await startIsolatedServer("mealq_otp_");
  const guest = client();
  const email = "otp-customer@mealq.local";
  const first = await guest("POST", "/auth/register", signup(email), 202);
  const id = first.data.registrationId;
  const code = runtime.mail.codeFor(email);
  assert.match(code, /^\d{6}$/);
  assert.equal(first.data.verificationRequired, true);
  assert.equal(first.data.user, undefined);
  assert.equal(first.data.code, undefined);
  assert.equal(first.data.devOtp, undefined);
  assert.equal(first.cookies.length, 0);
  assert.equal(await User.exists({ email }), null);
  await guest("GET", "/auth/me", undefined, 401);
  await guest("POST", "/auth/login", { email, password: "OtpTest123!", portal: "CUSTOMER" }, 401);
  const raw = await PendingRegistration.collection.findOne({ email });
  assert.notEqual(raw.otp_hash, code); assert.notEqual(raw.password_hash, "OtpTest123!");
  assert.equal(raw.password, undefined); assert.equal(raw.code, undefined);
  pass("Signup delivers a six-digit OTP by SMTP, stores hashes and grants no account or session yet");

  const sent = runtime.mail.messages.length;
  assert.equal((await guest("POST", "/auth/register/resend", { registrationId: id }, 429)).data.error.code, "OTP_SEND_LIMIT");
  await guest("POST", "/auth/register", signup(email), 429);
  assert.equal(runtime.mail.messages.length, sent);
  assert.equal((await guest("POST", "/auth/register/verify", { registrationId: id, code: wrong(code) }, 400)).data.error.code, "OTP_MISMATCH");
  const verified = await Promise.all([client()("POST", "/auth/register/verify", { registrationId: id, code }, null), client()("POST", "/auth/register/verify", { registrationId: id, code }, null)]);
  assert.equal(verified.filter((result) => result.status === 201).length, 1);
  assert.ok(verified.every((result) => [201, 409, 410].includes(result.status)));
  assert.equal(await User.countDocuments({ email }), 1);
  assert.ok((await User.findOne({ email })).email_verified_at);
  await guest("POST", "/auth/register/verify", { registrationId: id, code }, 410);
  await guest("POST", "/auth/login", { email, password: "OtpTest123!", portal: "CUSTOMER" });
  assert.equal((await guest("GET", "/auth/me")).data.user.email, email);
  pass("Cooldown survives a fresh signup; wrong codes fail and concurrent/replayed correct codes create one account");

  const merchant = client();
  const merchantEmail = "otp-merchant@mealq.local";
  const draft = (await merchant("POST", "/auth/register", signup(merchantEmail, "MERCHANT"), 202)).data;
  const merchantUser = (await merchant("POST", "/auth/register/verify", { registrationId: draft.registrationId, code: runtime.mail.codeFor(merchantEmail) }, 201)).data;
  const store = await Store.findById(merchantUser.store.id);
  assert.equal(store.status, "pending"); assert.equal(store.is_open, false);
  await merchant("PATCH", "/merchant/store", { isOpen: true }, 409);
  await client()("POST", "/auth/register", signup("otp-admin@mealq.local", "ADMIN"), 400);
  pass("Verified merchants remain pending admin approval and public signup cannot create admins");

  const expEmail = "otp-expiry@mealq.local";
  const expired = (await client()("POST", "/auth/register", signup(expEmail), 202)).data;
  const oldCode = runtime.mail.codeFor(expEmail);
  await PendingRegistration.updateOne({ registration_id: expired.registrationId }, { $set: { expires_at: new Date(Date.now() - 1000) } });
  await client()("POST", "/auth/register/verify", { registrationId: expired.registrationId, code: oldCode }, 410);
  await unlockResend(expired.registrationId);
  const resends = await Promise.all([client()("POST", "/auth/register/resend", { registrationId: expired.registrationId }, null), client()("POST", "/auth/register/resend", { registrationId: expired.registrationId }, null)]);
  assert.equal(resends.filter((result) => result.status === 200).length, 1);
  assert.ok(resends.some((result) => result.status === 429));
  const fresh = resends.find((result) => result.status === 200).data;
  const freshCode = runtime.mail.codeFor(expEmail); assert.notEqual(freshCode, oldCode);
  await client()("POST", "/auth/register/verify", { registrationId: fresh.registrationId, code: oldCode }, 400);
  await client()("POST", "/auth/register/verify", { registrationId: fresh.registrationId, code: freshCode }, 201);
  pass("Expired OTPs fail, concurrent resends send once, and a resend invalidates the previous code");

  const lockEmail = "otp-attempts@mealq.local";
  const locked = (await client()("POST", "/auth/register", signup(lockEmail), 202)).data;
  const lockCode = runtime.mail.codeFor(lockEmail);
  for (let i = 0; i < 5; i++) await client()("POST", "/auth/register/verify", { registrationId: locked.registrationId, code: wrong(lockCode) }, i === 4 ? 429 : 400);
  await client()("POST", "/auth/register/verify", { registrationId: locked.registrationId, code: lockCode }, 429);
  assert.equal(await User.exists({ email: lockEmail }), null);
  await unlockResend(locked.registrationId);
  const retry = (await client()("POST", "/auth/register/resend", { registrationId: locked.registrationId })).data;
  await client()("POST", "/auth/register/verify", { registrationId: retry.registrationId, code: runtime.mail.codeFor(lockEmail) }, 201);
  pass("Five wrong guesses lock the code; a rate-limited fresh code can complete verification");

  await AuthRateLimit.deleteMany({});
  const limitEmail = "otp-send-limit@mealq.local";
  const limited = (await client()("POST", "/auth/register", signup(limitEmail), 202)).data;
  for (let i = 1; i < 5; i++) { await unlockResend(limited.registrationId); await client()("POST", "/auth/register/resend", { registrationId: limited.registrationId }); }
  await unlockResend(limited.registrationId);
  await client()("POST", "/auth/register/resend", { registrationId: limited.registrationId }, 429);
  await client()("POST", "/auth/register", signup(limitEmail), 429);
  await PendingRegistration.updateOne({ registration_id: limited.registrationId }, { $set: { window_resets_at: new Date(Date.now() - 1000) } });
  await client()("POST", "/auth/register/resend", { registrationId: limited.registrationId });
  pass("Email send limits cannot be bypassed by restarting signup and reset after their time window");

  runtime.mail.reject(true);
  const failedEmail = "otp-failed-delivery@mealq.local";
  assert.equal((await client()("POST", "/auth/register", signup(failedEmail), 503)).data.error.code, "EMAIL_SEND_FAILED");
  assert.equal(await User.exists({ email: failedEmail }), null);
  assert.equal((await PendingRegistration.findOne({ email: failedEmail })).ready, false);
  runtime.mail.reject(false);
  await PendingRegistration.updateOne({ email: failedEmail }, { $set: { resend_after: new Date(Date.now() - 1000) } });
  const delivered = (await client()("POST", "/auth/register", signup(failedEmail), 202)).data;
  await client()("POST", "/auth/register/verify", { registrationId: delivered.registrationId, code: runtime.mail.codeFor(failedEmail) }, 201);
  await AuthRateLimit.updateMany({ _id: /^registration-send:/ }, { $set: { count: 20 } });
  assert.equal((await client()("POST", "/auth/register", signup("otp-ip-limited@mealq.local"), 429)).data.error.code, "OTP_RATE_LIMIT");
  pass("SMTP failures never create accounts; retries recover and the per-IP send budget is enforced");
  console.log(`${passes} OTP groups passed using only local SMTP and an isolated database.`);
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { if (runtime) await runtime.close(); });
