# สัญญา API ฝั่งผู้ดูแลระบบ (Admin API) — ฉบับร่าง

> **อัปเดต 19 ตุลาคม 2026:** เอกสารด้านล่างเก็บไว้เป็นร่างออกแบบเดิม ระบบจริงเชื่อม Backend แล้ว อ้างอิงเส้นทางปัจจุบันจาก `backend/src/routes/adminRoutes.js` และ [README หลัก](../README.md) มี `GET/PATCH /api/v1/admin/settings`, `POST /api/v1/admin/users/:id/reset-password` และ `PATCH /api/v1/admin/users/:id` รองรับ `role: staff` พร้อม `storeId`

> **สถานะ:** ร่างเพื่อขอความเห็นจากทีม backend · ยังไม่มีโค้ดฝั่งไหนใช้
> **ผู้ร่าง:** ฝั่ง frontend (merchant/admin) · หน้าเว็บที่ใช้ดูได้ที่ `/admin` (ตอนนี้ใช้ข้อมูลจำลอง)
> **วิธีให้ความเห็น:** คอมเมนต์ใน PR หรือแก้ไฟล์นี้ตรง ๆ ได้เลย ทุกชื่อ field / endpoint เปลี่ยนได้ ขอแค่ตกลงกันก่อนเริ่มทำ

เอกสารนี้บอกว่าหน้า admin ต้องเรียก API อะไร ส่งอะไรไป และต้องได้อะไรกลับมา
เมื่อตกลงกันแล้ว backend ทำ API ตามนี้ ส่วน frontend จะเปลี่ยนจากข้อมูลจำลองไปเรียก API จริง **backend ไม่ต้องแก้โค้ดใน `frontend/`**

---

## สารบัญ

0. กติการ่วม
1. ระยะที่ 1 — login admin + คูปอง (แนะนำทำก่อน)
2. ระยะที่ 2 — ภาพรวมระบบ
3. ระยะที่ 3 — ร้าน ผู้ใช้ ออเดอร์ Wallet รายงาน ตั้งค่า บันทึก
4. สิ่งที่ต้องเพิ่มใน model
5. สิ่งที่ต้องแก้ในโค้ดเดิม
6. คำถามที่ขอให้ backend ตอบ
7. ฝั่ง frontend จะทำอะไรต่อ

---

## 0. กติการ่วม

ใช้สไตล์เดียวกับ API ที่มีอยู่ (`merchantController.js`, `publicController.js`) จะได้ไม่ต้องเปลี่ยนวิธีเขียน

| เรื่อง | กติกา |
|---|---|
| Base path | `/api/v1/admin/*` (ไฟล์ใหม่ `routes/adminRoutes.js` + `controllers/adminController.js`) |
| สิทธิ์ | `router.use(requireAuth, requireRole("admin"))` ทุก endpoint ใน `/admin` |
| Session | cookie `mealq_session` ตัวเดิม (frontend ส่ง `credentials: "include"` อยู่แล้ว) |
| ชื่อ field | **camelCase** ใน request/response (แบบ `storeView`, `orderView`) ส่วนใน MongoDB ใช้ snake_case ตามเดิม |
| id | ส่งเป็น `id` (string ของ `_id`) และ `clientId` ถ้ามี |
| วันเวลา | ISO 8601 เช่น `"2026-10-01T09:30:00.000Z"` ยกเว้น query `from` / `to` และ `startDate` / `expireDate` ที่เป็น `"YYYY-MM-DD"` (ตีความเป็นเวลาไทย UTC+7: `from` = 00:00, `to` / `expireDate` = 23:59:59) |
| เงิน | จำนวนเต็ม หน่วยบาท |
| Error | `{ "error": { "code": "SOME_CODE", "message": "ข้อความภาษาไทยที่แสดงผู้ใช้ได้", "details"?: {} } }` ผ่าน `sendError` ตัวเดิม |
| Error ร่วม | `401 AUTH_REQUIRED` · `403 FORBIDDEN` (ไม่ใช่ admin) · `404 *_NOT_FOUND` · `400 VALIDATION_ERROR` (`details.fields`: `{ field: "ข้อความ" }`) |
| รายการยาว | query `page` (เริ่ม 1) + `limit` (ค่าเริ่ม 20, สูงสุด 100) ตอบ `{ "<items>": [...], "total": 123, "page": 1, "limit": 20 }` |
| บันทึกการทำงาน | ทุก `POST` / `PATCH` ใน `/admin` ต้องบันทึก activity log (ดูข้อ 3.7–3.8) |

