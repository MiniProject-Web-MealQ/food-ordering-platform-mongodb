**ผลรีวิวระบบ MealQ — 19 ตุลาคม 2026**

> ผลรีวิวนี้บันทึกสถานะก่อนแก้ไข ดูสถานะหลังแก้และผลทดสอบที่ [บันทึกการแก้ไข](system-fixes-2026-10-19.md)

ระบบหลักเชื่อมต่อ MongoDB และทำงานผ่าน API ได้ แต่ยังมีปัญหาที่กระทบการสั่งซื้อ การหักเงิน การรับอาหาร และฟีเจอร์ที่หน้าจอรองรับแต่ Backend ยังไม่บันทึกข้อมูล

ขอบเขต: ตรวจโค้ด Customer / Merchant / Admin / Auth / Wallet / Queue / Promotions / Socket.IO, รันชุดทดสอบเดิม และทดสอบกรณีเพิ่มเติมผ่าน API ที่ `http://localhost:5000/api/v1` กับฐานข้อมูล local `mealq_team_test` ข้อมูลที่สร้างเพื่อทดสอบเป็นบัญชีและร้านชั่วคราว และลบออกหลังทดสอบ ไม่แก้โค้ดระบบและไม่แก้ `docker-compose.yml` ที่มีการแก้ไขอยู่ก่อนแล้ว

ไม่มีเบราว์เซอร์ให้เครื่องมือเชื่อมต่อในเซสชันนี้ จึงยังไม่ได้ยืนยันการคลิกทุกหน้า ภาพบนมือถือ การใช้กล้อง และการ reconnect ของ Socket.IO ในเบราว์เซอร์จริง ผลที่ระบุว่า “ตรวจโค้ด” เป็นข้อสรุปจากโค้ด ไม่ใช่ผลทดสอบหน้าจอ

**ปัญหาที่ควรแก้ก่อนเปิดใช้จริง**

| ลำดับ | ระดับ | ปัญหา | หลักฐาน |
|---|---|---|---|
| 1 | สูง | ส่ง checkout ซ้ำ สร้างออเดอร์และหัก Wallet ซ้ำ | API จริง |
| 2 | สูง | ระงับเจ้าของร้านแล้ว ร้านยังรับออเดอร์และรับชำระเงินได้ | API จริง |
| 3 | สูง | QR รับอาหารที่รหัสซ้ำกันเลือกออเดอร์ผิดได้ | ทดสอบฟังก์ชันและตรวจเส้นทางเรียกใช้งาน |
| 4 | สูง | หน้าลูกค้าไม่มีช่องทาง checkout ที่สำเร็จได้ใน production | ตรวจโค้ดและชุดทดสอบ production payment |
| 5 | กลาง | เพิ่ม/แก้ตัวเลือกเสริมเมนูแล้วไม่บันทึก | API จริง |
| 6 | กลาง | รูปโลโก้และปกร้านไม่บันทึก | API จริง |
| 7 | กลาง | คิวปัจจุบัน เวลาโดยประมาณ และเลขคิวก่อนซื้อไม่อิงข้อมูลครบ | API จริงและทดสอบฟังก์ชัน |
| 8 | กลาง | ส่วนลด/ยอดก่อนจ่ายไม่ตรงกับ Backend | ทดสอบฟังก์ชันทั้งสองฝั่ง |
| 9 | กลาง | หน้าร้านบอกให้คืนเงินเอง แม้ Wallet คืนเงินอัตโนมัติแล้ว | ตรวจโค้ดและผล integration |
| 10 | กลาง | หน้าตัวเลือกอาหารไม่ตรวจ min/max และตัวเลือกที่ปิดขาย | ทดสอบฟังก์ชันและตรวจโค้ด |
| 11 | กลาง | ชื่อตัวเลือกในประวัติออเดอร์อิงเมนูปัจจุบัน | ตรวจโค้ด |
| 12 | กลาง | ตัวตรวจสอบเมนูที่มี unit test ยังไม่ได้ต่อเข้า API จริง | API จริงและตรวจโค้ด |
| 13 | ต่ำ | เรียงร้าน “ใกล้สุด” ไม่ทำงานตามระยะทาง | ตรวจโค้ด |

**รายละเอียดและแนวทางแก้**

