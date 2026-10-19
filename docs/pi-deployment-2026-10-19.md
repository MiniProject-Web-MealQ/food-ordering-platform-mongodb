# MealQ บน Pi — 19 ตุลาคม 2026

ค่าที่อยู่เครื่องและตำแหน่งสำรองจริงเก็บไว้ในเอกสารส่วนตัวของผู้ดูแล ตัวแปร `${MEALQ_SSH_HOST}`, `${MEALQ_SSH_USER}`, `${MEALQ_APP_ROOT}` และ `${MEALQ_BACKUP_ROOT}` ในเอกสารนี้เป็นตำแหน่งแทนค่า ผู้ดูแลต้องกำหนดให้ตรงกับเครื่องและโฟลเดอร์ของตนก่อนใช้คำสั่ง

## ตำแหน่งและขอบเขต

- SSH: ${MEALQ_SSH_USER}@${MEALQ_SSH_HOST} (Tailscale)
- LAN: ${MEALQ_SSH_HOST} (เมื่อเชื่อมต่อผ่าน LAN)
- Release ล่าสุด: ${MEALQ_APP_ROOT}/releases/20261020-merchant-notifications
- Current symlink: ${MEALQ_APP_ROOT}/current
- Compose project mealq: รุ่น Merchant Notifications เปลี่ยนเฉพาะ web โดยคง API รุ่น Inventory Required; MongoDB, Tunnel และ volume mealq_db_data ไม่ถูกเปลี่ยน
- เว็บรับเฉพาะ loopback localhost:8088 จาก Tunnel ไม่มีการเปิด API/MongoDB บน public port
- Environment/private VAPID keys ไม่รวมใน source archive และไม่แสดงใน log
- Compose project mealq-tunnel แยกจาก system cloudflared และโปรเจคอื่น ใช้ token file สิทธิ์ 600
- Caddy ของเว็บอื่นและ port forwarding 80/443 ไม่ถูกเปลี่ยน

## สำรองและ rollback

ไฟล์ใน ${MEALQ_APP_ROOT}/shared/backups/:

- mealq-before-20261019.archive.gz: mongodump ก่อนขึ้นรุ่นใหม่
- backend-before-20261019.env: environment เดิม (ส่วนตัว)
- containers-before-20261019.json: metadata ของ container ก่อนเปลี่ยน (ส่วนตัว)

เก็บ images mealq-api:before-20261019 และ mealq-web:before-20261019 สำหรับ rollback โดยใช้ compose เดิมและ MEALQ_RELEASE=before-20261019 หลังคืน environment เดิม ไม่ต้องลบ volume หรือ restore DB เพื่อ rollback โค้ด เพราะ schema ที่เพิ่มรองรับข้อมูลเก่า ห้ามใช้ compose down -v

รุ่นปัจจุบัน pin API image เป็น `mealq-api:20261020-inventory-required` และ web เป็น `mealq-web:20261020-merchant-notifications` แยกกันใน Compose ของ release นี้ คำสั่งเริ่ม API/web ที่ build ไว้แล้ว โดยไม่เปลี่ยน DB:

```sh
docker compose -p mealq --env-file ${MEALQ_APP_ROOT}/shared/compose.env -f ${MEALQ_APP_ROOT}/current/deploy/compose.yaml up -d --no-deps --no-build --wait api web
```

## Domain/Tunnel

โดเมนจดกับ Z.com และเลือกย้าย DNS ไป Cloudflare เพื่อรองรับ Public IP เปลี่ยน ชื่อ Name server ที่บัญชีนี้ได้รับคือ quinton.ns.cloudflare.com และ tess.ns.cloudflare.com

Tunnel mealq: fdda810f-d868-4378-9a48-887d21464b60

- Root DNS: CNAME @ -> fdda810f-d868-4378-9a48-887d21464b60.cfargotunnel.com, Proxied
- www DNS: CNAME www -> mealq.site, Proxied
- Published applications: mealq.site และ www.mealq.site -> http://localhost:8088, Path ว่าง
- แยก Tunnel จาก food-ordering-pi เดิม ไม่ต้องพึ่ง A record ของ Public IP
- ค่า TRUST_PROXY_HOPS=2 ใช้กับ cloudflared -> nginx -> API สำหรับการจำกัด OTP ต่อ IP ลูกค้า

Google Client ที่ใช้กับ localhost ต้องเพิ่ม Authorized redirect URI: https://mealq.site/api/v1/auth/google/callback และ origin https://mealq.site ใน Google Console คง localhost ไว้ทดสอบได้ ไม่ต้องสร้าง Client Secret ใหม่

## ตรวจหลังอัปเดต

API/web health ผ่าน, SMTP authentication ผ่าน, capabilities แสดง Google/email พร้อม และ paymentMode sandbox / Wallet + PromptPay พร้อม demo topup เว็บ muaysart.com ตอบ 200 และ container เดิมไม่ถูก recreate system cloudflared เดิมยัง active

การตรวจ HTTPS ของโดเมนจริงและ route www ต้องทำหลัง DNS/Tunnel route และใบรับรอง Cloudflare พร้อมแล้ว

## ผลตรวจโดเมนจริงและสิ่งที่ยังรอ

- Name server ภายนอกเปลี่ยนเป็น Cloudflare แล้ว และผู้ใช้เปลี่ยน root DNS เป็น CNAME ของ Tunnel โดยเปิด Proxied
- HTTPS https://mealq.site/api/v1/health ผ่าน TLS ปกติ ตอบ 200 ผ่าน Cloudflare จาก Pi และเครื่องผู้ใช้
- ต่อมาทดสอบ root ด้วย DNS ปกติ: Pi ประมาณ 0.23 วินาที และเครื่องผู้ใช้ประมาณ 0.19 วินาที ตอบ 200
- ผู้ใช้ยืนยัน Google Login ผ่าน https://mealq.site/ สำเร็จแล้ว
- ผู้ใช้เพิ่ม Tunnel route www แล้ว ตรวจ HTTPS จากเครื่อง Windows ได้ 308 ไป https://mealq.site โดยคง path/query และ root ตอบ 200 หลังขึ้นรุ่น acceptance-mail
- การทดสอบ browser บนโดเมนจริงถูก saved origin permission ในแอปปฏิเสธ จึงหยุด browser action หลัง retry ตามคำอนุญาตล่าสุดแล้วยังถูกบล็อก ไม่มีการเปลี่ยน DNS เครื่อง ปิด TLS หรือแก้สิทธิ์ระบบเพื่อข้ามข้อจำกัดนี้
- Gmail จริงผ่านครบ: OTP สมัคร, OTP เปลี่ยนอีเมล และลิงก์รีเซ็ตรหัสผ่าน ผู้ใช้ได้รับ HTML ใหม่และตั้งรหัสทดสอบสำเร็จ ตรวจ server session version เพิ่มเป็น 2 และ reset token ถูกล้าง ใช้ Gmail alias ของบัญชีทดสอบแยกจาก Google Login หลัก
- Web Push จริงบน Chrome คอมพิวเตอร์: FCM รับ HTTP 201 เมื่อ 19:08:49; ผู้ใช้ยืนยันว่าเห็นแจ้งเตือนขณะปิดแท็บ MealQ และกดแล้วเปิด MealQ สำเร็จ ในการทดสอบรอบนั้นยังไม่รวมมือถือ; ผล Apple Home Screen รอบใหม่อยู่ด้านล่าง