---

## ระยะที่ 1 — login admin + คูปอง (แนะนำทำก่อน)

ทำแค่ระยะนี้ก็ได้ฟีเจอร์หลักที่ต้องการ: **admin login ได้จริง และคูปองที่ admin ปล่อยใช้ได้จริงตอนลูกค้าสั่ง**

### 1.1 Login admin (แก้ endpoint เดิม)

**`POST /api/v1/auth/login`** — รับ `portal: "ADMIN"` เพิ่ม

```json
// ส่งไป
{ "email": "admin@mealq.local", "password": "Admin123!", "portal": "ADMIN", "rememberMe": true }
```
```json
// ตอบกลับ 200 (เพิ่ม mustChangePassword)
{
  "user": { "id": "6abd...", "name": "ผู้ดูแลระบบ MealQ", "email": "admin@mealq.local", "phone": null, "role": "ADMIN", "mustChangePassword": false },
  "store": null
}
```

| สถานะ | code | เมื่อไหร่ |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | อีเมลหรือรหัสผ่านผิด (มีอยู่แล้ว) |
| 403 | `ROLE_MISMATCH` | `portal: "ADMIN"` แต่บัญชีไม่ใช่ admin (มีอยู่แล้ว) |
| 403 | `ACCOUNT_SUSPENDED` | บัญชีถูกระงับ (`User.status = "suspended"`) — ใช้กับทุก portal |

ต้องแก้:
- `services/user-view.js` → `frontendRole()` คืน `"ADMIN"` สำหรับ role `admin` (ตอนนี้คืน `"MERCHANT"`), `"MERCHANT"` สำหรับ `merchant` / `staff`
- `userView()` ส่ง `mustChangePassword`
- `GET /api/v1/auth/me` ตอบรูปแบบเดียวกัน

### 1.2 เปลี่ยนรหัสผ่าน (endpoint ใหม่ ใช้ได้ทุก role)

**`PATCH /api/v1/auth/password`** (ต้อง login)

```json
{ "currentPassword": "Welcome2026", "newPassword": "MyOwnPass9" }
```
ตอบ `200 { "ok": true }` และตั้ง `must_change_password = false`

| สถานะ | code | เมื่อไหร่ |
|---|---|---|
| 401 | `INVALID_PASSWORD` | รหัสปัจจุบันผิด |
| 400 | `WEAK_PASSWORD` | admin: ไม่ถึง 8 ตัว หรือไม่มีตัวพิมพ์ใหญ่/เล็ก/ตัวเลข (ลูกค้า/ร้านค้าใช้เกณฑ์เดิมใน `services/password.js`) |
| 400 | `SAME_PASSWORD` | รหัสใหม่ซ้ำรหัสเดิม |

### 1.3 คูปอง (endpoint ใหม่)

รูปแบบคูปองที่ใช้ทุก endpoint ด้านล่าง (`promotionView`):

```json
{
  "id": "6abe...",
  "code": "HELLO25",
  "title": "ต้อนรับเปิดเทอม",
  "description": "",
  "discountType": "percentage",
  "discountValue": 25,
  "maxDiscount": 40,
  "minimumOrder": 60,
  "startDate": "2026-10-01T00:00:00+07:00",
  "expireDate": "2026-10-31T23:59:59+07:00",
  "usageLimit": 300,
  "perUserLimit": 1,
  "usedCount": 12,
  "isActive": true,
  "store": null,
  "state": "live",
  "createdAt": "2026-10-01T02:10:00.000Z"
}
```

