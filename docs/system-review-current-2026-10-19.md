# ผลรีวิวสถานะปัจจุบัน MealQ — 19 ตุลาคม 2026

ตรวจจาก working tree ปัจจุบันซึ่งมีการแก้ไขค้างอยู่หลายไฟล์ รวมการแก้ตามรายงานเดิม ไม่ใช้รายการปัญหาเก่าเป็นข้อสรุปโดยไม่ตรวจซ้ำ รีวิวรอบนี้ไม่ได้แก้โค้ดระบบ

ระบบเหมาะกับการทดลอง workflow ด้วยข้อมูลทดสอบ แต่ยังไม่พร้อมเปิดรับเงินจริง พบข้อผิดพลาดใหม่ที่ยืนยันได้เรื่องยกเลิกระหว่าง checkout กับ Wallet และรายการโปรดหลังเมนูถูกลบ ส่วน payment provider, Google/SMTP, stock, settlement และ background notifications ยังมีงานเหลือดังรายละเอียด

## ข้อผิดพลาดที่ยืนยันได้

### 1. สูง — ยกเลิกระหว่าง checkout แล้ว Wallet ยังถูกหัก และคิวกลับเป็น waiting

- ตำแหน่ง: `backend/src/controllers/orderController.js:158–186`, `backend/src/services/order-lifecycle.js:6–15`, `backend/src/services/wallet.js:71`
- Checkout สร้าง Order เป็น `pending` ก่อนหัก Wallet และก่อนสร้าง Queue เสร็จ ระหว่างนั้น API อ่านออเดอร์และยกเลิกออเดอร์นี้ได้
- ถ้ายกเลิกก่อนการหักยอดเสร็จ cancellation เห็น `payment_status: pending` จึงยังไม่คืนเงิน จากนั้น checkout เดิมทำงานต่อ หักยอด เปลี่ยน payment status เป็น paid และสร้าง Queue เป็น waiting โดยไม่ตรวจว่า Order ถูกยกเลิกไปแล้ว
- ทดสอบผ่าน HTTP กับ MongoDB ชั่วคราว โดยเพิ่มความล่าช้า 1 วินาทีเฉพาะก่อนเรียกฟังก์ชันหัก payment ใน process ทดสอบ ไม่แก้ไฟล์โค้ดระบบ

ผลที่ได้:

```json
{
  "cancelHttp": 200,
  "checkoutHttp": 201,
  "finalStatus": "cancelled",
  "paymentStatus": "paid",
  "queueStatus": "waiting",
  "balance": 931,
  "expectedBalance": 1000
}
```

ค่าอาหาร 65 บาท + ค่าบริการ 4 บาทถูกหักหลังยกเลิกสำเร็จ และคิวที่ไม่ควรทำต่อยังนับเป็น waiting การส่งยกเลิกซ้ำผ่าน API สามารถกระตุ้นคืนเงินได้ แต่ระบบไม่ได้ทำให้อัตโนมัติหลัง checkout จบ จึงไม่ควรพึ่งให้ลูกค้ากดยกเลิกซ้ำ

ควรจัดการสถานะระหว่างสร้างออเดอร์ให้ชัดเจนและทำให้ checkout/cancellation ประสานกัน เช่น transaction หรือ state transition ที่ตรวจเงื่อนไขและมี compensation ครบ ทั้งยอดเงิน ออเดอร์ และคิว การตรวจสถานะเพียงครั้งเดียวก่อนหักเงินยังไม่ปิดการแข่งขันทั้งหมด

### 2. กลาง — เมนูโปรดถูกลบแล้วบันทึกรายการโปรดอื่นไม่ได้

- ตำแหน่ง: `backend/src/controllers/customerController.js:58–71`, `frontend/src/pages/customer/Favorites.jsx:32–33`, `frontend/src/features/customer/customer-provider.jsx:98–107`
- ขั้นตอนทดสอบ: ลูกค้าบันทึกเมนูโปรด → Merchant ลบเมนู → ลูกค้าเพิ่มร้านโปรด โดยส่ง state รายการโปรดเดิมที่ยังมี ID เมนูที่ลบ
- ผล API: HTTP 400 `INVALID_FAVORITES` การเพิ่มร้านโปรดจึงไม่ถูกบันทึก
- UI ซ่อนเมนูที่หาใน catalogue ไม่พบด้วย `filter(Boolean)` แต่ไม่ลบ ID ออกจาก state ลูกค้าจึงมองไม่เห็นรายการต้นเหตุเพื่อลบเอง
- ปุ่มลองอีกครั้งของ sync error เรียก refresh catalogue/orders ไม่ได้ส่ง favorites ที่บันทึกไม่ผ่านซ้ำ

ควรกรองรายการที่ถูกลบออกอย่างปลอดภัยที่ Backend หรือมีขั้นตอน reconcile favorites และให้ retry ทำการบันทึกที่ล้มเหลวจริง

