# MealQ: การประยุกต์บทเรียน Web Application

[สไลด์นำเสนอ 10 หน้า](MealQ-WebApp-10-Slides.pptx) รวมปก ใช้ข้อความและตารางที่แก้ไขได้ใน PowerPoint พร้อม speaker notes อธิบายตัวอย่างและระบุไฟล์โค้ดที่เกี่ยวข้อง เพิ่มภาพรวมระบบและความสัมพันธ์ของข้อมูลจาก [ฉบับเดิม 8 หน้า](MealQ-WebApp-8-Slides.pptx) ซึ่งยังเก็บไว้ครบ

## เนื้อหา

1. MealQ: เว็บแอปสั่งอาหารและจัดการคิวรับอาหาร
2. ภาพรวมระบบและบทบาทผู้ใช้: Browser, API Server และ Database
3. HTML และ CSS ในหน้าจอ MealQ
4. JavaScript กับข้อมูลในระบบ: map, filter, reduce และการสุ่ม
5. Event และ DOM: onChange, onSubmit และ React state
6. HTTP และ Async: Fetch, JSON, API และ HTTP status
7. Node.js Modules และ Express: แบ่งโมดูล ตรวจ session และสิทธิ์
8. MongoDB และ Mongoose: Schema, ObjectId และ CRUD เมนู
9. การออกแบบความสัมพันธ์ของข้อมูล: ร้าน เมนู วัตถุดิบ ออเดอร์ และข้อมูล ณ เวลาสั่ง
10. ตัวอย่างการสั่งซื้อ: ตรวจวัตถุดิบ บันทึกออเดอร์ และตรวจรหัสรับอาหาร

สำหรับผู้จัดทำ 4 คน แนะนำแบ่งช่วงนำเสนอเป็นหน้า 1–3, 4–5, 6–7 และ 8–10 เพื่อให้แต่ละคนรับผิดชอบเนื้อหาต่อเนื่องกัน

## ตัวอย่างโค้ดประกอบการอธิบาย

- หน้าเว็บและ Event: `frontend/src/pages/customer/Checkout.jsx`, `frontend/src/pages/customer/Payment.jsx`, `frontend/src/main.jsx`
- Array และ Function: `frontend/src/features/customer/random-food.js`, `frontend/src/features/customer/catalog.js`, `frontend/src/features/customer/order-request.js`
- HTTP/JSON: `frontend/src/lib/api-client.js`
- Node.js/Express: `backend/src/routes/orderRoutes.js`, `backend/src/middleware/auth.js`, `backend/src/controllers/orderController.js`
- ข้อมูลและวัตถุดิบ: `backend/src/models/Store.js`, `backend/src/models/Order.js`, `backend/src/models/Menu.js`, `backend/src/models/Ingredient.js`, `backend/src/services/inventory.js`

สรุปเอกสารรายวิชาที่ได้รับเน้น HTML, CSS, JavaScript, HTTP และ Node.js Modules โดย React, Express และ Tailwind อยู่ใน Scope ส่วน MongoDB/Mongoose เป็นฐานข้อมูลที่นำมาต่อยอดในโครงงาน การปรากฏใน Scope ไม่ใช่การยืนยันว่าเรียนครบแล้ว

เปิด [ระบบจริง](https://mealq.site/) หรือ [สาธิตการใช้งาน](https://mealq.site/demo) เพื่อประกอบการนำเสนอ Wallet/PromptPay ยังเป็นโหมด Demo และภาพอาหารในชุด catalogue เป็นภาพประกอบของระบบ Demo