- `discountType`: `"percentage"` | `"fixed"` · `maxDiscount` ใช้เฉพาะ percentage (`null` = ไม่จำกัด)
- `usageLimit`: `null` = ไม่จำกัด
- `store`: `null` = ใช้ได้ทุกร้าน หรือ `{ "id", "clientId", "name" }` = เฉพาะร้านนั้น
- `state` (คำนวณตอนตอบ ไม่ต้องเก็บ): `"disabled"` (isActive=false) → `"scheduled"` (ยังไม่ถึงวันเริ่ม) → `"expired"` → `"used_up"` (ครบ usageLimit) → `"live"`

| method | path | ใช้ทำอะไร |
|---|---|---|
| GET | `/admin/promotions?q=&state=&page=&limit=` | รายการคูปอง (`q` ค้นใน code/title) → `{ promotions, total, page, limit }` |
| POST | `/admin/promotions` | สร้างคูปอง → `201 { promotion }` |
| GET | `/admin/promotions/:id` | รายละเอียด → `{ promotion, usage: { orderCount, totalDiscount } }` |
| PATCH | `/admin/promotions/:id` | แก้บาง field ได้ (เปิด/ปิดใช้ส่งแค่ `{ "isActive": false }`) → `{ promotion }` |
| GET | `/admin/promotions/:id/orders?page=&limit=` | ออเดอร์ที่ใช้คูปองนี้ → `{ orders: [{ id, orderNumber, store: { id, name }, discount, createdAt }], total, page, limit }` |

**body ของ POST / PATCH:**
```json
{
  "code": "HELLO25", "title": "ต้อนรับเปิดเทอม", "description": "",
  "discountType": "percentage", "discountValue": 25, "maxDiscount": 40,
  "minimumOrder": 60, "startDate": "2026-10-01", "expireDate": "2026-10-31",
  "usageLimit": 300, "perUserLimit": 1, "storeId": null, "isActive": true
}
```

**ตรวจที่ server** (หน้าเว็บตรวจเหมือนกันอยู่แล้ว แต่ server ต้องตรวจซ้ำ):
`code` A–Z/0–9 3–20 ตัว ไม่ซ้ำทั้งระบบ · `title` ไม่ว่าง ≤ 60 ตัว · `discountValue` ≥ 1 (percentage ≤ 100) · `minimumOrder` ≥ 0 · `expireDate` ≥ `startDate` · `usageLimit` ≥ 1 หรือ null · `perUserLimit` ≥ 1 · `storeId` ต้องเป็นร้านที่มีอยู่

| สถานะ | code | เมื่อไหร่ |
|---|---|---|
| 400 | `VALIDATION_ERROR` | ข้อมูลผิดตามด้านบน (`details.fields`) |
| 409 | `PROMOTION_CODE_EXISTS` | โค้ดซ้ำ |
| 404 | `PROMOTION_NOT_FOUND` | ไม่พบคูปอง |

### 1.4 ลูกค้าตรวจคูปองก่อนจ่าย (endpoint ใหม่ สำหรับฝั่ง customer)

**`POST /api/v1/coupons/validate`** (ต้อง login เป็นลูกค้า)

```json
{ "code": "HELLO25", "storeId": "pa-daeng", "subtotal": 130 }
```
```json
// 200
{ "coupon": { "code": "HELLO25", "title": "ต้อนรับเปิดเทอม", "discountType": "percentage", "discountValue": 25, "maxDiscount": 40 }, "discount": 33 }
```

| สถานะ | code | `message` ตัวอย่าง |
|---|---|---|
| 404 | `COUPON_NOT_FOUND` | ไม่พบคูปองนี้ |
| 409 | `COUPON_INACTIVE` | คูปองนี้ปิดใช้งานแล้ว |
| 409 | `COUPON_NOT_STARTED` | คูปองนี้ใช้ได้ตั้งแต่ … |
| 409 | `COUPON_EXPIRED` | คูปองนี้หมดอายุแล้ว |
| 409 | `COUPON_USED_UP` | สิทธิ์คูปองนี้เต็มแล้ว |
| 409 | `COUPON_USER_LIMIT` | คุณใช้คูปองนี้ครบสิทธิ์แล้ว |
| 409 | `COUPON_STORE_MISMATCH` | คูปองนี้ใช้ได้เฉพาะร้าน … (`details.storeName`) |
| 409 | `COUPON_MIN_ORDER` | ยอดขั้นต่ำ ฿… (`details.minimumOrder`) |

