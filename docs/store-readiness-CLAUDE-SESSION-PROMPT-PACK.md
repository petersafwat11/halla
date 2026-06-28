# Claude session prompt pack — complete Halaa store readiness

Use **separate Claude Code sessions in this exact order**. A fresh session prevents context loss and makes each phase independently verifiable.

Do not start production store-product creation until Sessions 0–3 are accepted. Do not submit or publish from any session without a separate explicit owner approval.

## Rules for every session

Paste the relevant prompt verbatim. Every session must:

1. Read all named documents completely before acting.
2. Inspect current code/state rather than trusting prior checkmarks.
3. Preserve unrelated dirty-worktree changes.
4. Add targeted tests for behavior changes.
5. Update `docs/store-readiness-CORRECTIVE-STATUS.md` with evidence and verification date.
6. End with: changed files, tests run/results, unresolved blockers, and the exact next-session readiness verdict.
7. Never print/commit secrets or provider credentials.
8. Never commit, push, submit, publish, or release unless explicitly asked.

---

## Session 0 — coordinator, decisions, and baseline

**Purpose:** resolve the decisions that block safe implementation and immutable SKU creation.

```text
You are the coordinating engineer for Halaa store readiness in D:\halla.

Read completely:
- docs/store-readiness-CLAUDE-MASTER-PLAN.md
- docs/store-readiness-REVIEW-FINDINGS.md
- docs/store-readiness-CORRECTIVE-STATUS.md
- docs/store-readiness-BILLING-COMPLETION-PLAN.md
- docs/plans-rewrite-2026-05.md
- docs/store-readiness-SHIP-plan.md

This session is decision and baseline work. Do not create production store SKUs
and do not implement broad feature changes yet.

Tasks:
1. Reinspect the current plan constants/defaults/seed/API/web/mobile catalog and
   prove the current counts.
2. Produce docs/store-readiness-DECISION-RECORD.md covering:
   - ten-tier approved catalog vs intentional six-tier reduction;
   - whether an eligible business account can buy its first self-serve plan;
   - exact type/lifetime/repurchase/fulfillment/refund behavior for every add-on;
   - Google upgrade/downgrade replacement modes;
   - RevenueCat restore/transfer behavior;
   - Saudi availability, price-approval owner, and managed B2B exclusions.
3. Use the previous approved plans as evidence and give a concrete recommended
   answer for each decision. Mark only genuinely commercial/legal choices as
   BLOCKED_NEEDS_OWNER.
4. Run and record the baseline: git status/diff, backend tests, mobile/web lint,
   production web build, Expo Doctor, dependency audits, and catalog inventory.
5. Create docs/evidence/store-readiness/BASELINE.md without secrets.
6. Update docs/store-readiness-CORRECTIVE-STATUS.md.

Stop and ask me only for the unresolved owner decisions. End with a concise
decision form I can answer in one message. Do not claim the next session is ready
until DEC-01 through DEC-04 are resolved.
```

### Recommended owner decisions

Unless business/legal requirements say otherwise, the recommended answers are:

- Use the previously approved **ten-tier** catalog.
- Allow eligible business hosts to purchase their first simplified self-serve native plan; negotiated/managed B2B remains web/admin-only.
- Extra invites: repeatable consumable.
- Custom design tiers: consumable service orders with provisioning/refund states.
- Business customization: one non-consumable organization entitlement, or keep web-only if fulfillment/legal cannot support store rules. Do not leave it ambiguous.
- Google: immediate/prorated upgrades and deferred downgrades.
- RevenueCat identity: only authenticated custom IDs; choose restore behavior only after A→B security tests. For identity-sensitive business access, prefer keeping purchases with the original Halaa user unless support explicitly approves transfer.

---

## Session 1 — canonical catalog and contract tests

**Prerequisite:** Session 0 decision record signed.

