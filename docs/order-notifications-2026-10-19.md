# Order email notifications — 19 October 2026

This change adds optional order emails for customers and merchant owners alongside their existing in-app/browser notifications. Existing accounts start with order email **off**. No old order email is sent merely because the release is deployed or a user switches the preference on.

## Events

| Order event | Customer email | Merchant-owner email |
| --- | --- | --- |
| Successful Wallet or simulated PromptPay checkout | Order accepted/paid | New order |
| Kitchen confirms or prepares | No additional email | No additional email |
| Food ready | Ready for pickup | No additional email |
| Customer cancels | Cancelled | Customer cancellation |
| Merchant/admin/system cancels | Cancelled | No self-action email |
| Pickup confirmed | Completed | Customer picked up |

Emails contain a snapshot of the order number, shop, items, quantity and total, plus a role-specific order-detail link. The detail page still requires the appropriate signed-in account. No password, OTP, pickup code, session token or account-management ticket is included in these emails.

The cream/cocoa/yellow HTML template has a plain-text alternative and needs no external image/font. All personal/order text is HTML escaped. Links must use the first configured `FRONTEND_URL` origin and a customer/merchant order-detail path, with no query or fragment. A stable hashed `Message-ID` is derived from the durable event key and recipient to aid mailbox deduplication without revealing the raw key/address in that header.

## Preference and delivery rules

`GET /api/v1/auth/notification-preferences` returns `{ emailOrders, emailVerified, emailAvailable }`. Authenticated `PATCH` accepts `{ emailOrders: true | false }` and changes only the current account. Customer and merchant-owner roles may enable; staff/admin do not receive this order email feature. Enabling requires a verified account email, a nonreserved deliverable-format address and configured SMTP. Reserved demo addresses such as `@mealq.invalid` remain useful for login testing but cannot enable real mail.

`User.email_order_enabled_at` and a fresh `email_order_generation` identify each opt-in cycle. Repeating an already-enabled request preserves that cycle; disabling skips pending work. A delivery rechecks the active account, exact role, verified address, address snapshot, current opt-in generation and event time. Address/role/status/verification changes cannot leak a queued notice to a stale recipient.

The persisted `EmailNotificationState` watermark starts once at first deployment. Order status writes append a small `notification_events` journal and set `notification_pending` atomically with the transition. If the process stops before creating outbox rows, bounded oldest-first reconciliation processes pending markers without an age cutoff and rebuilds each recorded email event with its **original timestamp**. Acknowledgement preserves `updatedAt` and clears the marker only if the captured status and journal length still match, so a concurrent transition stays pending. It does not pretend old events happened when reconciliation runs. Only the current status generates push/in-app notices during journal replay, avoiding a burst of superseded push messages.

`EmailOutbox` uses a unique event key, recipient/preference snapshot, bounded retries and a two-minute lease. The background worker checks every 10 seconds, reads a fresh clock per claim and after errors, and skips already-sent jobs. Temporary missing SMTP pauses work without using an attempt. Delivery errors back off and stop after five attempts; persisted error codes are sanitized and do not contain provider response text or credentials.

SMTP acceptance is not proof of inbox delivery. A process failure after an SMTP server accepts a message but before the sent receipt is saved can still cause an at-least-once retry. The stable Message-ID helps mailbox deduplication; this is not a claim of transactional exactly-once delivery across SMTP and MongoDB.

## Verification

`npm run test:order-notifications` runs real Express routes and real local SMTP against a random **localhost-only** database. It never imports the production server/background timers, never uses Gmail delivery, and refuses remote MongoDB. The database and indexes are exported to a private EJSON archive and read back to verify it before that exact random test database is dropped. If archiving fails, the synthetic database is retained.

Final integration result: **16/16 groups passed**:

1. Preference defaults, authentication, role/verification/reserved-address/SMTP guards.
2. Deployment/user opt-in cutoffs, stable repeat-enable generation and account ownership.
3. Real paid checkout emails to both roles, concurrent dispatch and sent-job deduplication.
4. Ready/pickup event selection and duplicate status recording.
5. Customer versus merchant cancellation recipients and retry deduplication.
6. Customer/merchant inbox separation and read ownership.
7. Opt-out and re-enable without replaying old queued mail.
8. Delivery revalidation after email, status, verification and role changes.
9. A real local SMTP failure, backoff and successful retry.
10. SMTP pause, five-attempt exhaustion and sanitized error state.
11. Active/expired worker leases and concurrent crash recovery.
12. Durable pending/ready/completed journal replay, original timestamps and current-state push only.
13. Per-recipient original opt-in cutoff after journal recovery.
14. Durable event repair after more than 24 hours of downtime without changing the order timestamp.
15. Bounded oldest-first repair progressing across a backlog.
16. A concurrently appended transition retaining its marker until the next repair.

The final synthetic archive is:

`C:\Users\game_\AppData\Local\Temp\mealq-order-email-check-archives\mealq_order_email_507e2f964cccb4ad.json`

