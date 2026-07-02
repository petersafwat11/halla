# Store-readiness baseline — 2026-06-28

Reproducible Phase-0 baseline captured for the Halaa store-readiness effort. **No
secrets are included** (audit output is package names/advisory URLs only; the git tree
is clean so there are no diff hunks; **no database was connected or mutated** — the
`halaa-staging` cluster is shared local+prod, so catalog counts are taken statically
from source, not from the DB).

**Environment:** node `v24.13.1`, npm `11.8.0`, Next.js `15.5.18`, Expo SDK `~54.0.33`,
Windows 11. Commands run from repo root `D:\halla` unless a subdir is shown.

## 1. Git state

```
HEAD: 23783ed1  (branch: master)
git status --porcelain  → 0 lines (working tree CLEAN)
git diff --stat         → (empty)
```
No unrelated working-tree changes to preserve this session.

## 2. Static catalog inventory (no DB)

```
$ node -e '...require("./labbe-backend-/src/shared/constants/planDefaults")...'
PLAN_DEFAULTS total entries: 34
by planType: {"trial":1,"basic_event":6,"basic_monthly":6,"premium_event":6,
              "premium_monthly":6,"business_event":6,"business_quarterly":1,
              "business_annual":1,"unlimited":1}

$ node -e '...require(".../plans") + require(".../addons")...'
PLAN_CODES entries: 34
extra_invites: 16   design_template: 5   business_customization: 1   (TOTAL add-ons: 22)

labbe-backend-/scripts/seedPlans.js → EXPECTED_TOTAL = 34 (6 per family)
```

| Item | Count | Source |
|---|---|---|
| Plan codes | 34 (six-tier) | `plans.js:26` |
| Plan defaults | 34 | `planDefaults.js:223` |
| Seed expected total | 34 | `seedPlans.js:52` |
| Add-ons | 22 (16+5+1) | `addons.js:11-33` |

Frontends are API-driven with no hardcoded tier cap (web `PricingSection.jsx:43`,
`PlanCard.jsx:84`; mobile `PlansScreen.js`, `PlansSummaryScreen.js:51`). The signed
ten-tier catalog (54) lives only in `plans-rewrite-2026-05.md`; see DECISION-RECORD
DEC-01. Stale "54" comments remain at `planDefaults.js:221` and `seedPlans.js:1`.

## 3. Backend tests

```
$ cd labbe-backend- && npm test        # node --test test/*.test.js
ℹ tests 17
ℹ pass 17
ℹ fail 0
exit=0
```
**17/17 pass.** Hygiene note: running bare `node --test` (no glob) instead of the
project script auto-discovers `scripts/reschedule-test.js` — a manual script, not a
unit test — which fails. Use the project `npm test` script; consider renaming the stray
`scripts/*test*.js` so it cannot be picked up by test auto-discovery. None of the 17
tests cover the new readiness/billing/deletion/moderation work (per REVIEW-FINDINGS §5).

## 4. Lint

```
$ cd labbe   && npm run lint           # eslint . --max-warnings 100
✖ 34 problems (0 errors, 34 warnings)   exit=0   (0 fixable errors)

$ cd halla-mobile && npm run lint       # eslint . --max-warnings 0
(no output)                             exit=0   (clean, 0 warnings)
```

## 5. Web production build (NEW — previously "no build proof")

```
$ cd labbe && npm run build            # next build
▲ Next.js 15.5.18
✓ Compiled with warnings in 9.5s
✓ Generating static pages (3/3)
(full route table emitted)             exit=0   → BUILD SUCCEEDS
```
Warnings only (non-fatal): unused `eslint-disable` directives; one
`react-hooks/exhaustive-deps` warning; a webpack `PackFileCacheStrategy` "not
serializable cache item" warning. Also a **workspace-root warning**: Next detected
multiple lockfiles (`D:\halla\package-lock.json` and `D:\halla\labbe\package-lock.json`)
and inferred the root; set `outputFileTracingRoot` or remove the redundant lockfile to
silence. This is the first proven production web build for this effort.

## 6. Expo Doctor

```
$ cd halla-mobile && npx --yes expo-doctor
Running 18 checks on your project...
18/18 checks passed. No issues detected!     exit=0
```

## 7. Production dependency audits (`npm audit --omit=dev`)

