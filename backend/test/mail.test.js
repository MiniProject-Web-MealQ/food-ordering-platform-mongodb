const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const mail = require("../src/services/mail");

function captureMail(t, environment = {}) {
  const values = { SMTP_HOST: "smtp.gmail.com", SMTP_FROM: "MealQ <sender@example.test>", SMTP_PORT: "587", SMTP_SECURE: "false", SMTP_USER: "sender@example.test", SMTP_PASSWORD: "test-only-password", FRONTEND_URL: "https://mealq.site", ...environment };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => { for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value; });
  const messages = []; const transports = []; const state = { verified: 0, closed: 0 };
  t.mock.method(nodemailer, "createTransport", (options) => {
    transports.push(options);
    return { sendMail: async (message) => { messages.push(message); return { accepted: [message.to] }; }, verify: async () => { state.verified++; return true; }, close: () => { state.closed++; } };
  });
  return { messages, transports, state };
}

test("registration and email-change OTPs deliver branded HTML and matching plain text without changing purpose or lifetime", async (t) => {
  const { messages, transports } = captureMail(t);
  await mail.sendRegistrationOtp("signup@example.test", "012345");
  await mail.sendEmailChangeOtp("changed@example.test", "987654");
  assert.equal(messages.length, 2);
  for (const [index, code] of ["012345", "987654"].entries()) {
    const row = messages[index];
    assert.equal(row.from, "MealQ <sender@example.test>");
    assert.match(row.text, new RegExp(code)); assert.match(row.html, new RegExp(code));
    assert.match(row.text, /10 นาที/); assert.match(row.html, /10 นาที/);
    assert.match(row.html, /ใช้ได้ครั้งเดียว/); assert.match(row.html, /อย่าเปิดเผยรหัส/);
    assert.match(row.html, /<html lang="th">/); assert.match(row.html, /role="presentation"/);
    assert.match(row.html, /max-width:560px/); assert.match(row.html, /#f4c64e/);
    assert.doesNotMatch(row.html, /<script|<img|<link|url\(/i);
    assert.doesNotMatch(row.html, /test-only-password/);
    assert.doesNotMatch(row.subject, new RegExp(code));
    const copyLink = row.html.match(/href="([^"]*\/copy-otp[^"]*)"/)?.[1];
    assert.equal(copyLink, `https://mealq.site/copy-otp#code=${code}`);
    const copyUrl = new URL(copyLink);
    assert.equal(copyUrl.search, ""); assert.equal(copyUrl.hash, `#code=${code}`);
    assert.match(row.html, /เปิดหน้าคัดลอกรหัส/); assert.match(row.html, /เปิดหน้าเว็บแล้วกด/);
    assert.doesNotMatch(row.html, /\/copy-otp\?code=/);
    assert.equal(transports[index].requireTLS, true);
    assert.equal(transports[index].socketTimeout, 15000);
  }
  assert.match(messages[0].subject, /สมัคร/); assert.match(messages[0].html, /หน้าสมัครสมาชิก/);
  assert.match(messages[1].subject, /เปลี่ยนอีเมล/); assert.match(messages[1].html, /อีเมลเดิมจนกว่าจะยืนยันสำเร็จ/);
  assert.equal(messages[0].to, "signup@example.test"); assert.equal(messages[1].to, "changed@example.test");
});

test("dynamic OTP content is HTML escaped in both templates", async (t) => {
  const { messages } = captureMail(t);
  const input = '<img src=x onerror="alert(1)">&\'OTP';
  await mail.sendRegistrationOtp("signup@example.test", input);
  await mail.sendEmailChangeOtp("changed@example.test", input);
  for (const row of messages) {
    assert.equal(row.text.includes(input), true, "Plain text is kept as plain text");
    assert.equal(row.html.includes(input), false);
    assert.match(row.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&amp;&#39;OTP/);
    assert.doesNotMatch(row.html, /<img\s/);
    assert.doesNotMatch(row.html, /\/copy-otp/);
  }
});

test("OTP copy links use only the first trusted frontend origin and never propagate query, account or ticket metadata", async (t) => {
  const { messages } = captureMail(t, { FRONTEND_URL: "https://mealq.site/unused?email=private@example.test#ticket,https://other.example.test" });
  await mail.sendRegistrationOtp("recipient@example.test", "000123");
  const link = messages[0].html.match(/href="([^"]*\/copy-otp[^"]*)"/)?.[1];
  assert.equal(link, "https://mealq.site/copy-otp#code=000123");
  assert.doesNotMatch(link, /recipient|private|email|ticket|\?/);
});

test("invalid codes and unsafe configured origins omit the optional copy link without preventing OTP delivery", async (t) => {
  const { messages } = captureMail(t);
  for (const code of ["12345", "1234567", "123456\n", "12345<", "１２３４５６"]) await mail.sendRegistrationOtp("recipient@example.test", code);
  process.env.FRONTEND_URL = "javascript:alert(1)";
  await mail.sendRegistrationOtp("recipient@example.test", "123456");
  assert.equal(messages.length, 6);
  for (const row of messages) assert.doesNotMatch(row.html, /\/copy-otp|javascript:alert/);
});

test("reset email includes a safe CTA, escaped fallback link and the unchanged 15-minute plain-text lifetime", async (t) => {
  const { messages } = captureMail(t);
  const token = "ab".repeat(24);
  const url = `https://mealq.site/reset-password?token=${token}&source=email`;
  await mail.sendResetEmail("reset@example.test", url);
  const row = messages[0];
  assert.equal(row.to, "reset@example.test");
  assert.equal(row.text.includes(url), true); assert.match(row.text, /15 นาที/);
  assert.match(row.html, /15 นาที/); assert.match(row.html, /ใช้ได้ครั้งเดียว/);
  assert.equal(row.html.split(`href="https://mealq.site/reset-password?token=${token}&amp;source=email"`).length - 1, 2);
  assert.equal(row.html.includes(`token=${token}&source=`), false);
  assert.match(row.html, /คัดลอกลิงก์นี้/); assert.match(row.html, /รหัสผ่านเดิมจะยังใช้งานได้/);
  assert.equal(row.subject.includes(token), false);
});

test("reset email rejects foreign origins, unsafe schemes and URL credentials before creating a transport", async (t) => {
  const { messages, transports } = captureMail(t);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "https://attacker.example/reset-password?token=test", "https://mealq.site.attacker.example/reset-password", "https://name:password@mealq.site/reset-password", "http://mealq.site/reset-password", "//mealq.site/reset-password"]) await assert.rejects(mail.sendResetEmail("reset@example.test", url));
  assert.equal(messages.length, 0); assert.equal(transports.length, 0);
});

test("localhost reset mail remains available for development and uses the configured first frontend origin", async (t) => {
  const { messages } = captureMail(t, { FRONTEND_URL: "http://localhost:5173,https://mealq.site" });
  await mail.sendResetEmail("local@example.test", `http://localhost:5173/reset-password?token=${"01".repeat(24)}`);
  assert.match(messages[0].html, /href="http:\/\/localhost:5173\/reset-password\?token=/);
  await assert.rejects(mail.sendResetEmail("local@example.test", "https://mealq.site/reset-password?token=other"));
  assert.equal(messages.length, 1);
});

test("SMTP verification retains its existing TLS settings and closes the transport", async (t) => {
  const { transports, state } = captureMail(t);
  assert.equal(await mail.verifyMailConnection(), true);
  assert.equal(state.verified, 1); assert.equal(state.closed, 1);
  assert.equal(transports[0].secure, false); assert.equal(transports[0].requireTLS, true);
});

test("customer and merchant order emails contain escaped order snapshots, plain text and only the trusted role URL", async (t) => {
  const { messages } = captureMail(t);
  const input = { to: "order@synthetic-mail.mealq.site", recipientName: 'Name <script>"&', title: 'Order <ready> & "safe"', message: 'Message <img src=x onerror="bad">', orderNumber: 'MQ<123>&"', storeName: "Store & <Kitchen>", total: 84, items: [{ name: '<img src=x> & "Egg"', quantity: 2, totalPrice: 80 }] };
  for (const role of ["customer", "merchant"]) await mail.sendOrderNotificationEmail({ ...input, notificationId: `order-email-${role}`, url: `/${role}/orders/1234567890abcdef12345678` });
  assert.equal(messages.length, 2);
  for (const [index, role] of ["customer", "merchant"].entries()) {
    const row = messages[index];
    assert.match(row.html, /&lt;script&gt;&quot;&amp;/);
    assert.match(row.html, /Store &amp; &lt;Kitchen&gt;/);
    assert.match(row.html, /&lt;img src=x&gt; &amp; &quot;Egg&quot;/);
    assert.match(row.html, /MQ&lt;123&gt;&amp;&quot;/);
    assert.doesNotMatch(row.html, /<script>|<img\s/);
    assert.match(row.html, /฿84\.00/); assert.match(row.html, /฿80\.00/);
    assert.equal(row.html.includes(`href="https://mealq.site/${role}/orders/1234567890abcdef12345678"`), true);
    assert.match(row.text, /Store & <Kitchen>/); assert.match(row.text, /฿84\.00/);
    assert.match(row.messageId, /^<mealq-order-[a-f0-9]{64}@mealq\.site>$/);
    assert.doesNotMatch(row.messageId, /order@synthetic|order-email/);
    assert.doesNotMatch(row.html, /<script|url\(|<link|<img\s/i);
  }
});

test("order email retries keep the Message-ID stable without sharing it with another event or recipient", async (t) => {
  const { messages } = captureMail(t);
  const input = { to: "first@synthetic-mail.mealq.site", notificationId: "event-1", title: "New order", url: "/merchant/orders/MQ123" };
  await mail.sendOrderNotificationEmail(input); await mail.sendOrderNotificationEmail(input);
  await mail.sendOrderNotificationEmail({ ...input, notificationId: "event-2" });
  await mail.sendOrderNotificationEmail({ ...input, to: "second@synthetic-mail.mealq.site" });
  assert.equal(messages[0].messageId, messages[1].messageId);
  assert.notEqual(messages[0].messageId, messages[2].messageId);
  assert.notEqual(messages[0].messageId, messages[3].messageId);
});

test("unsafe order-email recipients, external origins and unrelated routes are rejected before SMTP", async (t) => {
  const { messages, transports } = captureMail(t);
  const input = { to: "owner@synthetic-mail.mealq.site", url: "/customer/orders/MQ123", title: "Order" };
  for (const url of ["https://attacker.example/customer/orders/MQ123", "//attacker.example/customer/orders/MQ123", "javascript:alert(1)", "https://user:password@mealq.site/customer/orders/MQ123", "/admin/orders/MQ123", "/customer/orders/MQ123?email=private@example.test", "/customer/orders/MQ123#secret", "/reset-password?token=secret", "/customer/orders/MQ123/other"]) await assert.rejects(mail.sendOrderNotificationEmail({ ...input, url }));
  for (const to of ["bad", "one@example.test,two@example.test", "one@example.test\r\nBcc:other@example.test"]) await assert.rejects(mail.sendOrderNotificationEmail({ ...input, to }));
  assert.equal(messages.length, 0); assert.equal(transports.length, 0);
});

test("customer stage emails show progress, an event timestamp and next action in both safe HTML and plain text", async (t) => {
  const { messages } = captureMail(t);
  for (const orderStatus of ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]) {
    await mail.sendOrderNotificationEmail({ to: "fixture@synthetic-mail.mealq.site", title: "Order update", url: "/customer/orders/MQ123", orderStatus, eventAt: "2026-10-19T12:00:00Z", total: 89 });
  }
  for (const [index, row] of messages.entries()) {
    assert.match(row.html, /สิ่งที่ทำต่อได้/);
    assert.match(row.text, /สิ่งที่ทำต่อได้/);
    assert.match(row.html, /บันทึกสถานะเมื่อ/);
    assert.match(row.text, /บันทึกสถานะเมื่อ/);
    assert.match(row.html, /สถานะล่าสุด/);
    if (index < 5) {
      assert.ok(row.text.includes(`ขั้นตอน ${index + 1}/5`));
      assert.ok(row.html.includes(`ขั้นตอน ${index + 1}/5`));
    } else {
      assert.match(row.text, /สิ้นสุดด้วยการยกเลิก/);
      assert.doesNotMatch(row.html, /รอดำเนินการ/);
    }
    assert.doesNotMatch(row.html, /<script|<img\s|<style|<link/i);
  }
  await mail.sendOrderNotificationEmail({ to: "fixture@synthetic-mail.mealq.site", title: "Order", url: "/customer/orders/MQ123", orderStatus: "ready", nextAction: '<img src=x onerror="bad">', eventAt: "invalid" });
  assert.match(messages.at(-1).html, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
  assert.doesNotMatch(messages.at(-1).html, /<img\s|Invalid Date/);
});
