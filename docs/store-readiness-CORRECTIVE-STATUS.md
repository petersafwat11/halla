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
| BILL-01 | Strict webhook envelope/catalog validation | Backend | IMPLEMENTED_UNVERIFIED | Existing controller partial only | Missing strict fields/tests | 2026-06-28 |
| BILL-02 | Processing lease/transaction/replay safety | Backend | NOT_STARTED |  |  | 2026-06-28 |
| BILL-03 | Pure RevenueCat lifecycle reducer/tests | Backend | NOT_STARTED |  |  | 2026-06-28 |
| BILL-04 | Correct cancellation/refund/reversal behavior | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-04` |  | 2026-06-28 |
| BILL-05 | Correct purchased-currency ledger fields | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-05` |  | 2026-06-28 |
| BILL-06 | Un-cancellation without refill | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-06` |  | 2026-06-28 |
| BILL-07 | Canonical fail-closed exact-entitlement snapshot | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-08/09` |  | 2026-06-28 |
| BILL-08 | Transaction-scoped subscription lifecycle | Backend | NOT_STARTED |  |  | 2026-06-28 |
| BILL-09 | Dead-letter alert/list/replay workflow | Backend/Ops | NOT_STARTED |  |  | 2026-06-28 |
| BILL-10 | Native billing strict readiness/config schema | Backend/Ops | NOT_STARTED | `REVIEW-FINDINGS P0-14` |  | 2026-06-28 |
| EVT-01 | Event-package preflight used by mobile/backend | Backend/Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-03` |  | 2026-06-28 |
| EVT-02 | Atomic event grant/consume/refund | Backend | IMPLEMENTED_UNVERIFIED | Existing entitlement/first-send code | Race/refund tests missing | 2026-06-28 |
| ADD-01 | Unique/atomic store add-on fulfillment | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-10` |  | 2026-06-28 |
| ADD-02 | Add-on refund/reversal state machines | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-11`; `DECISION-RECORD §D` | Unblocked: design = non-refundable (DEC-03L); build extra-invite clawback-unused + store-refund reconcile | 2026-07-01 |
| ADD-03 | Standalone native add-on purchase/history | Mobile | NOT_STARTED |  | ADD-01/02 | 2026-06-28 |
| MOB-01 | Exact expected-purchase reconciliation | Backend/Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-02` |  | 2026-06-28 |
| MOB-02 | Google subscription replacement modes | Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-07`; `DECISION-RECORD §E` | Mode decided (immediate upgrade / deferred downgrade) — implementation pending | 2026-06-28 |
| MOB-03 | Store-only prices/periods/disclosures/legal links | Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-13` | Legal docs | 2026-06-28 |
| MOB-04 | Business first self-serve purchase + current-code fixes (web + mobile) | Web/Mobile/Backend | NOT_STARTED | `REVIEW-FINDINGS P0-12`; `DECISION-RECORD §C ★` | Owner-decided: enable on BOTH surfaces, compare by exact code — implementation pending | 2026-07-01 |
| DEL-01 | Model/processor deletion-retention matrix | Backend/Legal | NOT_STARTED | `LEGAL plan §7` | Legal signoff | 2026-06-28 |
| DEL-02 | Complete retryable deletion worker | Backend | NOT_STARTED | `REVIEW-FINDINGS P1-02` | DEL-01 | 2026-06-28 |
| DEL-03 | Throwaway DB/S3 deletion proof | QA | NOT_STARTED |  | DEL-02 | 2026-06-28 |
| UGC-01 | Live AR/EN Community Rules/Support | Web/Mobile/Legal | NOT_STARTED | `REVIEW-FINDINGS P1-03` | Approved content/contact | 2026-06-28 |
| UGC-02 | Policy gate on every UGC write | Backend/Web/Mobile | NOT_STARTED |  | UGC-01 | 2026-06-28 |
| UGC-03 | Block/moderation filtering on every read | Backend/Web/Mobile | NOT_STARTED | `REVIEW-FINDINGS P1-04` |  | 2026-06-28 |
| UGC-04 | Quarantine/magic-byte/malware pipeline | Backend/Infra | NOT_STARTED |  | Scanner/infra | 2026-06-28 |
| LEG-01 | Shared canonical AR/EN legal package | Shared/Web/Mobile | NOT_STARTED | `LEGAL plan` | Legal copy | 2026-06-28 |
| LEG-02 | Mobile legal header/RTL/accessibility fix | Mobile | NOT_STARTED | `REVIEW-FINDINGS P1-08` |  | 2026-06-28 |
| LEG-03 | Legal parity/version/URL CI checks | CI | NOT_STARTED |  | LEG-01 | 2026-06-28 |
| SEO-01 | Route index/noindex inventory | Web | NOT_STARTED | `SEO-ASO plan` |  | 2026-06-28 |
| SEO-02 | Metadata/canonical/hreflang/OG/schema | Web | NOT_STARTED |  | SEO-01 | 2026-06-28 |
| SEO-03 | Sitemap/robots/manifest/icons | Web | NOT_STARTED |  | SEO-01 | 2026-06-28 |
| ASO-01 | Versioned Apple/Google AR/EN listing metadata | Product/Legal | NOT_STARTED |  | Approved copy | 2026-06-28 |
| ASO-02 | Store/product screenshot assets | Design/QA | NOT_STARTED |  | Release-candidate build | 2026-06-28 |
| REV-01 | Reviewer accounts use valid paid plan and smoke pass | Backend/QA | NOT_STARTED | `REVIEW-FINDINGS P1-01` | Unblocked — pick a valid six-tier code (e.g. `premium_monthly_100`) | 2026-07-01 |
| SEC-01 | Rotate/untrack/purge/secret scan | Owner/Ops | NOT_STARTED | Existing external steps | Coordinated credentials/history work | 2026-06-28 |
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
