const test = require("node:test");
const assert = require("node:assert/strict");
const { customerOrderEmailContent } = require("../src/services/order-email-content");

test("every customer stage has a distinct explanation, next action and truthful five-step snapshot", () => {
  const statuses = ["pending", "confirmed", "preparing", "ready", "completed"];
  for (const [index, status] of statuses.entries()) {
    const content = customerOrderEmailContent(status);
    assert.equal(content.step, index + 1);
    assert.equal(content.progress.length, 5);
    assert.equal(content.progress.filter((step) => step.state === "done").length, index);
    assert.deepEqual(content.progress.filter((step) => step.state === "current").map((step) => step.status), [status]);
    assert.ok(content.message.length > 30);
    assert.ok(content.nextAction.length > 30);
  }
  assert.match(customerOrderEmailContent("confirmed").message, /ร้านรับคำสั่งซื้อ/);
  assert.match(customerOrderEmailContent("preparing").message, /เริ่มทำอาหาร/);
  assert.match(customerOrderEmailContent("ready").nextAction, /รหัสหรือ QR/);
  const cancelled = customerOrderEmailContent("cancelled");
  assert.equal(cancelled.step, null);
  assert.deepEqual(cancelled.progress, []);
  assert.doesNotMatch(cancelled.message + cancelled.nextAction, /คืน.*แล้ว|ได้รับอาหารแล้ว/);
  assert.equal(customerOrderEmailContent("unsupported"), null);
});
