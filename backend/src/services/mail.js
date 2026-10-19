const nodemailer = require("nodemailer");
const crypto = require("node:crypto");

function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function mailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_HOST === "smtp.gmail.com" && process.env.SMTP_SECURE !== "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function emailLayout({ preheader, eyebrow, title, introduction, content, safety }) {
  // Inline styles and presentation tables also work in clients that strip <style>.
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)} | MealQ</title></head>
<body style="margin:0;padding:0;background-color:#f8f4eb;color:#382719;font-family:Tahoma,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;color:#f8f4eb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f4eb;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 8px 24px;">
        <span style="display:inline-block;background-color:#f4c64e;border-radius:12px;padding:9px 13px;font-size:22px;font-weight:bold;letter-spacing:-1px;color:#382719;">MealQ<span style="color:#805b26;">.</span></span>
        <span style="display:inline-block;padding:8px 0 8px 10px;font-size:12px;color:#776857;">สั่งง่าย อิ่มไว ได้คิวชัดเจน</span>
      </td></tr>
      <tr><td style="background-color:#ffffff;border:1px solid #e8e0d2;border-radius:20px;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="height:6px;font-size:1px;line-height:1px;background-color:#f4c64e;">&nbsp;</td></tr>
          <tr><td style="padding:32px 24px 16px;">
            <p style="margin:0 0 12px;font-size:11px;line-height:1.5;font-weight:bold;letter-spacing:2px;color:#8e6a21;">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-size:26px;line-height:1.45;font-weight:bold;color:#382719;">${escapeHtml(title)}</h1>
            <p style="margin:0;font-size:15px;line-height:1.8;color:#776857;">${escapeHtml(introduction)}</p>
          </td></tr>
          <tr><td style="padding:8px 24px 24px;">${content}</td></tr>
          <tr><td style="padding:0 24px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #eee8dc;padding-top:20px;">
              <p style="margin:0;font-size:12px;line-height:1.9;color:#8a7b68;">${escapeHtml(safety)}</p>
            </td></tr></table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 16px 0;"><p style="margin:0;font-size:11px;line-height:1.9;color:#9a8b76;">ส่งโดย MealQ เพื่อดูแลความปลอดภัยของบัญชีคุณ<br>อีเมลนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function otpHtml(code, changeEmail = false) {
  const title = changeEmail ? "ยืนยันอีเมลใหม่ของคุณ" : "อีกขั้นเดียว ก็พร้อมใช้ MealQ";
  const copyUrl = otpCopyUrl(code);
  return emailLayout({
    preheader: changeEmail ? "ใช้รหัสยืนยันเพื่อเปลี่ยนอีเมลบัญชี MealQ รหัสมีอายุ 10 นาที" : "ยืนยันอีเมลสมัคร MealQ ด้วยรหัสที่ใช้ได้ครั้งเดียวภายใน 10 นาที",
    eyebrow: changeEmail ? "EMAIL CHANGE" : "WELCOME TO MEALQ",
    title,
    introduction: changeEmail ? "นำรหัสด้านล่างไปกรอกในหน้าเปลี่ยนอีเมล เพื่อยืนยันว่าอีเมลใหม่นี้เป็นของคุณ" : "ขอบคุณที่สมัคร MealQ นำรหัสด้านล่างไปกรอกในหน้าสมัครสมาชิก เพื่อยืนยันอีเมลของคุณ",
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color:#fff8df;border:1px solid #f0dfab;border-radius:14px;padding:24px 8px;">
      <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#8e6a21;">รหัสยืนยัน OTP</p>
      <div dir="ltr" aria-label="รหัสยืนยัน OTP" style="font-family:Consolas,'Courier New',monospace;font-size:34px;line-height:1.3;font-weight:bold;letter-spacing:6px;color:#382719;">${escapeHtml(code)}</div>
      <p style="margin:14px 0 0;font-size:12px;line-height:1.8;color:#8e6a21;">ใช้ได้ครั้งเดียว · หมดอายุใน <strong>10 นาที</strong></p>
    </td></tr></table>${copyUrl ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f4c64e" style="background-color:#f4c64e;border-radius:12px;"><a href="${escapeHtml(copyUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;border:1px solid #e8b63b;border-radius:12px;font-size:14px;line-height:1.5;font-weight:bold;color:#382719;text-decoration:none;">เปิดหน้าคัดลอกรหัส</a></td></tr></table>
      <p style="margin:12px 0 0;font-size:11px;line-height:1.8;color:#8a7b68;">เปิดหน้าเว็บแล้วกด “คัดลอกรหัส OTP”<br>จากนั้นกลับไปวางในแท็บสมัครสมาชิกหรือเปลี่ยนอีเมล</p>
    </td></tr></table>` : ""}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.8;color:#776857;">กรุณาอย่าเปิดเผยรหัสนี้แก่ผู้อื่น ทีมงาน MealQ จะไม่ขอรหัส OTP ของคุณ</p>`,
    safety: changeEmail ? "หากคุณไม่ได้ขอเปลี่ยนอีเมล ให้ข้ามอีเมลนี้ บัญชีจะยังใช้อีเมลเดิมจนกว่าจะยืนยันสำเร็จ" : "หากคุณไม่ได้สมัคร MealQ ให้ข้ามอีเมลนี้ได้อย่างปลอดภัย",
  });
}