| Package set | Result | Detail |
|---|---|---|
| `labbe-backend-` | **0 vulnerabilities** | clean |
| `labbe` (web) | **2 moderate** | `postcss <8.5.10` (XSS in CSS stringify, GHSA-qx2v-qp2m-jg93), transitive under `next` (`node_modules/next/node_modules/postcss`) |
| `halla-mobile` | **20 moderate** | transitive under Expo SDK 54 tooling: `postcss` via `@expo/metro-config`→`@expo/cli`→`expo`; `js-yaml` via `babel-plugin-istanbul`→`@jest/transform`/`babel-jest`→`react-native`; `uuid` via `xcode`→`@expo/config-plugins`→`expo-constants` |

**Remediation assessment:** none has a **non-breaking supported** patch path. The web
`postcss` finding's only `npm audit fix --force` would install `next@9.3.3` (a massive
breaking downgrade — reject). The mobile findings are all transitive Expo/RN
build-tooling deps whose only `--force` fixes are breaking. **Do not force-fix.** Track
upstream bumps: wait for `next` to bump its bundled `postcss` (web) and for the next
Expo SDK to refresh its tooling (mobile). Re-audit at release-candidate time. These are
build/tooling-chain (not runtime request-path) packages.

## 8. Not run this session (and why)

- **DB/API catalog readback** — `halaa-staging` is shared local+prod; would risk live
  data. Confirm read-only (`countDocuments` / `GET /plans`) in a later session.
- **Signed IPA/AAB inspection, store sandbox, throwaway-DB deletion proof** — require
  Apple/Google/EAS credentials and a release candidate; out of scope for Phase 0.

## 9. Baseline vs prior review (REVIEW-FINDINGS §5)

| Check | Prior | This baseline |
|---|---|---|
| Backend tests | 17 pass | 17 pass ✓ |
| Web ESLint | pass, 34 warnings | pass, 34 warnings ✓ |
| Mobile ESLint | pass, 0 warnings | pass, 0 warnings ✓ |
| Expo Doctor | 18/18 | 18/18 ✓ |
| Backend prod audit | 0 | 0 ✓ |
| Web prod audit | 2 moderate | 2 moderate ✓ |
| Mobile prod audit | 20 moderate | 20 moderate ✓ |
| **Web production build** | **not proven** | **SUCCEEDS (Next 15.5.18, warnings only)** ✓ NEW |

## 10. CAT-01 canonical catalog (2026-07-01, no DB)

Machine-readable canonical store catalog built + validated from source, credential- and
DB-free. Source: `labbe-backend-/src/shared/commerce/` (`catalog.schema.js`,
`catalog.overlay.js`, `buildCatalog.js`); generator `scripts/generateStoreCatalog.js`.

```
$ cd labbe-backend- && npm run catalog:verify
✓ catalog in sync — 7 artifacts match source (no drift).
ℹ tests 25   ℹ pass 25   ℹ fail 0        exit=0

$ npm test                     # full backend suite (incl. 25 new catalog contracts)
ℹ tests 42   ℹ pass 42   ℹ fail 0        exit=0
```

Proven counts (contract tests): **34** DB plans · **32** store-eligible plans (18 event
consumables + 14 subscriptions) · **22** add-ons (16 extra-invite + 5 design + 1 business
customization) · **54** proposed store products per platform · **2** internal
(trial+unlimited, 0 store products) · six-tier only (no 250/300/350/400). All Apple /
Google / RevenueCat identifiers are **PROPOSED** (`com.halla.<code>`) — nothing created
in any console.

Generated artifacts (reproducible; `npm run catalog:generate`):
`labbe-backend-/src/shared/commerce/storeCatalog.generated.json` +
`docs/evidence/store-readiness/generated/{sku-matrix,apple-product-map,google-product-map,revenuecat-mapping,metadata-inventory,expected-counts}.generated.md`.

**Drift gate proven live:** corrupting a generated artifact makes `catalog:check` exit 1
with a remediation message; `catalog:generate` restores it deterministically (exit 0).

Stale cleanup: removed the "54 entries"/"54-plan" comments at `planDefaults.js` +
`seedPlans.js`. Backend has no eslint config/lint script (per §4 only web+mobile lint),
so no backend lint gate applies. Web/mobile were **not changed** this session (catalog is
backend-only + docs), so their §4/§5 baseline status stands.

