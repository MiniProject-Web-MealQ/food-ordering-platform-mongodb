const test = require("node:test");
const assert = require("node:assert/strict");
const { validEmail, validPassword, normalizeRole } = require("../src/services/auth-validation");
const { createSessionToken, verifySessionToken, parseCookies, setSessionCookie } = require("../src/services/session");

test("public registration cannot create an administrator or accept malformed fields", () => {
  assert.equal(normalizeRole("ADMIN"), null);
  assert.equal(normalizeRole("ADMIN", true), "admin");
  assert.equal(normalizeRole({ role: "admin" }), null);
  assert.equal(validEmail({ $ne: null }), false);
  assert.equal(validEmail("wrong-email"), false);
  assert.equal(validEmail("extra,recipient@example.com"), false);
  assert.equal(validEmail("test@example.com\r\nBcc:other@example.com"), false);
  assert.equal(validEmail("merchant@mealq.local"), true);
  for (const password of [null, "12345678", "abcdefgh", "Aa1", "Aa1".repeat(50)]) assert.equal(validPassword(password), false);
  assert.equal(validPassword("Customer123!"), true);
});

test("session tokens reject tampering, expiration, invalid ids and extra segments", () => {
  const id = "1234567890abcdef12345678";
  const token = createSessionToken(id, 60000, 3);
  assert.equal(verifySessionToken(token).sub, id);
  assert.equal(verifySessionToken(token).ver, 3);
  assert.equal(verifySessionToken(token + ".extra"), null);
  assert.equal(verifySessionToken(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a")), null);
  assert.equal(verifySessionToken(createSessionToken(id, -1)), null);
  assert.equal(verifySessionToken(createSessionToken("invalid", 60000)), null);
});

test("bad cookie encoding does not crash authentication", () => {
  assert.equal(parseCookies("mealq_session=%broken").mealq_session, "");
  assert.equal(parseCookies("a=1; b=hello%20world").b, "hello world");
});

test("remember me controls persistent cookie lifetime", () => {
  let options;
  const response = { req: { headers: {} }, cookie(_name, _token, value) { options = value; } };
  setSessionCookie(response, "1234567890abcdef12345678", false);
  assert.equal(options.maxAge, undefined);
  assert.equal(options.httpOnly, true);
  setSessionCookie(response, "1234567890abcdef12345678", true);
  assert.equal(options.maxAge, 30 * 24 * 60 * 60 * 1000);
});