function trustedFrontendOrigin() {
  const frontend = new URL((process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim());
  const localHttp = frontend.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(frontend.hostname);
  if ((frontend.protocol !== "https:" && !localHttp) || frontend.username || frontend.password) throw new Error("Invalid frontend email URL");
  return frontend.origin;
}

function otpCopyUrl(code) {
  if (typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) return null;
  try {
    // A fragment never travels in the HTTP request or referrer. It contains no
    // account/ticket/email data and the copy page clears it after capturing it.
    return `${trustedFrontendOrigin()}/copy-otp#code=${code}`;
  } catch {
    // A convenience link must not prevent delivery of the OTP itself.
    return null;
  }
}

function safeResetUrl(value) {
  const url = new URL(value);
  const frontendOrigin = trustedFrontendOrigin();
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.origin !== frontendOrigin || url.username || url.password) throw new Error("Invalid password reset email URL");
  return url.href;
}

async function sendRegistrationOtp(email, code) {
  await mailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "รหัส OTP ยืนยันอีเมลสมัคร MealQ",
    text: `รหัส OTP ยืนยันอีเมล MealQ ของคุณคือ ${code}\n\nรหัสมีอายุ 10 นาทีและใช้ได้ครั้งเดียว กรุณาอย่าเปิดเผยรหัสนี้แก่ผู้อื่น\nหากคุณไม่ได้สมัคร MealQ ให้ข้ามอีเมลนี้`,
    html: otpHtml(code),
  });
}

async function sendEmailChangeOtp(email, code) {
  await mailTransport().sendMail({ from: process.env.SMTP_FROM, to: email, subject: "รหัส OTP เปลี่ยนอีเมล MealQ", text: `รหัส OTP สำหรับเปลี่ยนอีเมล MealQ คือ ${code}\nรหัสมีอายุ 10 นาที ใช้ได้ครั้งเดียว หากไม่ได้ขอเปลี่ยนให้ข้ามอีเมลนี้`, html: otpHtml(code, true) });
}

async function sendResetEmail(email, resetUrl) {
  const url = safeResetUrl(resetUrl);
  await mailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "ตั้งรหัสผ่าน MealQ ใหม่",
    text: `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (หมดอายุใน 15 นาที):\n${url}\nหากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ให้ข้ามอีเมลนี้`,
    html: emailLayout({
      preheader: "ตั้งรหัสผ่าน MealQ ใหม่ผ่านลิงก์ที่ใช้ได้ครั้งเดียวภายใน 15 นาที",
      eyebrow: "ACCOUNT SECURITY",
      title: "มาตั้งรหัสผ่านใหม่กัน",
      introduction: "เราได้รับคำขอตั้งรหัสผ่านบัญชี MealQ ของคุณใหม่ กดปุ่มด้านล่างเพื่อเลือกรหัสผ่านใหม่ที่ปลอดภัย",
      content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:12px 0 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f4c64e" style="border-radius:12px;background-color:#f4c64e;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:16px 30px;border:1px solid #e8b63b;border-radius:12px;font-size:16px;line-height:1.5;font-weight:bold;text-decoration:none;color:#382719;">ตั้งรหัสผ่านใหม่</a></td></tr></table>
      </td></tr></table>
      <p style="margin:0 0 20px;text-align:center;font-size:12px;line-height:1.8;color:#8e6a21;">ใช้ได้ครั้งเดียว · ลิงก์หมดอายุใน <strong>15 นาที</strong></p>
      <p style="margin:0 0 8px;font-size:12px;line-height:1.8;color:#776857;">หากกดปุ่มไม่ได้ คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:</p>
      <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.8;"><a href="${escapeHtml(url)}" style="color:#8e6a21;word-break:break-all;">${escapeHtml(url)}</a></p>`,
      safety: "หากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ให้ข้ามอีเมลนี้ รหัสผ่านเดิมจะยังใช้งานได้จนกว่าคุณจะตั้งรหัสผ่านใหม่สำเร็จ",
    }),
  });
}

function orderNotificationUrl(value) {
  const origin = trustedFrontendOrigin();
  const url = new URL(value, origin);
  if (url.origin !== origin || url.username || url.password || url.search || url.hash || !/^\/(customer|merchant)\/orders\/[A-Za-z0-9_-]{1,100}$/.test(url.pathname)) throw new Error("Invalid order notification email URL");
  return url.href;
}