1. **Checkout ยังไม่มีการป้องกันคำขอซ้ำทั้งออเดอร์**

   ส่ง `POST /orders` สองครั้งด้วย body และ `Idempotency-Key` เดียวกัน ได้ HTTP 201 ทั้งคู่และคนละ order ID เมนูราคา 65 บาท + ค่าบริการ 4 บาท ทำให้ Wallet จาก 1,000 เหลือ 862 บาท แทน 931 บาท หากคำตอบครั้งแรกหายแล้วผู้ใช้กดลองใหม่ ระบบสามารถคิดเป็นการซื้อใหม่ได้

   Wallet ป้องกันการหักซ้ำต่อ order ID ได้ แต่ checkout สร้าง order ID ใหม่ทุกครั้ง จึงไม่ได้ป้องกันกรณีนี้ ควรผูก idempotency key กับลูกค้าและคำขอสั่งซื้อ เก็บผลลัพธ์เดิม แล้วให้ Frontend ส่ง key เดิมเมื่อ retry

   ตำแหน่ง: `backend/src/controllers/orderController.js:63`, `:128`; `frontend/src/features/customer/api.js:3`; `frontend/src/pages/customer/Payment.jsx`

2. **ระงับบัญชี Merchant ไม่หยุดการขายของร้าน**

   ใช้ Admin ระงับบัญชี Merchant ชั่วคราว จากนั้น `GET /restaurants/:id` ยังได้ `status: active, isOpen: true` และลูกค้าเรียก `POST /orders` ได้ HTTP 201 พร้อม `paymentStatus: paid` เจ้าของร้านที่ถูกระงับกลับเข้าไปจัดการออเดอร์ไม่ได้

   `updateUser` แก้เฉพาะ User ส่วน checkout ตรวจเฉพาะสถานะ Store ควรทำให้นโยบายระงับเจ้าของร้านปิดการรับออเดอร์อย่างสอดคล้องกัน และกำหนดวิธีจัดการออเดอร์ค้าง

   ตำแหน่ง: `backend/src/controllers/adminController.js:111`; `backend/src/controllers/orderController.js:83`; `backend/src/controllers/publicController.js`

3. **QR ไม่ระบุว่าเป็นของออเดอร์ใด**

   QR ฝั่งลูกค้าใส่เฉพาะตัวเลขรับอาหาร 4 หลัก Backend สุ่มเลขโดยไม่รับประกันความไม่ซ้ำในร้าน เมื่อสองออเดอร์ที่พร้อมรับมีรหัส `1234` เหมือนกัน `matchPickupScan` เลือกตัวแรกทันที ทดสอบด้วย ORDER-A และ ORDER-B แล้วได้ ORDER-A โดยไม่แจ้งว่าคลุมเครือ หน้า Orders ใช้ผลนี้เปิดออเดอร์และส่งรหัสต่อให้ฟอร์มรับอาหาร

   ควรใส่ order number ใน QR เช่นรูปแบบ `MEALQ:<orderNumber>:<code>` ที่ตัวอ่านรองรับอยู่แล้ว และไม่เลือกออเดอร์เองเมื่อรหัสตัวเลขตรงหลายรายการ

   ตำแหน่ง: `frontend/src/features/customer/components/pickup-code.jsx:10`; `frontend/src/features/merchant/pickup-qr.js:35`; `frontend/src/pages/merchant/Orders.jsx:48`; `backend/src/controllers/orderController.js:154`

4. **Production checkout ผ่านหน้าลูกค้ายังใช้ไม่ได้**

   Backend คืน HTTP 501 `PAYMENT_NOT_CONFIGURED` สำหรับ PromptPay / card / banking เมื่อ `NODE_ENV=production` ส่วน Wallet ที่ Backend รองรับ ไม่มีอยู่ใน `PAYMENT_METHODS` ซึ่งหน้า Checkout ใช้สร้างตัวเลือกทั้งหมด อีกทั้งไม่มีหน้าลูกค้าดูยอด เติมเงิน และดูรายการ Wallet

   ดังนั้นแม้ลูกค้ามียอด Wallet อยู่แล้ว ก็เลือกจ่ายผ่านหน้าจอปัจจุบันไม่ได้ ต้องต่อ Wallet เข้าหน้าลูกค้า และเชื่อมผู้ให้บริการก่อนเปิดช่องทางจ่ายเงินจริงภายนอก ปัจจุบันการเติมเงินผ่าน API ก็เป็น sandbox และถูกปิดใน production

   ตำแหน่ง: `backend/src/controllers/orderController.js:67`; `backend/src/controllers/customerController.js:104`; `frontend/src/features/customer/mock-data.js:29`; `frontend/src/pages/customer/Checkout.jsx`; `frontend/src/routes/AppRoutes.jsx`

