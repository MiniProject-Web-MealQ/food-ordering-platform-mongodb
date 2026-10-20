# ผังการทำงานของระบบ MealQ

ชุดผังนี้แบ่งงานเป็น 10 ส่วน เริ่มอ่านผัง 01 เพื่อดูภาพรวม แล้วเปิดผังเฉพาะเรื่องตามลำดับ ตารางด้านล่างมีภาพ PNG สำหรับใส่รายงานหรือสไลด์ SVG สำหรับขยายภาพ และ Mermaid สำหรับแก้ไขผังต่อ

[อ่าน PDF รวมทุกผัง](MealQ-System-Workflows.pdf) มีสารบัญเลือกหน้าในตัว PDF และขยายอ่านข้อความได้ชัดเจน

สัญลักษณ์: กล่องคือกิจกรรม ข้าวหลามตัดคือเงื่อนไข ทรงกระบอกคือฐานข้อมูล ลูกศรทึบคือลำดับงาน และเส้นประคืองานที่เชื่อมโยงหรือการแจ้งเหตุการณ์

| ผัง | เนื้อหา | ไฟล์ |
|---|---|---|
| 01 | ภาพรวมการทำงานของ MealQ | [PNG](png/01-system-overview.png) · [SVG](svg/01-system-overview.svg) · [Mermaid](mermaid/01-system-overview.mmd) |
| 02 | สมัครสมาชิกและเข้าสู่ระบบ | [PNG](png/02-account-access.png) · [SVG](svg/02-account-access.svg) · [Mermaid](mermaid/02-account-access.mmd) |
| 03 | ลูกค้าเลือกอาหารและสั่งซื้อ | [PNG](png/03-customer-checkout.png) · [SVG](svg/03-customer-checkout.svg) · [Mermaid](mermaid/03-customer-checkout.mmd) |
| 04 | จากร้านรับออเดอร์จนลูกค้าได้รับอาหาร | [PNG](png/04-order-fulfilment.png) · [SVG](svg/04-order-fulfilment.svg) · [Mermaid](mermaid/04-order-fulfilment.mmd) |
| 05 | ร้านค้าตั้งค่าร้าน เมนู และวัตถุดิบ | [PNG](png/05-merchant-operation.png) · [SVG](svg/05-merchant-operation.svg) · [Mermaid](mermaid/05-merchant-operation.mmd) |
| 06 | การทำงานของแอดมิน | [PNG](png/06-admin-operation.png) · [SVG](svg/06-admin-operation.svg) · [Mermaid](mermaid/06-admin-operation.mmd) |
| 07 | คูปองและ Wallet ทดลอง | [PNG](png/07-coupon-wallet.png) · [SVG](svg/07-coupon-wallet.svg) · [Mermaid](mermaid/07-coupon-wallet.mmd) |
| 08 | การอัปเดตสถานะและแจ้งเตือน | [PNG](png/08-notification-delivery.png) · [SVG](svg/08-notification-delivery.svg) · [Mermaid](mermaid/08-notification-delivery.mmd) |
| 09 | ยกเลิกออเดอร์และกู้คืน checkout ที่ค้าง | [PNG](png/09-cancel-recovery.png) · [SVG](svg/09-cancel-recovery.svg) · [Mermaid](mermaid/09-cancel-recovery.mmd) |
| 10 | ระบบแต่ละส่วนเชื่อมกันอย่างไร | [PNG](png/10-system-architecture.png) · [SVG](svg/10-system-architecture.svg) · [Mermaid](mermaid/10-system-architecture.mmd) |

การชำระเงินเป็น Demo ไม่มีการรับเงินจริงผ่านธนาคาร ผังเป็นภาพระดับขั้นตอนงาน กรณีส่งซ้ำและคืนทรัพยากรยังต้องผ่านตัวป้องกันการทำซ้ำใน Backend ตามเดิม

## 01 ภาพรวมการทำงานของ MealQ

เริ่มจากบทบาทผู้ใช้ แล้วเชื่อมงานทุกส่วนผ่าน Backend เดียวกัน