## ตรวจรุ่น acceptance-mail

- สำรองก่อนเปลี่ยน: daily/20261019T190311+0700-222496 และ shared/backups/activation-20261019T120312Z เก็บ compose.env เดิมและ current symlink เดิม
- API/web ใหม่ healthy; ID ของ MongoDB และ muaysart-site-web-1 ตรงก่อนเปลี่ยน; Caddy/system cloudflared เดิม active; https://muaysart.com/ ตอบ 200
- ทดสอบ image ใหม่บน Pi: Backend unit 47 ผ่าน/ข้าม 1 และ Web Push แบบจำลอง 11 กลุ่มผ่าน เก็บ container ทดสอบและ archive ฐานทดสอบก่อน cleanup ไว้ใน shared/backups/release-verification-20261019-acceptance-mail
- หน้าตาอีเมล HTML ครบสมัคร/เปลี่ยนอีเมล/รีเซ็ตรหัสผ่าน พร้อม text fallback; Web Push มี receipt ป้องกันส่งซ้ำไปอุปกรณ์ที่รับสำเร็จแล้ว และผูกอุปกรณ์กับบัญชีปัจจุบันเมื่อกลับเข้าเว็บ
- ทดสอบ production workflow และบัญชี Demo ดู [live acceptance](live-acceptance-2026-10-19.md); สำรองรายวันและสำเนานอก Pi ดู [backups](backups-2026-10-19.md)

## ตรวจรุ่น notifications

- ขึ้นรุ่น `20261019-notifications` สำเร็จบน Pi แล้ว API/web healthy โดยเก็บประวัติรุ่น `acceptance-mail` ด้านบนไว้เป็นผลตรวจของรุ่นก่อน
- จุดสำรองก่อน activation: `${MEALQ_APP_ROOT}/shared/backups/activation-20261019T123148Z` ไม่เขียนทับจุด rollback เดิม
- ทดสอบ image บน Pi: Backend unit **55 ผ่าน/ข้าม 1**, Push จำลอง **11 กลุ่มผ่าน**, อีเมลออเดอร์ผ่าน Express routes และ SMTP จำลอง **16 กลุ่มผ่าน** ใช้ฐานสุ่มและเก็บ archive ก่อน cleanup ไม่มีการส่งอีเมลออกภายนอกจาก automated tests
- Frontend **26 tests ผ่าน**, lint และ production build ผ่าน
- เพิ่มแจ้งเตือนสำหรับเจ้าของร้าน พร้อม inbox/ลิงก์รายละเอียดออเดอร์ตามบทบาท และตัวเลือกอีเมลสำหรับลูกค้า/เจ้าของร้านซึ่งเริ่มต้นปิด ต้องเป็นอีเมลที่ยืนยันแล้วและผู้ใช้เปิดรับเอง
- อีเมลออเดอร์ใช้ durable outbox และ journal/marker ที่ผูกกับการเปลี่ยนสถานะ กู้คิวที่ตกค้างเกิน 24 ชั่วโมงได้ คงเวลาของ event เดิม ตรวจ opt-in generation/อีเมล/สิทธิ์อีกครั้งก่อนส่ง มี lease/backoff และหยุดหลัง 5 ครั้ง รายละเอียดและข้อจำกัด SMTP ดู [order notifications](order-notifications-2026-10-19.md)
- อีเมล OTP มีปุ่ม “เปิดหน้าคัดลอกรหัส” แล้วกดคัดลอกในหน้าเว็บโดยผู้ใช้เอง ส่งเฉพาะรหัส 6 หลักใน fragment และล้าง URL หลังอ่าน ไม่มีการยืนยันบัญชีอัตโนมัติ ไม่บันทึก OTP ใน storage หรือส่งผ่าน API ของหน้าคัดลอก
- เพิ่มส่วนรองรับมือถือ/PWA และคำแนะนำติดตั้ง/อนุญาตแจ้งเตือนตามแพลตฟอร์ม **Apple Home Screen web app ผ่านบนอุปกรณ์จริงที่ผู้ใช้ทดสอบแล้ว**: ติดตั้งจาก Safari, เปิดจาก Home Screen, เข้าสู่ระบบและอนุญาตแจ้งเตือน จากนั้นส่งทดสอบเพียง 1 ครั้ง Apple Push รับ HTTP 201 เวลา **19:37:50.014 น. (12:37:50.014 UTC)** ผู้ใช้ยืนยันว่าเห็นขณะปิดแอปและแตะแล้วเปิด MealQ ได้ ผลนี้แยกจาก Chrome คอมพิวเตอร์ที่ผ่านก่อนหน้า และยังไม่ครอบคลุม Android เครื่องจริง
- **SMTP จริงยอมรับอีเมลออเดอร์ครบ 4 ฉบับใน attempt แรก และผู้ใช้ยืนยันได้รับครบทั้งสองบทบาทใน Gmail พร้อมยืนยันว่ารูปแบบอีเมลเรียบร้อยแล้ว** หลัง deploy เมื่อประมาณ 19:35 น. (12:35 UTC) โดยใช้เฉพาะ Gmail plus-alias ที่อนุญาตผ่าน runtime allowlist: ลูกค้ารับออเดอร์/ยกเลิก และเจ้าของร้านรับออเดอร์ใหม่/ลูกค้ายกเลิก เก็บผล SMTP กับคำยืนยัน inbox receipt แยกกัน ไม่เปิดเผยอีเมลส่วนตัว รหัสผ่าน หรือ endpoint
- สำรองก่อน live email acceptance: `shared/backups/mealq-order-email-20261019T123502Z.archive.gz`; fixture store `6ad60e795d281159f35e92f7`, order `6ad60e795d281159f35e92fa` ภายใต้ชื่อ `DEMO Email Acceptance 20261019t123504z-b7c241` เก็บ credential ไฟล์ส่วนตัวที่ `shared/demo-credentials-order-email-20261019T123502Z.json` ไม่ใส่อีเมลส่วนตัวหรือรหัสผ่านในเอกสาร tracked
- ปิดรับอีเมลเฉพาะสองบัญชี mail fixture หลังผู้ใช้ยืนยัน โดย PATCH ผ่าน API ที่ยืนยันตัวตนและ GET ตรวจซ้ำแล้ว ร้าน fixture ปิดอยู่ และแอดมินชั่วคราวถูกระงับ บัญชี Google หลักไม่อยู่ในขอบเขต cleanup นี้

## รุ่นปัจจุบัน notifications-r2

- `20261019-notifications-r2` active และตรวจสำเร็จเวลา **19:39:17 น.** จุดสำรองก่อนเปลี่ยนคือ `shared/backups/activation-20261019T123905Z`
- เปลี่ยนเฉพาะ web MIME สำหรับ `/manifest.webmanifest` ซึ่ง origin ตอบ **200 `application/manifest+json`** แล้ว API ใช้ image เดิมผ่าน alias และ API container ไม่ถูกสร้างใหม่ MongoDB, Tunnel และโปรเจค muaysart ไม่ถูกเปลี่ยน
- ผลจริง Gmail ครบทั้งสองบทบาท, Chrome คอมพิวเตอร์ และ Apple Home Screen ด้านบนยังคงเป็นผลที่ยืนยันจากรอบ notifications ก่อน web MIME patch ส่วน Android เครื่องจริงยังไม่ทดสอบ

