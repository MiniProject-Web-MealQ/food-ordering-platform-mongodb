# สมัครสมาชิกด้วย OTP ทางอีเมล

## การทำงาน

1. ลูกค้าหรือร้านค้ากรอกข้อมูลสมัครและรหัสผ่าน
2. Backend เก็บ draft แยกจาก User และส่ง OTP ตัวเลข 6 หลักทาง SMTP ยังไม่สร้างบัญชีหรือ session
3. ผู้สมัครกรอกรหัสจากอีเมล เมื่อยืนยันผ่านจึงสร้าง User และเข้าสู่ระบบ
4. ร้านค้าใหม่ยังอยู่สถานะรอ Admin อนุมัติและยังเปิดขายไม่ได้

Google Login ใช้สถานะ verified email ที่ได้รับจาก Google ไม่ต้องรับ OTP ซ้ำ บัญชีเดิมยังเข้าสู่ระบบได้ตามปกติ งานนี้ไม่ได้บังคับยืนยันย้อนหลัง

## ตั้ง Gmail

ในบัญชีผู้ส่ง เปิด 2-Step Verification และสร้าง [App Password](https://myaccount.google.com/apppasswords) สำหรับ MealQ ตาม [คู่มือ Google](https://support.google.com/mail/answer/185833?hl=th) ใช้รหัส 16 ตัวที่ได้สำหรับ SMTP ไม่ใช้รหัสผ่านบัญชี Google ปกติหรือ Google OAuth Client Secret

ตั้ง `backend/.env`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=YOUR_APP_PASSWORD
SMTP_FROM=MealQ <your-sender@gmail.com>
```

พอร์ต 587 ใช้ STARTTLS ตาม [ค่า SMTP ของ Gmail](https://support.google.com/mail/answer/7104828?hl=en) โค้ดบังคับ TLS เมื่อใช้ smtp.gmail.com ผ่านพอร์ตแบบนี้ ใช้ App Password โดยไม่มีช่องว่าง ตัวอีเมลใน FROM ควรตรงกับบัญชีผู้ส่ง

เก็บ credentials ใน `.env` ซึ่ง Git ignore แล้ว ไม่ใส่ใน Frontend ไม่ส่งในแชต ไม่ commit ค่าจริง หากไม่เห็นเมนู App Password ให้ตรวจ 2-Step Verification และนโยบายบัญชีตามคู่มือ Google

รีสตาร์ท Backend หลังแก้ `.env` แล้วตรวจการเชื่อมต่อโดยไม่ส่งอีเมล:

```powershell
cd E:\Work\food-ordering-platform-team-test\backend
npm.cmd run mail:check
```

เมื่อตรวจผ่าน เปิด `http://localhost:5173/register` และสมัครด้วยอีเมลที่ยังไม่มีบัญชี จากนั้นนำรหัสในกล่องจดหมายมากรอก หากไม่พบให้ตรวจสแปม การเชื่อมต่อ SMTP ผ่านยังไม่ใช่การยืนยันว่าอีเมลเข้าสู่ Inbox ของผู้รับแล้ว

## API

| Endpoint | Request / ผลลัพธ์ |
|---|---|
| `POST /api/v1/auth/register` | `{ name, email, password, phone?, role }` → HTTP 202 `{ verificationRequired: true, registrationId, email, expiresAt, resendAfter }` |
| `POST /api/v1/auth/register/resend` | `{ registrationId }` → challenge พร้อมวันหมดอายุ/เวลาส่งซ้ำใหม่ |
| `POST /api/v1/auth/register/verify` | `{ registrationId, code: "012345" }` → HTTP 201 `{ user, store }` พร้อม session cookie |

OTP มีอายุ 10 นาที ใช้ได้ครั้งเดียว กรอกผิดได้ 5 ครั้งต่อรหัส ขอส่งซ้ำหลัง 60 วินาที ไม่เกิน 5 ครั้งต่ออีเมลต่อชั่วโมง เริ่มกรอกฟอร์มสมัครใหม่ไม่สามารถเลี่ยง limit ของอีเมลได้ มี limit เพิ่ม 20 คำขอส่ง/100 คำขอยืนยันต่อ IP ต่อชั่วโมง บันทึก limit ใน MongoDB เพื่อใช้ร่วมกันระหว่างหลาย process

ส่งใหม่แล้วรหัสเก่าใช้ไม่ได้ การกดยืนยันพร้อมกันสร้างบัญชีได้ครั้งเดียว รหัส OTP เก็บเป็น HMAC โดยใช้ SESSION_SECRET รหัสผ่าน draft เก็บด้วย scrypt ไม่มี OTP/plaintext password ใน API response หรือ log และไม่มี bypass ใน development

หาก SMTP ยังไม่ตั้งค่าหรือส่งล้มเหลว ระบบตอบ HTTP 503 และไม่สร้างบัญชี โดยยังนับ cooldown ของการส่งที่ล้มเหลว เมื่อแก้ SMTP แล้วสมัครใหม่ได้หลังช่วงรอ Draft ที่ไม่จบถูกลบด้วย TTL หลังไม่มีการส่งใหม่ 24 ชั่วโมง ขณะยืนยันยังตรวจ expiry เองโดยไม่รอ TTL worker

หน้า OTP กลับมาได้เมื่อ refresh ด้วย metadata ใน sessionStorage โดยไม่บันทึกรหัสผ่านหรือ OTP สามารถกดส่งใหม่หรือย้อนกลับแก้อีเมลได้

## ตรวจสอบ

```powershell
cd backend
npm.cmd test
npm.cmd run test:otp
npm.cmd run test:integration
npm.cmd run test:regression
cd ..\frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

ชุด integration ใช้ SMTP inbox ที่รับเฉพาะ localhost และฐานข้อมูลสุ่มที่แยกจากแอป ไม่ส่งเมลผ่าน Gmail ที่ตั้งไว้ และลบข้อมูลทดสอบหลังรัน OTP integration ตรวจรหัสผิด/หมดอายุ/ใช้ซ้ำ/คำขอพร้อมกัน/cooldown/limit/SMTP ล้มเหลว/ร้านรออนุมัติ

ตรวจรอบนี้: Backend unit/HTTP ผ่าน 41 tests (ข้าม MongoDB Wallet test 1 ตามโหมดปกติ), Frontend ผ่าน 8 tests, OTP ผ่าน 7 กลุ่ม, workflow ผ่าน 10 กลุ่ม, regression ผ่าน 9 กลุ่ม, lint/build/syntax ผ่าน การตรวจ SMTP authentication กับ Gmail จริงผ่านแล้วโดยไม่ส่งเมล ยังต้องให้ผู้สมัครยืนยันการรับเมลใน Inbox จริงครั้งแรก
