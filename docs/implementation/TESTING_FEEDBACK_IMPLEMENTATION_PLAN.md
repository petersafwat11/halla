# Halaa Testing Feedback - Repository-Wide Implementation Plan for Gemini

Status: revised after review of Gemini's PR1/PR2 worktree changes; PR1 and PR2 are not merge-ready  
Baseline: `master` at `b2ab14b5` plus the current unstaged Gemini changes  
Source report: `Halaa App - Testing Feedback.pdf` (18 pages, 19 findings)

## 1. Goal and execution rules

This is the implementation contract. Fix each defect at its owning boundary and migrate every affected backend, shared, web, and mobile consumer in the same PR. A tested example screen is not completion when the same old implementation remains elsewhere.

Rules:

1. One user identity field: `name`. Do not retain a user-domain `username` field, request property, response property, UI fallback, index, generated value, fixture, translation key, or test.
2. One formatting implementation per semantic operation. Date-only values and instants have different semantics, but callers use the same exported `formatDate` API with an explicit contract.
3. Do not add aliases, dual-read/dual-write paths, deprecated exports, temporary response fields, or client fallbacks. Migrate data and consumers atomically.
4. When a finding exists on web and mobile, both clients are in scope. Shared and backend contracts must be changed first so clients cannot diverge.
5. Do not patch `Intl`, `Date.prototype`, or `Number.prototype` globally. Enforce usage with canonical helpers, explicit native-picker locale settings, and a repository guard test.
6. Do not infer success, prices, fulfillment state, quota, or dates in a client when the backend/store owns the truth.
7. A source-string assertion is only an architecture guard. User behavior requires behavioral/component/integration tests, and native rendering defects require signed-device evidence.
8. Never reset event form state after an error or timeout, and never show a full request UUID to a user.
9. Do not edit either source PDF or unrelated dirty files.

## 2. Merge review of Gemini PR1 and PR2

### Decision

Do not merge or split the current worktree changes as submitted. Preserve the useful work, then complete PR1R and PR2R below. The existing automated suites pass, but they prove the narrow patches rather than repository-wide completion.

### Blocking findings

| Priority | Finding | Current evidence | Required correction |
|---|---|---|---|
| P1 | PR1 changed only profile completion, not the identity model | `UserModel` still defines/indexes/searches `username`; auth/admin services generate it; shared schemas expose it; web/mobile settings, admin, events, tickets, messages, scripts, Swagger, and tests still read or write it. | Execute the `username -> name` data migration and delete the user-domain field and every consumer repo-wide in PR1R. |
| P1 | PR2 is not repository-wide | Web still contains raw `Intl`/`toLocale*` calls in event creation, post-event, host plans, payments, tickets, and admin tables. Backend email/export paths also format independently. | Migrate all application-owned formatting sites in PR2R and add a guard that prevents recurrence. |
| P1 | Shared date APIs remain fragmented | `parseCivilDate`, `formatEventDate`, and `formatDate` are all exported; the two date formatters have different defaults; `formatTemplateDate` parses and formats separately. | Keep one exported `formatDate`, keep `formatDateTime` for instants with time, make parsing private, delete the other export/callers. |
| P1 | Policy options can be overridden | `formatDate` and `formatDateTime` spread caller options after `calendar` and `numberingSystem`. | Strip/reject those policy keys or apply enforced values last; test attempts to override them. |
| P1 | Civil-date parsing accepts invalid dates and guesses semantics | Invalid dates can roll over, and UTC-midnight `Date`/ISO values are heuristically treated as civil dates. | Strictly validate `YYYY-MM-DD`; only a bare date string is civil. Treat `Date`, epoch, and ISO timestamp values as instants. |
| P2 | Support data is still duplicated and caller text is unbounded | Mobile contains a hardcoded WhatsApp fallback, legal contact has duplicate alias values, alerts are hardcoded, and `contextMessage` accepts arbitrary content. | One canonical contact value, shared pure URL/message builder, localized adapters, typed context, and behavioral tests. |
| P2 | F-14 was changed before it was reproduced | `resolveFontPatch` now forces all non-icon text to a Cairo family and neutralizes weight, but no signed-iOS before/after evidence exists. | Hold/revert the behavioral override, keep a dev-only specimen, reproduce on signed iOS, then make the smallest evidenced change. |
| P2 | Several new tests are source inspections | Support, badge, font, and date consumer tests can pass without rendering or exercising platform APIs. | Add mocked behavior/component tests and preserve only a small number of source guards for architecture boundaries. |