```mermaid
flowchart TD
 START([เปิดเว็บไซต์ MealQ]) --> PUBLIC[ดูร้าน เมนู และหน้าสาธิต]
 PUBLIC --> AUTH[สมัครหรือเข้าสู่ระบบ]
 AUTH --> ROLE{บทบาทของบัญชี}
 ROLE --> C[ลูกค้า]
 ROLE --> M[ร้านค้า / พนักงาน]
 ROLE --> A[แอดมิน]
 C --> C1[ค้นหา / สุ่มอาหาร / ร้าน<br/>โปรด]
 C1 --> C2[ตะกร้า / คูปอง / ชำระ<br/>ยอดทดลอง]
 C2 --> C3[ติดตามคิว / รับอาหาร /<br/>รีวิว]
 C --> C4[โปรไฟล์ / Wallet / การ<br/>แจ้งเตือน]
 M --> M1[ข้อมูลร้าน / เมนู / สูตร /<br/>สต็อก]
 M1 --> M2[รับออเดอร์ / ทำอาหาร /<br/>ตรวจรหัสรับ]
 M --> M3[รายงาน / ตั้งค่าร้าน]
 A --> A1[อนุมัติร้าน / ผู้ใช้ /<br/>พนักงาน]
 A1 --> A2[โปรโมชัน / ออเดอร์ /<br/>Wallet / ตั้งค่า]
 C3 --> API[Backend ตรวจสิทธิ์และ<br/>กฎของระบบ]
 C4 --> API
 M2 --> API
 M3 --> API
 A2 --> API
 API --> DB[(MongoDB)]
 API -.-> NOTICE[แจ้งเตือนในแอป / อีเมล /<br/>อุปกรณ์]
 class C,C1,C2,C3,C4 customer
 class M,M1,M2,M3 merchant
 class A,A1,A2 admin
 class START,DB terminal

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- ลูกค้าและร้านค้าใช้หน้า /login ส่วนแอดมินใช้ /admin/login
- พนักงานใช้ส่วนงานของร้านที่แอดมินมอบหมาย การตั้งค่าแจ้งเตือนร้านเป็นของเจ้าของร้าน
- ลูกค้าค้นหาร้าน สุ่มอาหาร ดูร้านโปรด และดูข้อมูลสาธารณะได้ตามหน้าที่ระบบเปิดไว้ แต่การสั่งซื้อต้องเข้าสู่ระบบ

โค้ดอ้างอิง: [frontend/src/routes/AppRoutes.jsx](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/frontend/src/routes/AppRoutes.jsx), [backend/src/routes/customerRoutes.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/routes/customerRoutes.js), [backend/src/routes/merchantRoutes.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/routes/merchantRoutes.js), [backend/src/routes/adminRoutes.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/routes/adminRoutes.js)

## 02 สมัครสมาชิกและเข้าสู่ระบบ

แยกการยืนยันอีเมล การตรวจบัญชี และการออก session

```mermaid
flowchart TD
 START([หน้าเข้าสู่ระบบ]) --> HAVE{มีบัญชีแล้วหรือไม่}
 HAVE -- ยังไม่มี --> REG[กรอกข้อมูลและเลือก<br/>ลูกค้า / ร้านค้า]
 REG --> SEND[ส่ง OTP ทางอีเมล]
 SEND --> OTP{OTP ถูกต้องและยังไม่<br/>หมดอายุ}
 OTP -- ไม่ผ่าน --> RETRY[แก้รหัสหรือขอส่งใหม่ตาม<br/>เวลาที่กำหนด]
 RETRY --> OTP
 OTP -- ผ่าน --> CREATE[สร้างบัญชีและยืนยันอีเมล]
 CREATE --> NEWSTORE[ถ้าเป็นร้านค้า สร้างร้านรอ<br/>อนุมัติ]
 NEWSTORE --> SESSION
 HAVE -- มีแล้ว --> METHOD{วิธีเข้าสู่ระบบ}
 METHOD -- รหัสผ่าน --> INPUT[กรอกอีเมล รหัสผ่าน และ<br/>ประเภทบัญชี]
 INPUT --> VERIFY{รหัสถูก บัญชีใช้งานได้<br/>และบทบาทตรง}
 VERIFY -- ไม่ผ่าน --> ERROR([แจ้งสาเหตุและกลับหน้า<br/>เข้าสู่ระบบ])
 VERIFY -- ผ่าน --> SESSION[ออก session cookie ที่ลง<br/>ลายเซ็น]
 METHOD -- Google --> GOOGLE[ยืนยันกับ Google และ<br/>ตรวจ OAuth state]
 GOOGLE --> GOK{อีเมลยืนยันแล้วและบัญชี<br/>ผ่านเงื่อนไข}
 GOK -- ไม่ผ่าน --> ERROR
 GOK -- ผ่าน --> GUSER[ค้นหาหรือสร้างบัญชีตาม<br/>บทบาท]
 GUSER --> SESSION
 INPUT -. ลืมรหัสผ่าน .-> RESET[ส่งลิงก์ตั้งรหัสผ่านใหม่]
 RESET --> NEWPASS[ตรวจ token และตั้งรหัส<br/>ใหม่]
 NEWPASS --> REVOKE[ยกเลิก session เก่า]
 REVOKE --> INPUT
 SESSION --> HOME([เปิดหน้าตามบทบาทผู้ใช้])
 class START,HOME terminal
 class ERROR,RETRY warning

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- สมัครเองได้เฉพาะ customer หรือ merchant ร้านใหม่อยู่สถานะ pending จนแอดมินอนุมัติ
- OTP สมัครมีอายุ 10 นาที จำกัดจำนวนครั้งที่ลองและการส่งซ้ำ Google Login ใช้อีเมลที่ Google ยืนยันแล้ว
- ลืมรหัสผ่านใช้ลิงก์ครั้งเดียวอายุ 15 นาที เมื่อเปลี่ยนรหัสผ่านหรือยืนยันเปลี่ยนอีเมล ระบบยกเลิก session เก่าด้วย session_version
- การแก้ชื่อ เบอร์โทร และค่าการใช้งานทำผ่านโปรไฟล์ ส่วนเปลี่ยนอีเมลต้องผ่าน OTP แยก

