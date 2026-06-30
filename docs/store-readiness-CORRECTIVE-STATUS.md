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
- **Decisions adjudicated:** DEC-02 **RESOLVED** by D8 (native self-serve business
  first purchase = YES; web stays managed). Technical recommendations recorded for
  add-on extra-invites/business-customization, Google replacement modes (`MOB-02`), and
  restore semantics (`DEC-04`). Still genuinely owner-gated: **DEC-01** (ten-tier
  signature), **DEC-03L** (design-template type + fulfilled-service refund),
  **DEC-04** (transfer policy), **PRICE-OWNER**. Next session is **not** cleared for
  manifest/SKU creation until those are signed.

| ID | Task | Owner | State | Evidence | Blocker | Last verified |
|---|---|---|---|---|---|---|
| BASE-01 | Phase-0 baseline (git/tests/lint/build/doctor/audit/static inventory) | Claude/QA | CAPTURED | `evidence/store-readiness/BASELINE.md` | — | 2026-06-28 |
| DEC-01 | Six-tier vs ten-tier catalog decision | Owner/Product | BLOCKED_NEEDS_OWNER | `DECISION-RECORD §B`; git `64b5b1dd`; `REVIEW-FINDINGS P0-01` | **Recommend ten-tier (54)** — needs dated owner signature (immutable SKUs) | 2026-06-28 |
| DEC-02 | Business first native purchase decision | Owner/Product | RESOLVED (D8) | `DECISION-RECORD §C`; SHIP §2 (D8) | Native self-serve = YES (fix `MOB-04`); web stays managed (1-line confirm) | 2026-06-28 |
| DEC-03 | Add-on type/lifetime/repurchase/fulfillment (technical) | Product/Backend | RESOLVED (recommend) | `DECISION-RECORD §D` | Extra-invites + business-customization semantics recommended | 2026-06-28 |
| DEC-03L | Design-template type + fulfilled-service refund policy | Owner/Legal | BLOCKED_NEEDS_OWNER | `DECISION-RECORD §D.2/§H` | Consumable-vs-non-consumable (restore) + before/after-work refund | 2026-06-28 |
| DEC-04 | RevenueCat transfer/account-switch policy | Owner/Product | BLOCKED_NEEDS_OWNER | `DECISION-RECORD §F` | Restore semantics recommended; **transfer policy** still owner-gated (recommend keep-with-original) | 2026-06-28 |
| PRICE-OWNER | Store price-tier mapping + Saudi tax-category approver | Owner/Finance/Legal | BLOCKED_NEEDS_OWNER | `DECISION-RECORD §G` | Name finance approver; recommend Saudi VAT 15% standard-rated | 2026-06-28 |
| CAT-01 | Canonical machine-readable store catalog | Backend/Mobile | NOT_STARTED |  | DEC-01/DEC-03L | 2026-06-28 |
| CAT-02 | Plan constants/defaults/seed/API parity | Backend | NOT_STARTED | `DECISION-RECORD §A` (proven six-tier/34) | DEC-01 (recommend ten-tier) | 2026-06-28 |
| CAT-03 | Web/mobile catalog rendering parity | Web/Mobile | NOT_STARTED | Both API-driven, no hardcoded cap (`DECISION-RECORD §A`) | CAT-01/02 | 2026-06-28 |
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
| ADD-02 | Add-on refund/reversal state machines | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-11`; `DECISION-RECORD §D` | DEC-03L (fulfilled-service refund policy) | 2026-06-28 |
| ADD-03 | Standalone native add-on purchase/history | Mobile | NOT_STARTED |  | ADD-01/02 | 2026-06-28 |
| MOB-01 | Exact expected-purchase reconciliation | Backend/Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-02` |  | 2026-06-28 |
| MOB-02 | Google subscription replacement modes | Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-07`; `DECISION-RECORD §E` | Mode decided (immediate upgrade / deferred downgrade) — implementation pending | 2026-06-28 |
| MOB-03 | Store-only prices/periods/disclosures/legal links | Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-13` | Legal docs | 2026-06-28 |
| MOB-04 | Business tier/first purchase/current-code fixes | Mobile/Backend | NOT_STARTED | `REVIEW-FINDINGS P0-12`; `DECISION-RECORD §C` | Decision RESOLVED (D8: native first purchase = YES, compare by code) — implementation pending | 2026-06-28 |
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
| REV-01 | Reviewer accounts use valid paid plan and smoke pass | Backend/QA | NOT_STARTED | `REVIEW-FINDINGS P1-01` | DEC-01 (valid code depends on frozen catalog) | 2026-06-28 |
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
