# ฝั่งลูกค้า (Customer Frontend)

> **อัปเดต 19 ตุลาคม 2026:** เนื้อหาด้านล่างเป็นบันทึกการออกแบบเดิม ไม่ใช่สถานะปัจจุบัน ระบบเชื่อม API/MongoDB แล้ว มี login guard, Wallet ที่ `/customer/wallet`, การสั่งซื้อป้องกัน retry ซ้ำ, คิวจาก Backend, รีวิวจริง และ QR ระบุเลขออเดอร์ ดูคู่มือปัจจุบันที่ [README หลัก](../../../../README.md) และ [บันทึกการแก้ไข](../../../../docs/system-fixes-2026-10-19.md)

หน้าลูกค้าทั้งหมดอยู่ใต้ `/customer` (คู่กับฝั่งร้านค้าที่อยู่ใต้ `/merchant`)
ทุกหน้าใช้งานได้จริงตั้งแต่เลือกเมนู → จ่ายเงิน → ติดตามคิว → รีวิว
แต่ **ข้อมูลทั้งหมดยังเป็นข้อมูลจำลอง** เพราะ backend ยังไม่มี API ให้เรียก

รันดูได้ที่ `npm run dev` แล้วเปิด <http://localhost:5173/customer> (ไม่ต้อง login)

---

## 1. Route ทั้งหมด

| URL | ไฟล์ | หน้าที่ |
|---|---|---|
| `/customer` | `Home.jsx` | หน้าแรก: ออเดอร์ที่กำลังทำ, เมนูขายดี, ร้านใกล้คุณ |
| `/customer/explore` | `Restaurants.jsx` | รายการร้าน + ตัวกรอง (เปิดอยู่ / คิว / คะแนน / ประเภท) |
| `/customer/search` | `Search.jsx` | ค้นหาเมนูและร้าน พร้อมคำแนะนำระหว่างพิมพ์ |
| `/customer/restaurants/:id` | `RestaurantDetail.jsx` | หน้าร้าน: แท็บเมนู / ข้อมูลร้าน / รีวิว |
| `/customer/restaurants/:id/menu/:menuId` | `FoodDetail.jsx` | เลือกตัวเลือกอาหาร + หมายเหตุ แล้วใส่ตะกร้า |
| `/customer/cart` | `Cart.jsx` | ตะกร้า, คูปอง, แจ้งเตือนเมนูที่หมดระหว่างเลือก |
| `/customer/checkout` | `Checkout.jsx` | สรุปรายการ + เลือกวิธีจ่าย |
| `/customer/checkout/payment` | `Payment.jsx` | สถานะกำลังจ่าย / สำเร็จ / ไม่สำเร็จ |
| `/customer/orders/:id/confirmed` | `OrderConfirmed.jsx` | สั่งสำเร็จ: เลขคิว + รหัสรับอาหาร |
| `/customer/orders/:id` | `OrderDetail.jsx` | ติดตามสถานะแบบ timeline |
| `/customer/orders` | `Orders.jsx` | ออเดอร์ที่กำลังทำ + ประวัติ (มีแถบตัวกรอง) |
| `/customer/orders/:id/review` | `Review.jsx` | ให้ดาว, แท็ก, แนบรูป, เขียนรีวิว |
| `/customer/random` | `RandomFood.jsx` | สุ่มเมนูตามงบและเงื่อนไข |
| `/customer/favorites` | `Favorites.jsx` | ร้านโปรด / เมนูโปรด |
| `/customer/notifications` | `Notifications.jsx` | การแจ้งเตือน |
| `/customer/profile` | `Profile.jsx` | โปรไฟล์, สถิติ, ตั้งค่า |

route ทั้งหมดประกาศไว้ที่ [`src/routes/AppRoutes.jsx`](../../routes/AppRoutes.jsx)

> ⚠️ `Login.jsx` กับ `Register.jsx` ในโฟลเดอร์นี้เป็นไฟล์โครงเก่า **ไม่มี route ไหนใช้แล้ว**
> หน้า login/register ตัวจริงอยู่ที่ `src/pages/auth/` ถ้าไม่มีใครใช้ ลบได้เลย

