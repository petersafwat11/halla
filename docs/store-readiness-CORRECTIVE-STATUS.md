# Halaa corrective store-readiness status

**Release verdict:** `NO_GO`  
**Allowed states:** `NOT_STARTED`, `IMPLEMENTED_UNVERIFIED`, `UNIT_VERIFIED`, `INTEGRATION_VERIFIED`, `ARTIFACT_VERIFIED`, `SANDBOX_VERIFIED`, `CONSOLE_VERIFIED`, `ACCEPTED`, `BLOCKED_NEEDS_OWNER`.

Update evidence links and `Last verified` on every state change. A task reaches `ACCEPTED` only after the specialized plan’s acceptance gate passes.

| ID | Task | Owner | State | Evidence | Blocker | Last verified |
|---|---|---|---|---|---|---|
| DEC-01 | Six-tier vs ten-tier catalog decision | Owner/Product | BLOCKED_NEEDS_OWNER | `REVIEW-FINDINGS P0-01` | Immutable SKU creation blocked | 2026-06-28 |
| DEC-02 | Business first native purchase decision | Owner/Product | BLOCKED_NEEDS_OWNER | `BILLING plan 1.3` | D8/code conflict | 2026-06-28 |
| DEC-03 | Add-on product/lifetime/refund semantics | Owner/Product/Legal | BLOCKED_NEEDS_OWNER | `BILLING plan 0.3` | Product semantics required | 2026-06-28 |
| DEC-04 | RevenueCat restore/transfer policy | Owner/Product | BLOCKED_NEEDS_OWNER | `BILLING plan Phase 2/8` | Account-switch policy required | 2026-06-28 |
| CAT-01 | Canonical machine-readable store catalog | Backend/Mobile | NOT_STARTED |  | DEC-01/03 | 2026-06-28 |
| CAT-02 | Plan constants/defaults/seed/API parity | Backend | NOT_STARTED |  | DEC-01 | 2026-06-28 |
| CAT-03 | Web/mobile catalog rendering parity | Web/Mobile | NOT_STARTED |  | CAT-01/02 | 2026-06-28 |
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
| ADD-02 | Add-on refund/reversal state machines | Backend | NOT_STARTED | `REVIEW-FINDINGS P0-11` | DEC-03 | 2026-06-28 |
| ADD-03 | Standalone native add-on purchase/history | Mobile | NOT_STARTED |  | ADD-01/02 | 2026-06-28 |
| MOB-01 | Exact expected-purchase reconciliation | Backend/Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-02` |  | 2026-06-28 |
| MOB-02 | Google subscription replacement modes | Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-07` | DEC-02 | 2026-06-28 |
| MOB-03 | Store-only prices/periods/disclosures/legal links | Mobile | NOT_STARTED | `REVIEW-FINDINGS P0-13` | Legal docs | 2026-06-28 |
| MOB-04 | Business tier/first purchase/current-code fixes | Mobile/Backend | NOT_STARTED | `REVIEW-FINDINGS P0-12` | DEC-02 | 2026-06-28 |
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
| REV-01 | Reviewer accounts use valid paid plan and smoke pass | Backend/QA | NOT_STARTED | `REVIEW-FINDINGS P1-01` | Catalog | 2026-06-28 |
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
