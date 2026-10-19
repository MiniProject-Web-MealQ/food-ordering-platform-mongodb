# MealQ บน Pi — 19 ตุลาคม 2026

## ตำแหน่งและขอบเขต

- SSH: linapspi4@100.112.221.80 (Tailscale)
- LAN: 192.168.1.121
- Release ล่าสุด: /home/linapspi4/mealq-app/releases/20261019-home-catalogue-sync
- Current symlink: /home/linapspi4/mealq-app/current
- Compose project mealq: รุ่นคูปองอัปเดตเฉพาะ API และ web; MongoDB, Tunnel และ volume mealq_db_data ไม่ถูกเปลี่ยน
- เว็บรับเฉพาะ loopback 127.0.0.1:8088 จาก Tunnel ไม่มีการเปิด API/MongoDB บน public port
- Environment/private VAPID keys ไม่รวมใน source archive และไม่แสดงใน log
- Compose project mealq-tunnel แยกจาก system cloudflared และโปรเจคอื่น ใช้ token file สิทธิ์ 600
- Caddy ของเว็บอื่นและ port forwarding 80/443 ไม่ถูกเปลี่ยน

## สำรองและ rollback

ไฟล์ใน /home/linapspi4/mealq-app/shared/backups/:

- mealq-before-20261019.archive.gz: mongodump ก่อนขึ้นรุ่นใหม่
- backend-before-20261019.env: environment เดิม (ส่วนตัว)
- containers-before-20261019.json: metadata ของ container ก่อนเปลี่ยน (ส่วนตัว)

เก็บ images mealq-api:before-20261019 และ mealq-web:before-20261019 สำหรับ rollback โดยใช้ compose เดิมและ MEALQ_RELEASE=before-20261019 หลังคืน environment เดิม ไม่ต้องลบ volume หรือ restore DB เพื่อ rollback โค้ด เพราะ schema ที่เพิ่มรองรับข้อมูลเก่า ห้ามใช้ compose down -v

รุ่นปัจจุบัน pin API image เป็น `mealq-api:20261019-catalogue-v2-r2` และ web เป็น `mealq-web:20261019-home-catalogue-sync` แยกกันใน Compose ของ release นี้ คำสั่งเริ่ม API/web ที่ build ไว้แล้ว โดยไม่เปลี่ยน DB:

```sh
docker compose -p mealq --env-file /home/linapspi4/mealq-app/shared/compose.env -f /home/linapspi4/mealq-app/current/deploy/compose.yaml up -d --no-deps --no-build --wait api web
```

## Domain/Tunnel

โดเมนจดกับ Z.com และเลือกย้าย DNS ไป Cloudflare เพื่อรองรับ Public IP เปลี่ยน ชื่อ Name server ที่บัญชีนี้ได้รับคือ quinton.ns.cloudflare.com และ tess.ns.cloudflare.com

Tunnel mealq: fdda810f-d868-4378-9a48-887d21464b60

