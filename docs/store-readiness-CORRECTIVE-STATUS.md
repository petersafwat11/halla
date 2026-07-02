# Halaa corrective store-readiness status

**Release verdict:** `NO_GO`  
**Allowed states:** `NOT_STARTED`, `IMPLEMENTED_UNVERIFIED`, `UNIT_VERIFIED`, `INTEGRATION_VERIFIED`, `ARTIFACT_VERIFIED`, `SANDBOX_VERIFIED`, `CONSOLE_VERIFIED`, `ACCEPTED`, `BLOCKED_NEEDS_OWNER`.

Update evidence links and `Last verified` on every state change. A task reaches `ACCEPTED` only after the specialized plan’s acceptance gate passes.

> **Decision-row note:** decision rows (`DEC-*`, `PRICE-OWNER`) use decision-status
> tokens — `BLOCKED_NEEDS_OWNER` (open) or `RESOLVED (Dx)` (closed by a signed owner
> decision) — which sit alongside, not inside, the implementation-state vocabulary.

## Phase-0 update — 2026-06-28 (decision + baseline session)

- **Catalog counts proven from source** (no DB connected): stack is six-tier / **34
  plans** (`plans.js:26`, `planDefaults.js:223`, `seedPlans.js:52`), add-ons **22**
  (`addons.js`). Signed ten-tier (54) lives only in `plans-rewrite-2026-05.md`; the
  reduction was an unratified by-product of commit `64b5b1dd`. See
  `store-readiness-DECISION-RECORD.md`.
- **Baseline captured** → `docs/evidence/store-readiness/BASELINE.md`. New result:
  **web production build SUCCEEDS** (Next 15.5.18, warnings only) — previously "no
  build proof." Tests 17/17, lints pass, Expo Doctor 18/18, audits 0 / 2 / 20 moderate
  (no non-breaking fix path).
- **Decisions adjudicated (draft):** DEC-02 resolved by D8; recommendations recorded for
  the rest. Owner-gated items DEC-01 / DEC-03L / DEC-04-transfer / PRICE-OWNER were sent
  to the owner as a decision form.

### Owner sign-off — 2026-07-01 (all Phase-0 decisions RESOLVED)

The owner signed every Phase-0 blocker (full text in transcript; recorded in
`store-readiness-DECISION-RECORD.md` ★ block):

- **DEC-01 → keep six-tier / 34 plans**, explicitly superseding the ten-tier signoff;
  store products come from the current backend/DB/web catalog + current add-ons.
- **DEC-02 / MOB-04 → first self-serve business purchase allowed on BOTH web and
  mobile**; compare current plan by exact code (not `planType`).
- **DEC-03 / DEC-03L → design templates = single-use managed service requests,
  non-refundable from creation**, no restore obligation.
- **DEC-04 → "Keep with original App User ID"** (no auto transfer, no dual access).
- **PRICE-OWNER → current catalog & prices final** (no ten-tier mapping; Saudi VAT 15%).

Catalog is now **frozen at six-tier / 34 + 22 add-ons**. `CAT-01`/`CAT-02`/`CAT-03`
are unblocked and proceed **from the current catalog**. Immutable SKU creation is still
a later, separately-scoped step (build + review the manifest first).

### CAT-01/02/03 update — 2026-07-01 (canonical catalog session — implemented + unit-verified)

The machine-readable canonical catalog is built and validated with **no DB, provider,
or credential access**:

- **Canonical source** — `labbe-backend-/src/shared/commerce/` (`catalog.schema.js`
  Zod contract · `catalog.overlay.js` signed store overlay · `buildCatalog.js`
  derivation from `planDefaults.js` + `addons.js`). Placed in the backend (CJS) rather
  than billing-plan §0.2's suggested `shared/commerce/` because the backend does **not**
  import the ESM `@halla/shared` workspace (verified: 0 imports); a CJS→ESM runtime
  bridge would be fragile. Web/mobile stay API-driven and do not consume this module.
- **Generated artifacts** (reproducible via `npm run catalog:generate`) —
  `labbe-backend-/src/shared/commerce/storeCatalog.generated.json` (manifest) +
  `docs/evidence/store-readiness/generated/*.md` (SKU matrix, Apple map, Google
  product/base-plan map, RevenueCat offering/package/entitlement map, AR/EN metadata
  inventory, expected-count report). **All external identifiers are PROPOSED**
  (`com.halla.<code>`) — no Apple/Google/RevenueCat products were created.
- **Counts proven by contract tests** — 34 DB plans, **32 store-eligible plans**,
  **22 add-ons**, **54 proposed products/platform**, 2 internal (trial+unlimited),
  0 trial/unlimited store products, six-tier only (no 250/300/350/400).
- **Runtime consumer** — `revenuecat.service.js` `parsePlanMap`/`parseAddonMap` now
  layer the generated proposed maps **under** the `REVENUECAT_PRODUCT_PLAN_MAP` /
  `REVENUECAT_ADDON_PRODUCT_MAP` env overrides (env wins); unmapped-product →
  dead-letter semantics unchanged. This is a map-source swap only — **not** webhook
  state-machine work (that stays BILL-01/03, Session 2).
- **Drift gate** — `npm run catalog:verify` (Zod validate + deterministic regenerate +
  fail-on-drift + 25 contract tests); credential-free and DB-free.
- **Stale cleanup** — removed the "54 entries"/"54-plan" comments at `planDefaults.js`
  and `seedPlans.js` (DECISION-RECORD follow-up).
- **Tests** — backend `npm test` = **42/42** (17 pre-existing + 25 new catalog contracts).