```text
Implement the canonical Halaa commercial catalog in D:\halla.

Read completely:
- docs/store-readiness-DECISION-RECORD.md
- docs/store-readiness-BILLING-COMPLETION-PLAN.md, Phase 0 and Phase 1
- docs/store-readiness-REVIEW-FINDINGS.md
- docs/store-readiness-CORRECTIVE-STATUS.md
- docs/plans-rewrite-2026-05.md

Tasks:
1. Create one machine-readable shared store catalog containing every approved
   plan/add-on, audience, type, duration, platform product identifiers/package
   lookup keys, fulfillment/refund policy, and AR/EN product metadata fields.
2. Make backend plan constants/defaults/seed expected counts match the signed
   decision. Restore every approved tier and remove stale codes.
3. Generate the human SKU matrix and provider mapping artifacts from the shared
   catalog; do not hand-maintain large JSON maps.
4. Update web/mobile catalog consumers so every approved tier renders in correct
   numeric order and trial/unlimited never become store products.
5. Add contract tests for exact counts, unique IDs/lookup keys, audience, product
   types, Google productId:basePlanId format, and zero missing/orphan codes.
6. Add a CI-verifiable catalog drift command.
7. Update CORRECTIVE-STATUS with evidence.

Do not create products in Apple/Google/RevenueCat. Run all relevant tests/lint/build.
End with CATALOG_READY_FOR_BILLING_BACKEND or a concrete blocker.
```

---

## Session 2 — RevenueCat backend lifecycle and readiness

```text
Finish and harden the RevenueCat/backend billing state machine in D:\halla.

Read completely:
- docs/store-readiness-BILLING-COMPLETION-PLAN.md, Phases 2, 3, 4, 6, 7
- docs/store-readiness-REVIEW-FINDINGS.md P0-02 through P0-14
- docs/store-readiness-DECISION-RECORD.md
- the canonical catalog created in Session 1
- docs/store-readiness-CORRECTIVE-STATUS.md
- current RevenueCat controller/service/API/models and subscription/add-on flows

Implement:
1. Strict authenticated webhook envelope/app/environment/store/api-version/
   entitlement/catalog validation with durable records for ignored/dead letters.
2. Atomic event processing lease, retry safety, transaction-scoped lookup, and
   staff list/inspect/replay operations for dead letters.
3. A pure, unit-tested lifecycle reducer for initial purchase, renewal,
   cancellation reasons/refund, expiration, billing issue/grace/recovery, pause,
   extension, product change, un-cancellation, refund reversal, transfer,
   temporary grants, duplicate/concurrent/out-of-order events.
4. Correct RevenueCat money fields: price_in_purchased_currency with currency.
5. Exact configured recurring entitlement selection; no unscoped entitlement.
6. Fail closed on canonical snapshot failure for destructive actions.
7. Exact-purchase reconciliation contract, not generic hasBackendAccess.
8. Event entitlement preflight/grant/consume/refund race handling.
9. Atomic add-on fulfillment, unique store transaction, failure/refund/reversal
   state machines, and eligibility by user/account type.
10. Strict environment schema/config example/readiness checks for all native
    billing variables and catalog hash/version.
11. Targeted unit/integration tests for every finding; do not rely on sandbox.

Preserve Moyasar web behavior. Do not configure provider consoles. Update status,
run tests, and end with BACKEND_BILLING_UNIT_AND_INTEGRATION_VERIFIED or blockers.
```

---

## Session 3 — native mobile purchase, business, and add-on UX

```text
Complete the iOS/Android native purchase experience in D:\halla.

Read completely:
- docs/store-readiness-BILLING-COMPLETION-PLAN.md, Phase 5 and test requirements
- docs/store-readiness-REVIEW-FINDINGS.md P0-02,03,07,10-13
- docs/store-readiness-DECISION-RECORD.md
- canonical catalog and backend reconcile/preflight contracts from Sessions 1-2
- docs/store-readiness-CORRECTIVE-STATUS.md

Tasks:
1. Preserve RevenueCat purchase result correlation fields and reconcile the exact
   product/transaction/add-on just purchased.
2. Consume backend eligibility/preflight so a second event purchase is blocked,
   while handling delivery races truthfully.
3. Implement Google subscription changes with current old product and approved
   replacement mode; correctly show pending deferred downgrades.
4. Implement signed business behavior: first purchase if approved, exact current
   plan by code, all business event invite tiers, and role/audience restrictions.
5. Replace backend SAR values on native with store priceString, period, trial/
   offer, renewal, and separate-charge disclosures. Remove native Moyasar/card/
   discount UI for digital products.
6. Distinguish subscription vs one-time actions; do not show Manage Subscription
   for consumables.
7. Add clickable Terms/Privacy/Refund links.
8. Implement standalone add-on purchase/history/status/retry with one clearly
   disclosed store charge per item and exact fulfillment reconciliation.
9. Load/index the approved RevenueCat offerings/packages deterministically and
   fail observably on missing/duplicate configuration.
10. Add targeted tests and run mobile lint/Expo Doctor.

Do not configure store consoles. Update status and end with MOBILE_BILLING_READY_FOR_PROVIDER_CONFIGURATION or blockers.
```

