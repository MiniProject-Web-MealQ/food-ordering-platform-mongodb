# ฝั่งผู้ดูแลระบบ (Admin Frontend)

> **อัปเดต 19 ตุลาคม 2026:** เนื้อหาด้านล่างเป็นบันทึกการออกแบบเดิม ระบบปัจจุบันเชื่อม API/MongoDB ใช้บัญชีจริงและไม่เก็บรหัสผ่านใน localStorage แล้ว เพิ่มการผูกพนักงานเข้าร้าน, ส่งคำขอตั้งรหัสผ่าน, ตั้งค่าบริการ/หยุดรับออเดอร์ และปิดร้านเมื่อระงับเจ้าของ ดู [README หลัก](../../../../README.md) และ [บันทึกการแก้ไข](../../../../docs/system-fixes-2026-10-19.md)

หน้าผู้ดูแลระบบทั้งหมดอยู่ใต้ `/admin` ใช้ดูภาพรวมทั้งเว็บไซต์ ดูแลร้านและผู้ใช้ ดูออเดอร์ทุกร้าน และปล่อยคูปองส่วนลด

> ⚠️ **ตอนนี้ใช้ข้อมูลจำลองทั้งหมด** (เก็บใน `localStorage` key `mealq.admin.v1`) ยังไม่ได้เชื่อม backend
> ทุกหน้ามีป้าย **"ข้อมูลจำลอง"** การกดระงับร้าน สร้างคูปอง หรือปรับยอด Wallet มีผลแค่ในเบราว์เซอร์นั้น
> ถ้าทีมหลังบ้านจะทำ API ให้ ดูข้อ 4 ว่าต้องเพิ่มอะไรบ้าง

รันแค่ frontend ก็พอ: `npm run dev` แล้วเปิด <http://localhost:5173/admin>

| บัญชีทดสอบ | รหัสผ่าน |
|---|---|
| `admin@mealq.local` (ผู้ดูแลระบบ MealQ) | `Admin123!` |
| `somchai.admin@mealq.local` (สมชาย ผู้ดูแล) | `Admin123!` |

ตอน `npm run dev` มีลิงก์ "ใช้บัญชีทดสอบ" ใต้ฟอร์ม (ไม่มีในเว็บที่ build จริง)
บัญชีร้านค้า/ลูกค้า login หน้านี้ไม่ได้ ระบบจะบอกว่า "บัญชีนี้ไม่ใช่ผู้ดูแลระบบ"

---

## 1. หน้าทั้งหมด

| URL | ไฟล์ | ทำอะไรได้ |
|---|---|---|
| `/admin/login` | `AdminLogin.jsx` | login เฉพาะบัญชี role admin ไม่มีปุ่มสมัคร |
| `/admin` | `Dashboard.jsx` | ตัวเลขวันนี้ (ออเดอร์ ยอดขาย ยกเลิก คิวค้าง), ตัวเลขสะสม (ร้าน ลูกค้า สมัครใหม่ 7 วัน), กราฟยอดขาย/ออเดอร์ 7 วัน, 5 ร้านและ 5 เมนูขายดี, สิ่งที่ต้องดูแล (ร้านรออนุมัติ ออเดอร์ค้างเกิน 30 นาที ร้านยกเลิกบ่อย ≥15%) |
| `/admin/stores` | `Stores.jsx` | รายการร้าน ค้นหา/กรองสถานะและหมวด ร้านรออนุมัติขึ้นก่อน |
| `/admin/stores/:id` | `StoreDetail.jsx` | ข้อมูลร้าน สถิติ เมนู ออเดอร์ล่าสุด · อนุมัติ/ไม่อนุมัติ · ระงับ/ยกเลิกระงับ · บังคับปิดร้าน · แก้จุดรับอาหารและจำนวนคิวสูงสุด |
| `/admin/users` | `Users.jsx` | รายการผู้ใช้ ค้นหา/กรองประเภทและสถานะ · เพิ่มผู้ดูแลระบบ |
| `/admin/users/:id` | `UserDetail.jsx` | ข้อมูลบัญชี ประวัติออเดอร์และ Wallet (ลูกค้า) ร้านที่เป็นเจ้าของ (ร้านค้า) · ระงับ · เปลี่ยนประเภท · ส่งลิงก์ตั้งรหัสผ่าน · **ทำกับบัญชีตัวเองไม่ได้** |
| `/admin/orders` | `Orders.jsx` | ออเดอร์ทุกร้าน กรองร้าน/สถานะ/ช่วงวันที่/ยอดเงิน (`?store=<id>` กรองร้านให้เลย) |
| `/admin/orders/:id` | `OrderDetail.jsx` | รายการอาหาร timeline คิวและรหัสรับอาหาร · ยกเลิกแทนร้าน · บันทึกการคืนเงิน (เข้า Wallet หรือช่องทางเดิม) · **เลื่อนสถานะทำอาหารแทนร้านไม่ได้** |
| `/admin/promotions` | `Promotions.jsx` | คูปองทั้งหมด สร้าง/แก้ไข (ใน pop-up) เปิด/ปิด กดที่โค้ดเพื่อดูว่าใช้กับออเดอร์ไหน |
| `/admin/wallets` | `Wallets.jsx` | ยอด Wallet ของลูกค้า ประวัติรายการ ปรับยอดด้วยมือ (บังคับใส่เหตุผล) (`?user=<id>` เปิดของคนนั้นเลย) |
| `/admin/reports` | `Reports.jsx` | ยอดขายรายวัน/รายเดือน แยกร้าน เมนูขายดี ช่วงเวลาที่คนสั่งเยอะ · ดาวน์โหลด CSV (เปิดใน Excel ภาษาไทยไม่เพี้ยน) |
| `/admin/settings` | `Settings.jsx` | ค่าบริการต่อออเดอร์ ชื่อ/เปิดปิดหมวดอาหาร ปิดระบบชั่วคราว · ล้างข้อมูลจำลอง |
| `/admin/activity` | `Activity.jsx` | บันทึกการทำงานของ admin ทุกครั้ง (ใคร ทำอะไร กับอะไร เมื่อไหร่ เหตุผล) |
| `/admin/account` | `Account.jsx` | บัญชีของฉัน · เปลี่ยนรหัสผ่าน (ต้องใส่รหัสเดิม) · ผู้ดูแลที่ถูกสร้างใหม่ถูกบังคับมาหน้านี้ตอน login ครั้งแรก |