**วิธีคำนวณส่วนลด:** percentage = `round(subtotal × value / 100)` ไม่เกิน `maxDiscount` · fixed = `value` · ทั้งสองแบบไม่เกิน `subtotal`

### 1.5 ใช้คูปองตอนสั่งอาหาร (แก้ endpoint เดิม)

**`POST /api/v1/orders`** ใน `orderController.createOrder`:
- เลิกเขียนตายตัว `couponCode === "LUNCH10"` → ใช้ logic เดียวกับ 1.4 (แยกเป็นฟังก์ชันใช้ร่วมกัน)
- ถ้าคูปองใช้ไม่ได้ ตอบ error ตามตาราง 1.4 **ไม่สร้างออเดอร์** (ไม่ใช่สร้างโดยส่วนลด 0 บาทแบบตอนนี้)
- สำเร็จแล้ว `used_count += 1` (ควรใช้ `findOneAndUpdate` แบบมีเงื่อนไข กันสิทธิ์เกินตอนสั่งพร้อมกัน)
- เก็บ `order.promotion = { promotion_id, code, discount_type, discount_value }` ตามจริง

---

## ระยะที่ 2 — ภาพรวมระบบ

### 2.1 `GET /admin/summary`

```json
{
  "generatedAt": "2026-10-01T16:14:00.000Z",
  "today": { "orderCount": 26, "revenue": 3941, "cancelled": 0, "backlog": 10 },
  "totals": { "stores": 12, "open": 9, "closed": 1, "suspended": 0, "pending": 2, "customers": 30, "newCustomers": 4, "newMerchants": 2 },
  "daily": [ { "date": "2026-09-25", "revenue": 3781, "orders": 31 } ],
  "topStores": [ { "storeId": "6abd...", "clientId": "sushi-hub", "name": "Sushi Hub", "orders": 19, "revenue": 5205 } ],
  "topMenus": [ { "menuId": "6abd...", "name": "บิบิมบับ", "storeName": "Seoul Bowl", "quantity": 31, "revenue": 3069 } ],
  "attention": {
    "pendingStores": [ { "id": "6abd...", "name": "ส้มตำป้าหนิง", "category": "อาหารอีสาน" } ],
    "stuckOrders": [ { "id": "6abd...", "orderNumber": "MQ3863", "storeName": "Bean & Brew", "status": "pending", "createdAt": "…" } ],
    "highCancelStores": [ { "storeId": "6abd...", "name": "Burger Lab", "orders": 11, "cancelled": 2, "cancelRate": 0.18 } ]
  }
}
```

ความหมาย (ตรงกับหน้าเว็บ):
- `today.revenue` = ผลรวม `total_price` ของออเดอร์วันนี้ที่ **ไม่** `cancelled`
- `today.backlog` = ออเดอร์ทั้งระบบที่ status เป็น `pending/confirmed/preparing/ready`
- `totals.open/closed` นับเฉพาะร้าน `status = "active"` · `newCustomers/newMerchants` = สมัครใน 7 วันล่าสุด
- `daily` 7 วันล่าสุดรวมวันนี้ เรียงเก่า → ใหม่ (วันที่ไม่มีออเดอร์ก็ต้องมี ค่าเป็น 0)
- `topStores` / `topMenus` 5 อันดับ ใน 7 วันล่าสุด (ร้านเรียงตาม revenue, เมนูเรียงตาม quantity)
- `stuckOrders` = ยังไม่จบและสั่งมานานกว่า 30 นาที · `highCancelStores` = 7 วันล่าสุด ออเดอร์ ≥ 5 และยกเลิก ≥ 15%

---

## ระยะที่ 3 — จัดการร้าน ผู้ใช้ ออเดอร์ Wallet รายงาน ตั้งค่า บันทึก

### 3.1 ร้านค้า