---

## Session 4 — deletion, UGC, security, and reviewer access

```text
Close the non-billing store blockers in D:\halla.

Read completely:
- docs/store-readiness-REVIEW-FINDINGS.md, all P1 findings
- docs/store-readiness-LEGAL-PARITY-PLAN.md, especially §7
- docs/store-readiness-CLAUDE-MASTER-PLAN.md Phase 2
- docs/store-readiness-CORRECTIVE-STATUS.md
- every backend model and current deletion/moderation/upload/reviewer implementation

Tasks:
1. Build a model-by-model and processor-by-processor delete/anonymize/retain
   matrix, then implement complete retryable deletion. Cover all event staff,
   visual/cover/thumbnail/comment assets, full S3 URLs, billing/moderation raw
   records, and processor requests/tombstones.
2. PII/S3 failure must prevent a false completed result. Add worker retries,
   operations visibility, and post-deletion RevenueCat handling.
3. Add throwaway DB + isolated object-store fixtures proving no non-retained PII,
   token invalidation, idempotence, and partial retry behavior.
4. Inventory every UGC write/read route. Require current explicit policy
   acceptance on every write and enforce block/hidden/suspension on every read.
5. Finish quarantine-first magic-byte/malware scanning with failure policy/tests.
6. Fix reviewer seeding: exact valid paid plan, no silent trial fallback, personal
   host/business host if applicable/vendor accounts, and release-candidate smoke.
7. Verify rate limiting, webhook fail-closed behavior, readiness, secret-file
   tracking status, and create exact owner-only rotation/history-purge steps.
8. Update status and run backend/web/mobile tests as applicable.

Do not rotate real credentials or rewrite git history without my explicit approval.
End with CORE_NON_BILLING_BLOCKERS_VERIFIED or blockers.
```

---

## Session 5 — shared legal pages and mobile alignment

```text
Implement legal consistency and mobile legal UI quality in D:\halla.

Read completely:
- docs/store-readiness-LEGAL-PARITY-PLAN.md
- docs/store-readiness-REVIEW-FINDINGS.md P1-03,06,07,08
- docs/store-readiness-DECISION-RECORD.md
- docs/store-readiness-CORRECTIVE-STATUS.md

Tasks:
1. Create one shared versioned AR/EN legal content package consumed by web/mobile,
   with a generated backend policy manifest. Migrate Privacy, Terms, Community
   Rules, Refund/Subscription, Deletion, and Support.
2. Do not invent legal entity/contact/retention/refund answers. Mark unapproved
   content clearly BLOCKED_NEEDS_OWNER while implementing complete structure.
3. Add live public AR/EN web routes and expose all applicable documents in every
   mobile role, signup, UGC acceptance, and checkout.
4. Replace conflicting contact constants with one approved brand/legal source.
5. Fix TopBar with symmetric controls and independently centered title; remove
   hardcoded double RTL reversal in LegalScreen.
6. Add logical start/end alignment, mixed-direction handling, accessibility,
   Dynamic Type, safe-area, phone/tablet/iPad support.
7. Add parity/version/schema/URL/link CI checks and visual screenshot tests for
   Arabic/English across required sizes.
8. Update status and run lint/build/tests.

End with LEGAL_STRUCTURE_AND_UI_VERIFIED plus an exact list of counsel/owner copy
approvals still required. Do not call legal content approved without signoff.
```