route ประกาศที่ [`src/routes/AppRoutes.jsx`](../../routes/AppRoutes.jsx) (เพิ่มเฉพาะส่วน ADMIN ROUTES)

การกระทำที่กระทบคนอื่น (ระงับ ไม่อนุมัติ บังคับปิด ยกเลิกออเดอร์ ปรับยอด Wallet) **ต้องใส่เหตุผลอย่างน้อย 5 ตัวอักษร** และถูกบันทึกในหน้าบันทึกการทำงาน

**รหัสผ่านของผู้ดูแลแต่ละคน**
- ผู้ดูแลที่มีอยู่แล้ว (จาก seed) ใช้ `Admin123!` และเปลี่ยนได้ที่ "บัญชีของฉัน / เปลี่ยนรหัสผ่าน" ใน sidebar
- ตอนเพิ่มผู้ดูแลระบบ ผู้เพิ่มตั้ง "รหัสผ่านเริ่มต้น" + ยืนยัน เกณฑ์: อย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข (`features/admin/password.js`)
- ผู้ดูแลคนใหม่ login ด้วยรหัสนั้นแล้ว **ถูกบังคับไปตั้งรหัสของตัวเองก่อน** เข้าหน้าอื่นไม่ได้จนกว่าจะเปลี่ยน รหัสใหม่ต้องไม่ซ้ำรหัสเดิม
- เกณฑ์นี้ใช้เฉพาะ admin ส่วนลูกค้า/ร้านค้ายังใช้เกณฑ์เดิมใน `features/auth/password.js`

---

## 2. โครงไฟล์

```
src/pages/admin/            หน้าจอ (1 ไฟล์ = 1 หน้า)
src/features/admin/
├── mock-data.js            ข้อมูลจำลอง: ผู้ใช้ ร้าน เมนู ออเดอร์ 30 วัน คูปอง Wallet บันทึก (สุ่มด้วย seed คงที่)
├── store.js                reducer + action ทั้งหมด + useAdmin() + save/load localStorage
├── admin-provider.jsx
├── stats.js                คำนวณตัวเลข: วันนี้, สะสม, รายวัน/รายเดือน, อันดับร้าน/เมนู, สิ่งที่ต้องดูแล
├── labels.js               ชื่อภาษาไทยของสถานะ ประเภทบัญชี การกระทำ
├── promotion-form.js       validation ของฟอร์มคูปอง
├── format.js / nav-items.js / csv.js
└── components/
    ├── admin-nav.jsx       sidebar สีเข้ม (จอใหญ่) + แถบบนและเมนูแบบ pop-up (มือถือ)
    ├── data-list.jsx       ตาราง (จอ md+) / การ์ด (มือถือ) + ปุ่มแสดงเพิ่ม
    ├── bar-chart.jsx       กราฟแท่ง ชี้/Tab ดูค่าได้ สลับเป็นตารางได้
    ├── reason-dialog.jsx   pop-up ยืนยันที่บังคับใส่เหตุผล
    ├── promotion-form.jsx  ฟอร์มสร้าง/แก้ไขคูปอง
    ├── fields.jsx          ช่องค้นหา / select / วันที่ ของแถวตัวกรอง
    └── badges.jsx          ป้ายสถานะร้าน ผู้ใช้ ประเภทบัญชี คูปอง และป้าย "ข้อมูลจำลอง"
src/layouts/AdminLayout.jsx เช็ค login + sidebar
```

