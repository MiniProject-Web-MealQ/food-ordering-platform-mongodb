# รายการ API ทั้งหมดของ MealQ

ตรวจจากโค้ดใน workspace วันที่ 20 ตุลาคม 2026 โดยอ้างอิง route ที่เชื่อมใช้งานจริงใน `backend/src/server.js` รวม **76 endpoints** นับแยกตาม HTTP method และ path

## การเรียกใช้งาน

- Base URL สำหรับรันในเครื่อง: `http://localhost:5000/api/v1` (พอร์ตเปลี่ยนได้ตาม `PORT`)
- ทุก path ในตารางด้านล่างเริ่มหลัง `/api/v1` เช่น `/auth/login` หมายถึง `POST http://localhost:5000/api/v1/auth/login`
- Request body ใช้ JSON และ `Content-Type: application/json` เมื่อมี body
- Authentication ใช้ session cookie ชื่อ `mealq_session`; browser client ต้องส่ง cookie เช่น `credentials: "include"` เมื่อเรียกข้าม origin
- `:id`, `:promotionId`, `:kind`, `:field` คือ path parameters ที่ต้องแทนด้วยค่าจริง
- รายการนี้เป็น inventory ของ HTTP API ไม่ใช่ schema ของ request/response ทุกฟิลด์ และไม่ได้ยืนยันผลด้วยการเรียกเซิร์ฟเวอร์จริง

| หมวด | จำนวน |
|---|---:|
| Public / ระบบและแค็ตตาล็อก | 9 |
| Authentication / บัญชีและการเข้าสู่ระบบ | 14 |
| Customer / ลูกค้า | 16 |
| Orders / การสั่งอาหาร | 6 |
| Merchant / ร้านค้าและพนักงาน | 20 |
| Admin / ผู้ดูแลระบบ | 11 |
| **รวม** | **76** |

## 1. Public — 9 endpoints

ไม่ต้องเข้าสู่ระบบ

| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/health` | ตรวจสถานะ API และการเชื่อมต่อฐานข้อมูล |
| GET | `/media/:kind/:id/:field` | อ่านรูปภาพเมนูหรือร้านค้าที่เก็บเป็น data URL |
| GET | `/config` | อ่านค่าบริการและสถานะรับออเดอร์ของระบบ |
| GET | `/restaurants` | แสดงรายการร้านที่มีสถานะ active พร้อมข้อมูลคิว |
| GET | `/restaurants/:id` | อ่านรายละเอียดร้าน |
| GET | `/restaurants/:id/menu` | อ่านเมนูของร้าน |
| GET | `/restaurants/:id/reviews` | อ่านรีวิวของร้าน |
| GET | `/menus` | แสดงรายการเมนูในแค็ตตาล็อก |
| GET | `/promotions` | แสดงโปรโมชัน |

Media รองรับ `kind=menu` กับ `field=image` และ `kind=store` กับ `field=logo` หรือ `cover_image`

## 2. Authentication — 14 endpoints

“เข้าสู่ระบบ” ในตารางหมายถึงทุก role ที่มี session ใช้งานได้ โดยการเปิดรับอีเมลออเดอร์มีเงื่อนไขเพิ่มเติมด้านล่าง

| Method | Path | สิทธิ์ | หน้าที่ |
|---|---|---|---|
| POST | `/auth/register` | Public | เริ่มสมัครสมาชิกและส่ง OTP ทางอีเมล |
| POST | `/auth/register/verify` | Public | ยืนยัน OTP เพื่อสร้างบัญชีและ session |
| POST | `/auth/register/resend` | Public | ส่ง OTP สมัครสมาชิกใหม่ |
| POST | `/auth/login` | Public | เข้าสู่ระบบ |
| POST | `/auth/logout` | Public | ออกจากระบบโดยล้าง session cookie |
| GET | `/auth/me` | เข้าสู่ระบบ | อ่านข้อมูลบัญชีปัจจุบัน |
| GET | `/auth/notification-preferences` | เข้าสู่ระบบ | อ่านการตั้งค่าอีเมลแจ้งเตือนออเดอร์ |
| PATCH | `/auth/notification-preferences` | เข้าสู่ระบบ | เปิดหรือปิดอีเมลแจ้งเตือนออเดอร์ |
| POST | `/auth/forgot-password` | Public | ขอเปลี่ยนรหัสผ่านผ่านลิงก์รีเซ็ต |
| POST | `/auth/reset-password` | Public พร้อม reset token | ตั้งรหัสผ่านใหม่ด้วย token |
| PATCH | `/auth/password` | เข้าสู่ระบบ | เปลี่ยนรหัสผ่านโดยยืนยันรหัสผ่านเดิม |
| GET | `/auth/capabilities` | Public | ตรวจความพร้อมของบริการ เช่น Google, อีเมล และโหมดชำระเงิน |
| GET | `/auth/google` | Public | เริ่มขั้นตอน Google OAuth |
| GET | `/auth/google/callback` | Public พร้อมการตรวจ OAuth | รับ callback จาก Google และสร้าง session |

- สมัครสมาชิกด้วยรหัสผ่านต้องยืนยัน OTP ก่อนสร้างบัญชี: `register` → `register/verify`; ใช้ `registrationId` และ `code` ในขั้นตอนยืนยัน
- การเปิด `emailOrders=true` รองรับเฉพาะ customer และ merchant ที่ยืนยันอีเมลแล้ว มีอีเมลที่ส่งถึงได้ และเซิร์ฟเวอร์ตั้งค่า SMTP พร้อมใช้งาน
- Google OAuth ต้องตั้งค่าบริการก่อนใช้งาน

## 3. Customer — 16 endpoints

ต้องเข้าสู่ระบบด้วย role `customer`

| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/customer/coupons` | อ่านคูปองและสิทธิ์คูปองของลูกค้า |
| POST | `/customer/coupons/:promotionId/collect` | เก็บคูปองจากโปรโมชัน |
| POST | `/customer/email-change` | ขอเปลี่ยนอีเมลและส่ง OTP |
| POST | `/customer/email-change/verify` | ยืนยัน OTP เพื่อเปลี่ยนอีเมล |
| GET | `/customer/notifications` | อ่านการแจ้งเตือนล่าสุด สูงสุด 100 รายการ |
| PATCH | `/customer/notifications/:id/read` | ทำเครื่องหมายว่าอ่านแล้ว; ใช้ `id=all` เพื่ออ่านทั้งหมด |
| GET | `/customer/push/key` | อ่าน VAPID public key สำหรับ Web Push |
| POST | `/customer/push/subscribe` | ลงทะเบียนอุปกรณ์รับ Web Push |
| POST | `/customer/push/unsubscribe` | ยกเลิกการรับ Web Push ของอุปกรณ์ |
| GET | `/customer/profile` | อ่านโปรไฟล์ลูกค้า |
| PATCH | `/customer/profile` | แก้ไขโปรไฟล์; เปลี่ยนอีเมลต้องผ่าน OTP แยก |
| GET | `/customer/favorites` | อ่านรายการโปรด |
| PUT | `/customer/favorites` | บันทึกแทนที่รายการโปรด |
| PATCH | `/customer/settings` | แก้ไขการตั้งค่าลูกค้า |
| GET | `/customer/wallet` | อ่านยอด Wallet และประวัติธุรกรรม |
| POST | `/customer/wallet/topup` | เติมเงินจำลองเข้า Wallet ในโหมด demo |

