# ฝั่งร้านค้า (Merchant Frontend)

หน้าร้านค้าทั้งหมดอยู่ใต้ `/merchant` (คู่กับฝั่งลูกค้าที่อยู่ใต้ `/customer`)
ใช้งานได้ครบ flow: login → ดูภาพรวม → รับออเดอร์ → ทำอาหาร → เรียกคิว → ยืนยันรหัสรับอาหาร และจัดการเมนู/ตั้งค่าร้าน
แต่ **ข้อมูลทั้งหมดยังเป็นข้อมูลจำลอง** เก็บไว้ในเบราว์เซอร์ (ดูข้อ 4 ว่าจุดไหนรอต่อ API)

รันด้วย `npm run dev` แล้วเปิด <http://localhost:5173/merchant>
ระบบจะพาไปหน้า login ให้ใช้บัญชีทดลอง **`padaeng@mealq.app` / `mealq1234`** (มีปุ่ม "กรอกให้อัตโนมัติ")

---

## 1. Route ทั้งหมด

| URL | ไฟล์ | หน้าที่ |
|---|---|---|
| `/merchant/login` | `MerchantLogin.jsx` | login ร้านค้า (อยู่นอก `MerchantLayout`) |
| `/merchant` | – | redirect ไป `/merchant/dashboard` |
| `/merchant/dashboard` | `Dashboard.jsx` | สรุปวันนี้: ออเดอร์, ยอดขาย, คิวที่กำลังทำ, รอรับ, เมนูขายดี, ออเดอร์ล่าสุด, สวิตช์เปิด/ปิดร้าน |
| `/merchant/orders` | `Orders.jsx` | กระดานคิว 4 คอลัมน์ (รอรับ / กำลังทำ / พร้อมรับ / เสร็จแล้ว) กดเลื่อนสถานะได้ ค้นหาได้ |
| `/merchant/orders/:id` | `OrderDetail.jsx` | รายละเอียดออเดอร์ + รหัสรับอาหารของลูกค้า (ตัวใหญ่) + timeline + ยืนยันรหัส 4 หลัก + ยกเลิก (`:id` = `order_number` เช่น `MQ2110`) |
| `/merchant/menu` | `Menu.jsx` | รายการเมนู ค้นหา กรองหมวด/สถานะ สลับ "มีขาย/หมด" ได้ทันที + pop-up เพิ่ม/แก้ไข/ลบเมนู (`?new=1`, `?edit=<_id>`) |
| `/merchant/menu/new` | `AddMenu.jsx` | ลิงก์เดิม: พาไป `/merchant/menu?new=1` (เปิด pop-up เพิ่มเมนู) |
| `/merchant/menu/:id/edit` | `EditMenu.jsx` | ลิงก์เดิม: พาไป `/merchant/menu?edit=:id` (เปิด pop-up แก้ไขเมนู) |
| `/merchant/settings` | `Settings.jsx` | ข้อมูลร้าน, เวลาเปิด-ปิด, จำนวนคิวสูงสุด, สวิตช์เปิด/ปิดร้าน, ออกจากระบบ, ล้างข้อมูลจำลอง |

route ประกาศไว้ที่ [`src/routes/AppRoutes.jsx`](../../routes/AppRoutes.jsx) (งานนี้ไม่ได้แก้ไฟล์นั้น)
ทุกหน้าใน `MerchantLayout` ต้อง login ก่อน ถ้ายังไม่ login จะถูกส่งไปหน้า login แล้วกลับมาหน้าเดิมหลัง login

---

## 2. โครงไฟล์

