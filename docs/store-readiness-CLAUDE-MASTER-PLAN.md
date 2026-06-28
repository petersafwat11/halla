# Halaa store-readiness corrective master plan for Claude

**Objective:** finish code, legal/metadata parity, store/RevenueCat setup, signed-artifact verification, and sandbox proof for an Apple App Store + Google Play launch in Saudi Arabia.

**Current release decision:** **NO-GO.** The prior implementation is substantive, but `store-readiness-IMPLEMENTATION-STATUS.md` overstates completion. Use `store-readiness-REVIEW-FINDINGS.md` as the corrective audit.

## Source-of-truth order

When documents conflict, use this order:

1. owner’s latest explicit decision
2. this master plan and corrective review
3. specialized completion plans listed below
4. `store-readiness-SHIP-plan.md`
5. older implementation status/external notes

Specialized plans:

- `store-readiness-REVIEW-FINDINGS.md`
- `store-readiness-BILLING-COMPLETION-PLAN.md`
- `store-readiness-LEGAL-PARITY-PLAN.md`
- `store-readiness-SEO-ASO-METADATA-PLAN.md`
- `store-readiness-EXTERNAL-MCP-RUNBOOK.md`

## Working rules

- Preserve unrelated user changes in the dirty worktree.
- Do not use status-document checkmarks as evidence.
- Add tests with every behavior change; do not postpone all testing to sandbox.
- Keep web Moyasar and native StoreKit/Play Billing paths explicitly separated.
- Never commit live secrets, API keys, reviewer passwords, `.p8`, service-account JSON, certificates, or provider payloads containing PII.
- Every completion claim links to code/test/console/artifact evidence.
- Do not submit/publish/release without separate owner approval.

## Phase 0 — decisions and baselines (blocks all production SKU creation)

### 0.1 Catalog decision

Resolve whether the approved catalog is:

- recommended prior-plan catalog: ten invite tiers through 400; or
- intentionally reduced six tiers through 200.

Record a dated owner decision. If no new decision exists, implement the explicit ten-tier catalog in `plans-rewrite-2026-05.md`.

### 0.2 Commercial semantics

Sign decisions for:

- business first native purchase vs admin-first
- each add-on’s consumable/non-consumable/managed-service type
- subscription upgrade/downgrade replacement modes
- RevenueCat restore/transfer policy
- add-on fulfillment/refund/reversal behavior
- Saudi-only availability/prices/tax category

### 0.3 Baseline evidence

Run/save:

- git status/diff inventory
- backend tests, mobile/web lint, web production build
- Expo Doctor and resolved config
- production dependency audits with supported remediation assessment
- model/route/catalog inventories
- existing Apple/Google/RevenueCat read-only console exports when available

**Exit:** signed decisions + baseline report; no unresolved immutable-ID choices.

## Phase 1 — P0 code correctness

Execute `store-readiness-BILLING-COMPLETION-PLAN.md` Phases 0–7.

Required P0 closures:

- canonical generated catalog and drift tests
- exact-purchase reconciliation
- event second-purchase enforcement
- correct RevenueCat cancellation/refund/reversal reducer
- correct money fields
- un-cancellation without pool refill
- Google subscription replacement flow
- fail-closed destructive reconciliation
- explicit recurring entitlement ID
- atomic/idempotent add-on fulfillment and refunds
- business first-purchase/current-tier behavior matching decision
- store-only native prices/disclosures
- RevenueCat variables included in strict readiness

Do not move to store product creation until catalog tests pass.

## Phase 2 — deletion, moderation, security, and review access

### 2.1 Account deletion

Execute the deletion matrix in `store-readiness-LEGAL-PARITY-PLAN.md`:

- cover every model/new billing/moderation record and external processor
- delete all S3 variants/assets
- add retry worker/operations visibility
- never report completion after a mandatory PII deletion failure
- run throwaway DB + isolated S3 fixture proof
- verify old access/refresh tokens fail and duplicate requests are safe

### 2.2 UGC

- publish Community Rules and support resources first
- require explicit current policy acceptance on every UGC write
- enforce block/hidden/suspended state on every public read surface
- complete quarantine/magic-byte/malware scanning
- test report/block/moderator action/appeal and SLA routing

### 2.3 Reviewer accounts

- replace invalid default `premium_monthly` with an exact valid code
- remove silent trial fallback; fail closed
- seed personal host, business host if native business is reviewable, and vendor
- ensure no OTP/MFA/onboarding dependency
- verify login and role-specific scripted flows on the release candidate

### 2.4 Security/deployment

- rotate all exposed credentials
- untrack current secret files and coordinate history purge
- add CI/pre-commit secret scanning
- enable strict config/rate limits after validated secret migration
- verify webhook forgery rejection/readiness failure cases

**Exit:** targeted tests pass; deletion/moderation/security evidence exists.

## Phase 3 — legal parity, mobile layout, SEO, and ASO

Execute:

- `store-readiness-LEGAL-PARITY-PLAN.md`
- `store-readiness-SEO-ASO-METADATA-PLAN.md`

