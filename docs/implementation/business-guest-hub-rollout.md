# Business Guest Hub — implementation and rollout

The implementation uses `/{lang}/business-invitation/{code}`. Business WhatsApp templates have a guest URL in the body and **zero buttons**, across all three invitation modes. Personal templates keep their existing WhatsApp reply behavior.

## Delivered

- Step 1 has no separate cover upload on web or mobile, including administrator-created events. Business events still require the account logo; hosts can open settings and refresh it without discarding the form.
- The final Step 3 invitation image is shared by WhatsApp and the guest hub. Both use the same resolver: `visualTemplate.bakedImagePath`, then the existing `templateImage` fallback. Logo and business name remain account snapshots.
- The guest page displays the whole invitation at its natural proportions, with responsive width and automatic height. It has no cover crop or overlapping details. Business identity and the event/RSVP card are separate from the artwork. Arabic RTL/English LTR, response changes, loading/error/closed states, and server-issued QR passes remain supported.
- Legacy `branding.coverImageKey` remains in the schema for existing records and storage cleanup only; it is neither required nor displayed. Creation stores only the invitation `templateImage` upload. For older mobile clients, the legacy `coverImage` multipart field is accepted and discarded before storage; it never becomes guest-page artwork.
- Business entry QR uses a signed entry credential distinct from the invitation URL code. The scanner checks current confirmation and invitation mode. Old raw business invitation codes are not valid entry passes.
- Business RSVP uses revision-based optimistic concurrency and existing idempotency infrastructure; omitted optional values are retained. The business WhatsApp response handler ignores stale button/text replies.
- Server-generated Google Maps/Uber action URLs and calendar data. ICS contains start time only; Google Calendar gets a one-hour editable calendar default. Neither adds an event end-time field. Careem is not enabled.
- Delivery-aware template assignment/catalog filtering, all-mode compatibility, body URL mapping, and validation for verified zero-button business templates.
- Initial/test/new-guest/resend/reminder/SMS paths use business URLs. Information-only business SMS also includes its link. Existing reminder audience rules remain unchanged.
- Private page/API headers, generic metadata, noindex, no persistent guest query cache, local QR rendering, and reverse-proxy privacy headers. Existing business web links redirect to the hub; the updated mobile app opens old business links in the browser.
- Additive dry-run migration and automated backend/browser verification scripts.

## Required production preparation

1. Obtain approved Meta/Taqnyat zero-button business templates for the launch languages and invite/reminder purposes. Use mode-neutral wording. A dynamic URL **button** template is incompatible.
2. Sync provider definitions in template administration. Assign `deliveryMode: portal_link`, the relevant purpose/category, and map a real body placeholder to `invitation.url`. The admin form assigns all three compatible invitation modes. Reminders are category-independent and require an active template for the appropriate account type (personal or business).
3. Verify an actual approved template's delivered body link on test devices. Automated tests stub the provider; they do not demonstrate Meta approval or WhatsApp clickability.
4. Run the migration report against the intended database:

   ```text
   node scripts/migrate-business-guest-hub.js
   ```

   Review unknown owners and incompatible selected business templates. The report emits counts only. After review, apply delivery snapshots:

   ```text
   node scripts/migrate-business-guest-hub.js --apply
   ```

   The migration does not overwrite branding or automatically assign templates. Its report counts business events without invitation artwork. Events without artwork still show their identity and event details.
5. Deploy the backend, web app, proxy headers, and updated mobile client together with the reviewed template assignments. Confirm configured frontend origin, storage driver, and JWT secret. Existing deployed clients can require an update to handle old app-intercepted business URLs.
6. Verify iOS/Android link opening from WhatsApp with and without Halaa installed, camera QR scanning, Apple/Outlook/Google calendar import, and Uber navigation/fallback on physical devices. Automated desktop-browser tests cannot verify native app handoff or calendar applications.

## Current image-change verification (2026-09-11)

- Focused backend tests: 12 passed; web suite: 242 passed; mobile suite: 564 passed; web production build passed.
- Full backend suite: 640/641 passed. The unrelated architecture guard in `no-user-username.test.js` flags URL credential checks in `paymentLinks.service.js`.
- An isolated browser layout fixture using the new stylesheet preserved the full portrait image at 390px and 1440px with no horizontal overflow. This was not a full application or physical mobile-device test.
- No deployment or production data changes were performed for this image change.

## Earlier verification (before the image change)

- Backend full suite: 566 passing tests after review, including business contract, cover, HTTP routes, RSVP/check-in concurrency, and messaging-path integration tests.
- Web full suite: 211 passing tests.
- Mobile full suite: 540 passing tests. Changed mobile JSX parses successfully; native builds/device tests are separate release checks.
- Next.js production build passes, with existing unrelated lint/metadata warnings.
- Browser harness: 202 assertions passed across 12 language/mode/layout scenarios, with additional 320px checks. It uses fabricated guest data and mocked guest API responses. It exercises AR/EN, desktop/mobile, all three modes, confirmation/reload/decline, uncertain writes, rejected writes, failed follow-up reads, saved fields, closed/preview/invalid states, calendar downloads, menu placement/keyboard controls, metadata/headers, and horizontal overflow. Screenshots are saved under `docs/evidence/business-guest-hub/`.
- Migration smoke check against an isolated in-memory database: dry-run leaves records unchanged, apply sets eligible delivery snapshots, and repeat apply makes no further changes.

Run focused backend checks:

```text
node --test test/business-guest-hub.test.js test/business-guest-rsvp.integration.test.js
```

Run the browser harness against a local production web server (Playwright with Microsoft Edge by default; override `BROWSER_CHANNEL` if needed):

```text
node scripts/test-business-hub.cjs
```

Set `BUSINESS_HUB_BASE_URL` to the local test server (default `http://localhost:3120`). Set `PLAYWRIGHT_MODULE` to an installed Playwright module path if it is not resolvable normally.

## Rollback

Keep the guest route and pass verification available for links/passes already issued. Pause affected scheduled business dispatches if rollout is halted. Never substitute personal button templates for incompatible business templates. Schema and migration changes are additive; existing personal delivery snapshots remain unchanged.

No production migration, external template submission, real guest messages, or deployment was performed as part of local implementation.
