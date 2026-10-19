import test from "node:test";
import assert from "node:assert/strict";
import { clearCopyOtpUrl, copyOtp, otpFromFragment } from "../src/features/auth/copy-otp.js";

test("copy page accepts exactly a six-digit fragment and preserves leading zeros", () => {
  assert.equal(otpFromFragment("#code=012345"), "012345");
  for (const input of [null, undefined, "", "?code=123456", "123456", "#code=12345", "#code=1234567", "#code=１２３４５６", "#code=%31%32%33%34%35%36", "#code=123456&email=a@b.test", "#email=a@b.test&code=123456", "#code=<script>", "#code=123456\n"]) assert.equal(otpFromFragment(input), null, String(input));
});

test("removing the URL keeps router state and a previously captured code without persisting it", () => {
  const location = { pathname: "/copy-otp", hash: "#code=012345", search: "?unexpected=data" };
  const capturedFirstRender = otpFromFragment(location.hash);
  const capturedSecondRender = otpFromFragment(location.hash);
  const state = { idx: 1, key: "router-key" }; const changes = [];
  const history = { state, replaceState: (...args) => { changes.push(args); location.hash = ""; location.search = ""; } };
  clearCopyOtpUrl(history, location); clearCopyOtpUrl(history, location);
  assert.deepEqual(changes, [[state, "", "/copy-otp"]]);
  assert.equal(capturedFirstRender, "012345"); assert.equal(capturedSecondRender, "012345");
  assert.equal(otpFromFragment(location.hash), null);
});

test("copy validates the code and waits for clipboard success before reporting copied", async () => {
  let copied = null; let finish;
  const clipboard = { writeText: (value) => { copied = value; return new Promise((resolve) => { finish = resolve; }); } };
  for (const value of [null, "", "12345", "1234567", "#code=123456"]) assert.equal(await copyOtp(value, clipboard), "invalid");
  assert.equal(copied, null);
  const pending = copyOtp("012345", clipboard);
  assert.equal(copied, "012345"); finish();
  assert.equal(await pending, "copied");
});

test("unsupported or denied clipboard gives truthful failure and keeps the code selectable", async () => {
  assert.equal(await copyOtp("123456", undefined), "unsupported");
  assert.equal(await copyOtp("123456", {}), "unsupported");
  assert.equal(await copyOtp("123456", { writeText: async () => { throw new Error("Permission denied"); } }), "failed");
});