| method | path | ใช้ทำอะไร |
|---|---|---|
| GET | `/admin/stores?q=&status=&category=&page=&limit=` | รายการร้าน (`status`: `open` / `closed` / `suspended` / `pending` / `rejected`) ร้าน `pending` ขึ้นก่อน |
| GET | `/admin/stores/:id` | รายละเอียด (`:id` = `_id` หรือ `client_id`) |
| PATCH | `/admin/stores/:id` | เปลี่ยนสถานะ / บังคับปิด / แก้จุดรับอาหารและคิวสูงสุด |

แถวในรายการ:
```json
{ "id": "6abd...", "clientId": "pa-daeng", "name": "ร้านป้าแดง", "category": "อาหารตามสั่ง",
  "owner": { "id": "6abd...", "name": "แดง ใจกว้าง", "email": "merchant@mealq.local" },
  "status": "active", "isOpen": true, "rating": { "average": 4.8, "count": 642 },
  "todayOrders": 5, "monthRevenue": 18480 }
```

รายละเอียด = แถวด้านบน + `{ phone, address, openingHours, maxQueue, statusNote, createdAt, stats: { todayOrders, monthRevenue, cancelRate30d, averageOrder30d, orders30d }, menus: [menuView], recentOrders: [orderRow 10 รายการ] }`

body ของ PATCH (ส่งเฉพาะที่ต้องการเปลี่ยน):
```json
{ "status": "suspended", "reason": "ร้องเรียนเรื่องความสะอาด", "isOpen": false, "address": { "detail": "อาคาร 12 ชั้น 1 · ช่อง 4" }, "maxQueue": 45 }
```
- `status`: `active` (อนุมัติ / ยกเลิกระงับ) · `suspended` · `rejected` (ไม่อนุมัติร้าน pending) — `suspended` / `rejected` **บังคับ `reason` ≥ 5 ตัว** และตั้ง `is_open = false` อัตโนมัติ
- `isOpen`: admin ส่งได้แค่ `false` (บังคับปิด) **บังคับ `reason`**
- `maxQueue`: 1–200

| สถานะ | code | เมื่อไหร่ |
|---|---|---|
| 400 | `REASON_REQUIRED` | ระงับ / ไม่อนุมัติ / บังคับปิด โดยไม่มีเหตุผล |
| 409 | `INVALID_STATUS_CHANGE` | เช่น `rejected` → `suspended` |

### 3.2 ผู้ใช้

| method | path | ใช้ทำอะไร |
|---|---|---|
| GET | `/admin/users?q=&role=&status=&page=&limit=` | `q` ค้นชื่อ / อีเมล / เบอร์ · `role`: `customer` / `merchant` / `staff` / `admin` |
| GET | `/admin/users/:id` | `{ user, walletBalance?, stores?, recentOrders?, recentActivity? }` (ส่งเฉพาะที่เกี่ยวกับ role นั้น) |
| PATCH | `/admin/users/:id` | `{ "status": "suspended", "reason": "…" }` หรือ `{ "role": "staff" }` |
| POST | `/admin/users` | เพิ่มผู้ดูแลระบบ `{ name, email, phone?, password }` → สร้าง role `admin`, `must_change_password = true` |
| POST | `/admin/users/:id/password-reset` | ส่งลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล → `{ ok: true }` |

`user` ในรายการ: `{ id, name, email, phone, role, status, statusNote, mustChangePassword, createdAt }` — role ใน `/admin/*` ใช้ตัวเล็กตาม model (`customer` / `merchant` / `staff` / `admin`)

| สถานะ | code | เมื่อไหร่ |
|---|---|---|
| 403 | `CANNOT_MODIFY_SELF` | ระงับหรือเปลี่ยน role บัญชีตัวเอง |
| 409 | `EMAIL_EXISTS` | อีเมลซ้ำ (มีอยู่แล้วใน register) |
| 400 | `WEAK_PASSWORD` | ตาม 1.2 |
| 400 | `REASON_REQUIRED` | ระงับโดยไม่มีเหตุผล |

### 3.3 ออเดอร์

