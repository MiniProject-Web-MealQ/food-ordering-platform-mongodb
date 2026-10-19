# Web Push verification

The automated check exercises delivery with real Mongoose models and a temporary
local MongoDB database. Every call to `web-push.sendNotification` is replaced
before the notification service loads. It does **not** send an external push,
request browser permission, start an HTTP server, or start a background worker.

Run from the repository root:

```powershell
node backend/scripts/check-push.js
```

Or run `npm run test:push` from the `backend` directory.

The script reads the local MongoDB connection from `backend/.env`, or accepts
`PUSH_TEST_MONGO_URI`. Only localhost connections are accepted. It replaces the
database name with a random `mealq_push_<16 hex characters>` name; it never uses
the live database's name or collections. Each run archives its synthetic
documents and index definitions under the OS temporary directory's
`mealq-push-check-archives` folder, verifies the archive bytes, and only then
drops that exact test database. If archive creation or verification fails, the
test database is preserved. The archive can contain temporary VAPID keys, all of
which belong only to that synthetic test database.

The checks cover:

- Persistent VAPID identity and private-key concealment in public responses.
- Endpoint restrictions, subscription key shape and unsubscribe ownership.
- Order event deduplication, checkout completion and notification preferences.
- Notification payload, order link, TTL and provider timeout.
- Removal of expired or missing provider endpoints (HTTP 404 and 410).
- Suspended accounts and preferences changed while a job is pending.
- Retry after a transient provider failure, without deleting the subscription.
- Overlapping worker invocations within a single backend process.
- Partial fan-out: successful devices must not receive another delivery solely
  because a different device failed, including after a service restart.
- Delivery receipt privacy, account rebinding and legacy records without receipt
  arrays.

The backend stores accepted-device receipts as SHA-256 hashes scoped to an
account and notification event. It does not copy raw endpoints into inbox
records, return receipts in customer responses, or resend to accepted devices
when another device needs a retry. Existing inbox records work without a data
migration; their first successful delivery records receipts normally.

The frontend reconciles an existing, granted browser subscription with the
active customer session during initialization. It does not request permission
or create a device subscription in that background step. The profile control
shows an enabled device only after the server acknowledges registration, and
offers a visible retry if registration fails. Logging out removes the server
binding and browser subscription before clearing the session; a browser or
server cleanup error preserves the session and restores the logout button.

`frontend/test/push-subscription.test.js` tests those operations using injected
browser and API mocks. Run `npm test`, `npm run lint` and `npm run build` from
`frontend` when changing that flow. These checks do not grant permission or
contact a push provider.

For an actual device, open `https://mealq.site`, log in as a customer and use
**โปรไฟล์ → แจ้งเตือนเมื่อปิดหน้าเว็บ → เปิดแจ้งเตือนอุปกรณ์นี้**. Allow the
browser permission using its own prompt. Create a dedicated Demo order, close
the website tab while leaving browser background operation available, and have
the merchant advance that order to ready. Confirm that the notification opens
the correct order. Repeat after disabling notifications and confirm silence.
This manual flow uses a real customer-authorized device and sends an actual
push; it is separate from the automated check.

For iPhone/iPad, validate the installed Home Screen web app on iOS/iPadOS 16.4 or later
and request notification permission from its in-app button. Do not interpret a
successful desktop delivery as proof of delivery on another device. Device
power saving, browser background settings and denied permissions can prevent
delivery even when the server and subscription are correct.
See the [WebKit Web Push guide](https://webkit.org/blog/13878/) for the Home
Screen and direct-user-interaction requirements.

The current worker runs in one backend process. The overlap check does not
claim distributed locking across multiple API instances or exact-once behavior
when a provider accepts a push immediately before the process crashes. A stable
notification tag lets the browser replace the same displayed event on retries.

The worker currently preserves all queued status events. After a long outage,
several old statuses can arrive before the current one. A separate product
decision should set an expiry window or coalesce obsolete pending statuses,
while preserving the inbox history and important final statuses. The retry fix
does not change that existing behavior.

## Actual provider and user acceptance — 19 October 2026

- Desktop Chrome: FCM accepted HTTP 201 at 19:08:49 Asia/Bangkok. The user
  confirmed the notice appeared while the MealQ tab was closed and clicking it
  opened MealQ.
- Apple Home Screen web app: the user installed from Safari, launched from the
  Home Screen, signed in and enabled notifications. Exactly **one** test push
  was sent to that fresh device registration. Apple Push accepted HTTP 201 at
  **2026-10-19T12:37:50.014Z / 19:37:50.014 Asia/Bangkok**. The user confirmed
  receipt while the app was closed and that tapping the notice opened MealQ.

Provider acceptance and the user's receipt/open confirmation are separate
pieces of evidence. These results cover those tested desktop/Apple device
flows. **Android on a physical device remains untested**, and the Apple result
does not certify every iPhone/iPad version or configuration. No personal
mailbox, password or push endpoint is recorded here.

The subsequent `20261019-notifications-r2` release was verified active at
19:39:17 Asia/Bangkok. It corrects only web manifest MIME handling; the API
image/container, subscription data and the original provider/user acceptance
results above remain unchanged. Physical Android acceptance is still pending.