5. **ตัวเลือกเสริมเมนูไม่ถูกเก็บ**

   ส่ง `optionGroups` หนึ่งกลุ่มตอนสร้างเมนู ได้ HTTP 201 แต่ response มี `optionGroups: []` ส่ง PATCH ซ้ำได้ HTTP 200 และยังว่าง Controller ไม่รับ field นี้ทั้ง create และ update ทำให้ตั้งขนาด เพิ่มไข่ หรือระดับความหวานผ่าน Merchant ไม่ได้ แม้เมนูจาก seed ที่มีตัวเลือกอยู่เดิมยังอ่านได้

   ควรนำ `menuChanges` / `validateOptionGroups` ที่มีอยู่มาใช้ใน Controller และทดสอบผ่าน route จริง

   ตำแหน่ง: `backend/src/controllers/merchantController.js:232`, `:269`; `backend/src/services/menu-validation.js`

6. **รูปร้านไม่ถูกเก็บ**

   ส่ง `PATCH /merchant/store` พร้อม `logo` และ `coverImage` ได้ HTTP 200 แต่ทั้งสองค่าไม่อยู่ในผลลัพธ์ที่บันทึก แม้ Store model และ Frontend จะรองรับแล้ว Controller ยังไม่อ่านสอง field นี้ ควรรับ ตรวจรูป และบันทึกลง `logo` / `cover_image`

   ตำแหน่ง: `backend/src/controllers/merchantController.js:320`; `frontend/src/features/merchant/adapters.js`; `frontend/src/features/merchant/components/store-images-card.jsx`

7. **ข้อมูลคิวบนหน้าลูกค้ายังไม่ครบ**

   API คืนเฉพาะ `maxQueue` และ `activeCount` ไม่มี `nowServing` หรือ `waitMinutes` จึงแสดงกำลังทำคิว #0 และใช้เวลา 5–10 นาทีเป็นค่าเริ่มต้นทุกครั้ง เลขคิวประมาณก่อนซื้อใช้จำนวนคิวค้าง + 1 แต่เลขคิวจริงใช้ `queue_sequence` สะสม แม้คิวก่อนหน้าจบหมดแล้ว เลขประมาณกับเลขจริงจึงต่างกันได้มาก

   ควรให้ Backend ส่งคิวที่กำลังทำ จำนวนคิวที่อยู่ข้างหน้า และค่าประมาณจากออเดอร์/เวลาทำจริง หรือแสดงว่าไม่มีข้อมูล แทนการแสดงค่าคงที่เสมือนเป็นสถานะปัจจุบัน

   ตำแหน่ง: `backend/src/controllers/publicController.js:19`; `frontend/src/features/customer/catalog.js:27`, `:230`, `:234`; `frontend/src/features/customer/store.js:72`

8. **ส่วนลดสองฝั่งใช้การปัดเศษต่างกัน**

   กรณีอาหาร 65 บาท ลด 10% ค่าบริการ 4 บาท: Frontend แสดงส่วนลด 7 บาท ยอด 62 บาท แต่ Backend คิดส่วนลด 6.50 บาท ยอด 62.50 บาท Frontend ใช้ `Math.round` เป็นจำนวนเต็ม ส่วน Backend ปัดทศนิยมสองตำแหน่ง

   ควรใช้กติกาเดียวกัน และให้ยอดที่ยืนยันก่อนจ่ายมาจากการคำนวณฝั่งเซิร์ฟเวอร์

   ตำแหน่ง: `frontend/src/features/customer/catalog.js:178`; `backend/src/services/order-pricing.js:59`

