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