**Documented non-blocking ambiguity — business_customization store type.** SIGNED
DEC-03 says "unchanged managed service" (silent on store type); DECISION-RECORD §D.4
*recommends* "non-consumable / 1-per-org"; the prior SKU-matrix said "consumable".
Resolved as **consumable** (a non-consumable owes Apple Restore Purchases, but there is
no restorable digital entitlement — it is a service — so non-consumable is
self-contradictory; "consumable" also matches the signed single-use design-template
shape and the prior SKU-matrix). We deliberately did **not** add the §D.3 one-per-org
guard (new commercial behavior "unchanged" forbids — Session-2+). Its refund stays
**distinct** from design templates: `managed_service_legal_review`, not
`non_refundable_from_creation`.

### Session 2 — Backend billing lifecycle, entitlements, fulfillment (2026-07-01, no DB/provider)

Implemented the RevenueCat billing engine as a reducer-driven, idempotent, lineage-scoped state machine, unit- AND integration-verified against an **ephemeral local MongoMemoryReplSet** (real transactions + unique-index dedupe; the shared `halaa-staging` cluster was never touched; the RevenueCat subscriber snapshot is stubbed — real provider/sandbox proof is still pending).

- **Catalog integrity (§1).** Manifest now carries `catalogVersion`/`catalogHash`/`entryCount` (`catalog.integrity.js`); `commerce.getCatalogIntegrity()` fails closed on a missing/corrupt/hash-mismatched manifest. New strict `catalog.resolver.js` layers env overrides only when valid — rejects invalid JSON, unknown codes, cross-type mappings, canonical conflicts, and duplicate cross-map ids (closes the P0-14 silent-`{}` path). Catalog version/hash is stamped on billing readiness AND every durable event/entitlement/add-on record.
- **Strict envelope (§2).** `revenuecat.envelope.js` validates api_version / event id+type / app id / environment / store / app-user-id / transaction ids / product↔type compatibility / exact recurring entitlement / catalog availability, classifying every authenticated event as accept | ignore | dead_letter (distinct `catalog_unavailable`). Payloads are normalized into typed columns at ingest and stored **redacted** (`revenuecat.normalize.js`) — no receipts/tokens/subscriber PII.
- **Atomic processing + replay (§3).** Durable insert → atomic lease claim (`processing`/`leaseOwner`/`leaseUntil`, mirrors `cronLease`) → transaction-safe execution → resolution history. Concurrent duplicates grant exactly once; a live lease returns 500 so RevenueCat retries after lease expiry — **RC-retry-after-lease-expiry is the LIVE reclaim path**. A `reclaimStuckLeases()` sweep is implemented + tested (index `{processing,leaseUntil}` present) but **not yet wired to the reconcile cron tick** (defense-in-depth, deferrable). Staff dead-letter list/inspect/replay/resolve endpoints gated by `requirePageAccess(ADMIN_PAGES.PAYMENTS,'manage')`. Stale payment static-check #12 updated (+ two dormant script bugs unmasked & fixed) → **18/18**.
- **Pure reducer (§4).** `revenuecat.reducer.js` — DB-free, exhaustive over all event types + cancel-reason branches + snapshot-failure + out-of-order; 38 unit tests.
- **Canonical snapshot + lineage (§5).** `revenuecat.api.js` distinguishes unavailable (retry, never revoke — P0-08) from 404; recurring state scoped to the ONE configured entitlement (P0-09); `revenuecat.lineage.js` locates state by transaction/original-transaction/product lineage (never "first active sub"). Purchased-currency amount+currency preserved; USD kept separate (P0-05).
- **Exact reconciliation (§6).** `POST /revenuecat/reconcile-exact` returns deterministic pending|fulfilled|active|consumed|superseded|refund_required|refunded|manual_review|failed for the EXACT attempted item — never success from unrelated access (P0-02). GET `/reconcile` shape preserved for mobile.
- **Event entitlements (§7).** One durable grant per provider txn; race-delivered packages recorded + routed to `manual_review` (non-blocking, fixes P0-03); refund-before-use revokes + keeps audit; `event-preflight` endpoint.
- **Add-on fulfillment/reversal (§8).** First-class unique `providerTransactionId` (fixes P0-10 double-grant); atomic create+quota; missing target → `failed_quota`/`refund_required`; extra-invites clawback unused-only (never below consumed) + reversal; design-template store-forced refund recorded without undoing work (DEC-03L); business-customization → managed-service legal review. `addon-preflight` + `fulfillment` endpoints.
- **Config/readiness (§9).** `revenuecat.config.js` Zod-validates all native-billing config (fail closed on missing/malformed/placeholder/contradictory); wired into `/health/ready` + boot gate; secret-free `config.env.example` block added.
- **Tests (§10).** +128 backend tests (pure reducer/envelope/redaction/integrity/resolver/config/eligibility/reconcile-exact + replica-set integration for grant/dedup/concurrency/lease/refund/clawback/dead-letter/replay/authz/PII). Full suite **175/175**; `catalog:verify` drift+**26**; payment static **18/18**. **business_customization interpretation preserved** (consumable/repeatable, `managed_service_legal_review`, no restorable entitlement).

**Still pending (NOT done this session, by design):** Apple/Google/RevenueCat console + sandbox matrix, signed IPA/AAB, mobile purchase UI (Session 3 consumes the new contracts), real provider-snapshot integration.

### Session 3 — Mobile/web native purchase UI + exact reconciliation + business self-serve (2026-07-02, no DB/provider/console)

Session 3 wired the **mobile RevenueCat purchase UI** onto the Session-2 backend contracts, implemented **business first self-serve on web + mobile** (DEC-02), and enforced **store-only prices/disclosures/legal links**. No Apple/Google/RevenueCat console, sandbox, signed build, or DB was touched. Verified with backend `npm test` (**189/189** — 175 Session-2 + 5 store-catalog + 9 event-fallback contracts; the 9 added during coordinator review, see the acceptance note below), `catalog:verify` (drift-clean + **26** contracts), payment static-checks (**18/18**), a new mobile `node --test` suite (**29/29**), mobile lint (0), web lint (0 errors / 34 pre-existing warnings), and the web production build (**Next 15.5.18, exit 0**).