9. **ข้อความคืนเงินของ Merchant ไม่ตรงกับระบบจริง**

   หน้ารายละเอียดออเดอร์บอกว่า “ระบบยังไม่คืนเงินให้อัตโนมัติ ต้องคืนเงินให้ลูกค้าเอง” แต่ cancellation ฝั่ง Backend คืน Wallet อัตโนมัติ และ integration ยืนยันว่าคืนเพียงครั้งเดียว ข้อความนี้อาจทำให้ร้านคืนเงินเองเพิ่ม ส่วน sandbox ไม่มีเงินจริงที่ต้องคืน

   ควรแสดงข้อความตาม payment method / payment status และนำสถานะการชำระเงินเข้าข้อมูล Merchant ด้วย

   ตำแหน่ง: `frontend/src/pages/merchant/OrderDetail.jsx:37`; `backend/src/services/order-lifecycle.js`; `backend/src/services/wallet.js:70`

10. **หน้าตัวเลือกอาหารยังไม่ใช้กติกาทั้งหมดของ Backend**

    ตัวเลือกที่ `isAvailable: false` ยังเลือกได้ในหน้ารายละเอียดอาหาร ฟังก์ชัน `missingRequiredGroups` ตรวจเพียงว่าเลือกอย่างน้อยหนึ่งตัว ไม่ตรวจ min/max และ checkbox เลือกเกิน max ได้ ตัวอย่างกลุ่มบังคับเลือก 2 ตัว เมื่อเลือก 1 ตัว ฝั่งหน้าจอรายงานว่าไม่ขาด แต่ Backend ปฏิเสธด้วย `INVALID_OPTIONS`

    ควรปิดตัวเลือกที่ขายไม่ได้ ตรวจ min/max และให้คำอธิบายของกลุ่มตรงกับกติกาจริงก่อนเพิ่มลงตะกร้า

    ตำแหน่ง: `frontend/src/pages/customer/FoodDetail.jsx:28`, `:41`; `frontend/src/features/customer/catalog.js:128`; `backend/src/services/order-pricing.js`

11. **ชื่อของตัวเลือกในออเดอร์ไม่ได้เก็บเป็นประวัติ ณ เวลาสั่ง**

    Order เก็บเฉพาะ group ID / option ID จากนั้น Customer และ Merchant นำไปหา label จากเมนูปัจจุบัน หากชื่อเปลี่ยน ประวัติก็แสดงชื่อใหม่ หากเมนูหรือตัวเลือกถูกลบ ลูกค้าไม่เห็น label และฝั่งร้านเหลือ ID ควรเก็บชื่อและราคาตัวเลือกที่เลือกไว้ในรายการออเดอร์ตอนสร้าง

    ตำแหน่ง: `backend/src/models/Order.js:11`; `backend/src/services/order-pricing.js:55`; `frontend/src/features/customer/store.js:68`; `frontend/src/features/merchant/option-groups.js:198`

12. **Unit test validation เมนูผ่าน แต่ API ไม่ได้ใช้ตัวตรวจนั้น**

    ทดสอบ `PATCH /merchant/menu/:id` ด้วย `isAvailable: "false"` ได้ HTTP 200 และ `isAvailable: true` เพราะ Controller ใช้ `Boolean("false")` ขณะที่ unit test ของ `menuChanges` ตรวจว่าค่านี้ต้องถูกปฏิเสธ แต่ Controller ไม่ได้ import ฟังก์ชันนั้นเลย จึงต้องเชื่อม validation กับ API และเพิ่มกรณีทดสอบ route/controller จริง

    ตำแหน่ง: `backend/src/controllers/merchantController.js:292`; `backend/src/services/menu-validation.js:34`; `backend/test/menu-validation.test.js`

13. **เรียงร้านใกล้สุดยังไม่มีระยะทางจริง**

    Catalogue กำหนด `distance: null` ให้ทุกร้าน แต่หน้า Restaurants ใช้ `a.distance - b.distance` เพื่อเรียงใกล้สุด ผลเท่ากันทั้งหมด จึงไม่ได้เรียงตามระยะทาง ควรมีข้อมูลตำแหน่งและระยะทางก่อนเปิดตัวเลือกนี้

    ตำแหน่ง: `frontend/src/features/customer/catalog.js:23`; `frontend/src/pages/customer/Restaurants.jsx:20`

**ฟีเจอร์และการตั้งค่าที่ยังไม่พร้อม**

