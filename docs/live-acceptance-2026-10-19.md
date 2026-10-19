# MealQ production acceptance — 19 October 2026

Production verification finished at **18:50 Asia/Bangkok** on the existing Pi deployment. All **10 acceptance groups passed**. Checks used the production API from its container with the trusted `https://mealq.site` origin, production MongoDB and dedicated labelled DEMO fixtures. This is API acceptance; actual Gmail delivery and device/browser push permissions are separate checks.

The production database was backed up before creating fixtures:

`/home/linapspi4/mealq-app/shared/backups/mealq-before-live-acceptance-20261019T114850Z.archive.gz`

A further backup was taken before enabling reusable demo logins and setting new fixture passwords:

`/home/linapspi4/mealq-app/shared/backups/mealq-before-live-acceptance-20261019T115311Z.archive.gz`

No generic database seed script was run. No files, accounts, stores or database records were deleted. No application/container restart or deployment was performed by these checks. Existing stores' names, ownership, approval status, manual-open flags, schedules and queue settings matched their pre-check digest.

| Check | Result |
| --- | --- |
| Production health; anonymous administrator access rejected | Passed |
| Customer/merchant/admin role separation; merchant starts pending, hidden and unable to open | Passed |
| Admin approves dedicated DEMO shop; ingredient quantity/unit and Japanese cuisine persist; wrong recipe unit rejected | Passed |
| Bangkok automatic opening hours match public catalogue and reject checkout outside hours | Passed |
| Self topup and Wallet checkout; repeated idempotency keys credit/debit stock and money once | Passed |
| Kitchen follows confirmed → preparing → ready; wrong pickup code rejected; correct pickup completes order and appears in paid sales | Passed |
| Customer cancellation and retries refund Wallet and restore stock once; cancelled sales excluded | Passed |
| Low stock hides unavailable menu; checkout rejected without charging; restocking restores availability | Passed |
| PromptPay remains simulated; merchant cancellation restores stock and does not change Wallet | Passed |
| Ready notification stored; existing stores remain unchanged | Passed |

## Retained reusable fixtures

Store: `DEMO Acceptance 20261019t115030-17c884 — ร้านทดสอบ Demo`

- Store ID: `6ad60407ffd68e1d1562b4f3`
- Approved/active, **manually closed** after testing to prevent accidental demo orders.
- Automatic schedule configured as **09:00–21:00 Asia/Bangkok**. The merchant can open manually; effective availability also respects these hours.
- Ingredient `DEMO egg / ไข่ตัวอย่าง`: 26 pieces remaining, low-stock threshold 5.
- Menu `DEMO Japanese egg bowl / ข้าวไข่ตัวอย่าง`: ฿40, Japanese cuisine, recipe uses 2 pieces per dish.
- One completed Wallet Demo order and two cancelled orders are retained to inspect order history and refunds. These create a clearly labelled demo sale in overall reports.
- Customer demo balance is ฿916. It is simulated money and can be topped up by the customer.

| Role | Login identifier | Status |
| --- | --- | --- |
| Customer | `demo-customer-20261019@mealq.invalid` | Active; login verified HTTP 200 |
| Merchant | `demo-merchant-20261019@mealq.invalid` | Active, store approved; login verified HTTP 200 |
| Temporary acceptance administrator | Reserved acceptance identifier | Suspended; all sessions revoked |

Existing administrator credentials were not changed. One pre-existing active administrator remains available. Every automated verification session was revoked after testing; the two reusable credentials still work for fresh logins.

The two generated passwords are stored in a **Git-ignored private local file**, never in this document or the frontend:

`E:\Work\food-ordering-platform-team-test\backend\.env.demo-credentials-20261019T115311Z.json`

The local ACL permits the current Windows user and SYSTEM. The corresponding Pi file is `/home/linapspi4/mealq-app/shared/demo-credentials-20261019T115311Z.json`, mode `0600`. Do not commit or publish either file. The reserved `.invalid` identifiers cannot receive OTP or password-reset mail; use a real owned Gmail address for email acceptance.

## Scripts and rerun safeguards

`backend/scripts/check-live-acceptance.js` requires all of:

- Execution inside the deployed production API container using its existing runtime environment.
- `MEALQ_LIVE_ACCEPTANCE=confirm-fixture-writes`.
- `MEALQ_ACCEPTANCE_BACKUP` pointing to a fresh host backup named `mealq-before-live-acceptance-<UTC timestamp>.archive.gz` under the MealQ backup directory.
- Production `NODE_ENV`, and the connected database name must be exactly `mealq`.

Each run creates separate labelled fixtures and retains them. It never recreates the database, deletes records, touches another shop, sends mail, publishes credentials or restarts services. Its final safeguard closes its own store, cancels its unfinished eligible orders with normal compensation, and revokes fixture sessions. The acceptance admin and customer are suspended by default.

`backend/scripts/check-live-acceptance-credentials.js` is a separate explicit step for making only a completed run's customer and merchant usable. It requires exact fixture IDs, a fresh backup, `MEALQ_ENABLE_DEMO_ACCOUNTS=confirm-fixture-only`, and an unused private output filename. It validates labels/roles/ownership, rejects another account with the desired login, writes credentials with exclusive creation/mode `0600` before changing passwords, verifies both real login APIs, and revokes verification sessions. It leaves the temporary administrator suspended and the existing administrator untouched.

Do not run either script merely to check current health: the first deliberately creates additional demo data; the second resets passwords on explicitly identified demo fixtures. The already completed checks do not need to be repeated unless relevant application behavior changes.

## Owner-requested administrator and merchant access

At **19:46 Asia/Bangkok on 19 October 2026**, the owner explicitly requested administrator and merchant demo access on the Pi. A separate administrator `demo-admin-20261019@mealq.invalid` was created with a random strong password and mandatory first-login password change. The approved merchant `demo-merchant-20261019@mealq.invalid` and its existing password were reused; the earlier temporary acceptance administrator remains suspended.

- New administrator ID: `6ad61124b84e928b55cde32b`.
- Fresh, gzip/checksum-verified pre-seed backup: `/home/linapspi4/mealq-app/shared/backups/mealq-before-demo-access-20261019T124627Z.archive.gz`.
- Both normal login API probes returned HTTP 200. Administrator state confirmed the first-password requirement, and the settings API correctly rejected use with `PASSWORD_CHANGE_REQUIRED` until the owner sets a personal password.
- Merchant ownership and approved store were checked before login. Existing administrator/merchant records and store approval, manual-open flag and schedule matched their pre-seed digests; API/web/DB/Muaysart container identities and start times also matched.
- Store remains manually closed, with automatic hours 09:00–21:00 Asia/Bangkok. The merchant may open it from settings to test selling.
- Two-role credentials are kept privately at `/home/linapspi4/mealq-app/shared/demo-credentials-access-20261019T124627Z.json` (mode 0600) and in the Git-ignored local file `backend/.env.demo-access-20261019T124627Z.json` (current-user/SYSTEM ACL). No passwords are included in this document.

`backend/scripts/seed-live-demo-access.js` is an explicit production operation with fresh-backup and exact-fixture guards. It refuses an existing administrator login identifier, writes credentials privately before creating the account and never resets the merchant password or runs the catalogue seed. Do not rerun it for health checks. The exact executed script and its report are retained under the Pi's private operations/backups directories.