- **Shared contracts (§1).** Added the `revenuecat` group to `shared/src/api/paths.js` (reconcile · reconcile-exact · event-preflight · addon-preflight · fulfillment · **catalog**) — consumed by web + mobile (mobile via `config/api.js` `ENDPOINTS.REVENUECAT`). New **store-safe catalog read endpoint** `GET /payments/revenuecat/catalog` (authenticated): projects the canonical catalog to an explicit **allowlist** (code/audience/kind/duration/RC package+offering+entitlement/platform product id/AR-EN/policy flags) with a per-caller `eligibleForCaller`. It **omits price/currency by construction** (native prices come from the store package — closes the P0-13 vector structurally) and carries `catalogVersion`/`catalogHash`; store-eligible only (trial/unlimited can never appear). Contract test `revenuecat-store-catalog.test.js` (5) locks the projection.
- **Exact-reconcile correlation (linchpin).** Mobile now sends `{ catalogCode, transactionId, storeProductId, operation }` from the FULL RevenueCat purchase result (`purchasePackage` no longer discards `transaction`/`productIdentifier`). Backend `reconcile-exact` gained a **safe additive event fallback** (`findNewestUnusedEventForCode`): when the SDK store txn id ≠ the webhook's (observed on Android with a null Play orderId), it matches the exact product's newest **UNUSED** entitlement owned by the caller — safe because `event-preflight` guarantees no pre-existing unused entitlement for that code at purchase time. Subscriptions already had a product-id fallback; add-ons stay txn-only (documented Android-edge limitation → the UI shows a refreshable pending state).
- **Mobile purchase architecture (§2).** New PURE, node-testable layer `services/billing/{constants,catalog,changeMode,reconcileState,disclosures,currentPlan}.js` (no react-native imports). SDK wrapper preserves correlation + supports Android `STORE_REPLACEMENT_MODE`. Orchestration hook `usePurchaseFlow` (guard→preflight→purchase→poll reconcile-exact→deterministic state; idempotent; cancellation ≠ error). Data hooks `useStoreCatalog`/`useAllOfferings`/`useFulfillment`; client `services/billingApi.js`. `PlansSummaryScreen` rewritten: exact reconcile (not generic `hasBackendAccess`), event-preflight before the sheet, change classification → replacement mode, store-only price everywhere, disclosures + Terms/Privacy/Refund links, restore/Manage-Subscription only for subscriptions, and a `PurchaseStatusModal` for all 9 states in AR/EN.
- **Add-ons (§4 / ADD-03).** New standalone `AddonsPurchaseScreen`: eligible add-ons from the store catalog, one store sheet per item with **add-on preflight** + **exact reconcile**, plus fulfillment status/history via `GET /revenuecat/fulfillment`. Consumables are never presented as restorable durable entitlements.
- **Business self-serve (§6 / MOB-04).** **Backend** `checkout.service.js` no longer requires a pre-existing active business subscription (the audience gate — business account only — remains); this is the web (Moyasar) unblock. **Web** `useBusinessPlansPageState` drops the first-purchase toast-block and adds exact-code `isCurrent`; `BusinessPlansPage` swaps the admin-only banner for a self-serve welcome and disables only the current plan's CTA. **Mobile** `BusinessPlansScreen` allows eligible first purchase and matches current plan by exact code (was `planType`).
- **Disclosures/legal (§7).** Store-sourced price + period, auto-renew/cancellation, one-time consumable, design non-refundable-from-creation, business-customization managed-review — all derived from catalog policy flags (`services/billing/disclosures`). Terms/Privacy/Refund open the canonical web legal pages via `expo-web-browser`. **Gap documented:** no dedicated Support/Contact page exists on web or mobile (P1-03) — deferred to the legal/SEO session. Per the app's convention, RTL is handled **globally** (`I18nManager` at the layout) — the new purchase components are direction-agnostic (no per-component `isRTL`; text follows the global direction, `row` auto-flips), and `LegalScreen` was refactored to drop its `isRTL` text/row branching (partial P1-08).
- **Tests (§10).** Mobile `node --test` (29): catalog/package lookup + store-only price (no backend fallback), change classification + replacement mode, reconcile-state mapping (success only on active/fulfilled/consumed), disclosures + restore eligibility, exact-code current-plan (P0-12). Backend +5 store-catalog contract tests. Mobile `npm test`/`npm run lint` scripts added.

**Still pending (NOT done, by design):** Apple/Google/RevenueCat console + product creation, sandbox/TestFlight/internal-track matrix, signed IPA/AAB inspection, real provider-snapshot integration, and the full legal Support-page + RTL/legal-alignment pass (P1-08/LEG-*). Nothing here reaches `SANDBOX_VERIFIED`.

**★ Coordinator acceptance (2026-07-02).** The lead coordinator independently re-reviewed all 33 Session-3 files (not the report), re-ran every gate, and accepted Session 3 — committed atomically as **`bc08b258`** (43 files; +2586/−287; no push). Ranked-risk review of the backend payment paths confirmed: the `checkout.service.js` business unblock preserves the audience gate (a personal host / non-business account still cannot buy a business plan); the `findNewestUnusedEventForCode` reconcile fallback is caller-scoped, unused-only, and aligned with the `event-preflight` guard (`resolution∈{fulfilled}` ⟺ `subscriptionId≠null`, exactly the set preflight blocks); DEC-02 compares by exact code on both web and mobile with i18n keys present in both locales; the store-safe catalog omits price/secrets. **One defect was found and corrected before commit:** the event fallback had no test → a focused `test/revenuecat-event-fallback.test.js` (9 cases: newest-unused, caller-scoping, exact-code, status/resolution filters, and two `reconcileExact` integration cases incl. a cross-account negative) was added, taking the backend suite **180 → 189**. Pre-existing **SEC-01** (tracked `config.env` / `halla-mobile/.env`) was re-confirmed present but is out of Session-3 scope and owner-gated (rotation + history purge) — carried into Session 4/SEC-01; it was neither staged nor modified by this commit.