Mail unit coverage is **11/11**, including all existing OTP/copy-link/reset behavior, hostile HTML input, trusted URLs, recipient validation and stable event/recipient Message-ID separation. The backend worker's fine-grained tests also cover fresh clocks across slow sequential sends and error backoff.

## Gated production acceptance helper

`backend/scripts/check-live-order-email.js` is **not part of `npm test` and has not been executed by the implementing agent**. The root must review it, verify a fresh timestamped host backup and explicitly provide:

- `MEALQ_LIVE_ORDER_EMAIL=CONFIRM_4_EMAILS_TO_OWNED_GMAIL`
- `MEALQ_ALLOWED_GMAIL` containing the exact explicitly authorized primary Gmail mailbox in lowercase, without a plus tag, and `MEALQ_CONFIRM_GMAIL` containing the same value as a second runtime acknowledgement. No personal mailbox is embedded in tracked source or this document.
- `MEALQ_ACCEPTANCE_BACKUP=/home/linapspi4/mealq-app/shared/backups/mealq-<label>-YYYYMMDDTHHMMSSZ.archive.gz`, verified on the host and less than 15 minutes old.
- An unused private `MEALQ_DEMO_CREDENTIAL_FILE=/tmp/mealq-live-order-email-YYYYMMDDTHHMMSSZ.json`.

The helper runs only in the production API container against database `mealq`, with payment mode sandbox. It creates unique customer/merchant Gmail plus-alias fixtures for that owned mailbox and one temporary administrator. Credentials are written privately before changes. It approves only its own demo shop, creates one demo Wallet order (two role emails), waits for normal worker sent receipts, then cancels as the customer (two role emails). It does not manually dispatch unrelated jobs, edit a real account/store, delete records or change deployment/network configuration.

Finally it closes the demo shop, suspends its temporary administrator and revokes its verification sessions. If the check fails after creating an unfinished order, it attempts cancellation of only that owned fixture through the normal customer API, retaining the failed result; if cancellation fails it reports the manual recovery requirement. It retains the two usable demo credentials and event receipts. After the human confirms receipt in Gmail for both roles, disable `emailOrders` on those two exact demo accounts. If the check stops early, the report retains fixture IDs, private credential path and available delivery states for review. The private credential file must never be committed or published.

Source/test backup before the order template change:

`C:\Users\game_\AppData\Local\Temp\MealQ-order-mail-backup-20261019-191426`

The earlier public copy-OTP helper and mail links are preserved. No real email was sent and no production deployment was performed by the implementing agent for this change.

## Production SMTP acceptance after deployment

The root subsequently ran the reviewed, gated helper on release `20261019-notifications` at approximately **19:35 Asia/Bangkok (12:35 UTC)**. Only runtime-allowlisted, human-owned Gmail plus-aliases were used. The primary personal mailbox and passwords are not embedded in tracked source or this document.

- Label: `DEMO Email Acceptance 20261019t123504z-b7c241`
- Fixture store: `6ad60e795d281159f35e92f7`
- Fixture order: `6ad60e795d281159f35e92fa`
- Fresh pre-test backup: `/home/linapspi4/mealq-app/shared/backups/mealq-order-email-20261019T123502Z.archive.gz`
- Protected credentials: `/home/linapspi4/mealq-app/shared/demo-credentials-order-email-20261019T123502Z.json`; keep private, never publish its contents.

**The real SMTP server accepted all four messages on their first attempt**, and all four outbox jobs were marked `sent`: customer order accepted, merchant new order, customer cancellation, merchant customer-cancellation notice. The fixture was cancelled and its shop closed; the temporary administrator and automated sessions were disabled by the helper.

**The human confirmed all four order emails arrived in Gmail for both roles and approved their formatting.** This inbox confirmation is separate evidence from the SMTP `sent` receipts. `emailOrders` was then disabled on only these two exact mail-fixture accounts through authenticated API requests and verified with GET. The shop remains closed and the temporary administrator suspended; the primary Google account was outside that cleanup scope.

The user also completed an **actual Apple Home Screen web-app check**: installed from Safari, launched from the Home Screen, signed in and enabled notifications. The root sent exactly one fresh-device test push; Apple Push accepted HTTP 201 at **2026-10-19T12:37:50.014Z (19:37:50.014 Asia/Bangkok)**. The user confirmed it appeared while the app was closed and tapping it opened MealQ. This proves the tested Apple device flow, alongside the previously confirmed desktop Chrome flow; it does not claim physical Android acceptance or every iPhone/iPad configuration. No mailbox, password or push endpoint is published here.

Release `20261019-notifications-r2` became active at **19:39:17 Asia/Bangkok** after backup `shared/backups/activation-20261019T123905Z`. It changes only the web manifest MIME; the API image/container and underlying notification data remain unchanged. The real email/Apple acceptance above occurred before that web-only patch and remains recorded with its original times.
