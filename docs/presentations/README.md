# MealQ: การประยุกต์บทเรียน Web Application

[สไลด์นำเสนอ 8 หน้า](MealQ-WebApp-8-Slides.pptx) รวมปก ใช้ข้อความและตารางที่แก้ไขได้ใน PowerPoint พร้อม speaker notes อธิบายตัวอย่างและระบุไฟล์โค้ดที่เกี่ยวข้อง

## เนื้อหา

1. MealQ: เว็บแอปสั่งอาหารและจัดการคิวรับอาหาร
2. HTML และ CSS ในหน้าจอ MealQ
3. JavaScript กับข้อมูลในระบบ: map, filter, reduce และการสุ่ม
4. Event และ DOM: onChange, onSubmit และ React state
5. HTTP และ Async: Fetch, JSON, API และ HTTP status
6. Node.js Modules และ Express: แบ่งโมดูล ตรวจ session และสิทธิ์
7. MongoDB และ Mongoose: Schema, ObjectId และ CRUD เมนู
8. ตัวอย่างการสั่งซื้อ: ตรวจวัตถุดิบ บันทึกออเดอร์ และตรวจรหัสรับอาหาร

## ตัวอย่างโค้ดประกอบการอธิบาย

- หน้าเว็บและ Event: `frontend/src/pages/customer/Checkout.jsx`, `frontend/src/pages/customer/Payment.jsx`, `frontend/src/main.jsx`
- Array และ Function: `frontend/src/features/customer/random-food.js`, `frontend/src/features/customer/catalog.js`, `frontend/src/features/customer/order-request.js`
- HTTP/JSON: `frontend/src/lib/api-client.js`
- Node.js/Express: `backend/src/routes/orderRoutes.js`, `backend/src/middleware/auth.js`, `backend/src/controllers/orderController.js`
- ข้อมูลและวัตถุดิบ: `backend/src/models/Order.js`, `backend/src/models/Menu.js`, `backend/src/models/Ingredient.js`, `backend/src/services/inventory.js`

สรุปเอกสารรายวิชาที่ได้รับเน้น HTML, CSS, JavaScript, HTTP และ Node.js Modules โดย React, Express และ Tailwind อยู่ใน Scope ส่วน MongoDB/Mongoose เป็นฐานข้อมูลที่นำมาต่อยอดในโครงงาน การปรากฏใน Scope ไม่ใช่การยืนยันว่าเรียนครบแล้ว

เปิด [ระบบจริง](https://mealq.site/) หรือ [สาธิตการใช้งาน](https://mealq.site/demo) เพื่อประกอบการนำเสนอ Wallet/PromptPay ยังเป็นโหมด Demo และภาพอาหารในชุด catalogue เป็นภาพประกอบของระบบ Demo