```
src/pages/merchant/        หน้าจอ (เน้น layout กับการต่อ state)
src/features/merchant/     logic และ component เฉพาะฝั่งร้านค้า
├── mock-data.js           ข้อมูลจำลอง: ร้านป้าแดง, เมนู, ออเดอร์ + คิววันนี้, บัญชีทดลอง
├── store.js               reducer + action + useMerchant() + save/load localStorage
├── merchant-provider.jsx  Provider ที่ save state ทุกครั้งที่เปลี่ยน
├── orders.js              ฟังก์ชันอ่านข้อมูล: หาออเดอร์/คิว, สรุปวันนี้, ค้นหา
├── status.js              ชื่อสถานะภาษาไทย, ลำดับสถานะ, คอลัมน์กระดานคิว
├── menu-form.js           validation ของฟอร์มเมนู + ย่อรูปก่อนเก็บ
├── format.js              จัดรูปแบบเงิน/เวลา/เลขคิว (ใช้ formatBaht จากฝั่ง customer)
├── nav-items.js           รายการเมนูที่ sidebar กับแถบล่างใช้ร่วมกัน
├── use-now.js             hook เวลาปัจจุบัน (อัปเดตทุก 30 วิ) สำหรับ "รอ 6 นาที"
├── styles.js              class ที่ใช้ซ้ำ: ความกว้างหน้า, กล่องขาว, ช่องกรอก
├── api.js                 ฟังก์ชันเรียก API จริง (ของทีม backend ยังไม่มีหน้าไหนเรียก)
└── components/
    ├── merchant-nav.jsx       sidebar (desktop), แถบบน + แถบล่าง (มือถือ)
    ├── order-board.jsx        กระดานคิว (หลายคอลัมน์ / แท็บ)
    ├── order-card.jsx         การ์ดออเดอร์บนกระดาน
    ├── order-timeline.jsx     timeline สถานะในหน้ารายละเอียด
    ├── receive-code-card.jsx  การ์ดแสดงรหัสรับอาหารของลูกค้า
    ├── receive-code-form.jsx  ช่องกรอกรหัส 4 หลัก
    ├── menu-form.jsx          ฟอร์มเพิ่ม/แก้ไขเมนู
    ├── merchant-dialog.jsx    กรอบ pop-up (ใช้ <dialog> ปิดด้วย Esc/ปุ่ม X/คลิกพื้นหลัง มือถือเป็นเต็มจอ)
    ├── delete-menu.jsx        ส่วนลบเมนูใน pop-up แก้ไข
    ├── menu-row.jsx           การ์ดเมนู + สวิตช์มีขาย
    ├── stat-card.jsx          ตัวเลขสรุปบน dashboard
    ├── store-open-card.jsx    การ์ดสวิตช์เปิด/ปิดร้าน + คิวในครัว
    └── status-badge.jsx       ป้ายสถานะออเดอร์, ป้ายเปิด/ปิดร้าน, ตัวเลขแจ้งเตือน
src/layouts/MerchantLayout.jsx  ครอบ state + เช็ค login + sidebar/แถบล่าง
```

**หลักที่ใช้ (เหมือนฝั่ง customer):** ไฟล์ใน `pages/` ไม่ควรมี logic ธุรกิจ
ถ้าจะเพิ่มกฎหรือการคำนวณ ให้ไปไว้ใน `features/merchant/`

component ที่ยืมจากฝั่ง customer (import อย่างเดียว **ไม่ได้แก้**):
`PageHeader`, `SegmentedTabs`, `ToggleSwitch`, `chipClasses`, `formatBaht`, `formatClock`

---

## 3. State ของร้าน

ทุกอย่างอยู่ใน reducer ตัวเดียว save ลง `localStorage` key **`mealq.merchant.v1`**
เรียกใช้ด้วย `useMerchant()` จาก `features/merchant/store.js`

```js
const { state, dispatch } = useMerchant();
// state = { session, store, menus, orders, queues }
dispatch(actions.advance(order._id));
```

ชื่อ field ใช้ตาม backend model (snake_case) ทั้งหมด:

| ข้อมูล | field หลักที่ใช้ |
|---|---|
| `store` | `name, description, phone, address.detail, is_open, opening_hours.open_time/close_time, queue.max_queue` |
| `menus[]` | `_id, name, category, price, cook_time, description, image, is_available, sold_quantity` |
| `orders[]` | `_id, order_number, customer.name, items[{menu_id,name,price,quantity,total_price,note}], subtotal, service_fee, discount, total_price, payment_method, status, order_date, receive_time` |
| `queues[]` | `order_id, queue_number, receive_code, status, called_at, completed_at` |

**สถานะ** (ตาม `Order.js` / `Queue.js` และ `STATUS_QUEUE_MAP` ใน `merchantController.js`):

