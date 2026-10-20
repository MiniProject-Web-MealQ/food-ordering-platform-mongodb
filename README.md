# MealQ

MealQ เป็นเว็บแอปสั่งอาหารล่วงหน้าและจัดการคิวรับอาหารที่ร้าน ลูกค้าเลือกเมนู ติดตามออเดอร์ และแสดงรหัสหรือ QR เมื่อรับอาหาร ร้านค้าจัดการเมนู สูตร วัตถุดิบ และคิว ส่วนแอดมินอนุมัติร้านและดูแลระบบ

## เอกสารโครงงาน

- [คู่มือโครงงานและวิธีติดตั้ง](docs/project-guide.md) อธิบายฟังก์ชัน เทคโนโลยีที่ใช้ในแต่ละส่วน สถาปัตยกรรม ข้อมูล และคำสั่งติดตั้งสำหรับ Windows กับ macOS/Linux
- [คู่มือฉบับ Word](docs/MealQ-Project-Guide.docx) สำหรับดาวน์โหลด อ่าน และแก้ไขต่อ
- [สไลด์นำเสนอและหัวข้อประกอบ](docs/presentations/README.md)

| ส่วน | เทคโนโลยีและการใช้งาน |
|---|---|
| Frontend | React 19, React Router 8, Vite 8 และ Tailwind CSS 4 สำหรับหน้าเว็บและ responsive layout |
| Backend | Node.js และ Express 5 สำหรับ HTTP API, middleware, session และกฎการสั่งซื้อ |
| Database | MongoDB และ Mongoose 9 สำหรับบัญชี ร้าน เมนู สูตร สต็อก ออเดอร์ และ Wallet |
| การอัปเดตและแจ้งเตือน | Socket.IO, Nodemailer, Web Push และ Service Worker |

Customer and Merchant share `/login`; administrators use `/admin/login`. Payments use **Demo mode** by default, with no bank transfer or real payment-provider integration.

## Run locally (PowerShell)

Requires Git, **Node.js 22.22.0+ in the 22.x line or Node.js 24+**, and npm. Install dependencies separately in `backend` and `frontend`; the repository root has no `package.json`. MongoDB must be available before starting the backend. If using Docker Desktop, open it first.

Clone the project and switch to the team's development branch:

```powershell
git clone https://github.com/MiniProject-Web-MealQ/food-ordering-platform-mongodb.git
cd food-ordering-platform-mongodb
git switch develop
docker compose up -d mongo
```

Alternatively, use an existing MongoDB instance and set `MONGO_URI` in `backend/.env`.

Backend terminal, starting from the repository root:

```powershell
cd backend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run seed
npm.cmd run dev
```

Open a second terminal at the repository root for Frontend:

```powershell
cd frontend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Development supports other loopback ports when that port is occupied. The recommended `VITE_API_URL=/api/v1` uses Vite's API and Socket.IO proxies. A value in `.env.local` overrides `.env`.

Check `http://localhost:5000/api/v1/health` for `status: "ok"` and `database: "connected"`. Local Compose exposes MongoDB at `127.0.0.1:27018`. For macOS/Linux commands and optional Google/SMTP setup, follow the [installation guide](docs/project-guide.md#ติดตั้งและรันในเครื่อง).

## Demo accounts

| Account | Email | Password | Page |
|---|---|---|---|
| Customer | customer@mealq.local | Customer123! | `/login`, select ลูกค้า |
| Merchant | merchant@mealq.local | Merchant123! | `/login`, select ร้านค้า |
| Admin | admin@mealq.local | Admin123! | `/admin/login` |

Seed inserts missing demo records, a global `LUNCH10` coupon and an initial demo Customer Wallet. It preserves existing passwords, menus, store settings and wallet balances. `npm.cmd run seed -- --reset-demo` explicitly restores demo users/store/menu fields. Test Customer and Merchant in separate browser profiles because authentication uses one session cookie per browser.