ใช้ของที่มีอยู่แล้วจากฝั่ง merchant (ไม่ได้แก้): `MerchantDialog`, `StatCard`, `OrderStatusBadge`, `OrderTimeline`, `CountBubble`, format/styles
ร้านและเมนูในข้อมูลจำลองมาจาก `features/customer/mock-data.js` (import อย่างเดียว) ชื่อจึงตรงกับแอปลูกค้า

---

## 3. State

`useAdmin()` → `{ state, dispatch }` และสร้าง action ด้วย `actions.*` (ท้าย `store.js`) เพื่อให้ reducer เป็น pure function

```js
// state = { session, users, stores, menus, orders, promotions, wallets, wallet_transactions, activity, settings }
dispatch(actions.setStoreStatus("pa-daeng", "suspended", "เหตุผล"));
```

ชื่อ field เป็น snake_case ตาม model ของ backend ส่วนที่ **ยังไม่มีใน model** และต้องเพิ่ม:
`User.status`, `Store.status` (`pending/active/suspended/rejected`), `Store.status_note`, `Order.cancel`, `Order.refund`,
`Promotion.max_discount`, `Promotion.per_user_limit`, `Promotion.store_id` เป็น null ได้ (= ทุกร้าน), ตาราง activity log

**ล้างข้อมูล:** หน้าตั้งค่าระบบ → "ล้างข้อมูลจำลอง" หรือลบ key `mealq.admin.v1`
ข้อมูลจำลองสร้างตามเวลาที่เปิดครั้งแรก มีออเดอร์ที่กำลังทำใน 40 นาทีล่าสุดและออเดอร์ค้างเสมอ

---

## 4. ถ้าหลังบ้านจะทำให้ใช้งานจริง ต้องเพิ่มอะไร

> รายละเอียดเต็ม (request / response / error ของทุก endpoint) อยู่ใน **[docs/admin-api.md](../../../../docs/admin-api.md)** — ข้อนี้เป็นแค่สรุป

ทุกจุดที่จำลองมีคอมเมนต์ `MOCK:` บอก endpoint ที่ควรมาแทน หาได้ด้วย `grep -rn "MOCK" src/features/admin src/pages/admin`

**4.1 login แยก admin**
- `services/user-view.js` ส่ง role `"ADMIN"` (ตอนนี้แปลง admin เป็น `"MERCHANT"`)
- `POST /auth/login` รับ `portal: "ADMIN"` และรับเฉพาะ role admin, บัญชีที่ `status: "suspended"` ต้อง login ไม่ได้
- `scripts/seed.js` เพิ่ม `admin@mealq.local`
- `User.must_change_password` + `PATCH /auth/password { currentPassword, newPassword }` (ตรวจรหัสเดิมและเกณฑ์ที่ server เก็บเป็น `password_hash`)
- ตอนนี้หน้าจอเก็บรหัสผ่านของ admin ที่เพิ่มใหม่ไว้ใน localStorage แบบไม่เข้ารหัส **เพื่อจำลองเท่านั้น**

**4.2 API กลุ่ม `/api/v1/admin/*`** (`requireRole("admin")`)

| endpoint | ใช้ในหน้า |
|---|---|
| `GET /admin/summary` | ภาพรวม (ตัวเลขวันนี้/สะสม, รายวัน 7 วัน, อันดับร้าน/เมนู, สิ่งที่ต้องดูแล) |
| `GET /admin/stores` · `GET /admin/stores/:id` · `PATCH /admin/stores/:id` (`status`, `reason`, `isOpen`, `address`, `maxQueue`) | ร้านค้า |
| `GET /admin/users` · `GET /admin/users/:id` · `PATCH /admin/users/:id` (`status`, `role`, `reason`) · `POST /admin/users` (เพิ่ม admin) · `POST /admin/users/:id/password-reset` | ผู้ใช้ |
| `GET /admin/orders` (กรอง store/status/from/to/amount) · `GET /admin/orders/:id` · `POST /admin/orders/:id/cancel` · `POST /admin/orders/:id/refund` | ออเดอร์ |
| `GET/POST /admin/promotions` · `PATCH /admin/promotions/:id` · `GET /admin/promotions/:id/orders` | คูปอง |
| `GET /admin/wallets` · `GET /admin/wallets/:userId/transactions` · `POST /admin/wallets/:userId/adjust` | Wallet |
| `GET /admin/reports?from=&to=` (รายวัน รายเดือน แยกร้าน เมนู ชั่วโมง) | รายงาน |
| `GET/PATCH /admin/settings` | ตั้งค่าระบบ |
| `GET /admin/activity` (และบันทึกทุกครั้งที่เรียก PATCH/POST ข้างบน) | บันทึกการทำงาน |