| Order.status | Queue.status | อยู่คอลัมน์ | ปุ่มบนการ์ด |
|---|---|---|---|
| `pending` | `waiting` | รอรับ | รับออเดอร์ |
| `confirmed` | `waiting` | กำลังทำ | เริ่มทำ |
| `preparing` | `preparing` | กำลังทำ | อาหารพร้อม · เรียกคิว (บันทึก `called_at`) |
| `ready` | `ready` | พร้อมรับ | ยืนยันรับอาหาร → ไปหน้ากรอกรหัส |
| `completed` | `completed` | เสร็จแล้ว | – (บันทึก `receive_time`, `completed_at`) |
| `cancelled` | `cancelled` | เสร็จแล้ว | – (ยกเลิกได้เฉพาะก่อน `ready` จากหน้ารายละเอียด) |

action ที่มี: `store/setOpen`, `store/update`, `order/advance`, `order/cancel`, `order/complete`,
`order/simulate`, `menu/setAvailable`, `menu/add`, `menu/update`, `menu/remove`, `session/logout`, `demo/reset`

**กติกา:** reducer ต้องเป็น pure function — id, เวลา และค่าสุ่มสร้างจาก `actions.*` ท้ายไฟล์ `store.js`

**อยากเริ่มข้อมูลใหม่:** กด "ล้างข้อมูลจำลอง" ในหน้าตั้งค่าร้าน หรือลบ key `mealq.merchant.v1` ใน DevTools
ออเดอร์ตัวอย่างสร้างตามเวลาที่เปิดครั้งแรก ถ้าเปิดค้างข้ามวัน ตัวเลข "วันนี้" จะเป็น 0 จนกว่าจะล้างข้อมูล

---

## 4. จุดที่ต้องต่อ API จริง

ทุกจุดที่เป็นของปลอมคอมเมนต์ไว้ด้วย `MOCK:` หาได้ด้วย `grep -rn "MOCK" src/features/merchant src/pages/merchant src/layouts/MerchantLayout.jsx`
ฟังก์ชันเรียก API มีอยู่แล้วใน `features/merchant/api.js` (endpoint ใน `backend/src/routes/merchantRoutes.js`)

| เรื่อง | ตอนนี้ทำอะไร | API ที่ต้องใช้ |
|---|---|---|
| login / logout | เทียบกับบัญชีทดลอง, เก็บ session ใน localStorage | `login()` ใน `features/auth/api.js` (portal `MERCHANT`) + `POST /auth/logout` |
| ข้อมูลร้าน / เปิด-ปิดร้าน | แก้ใน state | `getStore()`, `updateStore()` → `GET/PATCH /merchant/store` |
| รายการออเดอร์ | อ่านจาก `mock-data.js` | `getOrders()`, `getOrder(id)` → `GET /merchant/orders(/:id)` |
| เลื่อนสถานะ / ยกเลิก | แก้ใน state | `setOrderStatus(id, status)` → `PATCH /merchant/orders/:id/status` |
| ออเดอร์ใหม่เข้ามา | ปุ่ม "จำลองออเดอร์ใหม่" | socket event `order:new` / `order:status` (มี `lib/socket.js` แล้ว) |
| ยืนยันรหัสรับอาหาร | เทียบ `receive_code` ในเบราว์เซอร์ | ⚠️ **backend ยังไม่มี** ต้องมี endpoint ตรวจรหัสฝั่ง server เช่น `POST /merchant/orders/:id/receive` |
| เมนู | แก้ใน state | `getMenus()`, `createMenu()`, `updateMenu()`, `deleteMenu()` → `/merchant/menu` |
| รูปเมนู | ย่อเป็น JPEG data URL เก็บใน localStorage | ⚠️ **ยังไม่มี** endpoint อัปโหลดรูปที่คืน URL มาใส่ `Menu.image` |
| `sold_quantity` | บวกตอนยืนยันรับอาหาร | backend ควรเป็นคนนับ |
| คืนเงินตอนยกเลิก | แค่ข้อความในหน้าจอ | ยังไม่มีใน API |

**ข้อควรรู้ตอนต่อ API:**
- API ตอบกลับเป็น **camelCase** (`isOpen`, `orderNumber`, `totalPrice`) แต่ state ฝั่งนี้เป็น snake_case ตาม model
  ต้องเลือกว่าจะแปลงที่ API หรือที่ frontend