### Verification already run against the current worktree

- `shared`: tests pass (138/138); lint passes.
- `halaa-mobile`: full test suite passes; lint passes.
- `halaa-backend`: tests pass (475/475). Expected S3/SMTP test noise is present but the command exits successfully.
- `halaa-web`: tests pass (148/148); lint exits successfully with 31 warnings because its script permits up to 100 warnings.
- `git diff --check` reports one new blank line at EOF in `halaa-mobile/__tests__/regressions/iosEventDateTimePicker.test.js` plus line-ending warnings. Fix the EOF error before handoff.

Passing these suites is not approval to merge PR1/PR2 until the blocking rows above are closed.

## 3. Finding disposition

| Finding | Repository-wide disposition |
|---|---|
| F-01 phone login/signup | Existing shared input/normalizer architecture is correct; keep regression tests across web/mobile/backend contracts. |
| F-02 invisible username rules | Remove the user-domain concept entirely through migration plus API/schema/model/client cleanup. |
| F-03 dates 25-31 clipped | Keep the current native sheet, add component tests, and verify 25-31 on the smallest supported signed iPhone. |
| F-04 Gregorian shown as Hijri | One strict shared formatter, explicit picker locales, and migration of every web/mobile/backend display path. |
| F-05 slow/silent event save | Add one backend idempotency contract and resilient UX to both web and mobile event creators. |
| F-06 false file-too-large error | Align backend/proxy limits, normalize images consistently, expose error codes, and map them on both clients without clearing forms. |
| F-07 USD/SAR/total mismatch | Web uses the backend quote; native uses each store package's `priceString` and never invents a combined total. |
| F-08 purchase returns to catalog | Native uses a durable exact-item purchase queue. Web checkout uses the same typed completion destination. |
| F-09 Egyptian Arabic | Review the complete tested flow on web and mobile against Saudi-neutral copy; shared keys where practical. |
| F-10/F-13 inert support actions | One pure support-message/URL builder with web and mobile adapters, used by every support entry point. |
| F-11 invitation balance missing | One backend presenter and one shared DTO rendered on host web and mobile Home/Event Details. |
| F-12 custom-design tracking | Existing `Addon` is canonical; add backend transitions, admin queue, and host timeline on both clients. |
| F-14 Arabic glyphs lose dots | Evidence-first signed-device workflow; code change only after reproduction identifies the cause. |
| F-15 mixed numeral systems | One Latin-digit formatting policy migrated repo-wide; normalize localized input separately. |
| F-16 raw UUID in errors | One shared error presentation contract for web/mobile while logs retain the full ID. |
| F-17 badge shows zero | Harden parsing and add a rendered component test. |
| F-18 English Wedding prefill | Existing blank default is correct; lock it with a behavior test on both event-create clients. |
| F-19 cross-device purchase copy | Prove backend-ledger retrieval in integration/staging, then use precise account-sync vs Store Restore copy. |

## 4. PR sequence

### PR1R - Finish identity removal and support/correctness work

Scope: repair Gemini PR1; F-01, F-02, F-03, F-09, F-10, F-13, F-17, F-18.

#### 4.1 Delete the user-domain `username` architecture

Data migration:

1. Add `halaa-backend/scripts/migrate-user-name.js` with `--dry-run` and `--execute` modes.
2. For each user, trim `name`. If it is empty and `username` is non-empty, copy the trimmed value to `name`.
3. Emit counts only: scanned, copied, already named, invalid/empty, and unset. Do not print PII.
4. Abort execution if any active user would have neither a valid `name` nor a role-specific canonical display value such as vendor `brandName`. Produce an ID-only remediation report.
5. After validation, unset `username` from every user document. The script must be idempotent.
6. Run dry-run against a production-like snapshot before deploying. Deploy the migration, backend, shared package, web, and mobile contract change as one coordinated release. A payload containing `username` is rejected as an unknown field.

Backend cleanup:

- Remove `username` from `halaa-backend/models/UserModel.js`, its text index, virtual fallback, and search helpers.
- Remove it from auth/users/admin validation, controllers, services, serializers, `select`/`populate`, notification/payment/email data assembly, Swagger, account deletion, dashboard/events/post-event/messaging, seed/reviewer/maintenance scripts, and tests.
- Admin create-host/moderator/business/vendor contracts accept `name` only; stop generating timestamp-based usernames.
- Rename internal email/template data named `userName` to `recipientName` where it means a person's display name.
- Keep external protocol credentials only: SMTP environment credential names, Moyasar/basic-auth `username`, and explicitly named social handles such as `instagramUsername` are not user identity.

Shared/web/mobile cleanup:

- Remove `username` from `shared/src/schemas/auth.js`, `shared/src/schemas/settings.js`, defaults, DTOs, and exports.
- Remove every `name || username` and `username || name` fallback, form field, payload property, Zustand/auth snapshot property, table column, details label, translation key, test fixture, and assertion in both clients.
- Update web/mobile settings, admin host/moderator/vendor/business views, events, tickets, notifications, purchase/checkout displays, guest messages, and seed/dev tools to consume `name` or the correct role-specific field only.
- Add `test/no-user-username.test.js` (or one root script called by every workspace) that scans tracked source/config/test files. It must fail on user-domain `username` usage and use a narrow documented allowlist for external credentials/social handles and the migration script.

Required pre-edit inventory (save the complete output in the PR description):

```powershell
rg -n -i "username|userName|name\s*\|\|\s*.*username|username\s*\|\|" shared halaa-backend halaa-web halaa-mobile --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/coverage/**'
```

Acceptance:

- Migration dry-run and execute are repeatable; post-migration query reports zero documents containing `username`.
- Signup, login, profile completion/update, admin user creation/edit/search, event ownership, tickets, notifications, checkout email, and exports work with `name` only.
- API/OpenAPI/shared schemas contain no user identity `username`.
- Web and mobile render no `@username` or username field.

#### 4.2 Canonical support launcher on web and mobile

Files/ownership:

- `shared/src/legal/contact.js`: canonical approved contact facts only; remove duplicated alias values and migrate their consumers.
- New shared pure module, for example `shared/src/support/supportContact.js`: typed source enum, message-key/context validation, URL construction, and opaque-reference validation.
- `halaa-mobile/services/support/openSupportWhatsApp.js`: `Linking`/`Alert` adapter only.
- A web adapter used by all support/WhatsApp buttons and links.
- AR/EN locale resources for success/failure/accessibility copy; no hardcoded UI sentences in adapters.

Contract:

```js
buildSupportRequest({
  language: "ar" | "en",
  source: SUPPORT_SOURCE,
  reference: { kind: "event" | "addon" | "request", value: opaqueId } | null
}) -> { deepLinkUrl, webUrl, displayNumber }
```

Do not accept arbitrary `contextMessage`. Validate opaque references with length/character limits, and never include phone, email, guest data, receipts, tokens, or form content.

Behavior:

1. Mobile tries the WhatsApp deep link, then the HTTPS URL, then a localized actionable alert.
2. Web opens the HTTPS URL safely and presents localized failure feedback.
3. Managed-service Contact, mobile Home header chat, and every existing web/mobile support entry point call the same builder.
4. Add behavior tests mocking `Linking.canOpenURL`, `Linking.openURL`, `window.open`/navigation, and `Alert`; cover app success, web fallback, rejected opens, total failure, encoding, and redaction.

#### 4.3 Finish low-risk findings

- F-01: behavior tests for Saudi local/canonical phone forms on web/mobile plus backend normalization. Do not add another normalizer.
- F-03: keep `IosDateTimePickerSheet`; test valid 25/28/30/31 values and capture signed-iPhone evidence.
- F-09: audit the full tested create-event/support flow in both clients, change reviewed locale keys, and obtain Saudi Arabic sign-off.
- F-17: render `NotificationBell` and assert no badge for `0`, `"0"`, null, undefined, NaN, and negatives; assert values for 1, 99, 100.
- F-18: behavior tests confirm blank initial event name and no event-type side effect in web and mobile.

PR1R gate: the identity scan is clean, migration evidence is attached, support behavior passes on web/iOS/Android, all affected workspace suites pass, and the Saudi copy is approved.

### PR2R - One locale/date/digit architecture across the repository

Scope: repair Gemini PR2; F-04, F-14, F-15.

#### 4.4 Canonical shared API

`shared/src/utils/locale.js` owns application formatting. Its public API is:

```js
formatDate(value, locale = "ar", options = {})
formatDateTime(value, locale = "ar", options = {})
formatTime(value, locale = "ar", options = {})
formatNumber(value, locale = "ar", options = {})
formatCurrency(value, locale = "ar", currency = "SAR", options = {})
formatPercent(value, locale = "ar", options = {})
formatCount(value, locale = "ar", options = {})
normalizeDigits(input, options = {})
getDatePickerLocale(locale = "ar")
```

Implementation requirements:

1. Delete public `parseCivilDate`, `formatEventDate`, and `localizeDigits` exports. Delete `formatTemplateDate` and migrate all of its callers to `formatDate`; no second date parser or formatter remains.
2. `formatDate` recognizes only a strict bare `YYYY-MM-DD` string as a civil date. Validate year/month/day by round-trip, including leap years; invalid input returns `""` (or the existing documented invalid sentinel).
3. `Date`, epoch, and ISO timestamp inputs are instants. Do not reinterpret UTC-midnight instants as civil dates. API/event DTOs that mean a calendar day must serialize `YYYY-MM-DD` at the backend boundary.
4. `formatDateTime` is the instant-with-time formatter and does not use civil-date anchoring.
5. Arabic locale tag is `ar-SA-u-ca-gregory-nu-latn`; English is `en-US-u-ca-gregory-nu-latn`. Apply `calendar: "gregory"` and `numberingSystem: "latn"` after caller options, or reject those two caller keys, so they cannot be overridden.
6. Keep the current `formatCurrency(value, locale, currency, options)` argument order. Do not silently adopt the pasted plan's conflicting `(value, currency, locale)` order.
7. Remove stale Arabic-digit conversion constants/functions. `normalizeDigits` is input normalization only; display code uses the correct formatter.
8. `getDatePickerLocale` returns an explicit policy locale. Use it for every native date/time picker that supports a locale prop, then verify the actual iOS/Android widget output.

#### 4.5 Complete consumer migration

Inventory with `rg` before editing and save the result in the PR description. Migrate all application-owned calls, not only these examples:

```powershell
rg -n "formatEventDate|parseCivilDate|formatTemplateDate|localizeDigits|Intl\.(DateTimeFormat|NumberFormat)|toLocale(DateString|TimeString|String)" shared halaa-backend halaa-web halaa-mobile --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/coverage/**'
```