ตามข้อกำหนดล่าสุดของผู้ใช้ ต้องสำรองก่อนลบไฟล์ทุกครั้งและก่อนแก้ส่วนที่เสี่ยง Script activate-pi.sh จึงปฏิเสธการรันซ้ำหากมี backup รุ่นแรกแล้ว เพื่อไม่ให้เขียนทับจุด rollback

## รุ่นคูปองและแจ้งเตือนแบบขยาย

- `20261019-coupons-notifications` active เมื่อประมาณ 20:35 น. หลังทดสอบ native ARM image ก่อนสลับ API/web ด้วย `--no-deps` รายละเอียดฟีเจอร์ใน [coupons and notifications](coupons-notifications-2026-10-19.md)
- สำรอง source ก่อนแก้ที่ Windows: `${MEALQ_BACKUP_ROOT}/source-before-coupons-notifications-20261019T131610Z` (495 files; ไม่รวม env)
- จุด rollback/หลักฐาน: `shared/backups/activation-20261019-coupons-notifications-20261019T133251Z-269073` เก็บ compose/backend env เดิม, current target, metadata/images และ log ก่อน/หลัง ไม่ลบ releases/images เดิม
- สำรองเต็มก่อน activation: `shared/backups/daily/20261019T203428+0700-270713` ตรวจ COMPLETE, SHA256SUMS และ package hash ผ่าน
- Frontend **62 tests ผ่าน**, ESLint และ production build ผ่าน; Backend unit **59 ผ่าน/ข้าม 1** ทั้ง Windows และ image บน Pi; coupon HTTP/Mongo integration **11 กลุ่ม**, order-email **16 กลุ่ม**, Web Push จำลอง **11 กลุ่ม** ผ่าน ฐานทดสอบสุ่มทุกฐานมี archive พร้อม indexes ที่ตรวจแล้วก่อน drop ไม่มีการส่งข้อความจริง
- ตรวจ production หลังสลับ: HTTPS root/new entry asset 200, health ok/database connected, www 308 คง path/query; Demo customer ล็อกอินแล้ว GET คูปอง/แจ้งเตือน 200 ไม่เก็บคูปองหรือสร้างออเดอร์จริงจาก smoke check
- DB, Tunnel, Caddy proxy, DNS helper และ muaysart container ID/start time ตรงก่อนเปลี่ยน; backend environment เดิมไม่ถูกแก้
- สำรองหลัง deploy: `shared/backups/daily/20261019T203641+0700-272149`; Windows สำเนาเข้ารหัส `${MEALQ_BACKUP_ROOT}/20261019T203641+0700-272149.mealq` ตรวจ decryption/SHA/HMAC ผ่านแล้ว บริการ caddy/cloudflared/cron active และ HTTPS เว็บเดิม 200

## รุ่น catalogue-v2-r2

สร้างชุดร้านใหม่ตามคำสั่งผู้ใช้: 6 ร้าน/48 เมนู/60 ภาพ แทนร้านและบัญชี merchant เดิม โดยสำรองก่อนลบและเก็บ customer/admin/orders/financial history ผ่านการตรวจ HTTPS ทุกภาพพร้อม SHA256 แล้ว รายละเอียดขอบเขตการล้าง จุดสำรองและบัญชีใหม่อยู่ใน [catalogue reset](catalogue-reset-2026-10-19.md) สำรองสุดท้าย `20261019T212314+0700-297824` และสำเนาเข้ารหัสนอก Pi ผ่านการตรวจแล้ว

## รุ่น Home catalogue sync

- ขึ้น `20261019-home-catalogue-sync` ด้วย web-only activation สำเร็จ โดย API image ยังเป็น catalogue-v2-r2; API, MongoDB, Tunnel และ muaysart container ID/start time ตรงก่อนเปลี่ยนทั้งหมด
- หน้า Home ใช้รูปอาหาร แบนเนอร์ โลโก้ หมวดอาหาร จำนวนเมนู และสถานะจาก public API ชุดเดียวกับหน้าลูกค้า รายละเอียดใน [Home catalogue sync](home-catalogue-sync-2026-10-19.md)
- ตรวจ HTTPS เวลา 21:55 น.: root ตรง production build ใหม่ `index-CoGP-lrQ.js`, health/database ผ่าน, www 308 คง path/query, เว็บ muaysart 200 และภาพ WebP ครบ 60 ภาพตรง SHA256 ต้นฉบับรวม 5,470,110 ไบต์
- ขณะตรวจมีร้านที่เพิ่มเข้ามาแล้ว ทำให้ public catalogue เป็น 7 ร้าน/49 เมนู การขึ้นหน้า Home ครั้งนี้ไม่แก้หรือล้างข้อมูลร้าน/เมนู
- Frontend 68 tests, ESLint และ production build ผ่าน ไม่ได้ทดสอบภาพหรือคลิกผ่าน browser เนื่องจากสิทธิ์ origin ที่บันทึกไว้ปฏิเสธการควบคุม
- จุด rollback: `shared/backups/activation-20261019-home-catalogue-sync-20261019T145324Z-311779`; สำรองเต็มก่อนสลับ `20261019T215338+0700-312313` และหลังสลับ `20261019T215520+0700-313416` เก็บ release/image เดิมครบ

## รุ่น Wallet layout

- ขึ้น `20261019-wallet-layout` สำเร็จ โดยสลับเฉพาะ web; API, DB, Tunnel และโปรเจค muaysart มี container ID/start time ตรงก่อนเปลี่ยน
- แก้คอลัมน์คงเหลือในหน้าต่าง Admin Wallet ที่ถูกฟอร์มปรับยอดบีบ: ขยายเฉพาะหน้าต่างนี้, แบ่งสองคอลัมน์เมื่อจอ xl, วางฟอร์มด้านล่างบนจอเล็ก และให้ตารางเลื่อนแนวนอนพร้อมแสดงยอดเงินเต็ม
- DataList และ MerchantDialog มีตัวเลือกสำหรับ Wallet โดยค่าเริ่มต้นของหน้าอื่นคงเดิม ไม่มีการเปลี่ยนการคำนวณเงินหรือ API
- สำรอง source ก่อนแก้: `${MEALQ_BACKUP_ROOT}/source-before-wallet-layout-20261019T221612`; จุด rollback: `shared/backups/activation-20261019-wallet-layout-20261019T151849Z-324409`
- Frontend 68 tests, lint และ build ผ่าน ตรวจ HTTPS `/admin/wallets`, root, JS/CSS และ Wallet chunk ตรง SHA256 ของ build, API/DB healthy และเว็บ muaysart 200 ไม่ได้ตรวจหน้าจอผ่าน browser เพราะ saved origin permission ยังปฏิเสธการควบคุม
- สำรองเต็มก่อนสลับ `20261019T221913+0700-324936` และหลังสลับ `20261019T222018+0700-325754`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว

## รุ่น Wallet layout r2