- **Google Login และอีเมลลืมรหัสผ่าน:** API `/auth/capabilities` ของระบบที่รันอยู่ตอบ `google: false, email: false, paymentMode: sandbox` ยังไม่มี credentials ของ Google และ SMTP การ reset ใน development ใช้ลิงก์ทดสอบได้ แต่ยังไม่ได้ตรวจการส่งอีเมลจริงหรือ OAuth กับบัญชีผู้ให้บริการ
- **Admin ส่งลิงก์ตั้งรหัสผ่านใหม่:** ปุ่มใน `frontend/src/pages/admin/UserDetail.jsx:222` ถูก disabled ตายตัว แม้ต่อ SMTP ภายหลังก็ยังต้องเชื่อมการทำงานของปุ่มนี้
- **Admin ตั้งค่ากลาง:** `frontend/src/pages/admin/Settings.jsx` เป็นหน้าแจ้งข้อมูล ยังตั้งค่าบริการหรือระบบผ่านหน้านี้ไม่ได้
- **แจ้งเตือนโปรโมชัน:** สวิตช์ใน Profile เก็บ preference ได้ แต่ไม่พบกระบวนการสร้าง/ส่งแจ้งเตือนโปรโมชันที่ใช้ค่านี้ การแจ้งเตือนสถานะออเดอร์มีในแอปขณะโหลด/อัปเดตข้อมูล แต่ยังไม่มี Web Push สำหรับตอนปิดเว็บ
- **บัญชีพนักงานร้าน:** มี role `staff` และ Admin เปลี่ยน role ได้ แต่ยังไม่มีระบบผูกพนักงานหลายบัญชีเข้าร้าน การหาร้านใช้ `Store.owner_id === user._id` เท่านั้น บัญชี staff ที่ไม่ได้เป็น owner จึงไม่มีร้านให้ทำงาน ข้อนี้ตรวจจากโค้ด ยังไม่ได้ทดลองผ่านหน้าจอ
- **ติดตั้งใหม่ตามไฟล์ตัวอย่าง:** Docker Compose ปัจจุบันเปิด MongoDB ที่ host port 27018 แต่ `backend/.env.example:2` ใช้ 27017 การคัดลอก `.env.example` จึงต่อ MongoDB ตัวนี้ไม่ได้จนกว่าจะปรับ URI ส่วน `.env` ของเครื่องทดสอบตั้ง 27018 ไว้แล้วและใช้งานได้
- **คู่มือบางส่วนเก่า:** README รายหน้า Customer / Admin / Merchant ยังมีข้อความว่าระบบใช้ mock หรือยังไม่มี API ซึ่งขัดกับโค้ดปัจจุบัน ควรปรับหลังแก้ฟีเจอร์เพื่อไม่ให้ทีมอ้างอิงสถานะผิด

**สิ่งที่ตรวจแล้วผ่าน**

| การตรวจ | ผล |
|---|---|
| `backend: npm test` | ผ่าน 32, ข้าม MongoDB test 1 ตามค่าเริ่มต้น |
| MongoDB test โดยตั้ง `RUN_DB_TESTS=true` | ผ่านเพิ่ม 1 |
| `backend: npm run test:integration` | ผ่าน 10 กลุ่ม workflow |
| `backend: npm run check` | ผ่าน |
| `frontend: npm run lint` | ผ่าน |
| `frontend: npm run build` | ผ่าน มีคำเตือน JS bundle ประมาณ 1.06 MB ก่อน gzip |
| Backend health / MongoDB | HTTP 200, database connected |

Integration ตรวจการสมัครและสิทธิ์บัญชี, catalogue, profile/favorites, เมนูพื้นฐาน, Wallet ยอดไม่พอและ topup retry, สั่งอาหาร, สถานะครัว, รหัสรับอาหาร, รีวิว, ยกเลิกและคืน Wallet, Admin โปรโมชั่น/ปรับยอด/ระงับ, เปลี่ยนและ reset รหัสผ่าน, และ logout

การผ่านชุดทดสอบเหล่านี้ยืนยัน workflow ที่ครอบคลุมอยู่ แต่ไม่ยืนยันกรณีขอบที่พบเพิ่มในรีวิวนี้ และยังไม่ใช่ผลทดสอบหน้าจอครบทุกเส้นทาง

ลำดับแก้ที่แนะนำ: checkout ซ้ำ → ระงับเจ้าของร้าน → QR ระบุออเดอร์ → ช่องทางจ่ายเงินฝั่งลูกค้า → ตัวเลือกเมนู/รูปร้าน → ยอดเงิน/คิว/ข้อความคืนเงิน → ฟีเจอร์ที่เหลือ