โค้ดอ้างอิง: [backend/src/controllers/authController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/authController.js), [backend/src/controllers/googleAuthController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/googleAuthController.js), [backend/src/services/registration-otp.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/registration-otp.js), [backend/src/services/session.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/session.js), [backend/src/services/email-change.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/email-change.js)

## 03 ลูกค้าเลือกอาหารและสั่งซื้อ

ตรวจวัตถุดิบก่อนยืนยัน และตรวจซ้ำที่เซิร์ฟเวอร์ก่อนสร้างคิว

```mermaid
flowchart LR
 subgraph CUSTOMER[1 เตรียมรายการ]
 direction TB
 START([ลูกค้าเข้าสู่ระบบแล้ว]) --> FIND[ค้นหาร้าน / หมวดหมู่ /<br/>สุ่มเมนู]
 FIND --> MENU[เลือกเมนู ตัวเลือก จำนวน<br/>และหมายเหตุ]
 MENU --> CART[ตรวจตะกร้าของร้านเดียว]
 CART --> COUPON[เลือกคูปองที่เก็บไว้ได้ 1<br/>ใบ หรือไม่ใช้]
 COUPON --> PREFLIGHT[ขอตรวจวัตถุดิบก่อนสั่ง]
 PREFLIGHT --> STOCK{สูตรและวัตถุดิบพร้อมหรือ<br/>ไม่}
 STOCK -- ไม่พร้อม --> EDIT[แสดงเมนูหรือวัตถุดิบที่<br/>ขาด]
 EDIT --> CART
 STOCK -- พร้อม --> CONFIRM[เลือกวิธีชำระและกดยืนยัน]
 end
 subgraph BACKEND[2 ตรวจคำสั่งซื้อ]
 direction TB
 CHECK[ตรวจสิทธิ์ ร้าน คิว ราคา<br/>คูปอง และสต็อกซ้ำ]
 CHECK --> VALID{ข้อมูลและเงื่อนไขผ่าน<br/>หรือไม่}
 VALID -- ไม่ผ่าน --> REJECT([แจ้งให้กลับไปแก้ตะกร้า])
 VALID -- ผ่าน --> RESERVE[สร้างออเดอร์และจอง<br/>วัตถุดิบ]
 end
 subgraph PAYMENT[3 ชำระและสร้างคิว]
 direction TB
 PAY{วิธีชำระ}
 PAY -- Wallet --> DEBIT[หักยอดทดลองแบบ<br/>ป้องกันการตัดซ้ำ]
 PAY -- PromptPay Demo --> SIMULATE[บันทึกการชำระจำลอง]
 DEBIT --> OK{ขั้นตอนชำระสำเร็จหรือไม่}
 SIMULATE --> OK
 OK -- ไม่สำเร็จ --> RECOVER[คืนสิ่งที่จองหรือหักไป ดู<br/>ผัง 09]
 OK -- สำเร็จ --> QUEUE[สร้างเลขคิวและรหัสรับ<br/>อาหาร 4 หลัก]
 QUEUE --> DONE([ออเดอร์ pending และ<br/>แจ้งร้าน])
 end
 CUSTOMER -- ยืนยันแล้ว --> BACKEND
 BACKEND -- จองสำเร็จ --> PAYMENT
 class START,DONE terminal
 class EDIT,RECOVER warning

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- หนึ่งออเดอร์สั่งได้จากร้านเดียว และเลือกคูปองที่เก็บไว้ได้ไม่เกินหนึ่งใบ
- เมนูต้องผูกสูตรอย่างน้อยหนึ่งวัตถุดิบ ใช้หน่วยตรงกับสต็อก และมีปริมาณเพียงพอรวมทั้งตะกร้า
- การตรวจสต็อกก่อนกดซื้อเป็นเพียงการตรวจ ณ ขณะนั้น Backend จึงต้องตรวจและจองซ้ำตอนสร้างออเดอร์
- PromptPay และ Wallet ในระบบนี้เป็นการทดลอง ไม่มีการตัดเงินจริงผ่านธนาคาร

โค้ดอ้างอิง: [frontend/src/pages/customer/Checkout.jsx](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/frontend/src/pages/customer/Checkout.jsx), [frontend/src/pages/customer/Payment.jsx](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/frontend/src/pages/customer/Payment.jsx), [backend/src/controllers/orderController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/orderController.js), [backend/src/services/order-pricing.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/order-pricing.js), [backend/src/services/inventory.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/inventory.js)

## 04 จากร้านรับออเดอร์จนลูกค้าได้รับอาหาร

ร้านเป็นผู้ยืนยันรับอาหารด้วยรหัสหรือ QR ก่อนจบรายการ

```mermaid
flowchart LR
 subgraph STAGES[1 ร้านทำออเดอร์]
 direction TB
 START([ชำระยอดทดลองและสร้าง<br/>คิวสำเร็จ]) --> PENDING[รอร้านรับออเดอร์ /<br/>pending]
 PENDING --> CONFIRMED[ร้านรับออเดอร์ /<br/>confirmed]
 CONFIRMED --> PREPARING[ร้านเริ่มทำอาหาร /<br/>preparing]
 PREPARING --> READY[อาหารพร้อมรับ / ready]
 end
 subgraph PICKUP[2 ตรวจรับอาหาร]
 direction TB
 ARRIVE[ลูกค้ามารับและแสดงรหัส<br/>หรือ QR]
 ARRIVE --> SCAN[ร้านกรอกรหัสหรือสแกน<br/>QR]
 SCAN --> VALID{ออเดอร์พร้อมรับและรหัส<br/>ตรงกัน}
 VALID -- ไม่ตรง --> RETRY[แจ้งข้อผิดพลาดและตรวจ<br/>ใหม่]
 RETRY --> SCAN
 VALID -- ตรง --> COMPLETE[บันทึกรับอาหารและจบคิว<br/>/ completed]
 end
 subgraph AFTER[3 รีวิวหลังรับ]
 direction TB
 REVIEW{ลูกค้าต้องการรีวิวหรือไม่}
 REVIEW -- ต้องการ --> RATE[ให้คะแนนและเขียนรีวิว]
 RATE --> SUMMARY[อัปเดตคะแนนสรุปของ<br/>ร้าน]
 SUMMARY --> DONE([จบการสั่งซื้อ])
 REVIEW -- ไม่รีวิว --> DONE
 end
 STAGES -- พร้อมรับ --> PICKUP
 PICKUP -- รับสำเร็จ --> AFTER
 class START,DONE,COMPLETE terminal
 class RETRY warning

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- ชื่อสถานะจริงเรียงเป็น pending → confirmed → preparing → ready → completed
- ร้านกดข้ามไป completed โดยไม่ตรวจรหัสไม่ได้ และต้องเป็นออเดอร์ของร้านนั้นที่พร้อมรับแล้ว
- ลูกค้ารีวิวได้หลังออเดอร์ completed ระบบนำคะแนนไปอัปเดตสรุปคะแนนของร้าน
- ทุกการเปลี่ยนสถานะที่บันทึกสำเร็จสัมพันธ์กับคิวและเหตุการณ์แจ้งเตือน ไม่ได้อาศัยหน้าจอของร้านเพียงอย่างเดียว