| method | path | ใช้ทำอะไร |
|---|---|---|
| GET | `/admin/orders?q=&storeId=&status=&from=&to=&minTotal=&maxTotal=&page=&limit=` | `q` ค้นเลขออเดอร์ / ชื่อลูกค้า · เรียงใหม่ → เก่า · ตอบ `{ orders, total, page, limit, sumRevenue }` (`sumRevenue` = ยอดรวมของผลกรองทั้งหมดที่ไม่ยกเลิก) |
| GET | `/admin/orders/:id` | `:id` = `_id` หรือ `order_number` |
| POST | `/admin/orders/:id/cancel` | `{ "reason": "ร้านติดต่อไม่ได้เกิน 30 นาที" }` |
| POST | `/admin/orders/:id/refund` | `{ "amount": 69, "method": "wallet", "note": "คืนเต็มจำนวน" }` |

รายละเอียดออเดอร์ = `orderView` เดิม + ฟิลด์เหล่านี้:
```json
{
  "queue": { "queueNumber": 27, "pickupCode": "9662", "status": "ready", "calledAt": "…", "completedAt": null },
  "receiveTime": null,
  "cancel": { "by": "admin", "reason": "…", "at": "…" },
  "refund": { "amount": 69, "method": "wallet", "note": "…", "at": "…", "by": { "id": "…", "name": "…" } }
}
```
- `cancel.by`: `store` / `customer` / `admin`
- cancel ได้เฉพาะ `pending/confirmed/preparing/ready` → `409 ORDER_NOT_CANCELLABLE`
- refund ได้เฉพาะ `cancelled` ที่ยังไม่เคยคืน · `amount` 1 ถึง `total_price` → `409 REFUND_NOT_ALLOWED` / `400 REFUND_AMOUNT_INVALID`
- `method: "wallet"` = เพิ่มยอด Wallet ลูกค้า + สร้าง `WalletTransaction` type `refund` · `"original"` = แค่บันทึกว่าคืนผ่านช่องทางเดิมแล้ว
- **admin ไม่มี endpoint เลื่อนสถานะทำอาหาร** (ให้ร้านทำเท่านั้น)
- cancel / refund ต้อง emit `order:status` ทาง socket ให้ร้านและลูกค้าเหมือน `updateOrderStatus` เดิม

### 3.4 Wallet

| method | path | ใช้ทำอะไร |
|---|---|---|
| GET | `/admin/wallets?q=&page=&limit=` | ลูกค้าเรียงยอดมาก → น้อย: `{ user: { id, name, email }, balance, transactionCount, lastTransactionAt }` + `summary: { totalBalance, refunds30d, adjustments30d }` |
| GET | `/admin/wallets/:userId/transactions?page=&limit=` | `{ id, type, amount, balanceBefore, balanceAfter, description, order?: { id, orderNumber }, by?: { id, name }, createdAt }` เรียงใหม่ → เก่า |
| POST | `/admin/wallets/:userId/adjust` | `{ "amount": 50, "reason": "ชดเชยออเดอร์ล่าช้า" }` (ติดลบ = หักเงิน) → `{ balance, transaction }` |

- `type`: `topup` / `payment` / `refund` / `adjust` (เพิ่มค่า `adjust` ใน `WalletTransaction` ถ้ายังไม่มี)
- `reason` บังคับ ≥ 5 ตัว · หักเกินยอด → `409 INSUFFICIENT_BALANCE`
- ควรทำใน transaction ของ MongoDB (ปรับ `Wallet.balance` กับสร้าง `WalletTransaction` พร้อมกัน)

### 3.5 รายงาน

**`GET /admin/reports?from=2026-09-02&to=2026-10-01`**
```json
{
  "daily": [ { "date": "2026-09-02", "orders": 31, "revenue": 3800 } ],
  "monthly": [ { "month": "2026-08", "orders": 0, "revenue": 0 } ],
  "stores": [ { "storeId": "…", "name": "ร้านป้าแดง", "orders": 175, "cancelled": 10, "cancelRate": 0.06, "revenue": 18480 } ],
  "menus": [ { "menuId": "…", "name": "บิบิมบับ", "storeName": "Seoul Bowl", "quantity": 93, "revenue": 9207 } ],
  "hourly": [ { "hour": 6, "orders": 12 } ]
}
```
- `daily` ทุกวันในช่วง (วันที่ไม่มีออเดอร์ = 0) · `monthly` 3 เดือนล่าสุดนับจาก `to` · `menus` 10 อันดับ · `hourly` 06–21 น. ตามเวลาไทย
- ไฟล์ CSV หน้าเว็บสร้างเองจากข้อมูลนี้ ไม่ต้องมี endpoint