function moneyLabel(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000000000 ? `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
}

async function sendOrderNotificationEmail({ to, recipientName, title, message, url, orderNumber, storeName, total, items = [], notificationId }) {
  if (!require("./auth-validation").validEmail(to)) throw new Error("Invalid order notification email recipient");
  const actionUrl = orderNotificationUrl(url);
  const heading = typeof title === "string" && title.trim() ? title.trim() : "อัปเดตคำสั่งซื้อ MealQ";
  const greeting = recipientName ? `สวัสดีคุณ ${String(recipientName)}` : "สวัสดีจาก MealQ";
  const summary = typeof message === "string" ? message : "ตรวจสอบรายละเอียดและสถานะล่าสุดของออเดอร์ได้ใน MealQ";
  const number = orderNumber == null ? "" : String(orderNumber);
  const store = storeName == null ? "" : String(storeName);
  const amount = moneyLabel(total);
  const domain = new URL(trustedFrontendOrigin()).hostname;
  const messageId = typeof notificationId === "string" && notificationId ? `<mealq-order-${crypto.createHash("sha256").update(`${notificationId}\0${to}`).digest("hex")}@${/^[a-z0-9.-]+$/i.test(domain) ? domain : "mealq.local"}>` : undefined;
  const lines = (Array.isArray(items) ? items : []).slice(0, 50).map((item) => ({
    name: String(item?.name || "รายการอาหาร"),
    quantity: typeof item?.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? String(item.quantity) : "—",
    amount: moneyLabel(item?.totalPrice ?? item?.total_price ?? (typeof item?.price === "number" && typeof item?.quantity === "number" ? item.price * item.quantity : null)),
  }));
  await mailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to,
    ...(messageId ? { messageId } : {}),
    subject: `MealQ · ${heading.replace(/[\r\n]+/g, " ").slice(0, 160)}${number ? ` · ${number.replace(/[\r\n]+/g, " ").slice(0, 100)}` : ""}`,
    text: `${greeting}\n\n${heading}\n${summary}\n${number ? `\nออเดอร์: ${number}` : ""}${store ? `\nร้าน: ${store}` : ""}${lines.length ? `\n\n${lines.map((item) => `${item.name} × ${item.quantity}${item.amount ? ` — ${item.amount}` : ""}`).join("\n")}` : ""}${amount ? `\n\nยอดรวม: ${amount}` : ""}\n\nดูรายละเอียดออเดอร์:\n${actionUrl}\n\nคุณสามารถปรับการรับอีเมลออเดอร์ได้ในการตั้งค่า MealQ`,
    html: emailLayout({
      preheader: `${heading}${number ? ` · ออเดอร์ ${number}` : ""}`,
      eyebrow: "ORDER UPDATE",
      title: heading,
      introduction: `${greeting}\n${summary}`,
      content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8df;border:1px solid #f0dfab;border-radius:14px;"><tr><td style="padding:20px;">
        ${number ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.8;color:#8e6a21;">ออเดอร์ <strong>${escapeHtml(number)}</strong></p>` : ""}
        ${store ? `<p style="margin:0;font-size:16px;line-height:1.8;font-weight:bold;color:#382719;">${escapeHtml(store)}</p>` : ""}
        ${lines.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">${lines.map((item) => `<tr><td style="padding:8px 8px 8px 0;font-size:13px;line-height:1.8;color:#776857;">${escapeHtml(item.name)} <span style="white-space:nowrap;">× ${escapeHtml(item.quantity)}</span></td><td align="right" style="padding:8px 0;font-size:13px;line-height:1.8;white-space:nowrap;color:#382719;">${escapeHtml(item.amount || "")}</td></tr>`).join("")}</table>` : ""}
        ${amount ? `<p style="margin:14px 0 0;border-top:1px solid #eddfba;padding-top:16px;font-size:16px;line-height:1.8;font-weight:bold;color:#382719;">ยอดรวม <span style="float:right;white-space:nowrap;">${escapeHtml(amount)}</span></p>` : ""}
      </td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f4c64e" style="background-color:#f4c64e;border-radius:12px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:15px 24px;border:1px solid #e8b63b;border-radius:12px;font-size:15px;line-height:1.5;font-weight:bold;text-decoration:none;color:#382719;">ดูรายละเอียดออเดอร์</a></td></tr></table>
      </td></tr></table>`,
      safety: "คุณได้รับอีเมลนี้ตามการตั้งค่าแจ้งเตือนออเดอร์ ตรวจสอบสถานะล่าสุดหรือปรับการรับอีเมลได้ใน MealQ",
    }),
  });
}

async function verifyMailConnection() {
  const transport = mailTransport();
  try { return await transport.verify(); } finally { transport.close(); }
}

module.exports = { mailConfigured, sendResetEmail, sendRegistrationOtp, sendEmailChangeOtp, sendOrderNotificationEmail, verifyMailConnection };
