# Demo payments และอนุมัติร้านใหม่ — 19 ตุลาคม 2026

ปรับตามขอบเขตที่ผู้ใช้ยืนยัน: PromptPay และ Wallet เป็น demo, ลูกค้าเพิ่มยอด Wallet ได้เอง, ร้านใหม่ต้องรอ Admin อนุมัติก่อนขาย และ Google Login เริ่มที่ localhost

- `PAYMENT_MODE=demo` เป็นค่าเริ่มต้น ใช้ได้ทั้ง development/production ไม่อิง `NODE_ENV` โฆษณาเฉพาะ Wallet และ PromptPay; ทั้งคู่ระบุเป็น sandbox ไม่มีเงินจริง
- `/customer/wallet` มีแบบฟอร์มเพิ่มยอด demo และปุ่มเลือก 100/300/500/1,000 บาท API รับยอด 1–10,000 บาทต่อครั้ง ตรวจจำนวนและ idempotency เช่นเดิม
- `PAYMENT_MODE=wallet` ปิดการเติม demo และ PromptPay simulation ได้ เผื่อต้องการจำกัดการทดลอง ไม่ได้เพิ่ม payment provider จริง
- Store ใหม่มี `status: pending, is_open: false` ทั้งสมัครรหัสผ่านและสมัคร Google ซึ่งใช้ onboarding เดียวกัน ร้านเตรียมเมนู/ข้อมูลได้ แต่เปลี่ยนสถานะอนุมัติเองไม่ได้และ checkout ถูกปฏิเสธ
- Admin อนุมัติที่หน้าจัดการร้าน หลังอนุมัติ Merchant ต้องกดเปิดรับออเดอร์เอง UI แสดงสถานะรออนุมัติ/ไม่อนุมัติ/ระงับและเหตุผล พร้อมปิดสวิตช์ที่ยังใช้ไม่ได้ สถานะร้าน sync ทุก 30 วินาทีหรือกดตรวจสอบเองได้
- ร้านเก่าเก็บสถานะเดิม ไม่ทำ migration ระงับร้านที่อนุมัติแล้ว Seed demo ระบุ active โดยชัดเจน
- ปิดการแข่งขันระหว่าง checkout กับ cancellation ที่พบในรีวิว: API ยกเลิกและครัวยังเปลี่ยนสถานะไม่ได้จน checkout เสร็จ จากนั้นยกเลิกได้ตามกติกาและคืนยอด Wallet พร้อมปิดคิว ข้อมูล Order เก่าที่ไม่มี marker รองรับด้วย default สำเร็จ ส่วน checkout ใหม่ตั้ง in-progress โดยชัดเจน
- คู่มือ Google: [ตั้งค่าบน localhost](google-login-localhost.md) ยังไม่ได้รับ credentials จึงยังไม่ได้ยืนยัน OAuth กับผู้ให้บริการจริง

ผลตรวจอัตโนมัติ: Backend ผ่าน 40 tests (MongoDB test ข้าม 1 ตามโหมดปกติ), regression ผ่าน 9 กลุ่ม รวม deployed demo/approval/การยกเลิกระหว่าง payment ที่จำลองให้ล่าช้า, Frontend ผ่าน 7 tests, lint และ build ผ่าน มีคำเตือน bundle ใหญ่เช่นเดิม

Workflow integration ผ่าน 10 กลุ่มบนฐานข้อมูลชั่วคราว ตรวจ browser จริงแล้วว่าลูกค้ากดเพิ่ม 300 demo baht และเห็นประวัติรายการได้ ร้านใหม่เห็นข้อความรออนุมัติและสวิตช์เปิดรับออเดอร์ disabled

รายงานรีวิวก่อนเปลี่ยนขอบเขตเก็บไว้เป็นประวัติ ข้อที่บอกว่า production ไม่เปิดเติม demo/ร้านใหม่ไม่รออนุมัติ/ยกเลิกระหว่าง checkout แล้วยอดถูกหัก ได้รับการเปลี่ยนแปลงในรอบนี้ ส่วน stock, favorites, cuisine, Web Push, recovery worker และ provider จริงยังไม่ได้เพิ่มในงานนี้
