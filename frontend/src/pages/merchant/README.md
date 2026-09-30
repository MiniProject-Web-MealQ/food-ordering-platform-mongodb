# ฝั่งร้านค้า (Merchant Frontend)

หน้าร้านค้าทั้งหมดอยู่ใต้ `/merchant` (คู่กับฝั่งลูกค้าที่อยู่ใต้ `/customer`)
**เชื่อมกับ Backend API จริงแล้ว** ทั้ง login, ร้าน, เมนู และออเดอร์ ออเดอร์ใหม่จากลูกค้าเด้งขึ้นกระดานเองผ่าน Socket.IO

---

## 0. เปิดระบบเพื่อทดสอบ

```powershell
# Terminal 1 - MongoDB (ที่ root ของโปรเจกต์)
docker compose up -d

# Terminal 2 - Backend
cd backend
npm install
Copy-Item .env.example .env   # ครั้งแรกเท่านั้น
npm run seed                  # ครั้งแรก หรือเมื่ออยากรีเซ็ตข้อมูลตัวอย่าง
npm run dev                   # http://localhost:5000

# Terminal 3 - Frontend
cd frontend
npm install
Copy-Item .env.example .env   # VITE_API_URL=http://localhost:5000/api/v1
npm run dev                   # http://localhost:5173
```

บัญชีจาก `npm run seed`:

| บทบาท | อีเมล / รหัสผ่าน | เข้าที่ |
|---|---|---|
| ร้านค้า (ร้านป้าแดง) | `merchant@mealq.local` / `Merchant123!` | http://localhost:5173/merchant/login (มีปุ่ม "กรอกให้อัตโนมัติ" ตอน dev) |
| ลูกค้า | `customer@mealq.local` / `Customer123!` | http://localhost:5173/login |

**ลองทั้ง flow:** เปิดลูกค้ากับร้านค้าคนละเบราว์เซอร์ (หรือหน้าต่าง Incognito) เพราะ session เป็น cookie ตัวเดียวกัน
ลูกค้าสั่งร้านป้าแดง → ออเดอร์เด้งที่ "รอรับ" → ร้านกด รับออเดอร์ / เริ่มทำ / อาหารพร้อม → กรอกรหัส 4 หลักของลูกค้า → เสร็จ

> backend อนุญาต CORS เฉพาะ `FRONTEND_URL` (ค่าเริ่มต้น `http://localhost:5173`) ถ้ารัน frontend port อื่นต้องแก้ใน `backend/.env`

---

## 1. Route ทั้งหมด

| URL | ไฟล์ | หน้าที่ |
|---|---|---|
| `/merchant/login` | `MerchantLogin.jsx` | login ร้านค้า (อยู่นอก `MerchantLayout`) ถ้ามี session ร้านอยู่แล้วจะข้ามไปเลย |
| `/merchant` | – | redirect ไป `/merchant/dashboard` |
| `/merchant/dashboard` | `Dashboard.jsx` | สรุปวันนี้: ออเดอร์, ยอดขาย, คิวที่กำลังทำ, รอรับ, เมนูขายดี, ออเดอร์ล่าสุด, สวิตช์เปิด/ปิดร้าน |
| `/merchant/orders` | `Orders.jsx` | กระดานคิว 4 คอลัมน์ (รอรับ / กำลังทำ / พร้อมรับ / เสร็จแล้ว) กดเลื่อนสถานะ ค้นหา ปุ่มโหลดล่าสุด + **สแกนรับอาหาร** |
| `/merchant/orders/:id` | `OrderDetail.jsx` | รายละเอียด + รหัสรับอาหารของลูกค้า + timeline + ยืนยันด้วย **สแกน QR** หรือกรอกรหัส 4 หลัก + ยกเลิก (`:id` = `order_number`) |
| `/merchant/menu` | `Menu.jsx` | รายการเมนู ค้นหา กรองหมวด/สถานะ สลับ "มีขาย/หมด" + pop-up เพิ่ม/แก้ไข/ลบ (`?new=1`, `?edit=<id>`) |
| `/merchant/menu/new` | `AddMenu.jsx` | ลิงก์เดิม: พาไป `/merchant/menu?new=1` |
| `/merchant/menu/:id/edit` | `EditMenu.jsx` | ลิงก์เดิม: พาไป `/merchant/menu?edit=:id` |
| `/merchant/settings` | `Settings.jsx` | ชื่อร้าน เบอร์โทร คำอธิบาย เวลาเปิด-ปิด สวิตช์เปิด/ปิดร้าน ออกจากระบบ |

