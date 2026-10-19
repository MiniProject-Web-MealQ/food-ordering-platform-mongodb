# รีเซ็ตร้านและเมนู MealQ — 19 ตุลาคม 2026

ผู้ใช้สั่งล้างบัญชีร้านค้าและเมนูทั้งหมด แล้วสร้างชุดร้านใหม่พร้อมภาพให้ครบหมวดหลักของเว็บ

## ชุดใหม่

| ร้าน | ประเภท | เมนู |
| --- | --- | --- |
| ครัวข้าวหอม | อาหารไทย | 8 |
| โซระ เจแปน | ญี่ปุ่น | 8 |
| โซลเทเบิล | เกาหลี | 8 |
| บันแอนด์คริสป์ | ฟาสต์ฟู้ดและอาหารตะวันตก | 8 |
| ซิปการ์เดน | เครื่องดื่ม | 8 |
| สวีตคลาวด์ | ของหวาน | 8 |

รวม 48 เมนู: จานเดียว 22, เส้น 10, เครื่องดื่ม 8 และของหวาน 8 แต่ละร้านมีบัญชีเจ้าของแยกและได้รับอนุมัติสำหรับการสาธิตแล้ว มีโควตาสต็อกจำลอง 100 ที่ต่อเมนู ไม่สร้างยอดขายหรือรีวิวปลอม

ภาพ AI ใหม่ 60 ภาพสร้างแยกกันด้วย built-in image_gen: โปรไฟล์ 6, แบนเนอร์ 6, เมนู 48 ตรวจภาพและปรับคำอธิบายที่เกี่ยวข้องให้ตรงกัน เก็บ PNG ต้นฉบับและ prompt sets ใน `output/imagegen/catalogue-20261019-v2/` และ WebP สำหรับเว็บใน `frontend/public/catalogue/20261019-v2/` ขนาดรวม 5,470,110 ไบต์ ภาพโหลดแยกรายการ ไม่มี dependency ภายนอกสำหรับรูป

## ข้อมูลเดิมและความปลอดภัย

- สำรอง source ก่อนแก้: `C:\Users\game_\MealQBackups\source-before-catalogue-reset-20261019T204023` จำนวน 573 files
- เป้าหมายเดิม: merchant 6 บัญชี, ร้าน 15, เมนู 37, ingredient 1; ไม่ลบลูกค้าหรือแอดมิน
- เก็บออเดอร์เดิม 15 รายการ คิว 13 รายการ ประวัติ Wallet/ledger และ inbox/email history; เพิ่ม store_snapshot ก่อนลบร้านเพื่อให้ประวัติยังแสดงชื่อร้านได้
- ยกเลิกออเดอร์ค้าง 1 รายการตามงานรีเซ็ต เป็น PromptPay Demo ยอด 134 บาท ไม่มีเงินจริงหรือยอด Wallet ให้เครดิตจากการจ่ายจำลอง การชดเชยเรียกซ้ำไม่คืนสิทธิ์หรือสต็อกซ้ำ
- ไม่สร้างหรือส่งอีเมล/Push จากการรีเซ็ต และหยุดงานข้อความค้างของออเดอร์ที่ยกเลิกโดยเก็บประวัติไว้
- พักเฉพาะ MealQ API/workers ระหว่าง snapshot และเปลี่ยนข้อมูล; ไม่ recreate DB, Tunnel, proxy, DNS helper หรือโปรเจค muaysart
- Snapshot ก่อนลบที่ไม่มี checkout แทรก: `shared/backups/daily/20261019T211154+0700-290550`; ตรวจสำเนาเข้ารหัส Windows `C:\Users\game_\MealQBackups\20261019T211154+0700-290550.mealq` ด้วย SHA/HMAC/decryption ก่อน apply
- Target archives, phase markers และ credentials ใหม่: `shared/backups/catalogue-reset-20261019T141151Z` สิทธิ์ส่วนตัว ไม่ลบ backup/releases/images เดิม

## รุ่นและผลทดสอบ

- ขึ้น code รุ่น `20261019-catalogue-v2` ก่อนเปลี่ยนข้อมูล และแก้สิทธิ์ static assets ในรุ่น `20261019-catalogue-v2-r2`; Docker image กำหนดโฟลเดอร์เว็บ 755/ไฟล์ 644 ไม่ให้ umask ของ private staging ขัดขวาง nginx worker
- URL ภาพจาก API มี `?v=20261019-v2-r2` เพื่อไม่ใช้ HTML fallback ที่ Cloudflare อาจ cache ก่อนแก้สิทธิ์ path ในฐานข้อมูลยังตรงกับ manifest
- ปรับ one-shot reset runner ให้ใช้ environment ที่ Docker Compose parse แล้ว ไม่ส่งค่าที่มีเครื่องหมาย quote ติดไปแบบ docker run --env-file; คง backend.env เดิม รุ่นใช้งานของสคริปต์คือ `shared/reset-catalogue-pi-envfix.sh`
- Frontend 64 tests, lint/build ผ่าน; Backend รุ่นสุดท้าย 64 ผ่าน/ข้าม 1 optional Mongo test บน Pi; catalogue replacement Mongo integration 5 กลุ่ม, coupons 11 กลุ่ม, local order-email 16 กลุ่ม และ mock Push 11 กลุ่มผ่านก่อนเปลี่ยนข้อมูล ฐานทดสอบมี archive ก่อน drop
- บัญชีร้านใหม่ 6 บัญชีทดสอบ login/logout ผ่าน รหัสเริ่มต้นสุ่มและต้องเปลี่ยนครั้งแรก ไฟล์สำหรับผู้ใช้: `backend/.env.catalogue-merchant-access-20261019-v2.json` gitignored และ ACL ผู้ใช้/SYSTEM เท่านั้น อีเมล .invalid ใช้สาธิต ต้องเปลี่ยนและยืนยันอีเมลจริงก่อนรับแจ้งเตือนทางอีเมล

การควบคุมเบราว์เซอร์จริงยังติด saved origin permission จึงไม่ข้ามข้อจำกัดนี้ การตรวจ production ใช้ HTTP/API และ hash ของภาพ พร้อมการตรวจภาพต้นฉบับจาก ImageGen

## ตรวจหลังขึ้นใช้งานจริง

- HTTPS ผ่าน: ร้าน 6, เมนู 48, ภาพ 60 โหลดได้ทั้งหมดด้วย `image/webp` และ SHA256 ตรงกับไฟล์ที่ส่งทุกภาพ รวม 5,470,110 ไบต์; root ใช้ entry build ที่ตรวจแล้ว และ www 308 คง path/query
- Google/email capabilities ยังพร้อม และ paymentMode sandbox; บริการเดิม caddy/cloudflared/cron active, HTTPS muaysart 200 และ protected container IDs/start times ตรงก่อนทำงาน
- จุด activation สุดท้าย: `shared/backups/activation-20261019-catalogue-v2-r2-20261019T142030Z-295351`
- สำรองเต็มหลังจบ: `shared/backups/daily/20261019T212314+0700-297824`; สำเนาเข้ารหัส Windows `C:\Users\game_\MealQBackups\20261019T212314+0700-297824.mealq` ตรวจ SHA/HMAC/decryption ผ่าน
