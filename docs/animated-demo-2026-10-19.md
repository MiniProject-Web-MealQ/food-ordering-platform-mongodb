# MealQ animated usage demonstration

The public `/demo` page teaches one complete pickup order through synchronized customer and merchant screen illustrations. It is reachable from both the landing hero and the “ใช้งานอย่างไร” section. It does not require login or mount the customer/merchant data providers. The miniatures are illustrations rather than real checkout or store controls; they make no API requests and write no account, order, Wallet, storage or notification data.

## Story and controls

The 12 scenes last **83 seconds at 1×**: login, choose a restaurant/menu, customize, inspect cart, self top up Wallet Demo, pay with Wallet Demo, receive a queue/new merchant order, merchant confirmation, preparation, ready notice, merchant verification of the pickup code/QR, and completion on both sides.

The fictional order uses the same identifiers and prices throughout: queue 024, pickup code 4826, food 65 + sample fee 5 = 70. The Wallet example starts at 0, tops up 100 and retains 30 after payment. The merchant is already approved/open in this illustration; the opening scene explains that prerequisite. The completion still follows the existing merchant code/QR confirmation flow, as explicitly selected by the owner. No customer confirmation endpoint or production workflow was changed.

Playback starts only on an explicit Play click. Controls support pause/resume, previous/next, direct chapter selection, restart, 0.75×/1×/1.5×/2× speed and customer/merchant/both views. Seeking pauses for reading; the final scene stops rather than looping. Hiding the tab pauses playback. Decorative SVG/CSS motion stops when paused and is disabled for reduced-motion preferences. Captions and a polite stage announcement describe the visual example; simulated form elements are noninteractive and hidden from assistive technology to avoid fake controls.

All food artwork, pointers, tickets, code examples and styles are local project assets. The demo is lazy loaded, including its own CSS, and the miniature CSS uses `demo-ui-*` names under its `mealq-demo-device` root to avoid conflicts with the player.

## Verification

- Frontend suite: **38/38 passed**, including 12 new story/playback checks for pause/resume, boundaries, speed changes, final stop, price consistency and merchant pickup verification.
- Full frontend ESLint and production build passed.
- A compiled React server-render check rendered **all 24 role/scene combinations** and the public demo page, checked both displayed pickup codes and verified that miniature controls remain noninteractive. This is a render check rather than an interactive browser or visual test.
- Browser automation for this app's origins was already denied by saved permissions; no browser, port or proxy workaround was used. Public HTTP/asset checks are recorded separately from browser acceptance.
- Before editing, existing route/landing files and `frontend/dist` were copied into `C:\Users\game_\MealQBackups\source-before-public-demo-20261019T195404`, with a SHA-256 manifest.

## Deployment scope

This change builds and activates only the MealQ web image. The immutable release retains the prior source and web image for rollback, pins the running API image, and keeps the existing database, Tunnel, other projects and router ports. Activation requires a fresh verified MealQ backup and records the prior release, environment and container identities. No seed, real payment, order, email or push acceptance send is part of deploying the demo.

The final release `20261019-demo-walkthrough-r2` is active. Its safety record is `/home/linapspi4/mealq-app/shared/backups/activation-20261019-demo-walkthrough-r2-20261019T131053Z-258067`; the preactivation full backup is `20261019T201059+0700-258412`. The intermediate demo release is also retained. The corrected customer screen distinguishes “waiting for merchant confirmation” from “merchant has confirmed” instead of showing the earlier waiting copy in both scenes.

External HTTPS verification at approximately **20:12 Asia/Bangkok** confirmed `/demo` serves the tested index, and the demo JS/CSS bytes match the local production build. `www.mealq.site/demo?from=walkthrough` returns 308 to the primary domain while preserving the path/query. API health reports a connected database, Muaysart returns HTTP 200, and Caddy/cloudflared remain active. API, database, Tunnel and Muaysart container IDs/start times match their preactivation values.

Tested production asset hashes:

| Asset | SHA-256 |
| --- | --- |
| `index.html` | `015baa416755b6d7a0428dc91fcbdcb861a9fc2a5ea7f8c901a0b7a21b38557b` |
| `demo-DEFcxajH.js` | `79f3f24f9eca8cac6be81050ff1158ae2abd320278479efafc1ab46d6c6fe77b` |
| `demo-BkELFW3C.css` | `d48074b8db7b70db2fdda6d3f181e61c82f621afb025be426f831f11d659403d` |

Post-deployment snapshot `20261019T201235+0700-259572` completed on the Pi and was copied to `C:\Users\game_\MealQBackups\20261019T201235+0700-259572.mealq` with encryption. The snapshot contains 20 collections / 190 documents / 32 files; gzip, SHA-256, HMAC and in-memory decryption checksum checks passed. Previous snapshots, source releases, images and activation records were retained. No restore or cleanup was performed.