---

## Session 6 — web SEO and mobile ASO metadata

```text
Implement the complete Halaa SEO/ASO metadata plan in D:\halla.

Read completely:
- docs/store-readiness-SEO-ASO-METADATA-PLAN.md
- docs/store-readiness-LEGAL-PARITY-PLAN.md
- docs/store-readiness-DECISION-RECORD.md
- canonical catalog and shared brand/legal metadata
- docs/store-readiness-CORRECTIVE-STATUS.md

Tasks:
1. Create a signed route inventory with explicit index/noindex policy.
2. Implement localized metadataBase/title/description/canonical/hreflang/OG/
   Twitter/icons and safe structured data for every public route type.
3. Add sitemap, robots, web manifest, favicon/apple icons, OG image fallbacks.
4. Explicitly noindex private/auth/dashboard/admin/checkout/token/invitation/
   post-event workflow routes and prevent PII in previews/metadata.
5. Make vendor structured data use only public fields and safely serialize JSON-LD.
6. Add metadata snapshot, reciprocal hreflang, sitemap/robots, noindex, structured
   data, link, and store-text limit tests.
7. Commit versioned AR/EN Apple and Google listing/product metadata templates,
   screenshot briefs, reviewer notes, privacy/data-safety worksheets, and ASO
   validation scripts. Use owner-approved claims only.
8. Run production web build and relevant validation; update status.

Do not write to Apple/Google consoles in this session. End with METADATA_READY_FOR_CONSOLE or blockers.
```

---

## Session 7 — signed build and artifact verification

```text
Produce and verify release-candidate mobile artifacts for Halaa.

Read completely:
- docs/store-readiness-CLAUDE-MASTER-PLAN.md Phase 4
- docs/store-readiness-EXTERNAL-MCP-RUNBOOK.md sections 2, 9, 10
- docs/store-readiness-CORRECTIVE-STATUS.md
- current EAS/app configuration and all prior session handoffs

Start with a read-only EAS/config/secrets-name audit. Never print secret values.
If required credentials are unavailable, provide exact BLOCKED_NEEDS_OWNER steps.

When authorized/configured:
1. Generate production iOS and Android release candidates with unique versions.
2. Record commit, build IDs, checksums, toolchain/SDK versions, and resolved config.
3. Inspect IPA: Xcode 26+/iOS 26 SDK, bundle/device family including iPad,
   entitlements, associated domains, permission strings, privacy manifest,
   required-reason APIs, SDK inventory, symbols/Sentry release.
4. Inspect AAB: package/version/target API, merged permissions, Play Billing
   version, signing, native libraries/64-bit/16 KB compatibility.
5. Run/install on required phone/tablet/iPad matrices and verify deep links,
   permissions, push, crash symbolication, RTL/legal layouts, and core smoke.
6. Upload only to TestFlight/internal test when already authorized; do not submit
   app review or production rollout.
7. Save evidence and update status.

End with SIGNED_ARTIFACTS_VERIFIED, or precise owner/credential/build blockers.
```

---

## Session 8 — provider MCP setup: Apple, Google, RevenueCat, EAS

```text
Use authorized MCP servers to execute external provider setup for Halaa.

Read completely:
- docs/store-readiness-EXTERNAL-MCP-RUNBOOK.md
- docs/store-readiness-CLAUDE-MASTER-PLAN.md Phase 5
- docs/store-readiness-DECISION-RECORD.md
- canonical catalog + generated provider manifest
- committed AR/EN store/listing/product metadata
- signed artifact evidence from Session 7
- docs/store-readiness-CORRECTIVE-STATUS.md

Follow the runbook exactly:
1. Operate read-only first. Produce MCP capability report, resolved-input blockers,
   and before-state exports for Apple, Google, RevenueCat, EAS, and deployment.
2. Never invent IDs/legal answers, expose secrets, or simulate unsupported tools.
3. Verify manual account/app/agreement/tax/banking/bootstrap prerequisites.
4. After catalog hash and owner decisions are confirmed, make idempotent writes
   for listings, localizations, products/base plans/subscription levels, prices,
   availability, RevenueCat products/entitlements/offerings/packages/webhook,
   RTDN/server notifications, and EAS/backend secret names/config.
5. Never attach consumables to the recurring entitlement.
6. Read back every write and create normalized after exports plus zero-drift diff.
7. Configure sandbox/internal testing only. Do not submit for review, publish, or
   release without separate explicit approval.
8. Update CORRECTIVE-STATUS.

Continue until READY_FOR_SANDBOX or a concrete BLOCKED_NEEDS_OWNER item. End with
the exact manual console actions that no MCP/API can perform.
```