### Session 4 — deletion, UGC, upload scanning, reviewer access, SEC-01 (2026-07-02, no DB/provider/console)

Implemented the non-billing store-readiness blockers with targeted tests against an
ephemeral `MongoMemoryReplSet` + isolated in-memory S3 stub (the shared cluster and real S3
were never touched; no credentials). Backend `npm test` **189 → 215** (+26), `catalog:verify`
drift-clean **26**, payment static-checks **18/18** — all green (coordinator-reverified).

- **Account deletion (DEL-01/02/03 · P1-02 · LEGAL §7).** New retryable pipeline
  `src/modules/account-deletion/{deletion.service,deletion.collect,deletion.processors,deletion.retry}.js`;
  `users.service.deleteMyAccount` now delegates to it. Fixes the core P1-02 bug: the old
  `isS3Key()` skipped **any** `http(s)://…` value, so full-URL post-event media
  (`file.location`) was left in S3 forever. New `resolveDeletableS3Key()` (`s3Upload.js`)
  normalizes bare keys AND our-bucket URLs (all 3 shapes) → deletable keys; the collector now
  gathers **every** variant the audit flagged: `coverImage`, `media[].thumbnailUrl`,
  `media[].comments[].images[].{url,thumbnail}`, post-level comment images, and
  `visualTemplate.bakedImagePath`. Event `staffList[]` names/phones are now scrubbed. **Truthful
  completion:** a residual S3 object (or failed non-mandatory step) yields **`pending_retry`**
  (never a false `completed`); the leased `account_deletion_retry` cron converges it. New
  `ProcessorErasure` model + records per processor: RevenueCat = `retained_by_policy` (DEC-04),
  Sentry/messaging = `pending`, push = `not_applicable`. **Post-deletion RevenueCat handling:**
  `processEvent` now classifies a trailing webhook for a deleted account as terminal
  `account_deleted` (tombstone lookup by retained `billingUserId`) instead of an `unknown_user`
  permanent dead-letter (LEGAL §7). Matrix: `evidence/store-readiness/DELETION-MATRIX.md`. Tests:
  `account-deletion.integration.test.js` (7) + `revenuecat-post-deletion.test.js` (2).
- **UGC enforcement (UGC-02/03 · P1-04).** Mounted `requireUserUgcTerms` **+ pre-write text
  filter** on the PUBLIC marketplace + guest-facing writes that were missing them: both vendor
  service writes (`POST /services`, `PATCH /services/:id` → `_assertCleanServiceText` on
  name/description) and the host `thank-you` write (`assertCleanText`). Confirmed (read-only)
  that guest comment writes are ALREADY service-gated (`assertUgcTermsAccepted('guest',…)` +
  `assertCleanText`) for both media- and post-level comments — the audit's "guests bypass
  entirely" was inaccurate; the `UGC_TERMS_ENFORCED` flag being OFF is intentional
  deploy-sequencing. Every remaining write with no gate (events/RSVP/tickets) is annotated in
  the inventory with the exact reason it is NOT a moderatable public surface. Suspension IS
  enforced on public vendor/service reads (`status=ACTIVE`+`vendorStatus=APPROVED`). Inventory
  + the one genuine deferral (viewer-block filtering on the anonymous marketplace read):
  `evidence/store-readiness/UGC-ROUTE-INVENTORY.md`. Tests: `ugc-enforcement.integration.test.js` (6).
- **Upload scanning (UGC-04 · P1-05).** New `src/shared/utils/uploadScan.js`: magic-byte
  signature allowlist + declared-MIME-family consistency + dangerous-signature rejection
  (ELF/PE/script/zip) + pluggable scanner + **fail-closed** policy (indeterminate/timeout/no
  scanner ⇒ reject when `UPLOAD_SCAN_REQUIRED≠false`). Wired into `scanUploadHook`. Boundary:
  real ClamAV/scanning-service infra + physical quarantine bucket remain infrastructure
  (EXTERNAL §6). Tests: `upload-scan.test.js` (11, incl. spoofed-MIME + executable/script/EICAR
  fixtures).
- **Reviewer seeding (REV-01 · P1-01).** `scripts/seedReviewerAccounts.js`: default host plan
  fixed to the VALID six-tier code `premium_monthly_100` (bare `premium_monthly` does not
  exist); **removed the silent `trial` fallback** — now FAILS CLOSED if the paid code is
  missing; added a **business-host** reviewer (`business_quarterly`, DEC-02) alongside
  personal-host + vendor; added a scripted **smoke login** (password compare) per account.
  Passwords remain env-only (no default) — confirmed none in git/evidence.
- **SEC-01 = `BLOCKED_NEEDS_OWNER`.** Assessed: `labbe-backend-/config.env` and
  `halla-mobile/.env` are both git-tracked (contain real secrets) AND gitignored (tracked
  before ignore → still in history). Produced the OWNER-ONLY rotation + history-purge runbook
  (`evidence/store-readiness/SEC-01-OWNER-RUNBOOK.md`) — provider-by-provider rotation order,
  `git filter-repo`/BFG commands, `.gitignore` hardening, CI secret-scan recommendation. Did
  NOT rotate, `git rm --cached`, or rewrite history (all owner-gated; the tracked `config.env`
  is required for backend boot). No secret values placed in any file.

**S3 verification gap (honest):** whether the backend IAM user can `s3:DeleteObject` is NOT
provable without live creds — the documented explicit Deny is on `s3:GetObject` (read path)
and `DeleteObjectCommand` is already used in prod (`safeDeleteOldKey`), which is
circumstantial. The fail-closed deletion design is safe either way (Delete denied ⇒
`pending_retry`, never a false `completed`). Confirm before GO.

### Session 5 — Shared legal package, web/mobile legal UI, policy manifest, CI (2026-07-02, no DB/provider/console)