- `PATCH /merchant/orders/:id/status` ตอนนี้รับทุกสถานะ ไม่ได้บังคับลำดับ (เช่น ข้ามจาก `pending` ไป `completed` ได้)
  ฝั่งหน้าจอบังคับลำดับเองใน `status.js` แต่ server ควรเช็คด้วย

---

## 5. สถานะออเดอร์ไม่ตรงกับฝั่ง customer ⚠️

| ฝั่ง merchant (ตาม backend) | ฝั่ง customer (`features/customer/catalog.js`) |
|---|---|
| `pending` | `PLACED` / `PAID` |
| `confirmed` | `QUEUED` |
| `preparing` | `PREPARING` |
| `ready` | `READY` |
| `completed` | `PICKED_UP` |
| `cancelled` | (ไม่มี) |

ฝั่ง customer ใช้ตัวพิมพ์ใหญ่ + camelCase (`queueNumber`, `pickupCode`) ส่วนร้านใช้ตาม model (`queue_number`, `receive_code`)
ฝั่ง customer มี `order/syncStatus` ที่แปลงสถานะจาก backend อยู่แล้ว แต่ยังไม่รองรับ `cancelled`
**ไม่ได้แก้ไฟล์ฝั่ง customer** ต้องตกลงกันตอนต่อ backend

---

## 6. สี ปุ่ม และ responsive

ใช้ token จาก [`src/index.css`](../../index.css) และ `buttonClasses()` เหมือนฝั่ง customer ไม่มี hex ในไฟล์ merchant
ปุ่มทึบใช้ `variant: "cocoa"`, ปุ่มรองใช้ `"cocoa-outline"`, ปุ่มอันตราย (ยกเลิก/ลบ) ใช้ `"danger-outline"`
ตัวหนังสือรองใช้ `text-ink-soft` (ห้ามใช้ `text-muted`)

| ความกว้าง | เมนูนำทาง | กระดานคิว |
|---|---|---|
| ต่ำกว่า 1024px | แถบบน (ชื่อร้าน + สถานะ) + แถบล่าง 4 เมนู | แท็บทีละสถานะ พร้อมตัวเลข |
| 1024–1279px (`lg`) | แถบไอคอนซ้าย (ให้กระดานกว้างพอ 4 คอลัมน์) | 4 คอลัมน์ |
| 1280px ขึ้นไป (`xl`) | sidebar เต็มพร้อมชื่อร้าน | 4 คอลัมน์ |

การ์ดที่ **รอรับเกิน 5 นาที** หรือ **เรียกคิวแล้วเกิน 15 นาทียังไม่มารับ** จะมีกรอบแดง

---

## 7. ก่อน commit

```bash
cd frontend
npx eslint src     # ต้องไม่มี error
npm run build      # ต้อง build ผ่าน
```

ทดสอบแล้วด้วย script กดใช้งานจริงใน Chrome ที่ความกว้าง 390 / 1024 / 1440px
(login ผิด/ถูก, สวิตช์ร้าน, เลื่อนสถานะ, จำลองออเดอร์, ค้นหา, รหัสผิด/ถูก, ยกเลิก, เพิ่ม/แก้/ลบเมนูพร้อม validation,
ตั้งค่า + คิวเต็ม, reload แล้วข้อมูลยังอยู่, ล้างข้อมูล, logout) ไม่มีหน้าไหนเลื่อนแนวนอน และไม่มี error ใน console

---

## 8. ที่ยังไม่ได้ทำ

- ยังไม่ได้ต่อ API จริง (ข้อ 4) และยังไม่มี realtime — ต้องกดปุ่มจำลองออเดอร์เอง
- ยังไม่มีเสียงแจ้งเตือนเมื่อมีออเดอร์ใหม่
- ยังไม่มีหน้าประวัติออเดอร์ย้อนหลัง/รายงานยอดขายรายวัน (กระดานแสดงแค่ของวันนี้ + ที่ยังค้าง)
- ยังไม่มีตัวเลือกเสริมของเมนู (`option_groups` เช่น ระดับความเผ็ด) ในฟอร์ม
- ยังไม่มีสแกน QR — กรอกรหัส 4 หลักอย่างเดียว
- ยังไม่มี unit test