route ประกาศไว้ที่ [`src/routes/AppRoutes.jsx`](../../routes/AppRoutes.jsx) (งานนี้ไม่ได้แก้ไฟล์นั้น)
ทุกหน้าใน `MerchantLayout` ต้องมี session ร้านค้า ถ้าไม่มีหรือหมดอายุจะถูกส่งไปหน้า login แล้วกลับมาหน้าเดิม

---

## 2. โครงไฟล์

```
src/pages/merchant/        หน้าจอ (layout + เรียก action)
src/features/merchant/
├── api.js                 เรียก endpoint ของ backend (ผ่าน lib/api-client.js ส่ง cookie ทุกครั้ง)
├── adapters.js            แปลงข้อมูล API (camelCase) ↔ state (snake_case ตาม model)
├── store.js               reducer + useMerchant() + โหลดข้อมูลทั้งหมด / โหลดออเดอร์ใหม่
├── merchant-provider.jsx  โหลดข้อมูลตอนเปิด + Socket.IO + ดึงออเดอร์ซ้ำทุก 30 วิ
├── use-merchant-actions.js  ทุกการแก้ไข (สถานะออเดอร์, ร้าน, เมนู, logout) → API → อัปเดต state
├── orders.js              ฟังก์ชันอ่านข้อมูล: หาออเดอร์/คิว, สรุปวันนี้, ค้นหา
├── status.js              ชื่อสถานะภาษาไทย, ลำดับสถานะ, คอลัมน์กระดานคิว
├── constants.js           หมวดเมนู, ชื่อวิธีจ่ายเงิน, บัญชี seed
├── menu-form.js           validation ของฟอร์มเมนู + ย่อรูป
├── format.js / styles.js / nav-items.js / use-now.js
└── components/            กระดานคิว, การ์ดออเดอร์, ฟอร์มเมนู, pop-up, sidebar ฯลฯ
src/layouts/MerchantLayout.jsx  ครอบ provider + หน้ากำลังโหลด / โหลดไม่สำเร็จ / ไม่ได้ login
```

component ที่ยืมจากฝั่ง customer (import อย่างเดียว **ไม่ได้แก้**):
`PageHeader`, `SegmentedTabs`, `ToggleSwitch`, `chipClasses`, `formatBaht`, `formatClock`

---

## 3. ข้อมูลไหลยังไง

```
เปิดหน้า   → GET /auth/me → GET /merchant/store + /merchant/menu + /merchant/orders → state
กดปุ่ม     → PATCH/POST/DELETE → ได้ข้อมูลใหม่จาก server → อัปเดต state (ไม่เดาผลล่วงหน้า)
ลูกค้าสั่ง → socket "order:new" → GET /merchant/orders ใหม่
```

```js
const { state } = useMerchant();             // { status, session, store, menus, orders, queues }
const actions = useMerchantActions();
const result = await actions.advance(order); // { ok, data } หรือ { ok: false, error: { code, message } }
```

`state.status`: `loading` → `ready` / `signed-out` / `error` (หน้า error มีปุ่มลองใหม่)
ถ้าเรียก API ไม่สำเร็จ แต่ละหน้าจะแสดง `error.message` จาก backend ตรงจุดที่กด

**ชื่อ field:** API ตอบเป็น camelCase แต่ state ใช้ snake_case ตาม model (`is_open`, `order_number`, `receive_code`)
การแปลงทั้งหมดอยู่ใน `adapters.js` ที่เดียว

**สถานะ** (ตาม `Order.js` / `Queue.js` และ `STATUS_QUEUE_MAP` ใน `merchantController.js`):