Built ONE versioned AR/EN legal source consumed by web + mobile, a backend-generated hashed
policy manifest, live public web routes, mobile legal screens for every role + signup +
checkout + UGC-acceptance, a symmetric-controls mobile app bar, and parity/version/schema/URL
CI checks. **No legal copy is approved** — every document is `ownerApproval: BLOCKED_NEEDS_OWNER`.
Evidence: `evidence/store-readiness/LEGAL-PARITY.md`. Gates (final tree): backend `npm test`
**215 → 231** (+16 `legal-manifest.test.js`), `catalog:verify` **26**, new `legal:verify` **16**,
payment static **18/18**; web `npm run lint` 0-err + `npm run build` **exit 0** (all 6 legal
routes) + **render-verified** via `next start`+curl (AR/EN privacy, community-rules, support);
mobile `npm test` **29 → 33** (+4 `legalContent.test.js`) + lint 0; shared `verify-legal.mjs` pass.

- **Shared package (LEG-01).** `shared/src/legal/` in the ESM `@halla/shared` workspace
  (web/mobile `import`; backend reads JSON via `fs`, no ESM bridge — legal content is inert
  JSON, unlike the CAT-01 catalog). `documents/{privacy,terms,communityRules,refund,deletion,support}.json`
  in the exact render shape both `LegalPage` (web) and `LegalScreen` (mobile) already
  consumed + envelope metadata; `documents.js`/`manifest.js`/`contact.js`/`index.js`;
  `exports` extended (`./legal`, `./legal/*`). Privacy/Terms/Refund carried over
  **byte-for-byte** from the old web JSON (still owner-gated). Refund gained store-billing
  sections reflecting SIGNED DEC-03L/DEC-04 substance (auto-renew, consumables
  non-restorable, design non-refundable-from-creation, store-refund effects,
  keep-with-original, Saudi VAT 15%). Deletion describes the ACTUAL Session-4 behavior
  (retryable/truthful, RevenueCat `retained_by_policy`); durations owner-gated. Community
  Rules + Support are new structured docs. **Duplicate copies removed** (web
  `ui/landing/Legal/data/*`, mobile `screens/legal/data/*`) after both consumers migrated.
- **Policy manifest + P1-07.** `src/shared/legal/{legalContent,legalManifest}.js` +
  `scripts/generateLegalManifest.js` (`--check` drift gate) → `legalPolicies.generated.json`
  (6 docs, per-doc version/URLs/sectionIds/SHA-256 hash + `manifestHash`). `policies.js` now
  **derives** `POLICY_VERSIONS`/`POLICY_URLS` from the manifest (was hardcoded); acceptance
  keys `terms`/`community`/`privacy` preserved (`community`→`community-rules`), so the
  acceptance API + `TermsAcceptance` rows are unchanged (community version → `2026-07-02`
  re-prompts, by design). `legal:*` scripts isolated from `catalog:*` (catalog stays 26).
- **Web routes (P1-03).** Live AR/EN `/[lang]/{privacy,terms,refund,community-rules,support}`
  (server-rendered from the shared package) + deletion mapped to existing `/[lang]/delete-account`.
  The mobile-hardlinked `{terms,privacy,refund}` slugs are locked by tests. Backend
  community-rules URL now 200 (was 404). Canonical + AR/EN `hreflang` + OG + `robots:index`
  metadata on legal routes (`legalMetadata.js`).
- **Mobile P1-08 + surfaces.** TopBar rewritten → symmetric 44×44 start/end slots +
  **absolutely-centered title** (independent of side controls, no RTL↔LTR shift), logical
  start/end (no `row-reverse`, no double reversal), back chevron from resolved direction,
  truncation + a11y header; back-compat for all ~20 callers. LegalScreen: logical alignment,
  `flex-start` header (Dynamic Type no-clip), header a11y roles, mixed-direction, safe-area.
  6 screens registered for host/vendor/admin; signup + checkout + UGC-publish disclosures via
  `components/legal/LegalLinks.js`.
- **Contact single source (P1-06).** `@halla/shared/legal` `LEGAL_CONTACT` is the one source;
  web `LegalPage`/`Footer`/`delete-account` read from it (provisional, owner-gated). No
  hardcoded `support@halaa.*` remains in web/mobile source (grep-clean). Footer email
  `.net`→`.com.sa` de-conflict (owner must confirm).