Required outcomes:

- one shared AR/EN legal source and version manifest
- live Privacy/Terms/Community/Refund/Delete/Support URLs
- counsel-approved retention/privacy/subscription/refund copy
- legal contact consistency
- mobile legal header/RTL/LTR/accessibility visual matrix
- route index/noindex inventory
- localized metadata/canonical/hreflang/OG/structured data
- sitemap/robots/web manifest/icons
- versioned AR/EN Apple/Google listing + product metadata and asset plan

**Exit:** automated parity/metadata/link tests pass; legal/content approvals recorded.

## Phase 4 — signed build artifacts

### iOS

- production EAS build with Xcode 26+/iOS 26 SDK
- unique build number/version
- inspect entitlements, associated domains, privacy manifest/required-reason report, device family, usage strings, SDK inventory
- process in App Store Connect/TestFlight
- test current iPhone, minimum supported iOS, and iPad portrait/landscape
- verify symbolicated Sentry crash with PII scrubbing

Official toolchain requirement: https://developer.apple.com/news/upcoming-requirements/

### Android

- production AAB targeting required API level
- Play App Signing
- verify merged permissions and Billing Library manifest version
- verify 16 KB native-library/page-size compatibility
- bundle/device-catalog/pre-launch report
- internal/closed test on representative API/device matrix

Official references:

- https://support.google.com/googleplay/android-developer/answer/11926878
- https://developer.android.com/guide/practices/page-sizes
- https://developer.android.com/google/play/billing/deprecation-faq

**Exit:** artifact inspection report/checksums and device test evidence.

## Phase 5 — external stores and RevenueCat

Execute `store-readiness-EXTERNAL-MCP-RUNBOOK.md`.

Sequence:

1. MCP capability report/read-only exports
2. owner/manual app/account/agreement bootstrap
3. app/listing/privacy metadata
4. store products from signed manifest
5. RevenueCat store connections/products/entitlement/offerings/webhook/restore behavior
6. EAS/backend secret variables
7. readback exports and zero-drift diff

**Exit:** state is `READY_FOR_SANDBOX`, not submitted.

## Phase 6 — sandbox and release-candidate QA

Execute the complete billing matrix in the billing plan on both stores. Also execute:

- fresh install, AR/EN first run, signup/login/logout/account switch
- personal/business/vendor reviewer flows
- event create/edit/send/check-in/post-event
- contacts/location/photos denied/allowed paths
- push foreground/background/terminated and logout token removal
- reset/universal/app links
- account deletion warning/request/status/completion
- every public legal/support/deletion URL
- UGC accept/report/block/moderate
- offline/slow network/retry/error states
- accessibility/RTL/iPad/tablet matrix
- crash reporting/release symbolication

Every failed row becomes a tracked bug with retest evidence.

**Exit:** zero open P0/P1, mandatory QA rows pass, console export still matches catalog.

## Phase 7 — final evidence and owner go/no-go

Assemble:

- signed decision log/catalog/hash
- code/test/build commit/tag
- dependency and secret scan results
- deletion/UGC/security evidence
- legal/privacy approvals and data inventory
- web SEO/ASO/store listing exports
- signed IPA/AAB reports/checksums
- Apple/Google/RevenueCat zero-drift export
- reviewer accounts and review instructions (passwords stored separately)
- full sandbox and QA matrices
- rollout/monitoring/refund/moderation/on-call plan

Second-person review is required. Claude then states either:

- `READY_FOR_OWNER_SUBMISSION_APPROVAL`, or
- `NO_GO` with concrete blockers.

Only after explicit owner approval may Claude/MCP submit for review. Production release/managed publishing is a separate approval.

## Required status format

Maintain `docs/store-readiness-CORRECTIVE-STATUS.md` with one row per task:

| ID | Task | Owner | State | Evidence | Blocker | Last verified |
|---|---|---|---|---|---|---|

Allowed states:

- `NOT_STARTED`
- `IMPLEMENTED_UNVERIFIED`
- `UNIT_VERIFIED`
- `INTEGRATION_VERIFIED`
- `ARTIFACT_VERIFIED`
- `SANDBOX_VERIFIED`
- `CONSOLE_VERIFIED`
- `ACCEPTED`
- `BLOCKED_NEEDS_OWNER`

Never use a bare “done.”

## Claude execution prompt

```text
Implement docs/store-readiness-CLAUDE-MASTER-PLAN.md in phase order. Read every
linked specialized plan completely. Start by creating the corrective status and
closing the P0 findings with targeted tests. Do not create immutable store product
IDs until the catalog decision is signed. Preserve unrelated working-tree changes.
Use provider MCP tools read-only first, keep secrets out of files/output, make writes
idempotent, and read back every mutation. Do not submit or publish without explicit
owner approval. Continue until READY_FOR_OWNER_SUBMISSION_APPROVAL or record a
specific BLOCKED_NEEDS_OWNER item with exact required input.
```