- ผู้ใช้ส่งภาพที่ยังเห็นคอลัมน์คงเหลือถูกตัด จึงตรวจต่อพบว่า server มี JS/CSS รุ่นใหม่ครบ แต่ภาพไม่สอดคล้องกับคลาสของรุ่นนั้น และ HTML ยังไม่มี Cache-Control จึงยังยืนยันเวอร์ชันที่แท็บผู้ใช้รันจริงไม่ได้
- รุ่น `20261019-wallet-layout-r2` แสดงตารางเต็มความกว้าง วางฟอร์มปรับยอดไว้ด้านล่างทุกขนาดจอ และคงการเลื่อนตาราง/ยอดเงินไม่ตัดบรรทัด เพิ่ม `Cache-Control: no-store, max-age=0` เฉพาะ HTML entry เพื่อให้การเปิดหน้าใหม่ตรวจรุ่นล่าสุด ส่วน assets ที่มีชื่อ hash ยังคง immutable
- lint/build และ nginx config test ผ่าน ตรวจ HTTPS ทั้ง `/`, `/index.html`, `/admin/wallets`, URL ที่มี `user=` และลิงก์รุ่น `?v=20261019-wallet-layout-r2` ได้ header no-store กับ entry `index-C1RwXVLB.js` ตรง build, Wallet chunk `Wallets-EmHqS4tJ.js` เป็น layout เต็มความกว้างและทุก asset ที่ตรวจตรง SHA256
- API/DB healthy; API, DB, Tunnel และ muaysart container ID/start time ตรงก่อนสลับ เว็บ muaysart ตอบ 200 ไม่มีการแก้ยอดเงินหรือฐานข้อมูลจากขั้นตอนนี้ และไม่ได้ควบคุม browser ที่ถูกปฏิเสธสิทธิ์
- สำรอง source: `${MEALQ_BACKUP_ROOT}/source-before-wallet-layout-r2-20261019T223747`; จุด rollback: `shared/backups/activation-20261019-wallet-layout-r2-20261019T153901Z-334481`
- สำรองเต็มก่อนสลับ `20261019T223917+0700-335020` และหลังสลับ `20261019T224014+0700-335789`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว

## รุ่น Login motion

- ขึ้น web-only release `20261019-auth-motion` สำเร็จ ลบการ์ดคิวตัวอย่างร้านป้าแดง/#18/เวลารอออกจาก AuthShowcase แล้ว ใช้ภาพอาหาร 3 เมนูแทน พร้อมปุ่มเลือกเมนูที่ใช้คีย์บอร์ดได้, parallax จำกัดระยะ, ภาพลอย, reveal และปุ่มหยุดภาพเคลื่อนไหว
- เพิ่มแถบเลือกบทบาทแบบเลื่อน ไอคอนลูกค้า/ร้านค้า, focus glow, ปุ่ม submit/Google ตอบสนองเมื่อชี้หรือกด และภาพประกอบขนาดเล็กบนมือถือ โดยคง request, validation, role, session และ OAuth flow เดิม
- เคารพ prefers-reduced-motion, หยุด animation เมื่อแท็บซ่อน, จัดภาพตามความสูงจอและให้ aside เลื่อนเมื่อเนื้อหายาว ภาพใช้ lazy loading และ URL เวอร์ชันเดิมเพื่อหลีกเลี่ยง cache ภาพเก่า
- Frontend 68 tests, ESLint และ build ผ่าน; nginx config test ผ่าน ตรวจ HTTPS `/login`, URL รุ่นใหม่, `/register`, `/forgot-password` ได้ no-store HTML ตรง build, JS/CSS/dependency 25 assets และรูป 5 ภาพตรง SHA256; Google/email capabilities ยังพร้อม และ API/DB healthy ไม่ได้ควบคุม browser ที่ปฏิเสธสิทธิ์จึงไม่อ้างว่าได้ตรวจภาพหรือคลิกบนอุปกรณ์จริง
- API, DB, Tunnel และ muaysart container ID/start time ตรงก่อนเปลี่ยน เว็บ muaysart 200 ไม่มีการเปลี่ยนข้อมูลบัญชีหรือส่งอีเมล/Push ทดสอบจริง
- สำรอง source ก่อนแก้: `${MEALQ_BACKUP_ROOT}/source-before-login-motion-20261019T225923`; rollback: `shared/backups/activation-20261019-auth-motion-20261019T160740Z-348616`
- สำรองเต็มก่อนสลับ `20261019T230756+0700-349149` และหลังสลับ `20261019T230857+0700-349906`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว

## รุ่น Random experience

- ขึ้น web-only release `20261019-random-experience` สำเร็จเวลาประมาณ 23:29 น. ออกแบบ `/customer/random` ใหม่เป็นเวทีโทนดำ/ทองแดง ใช้ภาพอาหารจริงบนจานแบบ perspective, รูปเมนูลอย, parallax จำกัดระยะ, แสงประกอบ, Canvas ฝุ่นแสง/กระดาษโปรย และ reveal เมื่อสุ่มเสร็จ
- มีเสียงสังเคราะห์ที่ปิดเป็นค่าเริ่มต้นและเริ่มได้หลังผู้ใช้เลือกเปิดแล้วกดสุ่ม, ปุ่มพักการเคลื่อนไหว, ข้ามเอฟเฟกต์, ประวัติผลสุ่มในหน้านี้ และลิงก์ดูเมนู/ร้านโดยไม่มีการสั่งซื้อหรือหักเงินอัตโนมัติ
- แยกตัวกรองที่ตรวจ store/identity/price, งบตามราคาสูงสุดใน catalogue, หมวดพร้อมจำนวนเมนูจริง, เปิดร้าน/ของหมด และไม่ซ้ำประวัติ 7 วัน (ข้ามออเดอร์ยกเลิกและรองรับ ID ทั้งสองแบบ) สุ่มและแสดง reel เฉพาะเมนูที่ตรงเงื่อนไข พร้อมตรวจใหม่เมื่อร้าน/stock เปลี่ยนระหว่าง animation
- เคารพ prefers-reduced-motion ทั้งก่อนและระหว่างสุ่ม, หยุด Canvas/parallax เมื่อซ่อนหรือพ้นจอ, จำกัดอนุภาค/DPR/ภาพ reel และยกเลิก timer/audio เมื่อออกจากหน้า แสดงผลสุดท้ายผ่าน live region โดยไม่อ่านชื่อทุก tick
- Frontend **75 tests**, full ESLint และ production build ผ่าน; controller smoke แบบ mock hooks/timers **10 กรณี** ผ่าน ครอบคลุมกดซ้ำ, ตัวกรอง/reset, skip/cleanup, Reduce Motion ระหว่างสุ่ม, stock/เมนูเปลี่ยน และประวัติใหม่ ผลนี้ไม่ใช่ browser/DOM/ภาพ/เสียงจริง เนื่องจาก saved origin permission ยังปฏิเสธการควบคุม browser
- ตรวจ HTTPS `/customer/random`, URL รุ่นใหม่, `/login`, `/admin/wallets` ได้ no-store HTML ตรง build (`index-CdNMjvgg.js`), Random JS/CSS (`RandomFood-Bu4VgWW4.js`, `RandomFood-BmgHg0ml.css`) พร้อม dependency รวม **22 assets** และตัวอย่างรูปจริง **8 ภาพ** ตรง SHA256; public catalogue ขณะตรวจ 7 ร้าน/49 เมนู, API/DB healthy, Google/email capabilities พร้อม, www 308 คง path/query และ muaysart ตอบ 200
- API, DB, Tunnel และ muaysart container ID/start time ตรงก่อนเปลี่ยน ไม่มีการแก้ฐานข้อมูล/บัญชี สร้างออเดอร์ หรือส่งข้อความจริง ใช้ release/image ใหม่แยกและเก็บรุ่นเก่าทั้งหมด
- สำรอง source ก่อนแก้: `${MEALQ_BACKUP_ROOT}/source-before-random-experience-20261019T231350`; rollback: `shared/backups/activation-20261019-random-experience-20261019T162913Z-359400`
- สำรองเต็มก่อนสลับ `20261019T232931+0700-359958` และหลังสลับ `20261019T233008+0700-360582`; สำเนานอก Pi แบบเข้ารหัส 146,106 ไบต์ผ่าน decryption/SHA/HMAC แล้ว