**Verification boundaries (honest):** Metro bundling of `@halla/shared/legal` NOT exercised
(mobile tests read JSON via `fs`; proven-by-precedent via `api/paths` + old `./data/*.json`);
web bundling IS proven (build + render). TopBar verified by lint/compile + the two widest
prop-patterns walked, NOT on-device (non-legal screens not visually QA'd). Guest-portal UGC
accept disclosure not added (host UGC + signup + checkout were). **All legal copy remains
`BLOCKED_NEEDS_OWNER`** — see LEGAL-PARITY.md for the exact list (entity name 2-way conflict,
support email 2-way conflict, phone/WhatsApp, address, SLAs, retention durations, refund
wording, jurisdiction, + carried-over privacy/terms/refund).

| ID | Task | Owner | State | Evidence | Blocker | Last verified |
|---|---|---|---|---|---|---|
| BASE-01 | Phase-0 baseline (git/tests/lint/build/doctor/audit/static inventory) | Claude/QA | CAPTURED | `evidence/store-readiness/BASELINE.md` | — | 2026-06-28 |
| DEC-01 | Six-tier vs ten-tier catalog decision | Owner/Product | RESOLVED (owner 2026-07-01) | `DECISION-RECORD §B ★`; git `64b5b1dd` | **Keep six-tier / 34** — supersedes ten-tier signoff; SKUs from current catalog | 2026-07-01 |
| DEC-02 | Business first self-serve purchase (web+mobile) | Owner/Product | RESOLVED (owner 2026-07-01) | `DECISION-RECORD §C ★` | Allowed on **both** surfaces; compare by exact code → implement in `MOB-04` | 2026-07-01 |
| DEC-03 | Add-on type/lifetime/repurchase/fulfillment | Product/Backend | RESOLVED (owner 2026-07-01) | `DECISION-RECORD §D` | Extra-invites + business-customization unchanged | 2026-07-01 |
| DEC-03L | Design-template type + refund policy | Owner/Legal | RESOLVED (owner 2026-07-01) | `DECISION-RECORD §D.2 ★` | Single-use managed service; **non-refundable from creation**; no restore | 2026-07-01 |
| DEC-04 | RevenueCat transfer/account-switch policy | Owner/Product | RESOLVED (owner 2026-07-01) | `DECISION-RECORD §F ★` | "Keep with original App User ID"; no auto transfer / no dual access | 2026-07-01 |
| PRICE-OWNER | Store price-tier mapping + tax category | Owner/Finance | RESOLVED (owner 2026-07-01) | `DECISION-RECORD §G ★` | Current catalog & prices final; no ten-tier mapping; Saudi VAT 15% | 2026-07-01 |
| CAT-01 | Canonical machine-readable store catalog | Backend | UNIT_VERIFIED | `src/shared/commerce/*` + `evidence/store-readiness/generated/*`; `npm run catalog:verify` (25/25) | Built, Zod-validated, drift-gated; identifiers PROPOSED (no SKUs created) | 2026-07-01 |
| CAT-02 | Plan constants/defaults/seed/API parity + delete stale "54" comments | Backend | UNIT_VERIFIED | `planDefaults.js`/`seedPlans.js` "54" comments removed; `store-catalog.test.js` asserts source+seed parity | Source/seed parity + comment cleanup done + tested. **Live GET /plans DB parity still pending** (no DB this session — shared staging cluster) | 2026-07-01 |
| CAT-03 | Web/mobile catalog rendering parity | Web/Mobile | UNIT_VERIFIED | Explore audit: both fully API-driven, no hardcoded codes/tiers; cross-surface stale-code scan (0 hits) in `store-catalog.test.js` | No frontend change needed for the catalog contract. **Exact-code business `isCurrent`/first-purchase = MOB-04** (Session 2), not this session | 2026-07-01 |
| BILL-01 | Strict webhook envelope/catalog validation | Backend | INTEGRATION_VERIFIED | `revenuecat.envelope.js`/`.normalize.js`/`catalog.integrity.js`/`catalog.resolver.js`; `revenuecat-envelope.test.js`(19)+`-catalog-integrity`(18)+`-normalize`(9); `billing-webhook.integration`(10) | Real provider/sandbox pending | 2026-07-01 |
| BILL-02 | Processing lease/transaction/replay safety | Backend | INTEGRATION_VERIFIED | atomic lease claim in `revenuecat.controller.js`; `withTransaction.js`; `billing-webhook.integration` (duplicate+concurrent exactly-once) | — | 2026-07-01 |
| BILL-03 | Pure RevenueCat lifecycle reducer/tests | Backend | UNIT_VERIFIED | `revenuecat.reducer.js`; `revenuecat-reducer.test.js` (38, all event types + branches) | — | 2026-07-01 |
| BILL-04 | Correct cancellation/refund/reversal behavior | Backend | INTEGRATION_VERIFIED | reducer branches by cancel_reason/kind/lineage; `billing-webhook`/`billing-fulfillment` refund+revoke tests | `REVIEW-FINDINGS P0-04` closed | 2026-07-01 |
| BILL-05 | Correct purchased-currency ledger fields | Backend | INTEGRATION_VERIFIED | `writeLedger` uses `price_in_purchased_currency`+currency; USD in metadata; `-normalize` + webhook ledger assert | `P0-05` closed | 2026-07-01 |
| BILL-06 | Un-cancellation without refill | Backend | UNIT_VERIFIED | reducer `CLEAR_CANCEL_FLAG`; `revenuecat-reducer.test.js` (no refill) | `P0-06` closed | 2026-07-01 |
| BILL-07 | Canonical fail-closed exact-entitlement snapshot | Backend | INTEGRATION_VERIFIED | `revenuecat.api.js` unavailable≠404, entitlement-scoped; EXPIRATION-no-snapshot→500 test | `P0-08/09` closed | 2026-07-01 |
| BILL-08 | Transaction-scoped subscription lifecycle | Backend | INTEGRATION_VERIFIED | `revenuecat.lineage.js` + typed txn columns; revoke-exact test | — | 2026-07-01 |
| BILL-09 | Dead-letter alert/list/replay workflow | Backend/Ops | INTEGRATION_VERIFIED | `revenuecat.admin.controller.js` + routes (`requirePageAccess(PAYMENTS,'manage')`); `billing-deadletter.integration`(6) | — | 2026-07-01 |
| BILL-10 | Native billing strict readiness/config schema | Backend/Ops | UNIT_VERIFIED | `revenuecat.config.js`+`readiness.js`+`config.env.example`; `revenuecat-config.test.js`(9) | `P0-14` closed | 2026-07-01 |
| EVT-01 | Event-package preflight used by mobile/backend | Backend/Mobile | INTEGRATION_VERIFIED (backend) · IMPLEMENTED (mobile) | backend `POST /revenuecat/event-preflight` + `billing-fulfillment`; mobile `usePurchaseFlow` calls `eventPreflight` immediately before the store sheet and blocks on `recurring_plan_active`/`unused_event_held` (shows current item + replacement action) | Mobile client now wired; sandbox pending | 2026-07-02 |
| CAT-04 | Store-safe catalog read endpoint (mobile mapping) | Backend/Mobile | UNIT_VERIFIED | `GET /payments/revenuecat/catalog` + `commerce.getStoreSafeCatalog()` (allowlist; NO price/currency/secret; store-eligible only; `catalogVersion`/`catalogHash`; per-caller `eligibleForCaller`); `revenuecat-store-catalog.test.js`(5) | Feeds mobile code→product/package/offering mapping; no secrets exposed | 2026-07-02 |
| EVT-02 | Atomic event grant/consume/refund | Backend | INTEGRATION_VERIFIED | `grantConsumable` race-routing + refund; `billing-fulfillment` (grant/guard/race/refund) | `P0-03` dead-grant fixed | 2026-07-01 |
| ADD-01 | Unique/atomic store add-on fulfillment | Backend | INTEGRATION_VERIFIED | first-class unique `providerTransactionId`; atomic create+quota; `billing-fulfillment` (idempotent/failed_quota) | `P0-10` closed | 2026-07-01 |
| ADD-02 | Add-on refund/reversal state machines | Backend | INTEGRATION_VERIFIED | clawback-unused + reversal + design/business policies; `billing-fulfillment` | `P0-11` closed | 2026-07-01 |
| ADD-03 | Standalone native add-on purchase/history | Mobile | IMPLEMENTED_UNVERIFIED | `AddonsPurchaseScreen` (eligible add-ons from store catalog; one sheet per item; `addon-preflight` + exact reconcile; fulfillment status/history via `GET /revenuecat/fulfillment`); reachable from `PlansScreen`; consumables never restorable | Wired end-to-end against the backend contracts; **sandbox purchase proof pending** | 2026-07-02 |
| MOB-01 | Exact expected-purchase reconciliation | Backend/Mobile | INTEGRATION_VERIFIED (backend) · UNIT_VERIFIED (mobile) | backend `revenuecat-reconcile-exact.test.js`(16) + safe event fallback `findNewestUnusedEventForCode` (locked by `revenuecat-event-fallback.test.js`, 9 cases incl. cross-account negative + preflight-alignment); mobile `usePurchaseFlow` polls `reconcile-exact` with `{catalogCode,transactionId,storeProductId}`; `reconcileState.test.js` (success only on active/fulfilled/consumed) | `P0-02` closed; mobile flow uses EXACT reconcile (not generic access). **Sandbox proof pending** (SANDBOX_VERIFIED not reached) | 2026-07-02 |
| MOB-02 | Google subscription replacement modes | Mobile | UNIT_VERIFIED | `services/billing/changeMode.js` (classify by catalog order; upgrade→CHARGE_PRORATED_PRICE, downgrade→DEFERRED, crossgrade→WITH_TIME_PRORATION); `purchasePackage` passes `{oldProductIdentifier,replacementMode}` on Android via `STORE_REPLACEMENT_MODE`; `changeMode.test.js`(6) | Selection logic unit-tested; **on-device Android proration behavior = sandbox** (pending) | 2026-07-02 |
| MOB-03 | Store-only prices/periods/disclosures/legal links | Mobile | UNIT_VERIFIED | store price from RC package only (`resolvePurchasable`; backend catalog omits price); `DisclosureList`+`disclosures.js`; `PurchaseLegalLinks` → web Terms/Privacy/Refund; `catalog.test.js`/`disclosures.test.js`. New purchase surfaces are direction-agnostic (RTL handled globally via `I18nManager` at the layout — no per-component `isRTL`); `LegalScreen` refactored to drop its `isRTL` text/row branching (partial P1-08 fix) | Store-only price + disclosures + legal links present. **Gap:** no Support/Contact page (P1-03) — deferred to legal/SEO. On-device visual QA + sandbox pending | 2026-07-02 |
| MOB-04 | Business first self-serve purchase + current-code fixes (web + mobile) | Web/Mobile/Backend | UNIT_VERIFIED | backend `checkout.service.js` drops the no-sub business block (audience gate kept); web `useBusinessPlansPageState` + `BusinessPlansPage` (exact-code `isCurrent`, self-serve banner); mobile `BusinessPlansScreen` (exact-code, first purchase); `currentPlan.test.js`(4, P0-12); web build passes | Enabled on BOTH surfaces; exact-code comparison. **First-purchase integration test not added** (no DB this session) | 2026-07-02 |
| DEL-01 | Model/processor deletion-retention matrix | Backend/Legal | INTEGRATION_VERIFIED | `evidence/store-readiness/DELETION-MATRIX.md`; `deletion.service.js`/`deletion.collect.js`/`deletion.processors.js` | Matrix built + implemented; **legal must sign `RETENTION_MATRIX_FINALIZED`** before ACCEPTED | 2026-07-02 |
| DEL-02 | Complete retryable deletion worker | Backend | INTEGRATION_VERIFIED | `deletion.service.js` (truthful `pending_retry`), `deletion.retry.js` + `account_deletion_retry` cron, `ProcessorErasure` model, RC `account_deleted` (`revenuecat.service.js`); `resolveDeletableS3Key` fixes full-URL media (P1-02) | S3 DeleteObject capability = live-cred verification gap (fail-closed safe) | 2026-07-02 |
| DEL-03 | Throwaway DB/S3 deletion proof | QA | INTEGRATION_VERIFIED | `test/account-deletion.integration.test.js` (7: no non-retained PII, token invalidation, idempotence, partial-retry, retained-rows, S3-variant collection, persistent-failure→terminal-failed) + `revenuecat-post-deletion.test.js` (2); MongoMemoryReplSet + in-memory S3 stub | — | 2026-07-02 |
| UGC-01 | Live AR/EN Community Rules/Support | Web/Mobile/Legal | UNIT_VERIFIED (structure) | `evidence/store-readiness/LEGAL-PARITY.md`; web `/[lang]/community-rules` + `/[lang]/support` render-verified; mobile screens; `legal-manifest.test.js`(16) | Structure live + rendered; **all copy `BLOCKED_NEEDS_OWNER`** (SLAs/escalation/entity/contact). Backend community-rules URL now 200 (was 404) | 2026-07-02 |
| UGC-02 | Policy gate on every UGC write | Backend/Web/Mobile | UNIT_VERIFIED | `requireUserUgcTerms`+text-filter on both service writes + host media/thank-you; vendorData filtered; guest comments service-gated (`assertUgcTermsAccepted`+`assertCleanText`); `evidence/store-readiness/UGC-ROUTE-INVENTORY.md`; `test/ugc-enforcement.integration.test.js` (6) | Enforcement flag `UGC_TERMS_ENFORCED` flips ON post client-rollout (by design); events/RSVP/tickets = documented non-public-UGC (justified) | 2026-07-02 |
| UGC-03 | Block/moderation filtering on every read | Backend/Web/Mobile | UNIT_VERIFIED | `getBlockedKeySet` on post-event reads; suspension via `status=ACTIVE` on public vendor/service reads (test proves suspended excluded); `_mutateContent` hide/remove | **Gap:** viewer-block filtering on the anonymous public marketplace reads not yet threaded (documented in inventory) | 2026-07-02 |
| UGC-04 | Quarantine/magic-byte/malware pipeline | Backend/Infra | UNIT_VERIFIED | `src/shared/utils/uploadScan.js` (magic-byte allowlist + fail-closed policy + pluggable scanner) wired to `scanUploadHook`; `test/upload-scan.test.js` (11, malicious fixtures) | Real ClamAV/scanner infra + physical quarantine bucket = EXTERNAL §6 (pluggable interface done) | 2026-07-02 |
| LEG-01 | Shared canonical AR/EN legal package | Shared/Web/Mobile | UNIT_VERIFIED | `shared/src/legal/*` (6 docs, `documents.js`/`manifest.js`/`contact.js`); web build+render; `legal-manifest.test.js`(16) + `legalContent.test.js`(4) + `verify-legal.mjs` | One source consumed by web+mobile; backend manifest via `fs`; duplicates removed. **All copy `BLOCKED_NEEDS_OWNER`** (carried-over privacy/terms/refund + new docs) | 2026-07-02 |
| LEG-02 | Mobile legal header/RTL/accessibility fix | Mobile | IMPLEMENTED_UNVERIFIED | `components/plans/TopBar.js` (symmetric 44×44 + absolutely-centered title, no `row-reverse`); `screens/legal/LegalScreen.js` (logical align, Dynamic Type, a11y, safe-area, mixed-direction); mobile lint 0 | Structure + lint/compile + widest-prop-pattern walk. **On-device/iPad visual QA pending** (SANDBOX/device); non-legal TopBar callers not visually QA'd | 2026-07-02 |
| LEG-03 | Legal parity/version/URL CI checks | CI | UNIT_VERIFIED | backend `npm run legal:verify` (drift + 16); shared `node scripts/verify-legal.mjs` (AR/EN parity + schema + URL/slug); `policies.js` derived from manifest (P1-07) | Parity/version/schema/URL/slug gates green; isolated from `catalog:verify` (26 unchanged) | 2026-07-02 |
| SEO-01 | Route index/noindex inventory | Web | NOT_STARTED | `SEO-ASO plan` |  | 2026-06-28 |
| SEO-02 | Metadata/canonical/hreflang/OG/schema | Web | NOT_STARTED |  | SEO-01 | 2026-06-28 |
| SEO-03 | Sitemap/robots/manifest/icons | Web | NOT_STARTED |  | SEO-01 | 2026-06-28 |
| ASO-01 | Versioned Apple/Google AR/EN listing metadata | Product/Legal | NOT_STARTED |  | Approved copy | 2026-06-28 |
| ASO-02 | Store/product screenshot assets | Design/QA | NOT_STARTED |  | Release-candidate build | 2026-06-28 |
| REV-01 | Reviewer accounts use valid paid plan and smoke pass | Backend/QA | IMPLEMENTED_UNVERIFIED | `scripts/seedReviewerAccounts.js` (valid `premium_monthly_100` default; **no trial fallback — fails closed**; +business-host `business_quarterly`; scripted smoke login; passwords env-only) | Script correct + loads; a live seed+login run needs a DB (not run — shared staging cluster) | 2026-07-02 |
| SEC-01 | Rotate/untrack/purge/secret scan | Owner/Ops | BLOCKED_NEEDS_OWNER | `evidence/store-readiness/SEC-01-OWNER-RUNBOOK.md` | Tracked `config.env`+`halla-mobile/.env` confirmed (in history); rotation + `git rm --cached` + history purge are OWNER-GATED (tracked config.env needed for boot). No secrets in any file. | 2026-07-02 |
| ART-IOS | Signed IPA inspection + iPhone/iPad QA | Mobile/QA | NOT_STARTED |  | Apple/EAS credentials | 2026-06-28 |
| ART-AND | Signed AAB inspection + 16 KB/prelaunch QA | Mobile/QA | NOT_STARTED |  | Play/EAS credentials | 2026-06-28 |
| MCP-01 | MCP capability report + before exports | Claude/Ops | NOT_STARTED | `EXTERNAL-MCP-RUNBOOK` | Provider connectors/auth | 2026-06-28 |
| MCP-02 | Apple app/listing/product configuration | Claude/Owner | NOT_STARTED |  | DEC/CAT/Apple bootstrap | 2026-06-28 |
| MCP-03 | Google app/listing/product configuration | Claude/Owner | NOT_STARTED |  | DEC/CAT/Play bootstrap | 2026-06-28 |
| MCP-04 | RevenueCat apps/products/entitlement/offerings/webhook | Claude/Owner | NOT_STARTED |  | MCP-02/03 | 2026-06-28 |
| MCP-05 | Console readback zero-drift diff | Claude/QA | NOT_STARTED |  | MCP-02/03/04 | 2026-06-28 |
| QA-BILL | Apple + Google full sandbox matrix | QA | NOT_STARTED | `BILLING plan Phase 8` | Code + store config | 2026-06-28 |
| QA-RC | Full release-candidate functional/accessibility QA | QA | NOT_STARTED | `MASTER Phase 6` | Signed builds | 2026-06-28 |
| GO-01 | Second-person evidence review | Owner/Reviewer | NOT_STARTED |  | All prior gates | 2026-06-28 |
| GO-02 | Ready for owner submission approval | Owner | NOT_STARTED |  | GO-01 | 2026-06-28 |