---

## 2. โครงไฟล์

```
src/pages/customer/      หน้าจอ (เน้นแค่ layout กับการต่อ state)
src/features/customer/   logic และ component เฉพาะฝั่งลูกค้า
├── mock-data.js         ข้อมูลจำลอง: ร้าน, เมนู, ออเดอร์ตัวอย่าง, โปรไฟล์
├── catalog.js           ฟังก์ชันค้นข้อมูล + คำนวณราคา/สถานะออเดอร์
├── store.js             reducer + action ทั้งหมด (ตะกร้า, ออเดอร์, ร้านโปรด, แจ้งเตือน)
├── customer-provider.jsx  Provider ที่ save state ลง localStorage
├── order-filters.js     เงื่อนไขตัวกรองของหน้าประวัติออเดอร์
├── format.js            จัดรูปแบบเงิน/เวลา/ระยะทาง
├── nav-items.js         รายการเมนูที่ header กับแถบล่างใช้ร่วมกัน
└── components/          การ์ดร้าน, แถวเมนู, ปุ่มเพิ่ม, แถบ nav ฯลฯ
src/layouts/CustomerLayout.jsx     ครอบ state + header (desktop)
src/layouts/CustomerTabLayout.jsx  หน้าที่มีแถบเมนูด้านล่าง (มือถือ)
```

**หลักที่ใช้:** ไฟล์ในหน้าจอ (`pages/`) ไม่ควรมี logic ธุรกิจ
ถ้าจะเพิ่มการคำนวณหรือกฎอะไร ให้ไปไว้ใน `features/customer/`

---

## 3. State ของลูกค้า

ทุกอย่างเก็บใน React reducer ตัวเดียว แล้ว save ลง `localStorage` key `mealq.customer.v1`
เรียกใช้ด้วย `useCustomer()` จาก `features/customer/store.js`

```js
const { state, dispatch } = useCustomer();
// state = { cart, orders, favorites, notifications, settings }
dispatch({ type: "cart/add", menuId, selections, note, qty });
```

action ที่มี: `cart/add`, `cart/setQty`, `cart/dismissRemoved`, `cart/applyCoupon`,
`cart/removeCoupon`, `cart/reorder`, `order/place`, `order/advance`, `order/review`,
`favorites/toggle`, `notifications/read`, `notifications/readAll`, `settings/set`

**กติกา:** reducer ต้องเป็น pure function — id, เวลา และค่าสุ่ม สร้างจาก `actions.*`
(ท้ายไฟล์ `store.js`) แล้วค่อยส่งเข้า dispatch

**อยากเริ่มข้อมูลใหม่:** ลบ key `mealq.customer.v1` ใน DevTools → Application → Local Storage แล้ว refresh

---

## 4. จุดที่ต้องต่อ API จริง (ฝากทีม backend)

ทุกจุดที่เป็นของปลอมคอมเมนต์ไว้ด้วยคำว่า `MOCK` ในโค้ด หาได้ด้วย `grep -rn "MOCK" src/`

| เรื่อง | ตอนนี้ทำอะไร | ต้องการ API |
|---|---|---|
| ร้าน / เมนู | อ่านจาก `mock-data.js` | `GET /restaurants`, `GET /restaurants/:id/menu` |
| ตะกร้า | เก็บใน localStorage | จะย้ายขึ้น server หรือปล่อยไว้ที่ client ก็ได้ ขอให้บอก |
| สั่งซื้อ | สร้าง order ในเครื่อง | `POST /orders` → ต้องได้ `queueNumber`, `pickupCode`, `etaMinutes` กลับมา |
| ชำระเงิน | จำลอง 2.2 วินาที (Online banking ถูกปฏิเสธเสมอเพื่อให้เห็นหน้า error) | ตามที่ payment gateway กำหนด |
| สถานะออเดอร์ | กดปุ่ม "เดินสถานะ" เองในหน้า `OrderDetail` | realtime หรือ polling: `PLACED → PAID → QUEUED → PREPARING → READY → PICKED_UP` |
| รีวิว | เก็บในเครื่อง, รูปยังไม่อัปโหลด | `POST /orders/:id/review` + อัปโหลดรูป |
| ร้านโปรด / แจ้งเตือน / ตั้งค่า | เก็บในเครื่อง | ผูกกับ user ตอนมีระบบ auth |
| QR รับอาหาร | เป็นลวดลายที่สร้างจากรหัส 4 หลัก **สแกนไม่ได้จริง** | ต้องตกลงกับฝั่งร้านว่าจะสแกนอะไร |