## รุ่น Random switch fix

- ขึ้น web-only release `20261019-random-switch-fix` สำเร็จประมาณ 23:34 น. หลังผู้ใช้ส่งภาพวงกลมสวิตช์ที่เปิดอยู่เลื่อนหลุดแถบ พบว่า individual `translate` ของ Tailwind ถูกนำไปรวมกับ `transform: translateX(...)` ที่กำหนดเฉพาะหน้า จึงเลื่อนสองครั้ง
- แก้ CSS เฉพาะหน้า Random ให้ใช้ `translate` แหล่งเดียว ระยะเปิด 18px สำหรับ track 43px/thumb 17px/inset ข้างละ 4px และ reset `transform` ไม่เปลี่ยนสถานะตัวกรอง, keyboard หรือสวิตช์หน้าอื่น
- full ESLint และ build ผ่าน; ตรวจ HTTPS HTML no-store, JS/CSS/dependency 22 assets และรูปตัวอย่าง 8 ภาพตรง SHA256, compiled CSS มี checked `translate:18px` และ reset transform, health/database/Google/email พร้อม, www 308 และ muaysart 200 ยังไม่ได้ควบคุม browser ที่ถูกปฏิเสธสิทธิ์จึงไม่อ้างการตรวจภาพจริง
- API, DB, Tunnel และ muaysart container ID/start time ตรงก่อนเปลี่ยน เก็บ release/image ก่อนหน้าและไม่แก้ฐานข้อมูล
- สำรอง source: `${MEALQ_BACKUP_ROOT}/source-before-random-switch-fix-20261019T233205`; rollback: `shared/backups/activation-20261019-random-switch-fix-20261019T163321Z-362206`
- สำรองเต็มก่อนสลับ `20261019T233339+0700-362738` และหลังสลับ `20261019T233427+0700-363463`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว

## รุ่น Random orbit และจำการตั้งค่า

- ขึ้น web-only release `20261019-random-preferences` สำเร็จประมาณ 23:41 น. รูปรอบจานสุ่มลำดับใหม่ตอนเข้าหน้า เปลี่ยนตัวกรอง ระหว่าง reel และหลังได้ผล โดยเลือกเมนูที่ยังตรงตัวกรอง ไม่ซ้ำกันและไม่ซ้ำจานกลาง หากมีตัวเลือกน้อยกว่า 6 จะแสดงเฉพาะจำนวนที่มีจริง
- ใช้ Fisher–Yates sampling ที่ไม่แก้ catalogue, รองรับ alias ของ menu ID และเก็บเฉพาะลำดับ ID เพื่อ resolve ภาพ/ข้อมูลล่าสุด การ render ที่ไม่เกี่ยวกับการสุ่มไม่เปลี่ยนรูปเอง จำกัด reel ไว้ 7 เมนูเพื่อไม่โหลดรูปทั้ง catalogue ทุก tick
- จำหมวด งบ openOnly/hideSoldOut/noRepeat รวมถึงเสียงและ motion บนเบราว์เซอร์เดิมผ่าน localStorage key `mealq.random.preferences.v1` เก็บเฉพาะค่าที่อนุญาตและ schema version ไม่มีบัญชี ประวัติ ออเดอร์ หรือ credentials ตรวจชนิด/หมวด/ช่วงงบตอนคืนค่า รองรับ storage เสีย/ถูกบล็อก/เต็มโดยยังสุ่มได้และแจ้งหากบันทึกไม่ได้ ปุ่ม reset ตัวกรองบันทึกค่าเริ่มต้นด้วย
- Frontend **87 tests**, full ESLint และ production build ผ่าน; controller แบบ mock hooks/timers **15 กรณี** ผ่าน รวม orbit 5 รูป/short pool/เปลี่ยน stock, ความคงที่เมื่อ render, คืนค่าข้าม remount/reset และ storage ถูกบล็อก ไม่มีการควบคุม browser ที่ปฏิเสธสิทธิ์จึงไม่อ้างการตรวจ DOM/ภาพ/เสียงจริง
- HTTPS หน้า Random และ URL รุ่นใหม่ได้ no-store HTML ตรง build (`index-DAfFuPHk.js`), Random chunk `RandomFood-BC28g-ld.js` และ JS/CSS/dependency รวม **22 assets** กับรูปตัวอย่าง **8 ภาพ** ตรง SHA256; API/DB healthy, Google/email พร้อม, www 308 คง path/query และ muaysart 200
- API, DB, Tunnel และ muaysart container ID/start time ตรงก่อนเปลี่ยน ไม่มีการแก้ข้อมูลร้าน บัญชี หรือออเดอร์ และเก็บ release/image เดิมครบ
- สำรองหน้า/docs ก่อนแก้ที่ `${MEALQ_BACKUP_ROOT}/source-before-random-preferences-20261019T233546`; helper/test ก่อนแก้ที่ `output/backups/random-orbit-20261019T233546` พร้อมตรวจ SHA256; rollback: `shared/backups/activation-20261019-random-preferences-20261019T164033Z-366415`
- สำรองเต็มก่อนสลับ `20261019T234052+0700-366942` และหลังสลับ `20261019T234133+0700-367604`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว

## รุ่น Profile แยกเมนูและอีเมลครบขั้นตอน