- Web: `utils/date/useLocalizedDate.js`; create-event `Summary.js`, `StepFour.js`, `WhatsappPreview.js`; post-event `PublishedView.jsx`/`PostEventContent.jsx`; event detail/subscription/reminders; host dashboard/staff/plans/checkout; business checkout; all admin event/host/moderator/vendor/business/discount/payment/ticket tables, cards, details, and modals.
- Mobile: all event create/edit/preview/detail cards; Home/admin/business/vendor/ticket/payment/plan metrics; all native picker locale props; remove display calls to `localizeDigits`.
- Backend: messaging/RSVP/scheduled-task copy, auth/event emails, exports, and any user-visible date/number/currency. Technical logs may keep machine ISO timestamps and raw numbers.
- Shared: date/template/token helpers and all tests/exports.

Do not install a runtime locale policy and do not modify global constructors/prototypes. Third-party components receive explicit locale/options through their supported props; if one cannot honor the policy, wrap that specific component and test it.

#### 4.6 Repository enforcement and tests

Add an architecture test that scans tracked JS/JSX/TS/TSX source and fails on application-owned:

- `new Intl.DateTimeFormat` and `new Intl.NumberFormat`;
- `.toLocaleDateString(`, `.toLocaleTimeString(`, and display-oriented `.toLocaleString(`;
- deleted formatter imports/exports.

Allow only the canonical shared formatter implementation and narrowly documented technical/third-party adapters. The error must print file and line.

Test matrix:

- civil dates: leap day, invalid leap day, 25/28/30/31, month/year boundaries;
- timezones: UTC, Cairo/Riyadh, and a negative offset; civil dates never shift, instants do shift according to the requested timezone;
- caller attempts to set `calendar: "islamic"` or `numberingSystem: "arab"` cannot change policy;
- Arabic/English output uses Gregorian meaning and ASCII digits;
- preview, event detail, web invitation, backend email, WhatsApp/RSVP message, and export preserve the same source date meaning;
- numbers, currency, counts, and percentages use Latin digits and correct BiDi isolation;
- localized input digits are accepted by `normalizeDigits` without modifying arbitrary prose/user content;
- server-rendered and hydrated web output match.

#### 4.7 F-14 evidence gate

1. Keep a deterministic dotted-Arabic specimen for weights 300/400/500/600/700/900, inputs, buttons, modal text, multiline text, and the originally reported components.
2. Register it only under `__DEV__`/test-build gating and make it reachable through a documented dev route/deep link.
3. Revert/hold the new production `resolveFontPatch` behavior until the defect is captured on the latest signed iOS build.
4. If named Cairo family plus `fontWeight` is proven to trigger synthesis, neutralize only the conflicting styles while preserving explicitly loaded families, intended weights, and icon exemptions. Add component snapshots plus before/after signed-device captures.
5. If the defect does not reproduce, close it with evidence and no font behavior change.

PR2R gate: the raw-formatting scan is clean, all clients/backend use the canonical API, date semantics and SSR parity pass, native picker and signed-iOS evidence are attached, and no deleted export remains.

### PR3 - Event creation resilience on web and mobile

Scope: F-05, F-06, F-16.

Backend contract:

1. Require `Idempotency-Key` on every host/admin event-create request. Bind it to authenticated actor + operation + canonical payload fingerprint, persist the terminal response, and reject same key/different payload with 409.
2. Define retention/cleanup and concurrency behavior; simultaneous duplicate requests create exactly one event and return the same result.
3. Return stable error codes such as `EVENT_IMAGE_TOO_LARGE`, `EVENT_IMAGE_UNPROCESSABLE`, `EVENT_CREATE_TIMEOUT`, and field validation codes. Include full `requestId` for telemetry, not display.
4. Record privacy-safe stage durations for validation, image handling, event write, guest write, and response assembly. Never log form/guest contents.
5. Verify backend and production reverse-proxy multipart limits are aligned.

Web/mobile clients:

- Build fresh `FormData` for every network attempt from preserved form/domain state; never reuse a consumed multipart body.
- Generate one idempotency key per logical submit and reuse it only for retry of the identical payload. Editing any field starts a new logical attempt/key.
- Guard double taps/clicks, show honest elapsed/slow state rather than fake progress, allow retry after failure, and clear state only after confirmed success.
- Normalize image paths against a shared documented client target below the server/proxy maximum; test generated/default, baked template, normal custom, compressible oversize, and irreducible oversize paths.
- Add one shared error presenter used by both clients. It maps code/status to localized action text and derives a 12-character uppercase support reference from the full ID. Full IDs remain in logs/Sentry.
- Web files include the host/admin create-event wizards, `halaa-web/hooks/events/mutations/useEventCrudMutation.js`, request/error services, and their tests. Mobile files include both host/admin creators, event mutation/builder, image/canvas utilities, and tests.

PR3 gate: web/mobile retry and concurrency tests create one event, every image path has deterministic feedback, forms survive all failures, and no full UUID is rendered.

### PR4 - One invitation-balance contract on web and mobile

Scope: F-11.

Canonical backend DTO:

```js
invitationBalance: {
  unlimited: boolean,
  base: number | null,
  compensation: number | null,
  consumed: number,
  total: number | null,
  remaining: number | null
}
```

Implementation:

1. Create one pure backend calculator/presenter and use it in dashboard, subscription info, event detail/stats, send/resend gating, admin views, and add-on quota changes.
2. Add a dry-run/execute migration that stamps every event with its canonical subscription/plan reference and reports orphaned records by ID. Resolve/quarantine orphaned data before switching reads.
3. Switch all APIs and clients to `invitationBalance` in one release, then delete `quota.remainingInvites` and every duplicate quota calculation.
4. Add a shared DTO/schema and a reusable host card for both web and mobile Home and Event Details. Show remaining prominently, used/total secondarily, and explicit unlimited copy.
5. Keep RSVP state counts separate. Show Add More only when the canonical catalog/account says it is purchasable and use a typed return destination.

Tests cover base + compensation - consumed, add-on pool increases, zero, unlimited, event-stamped plan, orphan rejection, concurrency with sends/refunds, DTO parity, and host/admin authorization.

PR4 gate: Home, Event Details, API consumers, and send gating on web/mobile derive the exact same values from the one presenter, and old quota fields/calculators are absent.

### PR5 - Price integrity, exact native purchase queue, and completion routing

Scope: F-07, F-08, F-19.

Web/Moyasar:

1. Render plan, add-ons, discount, total, currency, and expiry exclusively from `POST /payments/quote`.
2. Submit the exact `quoteId`/metadata; refresh an expired/changed quote and require review before charge.
3. Use a typed, allowlisted completion destination for Plans, event gate, or invitation balance.

Native IAP:

1. Resolve every selected canonical catalog code through RevenueCat and display each package's `priceString` verbatim.
2. Hide SAR backend add-on prices on native, never add VAT to store prices, and do not display a combined total across separate store sheets.
3. Persist a versioned account-bound queue before purchase. Each exact item transitions through pending, purchasing, reconciling, fulfilled/cancelled/manual-review/failed; only one may be active.
4. Advance only after exact transaction/catalog reconciliation. Network loss after store success remains reconciling with Do not purchase again copy.
5. Queue mode shows only the exact next selected item, position X of N, and store price. It does not show the general catalog.
6. Resume safely after cancellation, app kill, network loss, and same-account sign-in. Never continue another account's queue. Store no receipt/PII payload locally.
7. On completion invalidate all affected queries and navigate to the validated origin destination.

F-19 proof/copy:

- Integration test purchase/reconciliation, then a fresh session for the same Halaa account and a negative different-account session.
- Copy states that account entitlements synchronize after sign-in, consumables do not reappear through Store Restore, and support can investigate an unsynchronized completed charge.
- Validate every product/offering and `priceString` with Saudi App Store/Google Play sandbox accounts.

