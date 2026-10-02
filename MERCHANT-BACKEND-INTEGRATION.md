# Merchant ↔ Backend Integration

ชุดนี้เชื่อม Merchant Frontend เข้ากับ Express/MongoDB จริง และเพิ่ม validation ฝั่ง server สำหรับ flow สำคัญ

## API ที่ Merchant ใช้

- `POST /api/v1/auth/login` — ใช้หน้า `/login` ร่วมกับลูกค้า โดยเลือก "ร้านค้า" เพื่อส่ง portal `MERCHANT`; URL เดิม `/merchant/login` ส่งต่อไป `/login?role=merchant`
- `GET /api/v1/auth/me` — ตรวจ session
- `GET /api/v1/merchant/store`
- `PATCH /api/v1/merchant/store`
- `GET /api/v1/merchant/menu`
- `POST /api/v1/merchant/menu`
- `GET /api/v1/merchant/menu/:id`
- `PATCH /api/v1/merchant/menu/:id`
- `DELETE /api/v1/merchant/menu/:id`
- `GET /api/v1/merchant/orders`
- `GET /api/v1/merchant/orders/:id`
- `PATCH /api/v1/merchant/orders/:id/status`
- `POST /api/v1/merchant/orders/:id/receive` — ตรวจรหัสรับอาหารและปิดออเดอร์

## Order flow ที่ backend บังคับ

`pending → confirmed → preparing → ready → completed`

- `cancelled` ทำได้เฉพาะก่อน `ready`
- `completed` ห้าม PATCH ตรง ๆ ต้องส่ง `receiveCode` ไป `/receive`
- เมื่อ completed: บันทึก `receive_time`, `Queue.completed_at`, และเพิ่ม `Menu.sold_quantity`

## Store settings

Merchant แก้ได้แล้ว:

- ชื่อร้าน
- คำอธิบาย
- เบอร์โทร
- เปิด/ปิดร้าน
- เวลาเปิด/ปิด
- จุดรับอาหาร (`address.detail`)
- จำนวนคิวสูงสุด (`maxQueue`)

Backend จะปฏิเสธ order ใหม่ด้วย `QUEUE_FULL` เมื่อคิว active ถึงค่าที่กำหนด

## Realtime

Socket.IO ใช้ cookie session เดียวกับ API:

- Customer สร้าง order → `order:new` ส่งเข้าห้อง `store:<storeId>`
- Merchant เปลี่ยนสถานะ → `order:status` ส่งทั้งห้องร้านและ `user:<customerId>`

## วิธีทดสอบ

1. `docker compose up -d`
2. `cd backend; npm run seed; npm run dev`
3. `cd frontend; npm run dev`
4. ที่ root รัน `./test-integration.ps1`

บัญชี seed:

- Merchant: `merchant@mealq.local` / `Merchant123!`
- Customer: `customer@mealq.local` / `Customer123!`