### 3.6 ตั้งค่าระบบ

| method | path | |
|---|---|---|
| GET | `/admin/settings` | |
| PATCH | `/admin/settings` | ส่งเฉพาะที่เปลี่ยน |
| GET | `/api/v1/settings` (สาธารณะ) | ให้แอปลูกค้า/ร้านค้าอ่าน `serviceFee`, `maintenanceMode`, `maintenanceMessage`, `categories` ที่เปิดอยู่ |

```json
{
  "serviceFee": 4,
  "maintenanceMode": false,
  "maintenanceMessage": "ระบบปิดปรับปรุงชั่วคราว จะกลับมาให้บริการเร็ว ๆ นี้",
  "categories": [ { "value": "single", "label": "อาหารจานเดียว", "enabled": true } ]
}
```
- `serviceFee` 0–50 · `maintenanceMessage` ≥ 5 ตัวเมื่อเปิด maintenance
- `categories[].value` แก้ไม่ได้ (`single` / `noodle` / `drink` / `dessert`) แก้ได้แค่ `label` กับ `enabled` และต้องเปิดอย่างน้อย 1 หมวด
- เก็บเป็น document เดียวในตารางใหม่ `Setting` (หรือวิธีอื่นที่ backend สะดวก)

### 3.7 รายการ action ที่บันทึก

| action | เกิดจาก |
|---|---|
| `store.approve` / `store.reject` / `store.suspend` / `store.activate` / `store.forceClose` / `store.update` | 3.1 |
| `user.suspend` / `user.activate` / `user.role` / `user.resetPassword` / `user.addAdmin` / `user.changePassword` | 3.2, 1.2 (ไม่บันทึกตัวรหัสผ่าน) |
| `order.cancel` / `order.refund` | 3.3 |
| `promotion.create` / `promotion.update` / `promotion.enable` / `promotion.disable` | 1.3 |
| `wallet.adjust` | 3.4 |
| `settings.update` | 3.6 |

### 3.8 บันทึกการทำงาน

**`GET /admin/activity?actorId=&group=&q=&page=&limit=`**
- `group` = คำนำหน้า action: `store` / `user` / `order` / `promotion` / `wallet` / `settings`
- `q` ค้นใน `targetLabel` และ `detail`

```json
{
  "activity": [
    { "id": "…", "at": "…", "actor": { "id": "…", "name": "สมชาย ผู้ดูแล" }, "action": "store.suspend",
      "targetType": "store", "targetId": "…", "targetLabel": "ร้านป้าแดง", "detail": "ร้องเรียนเรื่องความสะอาด" }
  ],
  "total": 42, "page": 1, "limit": 30
}
```
`detail` = เหตุผลหรือสรุปสิ่งที่เปลี่ยน (หน้าเว็บแสดงตามนี้ตรง ๆ)

---

## 4. สิ่งที่ต้องเพิ่มใน model

| model | field ใหม่ | ค่า |
|---|---|---|
| `User` | `status` | `"active"` (ค่าเริ่ม) / `"suspended"` |
| `User` | `status_note` | string \| null |
| `User` | `must_change_password` | boolean (ค่าเริ่ม `false`, admin ที่สร้างผ่าน 3.2 = `true`) |
| `Store` | `status` | `"pending"` / `"active"` (ค่าเริ่ม) / `"suspended"` / `"rejected"` |
| `Store` | `status_note` | string \| null |
| `Order` | `cancel` | `{ by, reason, at }` \| null |
| `Order` | `refund` | `{ amount, method, note, at, by }` \| null |
| `Promotion` | `store_id` | **ให้เป็น `null` ได้** (= ทุกร้าน) ตอนนี้ required |
| `Promotion` | `code` | unique **ทั้งระบบ** (ตอนนี้ unique คู่กับ `store_id`) |
| `Promotion` | `max_discount`, `per_user_limit` | number \| null |
| `WalletTransaction` | `type` | เพิ่มค่า `adjust` · และ field `by` (admin ที่ทำ) |
| ใหม่ `AdminLog` | `actor_id, action, target_type, target_id, target_label, detail, createdAt` | ดู 3.8 |
| ใหม่ `Setting` | ตาม 3.6 | |