โค้ดอ้างอิง: [backend/src/controllers/merchantController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/merchantController.js), [backend/src/controllers/orderController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/orderController.js), [backend/src/models/Queue.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/models/Queue.js), [backend/src/services/notifications.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/notifications.js)

## 05 ร้านค้าตั้งค่าร้าน เมนู และวัตถุดิบ

ร้านเตรียมข้อมูลได้ระหว่างรออนุมัติ แต่ต้องผ่านอนุมัติก่อนเปิดขาย

```mermaid
flowchart LR
 subgraph DATA[1 เตรียมข้อมูล]
 direction TB
 START([เจ้าของร้าน / พนักงานเข้า<br/>สู่ระบบ]) --> STORE[โหลดร้านที่บัญชีมีสิทธิ์<br/>จัดการ]
 STORE --> INFO[ตั้งชื่อร้าน รูป ที่ตั้ง และ<br/>เวลาเปิด]
 INFO --> INGREDIENT[เพิ่มวัตถุดิบ หน่วย และ<br/>ยอดคงเหลือ]
 INGREDIENT --> MENU[สร้างหรือแก้เมนู ราคา<br/>หมวดหมู่ และตัวเลือก]
 MENU --> RECIPE[กำหนดสูตรวัตถุดิบต่อหนึ่ง<br/>จาน]
 RECIPE --> VALID{สูตรและหน่วยถูกต้องหรือ<br/>ไม่}
 VALID -- ไม่ถูกต้อง --> RECIPE
 VALID -- ถูกต้อง --> SAVE[บันทึกเมนูและความพร้อม<br/>ขาย]
 end
 subgraph APPROVAL[2 อนุมัติร้าน]
 direction TB
 APPROVED{ร้านผ่านอนุมัติแล้วหรือไม่}
 APPROVED -- ยังไม่ผ่าน --> WAIT[เตรียมข้อมูลได้ แต่ยังเปิด<br/>ขายไม่ได้]
 WAIT --> ADMIN[แอดมินตรวจและอนุมัติ ดู<br/>ผัง 06]
 ADMIN --> APPROVED
 APPROVED -- ผ่านแล้ว --> ACTIVE([ร้านอยู่สถานะ active])
 end
 subgraph SALES[3 เปิดขาย]
 direction TB
 OPEN[เปิดรับออเดอร์แบบมือหรือ<br/>อัตโนมัติ]
 OPEN --> READY{เปิดตามเวลาและมีเมนู<br/>พร้อมขาย}
 READY -- ไม่พร้อม --> PAUSE[พักขาย / เติมสต็อก / แก้<br/>เมนู]
 PAUSE --> OPEN
 READY -- พร้อม --> PUBLIC[แสดงร้านและเมนูพร้อม<br/>ขายให้ลูกค้า]
 PUBLIC --> ORDER([รับออเดอร์และทำอาหาร<br/>ดูผัง 04])
 end
 DATA -- เตรียมแล้ว --> APPROVAL
 APPROVAL -- อนุมัติแล้ว --> SALES
 class START,ORDER terminal
 class WAIT,PAUSE warning

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- เจ้าของร้านดูแลร้านของตน ส่วนพนักงานดูแลร้านที่ได้รับมอบหมาย
- สูตรต่อหนึ่งจานเก็บวัตถุดิบ ปริมาณ และหน่วย หลายเมนูใช้วัตถุดิบกองเดียวกันได้
- เปิดขายได้เมื่อสถานะร้านเป็น active และเจ้าของบัญชีใช้งานได้ เวลาเปิดอัตโนมัติยังต้องเคารพการหยุดขายด้วยตนเอง
- เมนูไม่มีสูตรหรือวัตถุดิบไม่พอไม่ควรรับออเดอร์ใหม่ การเปลี่ยนสูตรไม่ตัดออเดอร์เก่าย้อนหลัง

โค้ดอ้างอิง: [backend/src/controllers/merchantController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/merchantController.js), [backend/src/controllers/inventoryController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/inventoryController.js), [backend/src/services/inventory.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/inventory.js), [backend/src/services/store-hours.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/store-hours.js), [backend/src/services/merchant-store.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/merchant-store.js)

## 06 การทำงานของแอดมิน

ตรวจสิทธิ์ก่อนทุกงาน และบันทึกประวัติการเปลี่ยนข้อมูลสำคัญ

```mermaid
flowchart TD
 START([แอดมินเข้าสู่ระบบ]) --> AUTH{session และบทบาท<br/>admin ถูกต้อง}
 AUTH -- ไม่ถูกต้อง --> DENY([ปฏิเสธการเข้าถึง])
 AUTH -- ถูกต้อง --> FIRST{ต้องเปลี่ยนรหัสเริ่มต้นหรือ<br/>ไม่}
 FIRST -- ต้องเปลี่ยน --> PASSWORD[เปลี่ยนรหัสผ่านก่อน<br/>ทำงาน]
 PASSWORD --> DASH
 FIRST -- ไม่ต้อง --> DASH[ดูภาพรวมระบบและเลือก<br/>งาน]
 DASH --> STORES[ตรวจร้านที่รออนุมัติ]
 STORES --> DECIDE{ผลการตรวจร้าน}
 DECIDE -- อนุมัติ --> ACTIVE[ร้าน active และเจ้าของ<br/>เปิดขายได้]
 DECIDE -- ปฏิเสธ / ระงับ --> CLOSED[ระบุเหตุผลและหยุดรับออ<br/>เดอร์]
 DASH --> USERS[จัดการผู้ใช้ บทบาท<br/>สถานะ และพนักงาน]
 DASH --> PROMO[สร้างโปรโมชัน ตั้งค่าค่า<br/>บริการ และการรับออเดอร์]
 DASH --> FINANCE[ตรวจออเดอร์ ยกเลิก หรือ<br/>ปรับ Wallet พร้อมเหตุผล]
 ACTIVE --> AUDIT[บันทึกประวัติการดำเนิน<br/>การ]
 CLOSED --> AUDIT
 USERS --> AUDIT
 PROMO --> AUDIT
 FINANCE --> AUDIT
 AUDIT --> REPORT[ตรวจรายงานและประวัติ<br/>ย้อนหลัง]
 REPORT --> DASH
 class START,DENY terminal
 class CLOSED warning
 class DASH,STORES,USERS,PROMO,FINANCE,AUDIT,REPORT admin

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- แอดมินเข้าสู่ระบบผ่าน /admin/login และต้องเปลี่ยนรหัสเริ่มต้นเมื่อถูกกำหนดไว้
- การระงับเจ้าของร้านทำให้ร้านหยุดรับออเดอร์ การเปลี่ยนบทบาทหรือรหัสผ่านสัมพันธ์กับการเพิกถอน session
- การปรับ Wallet ต้องมีเหตุผลและตรวจยอด การยกเลิกออเดอร์ใช้กฎสถานะร่วมกับระบบคืนยอด
- Reports และ Audit เป็นการอ่านข้อมูลที่ระบบบันทึก ไม่ใช่สิทธิ์ให้ข้ามการตรวจ Backend