---

## Session 9 — full sandbox matrix and release-candidate QA

```text
Execute the complete Halaa release-candidate and native-billing verification.

Read completely:
- docs/store-readiness-BILLING-COMPLETION-PLAN.md Phase 8
- docs/store-readiness-CLAUDE-MASTER-PLAN.md Phase 6 and Phase 7
- docs/store-readiness-EXTERNAL-MCP-RUNBOOK.md sections 10-12
- docs/store-readiness-CORRECTIVE-STATUS.md
- all evidence and handoffs from Sessions 0-8

Use real Apple Sandbox/TestFlight and Google license-test/internal-track purchases
on real supported devices. Use MCP/provider logs for evidence collection where
available. Do not substitute dashboard test webhooks for real store purchases.

Execute every required row:
- personal and approved business purchase types;
- renewal/refill once, cancel, expiry, grace/failure/recovery, pause/resume;
- iOS/Google upgrades, downgrades, crossgrades;
- restore/reinstall/multi-device/account A→B behavior;
- subscription/event/add-on refunds and reversals;
- duplicate/concurrent/out-of-order webhooks and outages;
- event repurchase guard, first-send consumption, add-on failure/refund queue;
- offers/promo codes;
- complete auth/role/event/vendor/UGC/deletion/deep-link/push/offline/RTL/
  accessibility/iPad/tablet/security flows.

For each row record store transaction, RevenueCat event/customer/product, backend
records and before/after quotas, device/build, screenshot/video, expected/actual,
tester/date. File bugs and retest; do not waive failures silently.

Re-export provider state and confirm zero catalog drift. Update status. End with
READY_FOR_SECOND_PERSON_REVIEW or NO_GO with exact failed rows.
```

---

## Session 10 — final independent evidence review and owner handoff

```text
Perform the final independent Halaa store-readiness review. Do not implement new
features unless a tiny evidence-only correction is required.

Read all corrective plans/status, decision records, test reports, signed artifact
reports, provider exports/diffs, legal/privacy approvals, reviewer instructions,
and sandbox/QA evidence.

Tasks:
1. Re-audit every original SHIP-plan requirement and every P0/P1 finding.
2. Verify CORRECTIVE-STATUS evidence rather than trusting state labels.
3. Confirm zero open P0/P1, zero unexplained console/catalog drift, signed legal/
   privacy approvals, working reviewer accounts, and passed mandatory QA rows.
4. Verify no secrets or reviewer passwords exist in git/evidence/output.
5. Produce docs/evidence/store-readiness/FINAL-GO-NO-GO.md with a requirement-to-
   evidence table and explicit residual risks.
6. State exactly one result:
   - READY_FOR_OWNER_SUBMISSION_APPROVAL, or
   - NO_GO with concrete blockers.

Do not submit, publish, or release. If ready, provide the owner with the exact
manual approval sequence for App Store review, Google review/Managed Publishing,
monitoring, staged rollout, rollback, refund support, and moderation/on-call.
```

## When to use one continuing session instead

Only continue the same session for a small failed test/retry within that phase. Start a new session when moving to the next numbered phase. The shared decision record, corrective status, and evidence files are the handoff mechanism.

## Fastest safe order

```text
0 Decisions/baseline
→ 1 Catalog
→ 2 Billing backend
→ 3 Mobile billing
→ 4 Deletion/UGC/security/reviewers
→ 5 Legal/layout
→ 6 SEO/ASO
→ 7 Signed artifacts
→ 8 Store/RevenueCat MCP setup
→ 9 Sandbox/full QA
→ 10 Independent go/no-go
```