PR5 gate: web quote integrity passes; every native item has an exact durable queue state; interruptions resume without duplicate entitlement; two-device staging proof is attached.

### PR6 - Real custom-design fulfillment on backend, web, and mobile

Scope: F-12. `Addon` remains the source of truth; do not create another order collection.

Backend:

- Add fulfillment timestamps/updater/expected delivery/customer-safe note to design-template add-ons; top-level `Addon.status` remains canonical.
- Allowed sequence: `paid -> queued -> in_progress -> fulfilled`; same-state requests are idempotent; skipped/reversed transitions return 409. Cancellation requires the explicit refund/policy path.
- Add paginated/filterable admin list and transition endpoints with service-level type/state/role validation, atomic timestamping, audit events, and post-commit notifications.
- Set `requestedAt` on paid creation. Derive `expectedDeliveryAt` only from an owner-approved SLA.
- Add a repeatable dry-run/execute backfill using `createdAt` as requested time without inventing progress.

Web and mobile:

- Add an admin fulfillment queue to both admin clients wherever those roles are supported. Show order reference, tier, requested/expected time, current state, and only the valid next action.
- Add a host timeline/detail surface to both clients. Render actual API timestamps, never mark future steps complete, show expected delivery only when present, and expose order-specific support with the opaque add-on reference.
- Keep refund/manual-review state distinct from fulfillment.

Tests cover valid/idempotent/invalid transitions, authorization, non-design rejection, pagination, audit/notification failure behavior, repeatable backfill, web/mobile query invalidation, and exact timeline rendering.

PR6 gate: an authorized admin transition changes persisted state; both host clients show that exact state/timestamp after refresh; audit and notification records exist.

## 5. Full release gate

Automated checks from `D:\halla`:

```powershell
git diff --check

Set-Location shared
npm test
npm run lint

Set-Location ..\halaa-mobile
npm test
npm run lint

Set-Location ..\halaa-web
npm test
npm run lint
npm run build

Set-Location ..\halaa-backend
npm test
npm run catalog:verify
```

The web lint script currently permits 100 warnings and the reviewed baseline has 31. Each PR must introduce zero new warnings and lint every changed web file with `--max-warnings 0`; warning-baseline cleanup can be a separate mechanical commit.

Run the complete Arabic journey on the latest signed iOS build, then critical billing/picker/support cases on Android and web:

1. Fresh and migrated accounts complete every identity/settings/admin flow using `name` only.
2. Select dates 25/28/30/31 on the smallest supported iPhone; compare form, preview, detail, web invitation, message, email, and export.
3. Verify Gregorian dates and Latin digits across host/admin web and mobile surfaces.
4. Exercise generated, normal, near-limit, compressible, and invalid/oversized images; simulate slow response, duplicate submit, timeout, and retry.
5. Exercise every support entry point and all badge edge cases.
6. Capture the Arabic font specimen at all loaded weights and the originally affected screens.
7. Validate Saudi storefront prices, base-only and multi-item purchases, cancellation, app kill, lost network, duplicate reconciliation, and second-device account retrieval.
8. Verify invitation balance parity and advance a purchased design through the admin queue to the host timeline on web and mobile.

Attach build/commit, device/OS/browser/storefront, migration dry-runs/results, automated command output, screenshots/video for device findings, short user support references, and private backend audit/reconciliation IDs.

## 6. Gemini reporting format

For each PR, Gemini must report:

1. Exact scope and owner/configuration gates.
2. Pre-edit inventory command/results proving all affected consumers were found.
3. Files changed and deleted exports/fields/contracts.
4. Migration dry-run/execute results and deployment order where applicable.
5. Targeted and full commands with exact pass/fail/warning counts.
6. Automated evidence separately from device/store/manual evidence.
7. Remaining blockers. A diff or passing narrow test alone does not mark a PDF finding complete.