## 4. Orders — 6 endpoints

ต้องเข้าสู่ระบบด้วย role `customer` และเข้าถึงเฉพาะออเดอร์ของตนเอง

| Method | Path | หน้าที่ |
|---|---|---|
| POST | `/orders/check-stock` | ตรวจความพร้อมของเมนูและวัตถุดิบก่อนสั่ง |
| POST | `/orders` | สร้างออเดอร์ คำนวณยอด และดำเนินการ checkout |
| GET | `/orders` | อ่านรายการออเดอร์ของลูกค้าปัจจุบัน |
| PATCH | `/orders/:id/cancel` | ยกเลิกออเดอร์ตามสถานะที่อนุญาต พร้อมคืนเงินตามเงื่อนไข |
| POST | `/orders/:id/review` | ให้คะแนนและเขียนรีวิวออเดอร์ |
| GET | `/orders/:id` | อ่านรายละเอียดออเดอร์ |

Checkout ควรส่ง `Idempotency-Key` คงเดิมเมื่อ retry และส่ง `expectedTotal` เพื่อป้องกันการสร้างซ้ำและตรวจยอดก่อนชำระเงิน การชำระเงินเป็น demo หรือ Wallet ตามค่าระบบ ยังไม่มี payment provider สำหรับเงินจริง

## 5. Merchant — 20 endpoints

โดยทั่วไปอนุญาต role `merchant`, `staff`, `admin` และตรวจร้านที่บัญชีมีสิทธิ์จัดการใน controller อีกชั้น ห้ารายการด้านการแจ้งเตือน/Web Push อนุญาตเฉพาะ `merchant`