Pre-existing static-check staleness (fixed in Session 2, see §11): `check #12`
grepped `payments.routes.js` for the old `restrictTo(SUPER_ADMIN, ADMIN)` string,
now refactored to `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage')`.

## 11. Session 2 — backend billing lifecycle (2026-07-01, no DB/provider)

Native RevenueCat billing engine implemented + verified against an **ephemeral
local `MongoMemoryReplSet`** (real transactions, real unique-index dedupe). The
shared `halaa-staging` cluster was **never** touched; the RevenueCat subscriber
snapshot is **stubbed** (no provider/console/sandbox access this session).

```
$ cd labbe-backend- && npm run catalog:verify
✓ catalog in sync — 7 artifacts match source (no drift).   ℹ tests 26  pass 26  fail 0

$ npm test                       # full suite incl. new billing unit + integration
ℹ tests 175   ℹ pass 175   ℹ fail 0        exit=0

$ MOYASAR_API_KEY=dummy node scripts/static-checks-payments.js
static-checks-payments: OK (18 / 18)       exit=0
```

New test files (all green): `revenuecat-reducer`(38) · `revenuecat-envelope`(19) ·
`revenuecat-catalog-integrity`(18) · `revenuecat-reconcile-exact`(16) ·
`revenuecat-normalize`(9) · `revenuecat-config`(9) · `billing-webhook.integration`(10) ·
`billing-fulfillment.integration`(8) · `billing-deadletter.integration`(6).

Manifest now stamped with `catalogVersion=1.0.0` + `catalogHash` (sha256 over the
canonical entries); drift gate + 26 contracts still pass. Dev-dependency added:
`mongodb-memory-server@^11` (test-only; downloads a local mongod, no network at
test time after first fetch).

Static-check fixes: `check #12` updated to assert the current
`requirePageAccess(ADMIN_PAGES.PAYMENTS,'manage')` gate; two **dormant** bugs it had
masked were also fixed (`#17` undefined `subSvcSrc`; `#18` stale
`labbe/services/new-backend/api.config.js` path → `shared/src/api/paths.js`). These
were latent (the script exited at `#12` before reaching them), not regressions.

**Not run / not proven this session (unchanged):** Apple/Google/RevenueCat console,
store sandbox matrix, signed IPA/AAB, real provider-snapshot integration, mobile UI.

## 12. Session 3 — mobile/web native purchase UI + business self-serve (2026-07-02, no DB/provider/console)

Mobile RevenueCat purchase UI wired onto the Session-2 backend contracts; business
first self-serve enabled on web + mobile (DEC-02); store-only prices/disclosures/legal
links enforced. No console/sandbox/signed-build/DB access.

```
$ cd labbe-backend- && npm run catalog:verify
✓ catalog in sync — 7 artifacts match source (no drift).   ℹ tests 26  pass 26  fail 0

$ npm test                       # full suite incl. 5 new store-catalog contracts
ℹ tests 180   ℹ pass 180   ℹ fail 0        exit=0

$ MOYASAR_API_KEY=dummy node scripts/static-checks-payments.js
static-checks-payments: OK (18 / 18)       exit=0

$ cd halla-mobile && npm test    # node --test "__tests__/**/*.test.js" (NEW)
ℹ tests 29    ℹ pass 29    ℹ fail 0         exit=0

$ npm run lint                   # eslint . --max-warnings 0
(clean)                                     exit=0

$ cd labbe && npm run lint       # eslint . --max-warnings 100
✖ 34 problems (0 errors, 34 warnings)       exit=0   (unchanged from baseline)

$ npm run build                  # next build
▲ Next.js 15.5.18 — compiled with warnings; route table emitted   exit=0
```

New mobile test files (all green): `__tests__/billing/{catalog,changeMode,reconcileState,disclosures,currentPlan}.test.js` (29 total). New backend test: `test/revenuecat-store-catalog.test.js` (5). New mobile `test` script: `node --test "__tests__/**/*.test.js"` (Node's directory-arg form is a single-file in Node 24 — the quoted glob is required).

**Deltas vs Session 2:** backend suite 175 → **180**; mobile gained a unit-test runner (0 → **29**); web build re-proven after the business-self-serve + i18n changes. Expo Doctor / audits not re-run this session (no dependency changes beyond the mobile `test` script + no new runtime deps). **Nothing reached SANDBOX_VERIFIED** — Apple/Google/RevenueCat console, sandbox matrix, and signed IPA/AAB remain out of scope.
