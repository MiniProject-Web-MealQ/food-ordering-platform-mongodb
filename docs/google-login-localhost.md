# ตั้ง Google Login สำหรับ localhost

โค้ด Google OAuth มีแล้ว ยังต้องสร้าง credentials ของโปรเจคใน Google Cloud จึงจะทดสอบกับ Google จริงได้ ใช้บัญชี Google ที่คุณเป็นเจ้าของโปรเจคหรือมีสิทธิ์สร้าง OAuth client ไม่ต้องใช้ service-account key หรือ API key สำหรับ flow นี้

## สิ่งที่ต้องเตรียม

1. Google Cloud project ของคุณ
2. OAuth Client ID แบบ **Web application** พร้อม Client Secret
3. ชื่อแอป เช่น MealQ และอีเมล support/developer สำหรับตั้งหน้า consent
4. URL ที่ใช้: Frontend `http://localhost:5173`, Backend `http://localhost:5000`

สร้าง client ตาม [Google: Web Server OAuth credentials](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred) ตั้ง consent/branding สำหรับแอป และใช้ scopes พื้นฐาน `openid email profile` ตาม [Google: Sign in with Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) โค้ดนี้ขอเพียงชื่อ อีเมล และตัวตนบัญชี ไม่ขอ Drive หรือ Gmail

## ตั้งค่า Google Cloud

1. เปิด [Google Cloud Console](https://console.cloud.google.com/) แล้วเลือกหรือสร้าง project
2. ตั้ง **Google Auth Platform → Branding**: ชื่อแอปและอีเมล support/developer
3. ตั้ง **Audience** ให้เหมาะกับบัญชีที่จะทดสอบ เช่น External สำหรับ Gmail ทั่วไป คงโหมด Testing ระหว่างพัฒนา หากมีการจำกัด test users ในโปรเจค ให้เพิ่มอีเมลของผู้ทดสอบ
4. ที่ **Clients** สร้าง OAuth Client แบบ **Web application**
5. ใน **Authorized redirect URIs** ใส่ค่านี้ตรงทุกตัวอักษร:

```text
http://localhost:5000/api/v1/auth/google/callback
```

Flow นี้ให้ Backend แลก authorization code จึงใช้ callback ของ Backend ไม่ใช่หน้า `/login` หรือ `/customer` หากกรอก Authorized JavaScript origins ด้วย ให้ใช้ `http://localhost:5173` โดยไม่มี path

เก็บ Client ID และ Client Secret จาก client ที่สร้างไว้ในไฟล์ฝั่ง Backend ไม่ใส่ Secret ใน frontend หรือ Git ตาม [คำแนะนำ Google เรื่อง client credentials](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)

## ตั้งค่าในโปรเจค

แก้ `backend/.env` โดยแทน placeholder ด้วยค่าจริง:

```dotenv
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
PAYMENT_MODE=demo
```

ใช้ `NODE_ENV=development` ขณะทดสอบ HTTP บน localhost แล้ว restart Backend:

```powershell
cd E:\Work\food-ordering-platform-team-test\backend
npm.cmd run dev
```

เปิด Frontend ที่ `http://localhost:5173/login` ด้วย Chrome/Edge ปกติ ปุ่ม “เข้าสู่ระบบด้วย Google” จะปรากฏเมื่อมี Client ID และ Secret ทั้งคู่

## ตรวจผล

- `http://localhost:5000/api/v1/auth/capabilities` ควรตอบ `google: true` ค่านี้หมายถึงตั้ง credentials แล้ว ยังไม่ใช่การยืนยันว่า Google ยอมรับค่าหรือ login สำเร็จ
- บัญชีลูกค้าใหม่กลับไป `/customer`
- บัญชีร้านค้าใหม่กลับไป `/merchant/dashboard` พร้อมสถานะรอแอดมินอนุมัติ ร้านยังเปิดขายไม่ได้
- บัญชี Google ที่มีอีเมลเป็นบัญชีเดิมต้องเลือกประเภทบัญชีให้ตรง เช่น Customer กับ Merchant แยกกัน
- ทดสอบร้านใหม่ด้วยอีเมลที่ยังไม่มีร้านเดิม เพราะระบบไม่เปลี่ยนร้านที่อนุมัติแล้วกลับไปรออนุมัติ

ถ้าได้ `redirect_uri_mismatch` ตรวจค่า redirect ใน Google Cloud กับ `.env` ให้ตรงกัน รวมพอร์ตและ `localhost` อย่าสลับ `localhost` กับ `127.0.0.1` ระหว่างเริ่ม login และ callback เพราะ cookie ของ OAuth ผูกกับ host หาก Vite ใช้พอร์ตอื่น ให้เปิด URL ที่ Vite แสดงและเพิ่ม origin ตามที่ใช้จริง โดย callback Backend ยังคงพอร์ต 5000

หลังใส่ credentials แล้วแจ้งว่า “ตั้ง Google แล้ว” เพื่อทดสอบ flow จริงต่อได้ ไม่จำเป็นต้องส่ง Client Secret ในแชต