**Configure recipes before checkout:** the seed does not populate ingredient recipes or store/menu images. A seeded menu without a recipe returns `RECIPE_NOT_CONFIGURED` when ordering. Sign in as Merchant, create stock in `/merchant/inventory`, then attach ingredient quantities and matching units to each menu before testing an order. The seed is local starter data, not a copy of the hosted catalogue. Demo credentials are for isolated local testing; change or remove them before exposing an installation publicly.

## Working flows

- Customer: live catalogue, validated cart options, checkout with retry protection and amount checks, Wallet balance/history, persisted orders/favorites/profile, in-app order/promotion notices, cancellation/refunds, reviews and order-specific pickup QR.
- Merchant: live store/menu/order data, menu/options CRUD, store images/coordinates/settings, order transitions, pickup-code verification and Socket.IO updates. New stores start pending and closed; only an Admin can approve them before the merchant opens sales. Admin can assign staff accounts to a store.
- Admin: accounts/stores/orders/promotions, staff assignment, role/status management, Wallet adjustments, reports, password-reset requests, service fees and pausing new orders, with durable audit history. Suspending an owner closes their stores. New administrators must change their initial password before privileged operations.
- Wallet: atomic balance updates, insufficient-funds checks, retry-safe topups/adjustments/refunds, automatic Wallet refund when an order is cancelled.
- Auth: password signup requires a six-digit email OTP before account/session creation, role checks, suspended accounts, session revocation after password/role changes, database-backed single-use password-reset tokens. Existing accounts remain usable; Google signup relies on Google's verified email.

## External services and remaining limits

The application defaults to `PAYMENT_MODE=demo`, independently of `NODE_ENV`. Checkout offers simulated PromptPay and a demo Wallet. Customers can add 1–10,000 demo baht per request at `/customer/wallet`, including on a deployed demo; there is no real transfer, QR payment or bank charge. Wallet demo orders debit the test balance and cancellation refunds it. An unfinished checkout cannot be cancelled or accepted by the kitchen until payment/queue creation finishes.

Set `PAYMENT_MODE=wallet` to disable PromptPay simulation and self-service demo topups. This is a Wallet-only mode, not a real payment-provider integration. Card/banking methods are not advertised. No production payment provider is connected.

New merchants can prepare menus and store information while waiting for approval. Admin approves them at `/admin/stores`; the merchant then switches on sales. Pending, rejected and suspended stores cannot open themselves or accept checkout requests. Existing stores retain their saved status. Seed demo stores are explicitly preapproved.

Store coordinates can be entered in Merchant Settings; sorting by distance asks the customer for location only after they select that sort. Stores without coordinates sort last. Order notifications/read receipts are stored on the server. Customers can enable background Web Push per device from Profile on HTTPS/localhost. Browser permission/background support is required; VAPID keys persist privately in MongoDB.

Google OAuth is implemented behind `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI`; the button appears only when configured. Follow the [localhost Google Login setup](docs/google-login-localhost.md). Google merchant signup uses the same pending-approval flow. SMTP signup OTP and password-reset mail use the `SMTP_*` variables. Development exposes a local password-reset link; production requires SMTP. Delivery to a real inbox must be checked with the intended recipient.

Password signup now sends an OTP through SMTP and returns HTTP 202 with `verificationRequired`, `registrationId`, `email`, `expiresAt` and `resendAfter`. Submit `{ registrationId, code }` to `POST /api/v1/auth/register/verify` to create the account and session; `POST /api/v1/auth/register/resend` sends a fresh code. OTPs expire after 10 minutes, allow five guesses, and can be resent after 60 seconds (five sends per email/hour; 20 sends and 100 verification requests per IP/hour). Unfinished drafts expire after 24 hours. OTPs/passwords are hashed on the server; neither is returned to the browser or logged. There is no development OTP bypass. [Gmail OTP setup and verification](docs/email-otp-registration.md).

