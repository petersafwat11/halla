# Azure Maps review — 8 September 2026

## Outcome

Reviewed the Azure migration across backend, shared renderer, web picker, native picker, event persistence and build configuration. Refactored provider HTTP handling out of the general locations controller into dedicated routes, controller and validation. Web rendering, session lifecycle and selection/search state now have separate hooks/services. Web and native share a literal map runtime and a session-renewal manager.

Production deployment and signed Android/iOS device testing remain outstanding. Build/export success does not establish permission behavior, WebView lifecycle or offline recovery on real phones.

## Corrections

- Isolated 30-minute render tickets from login credentials; validated tickets, fixed upstream paths/tilesets, safe upstream failures, separate per-user search/session/render quotas, and non-cacheable search/session responses.
- Coalesced session refresh, renewed before expiration and on foreground, retried transient failures, and cancelled work on disposal.
- Kept the WebView runtime as a literal string: compiled Hermes cannot reliably serialize executable function source. Escaped script-breaking configuration and integrity-pinned Leaflet assets.
- Cancelled/ignored obsolete search, reverse lookup and device-location results. Editing a search clears the previous selected address; confirmation cannot accidentally save the old venue. Manual addresses retain no stale coordinates.
- Kept suggestions from covering the manual-address action and delayed outside-click dismissal until the target can activate. Added keyboard selection highlighting, localized map controls and readable selected-address text.
- Preserved exact dropped-pin coordinates and existing event-location objects. Mongoose rejects half-populated coordinate pairs while accepting manual addresses with both coordinates absent.
- Added the provider build flag to CI and Compose, and pinned Leaflet sources to the report-only CSP. Defaults retain the existing provider until deployment configuration explicitly selects Azure.
- Fixed a separate issue found during the real event flow: an already-failed invitation image could hang Save indefinitely. Failed images now reject immediately; pending loads have a 15-second timeout and release listeners.

## Verification

- Backend: **577 tests passed**, including authenticated map-route behavior, independent quotas, render-ticket isolation, upstream/path/coordinate validation, event validation and persistence schemas.
- Web: **216 tests passed**, including obsolete-request handling, manual address selection, form reset, debounce cancellation and failed invitation-image loading.
- Mobile: **540 tests passed**.
- Shared map runtime/session: **3 tests passed**.
- A fresh Next production build passed, including the latest shared renderer; a standalone-server browser smoke test was also performed. Targeted JSX/hooks lint passed. Existing unrelated repository warnings remain.
- The Azure master key was absent from all **457** checked client build files. The live API rejected unauthenticated session, search, reverse and render requests with HTTP 401.
- Expo Android and iOS Hermes exports passed, as did the Expo web export. These are bundle checks, not signed native builds or device tests.

### Real browser test

Used the existing seeded host through the real local web app and API, with the live Azure resource and configured database. The test process used the production-style local media driver because the developer S3 credentials were stale. The scheduler and outgoing notification methods were disabled only in this temporary test process.

Created `Azure Maps QA 2026-09-08` (test event ID `6aa03bb347b492678a11188a`) with one test-only guest and a generated QA card. Checked English venue search, keyboard selection, live tiles/attribution, pin dragging, event summary, save and reopen. Database verification confirmed provider `azure` and the exact dropped pin `(21.601934952991385, 39.113129434412876)`.

Edited the event to a manual address, saved and verified both database coordinates were null. Then searched/select/saved Jeddah Hilton in Arabic. Checked the picker at a 390 × 844 viewport and restored the viewport afterwards. No invitations or test messages were sent; invitation consumption remained zero. The test event was kept unscheduled throughout testing.

After verification, the test event was soft-deleted through the normal event service, releasing its seeded-host event slot. Temporary local servers and browser tabs were closed. Existing user events, accounts and unrelated work were preserved.

## Release steps

Follow [AZURE_MAPS_MIGRATION.md](./AZURE_MAPS_MIGRATION.md). Configure the secret and backend first, then the website build flag, then preview native binaries. Verify both real device platforms before enabling the production mobile flag. Legacy installed clients still need their Google endpoints/configuration during the transition. Usage budgets/alerts have not been configured.