- ขึ้น `20261019-profile-email` ทั้ง API และ web สำเร็จประมาณ 23:58 น. โดย build/test image ARM บน Pi ก่อนสลับด้วย `--no-deps --no-build --wait` เก็บ release/image เก่าทั้งหมด และมี rollback ทั้งสองบริการ
- หน้า `/customer/profile` เป็นศูนย์รวมเมนูและทางลัด แยกหน้าข้อมูลส่วนตัว (`personal`), อีเมล/ความปลอดภัย (`security`), การใช้งาน/การชำระเงิน (`preferences`) และเมนูแจ้งเตือน (`notifications`) อีกชั้นสำหรับ `email`, `device`, `in-app` แบบ route จริง ไม่ mount ทุกฟอร์มหรือการขอสิทธิ์พร้อมกัน มี breadcrumb, active navigation, direct-link auth guard และ key ตามบัญชีสำหรับเนื้อหา
- ย้ายบันทึกชื่อ/โทรไปหน้าข้อมูลส่วนตัวพร้อมตรวจ input/ป้องกันส่งซ้ำ/แสดงผลหลัง API ยืนยัน, เปลี่ยนอีเมลด้วย OTP ไปหน้า security พร้อมป้องกัน response เก่าหลังเปลี่ยนหน้า/บัญชี และระบุผลของการยกเลิก Google link ตามพฤติกรรม backend เดิม ลบสถิติเวลาที่ประหยัดแบบประมาณการออกจาก hub
- อีเมลลูกค้าครบ `pending → confirmed → preparing → ready → completed` และ `cancelled` เมื่อผู้รับยืนยันอีเมลและเปิดรับไว้แล้ว เนื้อหามีความคืบหน้า 5 ขั้น, เวลาเกิดเหตุการณ์, คำแนะนำและลิงก์เปิดสถานะปัจจุบัน มี HTML/plain text ที่ escape ข้อมูลและ Message-ID คงที่เมื่อ retry
- เพิ่ม watermark สำหรับ confirmed/preparing หลังเปิดรุ่นนี้เพื่อไม่ส่งสถานะใหม่ย้อนหลัง และ outbox predecessor guard ให้เหตุการณ์ของออเดอร์/ผู้รับเดียวกันไม่แซงขั้นที่กำลัง retry โดยออเดอร์อื่นยังส่งได้ เมื่อขั้นก่อนหน้าหมด retry จะเก็บ failed และให้ขั้นถัดไปดำเนินต่อ ไม่เปลี่ยน consent, opt-out, watermark เดิม หรือชุดอีเมลร้านค้า
- Frontend **87 tests**, full ESLint/build และ controller/navigation แบบจำลอง **21 กรณี** ผ่าน; Backend **69 ผ่าน/ข้าม 1** ทั้งเครื่องพัฒนาและ image ARM แบบ network-none; integration จริงของ routes/MongoDB/SMTP ภายในบน Pi **19 กลุ่ม** ผ่าน รวม status เร็ว/เวลาเท่ากัน, retry/concurrent workers, consent, historical cutoff และ journal repair ไม่มีส่งเมล/Push ทดสอบออกภายนอก
- Integration ใช้ฐานสุ่ม `mealq_order_email_6e2bed9a2f6277e5` แยกจาก app DB เก็บทุก document/index เป็น BSON EJSON ตรวจ readback ก่อนลบเฉพาะฐานสุ่ม และตรวจ SHA256 archive เพิ่มบน host ที่ `shared/backups/activation-20261019-profile-email-20261019T165737Z-375121/order-email-verification/mealq-order-email-check-archives/` พร้อมเก็บ container/logs
- HTTPS ตรวจ 11 URLs และ JS/CSS/dependencies **45 assets** ตรง SHA256, HTML no-store และ entry `index-CSKxtui8.js`, auth endpoints ปฏิเสธ anonymous 401, health/database/Google/email พร้อม, www 308 คง path/query และ muaysart 200 ยังไม่ได้ควบคุม browser เนื่องจาก origin permission จึงไม่อ้างการตรวจ DOM/ภาพบนอุปกรณ์จริง
- DB, Tunnel, muaysart container ID/start time และ Caddy/cloudflared/cron/ค่าระบบ DNS ตรงก่อนสลับ backend.env เดิมสิทธิ์ 600 ไม่เปลี่ยน API/web ใช้ image ที่ผ่านทดสอบ ไม่มีการเปลี่ยนบัญชี ออเดอร์ หรือการตั้งค่ารับเมลจริงจาก smoke checks
- สำรองหน้า/routes/nav/docs/components ก่อนแก้: `${MEALQ_BACKUP_ROOT}/source-before-profile-email-20261019T234304`; backend/test ก่อนแก้ `output/backups/profile-email-20261019T234304` และ email form `output/backups/profile-email-form-20261019T234304` พร้อม manifest/SHA; rollback: `shared/backups/activation-20261019-profile-email-20261019T165737Z-375121`
- สำรองเต็มก่อนสลับ `20261019T235825+0700-376315` และหลังสลับ `20261019T235922+0700-377284`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว โค้ดรอบนี้ยังอยู่ใน working tree ไม่มี commit/push ตามคำสั่งผู้ใช้

## รุ่น Random โทนสว่าง

- ขึ้น web-only release `20261020-random-light` สำเร็จประมาณ 00:09 น. วันที่ 20 ตุลาคม 2026 เวลาไทย ปรับ `/customer/random` เป็นพื้นครีม–ขาว จานสีงาช้าง ขอบส้มทอง เงาอุ่น และข้อความน้ำตาลเข้มทั้งเวที ตัวกรอง ปุ่ม ประวัติ และสถานะว่าง/กำลังสุ่ม/ผลลัพธ์
- ปรับอนุภาค Canvas เป็นโทนทอง/น้ำตาลและใช้ normal blending ให้มองเห็นบนพื้นสว่าง เปลี่ยน ToggleSwitch เฉพาะหน้านี้เป็น light พร้อมสี track/focus/ตัวกรองและเส้นงบที่เห็นชัดบนพื้นขาว คง geometry, responsive, keyframes และ reduced motion เดิม
- คงภาพอาหารรอบจานที่สุ่มพร้อมกัน 5 รูป การจำตัวกรอง/เสียง/การเคลื่อนไหว และตรรกะสุ่ม/ประวัติ/stock เดิม ไม่มีการแก้ API หรือข้อมูลบัญชี ร้านค้า และออเดอร์
- Full ESLint และ production build ผ่าน พร้อม controller smoke เดิม **15 กรณี** ตรวจ sampled text contrast และ CSS parse ผ่าน ไม่มี browser/DOM/visual test เนื่องจาก origin permission เดิมไม่อนุญาต จึงไม่อ้างผลตรวจภาพบนอุปกรณ์จริง
- HTTPS Random, URL รุ่นใหม่, Profile/Email, Login และ Admin Wallet ได้ HTML no-store ตรง build (`index-Dfs_xNk4.js`); Random chunk `RandomFood-Cp0loW26.js`/`RandomFood-CGKcoWxp.css` มีธีมสว่าง, JS/CSS/dependencies **23 assets** และรูปเมนู **8 ภาพ** ตรง SHA256; ร้าน 7 ร้าน/49 เมนู, API/DB healthy, Google/email พร้อม, www 308 คง path/query และ muaysart 200
- สคริปต์ตรวจ baseline/overlay SHA256/ขอบเขตไฟล์และ nginx ก่อนเปิดใช้ มี rollback อัตโนมัติ เก็บ release/image/assets เก่าทั้งหมด API, DB, Tunnel และ muaysart มี container ID/start time ตรงก่อนสลับ
- สำรอง source/docs ก่อนแก้ที่ `${MEALQ_BACKUP_ROOT}/source-before-random-light-20261020T000454` และ stage ที่ `output/backups/random-light-stage-20261020T000442` พร้อม manifest/SHA; rollback: `shared/backups/activation-20261020-random-light-20261019T170815Z-381596`
- สำรองเต็มก่อนสลับ `20261020T000846+0700-382217` และหลังสลับ `20261020T000927+0700-382908`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว (148441 bytes) ไม่มี commit/stage/push GitHub ตามคำสั่งผู้ใช้

## รุ่น Mobile Readability และ favicon MealQ