โค้ดอ้างอิง: [backend/src/routes/adminRoutes.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/routes/adminRoutes.js), [backend/src/controllers/adminController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/adminController.js), [backend/src/models/AdminActivity.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/models/AdminActivity.js)

## 07 คูปองและ Wallet ทดลอง

เลือกคูปองได้หนึ่งใบต่อออเดอร์ และทุกการเปลี่ยนยอดมีประวัติ

```mermaid
flowchart LR
 subgraph COUPONS[เส้นทางคูปอง]
 direction TB
 A[แอดมินสร้างโปรโมชัน] --> B[ลูกค้ากดเก็บคูปองเข้า<br/>บัญชี]
 B --> C[บันทึกความเป็นเจ้าของ<br/>โดยไม่สร้างรายการซ้ำ]
 C --> D{ต้องการใช้คูปองหรือไม่}
 D -- ใช้ --> SELECT[เลือกคูปอง 1 ใบใน<br/>checkout]
 D -- ไม่ใช้ --> FULL[ใช้ยอดโดยไม่มีส่วนลด]
 SELECT --> E{ร้าน เวลา ยอด และโควตา<br/>ผ่านหรือไม่}
 E -- ไม่ผ่าน --> F[แจ้งสาเหตุและให้เลือก<br/>ใหม่]
 F --> SELECT
 E -- ผ่าน --> G[คำนวณส่วนลดและจอง<br/>สิทธิ์ตอนสร้างออเดอร์]
 end
 subgraph WALLET[เส้นทาง Wallet]
 direction TB
 H[ดูยอดและประวัติ Wallet] --> I{ต้องการเติมยอดทดลอง<br/>หรือไม่}
 I -- ต้องการ --> J{ระบบเปิดโหมด demo<br/>หรือไม่}
 J -- เปิด --> K[เติมยอดและบันทึกประวัติ<br/>แบบป้องกันการเติมซ้ำ]
 K --> H
 J -- ไม่เปิด --> L[ไม่เปิดการเติมยอด<br/>ทดลองด้วยตนเอง]
 I -- ไม่เติม --> M[จ่ายด้วย Wallet ตามยอด<br/>ที่ Backend คำนวณ]
 M --> N{ยอด Wallet เพียงพอหรือ<br/>ไม่}
 N -- ไม่พอ --> O[แจ้งยอดไม่พอและไม่หัก<br/>ยอดติดลบ]
 N -- ผ่าน --> P[หักยอดและบันทึกประวัติ<br/>โดยรายการเดิมไม่หักซ้ำ]
 P --> Q([ดำเนินออเดอร์ต่อ])
 end
 COUPONS -- ยอดชำระ --> WALLET
 class F,L,O warning
 class Q terminal

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- การเก็บคูปองไม่ใช่การใช้สิทธิ์ทันที Backend ตรวจสิทธิ์ซ้ำและจองโควตาตอน checkout
- การใช้คูปองขึ้นกับร้าน ช่วงเวลา ยอดขั้นต่ำ จำนวนสิทธิ์รวม และจำนวนครั้งต่อผู้ใช้
- PAYMENT_MODE=demo เปิดให้เติมยอดทดลองเอง ส่วน wallet ปิด PromptPay จำลองและการเติมยอดทดลองด้วยตนเอง
- การคืนเงินเข้ากระเป๋าใช้กับออเดอร์ที่จ่ายด้วย Wallet และมีการหักยอดจริงในระบบทดลอง PromptPay จำลองไม่มีเงินธนาคารให้คืน

โค้ดอ้างอิง: [backend/src/services/customer-coupons.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/customer-coupons.js), [backend/src/services/promotion-claims.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/promotion-claims.js), [backend/src/services/wallet.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/wallet.js), [backend/src/controllers/customerController.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/controllers/customerController.js)

## 08 การอัปเดตสถานะและแจ้งเตือน

แยกข้อความในระบบ การส่งอีเมล และการแจ้งเตือนอุปกรณ์

```mermaid
flowchart TD
 START([สร้างออเดอร์หรือเปลี่ยน<br/>สถานะสำเร็จ]) --> EVENT[บันทึกเหตุการณ์และผู้<br/>เกี่ยวข้องใน MongoDB]
 EVENT --> REALTIME[ส่ง Socket.IO ไปยังห้อง<br/>ของผู้ใช้และร้าน]
 REALTIME --> UI[หน้าที่เปิดอยู่แสดงสถานะ<br/>ใหม่]
 EVENT --> INBOX[บันทึกข้อความในกล่อง<br/>แจ้งเตือน]
 INBOX --> READ[ผู้ใช้ขยายรายละเอียด กด<br/>เปิดรายการ และทำ<br/>เครื่องหมายอ่าน]
 EVENT --> EMAIL{เปิดรับอีเมลและอีเมล<br/>ยืนยันแล้ว}
 EMAIL -- ใช่ --> OUTBOX[เข้าคิว EmailOutbox]
 OUTBOX --> SMTP[worker ส่งผ่าน SMTP]
 SMTP --> SENT{ส่งสำเร็จหรือไม่}
 SENT -- สำเร็จ --> ES[บันทึกผลการส่ง]
 SENT -- ไม่สำเร็จ --> ATTEMPT{ยังไม่ครบจำนวนครั้งที่ส่ง<br/>ซ้ำ}
 ATTEMPT -- ยังส่งซ้ำได้ --> RETRY[รอตามเวลาส่งซ้ำที่<br/>กำหนด]
 ATTEMPT -- ครบแล้ว --> FAILED[บันทึกว่าส่งไม่สำเร็จ]
 RETRY --> OUTBOX
 EMAIL -- ไม่ใช่ --> SKIP[ข้ามช่องทางอีเมล]
 EVENT --> PUSH{มี subscription และ<br/>อนุญาตแจ้งเตือน}
 PUSH -- ใช่ --> SERVICE[ส่ง Web Push ไป<br/>Service Worker]
 SERVICE --> DEVICE[อุปกรณ์แสดงแจ้งเตือน<br/>ตามการตั้งค่า]
 DEVICE --> TAP[แตะเพื่อเปิดหน้าออเดอร์<br/>หรือรายการที่เกี่ยวข้อง]
 PUSH -- ไม่ใช่ --> NOPUSH[ข้ามช่องทางอุปกรณ์]
 class START terminal
 class SKIP,NOPUSH warning

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- การส่งจริงขึ้นกับบทบาท ความเป็นเจ้าของออเดอร์ การตั้งค่าของบัญชี และสิทธิ์ของอุปกรณ์
- อีเมลออเดอร์รองรับลูกค้าและเจ้าของร้านที่อีเมลยืนยันแล้วและเปิดรับไว้ โดยไม่ส่งเหตุการณ์เก่าย้อนหลัง
- Web Push ต้อง HTTPS หรือ localhost, Service Worker และ subscription ที่ยังใช้ได้ iPhone/iPad ต้องเปิดเป็นเว็บแอปจากหน้าจอโฮมตามเงื่อนไขอุปกรณ์
- อีเมลส่งไม่สำเร็จมีคิว retry แบบจำกัดจำนวนครั้ง การได้ผลตอบรับจากผู้ให้บริการยังไม่รับประกันว่าผู้ใช้เห็นแจ้งเตือนแล้ว