| Method | Path | สิทธิ์ role | หน้าที่ |
|---|---|---|---|
| GET | `/merchant/notifications` | merchant | อ่านการแจ้งเตือนล่าสุด สูงสุด 100 รายการ |
| PATCH | `/merchant/notifications/:id/read` | merchant | ทำเครื่องหมายว่าอ่านแล้ว; ใช้ `id=all` เพื่ออ่านทั้งหมด |
| GET | `/merchant/push/key` | merchant | อ่าน VAPID public key สำหรับ Web Push |
| POST | `/merchant/push/subscribe` | merchant | ลงทะเบียนอุปกรณ์รับ Web Push |
| POST | `/merchant/push/unsubscribe` | merchant | ยกเลิกการรับ Web Push ของอุปกรณ์ |
| GET | `/merchant/inventory` | merchant, staff, admin | อ่านวัตถุดิบและสถานะสต็อกต่ำ |
| POST | `/merchant/inventory` | merchant, staff, admin | เพิ่มวัตถุดิบพร้อมหน่วย จำนวน และจุดเตือนสต็อกต่ำ |
| PATCH | `/merchant/inventory/:id` | merchant, staff, admin | เพิ่มหรือลดจำนวนวัตถุดิบ และแก้จุดเตือนสต็อกต่ำ |
| GET | `/merchant/dashboard` | merchant, staff, admin | อ่านภาพรวมร้าน ยอดขาย และคิว |
| GET | `/merchant/orders` | merchant, staff, admin | อ่านรายการออเดอร์ของร้าน |
| GET | `/merchant/orders/:id` | merchant, staff, admin | อ่านรายละเอียดออเดอร์ของร้าน |
| PATCH | `/merchant/orders/:id/status` | merchant, staff, admin | เปลี่ยนสถานะออเดอร์ตามลำดับที่อนุญาต |
| POST | `/merchant/orders/:id/receive` | merchant, staff, admin | ตรวจรหัสรับอาหารและยืนยันการรับอาหาร |
| GET | `/merchant/menu` | merchant, staff, admin | อ่านรายการเมนูของร้าน |
| POST | `/merchant/menu` | merchant, staff, admin | เพิ่มเมนู |
| GET | `/merchant/menu/:id` | merchant, staff, admin | อ่านรายละเอียดเมนู |
| PATCH | `/merchant/menu/:id` | merchant, staff, admin | แก้ไขเมนู ตัวเลือก และสูตรวัตถุดิบ |
| DELETE | `/merchant/menu/:id` | merchant, staff, admin | ลบเมนู |
| GET | `/merchant/store` | merchant, staff, admin | อ่านข้อมูลร้านที่บัญชีจัดการ |
| PATCH | `/merchant/store` | merchant, staff, admin | แก้ไขข้อมูลร้าน รูปภาพ พิกัด เวลาเปิด และการรับออเดอร์ |

## 6. Admin — 11 endpoints

ต้องเข้าสู่ระบบด้วย role `admin` หากบัญชีมี `must_change_password=true` จะเรียกได้เฉพาะ `/admin/state` ในหมวดนี้ และได้รับข้อมูลจำกัด ส่วนรายการอื่นต้องเปลี่ยนรหัสผ่านก่อน

| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/admin/state` | อ่านข้อมูลรวมสำหรับหน้าจัดการ เช่น ผู้ใช้ ร้าน เมนู ออเดอร์ คิว โปรโมชัน Wallet และประวัติการทำงาน |
| GET | `/admin/settings` | อ่านการตั้งค่าระบบและสถานะบริการ |
| PATCH | `/admin/settings` | ปรับค่าบริการและเปิดหรือหยุดรับออเดอร์ทั้งระบบ |
| POST | `/admin/users/:id/reset-password` | ส่งคำขอรีเซ็ตรหัสผ่านของผู้ใช้ |
| PATCH | `/admin/stores/:id` | อนุมัติ ปฏิเสธ ระงับ หรือแก้ไขร้าน |
| PATCH | `/admin/users/:id` | เปลี่ยนสถานะ บทบาท และการผูกพนักงานกับร้าน |
| POST | `/admin/users` | สร้างบัญชีผู้ดูแลระบบใหม่ |
| POST | `/admin/promotions` | สร้างโปรโมชัน |
| PATCH | `/admin/promotions/:id` | แก้ไขโปรโมชัน |
| POST | `/admin/orders/:id/cancel` | ยกเลิกออเดอร์โดยผู้ดูแลระบบ พร้อมคืนเงินตามเงื่อนไข |
| POST | `/admin/wallets/:id/adjust` | ปรับเพิ่มหรือลดยอด Wallet พร้อมเหตุผล |

## Route เก่าที่มีไฟล์ แต่ไม่ได้เปิดใช้งาน

`backend/src/routes/userRoutes.js` ประกาศ `GET /` และ `POST /` สำหรับอ่านและสร้างผู้ใช้ แต่ **ไม่ได้ถูก mount ใน `backend/src/server.js`** จึงไม่มี URL ที่เปิดใช้งานจริง และไม่นับใน 76 endpoints ข้างต้น ไม่ควรอนุมานว่ามี `/api/v1/users`

## การอัปเดตแบบ Real-time

ระบบใช้ Socket.IO ผ่าน path เริ่มต้น `/socket.io` และส่ง event `order:new`, `order:created`, `order:status` ไปยังห้องผู้ใช้/ร้านตามสิทธิ์ รายการเหล่านี้เป็น Socket.IO events จึงไม่นับรวมกับ HTTP API ข้างต้น

## แหล่งอ้างอิงในโปรเจกต์

- [Server และ route mounts](../backend/src/server.js)
- [Public routes](../backend/src/routes/publicRoutes.js)
- [Authentication routes](../backend/src/routes/authRoutes.js)
- [Customer routes](../backend/src/routes/customerRoutes.js)
- [Order routes](../backend/src/routes/orderRoutes.js)
- [Merchant routes](../backend/src/routes/merchantRoutes.js)
- [Admin routes](../backend/src/routes/adminRoutes.js)
- [Authentication middleware](../backend/src/middleware/auth.js)
- [Session cookie](../backend/src/services/session.js)