### 3. กลาง — ตัวกรองสุ่มอาหารญี่ปุ่น/เกาหลี/Fast food ยังไม่มีข้อมูลรองรับครบเส้นทาง

- ตำแหน่ง: `frontend/src/features/customer/mock-data.js:20–27`, `frontend/src/features/customer/catalog.js:56`, `frontend/src/pages/customer/RandomFood.jsx:22–30`, `backend/src/models/Menu.js`, `backend/src/controllers/publicController.js:33–48`
- UI มีตัวเลือก `japanese`, `korean`, `fastfood` แต่ Menu model/ฟอร์มร้านค้า/API catalogue ไม่มี field cuisine
- Frontend จัดอาหารหมวดจานเดียวและเส้นเป็น `thai` และหมวดอื่นที่ไม่รู้จักก็ fallback เป็น `thai`
- ดังนั้นเมนูที่สร้างผ่านระบบปัจจุบันไม่สามารถระบุว่าเป็นอาหารญี่ปุ่น/เกาหลี/Fast food เพื่อให้ตัวกรองเหล่านี้พบได้ ต่อให้ตั้งชื่อเมนูเป็นอาหารประเภทนั้น

ข้อนี้ตรวจเส้นทางข้อมูลจากโค้ด ควรเพิ่ม field และฟอร์มจัดประเภท หรือปรับตัวกรองให้ตรงกับข้อมูลที่จัดเก็บจริง

## ระบบที่ยังไม่มี หรือทำได้บางส่วน

| ระบบ | สถานะปัจจุบัน | งานที่เหลือ / หลักฐาน |
|---|---|---|
| PromptPay/บัตร/ธนาคารเงินจริง | ยังใช้รับเงินจริงไม่ได้ | Development จำลองสำเร็จโดยไม่ตัดเงินจริง Production ปฏิเสธ external payment ด้วย HTTP 501 `PAYMENT_NOT_CONFIGURED`; regression ยืนยัน |
| เติม Wallet ด้วยเงินจริง | ยังใช้ไม่ได้ | Production ปิด endpoint เติมเงิน ลูกค้าใหม่จึงไม่มีช่องทางเติมยอดเอง ใช้ยอดเดิมหรือ Admin ปรับยอดได้; `customerController.js:104–105` |
| Google Login | โค้ดมี แต่เครื่องนี้ยังไม่เปิดใช้ | ตรวจค่าตั้งค่าแบบ boolean ได้ `google: false`; ยังไม่มี credentials และไม่ได้ทดสอบกับ Google จริง |
| อีเมลลืมรหัสผ่าน / Admin ส่งลิงก์ reset | ใช้ลิงก์ทดสอบใน development ได้; อีเมลจริงยังไม่พร้อม | ตรวจได้ `email: false`; production ที่ไม่ตั้ง SMTP ตอบ HTTP 503 `EMAIL_NOT_CONFIGURED`; `authController.js:99–100` |
| แจ้งเตือนขณะปิดเว็บ และประวัติแจ้งเตือนข้ามเครื่อง | ยังไม่มี | ปัจจุบันสร้างแจ้งเตือนในแอปจากข้อมูลที่ sync และเก็บใน localStorage ไม่มี Web Push/service worker หรือ notification inbox บน Backend; `customer-provider.jsx`, `store.js` |
| กู้ checkout/กระทบยอดหลัง process หยุดกลางทาง | ยังไม่มี worker อัตโนมัติ | เก็บ `checkout_completed` และตอบ `CHECKOUT_IN_PROGRESS` เพื่อกันซ้ำ แต่ไม่มี recovery workflow ให้คำขอที่ค้างกลับมาจบเอง ต้องตรวจ Order/Wallet แล้วจัดการ ดู `orderController.js:71` และ README |
| ตัดสต็อกวัตถุดิบ / แจ้งเตือนใกล้หมด | มีเฉพาะ model และการปิดขายเมนูด้วยมือ | มี Ingredient กับ Menu.ingredients แต่ไม่มี route/controller/service จัดการและหักสต็อก ทดสอบผูกเมนูกับวัตถุดิบคงเหลือ 0 แล้วยังสั่งได้ HTTP 201 |
| เปิด–ปิดร้านอัตโนมัติตามเวลา | ยังไม่มี | เวลาเปิด–ปิดบันทึก/แสดงได้ แต่ checkout ตรวจ `is_open` เท่านั้น ทดลองตั้งช่วงเวลาให้พ้นเวลาปัจจุบันแล้วยังสั่งได้ HTTP 201 ร้านต้องกดเปิด/ปิดเอง; `merchantController.js:314–316`, `orderController.js:109` |
| โอนยอดขาย/ถอนเงิน/สรุปยอดจ่ายให้ร้าน | ยังไม่พบการทำงาน | มีรายงานยอดขายและ Wallet ลูกค้า แต่ไม่พบ seller balance, payout/settlement model, route หรือหน้าร้านรับเงิน หากใช้แพลตฟอร์มรับเงินจริงต้องเพิ่ม flow นี้ |
| อนุมัติร้านใหม่ก่อนเริ่มขาย | มี Admin จัดการสถานะ แต่ไม่ได้บังคับร้านใหม่รออนุมัติ | สมัคร Merchant แล้ว Store ใหม่เป็น `active`, `is_open: true` ทันทีตาม default ทดสอบ API ได้ `active`; ถ้าข้อกำหนดคืออนุมัติก่อนขาย ต้องเปลี่ยน flow นี้ |