โค้ดอ้างอิง: [backend/src/services/notifications.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/notifications.js), [backend/src/services/order-email.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/order-email.js), [backend/src/server.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/server.js), [frontend/public/push-sw.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/frontend/public/push-sw.js), [frontend/src/lib/socket.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/frontend/src/lib/socket.js)

## 09 ยกเลิกออเดอร์และกู้คืน checkout ที่ค้าง

คืนเฉพาะสิ่งที่เคยจองหรือหักสำเร็จ และป้องกันการคืนซ้ำ

```mermaid
flowchart TD
 REQUEST([ผู้ใช้ขอยกเลิกออเดอร์]) --> RIGHTS{เจ้าของข้อมูล สิทธิ์ และ<br/>สถานะอนุญาตหรือไม่}
 RIGHTS -- ไม่อนุญาต --> DENY([แจ้งว่ายกเลิกไม่ได้])
 RIGHTS -- อนุญาต --> CANCEL[เปลี่ยนออเดอร์เป็น<br/>cancelled]
 FAIL([checkout ล้มเหลว]) --> COMP[เริ่มชดเชยขั้นตอนที่ทำไป]
 STALE([worker พบ checkout<br/>ค้าง]) --> LOCK{เข้าเงื่อนไขกู้คืนและ lock<br/>ว่างหรือไม่}
 LOCK -- ยังไม่เข้าเงื่อนไข --> WAIT[ข้ามและตรวจใหม่ในรอบ<br/>ถัดไป]
 WAIT -.-> STALE
 LOCK -- เข้าเงื่อนไข --> COMP
 COMP --> CANCEL
 CANCEL --> QUEUE[ยกเลิกคิวของออเดอร์]
 QUEUE --> STOCK[คืนวัตถุดิบที่จองไว้เพียง<br/>ครั้งเดียว]
 STOCK --> COUPON[คืนโควตาคูปองที่ออเดอร์<br/>เคยจอง]
 COUPON --> DEBIT{เป็น Wallet และเคยหัก<br/>ยอดสำเร็จหรือไม่}
 DEBIT -- ใช่ --> REFUND[คืนยอดเข้ากระเป๋าด้วย<br/>key ป้องกันการคืนซ้ำ]
 DEBIT -- ไม่ใช่ --> NOREFUND[ไม่เพิ่มยอด Wallet โดย<br/>ไม่มีรายการหัก]
 REFUND --> SAVE[บันทึกสถานะและผลการ<br/>ชดเชย]
 NOREFUND --> SAVE
 SAVE --> NOTICE[อัปเดตหน้าจอและแจ้งผล<br/>ตามเหตุการณ์]
 NOTICE --> DONE([จบการยกเลิกหรือกู้คืน])
 class REQUEST,FAIL,STALE,DENY,DONE terminal
 class WAIT,NOREFUND warning

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- ลูกค้ายกเลิกได้ใน pending หรือ confirmed ร้านค้ายกเลิกได้ถึง preparing ส่วนแอดมินยกเลิกได้ถึง ready ตามเงื่อนไข Backend
- การยกเลิกปกติต้องรอ checkout เสร็จสมบูรณ์ ส่วน checkout ล้มเหลวใช้ compensation หรือ recovery แยก
- worker ตรวจตอนเริ่มเซิร์ฟเวอร์และเป็นรอบ งาน checkout ที่ยังไม่เสร็จเกิน 2 นาทีจะถูกพิจารณากู้คืนเมื่อ lock ร้านหมดอายุ
- หากมีการหัก Wallet แล้วคืนได้ครั้งเดียว ถ้ายังไม่หักต้องไม่เพิ่มยอดให้ และปลดโควตาคูปองเฉพาะ claim ของออเดอร์นั้น

โค้ดอ้างอิง: [backend/src/services/order-lifecycle.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/order-lifecycle.js), [backend/src/services/checkout-recovery.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/checkout-recovery.js), [backend/src/services/wallet.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/wallet.js), [backend/src/services/inventory.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/inventory.js), [backend/src/services/promotion-claims.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/services/promotion-claims.js)

## 10 ระบบแต่ละส่วนเชื่อมกันอย่างไร

หน้าเว็บไม่อ่านฐานข้อมูลโดยตรง ทุกงานสำคัญผ่านการตรวจที่ API

```mermaid
flowchart TD
 USER[ลูกค้า / ร้านค้า / แอดมิน] --> WEB[React UI บน Browser]
 WEB -->|HTTPS และ session cookie| CF[Cloudflare Tunnel]
 CF --> NGINX[Nginx เสิร์ฟหน้าเว็บและ<br/>ส่งต่อ API]
 NGINX --> AUTH[Express ตรวจ session<br/>และบทบาท]
 AUTH --> LOGIC[Controllers และ<br/>Services]
 LOGIC --> MONGOOSE[Mongoose ตรวจ<br/>Schema และ query]
 MONGOOSE <--> DB[(MongoDB)]
 LOGIC --> SOCKET[Socket.IO เหตุการณ์ตาม<br/>สิทธิ์]
 SOCKET -. ผ่าน proxy กลับไปหน้าเว็บ .-> WEB
 LOGIC --> JOBS[คิวอีเมล / Push /<br/>Checkout recovery]
 JOBS <--> DB
 JOBS --> SMTP[SMTP ส่งอีเมล]
 JOBS --> PUSH[ผู้ให้บริการ Web Push]
 PUSH --> SW[Service Worker ของ<br/>อุปกรณ์]
 SW --> WEB
 class USER,DB terminal
 class WEB customer
 class AUTH,LOGIC,MONGOOSE,JOBS merchant