- ขึ้น web-only `20261020-mobile-readability` สำเร็จประมาณ 00:23 น. วันที่ 20 ตุลาคม 2026 เวลาไทย โดยคง API `20261019-profile-email` และไม่แก้ข้อมูลบัญชี ร้านค้า ออเดอร์ หรือการแจ้งเตือน
- หน้า Random เพิ่มขนาดข้อความใช้งานหลักบนมือถือเป็นประมาณ 14–16px, ชื่อเมนูอย่างน้อย 26px, ราคา 18px และข้อความประกอบเวที 14–15px ปรับหมวดเป็น 2 คอลัมน์ ปุ่มดูเมนู/สุ่มอีกจานเรียงเต็มความกว้าง เพิ่มพื้นที่กดตัวกรอง/สวิตช์/ช่วงงบ พร้อมให้ข้อความและส่วนควบคุม wrap บนจอแคบหรือเมื่อขยายตัวอักษร คงธีมสว่าง ภาพรอบจาน การจำค่า เอฟเฟกต์ และ reduced motion เดิม
- หน้า Profile ใช้ native details สำหรับเมนูบัญชีบนมือถือ แสดงหน้าปัจจุบันและปิดเมื่อเปลี่ยน pathname; desktop sidebar เดิมยังอยู่ ซ่อนเมนู/การกระทำที่ซ้ำตาม breakpoint เพิ่ม back link สั้นและแยกคำทักทายกับชื่อยาวให้ wrap ได้
- การ์ดจัดการบัญชีเรียงคอลัมน์เดียวบนจอไม่เกิน 600px สถิติเป็นแถวกระชับ และแยก label/value บนจอไม่เกิน 480px; ข้อความหลัก 15px/คำอธิบายอย่างน้อย 14px, input 16px, พื้นที่กดอย่างน้อย 44px ครอบคลุมหน้าบัญชีย่อย ปรับปุ่ม/link ที่เดิม nowrap/fixed-height ให้ตัดบรรทัดโดยไม่ล้นการ์ด
- เปลี่ยน favicon สีม่วงของ Vite เป็น Q สีขาวบนส้ม `#ffa259` แบบ SVG และ PNG 32×32 พร้อม query version `20261020-mealq` ใน HTML; generator รองรับเลือกขนาด 32 โดยไม่สร้างทับ app icons เดิม ตรวจ SHA256 ยืนยัน 180/192/512, manifest และ push service worker ไม่เปลี่ยน
- Full ESLint, CSS parse และ production build ผ่าน; controller เดิม Random **15 กรณี** และ Profile/navigation **23 กรณี** ผ่าน (React Router จริงร่วมกับ hooks/promises จำลอง) ตรวจ layout จาก source สำหรับช่วงจอ 320–800px และแก้ความเสี่ยงเมื่อขยายข้อความ ไม่มี browser/DOM/ภาพบนมือถือจริงเนื่องจาก origin permission เดิมไม่อนุญาต
- HTTPS **16 routes**, current JS/CSS/fonts/dependencies **177 assets**, favicon **2 แบบ** และรูปเมนู **8 ภาพ** ผ่าน MIME/SHA256 และ HTML no-store ตรง build `index-DY88BNG0.js`; Random `RandomFood-B0073vq4.js`/`RandomFood-Dhs6Ouj2.css`, Profile CSS `CustomerProfileLayout-CJVJC65A.css` ตรง build ตรวจ API/DB healthy, Google/email พร้อม, protected endpoints 401, www 308 คง path/query และ muaysart 200
- API, DB, Tunnel และ muaysart มี container ID/start time ตรงก่อนสลับ เก็บ release/image/assets เดิมและจุด rollback `shared/backups/activation-20261020-mobile-readability-20261019T172203Z-388883`
- สำรอง source/docs ที่ `${MEALQ_BACKUP_ROOT}/source-before-mobile-readability-20261020T001339` และ favicon ที่ `${MEALQ_BACKUP_ROOT}/source-before-mealq-favicon-20261020T001721`; สำรองแยกก่อนแก้พร้อม manifest/SHA ที่ `output/backups/mobile-profile-20261020T001332` และ `output/backups/mobile-favicon-20261019T171753209Z`
- สำรองเต็มก่อนสลับ `20261020T002226+0700-389456` และหลังสลับ `20261020T002318+0700-390209`; สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว (153195 bytes) ไม่มี stage/commit/push GitHub ตามคำสั่งผู้ใช้

## รุ่น Inventory Required และตรวจวัตถุดิบก่อนชำระเงิน

- ขึ้น API/web `20261020-inventory-required` สำเร็จประมาณ 00:48 น. วันที่ 20 ตุลาคม 2026 เวลาไทย โดยเก็บ release/images/assets เดิมทั้งหมดและไม่เปลี่ยน DB/Tunnel/โปรเจคอื่น
- ตรวจข้อมูลจริงแบบอ่านอย่างเดียวพบว่าร้าน “สมชาย ทดสอบ” มีเมนูข้าวผัดไก่และหมูกะทะที่ `ingredients=[]` จึงไม่มี stock requirements ให้หัก ส่วนเมนูที่ผูกสูตรโควตาจำลองเดิมตัดและคืนสต็อกได้ตามออเดอร์ ไม่ได้แก้สูตร หน่วย ปริมาณ หรือหักย้อนหลังให้ข้อมูลจริง เพราะยังไม่มีปริมาณต่อจานที่ร้านยืนยัน
- การเพิ่มเมนูผ่าน UI/API ต้องมีส่วนผสมอย่างน้อย 1 รายการ แม้ยังไม่เปิดขาย การส่งสูตรว่างใน PATCH ถูกปฏิเสธ ตรวจวัตถุดิบให้เป็นของร้าน เปิดใช้งาน หน่วยตรงกัน ไม่ซ้ำ และปริมาณต่อจานตั้งแต่ 0.000001 ขึ้นไป การแก้รายละเอียดอื่นผ่าน partial PATCH ยังคงใช้ได้
- หน้า Inventory แสดงเมนูที่ยังไม่ผูกสูตรพร้อมลิงก์แก้ไข แสดงการใช้วัตถุดิบต่อจานและคำเตือนหน่วยตัวเลขโดยไม่แปลงให้เอง จำนวนสต็อกแสดงได้ 6 ตำแหน่ง รีเฟรชเมื่อออเดอร์เปลี่ยน กลับเข้าแท็บ ทุก 15 วินาที และกดอัปเดตเอง พร้อมป้องกัน response เก่าทับข้อมูลใหม่และคงสูตรที่ยังไม่ได้บันทึก
- แก้ payload แก้ไขเมนูให้ละ image ที่ไม่เปลี่ยน จึงผูกสูตรของเมนูที่มีรูป catalogue เดิมได้โดยไม่ติด validation รูปที่ไม่เกี่ยวข้อง การเปลี่ยนหรือลบรูปยังส่งให้ backend ตรวจตามเดิม
- เพิ่ม customer-auth `POST /api/v1/orders/check-stock` ตรวจทั้งตะกร้า รวมวัตถุดิบที่ใช้ร่วมกันและจำนวนจาน ก่อนส่งออเดอร์หรือหัก Wallet ไม่มีการจองสต็อก สร้างออเดอร์ หรือใช้คูปองจาก preflight เมื่อไม่พอหรือยังไม่มีสูตรตอบ 409 พร้อมชื่อเมนูที่ต้องแก้ โดยไม่เปิดเผยจำนวนวัตถุดิบภายในร้าน
- การยืนยันออเดอร์ตรวจซ้ำและใช้ atomic reservation ก่อนหักเงินเพื่อป้องกันการขายเกินหากสต็อกเปลี่ยนหลัง preflight เมนูเก่าที่ไม่มีสูตรรับออเดอร์ใหม่ไม่ได้จนกว่าร้านบันทึกสูตรจริง การยกเลิกคืนสต็อกครั้งเดียวและออเดอร์รับอาหารแล้วคงยอดหักเดิม
- คำขอที่เคยส่งแล้วจะตรวจคืนผลด้วย key/body/ยอดเดิมก่อนตรวจ stock/coupon ใหม่ รวมกรณีคำขอ key เดียวกันสร้างออเดอร์ระหว่างตรวจสต็อก จึงไม่แสดงขาดสต็อกผิดจนทิ้งข้อมูล recovery และไม่ตัดซ้ำ
- Frontend **111 tests**, full ESLint และ production build ผ่าน; Backend **82 ผ่าน/ข้าม 1** ทั้งเครื่องพัฒนาและ image ARM แบบ network-none; integration ผ่าน routes/MongoDB จริง **7 กลุ่ม** รวมเศษทศนิยม, วัตถุดิบร่วม, หน่วย/เจ้าของ, legacy recipe, สต็อกเปลี่ยน, pickup, ยกเลิกซ้ำ, Wallet/PromptPay demo และสั่งแย่งวัตถุดิบสุดท้าย ไม่มีส่งอีเมลหรือ Push ออกภายนอก
- Integration ใช้ฐานสุ่ม `mealq_inventory_required_9c5bfbf130897339` เก็บทุก document/index เป็น BSON EJSON ตรวจ readback ก่อนลบเฉพาะฐานทดสอบ และตรวจ SHA256 archive บน host ที่ `shared/backups/activation-20261020-inventory-required-20261019T174632Z-401180/inventory-verification/mealq-inventory-check-archives/` เก็บ container และ logs ทดสอบไว้
- HTTPS **25 routes**, current assets **179**, favicon **2 แบบ** และรูปเมนู **8 ภาพ** ตรง SHA256 กับ build `index-_JPBsw4p.js`; preflight/inventory/menu endpoints ปฏิเสธ anonymous 401, API/DB/Google/email พร้อม, www 308 คง path/query และ muaysart 200 ไม่มี browser/DOM/visual test เนื่องจาก origin permission เดิมไม่อนุญาต
- DB, Tunnel, muaysart container ID/start time และ Caddy/cloudflared/cron/DNS ตรงก่อนสลับ backend.env เดิมสิทธิ์ 600 ไม่เปลี่ยน จุด rollback `shared/backups/activation-20261020-inventory-required-20261019T174632Z-401180` คืน API/web ไป baseline Mobile Readability/Profile Email พร้อมกัน
- สำรอง source เดิมที่ `${MEALQ_BACKUP_ROOT}/source-before-inventory-guidance-20261020T003101` และแยกก่อนแก้พร้อม SHA256 ใต้ `output/backups/inventory-*`, `required-menu-recipes-*`, `checkout-stock-replay-race-*`; สำรองเต็มก่อนสลับ `20261020T004719+0700-402391` และหลังสลับ `20261020T004754+0700-403185` สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว (155442 bytes) ไม่มี stage/commit/push GitHub