สองรายการหลังเป็นช่องว่างของความสามารถที่พบจากโค้ด ไม่ใช่การยืนยันว่ามีข้อกำหนดธุรกิจบังคับให้ต้องทำ

## ข้อจำกัดอื่น

- Merchant ยอดขายวันนี้กรองเพียง status ไม่ใช่ `paid`/`simulated` ต่างจาก Admin จึงอาจนับออเดอร์ที่ยังหักเงินไม่เสร็จเมื่อ checkout ค้าง (`frontend/src/features/merchant/orders.js:41–58`)
- เมนูขายดีใช้ยอด `sold_quantity` สะสม ไม่ได้คำนวณช่วงสัปดาห์ แม้ชื่อ field ฝั่งลูกค้าคือ `weeklyOrders`
- Admin โหลด snapshot ผู้ใช้/ร้าน/เมนู/ออเดอร์/ธุรกรรมทั้งหมดเป็นชุดใหญ่ และรูปอยู่ใน data URL ยังควรปรับก่อนข้อมูลเพิ่มมาก แต่ไม่ได้หมายความว่าหน้าปัจจุบันใช้ไม่ได้
- Build ผ่าน มีคำเตือน bundle JavaScript ประมาณ 1,073 kB ก่อน gzip (317 kB หลัง gzip)
- เริ่มตรวจพบ MongoDB ที่พอร์ต 27018 ทำงาน แต่พอร์ต Backend 5000 / Vite 5173, 5174 ไม่ได้เปิดอยู่ สถานะนี้เป็นการไม่ได้เริ่มแอป ไม่ใช่หลักฐานว่าแอปเริ่มไม่ได้

## สิ่งที่ตรวจแล้วผ่านในรอบนี้

| การตรวจ | ผล |
|---|---|
| Backend `npm test` | ผ่าน 38 ข้าม MongoDB test 1 ตามค่าเริ่มต้น |
| MongoDB atomic Wallet test แยก | ผ่าน 1 |
| Backend syntax check | ผ่าน |
| Workflow integration | ผ่าน 10 กลุ่ม บนฐานข้อมูลทดสอบแยก |
| Regression integration | ผ่าน 6 กลุ่ม รวม production Wallet และปิด external payments/topup |
| Frontend `npm test` | ผ่าน 7 |
| Frontend lint/build | ผ่าน มีคำเตือน bundle ตามข้างต้น |
| Browser บางเส้นทาง | เปิด catalogue → เข้าสู่ระบบ Customer → profile → หน้าแรกพร้อมออเดอร์ → รายละเอียดเมนู ได้ |

Regression ครอบคลุมการป้องกัน checkout ซ้ำ, บันทึกตัวเลือกเมนู/รูป/พิกัด, snapshot ตัวเลือก, คิว, staff, suspension, Admin Settings, password-reset request และ production Wallet ปัญหาเดิมที่แก้แล้วเหล่านี้จึงไม่นับเป็นงานค้างโดยอ้างรายงานก่อนแก้

ขอบเขตการยืนยัน: ทดสอบ HTTP/ฐานข้อมูลจริงและเปิด browser บางเส้นทาง ไม่ได้คลิกทุกหน้า/ทุกบทบาท ไม่ได้ทดสอบกล้อง โทรศัพท์จริง การอนุญาตตำแหน่ง background push หรือ OAuth/SMTP/payment provider จริง ข้อที่ระบุว่าตรวจโค้ดไม่ใช่ผลทดสอบบริการภายนอก ข้อมูลทดสอบใช้ฐานข้อมูลชื่อสุ่มที่แยกจากแอปและลบเมื่อจบ

ลำดับแนะนำ: แก้การแข่งขัน checkout/cancellation ก่อน → แก้รายการโปรดและ cuisine → เพิ่มการกู้รายการค้าง → เชื่อม payment/topup และ flow จ่ายร้าน → ตั้งค่า SMTP/Google → เติม stock/เวลาเปิดร้าน/แจ้งเตือนตามขอบเขตที่ต้องการเปิดใช้
