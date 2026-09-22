# MealQ Integration (Frontend + Backend + MongoDB)

เวอร์ชันทดสอบนี้เชื่อมส่วนหลักเข้าด้วยกันแล้ว:

- Auth: Customer / Merchant register + login ด้วย cookie session
- MongoDB: users, stores, menus, orders, queues
- Customer: ตอนชำระเงินจะสร้าง Order จริงที่ `POST /api/v1/orders`
- Merchant: Dashboard, Orders, Order status, Menu CRUD, Store settings ใช้ API จริง
- Socket.IO: Merchant เห็น order ใหม่และ Customer รับสถานะ order แบบ realtime
- Seed: นำร้านและเมนูจาก mock-data ของ Customer ลง MongoDB เพื่อให้ ID ตรงกัน

## 1. เริ่ม MongoDB

```powershell
docker compose up -d
docker compose ps
```

## 2. เตรียม Backend

```powershell
Copy-Item backend\.env.example backend\.env -Force
cd backend
npm install
npm run seed
npm run dev
```

Backend: `http://localhost:5000`

บัญชี Demo หลัง seed:

- Customer: `customer@mealq.local` / `Customer123!`
- Merchant: `merchant@mealq.local` / `Merchant123!`

`npm run seed` จะ seed ร้านและเมนูจาก `frontend/src/features/customer/mock-data.js` ลง MongoDB และผูกร้าน `pa-daeng` กับ Demo Merchant

## 3. เปิด Frontend

เปิด PowerShell ใหม่:

```powershell
Copy-Item frontend\.env.example frontend\.env -Force
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## 4. ทดสอบ Flow จริง

### Customer -> Merchant

1. เปิด `http://localhost:5173/login`
2. Login Customer ด้วย `customer@mealq.local` / `Customer123!`
3. เข้า Customer และเลือกร้าน `ร้านป้าแดง`
4. เพิ่มเมนูลง cart แล้ว checkout
5. หน้าชำระเงินจะเรียก Backend และบันทึก Order ลง MongoDB
6. เปิด Merchant อีก Browser/Profile ที่ `http://localhost:5173/merchant/login`
7. Login Merchant ด้วย `merchant@mealq.local` / `Merchant123!`
8. ไป Orders จะเห็น Order ของ Customer
9. เปลี่ยน status เป็น `preparing` / `ready` / `completed`
10. Customer ที่ยังเปิดเว็บอยู่จะรับ `order:status` ผ่าน Socket.IO

## 5. ทดสอบ API อัตโนมัติ

เมื่อ MongoDB + Backend เปิดอยู่ และรัน seed แล้ว:

```powershell
cd D:\Work\food-ordering-platform-mongodb-test
Set-ExecutionPolicy -Scope Process Bypass
.\test-integration.ps1
```

Smoke test route เดิมยังใช้ได้:

```powershell
.\test-routes.ps1
```

## API หลัก

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Customer/Public

- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/:id`
- `GET /api/v1/restaurants/:id/menu`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`

### Merchant

- `GET /api/v1/merchant/dashboard`
- `GET /api/v1/merchant/orders`
- `GET /api/v1/merchant/orders/:id`
- `PATCH /api/v1/merchant/orders/:id/status`
- `GET /api/v1/merchant/menu`
- `POST /api/v1/merchant/menu`
- `GET /api/v1/merchant/menu/:id`
- `PATCH /api/v1/merchant/menu/:id`
- `DELETE /api/v1/merchant/menu/:id`
- `GET /api/v1/merchant/store`
- `PATCH /api/v1/merchant/store`

## หมายเหตุ

Customer catalogue UI ยังอ่านข้อมูลร้าน/เมนูจาก mock-data เพื่อไม่ต้องรื้อ UI ที่คนที่ 1 ทำไว้ แต่ seed จะนำ mock-data ชุดเดียวกันลง MongoDB ทำให้ตอน Customer สั่งอาหาร Backend สามารถ resolve menu ID และสร้าง Order จริงได้ ส่วน Merchant ใช้ข้อมูล MongoDB จริงทั้งหมด