Admin Settings persists service fees and the global acceptance of new orders in MongoDB. Provider credentials remain in environment files. Merchant/menu images are resized and stored as data URLs, but catalogue/admin responses return separate cacheable media URLs; routes and images load on demand. Public Demo deployment can use the current MongoDB-backed media storage. Configure SMTP for email features and check intended browsers/devices; real payment processing would require a separate provider integration. MongoDB Compose uses host port 27018; `.env.example` matches that port.

Checkout clients should send a stable `Idempotency-Key` header (8–100 letters, digits, underscores or hyphens), reuse it on retries, and supply `expectedTotal`. A successful retry returns the same order. Different content with the same key returns `IDEMPOTENCY_CONFLICT`; a concurrent request can return `CHECKOUT_IN_PROGRESS` or `STORE_BUSY` and should be retried with the same key. Older clients without a key remain compatible but do not receive retry protection. A recovery worker runs on startup and every 30 seconds: attempts older than two minutes with expired store leases are cancelled, Wallet debits/ledger entries are reconciled and refunded once, reserved stock and coupon quotas are restored, and queues are cancelled. Recovered failed attempts release their checkout key for a safe retry.

## Checks

```powershell
cd backend
npm.cmd test
npm.cmd run check
npm.cmd run test:integration
npm.cmd run test:regression
npm.cmd run test:otp
npm.cmd run test:extensions
npm.cmd run test:push
# Check configured SMTP credentials without sending any email:
npm.cmd run mail:check

# Optional live MongoDB concurrency check (creates and removes its own fixture wallet)
$env:RUN_DB_TESTS = 'true'
npm.cmd test
Remove-Item Env:RUN_DB_TESTS

cd ..\frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Workflow, regression and OTP integration checks require local MongoDB. They start their own local Backend/SMTP inbox, create uniquely named temporary databases, and remove them after checking. They never use the configured Gmail sender or the application's user database. Workflow checks seed their own Admin; `CHECK_ADMIN_EMAIL` and `CHECK_ADMIN_PASSWORD` can name that test fixture. `API_BASE` is no longer used for workflow checks.

`test:regression` requires local MongoDB and starts its own backend processes in development and production mode against a uniquely named disposable database. It removes that database after the run. It verifies store approval, demo PromptPay/Wallet topup/refund, concurrent checkout, cancellation during a delayed payment, snapshots, images/options, queues, staff assignment, suspension, settings and Wallet-only mode without modifying the application's database.

For a built frontend served by Express, run `npm.cmd run build` in `frontend`, set `FRONTEND_URL=http://localhost:5000` in `backend/.env`, then restart with `npm.cmd start` in `backend` and open `http://localhost:5000`. This origin setting also matters in development so email links return to the running frontend. Restore `http://localhost:5173` when switching back to Vite. For production, use the actual public HTTPS origin and a new session secret; keep HTTP local development out of production mode.

## October 19 follow-up and Pi deployment

- Email changes use a separate authenticated OTP flow; direct unverified email updates are refused and prior sessions/reset tokens are revoked after verification.
- Merchant Settings links to Inventory. Create ingredients there, then set quantities per serving in menu recipes. Checkout reserves stock atomically; cancellation/recovery restores once. Low stock is highlighted and public menus become unavailable when ingredients run out.
- Menu cuisine is editable separately from menu category. A guarded backfill fills only unchanged demo menus with a missing cuisine.
- Optional automatic daily opening hours use Asia/Bangkok, support overnight hours and preserve the manual pause switch. Existing stores keep manual mode until the merchant enables automation.
- Merchant revenue/weekly bestsellers include only paid/simulated noncancelled checkouts. Favorites ignore deleted items and failed saves can be retried.
- See [implementation and verification](docs/follow-up-fixes-2026-10-19.md) and [Pi deployment](docs/pi-deployment-2026-10-19.md). Payments remain demo-only.
- See [production API acceptance and demo account locations](docs/live-acceptance-2026-10-19.md), [Web Push verification](docs/push-verification.md), and [daily/off-Pi encrypted backups and restore drill](docs/backups-2026-10-19.md). Private credentials are Git-ignored and excluded from deployment archives.