## รุ่นแยกหน้าแจ้งเตือนร้านค้า

- ขึ้น web-only `20261020-merchant-notifications` สำเร็จประมาณ 00:59 น. วันที่ 20 ตุลาคม 2026 เวลาไทย คง API `20261020-inventory-required` และข้อมูล/การตั้งค่าแจ้งเตือนเดิม
- เพิ่มหน้ารวม `/merchant/notifications` พร้อมช่องทางแยก `/merchant/notifications/in-app`, `/merchant/notifications/email` และ `/merchant/notifications/device` แต่ละหน้าติดตั้งเฉพาะ inbox, email settings หรือ Web Push ของตัวเอง หน้ารวมไม่เรียกโหลดการตั้งค่าของทุกช่องทางพร้อมกัน
- ย้าย inbox/email/push ออกจาก Settings เหลือข้อมูลร้านและลิงก์ไปหน้ารวม ปรับปุ่มกระดิ่งบน sidebar/mobile ให้เปิดหน้ารวมและแสดงสถานะ active ลิงก์เก่า `/merchant/settings#merchant-notifications` redirect แบบ replace ไปหน้ารวมใหม่โดยคง query ส่วนลิงก์ดูรายละเอียดออเดอร์ยังใช้เส้นทางร้านค้าเดิม
- หน้ารวมมีการ์ดเลือกช่องทาง Desktop มีเมนูช่องทาง ส่วนมือถือใช้ native details ที่ปิดเมื่อเปลี่ยนหน้า ข้อความหลัก 15–16px คำอธิบายอย่างน้อย 14px พื้นที่กด 44px และกล่องข้อความใช้การเลื่อนหน้าหลัก เปลี่ยนคำแนะนำติดตั้ง iPhone ให้ชี้เมนูใหม่
- คงสิทธิ์เจ้าของร้านตาม `session.accountRole` บัญชีพนักงานที่เปิด URL ตรงจะเห็นคำแนะนำและไม่ mount outlet จึงไม่โหลด inbox/ตั้งค่าแทนเจ้าของร้าน ไม่เพิ่ม API หรือเปลี่ยน consent เหตุการณ์ร้านค้ายังคงออเดอร์ใหม่ การยกเลิกโดยลูกค้า และการรับอาหาร
- ป้องกัน response เก่าหลังออกจากหน้า/เปลี่ยนบัญชี และให้การโหลดใหม่รอการเปิด–ปิดอุปกรณ์หรือบันทึกอีเมลที่ยังทำงานอยู่ก่อนอ่านสถานะจริง การขอสิทธิ์อุปกรณ์ยังเริ่มตรงจากการกดของผู้ใช้ ไม่มี silent permission prompt หรือสร้าง subscription ตอนเปิดหน้าใหม่ ไม่เปลี่ยน logout/provider/backend
- Frontend **119 tests**, full ESLint และ production build ผ่าน; controller/source/React Router simulation **11 กรณี** ผ่าน รวม legacy redirect, auth destination, staff guard, owner remount และการแยก control ของแต่ละช่องทาง มี lifecycle ใหม่ **8 กรณี** ใช้ browser/API จำลอง ไม่มีส่งอีเมลหรือ Push จริงจากการทดสอบนี้
- HTTPS **32 routes**, current assets **187**, favicon **2 แบบ** และรูปเมนู **8 ภาพ** ตรง SHA256 กับ build `index-CQdfVAv9.js`; API แจ้งเตือน/Push/Inventory และ profile ปฏิเสธ anonymous 401, health/DB/Google/email พร้อม, www 308 คง path/query และ muaysart 200 ไม่มี browser/DOM/visual test เพราะ origin permission เดิมไม่อนุญาต
- API/DB/Tunnel/muaysart container ID/start time และ host services/Caddy/DNS ตรงก่อนสลับ เก็บ release/images/assets เดิมทั้งหมด จุด rollback `shared/backups/activation-20261020-merchant-notifications-20261019T175813Z-408135`
- สำรอง source/routes/nav/docs ก่อนแก้พร้อม manifest/SHA ที่ `${MEALQ_BACKUP_ROOT}/source-before-merchant-notifications-20261020T0051` และ shared controls ที่ `output/backups/notification-settings-lifecycle-20261020T005418` รวม guide/scoped CSS ใต้ `output/backups/merchant-notification-*` สำรองเต็มก่อนสลับ `20261020T005839+0700-408704` และหลังสลับ `20261020T005918+0700-409370` สำเนานอก Pi แบบเข้ารหัสผ่าน decryption/SHA/HMAC แล้ว (158086 bytes) ไม่มี stage/commit/push GitHub
