# Mobile and order notifications

Customer settings are under **โปรไฟล์**. Store owner settings and the merchant
inbox are under **ตั้งค่าร้าน**; the bell links to that inbox section. Staff
accounts do not display owner-only notification controls.

Device push and order email are independent settings. Email starts disabled and
requires an explicit opt-in from the account. The UI displays the target email,
verified status and whether delivery is available before enabling it. Opting in
starts with future order events; it does not request historical email delivery.
Disabling remains possible when email delivery is unavailable.

`GET/PATCH /api/v1/auth/notification-preferences` returns
`{emailOrders,emailVerified,emailAvailable}`. PATCH accepts a boolean
`emailOrders`. Browser push uses `/customer/push/*` or `/merchant/push/*` for the
current account role. The merchant inbox uses `/merchant/notifications` and
`/merchant/notifications/:id/read`.

## iPhone and iPad

1. Use iOS/iPadOS 16.4 or later and open `https://mealq.site` in Safari.
2. Use Share → Add to Home Screen. If shown, keep **Open as Web App** enabled.
3. Launch the MealQ icon from the Home Screen, then log in as the intended
   customer or store owner.
4. Open the customer profile or merchant settings, press the device notification
   button and allow the system permission prompt.
5. For an actual acceptance check, close the app's page, keep the device online,
   and trigger one dedicated Demo order event for that account. Confirm the
   notification appears and opens the correct role and order.

An ordinary iOS Safari tab does not satisfy the Home Screen requirement. The UI
detects iOS/iPadOS, including iPad desktop user-agent mode, and distinguishes a
standalone Home Screen app. Old versions and missing APIs remain unsupported;
the email option is shown separately rather than claiming push support.

These requirements are documented by
[WebKit](https://webkit.org/blog/13878/) and
[Apple's Home Screen app instructions](https://support.apple.com/guide/iphone/iphea86e5236/ios).

## Android and desktop

Android Chrome users can use the browser menu's Install app/Add to Home Screen
action, launch MealQ and enable push from settings. The actual Web Push APIs and
secure-context status determine support; installing alone does not grant
notification permission. Some browsers do not support the same features. See
[Chrome's PWA documentation](https://developer.chrome.com/docs/devtools/progressive-web-apps).

Desktop users receive concise browser permission guidance, with mobile steps
available as expandable help. Browser background restrictions, device power
saving and notification settings can prevent delivery on either platform.

## Local assets and verification

The manifest at `/manifest.webmanifest` uses `display: standalone` and local
MealQ Q icons at 192 and 512 pixels. The Apple touch icon is 180 pixels. These
follow the existing apricot-and-white Q brand and add no remote assets or
tracking. To regenerate them, run
`node frontend/scripts/generate-app-icons.mjs`; existing icon files are backed
up to the OS temporary directory before being replaced.

Frontend checks: `npm test`, `npm run lint`, `npm run build` from `frontend`.
The tests cover device support/standalone gating, local icon/manifest validity,
role-specific push endpoints, explicit email consent, truthful server errors
and logout cleanup. API/browser mocks do not prove physical iOS delivery. An
actual user-device check remains separate and must be recorded with its result.

## Actual acceptance — 19 October 2026

The user installed MealQ from Safari to the Apple Home Screen, launched the web
app, signed in and enabled device notifications. The root sent **one** test push
to that newly registered device. Apple Push accepted HTTP 201 at
**12:37:50.014 UTC / 19:37:50.014 Asia/Bangkok**. The user confirmed the notice
appeared while MealQ was closed and tapping it opened MealQ.

This records the actual tested Apple device flow, not every iPhone/iPad model
or OS version. Desktop Chrome was separately confirmed earlier. **Physical
Android delivery has not been tested.** No personal mailbox, password or device
endpoint is included in this record.

The user also confirmed receipt and approved formatting of **all four actual
order emails** across the dedicated customer and merchant Gmail-alias fixtures.
All four SMTP deliveries had already been accepted on their first attempt;
the human inbox confirmation is recorded separately from that server evidence.

The current release is `20261019-notifications-r2`, verified active at
19:39:17 Asia/Bangkok. Its web-only MIME correction makes the origin return
`200 application/manifest+json` for `/manifest.webmanifest`. The API container,
notification subscriptions and previous actual Apple/desktop results were not
changed by that patch. This does not add a physical Android test claim.