- Root DNS: CNAME @ -> fdda810f-d868-4378-9a48-887d21464b60.cfargotunnel.com, Proxied
- www DNS: CNAME www -> mealq.site, Proxied
- Published applications: mealq.site และ www.mealq.site -> http://127.0.0.1:8088, Path ว่าง
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
- จุดสำรองก่อน activation: `/home/linapspi4/mealq-app/shared/backups/activation-20261019T123148Z` ไม่เขียนทับจุด rollback เดิม
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
- สำรอง source ก่อนแก้ที่ Windows: `C:\Users\game_\MealQBackups\source-before-coupons-notifications-20261019T131610Z` (495 files; ไม่รวม env)
- จุด rollback/หลักฐาน: `shared/backups/activation-20261019-coupons-notifications-20261019T133251Z-269073` เก็บ compose/backend env เดิม, current target, metadata/images และ log ก่อน/หลัง ไม่ลบ releases/images เดิม
- สำรองเต็มก่อน activation: `shared/backups/daily/20261019T203428+0700-270713` ตรวจ COMPLETE, SHA256SUMS และ package hash ผ่าน
- Frontend **62 tests ผ่าน**, ESLint และ production build ผ่าน; Backend unit **59 ผ่าน/ข้าม 1** ทั้ง Windows และ image บน Pi; coupon HTTP/Mongo integration **11 กลุ่ม**, order-email **16 กลุ่ม**, Web Push จำลอง **11 กลุ่ม** ผ่าน ฐานทดสอบสุ่มทุกฐานมี archive พร้อม indexes ที่ตรวจแล้วก่อน drop ไม่มีการส่งข้อความจริง
- ตรวจ production หลังสลับ: HTTPS root/new entry asset 200, health ok/database connected, www 308 คง path/query; Demo customer ล็อกอินแล้ว GET คูปอง/แจ้งเตือน 200 ไม่เก็บคูปองหรือสร้างออเดอร์จริงจาก smoke check
- DB, Tunnel, Caddy proxy, DNS helper และ muaysart container ID/start time ตรงก่อนเปลี่ยน; backend environment เดิมไม่ถูกแก้
- สำรองหลัง deploy: `shared/backups/daily/20261019T203641+0700-272149`; Windows สำเนาเข้ารหัส `C:\Users\game_\MealQBackups\20261019T203641+0700-272149.mealq` ตรวจ decryption/SHA/HMAC ผ่านแล้ว บริการ caddy/cloudflared/cron active และ HTTPS เว็บเดิม 200

## รุ่น catalogue-v2-r2

สร้างชุดร้านใหม่ตามคำสั่งผู้ใช้: 6 ร้าน/48 เมนู/60 ภาพ แทนร้านและบัญชี merchant เดิม โดยสำรองก่อนลบและเก็บ customer/admin/orders/financial history ผ่านการตรวจ HTTPS ทุกภาพพร้อม SHA256 แล้ว รายละเอียดขอบเขตการล้าง จุดสำรองและบัญชีใหม่อยู่ใน [catalogue reset](catalogue-reset-2026-10-19.md) สำรองสุดท้าย `20261019T212314+0700-297824` และสำเนาเข้ารหัสนอก Pi ผ่านการตรวจแล้ว

## รุ่น Home catalogue sync

- ขึ้น `20261019-home-catalogue-sync` ด้วย web-only activation สำเร็จ โดย API image ยังเป็น catalogue-v2-r2; API, MongoDB, Tunnel และ muaysart container ID/start time ตรงก่อนเปลี่ยนทั้งหมด
- หน้า Home ใช้รูปอาหาร แบนเนอร์ โลโก้ หมวดอาหาร จำนวนเมนู และสถานะจาก public API ชุดเดียวกับหน้าลูกค้า รายละเอียดใน [Home catalogue sync](home-catalogue-sync-2026-10-19.md)
- ตรวจ HTTPS เวลา 21:55 น.: root ตรง production build ใหม่ `index-CoGP-lrQ.js`, health/database ผ่าน, www 308 คง path/query, เว็บ muaysart 200 และภาพ WebP ครบ 60 ภาพตรง SHA256 ต้นฉบับรวม 5,470,110 ไบต์
- ขณะตรวจมีร้านที่เพิ่มเข้ามาแล้ว ทำให้ public catalogue เป็น 7 ร้าน/49 เมนู การขึ้นหน้า Home ครั้งนี้ไม่แก้หรือล้างข้อมูลร้าน/เมนู
- Frontend 68 tests, ESLint และ production build ผ่าน ไม่ได้ทดสอบภาพหรือคลิกผ่าน browser เนื่องจากสิทธิ์ origin ที่บันทึกไว้ปฏิเสธการควบคุม
- จุด rollback: `shared/backups/activation-20261019-home-catalogue-sync-20261019T145324Z-311779`; สำรองเต็มก่อนสลับ `20261019T215338+0700-312313` และหลังสลับ `20261019T215520+0700-313416` เก็บ release/image เดิมครบ
