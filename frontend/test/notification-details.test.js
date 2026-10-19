import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationReader, notificationAction, notificationPresentation, notificationTime } from "../src/features/notifications/notification-details.js";

test("notification CTAs identify the destination and preserve valid role-local order paths", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.deepEqual(notificationAction({ kind: "ready", orderId: "MQ-024", url: `/customer/orders/${id}` }), { to: `/customer/orders/${id}`, label: "ดูรายละเอียดออเดอร์" });
  assert.deepEqual(notificationAction({ kind: "new", orderId: "MQ-024" }, "merchant"), { to: "/merchant/orders/MQ-024", label: "ดูรายละเอียดออเดอร์" });
  assert.deepEqual(notificationAction({ kind: "promo", restaurantId: "store-1", promotionId: "promo-12" }), { to: "/customer/coupons?promotionId=promo-12", label: "ดูคูปอง" });
  assert.deepEqual(notificationAction({ restaurantId: "store-1" }), { to: "/customer/restaurants/store-1", label: "ดูรายละเอียดร้าน" });
  assert.equal(notificationAction({ kind: "promo", promotionId: "promo-12" }, "merchant"), null);
});

test("notice URLs cannot redirect to another role, an external host or encoded/query destinations", () => {
  for (const url of ["https://attacker.example/customer/orders/abc", "//attacker.example/customer/orders/abc", "javascript:alert(1)", "/merchant/orders/abc", "/customer/orders/abc?next=https://attacker.example", "/customer/orders/abc#other", "/customer/orders/a%2Fb", "/customer/orders/../admin", "/customer/orders/a\\b", "/customer/orders/a b"]) {
    assert.equal(notificationAction({ url }), null, url);
    assert.deepEqual(notificationAction({ url, orderId: "MQ-024" }), { to: "/customer/orders/MQ-024", label: "ดูรายละเอียดออเดอร์" }, "A trusted-shape id may only form a current-role fallback");
  }
  for (const orderId of ["../admin", "a/b", "a%2Fb", "?redirect=elsewhere", "", {}, null]) assert.equal(notificationAction({ orderId }), null);
  assert.deepEqual(notificationAction({ kind: "promo", promotionId: "promo?redirect=elsewhere" }), { to: "/customer/coupons", label: "ดูคูปอง" });
  assert.equal(notificationAction({ orderId: "MQ-024" }, "admin"), null);
});

test("expanded content reports known status and refunds, without inventing a refund for cancellation", () => {
  const notice = { kind: "cancelled", orderId: "MQ-024", at: 1792410000000 };
  const cancelled = notificationPresentation(notice, { order: { id: "MQ-024", status: "CANCELLED", paymentStatus: "simulated", paymentMethod: "promptpay", total: 70, restaurantName: "ครัวอิ่มใจ" } });
  assert.equal(cancelled.label, "การยกเลิกออเดอร์");
  assert.ok(cancelled.rows.some((row) => row.label === "สถานะออเดอร์ปัจจุบัน" && row.value === "ยกเลิกแล้ว"));
  assert.equal(cancelled.rows.some((row) => /คืน/.test(row.value)), false);
  const refunded = notificationPresentation(notice, { order: { order_number: "MQ-024", status: "cancelled", payment_status: "refunded", payment_method: "wallet", total_price: 70 } });
  assert.ok(refunded.rows.some((row) => row.label === "คืนเข้า Wallet" && row.value === "฿70"));
  const unknown = notificationPresentation({ kind: "ready", orderId: "507f1f77bcf86cd799439011" });
  assert.equal(unknown.rows.some((row) => row.label === "สถานะออเดอร์ปัจจุบัน" || row.label === "ออเดอร์"), false);
});

test("coupon details retain known conditions and invalid dates do not crash the inbox", () => {
  const details = notificationPresentation({ kind: "promo", code: "LUNCH10", discountType: "percentage", discountValue: 10, minimumOrder: 100, maxDiscount: 30, description: "เฉพาะร้านร่วมรายการ", expiresAt: "2026-10-31T16:59:00Z", at: "invalid" });
  assert.ok(details.rows.some((row) => row.label === "รหัสคูปอง" && row.value === "LUNCH10"));
  assert.ok(details.rows.some((row) => row.label === "ส่วนลด" && row.value === "10%"));
  assert.ok(details.rows.some((row) => row.label === "ยอดขั้นต่ำ" && row.value === "฿100"));
  assert.equal(details.description, "เฉพาะร้านร่วมรายการ");
  assert.equal(notificationTime("invalid"), "ไม่ทราบเวลาแจ้งเตือน");
  assert.equal(notificationTime(null), "ไม่ทราบเวลาแจ้งเตือน");
});

test("read requests acknowledge only after server success and deduplicate rapid expansion retries", async () => {
  let release; const response = new Promise((resolve) => { release = resolve; });
  let calls = 0; const acknowledged = [];
  const reader = createNotificationReader({ send: () => { calls++; return response; }, onAcknowledged: (id) => acknowledged.push(id) });
  const first = reader.read("notice-1"); const duplicate = reader.read("notice-1");
  assert.equal(first, duplicate);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1); assert.deepEqual(acknowledged, []);
  release({ ok: true }); assert.equal((await first).ok, true);
  assert.deepEqual(acknowledged, ["notice-1"]);
});

test("read-all API failures leave read state untouched and remain retryable", async () => {
  let fail = true; const applied = [];
  const reader = createNotificationReader({ send: async () => fail ? { ok: false, error: { message: "Network unavailable" } } : { ok: true }, onAcknowledged: (id) => applied.push(id) });
  const failed = await reader.read("all"); assert.equal(failed.ok, false); assert.equal(failed.error.message, "Network unavailable"); assert.deepEqual(applied, []);
  fail = false; assert.equal((await reader.read("all")).ok, true); assert.deepEqual(applied, ["all"]);
});

test("a read response from an old account cannot apply after the owner changes", async () => {
  let current = true; let release; let calls = 0; const applied = [];
  const reader = createNotificationReader({ send: () => { calls++; return new Promise((resolve) => { release = resolve; }); }, isCurrent: () => current, onAcknowledged: (id) => applied.push(id) });
  const pending = reader.read("notice-1"); await new Promise((resolve) => setImmediate(resolve));
  current = false; release({ ok: true });
  assert.deepEqual(await pending, { ok: false, stale: true }); assert.deepEqual(applied, []);
  assert.deepEqual(await reader.read("all"), { ok: false, stale: true }); assert.equal(calls, 1);
});

test("thrown read errors return a visible failure without applying read state", async () => {
  let applied = false;
  const reader = createNotificationReader({ send: async () => { throw new Error("Connection interrupted"); }, onAcknowledged: () => { applied = true; } });
  const result = await reader.read("notice-1");
  assert.equal(result.ok, false); assert.equal(result.error.message, "Connection interrupted"); assert.equal(applied, false);
});
