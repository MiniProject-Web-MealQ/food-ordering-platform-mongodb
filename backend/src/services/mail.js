const nodemailer = require("nodemailer");

function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function sendResetEmail(email, resetUrl) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}),
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "ตั้งรหัสผ่าน MealQ ใหม่",
    text: `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (หมดอายุใน 15 นาที):\n${resetUrl}\nหากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ให้ข้ามอีเมลนี้`,
  });
}

module.exports = { mailConfigured, sendResetEmail };