ร้านที่มีอยู่ตอนนี้ทั้งหมดควรเป็น `status: "active"` (migration หรือค่าเริ่มต้น)

---

## 5. สิ่งที่ต้องแก้ในโค้ดเดิม

ข้อเหล่านี้ทำให้สิ่งที่ admin ตั้ง **มีผลจริง** กับลูกค้าและร้าน

| ไฟล์ | แก้อะไร | ระยะ |
|---|---|---|
| `services/user-view.js` | role `admin` → `"ADMIN"` + `mustChangePassword` | 1 |
| `controllers/authController.js` | รับ `portal: "ADMIN"`, ปฏิเสธบัญชี `suspended` ทุก portal | 1 |
| `controllers/orderController.js` → `createOrder` | ใช้คูปองจากตาราง (1.5) แทน `LUNCH10` | 1 |
| `controllers/orderController.js` → `createOrder` | ปฏิเสธร้าน `status !== "active"` (`409 STORE_UNAVAILABLE`), ปฏิเสธตอน `maintenanceMode` (`503 MAINTENANCE`), ใช้ `serviceFee` จาก settings แทน `SERVICE_FEE` | 3 |
| `controllers/publicController.js` | `GET /restaurants` และ `/restaurants/:id/menu` ไม่แสดงร้านที่ไม่ใช่ `active` | 3 |
| `middleware/auth.js` → `requireAuth` | บัญชี `suspended` ใช้ session เดิมต่อไม่ได้ (`403 ACCOUNT_SUSPENDED`) | 3 |
| `controllers/merchantController.js` → `updateStore` | ร้านที่ถูกระงับเปิดร้านเองไม่ได้ (`409 STORE_SUSPENDED`) | 3 |
| `scripts/seed.js` | เพิ่ม `admin@mealq.local` (role admin) | 1 |
| `server.js` | `app.use("/api/v1/admin", adminRoutes)` และ `/api/v1/coupons`, `/api/v1/settings` | 1 |

---

## 6. คำถามที่ขอให้ backend ตอบ

1. ทำระยะไหนบ้าง (แนะนำอย่างน้อยระยะที่ 1)
2. role `staff` ฝั่ง frontend ควรเห็นเป็น `"MERCHANT"` เหมือนตอนนี้ใช่ไหม
3. ส่งอีเมลจริงได้ไหม (ลิงก์ตั้งรหัสผ่าน) ถ้าไม่ได้ `password-reset` คืนลิงก์ใน response ให้ admin ส่งเองแทนได้ไหม
4. ต้องการให้ admin เห็นออเดอร์ย้อนหลังกี่วัน / ต้องมี index เพิ่มไหม (`orders.createdAt`, `orders.status`)
5. อยากเปลี่ยนชื่อ field หรือรวม endpoint ตรงไหน — แก้ในไฟล์นี้ได้เลย

---

## 7. ฝั่ง frontend จะทำอะไรต่อ

- เพิ่มสวิตช์ `VITE_ADMIN_API` ใน `frontend/.env` — `off` (ค่าเริ่ม) = ข้อมูลจำลองแบบตอนนี้ · `on` = เรียก API ตามเอกสารนี้
- endpoint ไหน backend ทำเสร็จ frontend ต่อทีละกลุ่ม แล้วทดสอบร่วมกัน
- ฝั่ง customer (ไม่ใช่ทีม admin) ต้องเปลี่ยนหน้าตะกร้าให้เรียก `POST /coupons/validate` และอ่าน `GET /settings`
- ข้อมูลจำลองปัจจุบันอยู่ที่ `frontend/src/features/admin/mock-data.js` ใช้ดูตัวอย่างข้อมูลจริงที่หน้าเว็บคาดหวังได้ ส่วนคู่มือหน้าเว็บอยู่ที่ `frontend/src/pages/admin/README.md`
