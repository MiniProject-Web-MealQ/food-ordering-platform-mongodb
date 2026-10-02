# MealQ — Customer, Merchant and Admin

React/Vite frontend, Express/Socket.IO backend and MongoDB. Customer and Merchant share `/login`; administrators use `/admin/login`.

## Run locally (PowerShell)

MongoDB must be available before starting the backend. If Docker Desktop is installed, open it and run:

```powershell
cd E:\Work\food-ordering-platform-mongodb-publish
docker compose up -d
```

Alternatively, use an existing MongoDB instance and set `MONGO_URI` in `backend/.env`.

Backend terminal:

```powershell
cd E:\Work\food-ordering-platform-mongodb-publish\backend
npm.cmd install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run seed
npm.cmd run dev
```

Frontend terminal:

```powershell
cd E:\Work\food-ordering-platform-mongodb-publish\frontend
npm.cmd install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Development supports other loopback ports when that port is occupied. The recommended `VITE_API_URL=/api/v1` uses Vite's API and Socket.IO proxies. A value in `.env.local` overrides `.env`.

## Demo accounts

| Account | Email | Password | Page |
|---|---|---|---|
| Customer | customer@mealq.local | Customer123! | `/login`, select ลูกค้า |
| Merchant | merchant@mealq.local | Merchant123! | `/login`, select ร้านค้า |
| Admin | admin@mealq.local | Admin123! | `/admin/login` |

Seed inserts missing demo records, a global `LUNCH10` coupon and an initial demo Customer Wallet. It preserves existing passwords, menus, store settings and wallet balances. `npm.cmd run seed -- --reset-demo` explicitly restores demo users/store/menu fields. Test Customer and Merchant in separate browser profiles because authentication uses one session cookie per browser.

## Working flows

- Customer: live restaurant/menu catalogue, cart, server-priced checkout, persisted order history, favorites, profile and preferences, cancellation before preparation, reviews after completion, real pickup QR and numeric code.
- Merchant: live store/menu/order data, menu CRUD, store settings, order transitions, pickup-code verification and Socket.IO updates.
- Admin: real accounts/stores/orders/promotions, role/status management, Wallet adjustments, reports and durable audit history. New administrator accounts must change their initial password before privileged operations.
- Wallet: atomic balance updates, insufficient-funds checks, retry-safe topups/adjustments/refunds, automatic Wallet refund when an order is cancelled.
- Auth: role checks, suspended accounts, session revocation after password/role changes, database-backed single-use password-reset tokens.

## External services and remaining limits

External payments and development Wallet topups are a sandbox: no real money is charged. Production rejects unconfigured external payment/topup attempts. Real card/PromptPay/banking payments still require a payment provider and verified payment callbacks.

Google OAuth is implemented behind `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI`; the button appears only when configured. SMTP password-reset mail uses the `SMTP_*` variables. Development exposes a local reset link; production requires SMTP. These external-provider flows require their credentials and have not been verified with a live provider account.

Admin global Settings is currently an informational page; connection settings come from environment files. Merchant menu images are stored as resized data URLs. Production file storage, production email/payment setup and broader operational testing remain required before a public release.

## Checks

```powershell
cd backend
npm.cmd test
npm.cmd run check
npm.cmd run test:integration

# Optional live MongoDB concurrency check (creates and removes its own fixture wallet)
$env:RUN_DB_TESTS = 'true'
npm.cmd test
Remove-Item Env:RUN_DB_TESTS

cd ..\frontend
npm.cmd run lint
npm.cmd run build
```

Integration verification requires a running local backend/MongoDB and the seeded Admin account. It creates disposable Customer/Merchant fixtures and removes only its own records. `CHECK_ADMIN_EMAIL`, `CHECK_ADMIN_PASSWORD` and `API_BASE` may override the local test account/base URL.

For a built frontend served by Express, run `npm.cmd run build` in `frontend`, then `npm.cmd start` in `backend`, and open `http://localhost:5000`.