| Order.status | อยู่คอลัมน์ | ปุ่มบนการ์ด |
|---|---|---|
| `pending` | รอรับ | รับออเดอร์ |
| `confirmed` | กำลังทำ | เริ่มทำ |
| `preparing` | กำลังทำ | อาหารพร้อม · เรียกคิว |
| `ready` | พร้อมรับ | ยืนยันรับอาหาร → กรอกรหัส |
| `completed` | เสร็จแล้ว | – |
| `cancelled` | เสร็จแล้ว | – (ยกเลิกได้ก่อน `ready` จากหน้ารายละเอียด) |

**สแกน QR รับอาหาร** (`pickup-qr.js`, `components/qr-scanner.jsx`, library `jsqr`)
- เปิดกล้องหลังของแท็บเล็ต/มือถือ หรือ webcam (ต้องเปิดเว็บผ่าน `https` หรือ `localhost`) ถ้าใช้กล้องไม่ได้ กด "เลือกรูป QR แทน"
- สแกนจากกระดานคิว → เปิดออเดอร์ที่พร้อมรับและตรงกับ QR โดยใส่รหัสให้แล้ว กดยืนยันอีกครั้ง
- สแกนในหน้ารายละเอียด → ถ้าตรงกับออเดอร์นี้ ยืนยันรับอาหารทันที ถ้าเป็นของออเดอร์อื่น/ยังไม่พร้อม/ไม่ใช่ QR ของ MealQ จะบอกเหตุผลและสแกนต่อได้
- อ่านได้ 3 แบบ: `MEALQ:<order_number>:<receive_code>` (แนะนำ), รหัส 4 หลักล้วน, หรือ JSON ที่มี `orderNumber` + `pickupCode`
- ⚠️ QR ในแอปลูกค้าตอนนี้ (`features/customer/components/pickup-code.jsx`) เป็นลายตกแต่ง **สแกนไม่ได้** จนกว่าฝั่ง customer จะเปลี่ยนเป็น QR จริง
  ระหว่างนี้ใช้ช่องกรอกรหัส 4 หลักได้เหมือนเดิม

**หมวดเมนู** เป็นรหัสตายตัว `single / noodle / drink / dessert` (แสดงเป็นภาษาไทย)
ต้องตรงกับ `MENU_CATEGORIES` ฝั่ง customer เพราะแอปลูกค้ากรองเมนูด้วยรหัสนี้

---

## 4. ข้อจำกัดของ API ตอนนี้ (ฝากทีม backend)

ในโค้ดคอมเมนต์ไว้ด้วย `TODO(api)` หาได้ด้วย `grep -rn "TODO(api)" src/`

| เรื่อง | ตอนนี้หน้าจอทำอะไร | ต้องการจาก backend |
|---|---|---|
| ตรวจรหัสรับอาหาร | เทียบ `pickupCode` ในเบราว์เซอร์ แล้วส่ง `completed` | ตรวจฝั่ง server เช่น `POST /merchant/orders/:id/receive { receiveCode }` |
| ลำดับสถานะ | หน้าจอบังคับลำดับเอง (`status.js`) | `PATCH .../status` ตอนนี้รับทุกสถานะ ควรเช็คลำดับ |
| รูปเมนู | ย่อเป็น JPEG data URL แล้วเก็บลง `Menu.image` ตรง ๆ | endpoint อัปโหลดรูปที่คืน URL |
| จุดรับอาหาร (`address`) | แสดงอย่างเดียว | ให้ `PATCH /merchant/store` รับ `address` |
| จำนวนคิวสูงสุด (`queue.max_queue`) | ไม่แสดง | ส่งใน `storeView` + ให้แก้ได้ + ใช้ตอนรับออเดอร์ |
| เวลาเรียกคิว / เวลารับอาหาร | ใช้ `updatedAt` ของออเดอร์ (ถูกต้องเฉพาะขั้นล่าสุด) | ส่ง `called_at`, `completed_at`, `receive_time` มาใน `orderView` |
| `sold_quantity` | แสดงค่าที่ seed ไว้ | backend ยังไม่นับเพิ่มตอนขาย |
| คืนเงินตอนยกเลิก | บอกร้านว่าต้องคืนเงินเอง | ยังไม่มีใน API |
| สร้างเมนูที่ "ปิดขาย" | `POST` แล้ว `PATCH isAvailable:false` ต่อ | ให้ `POST /merchant/menu` รับ `isAvailable` |