---

## 5. สีและปุ่ม

สีทั้งหมดเป็น design token ประกาศไว้ที่ [`src/index.css`](../../index.css) **แก้ที่เดียวเปลี่ยนทั้งเว็บ**
อย่า hardcode สีเป็น hex ในไฟล์ component

| token | ใช้ตอนไหน |
|---|---|
| `brand` `brand-dark` `brand-ink` | สีส้มหลัก, hover, ตัวหนังสือสีแบรนด์บนพื้นขาว |
| `mint` `leaf` | เหลืองอ่อน/เข้ม สำหรับป้ายและเส้นขอบ |
| `cocoa` `forest` | น้ำตาล และการ์ดสีเข้ม |
| `ink` `ink-soft` | ตัวหนังสือหลัก / รอง |
| `page` `cream` `snow` `haze` `line` | พื้นหลังและเส้นคั่น |
| `alert` `danger` `amber` | error, จุดแจ้งเตือน, ดาวคะแนน |

ปุ่มใช้ `buttonClasses()` จาก `src/components/ui/styles.js`
- `variant: "cocoa"` = ปุ่มทึบสีน้ำตาล (ใช้ในหน้าลูกค้า)
- ไม่ใส่ variant = ปุ่มสีส้ม (ใช้ในหน้า landing / login)

> ⚠️ ห้ามใช้ class `text-muted` — โปรเจกต์นี้ติดตั้ง shadcn ไว้ ซึ่งจอง `muted` เป็นสีพื้นเกือบขาว
> ตัวหนังสือสีรองให้ใช้ `text-ink-soft`
> และถ้าจะ `npx shadcn@latest add button` มันจะเขียนทับ `src/components/ui/button.jsx` ของเรา ระวังด้วย

---

## 6. Responsive

- **ต่ำกว่า 1024px:** แถบเมนูอยู่ด้านล่าง ปุ่มหลักติดขอบล่างจอ
- **1024px ขึ้นไป:** มี header ด้านบน (`components/customer-header.jsx`) แถบล่างถูกซ่อน และปุ่มที่เคยติดขอบล่างย้ายไปอยู่คอลัมน์ขวา

ทุกหน้าเขียนแบบ mobile-first: class ปกติคือมือถือ แล้วค่อยเพิ่ม `lg:` สำหรับจอใหญ่

---

## 7. ก่อน commit

```bash
cd frontend
npx eslint src     # ต้องไม่มี error
npm run build      # ต้อง build ผ่าน
```

โปรเจกต์ใช้ eslint กฎ react-hooks เวอร์ชันใหม่ ห้ามเรียก `setState` ตรง ๆ ใน `useEffect`
และห้ามอ่าน `ref.current` ตอน render

---

## 8. ที่ยังไม่ได้ทำ

- ยังไม่มีการเช็ค login — เข้าทุกหน้าได้เลย ต้องเพิ่ม guard เมื่อ auth พร้อม
- ยังไม่มีรูปจริง ใช้กรอบเส้นประแทนทุกที่ (`ImagePlaceholder`)
- ยังไม่มี unit test — ที่ทำคือรัน script กดใช้งานจริงในเบราว์เซอร์
- หน้า `/terms`, `/privacy`, `/help` ยังไม่มีคนทำ (มีลิงก์ไปแล้วจากหน้าสมัครสมาชิกและโปรไฟล์)
