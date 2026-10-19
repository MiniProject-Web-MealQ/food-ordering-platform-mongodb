const crypto = require("crypto");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function checkoutIdentity(req) {
  const selection = require("./coupon-input").couponSelection(req.body || {});
  const key = req.headers?.["idempotency-key"];
  if (key === undefined) return null; // Older API clients remain supported.
  if (typeof key !== "string" || !/^[\w-]{8,100}$/.test(key)) {
    throw Object.assign(new Error("รหัสคำขอสั่งซื้อไม่ถูกต้อง"), { status: 400, code: "INVALID_REQUEST_KEY" });
  }
  const body = { items: req.body.items.map(({ menuId, quantity, selections = {}, note = "" }) => ({ menuId, quantity, selections, note })), paymentMethod: req.body.paymentMethod || "promptpay", couponCode: selection.couponCode, ...(selection.couponId !== undefined ? { couponId: selection.couponId } : {}), ...(req.body.expectedTotal !== undefined ? { expectedTotal: req.body.expectedTotal } : {}) };
  return { key: `${req.user._id}:${key}`, fingerprint: crypto.createHash("sha256").update(JSON.stringify(canonical(body))).digest("hex") };
}

module.exports = { checkoutIdentity };