classDef default fill:#fffdf8,stroke:#9d7855,color:#35291f,stroke-width:1.4px
classDef customer fill:#fff0cb,stroke:#bd8650,color:#35291f
classDef merchant fill:#ffe6d5,stroke:#b4744d,color:#35291f
classDef admin fill:#e9eff9,stroke:#6e86a2,color:#273447
classDef terminal fill:#e6f3e9,stroke:#64866b,color:#263d2b
classDef warning fill:#fff0ed,stroke:#b76e61,color:#603d36
```

- Local development ใช้ Vite proxy แทน Cloudflare Tunnel และ Nginx ในเส้นทางหน้าเว็บไป API
- Mongoose เป็นไลบรารีฝั่ง Backend ส่วน MongoDB เป็นฐานข้อมูล ไม่ใช่โปรแกรมตัวเดียวกัน
- Socket.IO client โหลดจาก API และรับข้อมูลตามห้องผู้ใช้หรือร้านที่มีสิทธิ์
- โครงสร้างนี้แสดงส่วนประกอบและทิศทางการสื่อสาร ไม่ใช่ผัง transaction หรือการรับรองมาตรการความปลอดภัยทั้งหมด

โค้ดอ้างอิง: [frontend/src/lib/api-client.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/frontend/src/lib/api-client.js), [frontend/src/lib/socket.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/frontend/src/lib/socket.js), [backend/src/server.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/server.js), [backend/src/config/db.js](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/backend/src/config/db.js), [deploy/nginx.conf](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/deploy/nginx.conf), [deploy/tunnel.compose.yaml](https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb/blob/develop/deploy/tunnel.compose.yaml)