---

## 5. สถานะออเดอร์ไม่ตรงกับฝั่ง customer ⚠️

| ร้านค้า / backend | customer (`features/customer`) |
|---|---|
| `pending` | `PLACED` / `PAID` |
| `confirmed` | `QUEUED` |
| `preparing` | `PREPARING` |
| `ready` | `READY` |
| `completed` | `PICKED_UP` |
| `cancelled` | ไม่มี — `order/syncStatus` ฝั่งลูกค้ายังไม่รองรับ ลูกค้าจะไม่เห็นว่าถูกยกเลิก |

**ไม่ได้แก้ไฟล์ฝั่ง customer** ต้องตกลงกันว่าจะใช้ชุดเดียว

---

## 6. สี ปุ่ม และ responsive

ใช้ token จาก [`src/index.css`](../../index.css) และ `buttonClasses()` เหมือนฝั่ง customer ไม่มี hex ในไฟล์ merchant
ปุ่มทึบ `variant: "cocoa"`, ปุ่มรอง `"cocoa-outline"`, ปุ่มยกเลิก/ลบ `"danger-outline"` ตัวหนังสือรองใช้ `text-ink-soft`

| ความกว้าง | เมนูนำทาง | กระดานคิว | pop-up เมนู |
|---|---|---|---|
| ต่ำกว่า 1024px | แถบบน + แถบล่าง | แท็บทีละสถานะ | เต็มจอ (มือถือ) |
| 1024–1279px | แถบไอคอนซ้าย | 4 คอลัมน์ | กล่องกลางจอ |
| 1280px ขึ้นไป | sidebar เต็ม | 4 คอลัมน์ | กล่องกลางจอ |

การ์ดที่รอรับเกิน 5 นาที หรือเรียกคิวแล้วเกิน 15 นาทียังไม่มารับ จะมีกรอบแดง

---

## 7. ก่อน commit

```bash
cd frontend
npx eslint src     # ต้องไม่มี error
npm run build      # ต้อง build ผ่าน
```

ทดสอบแล้วกับ MongoDB + backend จริง ด้วย script กดใน Chrome ที่ความกว้าง 390 / 1024 / 1440px:
login ผิด / บัญชีลูกค้าถูกปฏิเสธ / login ถูก, ลูกค้าสั่งผ่าน API แล้วออเดอร์เด้งขึ้นกระดานเอง,
เลื่อนสถานะครบจนลูกค้าเห็น `completed`, รหัสผิด/ถูก, ยกเลิก, ปิดร้านแล้วลูกค้าสั่งไม่ได้ (409),
เพิ่ม/แก้/สลับ/ลบเมนูแล้วเช็คในฐานข้อมูล, บันทึกตั้งค่าแล้ว reload, logout — ไม่มีหน้าไหนเลื่อนแนวนอน
สแกน QR ทดสอบด้วย QR จริงผ่านกล้องจำลองของ Chrome และรูปภาพ: ตรงออเดอร์, ผิดออเดอร์, ออเดอร์ที่รับไปแล้ว, QR ที่ไม่ใช่ของ MealQ, ไม่มีกล้อง

---

## 8. ที่ยังไม่ได้ทำ

- ข้อจำกัดในข้อ 4 (รอ backend)
- เสียงแจ้งเตือนเมื่อมีออเดอร์ใหม่
- หน้าประวัติออเดอร์ย้อนหลัง/รายงานยอดขายรายวัน (กระดานแสดงของวันนี้ + ที่ยังค้าง)
- ตัวเลือกเสริมของเมนู (`option_groups` เช่น ระดับความเผ็ด)
- QR จริงฝั่งลูกค้า (ของฝั่ง customer) — ตัวสแกนฝั่งร้านพร้อมแล้ว
- ส่วน Admin — รอทีมสรุปขอบเขต
- unit test