**4.3 ให้ของที่ admin ตั้งมีผลจริง**
- **คูปอง:** `orderController.createOrder` ยังเขียนตายตัวว่ารู้จักแค่ `LUNCH10` ต้องเปลี่ยนไปหาจากตาราง Promotion และตรวจวันที่ ยอดขั้นต่ำ สิทธิ์ และร้าน พร้อมเพิ่ม `POST /coupons/validate` ให้หน้าตะกร้าลูกค้าใช้
- **ร้านถูกระงับ / ปิดปรับปรุงระบบ:** ตอนสั่งอาหารต้องปฏิเสธ และ `GET /restaurants` ไม่ควรแสดงร้านที่ระงับหรือรออนุมัติ
- **ค่าบริการ:** ฝั่งลูกค้าเขียน `SERVICE_FEE` ตายตัว ต้องอ่านจาก settings

**4.4 ฝั่ง customer** ต้องตรวจคูปองผ่าน API และอ่านร้าน/ค่าบริการจาก API (ไม่ใช่งานของฝั่ง admin)

---

## 5. ข้อจำกัดที่ต้องรู้

- login เป็นของจำลอง รหัสผ่าน `Admin123!` อยู่ในโค้ดของเว็บ และรหัสของ admin ที่เพิ่มใหม่อยู่ใน localStorage แบบไม่เข้ารหัส (จำเป็นสำหรับการจำลอง) **ห้ามใช้แบบนี้กับระบบจริง** ต้องเปลี่ยนไปใช้ API ตามข้อ 4.1
- ใครก็ตามที่แก้ localStorage ได้ก็เข้า `/admin` ได้ (ไม่มีการตรวจสิทธิ์ฝั่ง server จนกว่าจะต่อ API)
- ข้อมูลมีย้อนหลัง 30 วัน รายงานรายเดือนของเดือนก่อน ๆ จึงไม่ครบเดือน
- ส่งลิงก์ตั้งรหัสผ่าน / เพิ่มผู้ดูแล ยังไม่ส่งอีเมลจริง

---

## 6. ก่อน commit / ที่ทดสอบแล้ว

```bash
cd frontend
npx eslint src && npm run build
```

ทดสอบด้วย script กดใน Chrome ที่ 390 / 1024 / 1440px (238 จุดตรวจ ผ่านทั้งหมด):
login (บัญชีร้านถูกปฏิเสธ, รหัสผิด, กลับหน้าเดิมหลัง login), ภาพรวม + กราฟ (focus ดูค่า, สลับเป็นตาราง), เมนูมือถือ,
อนุมัติร้าน, ระงับ (บังคับเหตุผล) / ยกเลิกระงับ, บังคับปิดร้าน, แก้คิวสูงสุด (validation), ระงับตัวเองไม่ได้,
ระงับลูกค้า, เปลี่ยนประเภท, ส่งลิงก์รหัสผ่าน, เพิ่ม admin (อีเมลซ้ำ / รหัสอ่อน / ยืนยันไม่ตรง ถูกปฏิเสธ),
admin ใหม่ login แล้วถูกบังคับเปลี่ยนรหัส (รหัสเดิมผิด / รหัสซ้ำถูกปฏิเสธ, หน้าอื่นเข้าไม่ได้จนกว่าจะเปลี่ยน, รหัสเก่าใช้ไม่ได้หลังเปลี่ยน), ยกเลิกออเดอร์แทนร้าน, คืนเงิน (validation),
สร้างคูปอง (โค้ดซ้ำ, % เกิน 100), เปิด/ปิดคูปอง, ดูการใช้คูปอง, ปรับยอด Wallet (หักเกินยอดไม่ได้), รายงาน 30 วัน + ดาวน์โหลด CSV,
ตั้งค่าระบบ (validation), บันทึกการทำงานมีครบพร้อมเหตุผล, reload แล้วข้อมูลยังอยู่, logout
ไม่มีหน้าไหนเลื่อนแนวนอน ไม่มี error ใน console
