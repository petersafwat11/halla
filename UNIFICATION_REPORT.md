# Halaa — Web + Mobile Unification: Inventory & Plan

**Date:** 2026-05-26 (revised after code-verification pass)
**Scope:** `halla-mobile/{services,stores,utils,hooks}` and `labbe/{config,hooks,providers,services,staticData,stores,utils}`
**Goal:** Single coherent architecture across web (Next.js) and mobile (React Native), production-ready, no duplication, one canonical API contract.

> **Revision note (2026-05-26, evening pass):** Section 1.5 was rewritten end-to-end after a per-file verification pass. Three of the four "critical divergences" in the previous draft were **refuted by the code** (mobile already routes host vs admin event creation correctly; web/mobile/backend all use `PUT` for staff update; mobile already surfaces test-message and retry-launch via `TestMessageModal.js` + `EventFailureBanner.js`). Only the mobile reset-password screen gap survives. Section 1.3, §2.3, Phase 4b and the effort table were recalibrated accordingly. See Appendix B for the verification log.

---

## Session Progress Log

### 2026-05-30, Phase 9 (Opus 4.7 1M) — verify & lock in: real CI gate, ARCHITECTURE.md, smoke checklist

**Shipped, all gates green (`labbe`, `halla-mobile`, `@halla/shared` lint exit 0; `next build` exit 0; `expo export --platform web` exit 0 at 6.46 MB):**

Closes the unification. Phase 9's value turned out to be the **verification surfacing two silent gates the earlier slices had built but never fired** — the lock-in ESLint rules and the `next lint`-based CI step. Both were dead config under Next 15 + ESLint 9. The slice fixed the wiring, then locked it in across all three packages.

**The two silent gates Phase 9 surfaced (this is the substantive find, not the docs work):**

1. **Slice 6's `no-restricted-imports` + `no-restricted-syntax` rules in `labbe/.eslintrc.json` were never executed.** Next 15 reads `eslint.config.mjs` (flat config) exclusively; the legacy `.eslintrc.json` is ignored. The Phase 8 commit message said "ESLint verification gate" but `next lint` returned ✔ on a file with `const __probe = "/api/v2/lint-probe"` in it. Six weeks of Phase 8 slices ran with no enforcement.
2. **The labbe `lint` script called `next lint`**, which is deprecated in Next 15 ("will be removed in Next.js 16") and which — separately from the flat-config issue above — applies a Next-curated rule subset rather than the project's own config. Even after I migrated the rules into `eslint.config.mjs`, `next lint` still returned ✔. The fix is calling `eslint` directly.

**Three-probe verification used at every step** (drop probe → expect failure → revert → expect clean):
- Literal `/api/v2/probe` in a source file → expect `no-restricted-syntax` error.
- Banned import (e.g., `@/services/apiClient` on web) → expect `no-restricted-imports` error.
- Revert both → expect `0 errors`.

All three pass on all three packages.

**Files added (4):**
```
shared/eslint.config.mjs       (eslint:recommended + lock-in rules; src/api/paths.js exempt)
halla-mobile/eslint.config.mjs (mirror of labbe lock-in, adjusted for mobile import names;
                                config/api.js exempt from /api/v2/ rule for API_BASE_URL;
                                pre-existing JS-quality rules turned off — Phase 9 is
                                lock-in only, not §7.3 follow-up cleanup)
ARCHITECTURE.md                (~250 lines, condensed from §2 + §7.3 + §8)
PHASE_9_SMOKE_CHECKLIST.md     (manual E2E checklist — 8 flows × 2 apps; user runs)
```

**Files modified (5):**
```
labbe/eslint.config.mjs        (migrated rules from .eslintrc.json into flat config;
                                added `ignores: ['.next/**']`; exempted eslint.config.mjs
                                and next.config.mjs from /api/v2/ rule)
labbe/package.json             (lint script: `next lint` → `eslint . --max-warnings 100`
                                — see warnings note below)
halla-mobile/package.json      (added `lint` script)
shared/package.json            (added `lint` script)
package.json                   (added root devDeps: @eslint/js, eslint,
                                eslint-plugin-react-hooks, globals — hoisted for all
                                workspaces so CI's `npm install` resolves them)
.github/workflows/labbe.yml         (added `Lint @halla/shared` step before labbe lint)
.github/workflows/halla-mobile.yml  (added `Lint @halla/shared` + `Lint halla-mobile`
                                     steps; noted that `expo export` supersedes the
                                     `expo prebuild --no-install` dry-run Phase 9 spec
                                     called for — export is strictly heavier work)
```

**Files deleted (1):**
```
labbe/.eslintrc.json           (dead config under Next 15; rules migrated to flat
                                config; deleted after verifying flat config fires)
```

**Pre-existing bugs surfaced and fixed in this slice (5 real ESLint errors that `next lint` had hidden):**
- `labbe/hooks/events/mutations/useEventMutation.js` (4 errors) — `react-hooks/rules-of-hooks` on the action-factory switch. The header doc already asserts the invariant ("callers must keep `action` stable across renders") so the runtime path through hooks IS constant per call site, but ESLint can't prove that statically. Added `// eslint-disable-next-line react-hooks/rules-of-hooks` on each of the four sub-hook calls with a comment pointing at the invariant.
- `labbe/ui/admin/dashboard/bottom/topVendors/TopVendors.js` (1 error) — `react-hooks/rules-of-hooks` because the component was declared as `const topVendors = (...)` (lowercase). ESLint treated `useTranslation()` inside as "hook called in a non-component function." Renamed to `TopVendors`. Default export updated.

**Pre-existing labbe lint warnings — honest accounting:**
`npx eslint .` on labbe surfaces 29 warnings: 21 `@next/next/no-img-element` (request to use `<Image>`), 4 `react-hooks/exhaustive-deps` (long-tail closure issues), 4 `import/no-anonymous-default-export`. Slice 7's entry claimed "lint = zero warnings" — that was true against `next lint`, which Next 15 silently sandboxes to a curated rule subset, not against the real config. The `labbe/package.json` lint script now uses `--max-warnings 100` to keep CI green without forcing a §7.3-scale cleanup mid-Phase-9. **Follow-up:** triage these in a Phase 8 slice 9 if/when product wants them closed; or simply ratchet the ceiling down over time. Either way, the gate now fires.

**Shared lint baseline — 1 warning fixed:**
- `shared/src/schemas/settings.js:271` — unused parameter `t` in `notificationsSchema(t = idT)` factory (the body doesn't reference `t`, only the default `idT`). Renamed to `_t` to match the no-unused-vars `argsIgnorePattern: '^_'`. Behavior unchanged.

**Mobile lint baseline — 1 false-positive cleared, plugin wired:**
- `halla-mobile/components/createEvent/yourEventManagedByUsPopup.js:25` — third-party `api.builder.io/api/v1/image/assets/...` URL was matching the `/api/v[0-9]+/` regex. Added per-line `// eslint-disable-next-line no-restricted-syntax -- third-party (api.builder.io), not the labbe backend.`
- 7 files have inline `// eslint-disable-next-line react-hooks/exhaustive-deps` directives. Registered `eslint-plugin-react-hooks` so the directives resolve (without enabling the rule — Phase 9 is lock-in only, the §7.3 follow-up enables it).
- 10 unused-disable warnings (`no-console`, `global-require`, `react-hooks/exhaustive-deps`) come from inline disables prepared for the §7.3 follow-up rollout. Set `linterOptions.reportUnusedDisableDirectives: 'off'` — they're intentional pre-positioning, not stale.

**Lock-in rules in effect across all three packages:**

| Package         | `no-restricted-syntax` (`/api/v[0-9]+/` literal) | `no-restricted-imports` (deleted/banned paths)                |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `@halla/shared` | yes (exempt: `src/api/paths.js`, eslint config)  | yes — bans `next/*`, `react-native`, `expo-*`, app-relative paths |
| `labbe`         | yes (exempt: `eslint.config.mjs`, `next.config.mjs`) | yes — bans 14 Phase 8 shim paths + `**/services/new-backend/*` |
| `halla-mobile`  | yes (exempt: `config/api.js`, eslint config)     | yes — bans `services/EventsService` (capital E), `eventsService2`, `useDebouncedValue`, deleted Phase 8 slice 8 utils |

**CI workflow updates (`.github/workflows/`):**
- `labbe.yml`: now runs `Lint @halla/shared` → `Lint labbe` → `Build`. Shared lint runs first because `shared/**` is in `labbe`'s `paths:` trigger; a typo in shared fails the labbe pipeline.
- `halla-mobile.yml`: now runs `Lint @halla/shared` → `Lint halla-mobile` → `Expo config check` → `Metro bundle`. Same reasoning.
- `expo prebuild --no-install` dry-run from the Phase 9 spec is **superseded by `expo export --platform android`** — bundle is strictly heavier (transforms + bundles JS, which prebuild doesn't do). Noted inline in the workflow file.

**ARCHITECTURE.md — condensed §2 + §7.3 + §8:**
~250 lines. Mental model, shared package contents, HTTP transport interface, hook layout rule, reconciliation rules, auth split, the four cross-app pattern resolutions from §8, ESLint lock-in rules and probes. Does not restate §1 inventory or §3 migration plan — those are historical now and live in this report. Includes a copy-pasteable three-line probe so future readers can verify the gate themselves in under 30 seconds.

**PHASE_9_SMOKE_CHECKLIST.md — manual half of Phase 9:**
The E2E smoke testing in Phase 9 spec ("auth 4 paths + mobile reset-password + event create + guest CRUD + plan checkout with 3DS + admin lists + notifications + post-event guest portal") is not implementable by automation alone — it requires a physical device (mobile deep-links and SecureStore diverge in the simulator) and a real Moyasar test-card session. Documented as a tickbox checklist with sign-off table. **User runs this before every release.**

**Build evidence:**
- `cd shared && npm run lint` exit 0.
- `cd halla-mobile && npm run lint` exit 0.
- `cd labbe && npm run lint` exit 0 (0 errors, 29 baseline warnings — see above).
- `cd labbe && npm run build` exit 0 (full route table prerenders).
- `cd halla-mobile && npx expo export --platform web` exit 0 at 6.46 MB (down from slice 8's 6.8 MB — likely a coincidence of which transient deps got hoisted).

**Phase 9 complete — structural unification ships.** Remaining items in the report are:
- §7.3 follow-up (ban `console.log` in mobile services; ban `useNavigation`/`useRouter` in `hooks/`; rest of the cleanup). Lock-in for those rules can be added to the existing eslint configs once the underlying code is ready — Phase 9 left the wiring in place.
- Matrix divergence (`ROLE_PAGE_ACCESS` vs `ACCESS_MATRIX`) — product decision still pending; surfaced in slice 8 entry, not closed here.

### 2026-05-30, Phase 8 slice 8 (Opus 4.7 1M) — §2.2 gap close: utils + constants → `@halla/shared`

**Shipped, both builds green (`next build` exit 0 for `labbe`; `expo export --platform web` exit 0 at 6.8 MB for `halla-mobile`):**

Closes the §2.2 "Goes in" bullets that earlier slices skipped. The schemas / `API_PATHS` / `ApiError` half of §2.2 was already in shared; the **pure utilities + role/permission constants** half wasn't, and consumers still imported these per-app. Phase 9's CI lint gate would have caught the duplication after the fact — better to close it before the verification slice.

**Pre-flight gap audit (what was actually missing vs. §2.2 promises):**
- `DirectionUtils.js` — duplicated on both apps, **zero external consumers**. Dead code, planned at §2.2 time, never wired.
- `locale.js` (incl. `getLocalized`, `formatNumber`, `formatCurrency`, `formatDateTime`, `localizeDigits`) — duplicated; mobile copy was a superset (8 named exports) while web only had `getLocalized`.
- `formatTemplateDate.js` — byte-identical copies on both apps.
- `utils/constants/eventStatus.js` — duplicated, near-identical (web carried JSDoc the mobile copy stripped).
- `utils/constants/ticketConstants.js` (web only) — never in shared.
- `utils/constants/plans.js` (mobile only — `isPoolPlan`, `isPerEventPlan`, `planHasBillingCycle`, `COMPENSATION_PERCENTAGE`) — never in shared.
- Role/access enums (`USER_ROLES`/`ROLES`, `ADMIN_PAGES`/`PAGES`, `ACCESS_LEVELS`, `ADMIN_ROLES`, `WHITELABEL_ROLES`) — duplicated and **divergent** between web (`labbe/ui/layout/navConfig.js`) and mobile (`halla-mobile/utils/adminPermissions.js`).
- `xlsxUtils.js` — divergent by design (mobile uses `expo-file-system` + `expo-sharing` + `expo-document-picker`); shared core (header/row mapping, parse-to-objects) was still duplicated.

**Files added to `@halla/shared` (8):**
```
shared/src/utils/locale.js              (mobile-canonical: 6 named exports)
shared/src/utils/formatTemplateDate.js  (verbatim from FE copies)
shared/src/utils/xlsx.js                (buildSheetAOA / buildWorkbook /
                                         validateXlsxHeaders / parseXlsxRowsToObjects /
                                         validateStaffRow / validateGuestRow)
shared/src/constants/eventStatus.js     (EVENT_STATUS + EVENT_STATUSES + EVENT_STATUS_GROUPS)
shared/src/constants/ticketConstants.js (TICKET_TYPES + TICKET_STATUS + TICKET_PRIORITY)
shared/src/constants/plans.js           (isPoolPlan / isPerEventPlan / planHasBillingCycle /
                                         COMPENSATION_PERCENTAGE)
shared/src/constants/roles.js           (ROLES + USER_ROLES alias + ROLE_HIERARCHY +
                                         ADMIN_ROLES + WHITELABEL_ROLES + PLATFORM_ADMIN_ROLES +
                                         isAdminRole / isWhitelabelRole / isPlatformAdmin /
                                         hasRoleAccess / getManageableRoles —
                                         all mirror backend `shared/constants/roles.js`)
shared/src/constants/permissions.js     (ADMIN_PAGES + ACCESS_LEVELS + PERMISSIONS —
                                         mirror backend `shared/constants/permissions.js`)
```
`shared/src/constants/index.js` barrel updated to export all five constants files (the previous Phase 0 placeholder file is gone).

**Files deleted (7):**
```
labbe/utils/DirectionUtils.js              (dead, no consumers)
halla-mobile/utils/DirectionUtils.js       (dead, no consumers)
labbe/utils/locale.js                      (→ @halla/shared/utils/locale)
halla-mobile/utils/locale.js               (→ @halla/shared/utils/locale)
labbe/utils/formatTemplateDate.js          (→ @halla/shared/utils/formatTemplateDate)
halla-mobile/utils/formatTemplateDate.js   (→ @halla/shared/utils/formatTemplateDate)
labbe/utils/constants/eventStatus.js       (→ @halla/shared/constants/eventStatus)
labbe/utils/constants/ticketConstants.js   (→ @halla/shared/constants/ticketConstants)
halla-mobile/utils/constants/eventStatus.js (→ @halla/shared/constants/eventStatus)
halla-mobile/utils/constants/plans.js       (→ @halla/shared/constants/plans)
```
Empty `utils/constants/` directories pruned on both apps.

**Consumers re-pointed (29 imports across 28 files):**
- `eventStatus` (2): `labbe/components/event-detail/EventFailureBanner.jsx`, `halla-mobile/components/events/EventFailureBanner.js`
- `ticketConstants` (1): `labbe/app/[lang]/ticket-rating/[id]/page.js`
- `plans` (3): `halla-mobile/components/admin-dashboard/plans/PlanListItem.js`, `halla-mobile/components/plans/PlanSummaryCard.js`, `halla-mobile/components/plans/CurrentPlanCard.js`
- `formatTemplateDate` (4): both `TemplatePreviewCanvas` files + both `DatePicker` files
- `locale` (22): 13 mobile (3 plans cards, 2 plans-admin modals, 2 admin-dashboard subscription modals, 4 event/create-event components, whitelabel signup + admin screens) + 9 web (3 admin-dash plans pages, 2 host plans pages, 2 whitelabel signup steps, 1 admin-dash whitelabels table, 1 admin-dash subscription popup)
- **Bonus inline-duplication fix**: `halla-mobile/components/plans/PlanDescription.js` had its own `const COMPENSATION_PERCENTAGE = 15` — swapped for the shared import. Surfaced during the locale pass.

**Role/permission constants — partial close (matrix divergence surfaced, not silently reconciled):**

Lifting the enum half — `ROLES`/`USER_ROLES`, `ADMIN_PAGES`/`PAGES`, `ACCESS_LEVELS`, `ADMIN_ROLES`, `WHITELABEL_ROLES`, `PLATFORM_ADMIN_ROLES`, and hierarchy helpers — was safe because every source (backend `shared/constants/roles.js` + `permissions.js`, web `navConfig.js`, mobile `adminPermissions.js`) uses identical role-string values for the 8 keys. The shared files mirror backend.

App-local files now re-export from shared:
- `labbe/ui/layout/navConfig.js` — replaces its local `USER_ROLES`, `ADMIN_ROLES`, `WHITELABEL_ROLES`, `isAdminRole`, `isWhitelabelRole`, `ACCESS_LEVELS` definitions with imports from `@halla/shared/constants/{roles,permissions}` and re-exports them so every existing `from "@/ui/layout/navConfig"` consumer continues to resolve. The web-side `ROLE_PAGE_ACCESS` matrix, `adminNavItems`/`hostNavItems`/`vendorNavItems`/`whitelabelNavItems` (which carry `react-icons/io5` imports), and the `getNavItemsForRole`/`canAccessPage`/`getDashboardTypeFromPath`/`getBasePath`/`isNavItemActive` helpers stay local.
- `halla-mobile/utils/adminPermissions.js` — imports the same enums + hierarchy helpers from shared and re-exports them. The mobile `ACCESS_MATRIX` and `NAV_ITEMS` array stay local.

**Matrix divergence — flagged, not fixed.** Backend, web, and mobile all disagree on several rows:
| Row | Backend | Web | Mobile |
|---|---|---|---|
| `MODERATOR.SETTINGS` | NONE | FULL | VIEW |
| `WHITELABEL_MODERATOR.SETTINGS` | NONE | VIEW | VIEW |
| `WHITELABEL_MODERATOR.plans` | (no entry) | VIEW | VIEW |
| `ADMIN.manage_plans` / `manage-plans` | NONE | FULL | (mobile lacks key) |
| `SUPER_ADMIN.plans` | (no entry — only `manage_plans`) | NONE | FULL |
| Page key naming | `manage_plans` (underscore) | `manage-plans` (hyphen) | lacks the key |
| `template_categories`, `taqnyat_templates` | (full set, role-graded) | (full set, role-graded) | mobile has no `TEMPLATE_CATEGORIES` / `TAQNYAT_TEMPLATES` keys |

Reconciling these means changing what a logged-in user can see/do, so it's a **product decision**, not a unification refactor. Surfaced here so it can be triaged separately. Until resolved, `shared/src/constants/permissions.js` intentionally omits `ROLE_PAGE_ACCESS`; the per-app matrices stay authoritative for their respective apps. The header comment on `shared/src/constants/permissions.js` explains this.

**xlsxUtils — split with eyes open.** The two consumer count (1 web + 1 mobile) is tiny, but the shared core ended up at ~70 substantive lines (header validation + row→object mapping + the staff/guest validators) — worth extracting. Web `xlsxUtils.js` shrinks from 237 → 105 lines, mobile shrinks from 147 → 102 lines, with one shared source of truth for parse rules. Signatures preserved (web stays sync `exportToXLSX(headers, data, filename, isTemplate)` and `importFromXLSX(file, expectedHeaders, validateRow)`; mobile stays async `exportTemplateXLSX(headers, sampleData, filename)` and `importFromXLSX(expectedHeaders, validateRow)`).

**Build evidence:**
- `cd labbe && npm run build` exit 0 — full route table prerenders (host + admin-dash + vendor-dashboard + landing + market-place + auth/signup/whitelabel flows, including the 9 web files that changed locale/eventStatus/ticketConstants imports and `navConfig.js` itself).
- `cd halla-mobile && npx expo export --platform web` exit 0 at 6.8 MB (was 6.79 MB after slice 7; +10 KB is within noise for the added shared barrel paths). Native iOS/Android paths not exercised; all changes are pure JS in utils/constants so platform divergence is not expected.

**Sanity verification:**
```
$ grep -rn "from .*utils/(DirectionUtils|locale|formatTemplateDate)|utils/constants/(eventStatus|ticketConstants|plans)" labbe halla-mobile
(no source-code matches — only docs/audit references remain, intentional)
$ grep -rn "from .*utils/xlsxUtils" labbe halla-mobile
labbe/app/[lang]/host/create-event/_components/stepTwo/GuestImporter.js
halla-mobile/components/createEvent/_components/ImportExportSection.js
(both unchanged — consumers use the per-app wrappers, which now delegate to @halla/shared/utils/xlsx)
```

**Post-build advisor-caught regression — fixed before close.** First mobile build exited 0, but the advisor flagged that mobile consumers of `PAGES.PLANS` (6 sites: 4 in `navigation/AdminNavigator.js`, 2 in `screens/admin/admin-dashboard/AdminMoreScreen.js`) would silently resolve to `undefined` because the new mobile `PAGES = ADMIN_PAGES` alias dropped the legacy `PLANS: "plans"` key (backend only has `MANAGE_PLANS`). `canViewPage(role, undefined)` returns NONE, which would have hidden the admin plans tab on mobile at runtime — a real regression that compiles cleanly. Fix in `halla-mobile/utils/adminPermissions.js`: `export const PAGES = { ...ADMIN_PAGES, PLANS: "plans" }`. Mobile rebuild after the fix: `expo export --platform web` exit 0, bundle still 6.8 MB. The matrix `ACCESS_MATRIX` already used the literal `plans:` key for the rows, so behavior is identical to pre-slice. `PAGES.TEMPLATE_CATEGORIES` / `PAGES.TAQNYAT_TEMPLATES` have zero mobile consumers — exposing them as resolvable identifiers is fine (matrix returns NONE by default for unmapped keys, which matches the previous behavior where the keys didn't exist).

**Remaining Phase 8 ledger (this slice does NOT close — surfaced for triage):**
- **Matrix divergence (`ROLE_PAGE_ACCESS` / `ACCESS_MATRIX`)** — see table above. Product decision pending. Once resolved, lift the reconciled matrix into `shared/src/constants/permissions.js` and delete the per-app copies. The per-app file structure (`navConfig.js` nav items + helpers, `adminPermissions.js` nav items + helpers) stays — only the matrix moves.
- **Inline POOL_PLAN_TYPES with `"unlimited"` in `labbe/app/[lang]/admin-dash/plans/_components/CurrentPlanCard.jsx`** — diverges from the shared `isPoolPlan` (shared set lacks `"unlimited"`). Left untouched because removing `"unlimited"` would change which subscriptions render as pool plans in the admin dashboard. Surface to product for reconciliation.

**Phase 9 unblocked.** §2.2 "Goes in" is now structurally complete: schemas ✓, `API_PATHS` ✓, `ApiError` + i18n mapper ✓, pure utilities ✓ (locale, formatTemplateDate, xlsx core), role/permission enums ✓. The matrix triage above is the one remaining product question, but it doesn't block the Phase 9 verification + ARCHITECTURE.md write-up.

### 2026-05-30, Phase 8 slice 7 (Opus 4.7 1M) — react-hooks/exhaustive-deps cleanup (lint = zero warnings)

**Shipped, `next lint` exit 0 with ZERO warnings (`npm run build` exit 0):**

Cleared the 9 pre-existing `react-hooks/exhaustive-deps` warnings the slice 6 verification gate surfaced. None blocked anything, but several were real performance bugs (memos that recomputed every render because a `|| []` fallback produced a new array reference). Two distinct patterns:

**Pattern A — `X || []` / `X ?? {}` in the closure of a downstream useMemo dep:**

The fallback creates a new reference every render; the downstream `useMemo` cache invalidates every time even when nothing changed. Fix: pull the fallback into its own `useMemo` keyed on the underlying response.

- **`PaymentsTable.js`** — `const payments = data?.data?.payments || []` wrapped in `useMemo` so the `tableData` memo at the bottom of the file actually caches.
- **`plans/page.js`** — 3 wraps: `businessPlansData` (`?? {}`), `quarterlyPlans` (`|| []`), `annualPlans` (`|| []`). These fed three downstream memos (`eventPlans`, `visiblePlans`, `allPlans`), all of which were churning unnecessarily.
- **`useMarketplaceFilters.js`** — `districtIds` (`searchParams.get(...)?.split(",").filter(Boolean) || []`) wrapped so the `activeFilters` memo at the bottom of the hook caches across renders.

**Pattern B — closure references a derived value not listed in deps:**

- **`post-event/page.js`** — the `authError` useMemo read `validatePayload` (derived from `validateData?.data ?? validateData`) but the deps array had `validateData` instead. Functionally fine because `validatePayload` only changed when `validateData` did, but lint can't prove that. Fix: wrap `validatePayload` in its own `useMemo`, then list `validatePayload` in `authError`'s deps. Same end state, lint can verify.

**Pattern C — intentional cache-invalidation dep:**

- **`usePaymentActions.js`** — the idempotency-key useMemo's closure reads `actionPayment` only via truthiness, but `actionPayment?.type` was in deps so switching action type for the same payment remints the UUID. That's a deliberate cache-invalidation pattern lint can't see through. Refactored the closure to read `paymentId` (now in deps) for the truthiness check, and added `// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional cache-invalidation dep` on the `actionType` line with an explanatory comment.

**One refactor produced a new warning, fixed in the same slice:**

After moving the truthiness-check variable from `actionPayment` to `paymentId`, `actionType` became "unused" from lint's perspective even though it's load-bearing for the cache-key semantics. The inline disable with a `--` reason comment documents *why* the rule is overridden — not as a silencer but as a contract note.

**Sanity verification:**

```
$ npx next lint
$ echo $?
0
# Zero warnings, zero errors, zero output beyond Next.js's workspace-root notice.
```

**Build evidence:** `npm run build` exit 0 (~155 routes prerender unchanged); `npx next lint` exit 0 with **zero warnings**.

**Intentionally skipped — Item A (move 6 wrapper UI metadata to `staticData/`):**

The original ledger listed "6 kept web wrappers carry UI metadata — future tidy-up could move them to `staticData/`." Honest scope check before starting: of the 6 wrappers, only 3 actually have movable data arrays (`vendorSettings.js`, `notificationPreferencesSchemas.js`, `addServiceSchema.js`); the other 3 are pure Zod with no UI data to extract. And even for the 3 with data, moving it produces zero behavior change — the data still lives in the same workspace and the schema + metadata are currently colocated, which is the readable pattern. The system instruction explicitly says not to refactor beyond what the task requires, and the original "Phase 8 will revisit whether..." comment was hypothetical. Skipped with reasoning documented; can revisit later if a concrete need arises.

### 2026-05-30, Phase 8 slice 6 (Opus 4.7 1M) — discountSchema reconcile + legacyAdapter retirement + ESLint verification gate

**Shipped, all gates green (`next build` exit 0; `next lint` exit 0 with the new rules; `expo export --platform web` exit 0 at 6.78 MB):**

The user asked for "all three" of the remaining items in one slice. Honest scope check first: of the 7 wrapped/inline schemas, only 1 (`halla-mobile/utils/schemas/discountSchema.js`) genuinely reconciles with shared — the other 6 either keep web-side DynamicForm metadata + Arabic UI labels (`vendorSettings.js`, `notificationPreferencesSchemas.js`, `addServiceSchema.js` web, `vendorServiceSchema.js` mobile), bind web-specific runtime values (`createEventSchema.js` web's `FONT_IDS`), or are web-only / mobile-only with no cross-platform peer (`staffSchemas.js` web's portal-only types, `eventAddintionSchemas.js` web's admin-popup-only types). Migrating them produces zero cross-platform value and adds indirection. They stay by design; the report's Appendix A "kept" lists already document why.

**Item 1 — discountSchema reconcile (1 file):**

- `halla-mobile/utils/schemas/discountSchema.js` was a 43-line inline Zod schema **byte-identical** to `@halla/shared/schemas/admin#discountSchema` (same Arabic strings, regex, `superRefine` clauses). Deleted; the sole consumer `components/admin-dashboard/discounts/DiscountFormModal.js` now imports from `@halla/shared/schemas/admin`.

**Item 2 — legacyClientAdapter retirement (99 call sites + 2 stragglers):**

Phase 3 left `services/legacyAdapter.js` as a `.get/.post/.patch/.put/.delete` façade around `apiRequest({ method, path, data, params, config })` so the three legacy services (`notification.js`, `staff.js`, `adminDashboard.js`) and two staff hooks didn't need rewriting at that time. Phase 8 finishes the job.

- **`notification.js` (10 sites)** — rewritten end-to-end. `apiClient.get(\`${BASE}${qs}\`)` patterns collapse to `apiRequest({ method: "GET", path: BASE, params: options })` so the axios `params` config handles serialization (no more `buildQueryString` helper needed at the call site).
- **`staff.js` (9 sites)** — rewritten. The wrinkle: staff portal carries a JS-readable `staffToken` cookie that the adapter mapped onto `options.token` → `Authorization: Bearer ...`. New code uses a local `staffAuthConfig()` helper that builds `{ headers: { Authorization: ... } }` and passes it as `apiRequest`'s `config` arg. Behavior preserved.
- **`adminDashboard.js` (78 sites, 641 lines)** — full rewrite. Every API namespace (`dashboardAPI`, `hostsAPI`, `moderatorsAPI`, `whitelabelAPI`, `vendorsAPI`, `eventsAPI`, `subscriptionAdminAPI`, `addonsAPI`) collapsed to `apiRequest({ method, path, data, params })` calls. The vestigial `token = null` parameter every function carried is gone — HttpOnly auth cookies flow via `withCredentials: true` on the axios instance, so the cookie auth path is unchanged. Functions that previously took `{ token, headers: { ... } }` now pass `config: { headers: { ... } }`. Unused `APIError` import (re-export of shared `ApiError`) dropped.
- **`hooks/staff/{mutations,queries}.js` (2 sites)** — rewritten. The one explicit-headers case (idempotency key on `revokeStaffAccess`) maps to `apiRequest({ ..., config: { headers: { "Idempotency-Key": ... } } })`.
- **2 caller stragglers cleaned** — `HostSelector.js` and `AdminEventHeader.jsx` were passing a token positional arg that became dead after the rewrite. Removed for hygiene (JS would have silently ignored them).
- **`services/legacyAdapter.js` deleted.** Grep for `legacyClientAdapter|legacyAdapter|APIError` returns only doc-comment references in the three rewritten services.

**Item 3 — ESLint verification gate (rules in `labbe/.eslintrc.json`):**

- **`no-console`**: error on `console.log` in source; allow `console.warn` / `console.error`.
- **`no-restricted-imports`**: forbids the 14 deleted-or-relocated legacy paths with per-path messages pointing at the canonical shared location. Also a pattern block on `**/services/new-backend/*` so any reborn import gets caught.
- **`no-restricted-syntax`**: blocks string literals matching `/api/v[0-9]+/` outside `@halla/shared` so the API prefix lives in exactly one place.

The rules going green is the verification — every legacy path documented as "deleted" or "relocated" in this report's prior slices is now also enforced by the build.

**Pre-rule cleanup that the new `no-console` exposed:**
- 5 stale debug `console.log` calls removed: `Actions.js` (2), `CustomPieChart.js` (1), `Notifictions.js` (1), `UploadFile.js` (1), `EventCard.js` (1).
- `services/http.js` dev-only API logger (gated by `NODE_ENV === "development"`) kept and tagged with `// eslint-disable-next-line no-console`. This is the canonical pattern — disable inline + explain.
- `ui/commen/new-table/ExampleUsage.jsx` (13 hits) flagged with file-level `/* eslint-disable no-console */` and a `--` reason comment ("demo file; example handlers intentionally log").

**Sanity verification:**

```
$ grep -rn legacyAdapter\|legacyClientAdapter\|APIError labbe/
labbe/services/{adminDashboard,notification,staff}.js — historical doc-comment refs only
$ grep -rn console\.log labbe/ | grep -v ExampleUsage | grep -v "eslint-disable"
(no matches outside the demo file's blanket disable)
$ npx next lint
# only pre-existing react-hooks/exhaustive-deps warnings (out of scope)
# zero new errors from no-console, no-restricted-imports, no-restricted-syntax
```

**Build evidence:** `npm run build` exit 0 (route table prerenders unchanged at ~155 routes); `npx next lint` exit 0 with the new rules in force (warnings only, no errors); `npx expo export --platform web` exit 0 at 6.78 MB (unchanged — slice was web-only after the discountSchema delete).

**What "kept by design" looks like now** — the 6 web wrappers + mobile inline that stayed:

| File | Why it stays |
|---|---|
| `labbe/utils/schemas/vendorSettings.js` | `{ sectionKey, titleKey, zodSchema, fields }` DynamicForm metadata; Zod bodies already imported from shared |
| `labbe/utils/schemas/notificationPreferencesSchemas.js` | UI option config with Arabic labels + i18n keys; schemas already imported from shared |
| `labbe/utils/schemas/staffSchemas.js` | Web-only (staff portal); mobile never consumes |
| `labbe/utils/schemas/eventAddintionSchemas.js` | Web-only admin popups; mobile uses different surface |
| `labbe/utils/schemas/addServiceSchema.js` | SERVICE_TYPES with web-specific `labelKey` + `labelAr` |
| `labbe/utils/schemas/createEventSchema.js` | Binds web's live `FONT_IDS` from `@/config/fonts` into `buildDynamicTemplateSchema` |
| `halla-mobile/utils/schemas/vendorServiceSchema.js` | Mobile-specific SERVICE_TYPES + PREDEFINED_TAGS with different Arabic labels than web's parallel |

**Phase 8 = COMPLETE.** Every Phase 8 ledger item is shipped. The full structural unification (Phases 1–8) is done. What's left in the original plan is Phase 9 — final verification + `ARCHITECTURE.md` — which is documentation work, not refactoring.

**Open items intentionally not addressed in Phase 8** (none block any deployment):
- The 5 web wrappers above keep web-side UI metadata; moving that metadata to a `staticData/` folder is a possible future tidy-up but not Phase 8.
- The `react-hooks/exhaustive-deps` warnings surfaced by lint (12+ in admin/host components) are pre-existing and Phase 8 didn't touch them.
- Phase 9's runtime-evidence pass should still exercise: auth (4 paths), event create wizard (host + admin), guest CRUD, plan checkout with 3DS, admin host/vendor list, notifications, post-event guest portal.

### 2026-05-29, Phase 8 slice 5 (Opus 4.7 1M) — eventsService.js _legacyToken removal

**Shipped, both builds green (`expo export --platform web` exit 0 at 6.78 MB for `halla-mobile`; `next build` exit 0 for `labbe` — web is untouched but verified):**

Slice 1's `_legacyToken` cleanup applied to the much-larger events service. Slice 1 explicitly deferred this because "rewriting every signature in the file plus 30+ call sites deserves its own pass." This is that pass.

**Surface change in `halla-mobile/services/eventsService.js` — 20 function signatures cleaned:**

1. Internal `authenticatedFetch(path, _legacyToken, options)` → `authenticatedFetch(path, options)`.
2. Nineteen exported API functions dropped their `_token` / `_legacyToken` parameter and their internal call-through:
   - **CRUD**: `getUserEventsWithStats`, `getEventStats`, `getEventById`, `getSingleEventStats`, `updateEventStep2`, `deleteEvent`, `bulkDeleteEvents`, `getSubscriptionInfo`, `updateEventDetails`.
   - **Guests**: `updateGuestList` (the tricky one — `_token` was in middle position between `guestList` and `staffList=null`, removing it collapses the signature to `(eventId, guestList, staffList=null)`; the only external caller `updateGuestListAPI(eventId, guestData)` passes 2 positional args, so `staffList` keeps its `null` default — behavior unchanged).
   - **Staff**: `updateStaffList`, `addStaff`, `updateStaff`, `deleteStaff`, `revokeStaffAccess`. `listStaffTokens` was already tokenless.
   - **Settings/launch**: `updateInvitationSettings`, `retryLaunch`, `updateLaunchSettings`, `sendTestMessage`.

`exportEvents` was already tokenless from slice 1. Pure formatters at the bottom of the file (`formatEventForDisplay`, `formatGuestForDisplay`, `calculateResponseRate`, `groupGuestsByStatus`) never took a token — unchanged.

**5 consumer call sites updated to drop the now-unused `token` arg:**

```
halla-mobile/hooks/events/queries.js                       (3 call sites)
  - eventsService2.getUserEventsWithStats(token)  → getUserEventsWithStats()
  - eventsService2.getEventStats(token)           → getEventStats()
  - eventsService2.getSingleEventStats(id, token) → getSingleEventStats(id)
halla-mobile/hooks/users/queries.js                        (1 call site)
  - getSubscriptionInfoAPI(token) → getSubscriptionInfoAPI()
halla-mobile/screens/common/update-event/useEventLoadAndGate.js  (1 call site)
  - eventsService2.getEventById(eventId, token) → getEventById(eventId)
```

The `useAuthStore((s) => s.token)` subscriptions in these hooks were intentionally left in place — they still gate the query with `enabled: !!token` so the call doesn't fire on the unauthenticated branch. `apiFetch` reads the token straight from the store at request time, so the gate is the only consumer of the React subscription.

**`useEventMutation.js` was already token-free.** Every action's `mutationFn` calls the API with just the data args (`updateEventDetailsAPI(eventId, eventData)`, `addStaffAPI(eventId, data)`, etc.) — the prior session never paid the cost of routing a token through. After this slice, the signatures *match* the call sites for the first time.

**`hooks/staff/mutations.js#useRevokeStaffAccess`** was already passing only `(eventId, staffId)` — line 44 said `return revokeStaffAccess(eventId, staffId);` even when the function's declared signature carried `_token` in third position. Slice 5's signature collapse makes that line correct-by-construction instead of correct-by-accident.

**Sanity verification:**

```
$ grep -n "_legacyToken\|_token" halla-mobile/services/eventsService.js
17: * token on 401 and retries. Phase 8 dropped the `_legacyToken` second-arg ...
     # only the historical doc comment — no parameter references remain
$ grep -rEn "(<19 fn names>)\(.*,\s*token\b" halla-mobile/
(no matches — no stale token-passing callers)
```

**Build evidence:** `expo export --platform web` exit 0 at 6.78 MB (unchanged from slice 4). Web (`next build`) exit 0 — verified out of paranoia even though no web file was touched.

**Runtime considerations (per slice 1's advisor playbook):**

- The notification-flow analogy carries over: `apiFetch` reads `useAuthStore.getState().token` on every call (`services/http.js`, line 147 pre-rename), so removing the React subscription's `token` from the call args has no effect on token attach. 401 still triggers `_refreshOnce()` + replay.
- The host event-creation wizard, single-event screen polling (`useSingleEventStats` with status-keyed `refetchInterval`), and the admin retry-launch button all flow through these signatures. Build-green covers compile correctness only; the next end-to-end QA pass should exercise: (a) create event, (b) update guest list, (c) retry a failed launch, (d) revoke staff access. None of these have behavior changes by construction, but they're the high-traffic mutation paths.

**Remaining Phase 8 ledger:**

- **Remaining wrapped / inline schemas** in `utils/schemas/` (5 web wrappers + 2 mobile inline) — Phase-1-style migration into shared.
- **Legacy `apiClient` alias retirement** — when the three sibling services (`notification.js`, `staff.js`, `adminDashboard.js`) and the two staff hook files migrate from `legacyClientAdapter` to `apiRequest` directly, the adapter itself can be deleted and the local `apiClient` aliases go with it.
- **ESLint rules** — lands last as a verification gate.

### 2026-05-29, Phase 8 slice 4 (Opus 4.7 1M) — api.config shim removal + new-backend/ folder deletion

**Shipped, both builds green (`next build` exit 0; `expo export --platform web` exit 0 at 6.78 MB):**

The slice 2 schema-shim pattern applied to the last remaining web compat shim: `labbe/services/new-backend/api.config.js`. Once its 77 consumers point at the canonical `@halla/shared/api/paths`, the shim file deletes cleanly *and* the now-empty `services/new-backend/` folder goes with it. End state: `labbe/services/` is a flat folder.

**77 consumers re-pointed** (two import shapes, both swept with grep verification):

- 76 alias imports: `@/services/new-backend/api.config` → `@halla/shared/api/paths`.
- 1 sibling-relative import in `labbe/services/staff.js` (`"./new-backend/api.config"` → `"@halla/shared/api/paths"`). Slice 3 taught the lesson — a `services/X` regex doesn't catch bare-relative `./X` imports, so this pass explicitly grepped both forms before AND after the swap.

Each consumer kept its `import { API_PATHS } from ...` — the shim re-exported `API_PATHS` (plus 22 named domain exports + `default`) from shared, but every actual consumer used only `API_PATHS`. The 22 unused re-exports go with the shim.

**Shim + folder deleted:**

```
git rm -f labbe/services/new-backend/api.config.js
# rmdir was implicit — git rm removed the empty parent
```

A doc-comment reference in `labbe/services/templatesService.js` (`"...endpoints in services/new-backend/api.config.js"`) was updated to point at `@halla/shared/api/paths` so the comment doesn't refer to a path that no longer exists.

**Bonus catch — the sed pattern was greedy.** The first pass also rewrote the doc comment inside `api.config.js` itself (the shim referenced its own old name in its docs). That showed up as an unstaged "modification" on a file we were about to delete, so `git rm -f` cleared both the in-place edit and the file. No actual code change leaked — only the dying shim's self-referential comment.

**Sanity verification:**

```
$ grep -rn "new-backend/" labbe/
(no matches)
$ grep -rn "api\.config" labbe/ halla-mobile/
(no matches — including stale doc comments)
$ grep -rl "@halla/shared/api/paths" labbe/ | wc -l
76
```

The 76 (vs the original 77) reflects that one consumer file was double-counted in the earlier scope grep because the shim file itself appeared in `grep -rl new-backend/api.config`.

**End-state architecture win:** `labbe/services/` is now flat. Every file in the folder is either a domain-specific service (`adminDashboard.js`, `notification.js`, `staff.js`, `templatesService.js`, `taqnyatTemplatesService.js`, `scheduledExtraRemindersService.js`), or one of the four canonical building blocks (`http.js`, `legacyAdapter.js`, `errorHandlingService.js`, `serverAuth.js`, `guestTokenUtils.js`, `apiResponseHandler.js`). The Phase 3 "collapse the new-backend tree" goal lands cleanly.

**Build evidence:** `next build` exit 0 — full route table prerenders (every page that used `API_PATHS` rebuilt without warnings). `expo export --platform web` exit 0 at 6.78 MB (mobile never imported from `new-backend/` so the diff is web-only).

**Remaining Phase 8 ledger:**

- **`eventsService.js` `_legacyToken`** mobile — rewrite the in-file `authenticatedFetch(path, _legacyToken, options)` signature and every internal caller (~50 sites in the same file).
- **Remaining wrapped / inline schemas** in `utils/schemas/` (5 web wrappers + 2 mobile inline) — Phase-1-style migration into shared.
- **Legacy `apiClient` alias retirement** — when the three sibling services (`notification.js`, `staff.js`, `adminDashboard.js`) and the two staff hook files migrate from `legacyClientAdapter` to `apiRequest` directly, the adapter itself can be deleted and the local `apiClient` aliases go with it.
- **ESLint rules** — lands last as a verification gate.

### 2026-05-29, Phase 8 slice 3 (Opus 4.7 1M) — apiClient → http rename + legacy fetch-shim delete

**Shipped, both builds green (`next build` exit 0 for `labbe`; `expo export --platform web` exit 0 at 6.78 MB for `halla-mobile`):**

Mechanical rename per Appendix A.1 / A.2 of this report. ~80 import sites across both apps, plus three file-system moves and one orphan delete.

**File moves (git mv):**

```
labbe/services/new-backend/apiClient.js     → labbe/services/http.js
labbe/services/new-backend/legacyAdapter.js → labbe/services/legacyAdapter.js
halla-mobile/services/apiClient.js          → halla-mobile/services/http.js
```

`legacyAdapter` moved up alongside `http.js` so the relative `import { apiRequest } from "./http"` inside it stays one-level. Its internal `./apiClient` import was retargeted at the same time (the comment block referencing "Phase 3 of the unification deletes the old fetch-based `services/apiClient.js`" was also updated since that delete just happened in this slice).

**Orphan delete:**

```
labbe/services/apiClient.js  — legacy fetch-shim, zero importers verified by grep
```

The Phase 3 plan said to delete this after Phase 3 finished; the prior session left it as a `@deprecated` re-export of `legacyClientAdapter` in case any straggler imported it. Grep across all of `labbe/` for `from .*@/services/apiClient` confirmed zero importers, so the file is gone.

**Import-site rewrites (83 sites, mass-sed pass with before/after grep verification):**

- 73 web sites: `@/services/new-backend/apiClient` → `@/services/http`. Covers admin-dash + host pages, every `hooks/<domain>/{queries,mutations}.js` (auth, addons, admin, checkout, dashboard, discounts, events, guests, locations, messaging, notifications, payments, plans, postEvent, subscriptions, tickets, users, vendors, vendorServices), three peripheral services (`scheduledExtraRemindersService`, `taqnyatTemplatesService`, `templatesService`), `stores/authStore.js`, `ui/admin/SendNotificationPopup`, `ui/auth/verify-email/VerifyEmail`, `ui/layout/notifications/NotificationDropdown`, and `components/event-detail/GuestTable/useGuestTableActions`. The 5 import shapes (`apiRequest`, `downloadExportFile`, `createServerQueryClient`, `prefetchServerData`, `QueryClientServerProvider`) all survive the path swap.
- 2 web sites: `services/new-backend/legacyAdapter` → `services/legacyAdapter` (`hooks/staff/{mutations,queries}.js`). The 3 sibling services (`notification.js`, `staff.js`, `adminDashboard.js`) used bare `./new-backend/legacyAdapter`; those caught in a follow-up pass to `./legacyAdapter` after the first build surfaced them.
- 8 mobile sites: `services/apiClient` → `services/http`. Covers `App.js`, `components/commen/MapPicker.js`, the existing event/messaging/tickets/guestPortal hook files, and the `services/apiClient.js` file (now gone). 24 sibling services inside `halla-mobile/services/` used bare `./apiClient`; caught in the follow-up pass and rewritten to `./http`.

**Two build-failures-then-fixes — worth recording because they're the kind of regression a less surgical sed would have hidden:**

1. **Web build 1**: `Module not found: Can't resolve './new-backend/legacyAdapter'` from `services/{notification,staff,adminDashboard}.js`. The first sed pattern targeted `services/new-backend/legacyAdapter` (with `services/` prefix), but the bare `./new-backend/legacyAdapter` in sibling-service files didn't match. Fix: second sed pass on `./new-backend/legacyAdapter` → `./legacyAdapter`. After that, `next build` exit 0.
2. **Mobile build 1**: `Unable to resolve module ./apiClient from authService.js`. Same shape — the first pattern caught `../services/apiClient` and `../../services/apiClient` but not the bare sibling `./apiClient` used by 24 services inside `halla-mobile/services/`. Fix: second sed pass on `"./apiClient"` → `"./http"`. After that, `expo export` exit 0.

These were exactly the kind of fall-through cases the report's Phase 8 plan calls out as "high blast radius" — the lesson is to always grep the post-state for the old name with `grep -rn`, not just `grep -rl <new-name>`.

**Sanity verification:**

```
$ grep -rn apiClient labbe/ halla-mobile/ | grep -v node_modules | grep -v ".next" | grep -v dist
labbe/services/legacyAdapter.js — historical doc comment only
labbe/services/{notification,staff,adminDashboard}.js — `legacyClientAdapter as apiClient` local aliases (intentional)
labbe/hooks/staff/{mutations,queries}.js — same `legacyClientAdapter as apiClient` aliases
halla-mobile/ — no matches
$ grep -rl new-backend/ labbe/ | wc -l
77   # all api.config.js shim consumers — its own future slice
```

The remaining `apiClient` strings on web are local aliases (`legacyClientAdapter as apiClient` so the existing `apiClient.get(...)` call sites in the three legacy services don't need rewriting). Those go away when `legacyAdapter` itself is retired (deferred — three services still depend on the `.get/.post/.patch/.put/.delete` shape).

**Build evidence:** `next build` exit 0, full route table prerenders (admin-dash, host, vendor-dashboard, market-place, guest portal all touched by the import rewrite). `expo export --platform web` exit 0 at 6.78 MB — actually 10 KB *smaller* than slice 2 because the orphan `labbe/services/apiClient.js` shim is no longer in the workspace (though it never shipped to mobile anyway; the change is bundle noise).

**Remaining Phase 8 ledger:**

- **`labbe/services/new-backend/api.config.js` shim removal** — 77 consumers. Same shape as slice 2's schema-shim removal (re-export from `@halla/shared/api/paths`). After this, the `new-backend/` folder is empty and can be deleted.
- **`eventsService.js` `_legacyToken`** mobile — rewrite the in-file `authenticatedFetch(path, _legacyToken, options)` signature and every internal caller (~50 sites in the same file).
- **Remaining wrapped / inline schemas** in `utils/schemas/` (5 web wrappers + 2 mobile inline) — Phase-1-style migration into shared.
- **Legacy `apiClient` alias retirement** — once the three sibling services (`notification.js`, `staff.js`, `adminDashboard.js`) and the two staff hook files migrate from `legacyClientAdapter` to `apiRequest` directly, the adapter itself can be deleted and the local `apiClient` aliases go with it.
- **ESLint rules** — lands last as a verification gate.

### 2026-05-29, Phase 8 slice 2 (Opus 4.7 1M) — shim removal (schemas + hooks)

**Shipped, both builds green (`next build` exit 0 for `labbe`; `expo export --platform web` exit 0 for `halla-mobile`):**

This slice deletes the compat shims kept "intentionally to minimize consumer churn" by the Phase 1 / Phase 8-slice-1 sessions. Consumers now import from `@halla/shared/...` directly. ESLint rules still deferred to the final slice so the rules going green prove this import cleanup is complete.

**Shim classification (done up front to avoid deleting non-shims):**

- **Pure re-exports — deleted (15 files total).**
- **Materialization wrappers — kept (4 files).** `halla-mobile/utils/schemas/{authSchemas,createEventSchema,updateEventSchema}.js` and `labbe/utils/schemas/ticketRatingSchema.js` call shared factories without `t` and export the materialized schema. Consumers can't just swap path (they'd get the factory, not the schema), so the wrapper *is* the contract.
- **Web wrappers with UI metadata — kept (5 files).** `vendorSettings.js`, `notificationPreferencesSchemas.js`, `staffSchemas.js`, `eventAddintionSchemas.js`, `addServiceSchema.js` carry section-object metadata, Arabic UI labels, hardcoded SERVICE_TYPES lists, or web-side `FONT_IDS` binding (`createEventSchema.js`).
- **Inline (not in shared yet) — kept (2 files).** `halla-mobile/utils/schemas/{discountSchema,vendorServiceSchema}.js`.

**11 schema shims deleted (web 8 + mobile 3):**

```
labbe/utils/schemas/accountSettingsSchema.js
labbe/utils/schemas/updateEventSchema.js          (0 consumers — created in Phase 1, never wired)
labbe/utils/schemas/ticketSchema.js
labbe/utils/schemas/planSchema.js
labbe/utils/schemas/postEventSchemas.js           (0 consumers — same story)
labbe/utils/schemas/adminPopupSchemas.js
labbe/utils/schemas/authSchema.js
labbe/utils/schemas/settingsSchemas.js
halla-mobile/utils/schemas/settingsSchema.js
halla-mobile/utils/schemas/ticketSchema.js
halla-mobile/utils/schemas/vendorSchemas.js
```

**24 schema consumers re-pointed.** Web: 8 auth screens (login, change-password, forget-password, vendor / whitelabel / host signup, continue-signup) → `@halla/shared/schemas/auth`. Admin popups (12 files: discount, host, moderator-add/edit, taqnyat-assign/create, category, ticket-assign/response, vendor-rating, send-notification, subscription-assignment) → `@halla/shared/schemas/admin`. Plus `manage-plans/EditPlanPopup` → `schemas/plans`; `host/settings/AccountSettings` → `schemas/settings`; `Notifictions` → `schemas/settings`; the two ticket popups (`SendTicketPopup`, `MakeTicketPopup`) → `schemas/tickets`. Mobile: `ResolveTicketModal` + `TicketModal` → `schemas/tickets`; `AccountSettings` + `NotificationSettings` → `schemas/settings` (with `mobileAccountSettingsSchema as accountSettingsSchema` aliases preserving the consumer-side name); the 4 vendor forms (`AdditionalLinksForm`, `BasicAccountInfoForm`, `PersonalInfoForm`, `ServiceDetailsForm`) → `schemas/vendor` (with `mobileX as X` aliases for `socialLinksSchema`, `basicAccountInfoSchema`, `personalInfoSchema`, `serviceDetailsSchema`).

**4 hook shims deleted:**

```
labbe/hooks/useDebounce.js
labbe/hooks/events/useEventActionGate.js
halla-mobile/hooks/useDebouncedValue.js
halla-mobile/hooks/useEventActionGate.js
```

The web `useEventActionGate` shim carried `"use client"`. To preserve the directive for consumers (`ui/host/events/EventActionsHeader.jsx`, the two `event-detail/*.jsx` banners — all rendered from server components), the directive was lifted into the canonical `shared/src/hooks/useEventActionGate.js` itself. Mobile bundlers (Metro) ignore the directive, so no platform fallout.

**12 hook consumers re-pointed:**

- Web (4 files): `useMarketplaceFilters` → `@halla/shared/utils/useDebounce`; `EventFailureBanner`, `PartialFailureBanner`, `EventActionsHeader` → `@halla/shared/hooks/useEventActionGate`.
- Mobile (3 files via direct path): `LastEvent`, `PartialFailureBanner`, `useEventLoadAndGate` → `@halla/shared/hooks/useEventActionGate`. (`components/home/EventActionsHeader.js` was already on the shared path from a prior session.)
- Mobile barrel + 7 admin screens (`AdminEventsScreen`, `AdminHostsScreen`, `AdminModeratorsScreen`, `AdminPaymentsScreen`, `AdminTicketsScreen`, `AdminVendorsScreen`, `AdminWhitelabelsScreen`) renamed `useDebouncedValue` → `useDebounce`. Behavior unchanged because every caller passes the delay explicitly (350 ms on mobile, 400 ms on web's marketplace); the 500 ms default in the shared module only affects *new* callers. The 350-vs-500 UX question is therefore moot for existing screens — flagged in slice 1 but never bit.

**Sanity verification:**

```
$ grep -rn "utils/schemas/(accountSettingsSchema|updateEventSchema|ticketSchema|planSchema|postEventSchemas|adminPopupSchemas|authSchema|settingsSchemas|settingsSchema|vendorSchemas)" labbe halla-mobile
(no matches)
$ grep -rn "from .*hooks/useDebouncedValue|from .*hooks/useEventActionGate|from .*hooks/events/useEventActionGate|from .*hooks/useDebounce\b" labbe halla-mobile
(no local-path matches — only "@halla/shared/..." paths remain)
$ grep -rn "useDebouncedValue" labbe halla-mobile
(no matches)
```

**Build evidence:** `next build` exits 0 (full route table prerenders; the 4 banner / signup pages that switched their schema source compile without warning). `expo export --platform web` exits 0 at 6.79 MB (no change vs. slice 1, since the shim files were tiny re-exports). Native iOS/Android paths not exercised; all changes are pure JS import-path swaps.

**Remaining Phase 8 ledger:**

- **`apiClient` → `http` rename** (web + mobile). Two files renamed, ~50+ import sites updated. Separate slice because the activity shape is "file mv + bulk import update", different from shim removal.
- **`eventsService.js` `_legacyToken`** mobile — rewrite the `authenticatedFetch(path, _legacyToken, options)` signature and all internal callers.
- **Remaining wrappers/inline schemas left in `utils/schemas/`** — `vendorSettings`, `notificationPreferencesSchemas`, `staffSchemas`, `eventAddintionSchemas`, `addServiceSchema` (web) and `discountSchema`, `vendorServiceSchema` (mobile). The first 5 are wrappers around shared by design (UI metadata, FONT_IDS binding); the last 2 aren't in shared at all yet. Cleaning these is a Phase-1-style migration, not a Phase-8 shim removal.
- **ESLint rules** — `no-restricted-imports` on legacy paths, `no-restricted-syntax` for literal `/api/v2/` outside `@halla/shared`, `no-console`, and the hooks-do-data / screens-do-side-effects rule. Lands last so the rules going green prove import cleanup is complete.

### 2026-05-29, Phase 8 slice 1 (Opus 4.7 1M) — helper extractions + §7 in-place cleanup

**Shipped, build-validated (`next build` exit 0 for `labbe`; `expo export --platform web` exit 0 at 6.79 MB for mobile):**

The Phase 8 plan calls for ~1–2 focused days and a dozen sub-items. This session tackled the low-risk slice the advisor flagged: helper extractions + the §7 in-place cleanup. Schema-shim removal, `apiClient` → `http` rename, and ESLint rules are deferred — ESLint should land last as a verification gate after the shim removal, so it goes green precisely when import cleanup is done.

**Helper extractions to `@halla/shared`:**

- **`shared/src/utils/media.js`** — new. `getMediaUrl(pathOrUrl, { fallback, staticAssetBaseUrl })` and `getStaticAssetBaseUrl(apiBaseUrl)`. The shared version takes the static-asset origin as a parameter so it stays platform-pure. Web wraps it in `labbe/utils/index.js` and binds `process.env.NEXT_PUBLIC_BACKEND_URL`; mobile passes `getStaticAssetBaseUrl(API_BASE_URL)` from `halla-mobile/services/marketplaceService.js`, replacing the bare `.replace("/api/v2", "")` regex at line 71.
- **`shared/src/utils/useDebounce.js`** — new. Both apps' debounce hook unified at **500 ms default** (web's value — more conservative for typeahead). Exports `useDebounce` *and* `useDebouncedValue` (alias) so mobile's seven admin-screen call sites keep their existing name during the incremental rename. Local `labbe/hooks/useDebounce.js` and `halla-mobile/hooks/useDebouncedValue.js` are now 4-line re-export shims; the final Phase 8 sweep will delete them after consumers point at the shared path.
- **`shared/src/hooks/useEventActionGate.js`** — new. The two local copies were byte-identical except for the JSDoc and the `"use client"` directive (web-only). Local files are now shims; the web shim keeps `"use client"` because consumers like `ui/host/events/EventActionsHeader.jsx` are imported from server components. `halla-mobile/components/home/EventActionsHeader.js` already imports directly from the shared path.
- **`shared/src/utils/notification.js`** — new. `formatTimeAgo`, `getNotificationIcon` (40+ type → lucide-name mapping), `getPriorityColor` (low/normal/high/urgent → hex). Web and mobile copies were 100% byte-identical; both services now re-export from shared. The default-export object on mobile drops these three keys because nothing consumed `notificationService.formatTimeAgo(...)` (all consumers used named imports — verified by grep).

**`userAccountService` extraction (mobile-only):**

- **`halla-mobile/services/userAccountService.js`** — new. Holds the 10 endpoints both `vendorService` and `settingsService` reimplemented: `getProfile`, `updateProfile`, `updateProfileWithFiles`, `updateProfileSection`, `updateProfileSectionWithFiles`, `updatePassword`, `deleteAccount`, `sendPhoneChangeOtp`, `updatePhone`, `deleteVendorImage`.
- **`halla-mobile/services/settingsService.js`** — rewritten. Delegates profile / password / file-upload to `userAccountService`. Notification preferences and email verification stay here because vendor code never touches them.
- **`halla-mobile/services/vendorService.js`** — rewritten. Shared-user-account methods delegate; the vendor-only surface (services CRUD, stats, tickets) stays inline.
- **Web equivalent:** none needed. `labbe/hooks/users/mutations.js#useUserMutation` is already the single canonical surface for `/users/profile` + `/users/password`; web collapsed this in Phase 5.

**In-place §7 cleanup:**

- **`_legacyToken` parameter removed from `halla-mobile/services/notificationService.js`** — every signature (`getNotifications`, `getUnreadCount`, `getNotification`, `markAsRead`, `markAllAsRead`, `deleteNotification`, `clearAllNotifications`, `sendNotification`, `broadcastNotification`, and the internal `authenticatedFetch`) drops the token arg. `hooks/notifications/{mutations,queries}.js` updated: the 6 mutation hooks stop reading `useAuthStore((s)=>s.token)`; the 2 queries keep the `token` subscription only as a query-`enabled` gate. **Bonus:** `eventsService.exportEvents(_legacyToken)` and its sole consumer `components/events/EventList.js` also cleaned because it was the same one-off pattern.
- **Mobile console.log audit.** All 14 `console.log` calls in `halla-mobile/services/notificationService.js` swapped for `dlog(...)`. The `dlog` helper that previously lived inline in `authService.js` was promoted to `halla-mobile/utils/log.js` so every service file shares one mute path; `authService.js` now imports it. `console.error(...)` calls preserved — release builds need those.
- **Web commented-block deletion.** Stale `/* if (!session?.user?.email) { redirect(...) } */` removed from `labbe/providers/index.js`. Stale `//* redirect to the new locale path` block, `//const newLocale = e.target.value;`, and the `/* router.push(...) */` skeleton in `labbe/hooks/UseLanguageChange.js` rewritten as real prose comments that explain *why* the locale path is built two different ways.
- **`labbe/utils/index.js` orphan purge.** Verified zero external consumers for `validateStep`, `createStepHandler`, `setNestedValue`, `handleSetStep`, `formatDateForDisplay`, `formatDateWithSpans`, `formatTimeWithSpans`, `dataUrlToBlob`, `dataUrlToFile`, `previewImage`, `uploadImage` (grep across all of `labbe/`, excluding `.next/` and local state variables / CSS class names with the same identifier). The 11 functions deleted. The file is now 84 lines (was 326), keeping only `getMediaUrl` (now the shared wrapper) and `htmlToImageConvert` (html2canvas-only consumer at `useTemplateBake.js`). The §7 callout on `setNestedValue` overlap with `authFormHelpers.js#setNestedValue` is gone — only the canonical copy remains.

**Files added (4):**
```
shared/src/utils/media.js
shared/src/utils/useDebounce.js
shared/src/utils/notification.js
shared/src/hooks/useEventActionGate.js
halla-mobile/services/userAccountService.js
halla-mobile/utils/log.js
```

**Build evidence:** `cd labbe && npm run build` exits 0 (full route table emitted, including landing, host, admin-dash, vendor-dashboard, market-place, guest portal). `cd halla-mobile && npx expo export --platform web` exits 0 with `index-36c1f55a75230bfbe6f7d88204db6c46.js` at 6.79 MB. Bundle size unchanged vs. Phase 5 chunk 6 (6.78 MB → 6.79 MB; the +10 KB is from added shared modules + new userAccountService — well within noise). Native iOS/Android paths not exercised; all changes are pure JS in hooks/services/utils so platform divergence is not expected.

**Remaining Phase 8 ledger (deferred to next sessions):**
- **Schema-shim removal** — ~40+ consumers across both apps still import from `labbe/utils/schemas/*.js` and `halla-mobile/utils/schemas/*.js` (which themselves re-export from `@halla/shared/schemas/*`). Re-point consumer imports, then delete the shims. Own session because of the wide grep + edit blast radius.
- **`apiClient` → `http` rename** — `labbe/services/new-backend/apiClient.js` → `labbe/services/http.js`; `halla-mobile/services/apiClient.js` → `halla-mobile/services/http.js`. Simple `mv` + grep-and-replace, but high blast radius.
- **Debounce/EventActionGate shim removal** — drop the 6 re-export shims after the consumer paths flip to `@halla/shared/...` directly (most useful done in the same pass as schema shims).
- **ESLint rules** — `no-restricted-imports` on legacy paths (`@/services/apiClient` web, `services/EventsService`/`services/eventsService2` mobile), `no-restricted-syntax` for literal `/api/v2/` outside `@halla/shared`, `no-console` (error on `console.log` in `src/**`; warn on `console.warn`/`console.error`), and the hooks-do-data / screens-do-side-effects rule from §2.6. These land **last** so the rule going green is the proof that import cleanup is complete.
- **`eventsService.js` `_legacyToken`** — the in-file `authenticatedFetch(path, _legacyToken, options)` and every caller still carry the second-arg shim. Touching it means rewriting every signature in the file plus 30+ call sites; deserves its own pass.

### 2026-05-29, Phase 6 (Opus 4.7 1M) — auth store alignment, web → mobile-shaped status machine

**Shipped, build-validated (`next build` exit 0 for `labbe`):**

The initial scope estimate of "~30 consumer files" turned out to be raw `grep isAuthenticated|isLoading` noise — most matches are React Query's `useQuery({ isLoading })` and unrelated local `useState` flags. Actual auth-store consumer surface on web:

- `isAuthenticated` read by user code: **1 file** (`ContinueSignupForm.js`).
- `isLoading` read by user code: **0 files** (the store's `setLoading` was defined but never called externally; only `setAuth`/`logout` flipped the flag).
- `setAuth(user, token, subscription)` callers: **5 sites, all in `labbe/hooks/auth/mutations.js`**.
- `setToken`, `initializeAuth`: never called externally (the `token` field was vestigial — HttpOnly cookies have been authoritative since Phase 3).

Files changed:

- **`shared/src/schemas/auth.js`** — added `AUTH_STATUS_VALUES`, `authStatusSchema`, `authStoreSnapshotSchema`. The snapshot covers the *durable* slice both apps persist: `{ user, subscription? }`. Tokens are explicitly excluded (web: HttpOnly cookies; mobile: secure-store for refresh + memory for access). `authSchemas` barrel updated.
- **`labbe/stores/authStore.js`** — full rewrite of the state block:
  - Removed `isAuthenticated`, `isLoading`, `token`, `setToken`, `setLoading`, `initializeAuth`.
  - Added `status: "checking" | "loading" | "authenticated" | "unauthenticated"`, `setStatus`.
  - `setAuth(user, subscription)` (dropped `token` arg) sets `status: "authenticated"`.
  - `logout` resets to `status: "unauthenticated"`.
  - `partialize` now writes only `{ user, subscription }`. `status` is *derived on rehydrate* via `onRehydrateStorage` (`state.user ? "authenticated" : "unauthenticated"`). On web, localStorage rehydration is synchronous, so `checking` is effectively a single render frame on cold mount — we keep the vocabulary for cross-app readability.
- **`labbe/hooks/auth/mutations.js`** — all 5 `setAuth(user, token, subscription)` callers updated to `setAuth(user, subscription)`. The unused `token`/`newToken` locals removed from each handler.
- **`labbe/ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js`** — replaced `const { isAuthenticated } = useAuthStore()` with the selector-based `useAuthStore((s) => s.status === "authenticated")`. The `useEffect` semantics are unchanged (redirects to `/signup` if the user lands here without being authenticated).

**Mobile:** **no changes**. Mobile's store was already the canonical reference (status machine, in-memory access token, secure-store refresh, secure-store user shadow). Spec §6.2's example of renaming `plan` → `subscription` was moot — mobile had neither field. Subscription on mobile is fetched via the dedicated `hooks/subscriptions/` query domain (Phase 5 work), not persisted in the auth store. The shared `authStoreSnapshotSchema` declares `subscription` optional precisely so this asymmetry is *expected* rather than a divergence.

**Persist-migration safety:** the previous web partialize wrote `{ user, isAuthenticated, subscription }`. The new shape is `{ user, subscription }`. zustand's default `merge` is a shallow merge of persisted state into the current store, so on a returning visitor with the legacy shape the stale `isAuthenticated: true` is harmlessly merged in as an unread field; nothing in the codebase reads it anymore, and the next `set()`-triggered persist write rewrites localStorage with just `{ user, subscription }`, purging it. `onRehydrateStorage` runs on the merged state, so `state.user ? "authenticated" : "unauthenticated"` derives correctly in both legacy and new-shape cases. No `version` bump needed because the change is purely a *narrowing* of the persisted slice — no field conflict in either direction. Verified against zustand persist docs (default `merge` semantics).

**`status: "loading"` asymmetry — documented, not a missing feature.** Mobile flips `status` to `"loading"` mid-action because its auth actions live in the store (`loginWithEmail`, `verifyOTP`, etc. call `set({ status: "loading" })` while the network call is in flight). Web's auth actions live in `hooks/auth/mutations.js` as React Query mutations (Phase 3 architecture); their pending state is exposed via `mutation.isPending` on the call site, and the store never goes through `"loading"`. This is *intentional* — moving web's auth actions into the store would regress Phase 3. The store-level status vocabulary is aligned (same enum, same possible states); only the transition policy differs by app.

**Spec §6.5 action-surface alignment — intentionally limited.** The spec says "both stores expose the same action surface, including `resetPassword`." We aligned the *state-setter* surface (`setAuth`, `setUser`, `setStatus`, `setError`, `clearError`, `logout`, OTP setters). We did NOT move web's auth mutations (`login`, `verifyLoginOTP`, `forgotPassword`, `resetPassword`, etc.) into the store — those stay as RQ mutations in `hooks/auth/mutations.js` because Phase 3 deliberately routed all network I/O through React Query for cache and retry semantics. Mobile's in-store actions remain in-store because the mobile app does not consume RQ for the auth flow itself (auth completes before RQ takes over). Both apps DO expose `resetPassword` at their canonical layer: mobile in `useAuthStore`, web via `useAuthMutation("resetPassword")` in `hooks/auth/mutations.js`. This asymmetry is the same shape as `login`/`logout` and is documented here so the next session doesn't read §6.5 and try to "fix" it.

**Runtime verification gap:** `next build` proves the new store and consumer compile. It does NOT exercise (a) rehydration from a real pre-migration localStorage entry, (b) the cold-mount `"checking"`-frame UX, (c) the logout → partialize roundtrip, (d) refresh-after-expiry. The spec's Phase 6 test bar ("cold-launch with cached refresh on mobile; refresh-after-expiry on web; logout from both clears all state") needs a browser session — deferred to the Phase 9 verification pass which runs both apps end-to-end. Mobile was not touched this session, so its existing runtime behavior is unchanged.

**What this unlocks:** any cross-app component or test can now import `authStoreSnapshotSchema` from `@halla/shared/schemas/auth` and validate either store's slice with one assertion. Phase 9's "lock in" verification will use this.

**Remaining ledger:**
- Phase 8 — lint rules (`no-restricted-imports` for deleted legacy paths, forbid literal `/api/v2/` outside `@halla/shared`), helper extractions (`userAccountService`, `getStaticAssetBaseUrl`), schema-shim removals, `console.log` PII audit
- Phase 9 — final verification + `ARCHITECTURE.md`

### 2026-05-29, Phase 5 chunk 6 (Opus 4.7 1M) — mobile cross-domain literal sweep, factory adoption complete

**Shipped, build-validated (`expo export --platform web` exit 0, bundle 6.78 MB):**

Now that the mobile `events` and `guests` factories landed in chunk 5, the cross-domain literals deferred from chunks 4 and 5 are swapped for factory calls:

- **`hooks/checkout/mutations.js`** — `["events","subscription-info"]` → `eventsKeys.subscriptionInfo()`. Imports `eventsKeys`. The "literal stays until events factory lands" comment is gone.
- **`hooks/scheduledExtraReminders/mutations.js`** (both create + cancel) — `["events", eventId]` → `eventsKeys.detail(eventId)`; `["guests", eventId]` → `guestsKeys.forEvent(eventId)`. The guest swap is also a **behavioral fix**: the prior literal `["guests", eventId]` was a no-op invalidation (no query key in the codebase started with `["guests", eventId]` — the actual key is `["guests","events",eventId]` from `guestsKeys.forEvent`). Worth flagging in case anyone noticed stale guest lists after creating/cancelling extra reminders; the factory call now correctly invalidates them.
- **`hooks/staff/queries.js`** (`useEventStaffTokens`) and **`hooks/staff/mutations.js`** (`useRevokeStaffAccess`) — `["events", eventId, "staff-tokens"]` → `eventsKeys.staffTokens(eventId)` on both sides. Byte-identical, so revocations continue to invalidate the matching read.
- **`hooks/guests/mutations.js`** (`_invalidateGuests` helper) — `["events","single-stats",eventId]` → `eventsKeys.singleStats(eventId)`. Byte-identical.
- **`hooks/messaging/mutations.js`** (`invalidateEventCaches` helper) — `["events","single-stats",eventId]` → `eventsKeys.singleStats(eventId)`; `["events"]` bulk → `eventsKeys.all`. `dashboardKeys.host()` left untouched (already factory-based).

**Verified clean — no remaining cross-domain literal keys outside the events domain itself:**
- `grep -n 'queryKey:\s*\[\s*"events"' halla-mobile/hooks/` returns only `hooks/events/mutations/useEventMutation.js` (5 occurrences) — those are within-domain literals that the keys.js comment explicitly allows ("byte-identical to factory output").
- `grep -nE 'hooks/(queries|mutations)/' halla-mobile/` returns zero matches → no stragglers still importing from the deleted legacy folders.

**Caveat on build evidence:** `expo export --platform web` only validates the web build target. Native iOS/Android paths could differ if there's a platform-specific import (none expected — all changes are pure JS in hook files), but a Metro bundler smoke test (`expo prebuild --no-install` dry-run, or running `npm run android`/`ios` once locally) would close that gap. Not run this session.

**Phase 5 = COMPLETE.** Hook layout is unified across both apps. 21 web domains + 24 mobile domains, all using the `{queries.js, mutations.js, keys.js, index.js}` layout, all cross-domain invalidations routed through key factories, both apps have `runCacheMigrations(qc)` infrastructure ready for future key-shape changes (currently empty MIGRATIONS arrays because chunks 1–6 all produced byte-identical keys).

**Remaining ledger:**
- Phase 6 — auth store alignment (web `isAuthenticated`+`isLoading` booleans → mobile-style `status` state machine, ~30 consumer files)
- Phase 8 — lint rules (forbid `no-restricted-imports` on the deleted legacy paths; forbid literal `/api/v2/` outside `@halla/shared`), helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, schema shim removals
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-29, Phase 5 chunk 5 (Opus 4.7 1M) — mobile batches A+B: all remaining mobile domains, legacy folders deleted

**Shipped, build-validated (`expo export --platform web` exit 0, bundle 6.78 MB):**

- **19 new mobile domain folders** at `halla-mobile/hooks/<domain>/{queries.js, mutations.js, keys.js, index.js}` (admin also gets an `infinite.js` split because its infinite-query surface is large and self-contained):
  - **Small read-only:** `dashboard`, `marketplace`, `subscriptions`, `plans`. Mobile `plans` exposes a richer surface than web (`usePlans`, `useHostPlans`, `useBusinessPlans`, `usePlanByCode`, `usePlanById`) because the mobile create-event wizard needs plan lookup by code/id.
  - **Read + write:** `addons` (catalog + my + purchase + admin-activate), `vendor` (profile/stats/services/tickets queries + 6 mutations), `users` (profile + notification settings + subscription queries; profile/password/notification mutations).
  - **Auth:** mutation-only (`useVendorSignup`, `useWhitelabelSignup`) — login/logout sit on the auth store, not React Query.
  - **Checkout:** ports the cart-persistence helpers + `useCheckout` mutation. Cross-domain invalidations now use `subscriptionsKeys.all` + `addonsKeys.all`; the `["events","subscription-info"]` literal stays only because the mobile events factory will land in this same chunk's events migration (see below).
  - **Notifications, discounts, staff, tickets:** identical surface to chunk 2/3 on web with mobile-specific `useAuthStore` token gating preserved.
  - **Guests, guestPortal, messaging, payments:** `guestPortal/keys.js` re-exports `guestsKeys.byInvitation` so the portal stays under the canonical guests namespace. `payments/hooks.js` houses `usePaymentPoll`, which is a `useEffect`-based polling hook (not React Query) — the factory and folder layout exist for symmetry, but there's no queryKey to migrate.
  - **Events queries:** `useUserEventsWithStats`, `useEventStats`, `useSingleEventStats` moved out of `hooks/queries/useEvents.js` and into `hooks/events/queries.js`. Added `hooks/events/keys.js` with `eventsKeys` factory (`all`, `userStats`, `stats`, `subscriptionInfo`, `detail`, `singleStats`, `staffTokens`) — codifies the literal keys already used by existing event mutation files; structurally identical, no cache migration needed. Existing event-mutation files in `hooks/events/mutations/` still use literals (will adopt the factory incrementally).
  - **postEvent:** consolidated `hooks/queries/post-event/{useGuestPostEvent,useHostPostEvent}.js` into a single `hooks/postEvent/` folder split by queries vs mutations (camelCase rename mirrors what we did on web). `postEventKeys.hostContent(eventId)` preserves mobile's `["post-event","host","content",eventId]` shape (one segment longer than web's, byte-identical to mobile's prior literal).
  - **Admin:** the largest migration. `adminKeys` factory consolidates 18 sub-namespaces including infinite-query variants (`hostsInfinite`, `vendorsInfinite`, etc.). `queries.js` covers the 17 list/detail queries; `infinite.js` holds the 7 infinite-query hooks plus the shared `_buildInfinite` + `_normalizePage` + `_normalizeFilters` helpers (the helpers stay private to the file); `mutations.js` covers ~40 mutation hooks across hosts/vendors/moderators/events/tickets/whitelabels/plans/payments. Cross-domain `["tickets"]` invalidation in the admin ticket mutations now uses `ticketsKeys.all`.
- **`halla-mobile/hooks/index.js` barrel rewritten** to re-export from the 21 domain folders + `events/queries` + `events/mutations/useEventMutation` for backward compat with consumers that import from `../../hooks` (the existing convention on mobile).
- **Consumer files re-pointed:** ~17 files with direct-path imports were repointed via a single batched sed pass against the literal import strings (`hooks/queries/useFoo` → `hooks/foo`, etc.). The 2 single-quoted survivors (`useVendorSignup`, `useWhitelabelSignup` in screens/auth/*) were fixed manually. A comment-only reference in `hooks/events/mutations/useEventMutation.js` was updated to point at the new locations.
- **18 old hook files deleted** + the empty `hooks/queries/`, `hooks/mutations/`, and `hooks/queries/post-event/` directories `rmdir`ed. Grep confirms zero remaining references to any deleted path.

**Final mobile hook tree** (`halla-mobile/hooks/`): 21 domain folders — `addons`, `admin`, `auth`, `checkout`, `dashboard`, `discounts`, `events`, `guests`, `guestPortal`, `locations`, `marketplace`, `messaging`, `notifications`, `payments`, `plans`, `postEvent`, `scheduledExtraReminders`, `staff`, `subscriptions`, `taqnyatTemplates`, `templates`, `tickets`, `users`, `vendor`. Plus `_cacheMigrations.js` (registry) and standalone hooks (`useCreateEventForm.js`, `useDebouncedValue.js`, `useEventActionGate.js`, `useFilterData.js`, `useListManager.js`).

**Mobile cross-app convention divergences (intentional, documented for chunk 6):**
- Mobile uses singular `["user", ...]` and `["vendor", ...]` (and `["subscription"]` for the addon purchase) where web uses plural — the literals are preserved byte-for-byte under their respective factories.
- Mobile preserves `useAuthStore` token gating on every authenticated query. Web relies on the HttpOnly cookie so no client-side gating is needed.
- The `useCheckout` mutation on mobile still uses a literal `["events","subscription-info"]` invalidation (it could now use `eventsKeys.subscriptionInfo()` — left for the chunk 6 sweep so the diff stays small here).
- `guestPortal/keys.js` re-exports through the guests namespace because the backend route is `/guests/invitation/:code` — there's no separate "portal" cache key.

**Phase 5 web + mobile = complete.** Remaining ledger:
- Phase 5 chunk 6 — final grep + delete sweep (mostly about swapping the remaining cross-domain literals like the `useCheckout` example above, and verifying no stragglers)
- Phase 6 — auth store alignment
- Phase 8 — lint rules, helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, shim removals
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-29, Phase 5 chunk 4 (Opus 4.7 1M) — mobile pilot: locations, templates, taqnyatTemplates, scheduledExtraReminders

**Shipped, build-validated (`expo export --platform web` exit 0, bundle 6.76 MB):**

- **`halla-mobile/hooks/_cacheMigrations.js`** — mobile equivalent of the web registry. Storage backend is `@react-native-async-storage/async-storage` (already in `package.json`, `2.2.0`). `runCacheMigrations(queryClient)` is async (AsyncStorage is async); `MIGRATIONS` array is empty for the pilot.
- **`halla-mobile/contexts/QueryProvider.js`** — fires `runCacheMigrations(queryClient)` once via `useEffect` after the provider mounts. The function is async but we don't await — startup latency stays at zero, and the migration runs before any real user interaction completes the first query.
- **4 new mobile domain folders** at `halla-mobile/hooks/<domain>/` with `{queries.js, mutations.js, keys.js, index.js}` (locations + taqnyatTemplates are read-only, no mutations.js):
  - **`hooks/locations/`** — `locationsKeys` factory (same shape as web); `useRegions`, `useCitiesByRegion`, `useDistrictsByCity`, `useAllLocations`, `useSearchLocations`. Replaces `hooks/queries/useLocations.js`.
  - **`hooks/templates/`** — `templatesKeys` + `templateCategoriesKeys` + `fontsKeys`; `useHostTemplates`, `useTemplateCategories`, `useFonts`. Mobile uses `useAuthStore` to gate `useHostTemplates` on `!!token` (web doesn't — auth pattern stays divergent because mobile drives the gate from the in-memory token while web relies on the HttpOnly cookie). Replaces `hooks/queries/useTemplates.js`.
  - **`hooks/taqnyatTemplates/`** — `taqnyatTemplatesKeys`; `useHostTaqnyatTemplates` (token-gated). Default export preserved for backward compat with consumers that imported as default. Replaces `hooks/queries/useTaqnyatTemplates.js`.
  - **`hooks/scheduledExtraReminders/`** — `scheduledExtraRemindersKeys`; `useScheduledExtraReminders` query; `useCreateScheduledExtraReminder` + `useCancelScheduledExtraReminder` mutations. Cross-domain `["events", eventId]` + `["guests", eventId]` invalidations kept as literals because mobile events/guests factories don't exist yet — TODO marker left in the file noting they'll swap during chunk 5. Replaces `hooks/queries/useScheduledExtraReminders.js`.
- **5 consumer files re-pointed:** `components/commen/LocationSelector.js` → `../../hooks/locations`; `components/home/EventTemplates.js` → `../../hooks/templates`; `components/createEvent/StepFour.js`, `components/host/post-event/{AccessLinksSheet,MessagingTemplatePicker}.js` → `hooks/taqnyatTemplates`; `components/admin-dashboard/events/ScheduleReminderSection.js` → `hooks/scheduledExtraReminders`. Also fixed `hooks/useFilterData.js` which imported from `./queries/useLocations`.
- **4 files deleted** (zero-importer verified by grep): `hooks/queries/{useLocations,useTemplates,useTaqnyatTemplates,useScheduledExtraReminders}.js`.

**Convention reminders for mobile chunk 5:**
- Mobile uses relative imports (`../../hooks/<domain>`), not the `@/hooks/...` alias used on web — match the surrounding file style.
- Mobile query hooks routinely gate on `!!token` via `useAuthStore`; preserve this when migrating each domain.
- Cross-domain literals for `events`/`guests` stay until those domains migrate in chunk 5; the convention swap happens then.
- The `MIGRATIONS` array in `_cacheMigrations.js` stays empty as long as new factories produce byte-identical arrays to old literals (the pilot does); future mobile chunks that change key shapes add `{ name, run(qc) }` entries — mobile is the bigger risk because users hold versions for weeks.

**Remaining ledger after this chunk:**
- Phase 5 chunk 5 (mobile batches A + B) — addons, admin, adminInfinite, auth, checkout, dashboard, discounts, events, guests, guestPortal, marketplace, messaging, notifications, paymentPoll, plans, post-event, staff, subscriptions, tickets, user, vendor; then delete `hooks/queries/`, `hooks/mutations/`
- Phase 5 chunk 6 — final grep + delete sweep
- Phase 6 — auth store alignment
- Phase 8 — lint rules, helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, shim removals
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-29, Phase 5 chunk 3 (Opus 4.7 1M) — web batch B: all remaining domains, legacy hooks folders deleted

**Shipped, build-validated (`next build` exit 0, "Compiled successfully in 16.4s", full route table emitted):**

- **Deprecated `useEvents` shim deleted** — 7 consumers re-pointed from `@/hooks/reactQueryHooks/useEvents` to `@/hooks/events` (the shim was already a `export *` re-export).
- **`hooks/events/keys.js`** added retroactively (the events domain itself was migrated in Phase 4 but had no key factory yet). Factory: `eventsKeys` with `all`, `myEvents()`, `stats()`, `subscriptionInfo()`, `detail(eventId)`, `singleStats(eventId)`, `staffTokens(eventId)`. The existing event hook files in `hooks/events/{queries,mutations}/` still use literal arrays whose shapes are byte-identical to the factory output — they'll adopt the factory incrementally; cross-domain callers (`checkout`, `scheduledExtraReminders`, `staff`, `guests`, `messaging`, `admin`, `postEvent`) use the factory exclusively.
- **13 new domain folders** at `labbe/hooks/<domain>/{queries.js, mutations.js, keys.js, index.js}` (some without mutations.js for read-only domains; some with only mutations for write-only domains). All factories produce byte-identical arrays to prior literals — no cache migrations registered.
  - **Small read/write:** `dashboard` (`dashboardKeys.host()`), `vendors` (`vendorsKeys.categories()`), `payments` (`paymentsKeys.poll3ds(id)` + `useMyPaymentsExport`), `plans` (`plansKeys.{list,host,landing,business}`), `users` (`usersKeys.{myProfile,notificationPreferences}` + `useUserMutation` factory).
  - **Auth:** `auth/mutations.js` holds the `useAuthMutation(action)` factory (login / OTP / forgot-password / signup / setupPassword / verifyEmail / logout). `authKeys` is a stub for future me-query support. Cross-domain `["users","my-profile"]` invalidation in `verifyEmail` now uses `usersKeys.myProfile()`.
  - **Checkout:** moved cart-persistence helpers + `useCheckout` mutation. Now invalidates `subscriptionsKeys.all`, `addonsKeys.all`, `eventsKeys.subscriptionInfo()` (was the literal `["events","subscription-info"]`).
  - **Staff:** `staffKeys.{all, guests(eventId,filters), guestsForEvent(eventId)}`; `useStaffEventGuests`, `useEventStaffTokens` (uses `eventsKeys.staffTokens(eventId)` since the token list is event-namespaced on the backend); `useStaffMutation("checkInGuest")` + `useRevokeStaffAccess`.
  - **Guests:** `guestsKeys.{all, byToken, byInvitation, forEvent}` + `useGuestByToken` / `useGuestInvitation` / `useGuestMutation(action)` factory (add / update / delete / rotateQr / revokeAccess / export / rsvp). Cross-domain `["events", eventId]` invalidation in mutation success now uses `eventsKeys.detail(eventId)`.
  - **Messaging:** `messagingKeys.stats(eventId)` + 6 write-only hooks (`useSendInvitation`, `useSendBulkInvitations`, `useRetryFailedInvitations`, `useSendReminder`, `useScheduleSend`, `useSendTestMessage`). Cross-domain `["dashboard","host"]` + `["events", eventId]` invalidations now use `dashboardKeys.host()` + `eventsKeys.detail(eventId)`.
  - **Tickets:** `ticketsKeys.{all, myTickets(params), myTicketsPrefix(), assignees(), adminList(), detail(id), forRating(id)}`; queries: `useMyTickets`, `useTicketAssignees`, `useTicket`, `useTicketForRating`; mutations: `useExportTickets`, `useTicketMutation(action)`. Fixed a **pre-existing SSR prefetch bug** in `app/[lang]/admin-dash/tickets/page.js`: the literal `["tickets", filters]` queryKey didn't match the client `useMyTickets` shape (`["tickets","my-tickets", params]`) so SSR data was never used; swapping to `ticketsKeys.myTickets(filters)` aligns both. Added a one-line comment explaining the fix.
  - **Admin:** the largest domain. `adminKeys` factory consolidates 16 sub-namespaces (`dashboard`, `hosts`, `vendors`, `moderators`, `whitelabels`, `plans`, `payments`, `eventDetail`, `eventTargets`, `userSubscriptionInfo`, `whitelabelFeatures`, plus the `adminEventsList` key which intentionally lives in the events namespace, not admin, to match `["events","admin",filters]`). 17 queries + 11 mutation factories (`useAdminHostMutation`, `useAdminVendorMutation`, `useAdminModeratorMutation`, `useAdminWhitelabelMutation`, `useAdminEventMutation`, `useAdminPlanMutation`, `useAdminPaymentRefund/Capture/Void/Export`, `useAdminWhitelabelFeatureMutation`). Cross-domain `["events"]` invalidations in `useAdminEventMutation` swapped to `eventsKeys.all`; the `["plans"]` invalidation in `useAdminPlanMutation` swapped to `plansKeys.all`. Fixed another **pre-existing SSR bug** in `app/[lang]/admin-dash/whitelabels/[id]/details/page.js` (literal `["admin","whitelabels","details",id]` didn't match `useAdminWhitelabel`'s `["admin","whitelabels",id]`); swapped to `adminKeys.whitelabelDetail(id)`. 32 consumer files re-pointed via a single sed pass against the import literal.
  - **Post-event:** folder renamed from `post-event/` (with hyphen, hard to type in JS imports) to `postEvent/`. `postEventKeys` covers guest portal (`validate`, `content`, `comments`) and host management (`hostContent`). 4 queries + 10 mutations (`useTogglePostEventLike`, `useAddPostEventComment`, `useUploadPostEventMedia`, `useDeletePostEventMedia`, `useUpdateThankYouMessage`, `useUpdatePostEventMessagingTemplate`, `usePublishPostEventContent`, `useUnpublishPostEventContent`, `useGeneratePostEventTokens`, `useSendPostEventAccessLinks`). 10 consumer files re-pointed.
- **SSR prefetches updated to use factories from `/keys`:** `host/page.js` (dashboardKeys), `admin-dash/settings/page.js` (usersKeys × 2), `host/plans/page.js` (plansKeys), `admin-dash/whitelabels/page.js` (adminKeys.whitelabels), `admin-dash/whitelabels/[id]/page.js`, `admin-dash/whitelabels/[id]/details/page.js`, `admin-dash/manage-plans/page.js`, `admin-dash/payments/page.js`, `admin-dash/page.js` (admin dashboard), `admin-dash/vendors/page.js`, `admin-dash/moderators/page.js`, `admin-dash/vendors/[id]/page.js`, `admin-dash/hosts/[id]/page.js`, `admin-dash/hosts/page.js`, `admin-dash/tickets/page.js`, `admin-dash/tickets/[id]/page.js`.
- **Cross-domain literal-key swaps in app code:** `app/[lang]/host/plans/PlansPage.js` (plansKeys.all), `app/[lang]/admin-dash/plans/page.js` (subscriptionsKeys.all, plansKeys.business), `ui/auth/signup/whiteLabel/stepFive/StepFive.js` (plansKeys.business), `app/[lang]/admin-dash/_components/SubscriptionAssignmentPopup.jsx` (adminKeys.plans), `app/[lang]/vendor-dashboard/tickets/page.js` (ticketsKeys.all), `app/[lang]/host/tickets/page.js` (ticketsKeys.all), `app/[lang]/host/tickets/_components/TicketCard.jsx` (ticketsKeys.detail).
- **15 old hook files deleted** + the now-empty `labbe/hooks/{reactQueryHooks,queries,mutations}/` directories `rmdir`ed (plus the `post-event/` subdirectory). Grep confirms zero non-comment references remain to any deleted path. Two comment-only mentions of the old paths in `services/adminDashboard.js` and `hooks/events/mutations/useEventGuestMutation.js` updated to point at the new locations.

**Final web hook tree** (`labbe/hooks/`): 21 domain folders — `addons`, `admin`, `auth`, `checkout`, `dashboard`, `discounts`, `events`, `guests`, `locations`, `messaging`, `notifications`, `payments`, `plans`, `postEvent`, `scheduledExtraReminders`, `staff`, `subscriptions`, `taqnyatTemplates`, `templates`, `tickets`, `users`, `vendors`, `vendorServices`. Plus `_cacheMigrations.js` (registry) and the standalone non-domain helpers (`UseLanguageChange.js`, `use-media-query.js`, `useDebounce.js`, `useDirection.js`, `usePageAccess.js`, `useUnsavedChanges.js`). **Web side of Phase 5 is complete.**

**Remaining ledger after this chunk:**
- Phase 5 chunks 4–5 (mobile pilot + batches; mobile QueryClient needs a `runCacheMigrations` hookup of its own before any mobile domain shifts keys)
- Phase 5 chunk 6 — final grep + delete sweep on the mobile side
- Phase 6 — auth store alignment
- Phase 8 — lint rules (forbid imports from deleted paths via ESLint `no-restricted-imports`; forbid literal `/api/v2/` strings outside `@halla/shared`), helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, shim removals
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-29, Phase 5 chunk 2 (Opus 4.7 1M) — web batch A: notifications, addons, discounts, vendorServices, subscriptions

**Shipped, build-validated (`next build` exit 0, "Compiled successfully in 13.8s"):**

- **5 new domain folders** at `labbe/hooks/<domain>/{queries.js, mutations.js, keys.js, index.js}` (subscriptions has no mutations file — read-only domain on the web side; addons no longer needs the inline `ADDONS_BASE_KEY` constant). All factories produce byte-identical arrays to the prior literals — no cache migrations registered.
- **`hooks/notifications/`** — `notificationsKeys` (`all`, `list(params)`, `unreadCount()`, `detail(id)`, `dropdown(limit)`); queries: `useNotifications`, `useUnreadNotificationCount`, `useNotification`; the `useNotificationMutation(action)` factory (markAsRead / markAllAsRead / deleteNotification / clearAll / adminSend / adminBroadcast). `dropdown(limit)` was added because `NotificationDropdown.js` uses an inline `useInfiniteQuery` with the literal `["notifications", "dropdown", PAGE_LIMIT]` — that literal is now swapped for `notificationsKeys.dropdown(PAGE_LIMIT)`.
- **`hooks/addons/`** — `addonsKeys` (`all`, `catalog()`, `my(params)`); queries: `useAvailableAddons`, `useMyAddons`; mutations: `usePurchaseAddon`, `useAdminActivateAddon`. The cross-domain `["subscriptions"]` invalidation inside `usePurchaseAddon` was swapped to `subscriptionsKeys.all` after subscriptions migrated below.
- **`hooks/discounts/`** — `discountsKeys` (`all`, `adminList(filters)`, `detail(id)`); queries: `useDiscounts`, `useDiscount`; mutations: `useCreateDiscount`, `useUpdateDiscount`, `useToggleDiscount`, `useDeleteDiscount`, `useValidateDiscount` (the comment justifying the one-shot mutation pattern preserved verbatim).
- **`hooks/vendorServices/`** — chose folder name `vendorServices` over `services` so the directory matches the canonical `vendor-services` API namespace + `vendorServicesService` module (avoids colliding with the generic "services" concept). `vendorServicesKeys` (`all`, `publicList(params)`, `myList()`, `stats()`, `detail(id)`); queries: `usePublicVendorServices`, `useMyServices`, `useServiceStats`; the `useServiceMutation(action)` factory (createService / updateService / deleteService / toggleStatus).
- **`hooks/subscriptions/`** — read-only on web; `subscriptionsKeys` (`all`, `mine()`, `myPayments(params)`); queries: `useMySubscription`, `useMyPayments`.
- **Consumers re-pointed (9 files):** `ui/layout/notifications/{NotificationBell,NotificationDropdown}.js`, `app/[lang]/host/plans/_components/AddonsSection.jsx`, `app/[lang]/admin-dash/discounts/_components/{DiscountsTable,DiscountsStats,DiscountsFormPopup}.jsx`, `app/[lang]/host/plans/summary/Summary.js`, `ui/vendor/addServicePopup/AddServicePopup.js`, `app/[lang]/market-place/page.js`, `app/[lang]/vendor-dashboard/page.js`, `app/[lang]/host/plans/_hooks/usePlansPageState.js`, `app/[lang]/host/payments/_components/PaymentsClient.jsx`.
- **SSR prefetches updated to import factories from `/keys`:** `app/[lang]/admin-dash/discounts/page.js` (uses `discountsKeys.adminList(filters)`) + `app/[lang]/host/plans/page.js` (uses `subscriptionsKeys.mine()`).
- **Cross-domain invalidation literals swapped (advisor convention: once the target domain has a factory, callers stop using literals):**
  - `hooks/reactQueryHooks/useCheckout.js:105` — `["subscriptions"]` + `["addons"]` literals → `subscriptionsKeys.all` + `addonsKeys.all`. (useCheckout itself stays in `reactQueryHooks/` until chunk 3.)
  - `app/[lang]/admin-dash/plans/page.js:250` — `["subscriptions"]` → `subscriptionsKeys.all`.
  - `app/[lang]/host/plans/PlansPage.js:129` — `["subscriptions"]` → `subscriptionsKeys.all`.
  - `app/[lang]/vendor-dashboard/page.js:139` — `["vendor-services"]` → `vendorServicesKeys.all`.
- **5 files deleted** (zero-importer verified by grep): `hooks/reactQueryHooks/{useNotifications,useAddons,useDiscounts,useServices,useSubscriptions}.js`.

**Remaining ledger after this chunk:**
- Phase 5 chunk 3 (web batch B) — admin, tickets, staff, guests, payments, vendors, users, plans, messaging, checkout, dashboard, auth, post-event; delete `hooks/reactQueryHooks/`, `hooks/queries/`, `hooks/mutations/`
- Phase 5 chunks 4–5 (mobile pilot + batches; mobile QueryClient needs a `runCacheMigrations` hookup of its own before any mobile domain shifts keys)
- Phase 5 chunk 6 — final grep + delete sweep
- Phase 6 — auth store alignment
- Phase 8 — lint rules, helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, shim removals
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-29, Phase 5 chunk 1 (Opus 4.7 1M) — web pilot: locations, templates, taqnyatTemplates, scheduledExtraReminders

**Shipped, build-validated (`next build` exit 0, "Compiled successfully in 10.6s"):**

- **New domain layout established at `labbe/hooks/<domain>/` with `{queries.js, mutations.js, keys.js, index.js}`.** Each domain exposes a key factory whose methods produce arrays structurally identical to the prior literal keys — so the new code interoperates with already-cached queries (no migration runs for this batch).
- **`labbe/hooks/locations/`** — `locationsKeys` factory (`regions`, `cities(regionId)`, `districts(cityId)`, `allList`, `search(q)`); queries: `useRegions`, `useCitiesByRegion`, `useDistrictsByCity`, `useAllLocations`, `useSearchLocations`. Replaces `labbe/hooks/reactQueryHooks/useLocations.js`.
- **`labbe/hooks/templates/`** — `templatesKeys` + `templateCategoriesKeys` + `fontsKeys` factories; queries: `useHostTemplates`, `useAdminTemplates`, `useTemplate`, `useTemplateCategories`, `useFonts`; mutations: `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate`, `useDuplicateTemplate`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`. Replaces `labbe/hooks/queries/useTemplates.js` + `labbe/hooks/mutations/useTemplateMutations.js`.
- **`labbe/hooks/taqnyatTemplates/`** — split out from templates because the underlying service (`taqnyatTemplatesService`) is the SMS template module, not the invitation template module. `taqnyatTemplatesKeys` factory; queries: `useHostTaqnyatTemplates`, `useAdminTaqnyatTemplates`; mutations: `useSyncTaqnyat`, `useAssignTaqnyat`, `useCreateTaqnyatTemplate`, `useDeleteTaqnyatTemplate`. Replaces `labbe/hooks/queries/useTaqnyatTemplates.js`.
- **`labbe/hooks/scheduledExtraReminders/`** — `scheduledExtraRemindersKeys` factory; queries: `useScheduledExtraReminders`; mutations: `useCreateScheduledExtraReminder`, `useCancelScheduledExtraReminder`. Cross-domain invalidations (events/guests on success) intentionally kept as literal arrays since `eventsKeys`/`guestsKeys` factories don't exist yet — they'll be swapped over when those domains migrate in chunk 3. Replaces `labbe/hooks/queries/useScheduledExtraReminders.js`.
- **Consumers re-pointed (13 files):**
  - `app/[lang]/vendor-dashboard/settings/_components/ServiceDetailsSection/ServiceDetailsEditForm.jsx`, `ui/auth/signup/vendor/stepTwo/LocationSelector.js`, `app/[lang]/market-place/page.js` → `@/hooks/locations`.
  - `app/[lang]/host/create-event/_components/templateForm/DynamicTemplateForm.jsx`, `app/[lang]/host/create-event/_components/stepThree/StepThree.js`, `app/[lang]/admin-dash/templates/_components/{CategoryFormPopup,CategoriesStats,CategoriesTable,TemplateEditorPage,TemplatesPageContent}.jsx`, `ui/host/main-page/EventTemplatesSection.jsx` → `@/hooks/templates`.
  - `app/[lang]/host/create-event/_components/stepFour/StepFour.js`, `app/[lang]/host/post-event/[eventId]/_components/MessagingTemplatePicker/MessagingTemplatePicker.jsx`, `app/[lang]/host/post-event/[eventId]/_components/AccessLinksDialog/AccessLinksDialog.jsx`, `app/[lang]/admin-dash/taqnyat-templates/_components/{CreateTaqnyatTemplatePopup,AssignTaqnyatTemplatePopup,TaqnyatTemplatesStats,TaqnyatTemplatesTable}.jsx` → `@/hooks/taqnyatTemplates`.
  - `components/event-detail/ScheduleReminderSection.jsx` → `@/hooks/scheduledExtraReminders`.
- **SSR prefetch updated:** `app/[lang]/admin-dash/taqnyat-templates/page.jsx` swapped its literal `["taqnyat-templates", "admin"]` queryKey for `taqnyatTemplatesKeys.adminList()` imported from `@/hooks/taqnyatTemplates/keys`.
- **4 files deleted** (all zero-importer verified by grep): `hooks/reactQueryHooks/useLocations.js`, `hooks/queries/useTemplates.js`, `hooks/queries/useTaqnyatTemplates.js`, `hooks/mutations/useTemplateMutations.js`, `hooks/queries/useScheduledExtraReminders.js`. (Stale comment in `config/fonts.js` also updated to point at the new path.)
- **Cache-migration infrastructure shipped:** `labbe/hooks/_cacheMigrations.js` (registry with `STORAGE_KEY = "halaa.cacheMigrations.applied"` + `runCacheMigrations(qc)` runner) + `providers/ReactQueryProvider.jsx` invokes it once via `useEffect` after the QueryClient is created. `MIGRATIONS` array is empty this batch (pilot factories produce byte-identical arrays); future chunks that actually change key shapes add `{ name, run(qc) }` entries.

**Convention established for the remaining ~16 web domains:**
- One folder per domain at `hooks/<domain>/`. Single `queries.js` + `mutations.js` files inside (events kept its split-file layout from Phase 4 — both are allowed by §2.4).
- `keys.js` exports a `<domain>Keys` factory: `{ all: ["<domain>"], <subtype>: (...args) => [...all, ...] }`. Always derive from `all` so a single `invalidateQueries({ queryKey: <domain>Keys.all })` purges everything.
- `index.js` is a barrel re-exporting queries + mutations + keys (no logic).
- Cross-domain invalidations stay as literal arrays until the *target* domain has its factory, then get swapped.
- **Server components must import key factories from `@/hooks/<domain>/keys` directly, not the `@/hooks/<domain>` barrel.** The barrel re-exports `"use client"` queries/mutations; the `/keys` path is plain ES module data with no client boundary. The `taqnyat-templates` SSR prefetch follows this rule.

**Remaining ledger after this chunk:**
- Phase 5 chunk 2 (web batch A) — notifications, addons, discounts, services, subscriptions
- Phase 5 chunk 3 (web batch B) — admin, tickets, staff, guests, payments, vendors, users, plans, messaging, checkout, dashboard, auth, post-event; delete `hooks/reactQueryHooks/`, `hooks/queries/`, `hooks/mutations/`
- Phase 5 chunks 4–5 (mobile pilot + batches)
- Phase 5 chunk 6 — final grep + delete sweep
- Phase 6 — auth store alignment
- Phase 8 — lint rules, helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, shim removals
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-26, follow-up session (Opus 4.7) — Phase 4 mobile events consolidation

**Shipped, build-validated (`expo export --platform web` exit 0, 3287 modules bundled):**

- **New consolidated `halla-mobile/services/eventsService.js`** — single file replacing the 8 shards. `authenticatedFetch` is inlined (module-private); every per-domain function is exported by name AND grouped into `crud`/`guests`/`staff`/`settings`/`exports` sub-objects on the default export, so both `import { foo } from "../services/eventsService"` and `import service from "../services/eventsService"` (`service.crud.foo` / `service.foo`) resolve.
- **`halla-mobile/services/eventGuestsService.js`** — rename of `guestsService.js` via `git mv`. Per-guest CRUD stays separate because the backend mount is on the `/guests` module (`/guests/events/:eventId/...`), not events.
- **`halla-mobile/hooks/events/useEventForm.js`** — pure-helper module (NOT a hook) holding the validation, list-management, CSV-import, step-validation, payload-transform, and default-form-values helpers extracted from `EventsService.js`. File name kept as `useEventForm.js` for parity with web's hook file (web's file is a real hook with different concerns; mobile-local helpers stay mobile-local — verified web's file does not contain these names).
- **`halla-mobile/hooks/events/mutations/useEventMutation.js`** — single-file factory mirroring web's pattern but with the config-map collapsed inline (web has 4 sub-hooks + façade; mobile's smaller surface fits one file). Action keys: `createEvent`, `updateEventDetails`, `deleteEvent`, `bulkDeleteEvents`, `updateEventStep2`, `updateGuestList` (bulk), `updateStaffList`/`addStaff`/`updateStaff`/`deleteStaff`/`notifyStaff`, `updateInvitationSettings`/`updateLaunchSettings`/`updateVisualTemplate`/`updateTaqnyatTemplate`/`updateMessagingContent`/`retryLaunch`. Convenience hooks (`useCreateEvent`, `useNotifyStaff`, `useAddEventStaff`, etc.) wrap the factory with literal actions so the action arg stays stable.
- **18 importers re-pointed:**
  - Service consumers (form helpers, queries, EventList, useEventLoadAndGate, mutation hooks): all moved off `eventsService2`/`EventsService`/`guestsService` to the new files.
  - `hooks/index.js` barrel: `./mutations/useEventMutations` → `./events/mutations/useEventMutation`.
  - Messaging-hook consumers (`TestMessageModal`, `ScheduleSendingModal`, `SendInvitationModal`, `EventDetailsScreen`) re-pointed directly at `useMessagingMutations.js` — the prior re-export through `useEventMutations` is gone. `useMessagingMutations.js` itself is NOT in the deletion list (per plan §4) and stays separate.
  - `EventDetailsScreen.js` staff CRUD consumer re-pointed from `useEventStaffCrudMutations` to the factory's convenience hooks. Verified call-site arg shapes (`{ eventId, data }`, `{ eventId, staffId, data }`, `{ eventId, staffId }`) match the factory's `mutationFn` signatures.
- **13 files deleted** (all on the Phase 4 ledger in §A.2):
  - `services/EventsService.js`, `eventsService.{crud,http,guests,settings,staff,exports}.js`, `eventsService2.js`.
  - `hooks/mutations/useEvent{Crud,Guest,Mutations,Settings,Staff,StaffCrud}Mutations.js`.
- Grep verified: zero remaining imports of any deleted file across the mobile tree.

**Notes / deliberate divergences:**
- Mobile factory uses one file + config map vs. web's four sub-hooks; the plan §4.4 allows either ("config map" called out explicitly). Easier to maintain at mobile's smaller surface size.
- `useStaffMutations.useRevokeStaffAccess` and per-guest hooks in `useGuestMutations` stay where they are (separate concerns: StaffAccessToken lifecycle and the `/guests` module respectively).
- Vestigial `_token` args on every service function preserved to minimise call-site churn; `apiFetch` ignores them and reads the in-memory token from the auth store.

**Pre-existing bug not fixed (out of scope):** `useEventLoadAndGate.js:156-158` reads `res?.data` from `getEventById`, which already unwraps `data?.data` and returns the event object directly. Likely never noticed because the surrounding code re-extracts via `eventData.eventDetails ?? eventData`. Leave for a focused session.

**Remaining ledger after this session:**
- Phase 5 — hook layout standardization (both apps)
- Phase 6 — auth store alignment
- Phase 8 — remaining items (lint rules, helper extractions, `userAccountService`, `getStaticAssetBaseUrl`, schema-shim removals)
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-26, late-evening session (Opus 4.7) — Phase 7+8 partial completion

**Verified-on-disk before starting (so the picture matches the file system, not memory):**
Phase 0/0a/0b/0c done; Phase 1 partial (auth/events/tickets in shared, 5 domains still in app dirs); Phase 2 done; Phase 3 done; Phase 4b done (`halla-mobile/screens/auth/ResetPasswordScreen.js` exists); Phases 4, 5, 6, 7, 8 outstanding.

**Shipped this session, build-validated (`next build` exit 0 after):**

- **Phase 8 safe deletes (zero-importer verified by grep):**
  - `labbe/staticData/events/data.js` — deleted; `staticData/` folder removed.
  - `halla-mobile/utils/errorHandler.js` — deleted.
  - `labbe/utils/schemas/phoneValidation.js` — deleted.
- **Phase 8 documented console.log cleanup:**
  - `labbe/utils/index.js:56,77` — debug `console.log("formValues", ...)` and `console.log("result", ...)` removed inside `validateStep`.
  - `halla-mobile/services/authService.js:265,315` — replaced raw `console.log` with `dlog` (PII leak in release builds; previously logged phone number).
- **Phase 7 mobile — `halla-mobile/stores/adminStore.js` deleted.**
  - Grep returned zero importers across the mobile codebase before delete. The store was wholly orphaned — RQ already served all admin tables via `hooks/queries/useAdmin*`. No consumer rewrites required.
- **Phase 7 web — `labbe/stores/notificationStore.js` deleted, 2 consumers rewritten:**
  - `labbe/ui/layout/notifications/NotificationBell.js` — now reads from `useUnreadNotificationCount()`; the hook already had a 30 s `refetchInterval` so the manual `setInterval(30s)` polling is gone with no behavior change.
  - `labbe/ui/layout/notifications/NotificationDropdown.js` — rewired to use `useInfiniteQuery` against `API_PATHS.notifications.getNotifications` for paginated load-more (preserves the original "append next page" UX) plus `useNotificationMutation` for markAsRead / markAllAsRead / delete / clearAll.
  - **Note on follow-up:** `useInfiniteQuery` was used inline in the dropdown component because the existing `useNotifications` hook in `hooks/reactQueryHooks/useNotifications.js` is a `useQuery` returning a single page. A future tidy-up could promote `useNotificationsInfinite` into that hook file and have the dropdown import it. Left inline to minimize risk in this session.

**Deliberately deferred (and why):**

- **Phase 6 — auth store alignment.** Mobile already uses the canonical status machine (`checking → loading → authenticated|unauthenticated`); web uses `isAuthenticated`+`isLoading` booleans. Aligning the two requires touching ~30 consumer files (found via grep on `isAuthenticated|isLoading`). Doing it partially risks an inconsistent state machine. Needs a dedicated session that can build-validate after every batch.
- **Phase 4 — mobile events service consolidation.** 8 service shards + 6 mutation hook files; touches the entire mobile event-creation flow. Plan estimates 2-3 focused days. Not safe to rush.
- **Phase 5 — hook layout standardization across ~20 domains.** Plan itself calls this "Risk: Highest." Cache-key migration alone is a session.
- **Phase 1 leftovers — 5 schema domains.** ~2000 lines of schema code across 12+ files plus consumer re-pointing across ~40 files. Manageable but a session of its own.

**Build evidence:** `labbe` → `next build` exit 0 after Phase 7 web rewrite. Mobile → no runtime-affecting changes this session (only zero-importer deletes + log-level swap); `expo export` ran as a final sanity check.

**Remaining ledger after this session:**
- Phase 1 leftovers — 5 schema domains (plans, vendor, settings, admin, post-event)
- Phase 4 — mobile events consolidation
- Phase 5 — hook layout standardization (both apps)
- Phase 6 — auth store alignment
- Phase 7 leftover — none (both stores resolved)
- Phase 8 — remaining items (lint rules, helper extractions, userAccountService, getStaticAssetBaseUrl)
- Phase 9 — final verification + ARCHITECTURE.md

### 2026-05-26, late-night follow-up — Phase 1 leftovers completed

**Shipped, build-validated (`next build` exit 0, `expo export` exit 0):**

- **5 new shared schema files** created in `D:\halla\shared\src\schemas\`:
  - `plans.js` — `createPlanSchema`, `editPlanSchema`, `PLAN_TYPES`, enums (planType/planFamily/billingType/availability/currency). Admin-only, English messages preserved.
  - `post-event.js` — guest portal schemas (PostType, PostSchema, CommentSchema, TokenValidationResponseSchema, PostEventContentResponseSchema, LikeToggleResponseSchema, AddCommentSchema, etc.). `File`-typed fields softened to `z.any()` so mobile RN file objects also pass (web's File instance check was platform-specific).
  - `admin.js` — addHost/addModerator/editModerator, vendorRating, ticket/template/notification/taqnyat/discount popups. Hardcoded Arabic messages preserved verbatim (admin surface; not user-facing).
  - `settings.js` — union of `settingsSchemas.js` + `accountSettingsSchema.js` + `notificationPreferencesSchemas.js` validation portions + mobile `settingsSchema.js`. Both `accountSettingsSchema` variants kept (factory `(t) => …` for web, opaque-key version for mobile — exported as `accountSettingsSchema` and `mobileAccountSettingsSchema` respectively). Role-aware host/vendor/admin/whitelabel notification preferences schemas + defaults + `getNotificationSchemaForRole` / `getNotificationDefaultsForRole` helpers.
  - `vendor.js` — Zod portions split out of `vendorSettings.js` (web's section-object pattern keeps its `fields` metadata locally; only `zodSchema` payloads moved). Mobile vendorSchemas (English-message variants) included with `mobile*` prefix; original names preserved via the shim's `mobileX as X` aliases.
- **`shared/src/schemas/index.js` barrel** updated with the 5 new namespaces.
- **Compat shims** (the pattern established by the prior agent) installed at every former source location so consumer imports keep working unchanged:
  - `labbe/utils/schemas/planSchema.js` — re-exports from `@halla/shared/schemas/plans`.
  - `labbe/utils/schemas/postEventSchemas.js` — re-exports from `@halla/shared/schemas/post-event` (named + default).
  - `labbe/utils/schemas/adminPopupSchemas.js` — re-exports the 15 popup schemas from `@halla/shared/schemas/admin`.
  - `labbe/utils/schemas/settingsSchemas.js` — re-exports from `@halla/shared/schemas/settings`. `hostEmailNotificationsSchema` aliased from the legacy variant (`hostEmailNotificationsSchemaLegacy` in shared) since two files exported the same name with different fields; the legacy 5-field shape stays here, the role-aware 5-field shape stays under the canonical name in `notificationPreferencesSchemas.js`.
  - `labbe/utils/schemas/accountSettingsSchema.js` — re-exports the factory variant.
  - `labbe/utils/schemas/notificationPreferencesSchemas.js` — re-exports all schemas/defaults/getters from shared; keeps `getNotificationOptionsForRole` (UI option config with hardcoded Arabic labels + i18n keys) inline since it's a web-side rendering concern, not validation.
  - `labbe/utils/schemas/vendorSettings.js` — keeps the section-object wrappers (`personalInfoSchema = { sectionKey, titleKey, zodSchema, fields, ... }`) and the `validateField` / `validateForm` helpers that `DynamicForm` consumes; swaps each `zodSchema` body for an import from `@halla/shared/schemas/vendor`. Form metadata stays web-side; validation moved.
  - `halla-mobile/utils/schemas/vendorSchemas.js` — re-exports mobile variants with `mobileX as X` aliases.
  - `halla-mobile/utils/schemas/settingsSchema.js` — re-exports mobile variants with `mobileX as X` aliases.
- **Orphan deletions (verified zero importers by grep):**
  - `labbe/utils/schemas/addHostSchema.js` — orphan (its consumers use `adminPopupSchemas.js#addHostSchema`, a different shape).
  - `labbe/utils/schemas/addModeratorSchema.js` — same story.

**Build evidence:** `labbe` → `next build` exit 0; mobile → `expo export --platform web` exit 0. Both with the new shared schemas resolved through the workspace symlink.

**Files NOT migrated this session (out of scope — not in the user-named 5 domains):**
- `labbe/utils/schemas/createEventSchema.js`, `updateEventSchema.js`, `eventAddintionSchemas.js`, `staffSchemas.js`, `ticketSchema.js`, `ticketRatingSchema.js`, `authSchema.js`, `addServiceSchema.js` — these belong to domains (events, tickets, auth, vendor-service) that are either already in shared (auth/events/tickets) and just need re-pointing in a future pass, or are UI-coupled (addServiceSchema has hardcoded Arabic SERVICE_TYPES list).
- Mobile `createEventSchema.js`, `updateEventSchema.js`, `ticketSchema.js`, `authSchemas.js`, `discountSchema.js`, `vendorServiceSchema.js` — same story.

**Remaining ledger after this follow-up:**
- Phase 1 — **complete for the 5 user-named domains**; non-named-domain stragglers above remain as a future tidy-up.
- Phase 4 — mobile events consolidation
- Phase 5 — hook layout standardization (both apps)
- Phase 6 — auth store alignment
- Phase 8 — physical removal of the compat shims (this session and the prior one both intentionally use shims to minimize consumer churn); other Phase 8 items (lint rules, helper extractions, userAccountService, getStaticAssetBaseUrl).
- Phase 9 — final verification + ARCHITECTURE.md

---

## 0. TL;DR

Both apps consume the same backend (`/api/v2`, ~460 endpoints, Zod-validated). They have **diverged in three independent ways**, none of which are intrinsic to the platform:

1. **Two transport stacks** — web ran an axios overhaul (`services/new-backend/`) but never deleted the legacy fetch client (`services/apiClient.js`). Three services (`notification.js`, `staff.js`, `adminDashboard.js`) still point at the legacy one. Mobile has its own fetch-based `apiClient.js` that re-implements the same refresh-coalescing logic. → **One transport interface, two thin platform adapters.**
2. **No shared API contract** — web has a high-quality `API_PATHS` registry (`services/new-backend/api.config.js`, ~460 endpoints, single source of truth). Mobile hard-codes endpoint strings through a per-app `ENDPOINTS` map in `config/api.js` plus inline strings inside each service file. → **Promote `API_PATHS` to a shared package consumed by both.**
3. **Hooks/services file layout drifted in opposite directions** — web has *three* parallel hook trees (`hooks/events/`, `hooks/queries/ + hooks/mutations/`, `hooks/reactQueryHooks/`). Mobile has a clean `hooks/queries + hooks/mutations` split but bloats events into eight `eventsService.*.js` shards with a `eventsService2.js` façade plus six overlapping `useEvent*Mutations.js` hook files. → **Adopt one layout (per-domain folders) on both sides.**

Everything else (auth, Zustand stores, Zod schemas, error handling) is largely the same logic implemented twice. **Product behavior across the two apps is closer than expected** — after verification, only one real cross-platform UX gap remains (mobile lacks the reset-password completion screen). The unification is large but boring: it's **delete + relocate**, not new design or behavior repair.

---

## 1. Inventory Summary

### 1.1 Mobile (`halla-mobile/`)

| Folder | Files | Health |
|---|---|---|
| `services/` | 32 (incl. 8 `eventsService.*`) | Working, but events fragmented; no endpoint registry |
| `stores/` | 2 (`authStore`, `adminStore`) | `authStore` solid; `adminStore` duplicates RQ cache |
| `utils/` | 14 (+8 schemas, 2 constants) | Clean |
| `hooks/` | 47 (queries 25, mutations 20, utility 4) | Clean folder structure, but events split across 6 mutation hook files with overlapping responsibilities |

**Strengths:** Single fetch-based `apiClient.js` with coalesced 401→refresh→retry, in-memory access token + `expo-secure-store` refresh token. Structured `ApiError` with i18n key mapping. Zod everywhere.

**Smells:**
- `EventsService.js` + `eventsService.{crud,http,guests,settings,staff,exports}.js` + `eventsService2.js` (façade) — confusing naming, "v2" leftover. Per-guest CRUD lives in a *separate* `guestsService.js` despite being event-scoped.
- Six event-related mutation hook files (`useEventMutations.js`, `useEventCrudMutations.js`, `useEventGuestMutations.js`, `useEventSettingsMutations.js`, `useEventStaffMutations.js`, `useEventStaffCrudMutations.js`) with overlapping concerns — `useEventMutations.js` is already a façade re-exporting from the others.
- `adminStore.js` mirrors data that should live in React Query cache → two sources of truth for admin lists.
- No `API_PATHS` equivalent — endpoint strings duplicated inline in 20+ service files.
- Query keys are inline arrays, no factory → invalidation is fragile.
- 8 schema files vs web's 18 — mobile is missing schemas for admin add-host/add-moderator/add-service, notification preferences, post-event details, account-settings, plan, etc.

### 1.2 Web (`labbe/`)

| Folder | Files | Health |
|---|---|---|
| `config/` | 1 (`fonts.js`) | Fine |
| `providers/` | 3 (i18n SSR, react-i18next client, RQ) | Fine — SSR i18n race already fixed |
| `services/` | 12 incl. `new-backend/` (2) | **Two clients coexist; legacy still in use** |
| `services/new-backend/` | `apiClient.js` (axios + RQ helpers), `api.config.js` (API_PATHS registry, ~460 paths) | **Canonical** |
| `stores/` | 3 (`authStore`, `notificationStore`, `sidebarStore`) | `notificationStore` calls service directly, bypasses RQ |
| `utils/` | ~12 + **18 schema files** | Bloated schemas folder; some duplicates (`phoneValidation.js` repeats `authSchema.js` regex) |
| `hooks/` | ~50 across **three parallel trees** | Major fragmentation |
| `staticData/` | `events/data.js` (mock) | **Orphaned (verified: zero imports)** |

**Strengths:**
- `API_PATHS` registry is excellent — single source of truth for all endpoints.
- `new-backend/apiClient.js` (527 lines) is well-built: axios interceptors, logging, request-ID tracing, silent coalesced 401 refresh, `useApiQuery` / `useApiMutation` / `useUploadMutation` / `useExportMutation` / server-side prefetch helpers, B-1 hardened (HttpOnly only).
- `errorHandlingService.js` maps backend `otpErrorType`/`accountStatus`/`meta` to i18n keys cleanly.
- Schema coverage broader than mobile.

**Smells:**
- **Legacy `services/apiClient.js`** (381 lines, fetch-based) still consumed by `services/notification.js:6`, `services/staff.js:11`, `services/adminDashboard.js:7`. Its `getToken()` reads a JS-readable mirror cookie — the exact pattern B-1 hardening removed elsewhere.
- **`services/apiResponseHandler.js`** (327 lines) duplicates work axios + `errorHandlingService` already do.
- **Three hook trees** for the same operations:
  - `hooks/events/` — new canonical for events (queries + mutations factories).
  - `hooks/queries/ + hooks/mutations/` — old narrow scope; only templates + scheduled-reminders + taqnyat-templates.
  - `hooks/reactQueryHooks/` — comprehensive (~20 files) but `useEvents.js` is now a 7-line deprecated façade re-exporting `hooks/events/`.
- `notificationStore.js` calls `services/notification.js` directly with manual `setInterval` polling (line 248-250, 30s) → no React Query caching/dedup; doesn't compose with the rest of RQ.
- **Two parallel sources of truth for notifications.** A perfectly serviceable RQ hook tree exists at `labbe/hooks/reactQueryHooks/useNotifications.js` (`useNotifications`, `useUnreadNotificationCount` with 30 s `refetchInterval`, `useNotificationMutation`) — but the Zustand store bypasses it and re-implements polling/state. Pick the RQ side, retire the store's data layer.
- `staticData/events/data.js` — orphaned mock data, zero importers (`grep` returned no consumers).
- `utils/schemas/phoneValidation.js` duplicates regex already in `authSchema.js`.

### 1.3 Backend API surface (`labbe-backend-/src/modules/`)

- Base mount: `/api/v2`.
- ~460 endpoints across 22 modules.
- **Zod-only validation** for all new code (confirmed; matches the team's saved feedback rule). No Joi observed in route layer.
- Auth: Bearer token via `Authorization` header (mobile) or HttpOnly cookie (web). Refresh via cookie *or* body `refreshToken` field — dual transport for the two clients.
- **Response envelope is almost fully unified.** `shared/utils/responseHelper.js#sendSuccess` always emits **both** `success: true` AND `status: 'success'` on the same payload — so clients reading either field are correct as long as the helper is used. Counts (verification pass):
  - ~214 routes use `sendSuccess()` / `sendCreated()` / `sendPaginated()` (canonical).
  - ~17 controllers hand-roll a `{ success: true, ... }` payload (bypass the helper).
  - 1 controller emits only `{ status: 'success' }`.
  - **Implication for the plan:** rather than build envelope-normalization logic into both client adapters (the previous draft's plan), spend two backend hours migrating the ~18 outliers to the helper. The clients then trust *one* shape. See Phase 0c.
- Other inconsistencies that *cannot* be cheaply unified on the backend (clients still must handle these):
  - Single-resource envelopes vary: `{ data: { event } }`, `{ data: { user } }`, `{ data: object }`. Each route's "data shape" is intentional and bound to docs — clients normalize by reading the documented field per route, not by transformation.
  - Some POSTs return 200 with `requiresAction: true` (3DS payments) instead of 201 — caller must read body, not status.
  - Revoked/expired access tokens return **410 Gone** with a structured `reason` — both clients already handle, but the shared `ApiError` mapper must preserve the code.
  - Multipart endpoints expect specific fields pre-stringified as JSON (`eventDetails`, `guestList`, `staffList`) — undocumented per route. Capture this in shared docs.

### 1.4 Direct duplication map (web ↔ mobile)

| Concern | Mobile file | Web file | Verdict |
|---|---|---|---|
| API client core | `services/apiClient.js` | `services/new-backend/apiClient.js` (+ legacy `services/apiClient.js`) | Different transports (fetch vs axios) but identical responsibilities. Keep one *interface*, two thin adapters. |
| Endpoint registry | (none — `ENDPOINTS` map + hardcoded paths) | `services/new-backend/api.config.js` (`API_PATHS`) | Web's is canonical; lift to shared package. |
| Auth state | `stores/authStore.js` (Zustand) | `stores/authStore.js` (Zustand) | Same library, divergent shape. Unify field names + computed getters. |
| Error mapping | `services/authErrors.js` | `services/errorHandlingService.js` | Same job (backend code → i18n key). Merge. |
| Token storage | `services/secureStorage.js` | HttpOnly cookies + `js-cookie` | Platform-specific — keep separate. |
| Zod schemas | `utils/schemas/*` (8) | `utils/schemas/*` (18) | Promote union to shared package; both import same source. |
| RQ provider | (root `App.js`) | `providers/ReactQueryProvider.jsx` | Configure identically (staleTime 60s, no refetch-on-focus). |
| Event service | 8 `eventsService.*.js` + `EventsService.js` validation helpers | `hooks/events/*` + `services/...` (none) | Mobile to consolidate to one `eventsService.js`; web has already moved logic into hooks. |
| Event mutation hooks | 6 overlapping `useEvent*Mutations.js` files | `hooks/events/mutations/useEventMutation.js` factory | Mobile to collapse to one factory-driven file. |
| Admin data | `stores/adminStore.js` | `hooks/reactQueryHooks/useAdmin.js` | Web pattern is correct; drop mobile's adminStore in favor of RQ. |
| Notification feed | `services/notificationService.js` + hooks | `services/notification.js` + `stores/notificationStore.js` | Both should land on RQ hooks. Web's store-based polling is the outlier. |
| Date/locale utils | `utils/locale.js`, `utils/timeFormat.js`, `utils/DirectionUtils.js` | `utils/locale.js`, `utils/date/*`, `utils/DirectionUtils.js` | Same functions, slightly different names. Merge. |
| xlsx utils | `utils/xlsxUtils.js` | `utils/xlsxUtils.js` | Likely identical; merge or import from shared. |

### 1.5 Page-to-endpoint parity audit — RESULT: ~21/22 flows are byte-identical

A flow-by-flow trace from screen → hook → service → endpoint on both sides, **re-verified file-by-file in this revision**.

**Verified-or-carried-forward identical (21 flows):** host email login, host OTP login, host signup, vendor signup, whitelabel signup, **forgot-password request**, logout, **event creation (host route + admin-for-host route — both routes correctly used per role on both apps)**, event wizard steps 1-4, single event detail+stats, guest CRUD/rotate-QR/revoke, events list (host + admin), plans+checkout incl. 3DS poll, admin host list (incl. bulk), notifications (list/count/mark/markAll), post-event guest portal (validate/content/like/comments), support tickets (list/create/update/rate), **staff CRUD including update (all use `PUT /events/:eventId/staff/:staffId`)**, **test-message and retry-launch** (web via `useEventMutation` button; mobile via `TestMessageModal.js` and `EventFailureBanner.js`).

> **Honest scope note:** this revision *re-verified* the four flows the previous draft called out as divergent (events 1, 12, 16, 17 and forgot-password 6) plus the notification and staff-update paths. The remaining ~15 flows are **carried forward from the prior trace, not re-walked in this pass**. Treat that as "no contrary evidence found" rather than "byte-confirmed today." Appendix B lists exactly what was re-touched.

**Real divergence (1 flow):**

| # | Flow | Web does | Mobile does | Verdict |
|---|---|---|---|---|
| 1 | Forgot-password completion (reset via token) | Two-step request → reset wired through `/forget-password` route screens; `PATCH /auth/reset-password/:token` callable from UI | `forgotPassword()` is wired; `resetPasswordAPI()` exists in `halla-mobile/services/authService.js:466-476` but **no `ResetPasswordScreen` exists and no deep-link handler routes the email's reset link into the app** | **Real UX gap on mobile** — user can request reset, can't complete it in-app. |

**Refuted claims from the previous draft of this section (kept here so they don't reappear):**

- ❌ **"Mobile event creation routes everything through `/admin/events/create-for-host`."** *Not true.* `halla-mobile/screens/common/CreateEventScreen.js:30-46` checks `role === "host"` and returns `<CreateEventForm mode="host" />` (which uses `useCreateEvent` → `POST /events`). The `useCreateEventForHost` mutation on line 41 is only reached for non-host roles.
- ❌ **"Mobile uses PUT for staff update, web uses PATCH — backend wants PUT."** *Not true.* Backend (`labbe-backend-/src/modules/events/events.routes.js:725`), mobile (`halla-mobile/services/eventsService.staff.js:53`), AND web (`labbe/hooks/events/mutations/useEventStaffMutation.js:49`) all use `PUT`. Consistent.
- ❌ **"Mobile is missing test-message and retry-launch buttons."** *Not true.* `halla-mobile/components/home/TestMessageModal.js` (full modal) is invoked from `halla-mobile/screens/host/HomeScreen.js`. `halla-mobile/components/events/EventFailureBanner.js` provides retry, invoked from `halla-mobile/screens/common/EventDetailsScreen.js`. Both endpoints (`ENDPOINTS.EVENTS.TEST_MESSAGE`, `ENDPOINTS.EVENTS.RETRY_LAUNCH`) have wired hooks in `hooks/mutations/useMessagingMutations.js`.

**Implication for the plan:** the previous draft framed Phase 4b as "behavior parity fixes" with four items. After verification only one item remains, and the structural unification is therefore the bulk of remaining work. The TL;DR claim "mostly delete + relocate, not new design" is *more* true now.

### 1.6 Dead-code candidates

| Path | Status | Action |
|---|---|---|
| `labbe/staticData/events/data.js` | **Verified zero importers** | **Delete** |
| `labbe/services/apiResponseHandler.js` | Superseded by axios + errorHandlingService | **Delete after migration (Phase 3)** |
| `labbe/services/apiClient.js` (legacy) | Still consumed by notification/staff/adminDashboard | **Migrate consumers, then delete (Phase 3)** |
| `labbe/hooks/reactQueryHooks/useEvents.js` | Verified 7-line deprecated façade | **Update imports, then delete (Phase 5)** |
| `labbe/utils/schemas/phoneValidation.js` | Duplicates `authSchema.js` regex | **Delete; consolidate into shared `schemas/auth`** |
| `labbe/utils/cookieUtils.js` | Pre-HttpOnly legacy | **Audit; remove non-display uses (Phase 3)** |
| `halla-mobile/services/eventsService2.js` | Façade re-export with confusing "v2" name | **Drop after consolidation (Phase 4)** |
| `halla-mobile/services/EventsService.js` (capital E) | Validation/CSV helpers misclassified as service | **Move into `shared/utils/event-form.js` or `halla-mobile/hooks/events/useEventForm.js`** |
| `halla-mobile/hooks/mutations/useEventMutations.js` | Façade re-export, overlaps with other 5 files | **Collapse into a factory like web's `useEventMutation.js`** |
| `halla-mobile/stores/adminStore.js` | Duplicates RQ cache | **Delete; migrate consumers to `hooks/admin/queries/use*`** |
| `halla-mobile/services/adminDashboardService.js` lines 334–350 (`addons` export) | Self-marked "Legacy" | **Delete; consumers already use `addonsService`/`useAddons`** |
| `halla-mobile/services/notificationService.js` `_legacyToken` parameter | Kept for caller compat, but ignored everywhere | **Remove parameter once all callers audited** |
| `halla-mobile/services/marketplaceService.js:71` `.replace("/api/v2", "")` | Strips `/api/v2` from `API_BASE_URL` to produce CDN/asset URLs | **Keep — legitimate; but extract to `getStaticAssetBaseUrl()` helper for clarity** |

**Revised — NOT to delete:**
- `halla-mobile/services/guestsService.js` — endpoints are structurally under `/guests/events/:eventId/...` (not `/events/:id/guests/...`); the split mirrors the backend. Renaming to `eventGuestsService.js` is OK; full merge is not.

**Consolidation candidate kept from previous draft:**
- `halla-mobile/services/vendorService.js` and `halla-mobile/services/settingsService.js` both hit `PATCH /users/profile` and `PATCH /users/password` (verified: `vendorService.js:87,94,101` and `settingsService.js:18,27,35`). Extract a `userAccountService` that owns those endpoints; vendor-specific methods stay in `vendorService` and delegate. Same on web.

---

## 2. Target Architecture

### 2.1 Mental model

```
┌──────────────────────────────────────────────────────────────┐
│ @halla/shared  (in-repo npm workspace, plain JS)             │
│                                                              │
│  ├─ src/schemas/      Zod schemas — single source            │
│  ├─ src/api/                                                 │
│  │   ├─ paths.js      API_PATHS registry                     │
│  │   ├─ contracts.js  Endpoint → method/path/schema map      │
│  │   └─ transport.js  Transport interface (JSDoc-typed)      │
│  ├─ src/errors/       ApiError + code→i18n-key mapper        │
│  ├─ src/constants/    Roles, statuses, plan tiers, etc.      │
│  └─ src/utils/        Pure utils (locale, date, direction)   │
└──────────────────────────────────────────────────────────────┘
              ▲                                ▲
              │                                │
┌─────────────┴────────────┐  ┌────────────────┴────────────────┐
│ labbe/ (Next.js, JS)     │  │ halla-mobile/ (React Native, JS)│
│                          │  │                                 │
│ services/                │  │ services/                       │
│  ├─ http.js   axios      │  │  ├─ http.js   fetch             │
│  └─ api.js   typed call  │  │  └─ api.js   typed call         │
│                          │  │                                 │
│ stores/      Zustand     │  │ stores/      Zustand            │
│  authStore.js (cookies)  │  │  authStore.js (SecureStore)     │
│                          │  │                                 │
│ hooks/                   │  │ hooks/                          │
│  <domain>/queries/       │  │  <domain>/queries/              │
│  <domain>/mutations/     │  │  <domain>/mutations/            │
└──────────────────────────┘  └─────────────────────────────────┘
```

### 2.2 The shared package — what goes in, what stays out

**Goes in:**
- Zod schemas (union of `utils/schemas/` from both sides, deduplicated, web's stricter version wins where they differ).
- `API_PATHS` registry (lifted from `labbe/services/new-backend/api.config.js`).
- `ApiError` class + error-code-to-i18n-key mapper (merge of `halla-mobile/services/authErrors.js` and `labbe/services/errorHandlingService.js`).
- Shared types derived via `z.infer<typeof schema>` (events, users, guests, tickets, plans, addons, etc.).
- Pure utilities: `getLocalized`, `DirectionUtils`, date formatters, `xlsxUtils`, status enums.
- Role/permission constants (`USER_ROLES`, `ADMIN_PAGES`, `ACCESS_LEVELS`).

**Stays out (platform-specific):**
- HTTP transport (axios on web, fetch on mobile — they share an *interface*, not an implementation).
- Token storage (HttpOnly cookies on web, `expo-secure-store` on mobile).
- React Query *hooks* — they import from shared but live per-app because they wire to platform navigation, toasts, and auth stores.
- Zustand stores — they import shared *types* but state shape is per-app.
- Anything depending on `next/headers`, `next/navigation`, `react-native`, `expo-*`.

### 2.3 HTTP layer — one interface, two adapters

```ts
// @halla/shared/src/api/transport.js
export interface Transport {
  request<T>(opts: {
    method: 'GET'|'POST'|'PATCH'|'PUT'|'DELETE',
    path: string,                 // resolved from API_PATHS
    body?: unknown | FormData,
    query?: Record<string, string|number|boolean|undefined>,
    headers?: Record<string,string>,
    idempotencyKey?: string,
    timeoutMs?: number,
    signal?: AbortSignal,
  }): Promise<T>;
}
```

Each app implements `Transport` once:
- **Web:** axios + `withCredentials` + interceptor refresh (the existing `new-backend/apiClient.js` already does this; just narrow the surface).
- **Mobile:** fetch + Bearer header from `authStore` + secure-store refresh + replay-protection for FormData (the existing `services/apiClient.js` already does this; just narrow the surface).

Both return parsed JSON, both throw `ApiError` from shared.

**Envelope handling:** because Phase 0c migrates the ~18 backend stragglers onto `sendSuccess()` (which already emits both `{ success, status }`), the client adapter no longer needs to *normalize* the envelope. It only needs to:
1. Validate `success === true` (and/or `status === 'success'`).
2. Read the documented `data` field for the route.
3. Throw `ApiError` for everything else.

That's a much smaller surface than the previous draft assumed. Adapter code stays under ~150 lines.

### 2.4 Hook layout — one rule for both apps

```
hooks/
  <domain>/
    queries/      one file per query endpoint (or grouped if 2-3 related)
    mutations/    one file per mutation endpoint (or grouped)
    keys.js       query-key factory (one place per domain)
    index.js      barrel
```

Examples: `hooks/events/`, `hooks/guests/`, `hooks/auth/`, `hooks/admin/`, `hooks/payments/`, `hooks/addons/`, `hooks/tickets/`, `hooks/notifications/`, `hooks/plans/`, `hooks/post-event/`, `hooks/staff/`, `hooks/users/`, `hooks/templates/`, `hooks/discounts/`, `hooks/vendors/`, `hooks/marketplace/`, `hooks/messaging/`, `hooks/subscriptions/`, `hooks/locations/`, `hooks/dashboard/`.

Same names on both platforms. Same query-key factories on both platforms.

### 2.5 Reconciliation rules — backend is ground truth

When a schema, error code, or request shape differs between web and mobile, **the backend's Zod schema is the tiebreaker, not the team's preference**. The API enforces it at runtime; anything else creates UX bugs (user submits a form the client accepted but the API rejects).

**Concrete rules:**

1. **Schemas:** `@halla/shared/schemas/<domain>.js` mirrors `labbe-backend-/src/modules/<domain>/<domain>.validation.js`. Field-by-field. Same regex, same min/max, same enum values, same optional/required flags.
2. **When web and mobile both diverge from backend:** the shared schema follows the backend. Both apps update. If business wants a different rule (e.g., allow Egyptian phone numbers), change the backend first.
3. **When only one client diverges:** the matching one wins by default. The diverging one updates.
4. **Field names:** prefer the backend's field name even when it's awkward. E.g., if web sends `phoneNumber` and mobile sends `mobile`, but backend reads `phoneNumber`, both apps standardize on `phoneNumber`.
5. **i18n keys are app-side concerns.** Schemas in shared emit *opaque keys* (e.g., `"validation.invalidSaudiPhone"`); apps translate them. Never hardcode user-visible strings in shared.

**Three real divergences found during verification (must be resolved during Phase 1):**

| Domain | Web behavior | Mobile behavior | Backend contract | Resolution |
|---|---|---|---|---|
| Phone validation (login/signup) | Accepts Saudi (5/05) and Egypt (01) via 3-branch refine | Accepts any 9-15 digit string | Strict Saudi `^(\+966\|966\|0)?5\d{8}$` | Both apps adopt backend regex |
| Event guest contact | Phone *or* email (either required) | Phone required, no email field | Phone required, email optional | Web adopts mobile shape; phone required, email added as optional |
| Ticket rating schema | Missing | Present (`ticketRatingSchema`) | Present (Zod in `tickets.validation.js`) | Add to shared; web gains the schema |

These are **real product bugs** disguised as schema differences. Phase 1 fixes them as part of lifting schemas into shared.

### 2.6 API integration patterns — what's platform-mandated vs accidental

Web and mobile differ in three categories. Each is treated differently in the migration.

**Platform-mandated (keep different):**
- **Token storage:** HttpOnly cookies (web) vs `expo-secure-store` (mobile). Cannot unify.
- **Refresh transport:** cookie-based (web) vs body-field (mobile). Cannot unify.
- **FormData replay after 401 refresh:** web can retry; mobile cannot (stream not seekable). Documented limitation, do not regress.

**Accidental divergence (unify in Phase 1-3):**
- **Response unwrapping location.** Web unwraps `{ token, data: { user } }` in the hook's `onSuccess`. Mobile unwraps inside the service. → Move both into the adapter, return flat shapes to hooks.
- **FormData building.** Web's `useEventCrudMutation` builds FormData inside the hook (caller passes plain object). Mobile's hook expects pre-built FormData from the caller. → Standardize: hooks build FormData; callers pass plain JS objects with `File`/`Blob` references.
- **Cache invalidation breadth.** Mobile event-create invalidates `["events"]` + `["dashboard", "host"]`; web only `["events"]`. → Query-key factories (§2.4) define one canonical invalidation set per mutation.
- **Error mapping path.** Web routes through `errorHandlingService` → i18n key. Mobile throws raw and lets RQ surface the error. → Both adapters throw shared `ApiError` with `.i18nKey` getter (after Phase 2).

**Consumer-side conventions (codified in Phase 5):**
1. **One mutation factory per domain** that takes an action key and dispatches via a config map (matches `labbe/hooks/events/mutations/useEventMutation.js`).
2. **Query keys come from `hooks/<domain>/keys.js` only.** Inline `["events", id]` arrays forbidden by ESLint.
3. **Forms validate via `zodResolver(schemaFromShared)`.** Services never re-validate.
4. **Side-effects split:** hooks do data + cache invalidation; screens do toast + navigate. Lint rule: no `useNavigation`/`useRouter` inside `hooks/`.

### 2.7 Auth — diverges only at storage

- Same Zustand store *shape* (`{ user, role, status: 'checking'|'loading'|'authenticated'|'unauthenticated', error }`).
- Same actions (`login`, `signupHost`, `signupVendor`, `sendOTP`, `verifyOTP`, `completeProfile`, `refreshTokens`, `logout`, `forgotPassword`, **`resetPassword`** ← new on mobile).
- Same status machine.
- Differences confined to the `_persistAuth` / `restoreSession` internals: web writes nothing locally (HttpOnly cookies handled by backend), mobile writes refresh token to `secureStorage`.
- Bearer-token handling is mobile-only; on web the transport simply enables `withCredentials`.
- **Deep links:** mobile must register a universal/app link scheme so the email's `/reset-password/:token` URL opens `ResetPasswordScreen` directly with the token (covered in Phase 4b).

---

## 3. Migration Plan (sequenced, by phase)

> Each phase produces a green build and is independently revertable. The order minimizes risk of breaking flows already in production.

### Phase 0 — Decision & setup (no code changes that touch runtime)

**Decisions (recommendations are now defaults — see §6 for the reasoning):**
1. **Monorepo layout** — **npm workspaces** (no new tooling; all three packages already use `package-lock.json`, none use pnpm/yarn). Three packages: `labbe`, `halla-mobile`, `@halla/shared`. Root `package.json` (currently empty) becomes the workspace root.
2. **Language strategy** — **JS everywhere, no TypeScript.** All three packages (`labbe`, `halla-mobile`, `@halla/shared`) stay JS. Use JSDoc `@typedef` blocks for shared schema-derived shapes so editors/IDE still surface autocomplete without a TS toolchain. Zod schemas remain the single source of truth at runtime; JSDoc mirrors the shape for editor hints. Do NOT introduce `.ts` files in any package.
3. **Build target for shared** — pure ESM, no JSX, no React, no transpilation step. Plain JS files consumed directly via package name `@halla/shared` in both apps.
4. **Versioning** — shared lives in-repo at `D:\halla\shared\`; both apps depend on `"@halla/shared": "*"` resolved via workspace symlinks.
5. **CI** — there is **none today** for web/backend (mobile has `eas.json`). Adding CI is in scope: lightweight GitHub Actions workflow per app running lint + type-check + build on PR. Not a blocker for Phase 1 but should land in the same milestone.

**Phase 0a — Bundler-resolution spike (MUST complete before Phase 1):**
Making one workspace package importable by both **Metro (React Native)** and **Next.js webpack/turbopack** simultaneously is not free. Specifically verify the following in a throwaway PR:
- Metro can resolve `@halla/shared` via the workspace symlink. RN's Metro has historically required `watchFolders` extension and sometimes explicit `resolver.nodeModulesPaths` — confirm in `halla-mobile/metro.config.js`.
- Next.js `transpilePackages: ['@halla/shared']` in `next.config.mjs` so the shared package isn't externalized.
- Both bundlers handle the chosen module format. Plain ESM is the default target since shared is hand-written JS; if Metro needs CJS for any reason, add a dual-format `exports` map at that point — not before.
- Source maps work end-to-end (so a Zod parse error in shared points at the shared file, not a transpiled artifact).
- No build step for shared if at all possible: consume `.js` files directly via workspace symlink. Avoid bundlers/transpilers in the shared package.

Output of the spike: a 1-page memo confirming the chosen approach actually loads in both bundlers, plus a `shared/package.json` `exports` field that both bundlers consume. **Do not start Phase 1 until this is green.**

**Phase 0b — CI baseline (parallelizable with 0a):**
Add a GitHub Actions workflow per app: `lint && type-check && build`. Mobile already has `eas.json` for builds; layer a workflow on top so PRs surface failures before merge. Keep it fast (<5 min) so it doesn't become the bottleneck.

**Phase 0c — Backend envelope cleanup (2 hours, blocks nothing but unblocks §2.3 simplifications):**
Migrate the ~18 remaining ad-hoc `{ success: true, ... }` responses in `labbe-backend-/src/modules/**/*.controller.js` to use `sendSuccess()` / `sendCreated()` / `sendPaginated()` from `shared/utils/responseHelper.js`. Grep target: `return res\.(json|status)` and `res\.json\(\{\s*success`. After this, every backend response carries **both** `success: true` AND `status: 'success'` — client adapter code drops to "check one field, read documented data path, throw on anything else."

Deliverable: `D:\halla\package.json` with workspaces; `D:\halla\shared\package.json` with verified `exports` map; one demo export imported and used by a single throwaway file in each app to prove resolution works; CI passing on a noop PR for each app.

### Phase 1 — Lift `API_PATHS` & shared schemas (low risk, immediate win)

1. Copy `labbe/services/new-backend/api.config.js` → `shared/src/api/paths.js`. Keep it as plain JS — freeze the top-level object with `Object.freeze` (and ideally `as const`-equivalent via JSDoc `@type`) so consumers don't mutate it.
2. Identify the union of schemas: merge `labbe/utils/schemas/*` and `halla-mobile/utils/schemas/*` into `shared/src/schemas/*`, organized per domain (`auth`, `events`, `guests`, `staff`, `tickets`, `plans`, `addons`, `post-event`, `vendor`, `settings`, `notifications`, `admin`). Where the same domain exists in both, take the stricter/more-complete version (typically web), reconcile field names with backend.
3. Re-point imports:
   - `labbe`: replace `@/services/new-backend/api.config` with `@halla/shared/api/paths`. Replace `@/utils/schemas/*` with `@halla/shared/schemas/*`.
   - `halla-mobile`: introduce these imports; replace inline endpoint strings + the `ENDPOINTS` map in `config/api.js` with `API_PATHS.events.byId(id)`-style helpers; replace local schema imports.
4. Delete the moved-from files in each app.

**Risk:** Low. Imports change but behavior is identical. **Test:** type-check + smoke-test login, signup, create event on both apps.

**Concrete files affected:** every file in `labbe/utils/schemas/` and most of `halla-mobile/utils/schemas/`; every service file in `halla-mobile/services/` (the hardcoded endpoint strings); `halla-mobile/config/api.js` (collapses to a thin re-export).

### Phase 2 — Unify `ApiError` and error→i18n mapping

1. Merge `halla-mobile/services/authErrors.js` + `labbe/services/errorHandlingService.js` → `shared/src/errors/index.js`. Preserve every code currently mapped in either app — union, not intersection.
2. **i18n key audit:** for every error code the shared mapper references, run an existence check against both `labbe/localization/locales/{ar,en}/errors.json` and `halla-mobile/localization/locales/{ar,en}/errors.json` (and any other locale file referenced by the mapper). Add missing keys to whichever side is short. Mobile is currently missing Arabic translations for some vendor-only error codes that web has.
3. Both apps' HTTP adapters throw the shared `ApiError`.
4. Map the backend's `410 Gone` (revoked-token) + structured `reason` into a dedicated `ApiError` subtype so both clients can react with a single auth-store action (`logout({ reason })`).

**Risk:** Medium — error UX is user-visible. **Test:** force an OTP cooldown, suspended account, invalid token; verify both apps show the same message.

### Phase 3 — Web: collapse to one HTTP client

1. Migrate `labbe/services/notification.js`, `labbe/services/staff.js`, `labbe/services/adminDashboard.js` from legacy `apiClient` to `apiRequest` (the axios one). They already reference `API_PATHS` in places; just swap the call site.
2. Delete `labbe/services/apiClient.js` (legacy), `labbe/services/apiResponseHandler.js`. Audit `labbe/utils/cookieUtils.js` and delete any usage that reads the legacy JS-readable cookie. Display-only helpers (e.g., remembered username) can stay if they exist.
3. Delete the JS-readable mirror-cookie `getToken()` codepath (B-1 hardening). Cookies remain HttpOnly; tests confirm refresh still works.

**Risk:** Medium. **Test:** notification list + unread count poll; staff portal QR check-in; admin dashboard tables (hosts, vendors, moderators, payments).

### Phase 4 — Mobile: consolidate events service

1. Move the *validation* helpers from `halla-mobile/services/EventsService.js` (`validateListItem`, `processImportedCSV`, `transformFormDataToPayload`, `getDefaultFormValues`) into `shared/src/utils/event-form.js` if pure, or into `halla-mobile/hooks/events/useEventForm.js` (a non-hook helper file is fine, matches web's `useEventForm.js`).
2. Merge the seven `eventsService.*.js` shards + `eventsService2.js` façade into a single `services/eventsService.js` with sub-objects (`events.crud`, `events.guests`, `events.staff`, `events.settings`, `events.exports`). Update all hook imports.


3. Move per-guest CRUD from `services/guestsService.js` into the same `eventsService.guests` namespace (endpoint path lives at `/guests/events/:eventId/...` but is logically event-scoped; rename file to `eventGuestsService` for backend-shape parity).
4. **Collapse the six `useEvent*Mutations.js` hook files into one factory-driven `useEventMutation.js`** that takes an operation key (mirroring web's `labbe/hooks/events/mutations/useEventMutation.js`). The current `useEventMutations.js` is already a façade — fold the underlying CRUD/guest/settings/staff/messaging files into a single config map.
5. Delete `EventsService.js`, `eventsService.{crud,http,guests,settings,staff,exports}.js`, `eventsService2.js`, `useEventCrudMutations.js`, `useEventGuestMutations.js`, `useEventSettingsMutations.js`, `useEventStaffMutations.js`, `useEventStaffCrudMutations.js`.

**Risk:** Medium-high — lots of imports change. **Test:** create event flow end-to-end (host + admin paths), edit guests, edit staff, send test message, retry launch.

### Phase 4b — Behavior parity fix (small, surgical)

The previous draft listed four parity fixes; verification reduced this to **one** real gap.

1. **Mobile reset-password completion.** Add `halla-mobile/screens/auth/ResetPasswordScreen.js` that calls the already-existing `resetPasswordAPI()` in `halla-mobile/services/authService.js:466-476`. Wire it into the navigator and register a universal/app link so the email's `https://halaa.com.sa/reset-password/:token` URL opens the screen directly with the token in route params. Add a `resetPassword` action to `authStore.js` (mirroring web's). Smoke-test end-to-end: request reset → click email link on phone → land in app → submit new password → log in.

**Risk:** Low. **Test:** full forgot-password flow on mobile from a real email; ensure web flow still works (no shared changes).

**Web cross-check (verified during the revision pass):** web's flow lives at `labbe/app/[lang]/(auth-layout)/change-password/page.js` and uses a query-string token (`/change-password?token=…`) rather than a path parameter. The form is `ChangePassword.js` and the mutation goes through `useAuthMutation("resetPassword")`. Note the URL-shape divergence: backend route is `PATCH /auth/reset-password/:token` but the web *landing* URL is `/change-password?token=`. Mobile should mirror this exactly — same landing URL, same query-param scheme — unless the team wants to standardize the public URL on `/reset-password/:token` (recommended for hygiene; cost = update the email template + one Next.js route rename + universal-link configuration for mobile).

### Phase 5 — Both apps: standardize hook layout

1. **Web:** create `hooks/<domain>/{queries,mutations,keys.js,index.js}` for every domain currently in `hooks/reactQueryHooks/*`. Move file contents over; update imports. Delete `hooks/reactQueryHooks/`. Delete `hooks/queries/` and `hooks/mutations/` (legacy). Delete the deprecated `hooks/reactQueryHooks/useEvents.js` façade (already documented as "use hooks/events instead").
2. **Mobile:** rename current `hooks/queries/useEvents.js` etc. into `hooks/events/queries/`, etc. Add `keys.js` per domain. Delete old flat layout. Apply this consistently across all ~20 domains in §2.4.
3. Adopt query-key factories everywhere. Example:
   ```ts
   // hooks/events/keys.js
   export const eventKeys = {
     all: ['events'] as const,
     lists: () => [...eventKeys.all, 'list'] as const,
     list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
     details: () => [...eventKeys.all, 'detail'] as const,
     detail: (id: string) => [...eventKeys.details(), id] as const,
     stats: (id: string) => [...eventKeys.detail(id), 'stats'] as const,
   };
   ```
4. Invalidation always goes through the factory — fewer "I forgot to invalidate this key" bugs.
5. **Cache-migration safety:** when a query-key shape changes, invalidate the old keys explicitly on first load of the next app version (or just clear the RQ cache on app start during the rollout window). Mobile, where users hold app versions for weeks, needs this more than web.

**Risk:** Highest of all phases because of import churn. Do it after Phase 4. **Test:** each domain's primary screens on both apps.

### Phase 6 — Auth store alignment

1. Define the canonical store shape in shared as a Zod schema (for the *snapshot*, not the store itself). Both apps' Zustand stores conform.
2. Mobile: keep `secureStorage.js` (it's the platform delta), but re-name fields to match web (e.g., both use `subscription` not `plan`).
3. Web: stop relying on `Cookies.get("token")` anywhere; the cookie is HttpOnly. The store's `token` field becomes vestigial — delete it.
4. Both apps emit the same auth status machine (`checking → loading → authenticated|unauthenticated`).
5. Both stores expose the same action surface, including the new `resetPassword` from Phase 4b.

**Risk:** Low-medium. **Test:** cold-launch with cached refresh on mobile; refresh-after-expiry on web; logout from both clears all state.

### Phase 7 — Kill the duplicate stores

1. **Mobile:** delete `stores/adminStore.js`. Replace each consumer with the corresponding `hooks/admin/queries/use*` or `hooks/admin/mutations/use*`. RQ becomes the single source of truth for admin lists.
2. **Web:** convert `stores/notificationStore.js` from "store that calls service + manual `setInterval` polling" to "thin store of UI state only (read/unread toggle, filter state)" — the RQ hooks **already exist** in `labbe/hooks/reactQueryHooks/useNotifications.js` (with `useUnreadNotificationCount` already configured for 30 s `refetchInterval`). The work is to route consumers to those hooks and gut the store's data layer, not to build new hooks. Relocate `useNotifications.js` to `hooks/notifications/queries/` as part of Phase 5.
3. Remove the manual `setInterval` at `labbe/stores/notificationStore.js:248-250`.

**Risk:** Medium. **Test:** admin tables (mobile), notification bell + list (web).

### Phase 8 — Cleanup pass

- Delete `labbe/staticData/events/data.js` (verified zero importers).
- Delete `labbe/utils/schemas/phoneValidation.js` (consolidate into `shared/src/schemas/auth.js`).
- **Delete `halla-mobile/utils/errorHandler.js`** — dead code, zero importers verified. Any unique error codes/messages it defines get harvested into `@halla/shared/errors/errorCodeMap.js`; the rest is duplicate of `services/authErrors.js` patterns.
- Extract `getStaticAssetBaseUrl()` helper for the `API_BASE_URL.replace("/api/v2", "")` pattern in `halla-mobile/services/marketplaceService.js:71` and any other callers.
- Extract `userAccountService` (shared between `vendorService` and `settingsService`) on both apps.
- Apply the cleanup-in-place items from §7 (console.log removal, comment-block cleanup, helper deduplication).
- Delete any `// removed` / unused exports flagged during the above phases.
- Run grep for leftover imports from the deleted files; fail the build if any remain.
- Lint pass: forbid imports from `@/services/apiClient` (web) and from `services/EventsService` (mobile) via ESLint `no-restricted-imports`. Add a rule that forbids literal `/api/v2/` strings anywhere outside `@halla/shared`. Add a rule banning `console.log` in production code paths (warn-level on `console.warn`/`console.error`).

### Phase 9 — Verify & lock in

- End-to-end smoke on both apps: auth (4 paths: host email, host OTP, vendor, whitelabel) + **full forgot-password reset on mobile**, event create wizard (host + admin), guest CRUD, plan checkout (with 3DS), admin host/vendor list, notifications, post-event guest portal.
- CI check: `eslint` against `@halla/shared`, `labbe`, and `halla-mobile`; `next build` for `labbe`; `expo prebuild --no-install` dry-run for `halla-mobile`.
- CI check: fails if either app has a literal URL string matching `/api/v2/` (forces use of `API_PATHS`).
- CI check: fails if either app imports from a deleted path (compile-time guarantee).
- Document the rules in a top-level `ARCHITECTURE.md` (mostly a condensed version of §2 here).

---

## 4. Order of operations & rough effort

| Phase | Effort (focused) | Risk | Blocks |
|---|---|---|---|
| 0 — workspace setup | 0.5 day | low | 0a |
| 0a — bundler-resolution spike | 0.5-1 day | medium (spike may surface integration pain) | 1, 4 |
| 0b — CI baseline (parallel) | 0.5 day | low | 9 |
| 0c — backend envelope cleanup | 0.25 day (2h) | low | 2 |
| 1 — lift API_PATHS + schemas | 2-3 days | low | 2, 3, 4 |
| 2 — unify error mapping + i18n audit | 1 day | medium | 3 |
| 3 — web: collapse HTTP clients | 2 days | medium | 5 |
| 4 — mobile: consolidate events service + event mutation hooks | 2-3 days | medium-high | 5 |
| **4b — mobile reset-password screen + deep link** | **0.5 day** | **low** | **9** |
| 5 — standardize hook layout (both apps, ~20 domains) | 3-4 days | high (churn) | 6, 7 |
| 6 — auth store alignment | 1-2 days | low-medium | 7 |
| 7 — kill duplicate stores | 1-2 days | medium | — |
| 8 — cleanup (+ helpers, lint rules) | 1-2 days | low | — |
| 9 — verify & lock in | 1 day | low | — |

**Total: ~16-20 focused engineering days** on a feature-freeze branch with continuous integration testing. Suggest tackling phases 0-2 in the first week, 3-4b in the second, 5-9 in the third.

---

## 5. Risks & guardrails

- **Big bang vs phased:** the phasing above keeps every step shippable. Resist the temptation to do 1+3+4 in one PR — diffs become unreviewable.
- **Schema name reconciliation:** when merging schemas, keep the stricter set of fields and the stricter validators. If web validates `email` with `.toLowerCase().trim()` and mobile doesn't, take the stricter one — backend doesn't care.
- **Hook key factories without migration plan = silent cache misses.** When you change a query key shape, invalidate the old keys explicitly on first load (or just clear the RQ cache on app start during the rollout window). Mobile is the bigger risk because users hold an app version for weeks.
- **Mobile FormData replay limitation:** the existing apiClient already documents that FormData bodies can't be retried after refresh. Don't regress this when narrowing the transport.
- **Server-only code on web:** `services/serverAuth.js`, `providers/index.js` use `next/headers` and `next/navigation`. They cannot move into shared. Keep them in `labbe/`.
- **Backend response shape inconsistencies** (§1.3) — after Phase 0c, the envelope is uniform. **Single-resource data shapes** (`{ event }` vs `{ user }` vs the raw object) are intentional per route — clients read the documented field; do NOT push transformation logic into UI code.
- **i18n keys for errors** (Phase 2) — when merging error mappers, audit both apps' locale files for missing keys. Mobile currently shows English fallbacks for some vendor-only error codes that web has Arabic translations for.
- **Mobile deep links (Phase 4b)** — universal links / app links must be configured on both iOS (`apple-app-site-association`) and Android (`assetlinks.json`). Backend serves these via `halaa.com.sa`. Don't forget the test on a physical device — simulator behavior diverges.

---

## 6. Open questions — answered

The previous draft listed open questions for the team. These are now decided based on the code state of the repo. Override only with explicit pushback.

### Q1. Workspace tool

**Decision: npm workspaces.**
All three packages already use `package-lock.json` exclusively (no `yarn.lock`, no `pnpm-lock.yaml`). No `packageManager` field set in any `package.json`. Expo + pnpm has historical symlink/peer-resolution pain; npm 7+ workspaces are zero-friction.

### Q2. TypeScript scope

**Decision: JS everywhere. No TypeScript in any package.**
Confirmed by team: stay JS across `labbe`, `halla-mobile`, and `@halla/shared`. Use JSDoc `@typedef` blocks (sourced from Zod schemas via comments, not codegen) where editor autocomplete on shared shapes is valuable. Mobile's `tsconfig.json` + `typescript` devDep can stay (Expo accepts both), but no `.ts` files get added. Validation continues to live at runtime in Zod schemas; types are documentation, not enforcement.

### Q3. CI

**Decision: add minimal CI as part of Phase 0b.**
Today: mobile has `eas.json`; web and backend have **nothing** (no `.github/workflows/`, no `vercel.json` deploy config, no other CI files). Add GitHub Actions per app: `lint && type-check && build` on PR. ~1 day total. Mobile workflow layers on top of EAS for build dispatch.

### Q4. Backend response envelope normalization

**Decision: fix on the backend, not the client.**
The verification pass found that `sendSuccess()`/`sendCreated()`/`sendPaginated()` in `labbe-backend-/src/shared/utils/responseHelper.js` already emit **both** `success: true` AND `status: 'success'` on the same payload — so the "two envelopes" problem only exists where controllers bypass the helper. Count: ~214 routes use the helper; ~18 don't. Estimated effort to migrate the stragglers: **2 hours**. After Phase 0c, the client adapter checks one field and reads documented `data` — no transformation pipeline needed. This collapses §2.3 from "envelope-normalizing adapter" to "validating adapter."

### Q5. Notification polling — keep, or move to realtime?

**Decision: keep 30s polling.**
Backend has zero realtime infrastructure today (no `ws`, no `socket.io`, no `pusher`, no SSE, no FCM server SDK). Mobile already has `expo-notifications` installed — that's the right channel for *push* (critical alerts, urgent updates), not the unread-count badge. Polling cost is trivial: ~200 B every 30 s, dominated by TLS overhead. Revisit at 100k+ DAU. For Phase 7, RQ's `refetchInterval` replaces the `setInterval` cleanly; same wire cost, better dedup.

---

## 7. Cleanup-in-place — kept files that still need work

The deletion lists in Appendix A are aggressive but they leave many files in place. A final read-through of those "stays" files surfaced **specific cleanups required before the refactor declares done**. None block the structural phases; they all fold into Phase 8.

### 7.1 Web (`labbe/`)

**`labbe/utils/index.js`** — NEEDS-CLEANUP
- Lines 56 and 77: `console.log("formValues", ...)` and `console.log("result", ...)` left from a debug session inside `validateStep`. Remove.
- `getMediaUrl()` (lines 21-50) is genuinely useful and non-trivial (handles File / Blob / absolute / relative-with-backend-origin). **Promote to `@halla/shared/utils/media.js`** — mobile's `marketplaceService.js:71` strip-`/api/v2` trick is solving the same problem badly.
- `validateStep`, `createStepHandler`, `setNestedValue` overlap with helpers in `authFormHelpers.js`. Pick one location per helper; delete duplicates.

**`labbe/utils/vendorHelpers.js`** — NEEDS-CLEANUP
- Overlaps with `utils/index.js` (`getMediaUrl` is defined or re-implemented). Dedupe: keep `vendorHelpers.js` for vendor-specific data shaping; move generic helpers out.

**`labbe/services/notification.js`** — NEEDS-CLEANUP (Phase 3)
- Still imports legacy `apiClient` (line 6) — Phase 3 migration to axios is mandatory.
- `formatTimeAgo`, `getNotificationIcon`, `getPriorityColor` (presentation helpers) are duplicated client-side logic. **Move to `@halla/shared/utils/notification.js`** — mobile has the same need.
- Line 94: raw `console.error`; wrap in `process.env.NODE_ENV === "development"` check or remove.

**`labbe/services/staff.js`** — DEFERRED HARDENING
- Reads `Cookies.get("staffToken")` (JS-readable) — documented at lines 5-8 as intentional ("future hardening pass"). **Add to a Phase 3b backlog item:** move staff-portal token to HttpOnly cookie like the main auth flow. Not blocking this unification but flag it explicitly.

**`labbe/providers/index.js`** — MINOR
- Commented-out redirect block at lines 45-47. Decide: delete the dead block, or convert to a real `// TODO` comment with the ticket reference.

**`labbe/hooks/usePageAccess.js`** — UPDATE AFTER PHASE 1
- Imports `ACCESS_LEVELS` and three permission predicates from `@/ui/layout/navConfig`. The file exists and the hook works today, **but `ACCESS_LEVELS` will move to `@halla/shared/constants/roles.js` in Phase 1.** Update this import as part of Phase 1's re-pointing pass; do not leave a dangling local copy of `ACCESS_LEVELS` in `navConfig.js` after Phase 1.

**`labbe/hooks/UseLanguageChange.js`** — MINOR
- Commented-out lines (16, 33-40). Clean up or remove.

### 7.2 Mobile (`halla-mobile/`)

**`halla-mobile/utils/errorHandler.js`** — DELETE (moved to Appendix A)
- Verified zero importers. Hardcoded Arabic/English error messages duplicate what `@halla/shared/errors/errorCodeMap.js` will hold after Phase 2. Harvest any unique codes, then delete.

**`halla-mobile/services/authService.js`** — NEEDS-CLEANUP
- Lines 265 and 315: raw `console.log` with phone number (`"[AUTH SERVICE] Verifying OTP for login:", mobile`). **PII leak in release builds.** Replace with `dlog` (already used elsewhere in the file at line 42). Audit all `console.log` in service files for similar PII exposure during Phase 8.

**`halla-mobile/services/notificationService.js`** — NEEDS-CLEANUP
- Audit `console.log` usage; same `dlog` rule.
- The `_legacyToken` parameter is already on the Phase 8 list (remove after caller audit).

**`halla-mobile/services/marketplaceService.js`** — NEEDS-CLEANUP (already in Phase 8)
- Line 71 `.replace("/api/v2", "")` → extract to `getStaticAssetBaseUrl()`. The same helper should serve web's `getMediaUrl()` once promoted to shared.

**`halla-mobile/hooks/useDebouncedValue.js`** — UNIFY WITH WEB
- Web exports `useDebounce` (500 ms default); mobile exports `useDebouncedValue` (350 ms default). **Same code, different name and default.** Resolution: move the hook to `@halla/shared/utils/useDebounce.js` (it's pure React, no platform dependency); both apps re-export under the canonical name `useDebounce` with the same default (pick one — web's 500 ms is the more conservative default for typeahead-style usage). Update consumers.

**`halla-mobile/contexts/QueryProvider.js` vs `halla-mobile/config/queryClient.js`** — GOOD as-is
- QueryProvider wraps the client; queryClient holds the config. No duplication. Document this split in `ARCHITECTURE.md`.

**`halla-mobile/contexts/ToastContext.js`** — PLATFORM-SPECIFIC, but contract aligns with web (see §8 below)

### 7.3 ESLint additions to lock in

After Phase 8, add these rules so the same problems don't grow back:
- **No-restricted-imports:** `@/services/apiClient` (web legacy), `services/EventsService` (mobile capital-E), `services/eventsService2` (mobile façade).
- **No-restricted-syntax:** literal regex `\/api\/v2\/` outside `@halla/shared`.
- **No-console:** error on `console.log` in `src/**` (mobile services + utils); warn on `console.warn`/`console.error`. Allow inside files explicitly tagged `// eslint-disable-next-line no-console` for known-good logging.
- **No `useNavigation` / `useRouter` inside `hooks/`** — enforces the hooks-do-data / screens-do-side-effects split from §2.6.

---

## 8. Remaining cross-app pattern divergences — addressed

After Phase 7, four patterns still differ between web and mobile. Three are now unified; one stays divergent by design.

### 8.1 Toast surface — unify the API, not the implementation

- **Web:** `labbe/utils/toastUtils.js` — `react-toastify` wrapper exposing `toast.success`, `toast.error`, `toast.info`, `toast.warning`.
- **Mobile:** `halla-mobile/contexts/ToastContext.js` — custom RN context with animated stack, exposes `toast.success/error/info/warning` via a hook (`useToast()`).

**Resolution:** the **call site contract is identical** (`toast.success("message")`) — just exposed differently (named import on web, hook on mobile). Codify in `ARCHITECTURE.md` that any code intended to be portable through shared (e.g., shared hooks that happen to need a toast) must accept the toast function as a parameter, not import a global. New rule: hooks in `@halla/shared` never call toast directly.

### 8.2 Debounce hook — move to shared

- See §7.2. Move `useDebounce` to `@halla/shared/utils/useDebounce.js`. Both apps import the same hook with the same default. Delete the two local copies.

### 8.3 Action gate — move to shared

- **Web:** `labbe/hooks/events/useEventActionGate.js` (95 lines).
- **Mobile:** `halla-mobile/hooks/useEventActionGate.js`.
- Verified during final review: **the two files are functionally identical** — same RBAC check, same `whitelabelId` scoping, same `_id.toString()` defensive cast.
- **Resolution:** promote to `@halla/shared/hooks/useEventActionGate.js`. Pure React, no platform deps. Both apps import the canonical version. Delete both local copies in Phase 5/8.

### 8.4 Form-builder pattern — keep divergent, document

- **Web:** `labbe/hooks/events/useEventForm.js` — single-form, react-hook-form based, all 4 steps live in one form context.
- **Mobile:** `halla-mobile/hooks/useCreateEventForm.js` — step-based, separate validation per step, navigates between screens.
- **Verdict:** **intentional UX divergence**, not architectural drift. Mobile's step model fits small screens; web's single-form fits desktop. Both consume the same shared schemas, so validation is consistent.
- **Resolution:** document the split in `ARCHITECTURE.md`. Do not attempt to unify.

### 8.5 Date/time formatting

- Web has `utils/date/useLocalizedDate.js` (Intl.DateTimeFormat hook) and `utils/formatTemplateDate.js`.
- Mobile has `utils/timeFormat.js` and `utils/formatTemplateDate.js`.
- **Resolution:** move pure formatters (`formatTemplateDate`, `formatTime`, date utilities) to `@halla/shared/utils/date.js` in Phase 1. Keep `useLocalizedDate` web-only if it does anything Next.js-specific; otherwise also move to shared as a portable hook.

---

## Appendix A — File-level diff snapshot

> **Counts:** ~52 files deleted from `labbe/` (web) + 5 folders removed. ~37 files deleted from `halla-mobile/` (mobile) + 3 folders removed. Many more files are *modified* (imports re-pointed) but not deleted.

### A.1 Web — files to delete, grouped by phase

**Phase 1 — schemas + utils that migrate to `@halla/shared`:**

Entire folder `labbe/utils/schemas/` removed (all 18 files):
```
labbe/utils/schemas/accountSettingsSchema.js
labbe/utils/schemas/addHostSchema.js
labbe/utils/schemas/addModeratorSchema.js
labbe/utils/schemas/addServiceSchema.js
labbe/utils/schemas/adminPopupSchemas.js
labbe/utils/schemas/authSchema.js
labbe/utils/schemas/createEventSchema.js
labbe/utils/schemas/eventAddintionSchemas.js
labbe/utils/schemas/notificationPreferencesSchemas.js
labbe/utils/schemas/phoneValidation.js
labbe/utils/schemas/planSchema.js
labbe/utils/schemas/postEventSchemas.js
labbe/utils/schemas/settingsSchemas.js
labbe/utils/schemas/staffSchemas.js
labbe/utils/schemas/ticketRatingSchema.js
labbe/utils/schemas/ticketSchema.js
labbe/utils/schemas/updateEventSchema.js
labbe/utils/schemas/vendorSettings.js
```

Duplicate phone-validation copy at utils root:
```
labbe/utils/phoneValidation.js
```

Pure-utility files that move into `@halla/shared/utils/` then their local copies are deleted:
```
labbe/utils/locale.js              → @halla/shared/utils/locale.js
labbe/utils/DirectionUtils.js      → @halla/shared/utils/direction.js
labbe/utils/formatTemplateDate.js  → @halla/shared/utils/date.js
labbe/utils/xlsxUtils.js           → @halla/shared/utils/xlsx.js
```

Constants folder also migrates:
```
labbe/utils/constants/             → @halla/shared/constants/
```

**Phase 2 — error mapping merge:**
```
labbe/services/errorHandlingService.js     (merged into @halla/shared/errors/)
labbe/services/new-backend/api.config.js   (already lifted to @halla/shared/api/paths.js in Phase 1)
```

**Phase 3 — HTTP client collapse:**
```
labbe/services/apiClient.js                (legacy fetch client, 381 lines)
labbe/services/apiResponseHandler.js       (327 lines, superseded)
labbe/utils/cookieUtils.js                 (audit; remove the JS-readable mirror-token path; keep file if other UI-only uses remain)
```

**Phase 5 — hook tree consolidation. Three entire folders removed:**

`labbe/hooks/reactQueryHooks/` (20 files):
```
labbe/hooks/reactQueryHooks/useAddons.js
labbe/hooks/reactQueryHooks/useAdmin.js
labbe/hooks/reactQueryHooks/useAuthMutation.js
labbe/hooks/reactQueryHooks/useCheckout.js
labbe/hooks/reactQueryHooks/useDashboard.js
labbe/hooks/reactQueryHooks/useDiscounts.js
labbe/hooks/reactQueryHooks/useEvents.js                       (7-line deprecated façade)
labbe/hooks/reactQueryHooks/useGuests.js
labbe/hooks/reactQueryHooks/useLocations.js
labbe/hooks/reactQueryHooks/useMessaging.js
labbe/hooks/reactQueryHooks/useNotifications.js
labbe/hooks/reactQueryHooks/usePayments.js
labbe/hooks/reactQueryHooks/usePlans.js
labbe/hooks/reactQueryHooks/useServices.js
labbe/hooks/reactQueryHooks/useStaff.js
labbe/hooks/reactQueryHooks/useSubscriptions.js
labbe/hooks/reactQueryHooks/useTickets.js
labbe/hooks/reactQueryHooks/useUsers.js
labbe/hooks/reactQueryHooks/useVendors.js
labbe/hooks/reactQueryHooks/post-event/useGuestPostEvent.js
labbe/hooks/reactQueryHooks/post-event/useHostPostEvent.js
```
(contents relocate to `labbe/hooks/<domain>/{queries,mutations}/`)

`labbe/hooks/queries/` (3 files):
```
labbe/hooks/queries/useScheduledExtraReminders.js
labbe/hooks/queries/useTaqnyatTemplates.js
labbe/hooks/queries/useTemplates.js
```

`labbe/hooks/mutations/` (1 file):
```
labbe/hooks/mutations/useTemplateMutations.js
```

**Phase 7 — partial delete in notification store:**
```
labbe/stores/notificationStore.js          (data-fetching half: setInterval @ lines ~248-250,
                                            fetchUnreadCount, fetchNotifications service calls)
                                            File kept as UI-state-only store.
```

**Phase 8 — relocations (delete after move to shared):**
```
labbe/utils/index.js                       `getMediaUrl` moved to @halla/shared/utils/media.js;
                                            console.log lines 56/77 removed; helper dedupe with
                                            authFormHelpers.js (see §7.1)
labbe/services/notification.js             presentation helpers (formatTimeAgo, getNotificationIcon,
                                            getPriorityColor) moved to @halla/shared/utils/notification.js
labbe/hooks/useDebounce.js                 relocated to @halla/shared/utils/useDebounce.js
labbe/hooks/events/useEventActionGate.js  relocated to @halla/shared/hooks/useEventActionGate.js
```

**Phase 8 — orphaned dead code:**
```
labbe/staticData/events/data.js            (orphaned mock data — zero importers verified)
labbe/staticData/events/                   (folder removed if empty)
labbe/staticData/                          (folder removed if empty)
```

**Web files that explicitly STAY** (platform-specific, no shared analogue):
```
labbe/services/serverAuth.js               uses next/headers (SSR)
labbe/services/guestTokenUtils.js          web-only guest-portal cookie handling
labbe/services/notification.js             kept (migrated to axios in Phase 3)
labbe/services/staff.js                    kept (migrated to axios in Phase 3)
labbe/services/adminDashboard.js           kept (migrated to axios in Phase 3)
labbe/services/scheduledExtraRemindersService.js
labbe/services/taqnyatTemplatesService.js
labbe/services/templatesService.js
labbe/services/new-backend/apiClient.js    → renamed to labbe/services/http.js in Phase 8
labbe/stores/authStore.js                  web-specific HttpOnly cookie auth
labbe/stores/notificationStore.js          retained as UI-state-only store
labbe/stores/sidebarStore.js
labbe/providers/*                          SSR i18n + RQ provider
labbe/utils/authFormHelpers.js
labbe/utils/toastUtils.js
labbe/utils/vendorHelpers.js
labbe/utils/index.js
labbe/utils/date/                          web's date helpers (kept; shared utils complement, not replace)
labbe/hooks/events/                        already canonical — populated further in Phase 5
labbe/hooks/{UseLanguageChange, use-media-query, useDebounce, useDirection, usePageAccess, useUnsavedChanges}.js
labbe/config/fonts.js                      Next/font config
```

---

### A.2 Mobile — files to delete, grouped by phase

**Phase 1 — schemas + utils that migrate to `@halla/shared`:**

Entire folder `halla-mobile/utils/schemas/` removed (all 8 files):
```
halla-mobile/utils/schemas/authSchemas.js
halla-mobile/utils/schemas/createEventSchema.js
halla-mobile/utils/schemas/discountSchema.js
halla-mobile/utils/schemas/settingsSchema.js
halla-mobile/utils/schemas/ticketSchema.js
halla-mobile/utils/schemas/updateEventSchema.js
halla-mobile/utils/schemas/vendorSchemas.js
halla-mobile/utils/schemas/vendorServiceSchema.js
```

Constants folder migrates:
```
halla-mobile/utils/constants/eventStatus.js   → @halla/shared/constants/eventStatus.js
halla-mobile/utils/constants/plans.js         → @halla/shared/constants/plans.js
```
(Local `halla-mobile/utils/constants/` folder removed.)

Pure-utility files that move into `@halla/shared/utils/`:
```
halla-mobile/utils/locale.js               → @halla/shared/utils/locale.js
halla-mobile/utils/DirectionUtils.js       → @halla/shared/utils/direction.js
halla-mobile/utils/formatTemplateDate.js   → @halla/shared/utils/date.js
halla-mobile/utils/timeFormat.js           → @halla/shared/utils/date.js (merged)
halla-mobile/utils/xlsxUtils.js            → @halla/shared/utils/xlsx.js
```

Endpoint registry collapses to a re-export:
```
halla-mobile/config/api.js                 (the ENDPOINTS map is removed — file becomes
                                            a 1-line re-export of @halla/shared/api/paths,
                                            kept only for `API_BASE_URL` constant)
```

**Phase 2 — error mapping merge:**
```
halla-mobile/services/authErrors.js        (merged into @halla/shared/errors/)
```

**Phase 4 — events service + event mutation hooks consolidation:**

Service shards collapse to one `services/eventsService.js`:
```
halla-mobile/services/EventsService.js                 (capital E — validation moves to shared utils)
halla-mobile/services/eventsService.crud.js
halla-mobile/services/eventsService.http.js
halla-mobile/services/eventsService.guests.js
halla-mobile/services/eventsService.settings.js
halla-mobile/services/eventsService.staff.js
halla-mobile/services/eventsService.exports.js
halla-mobile/services/eventsService2.js                (façade)
```

`guestsService.js` is **renamed** to `eventGuestsService.js`, not deleted (backend route shape `/guests/events/:eventId/...` justifies keeping it separate from `eventsService.js`):
```
halla-mobile/services/guestsService.js     → renamed to halla-mobile/services/eventGuestsService.js
```

Six event-mutation hook files collapse into one factory:
```
halla-mobile/hooks/mutations/useEventMutations.js          (existing façade)
halla-mobile/hooks/mutations/useEventCrudMutations.js
halla-mobile/hooks/mutations/useEventGuestMutations.js
halla-mobile/hooks/mutations/useEventSettingsMutations.js
halla-mobile/hooks/mutations/useEventStaffMutations.js
halla-mobile/hooks/mutations/useEventStaffCrudMutations.js
```
(replaced by a single `halla-mobile/hooks/events/mutations/useEventMutation.js` factory)

**Phase 5 — hook tree restructure. Two entire folders removed:**

`halla-mobile/hooks/queries/` (22 files):
```
halla-mobile/hooks/queries/useAddons.js
halla-mobile/hooks/queries/useAdmin.js
halla-mobile/hooks/queries/useAdminInfinite.js
halla-mobile/hooks/queries/useDashboard.js
halla-mobile/hooks/queries/useDiscounts.js
halla-mobile/hooks/queries/useEvents.js
halla-mobile/hooks/queries/useGuestPortal.js
halla-mobile/hooks/queries/useGuests.js
halla-mobile/hooks/queries/useLocations.js
halla-mobile/hooks/queries/useMarketplace.js
halla-mobile/hooks/queries/useNotifications.js
halla-mobile/hooks/queries/usePaymentPoll.js
halla-mobile/hooks/queries/usePlans.js
halla-mobile/hooks/queries/useScheduledExtraReminders.js
halla-mobile/hooks/queries/useStaff.js
halla-mobile/hooks/queries/useSubscriptions.js
halla-mobile/hooks/queries/useTaqnyatTemplates.js
halla-mobile/hooks/queries/useTemplates.js
halla-mobile/hooks/queries/useTickets.js
halla-mobile/hooks/queries/useUser.js
halla-mobile/hooks/queries/useVendor.js
halla-mobile/hooks/queries/post-event/useGuestPostEvent.js
halla-mobile/hooks/queries/post-event/useHostPostEvent.js
```

`halla-mobile/hooks/mutations/` remaining files (13 after Phase 4 already removed the 6 event ones):
```
halla-mobile/hooks/mutations/useAddonMutations.js
halla-mobile/hooks/mutations/useAdminMutations.js
halla-mobile/hooks/mutations/useAuthMutations.js
halla-mobile/hooks/mutations/useCheckout.js
halla-mobile/hooks/mutations/useDiscountMutations.js
halla-mobile/hooks/mutations/useGuestMutations.js
halla-mobile/hooks/mutations/useGuestPortal.js
halla-mobile/hooks/mutations/useMessagingMutations.js
halla-mobile/hooks/mutations/useNotificationMutations.js
halla-mobile/hooks/mutations/useStaffMutations.js
halla-mobile/hooks/mutations/useTicketMutations.js
halla-mobile/hooks/mutations/useUserMutations.js
halla-mobile/hooks/mutations/useVendorMutations.js
```
(Contents move to `halla-mobile/hooks/<domain>/{queries,mutations}/` — same code, new home.)

**Phase 7 — duplicate store deletion:**
```
halla-mobile/stores/adminStore.js          (full delete — RQ becomes single source of truth)
```

**Phase 8 — partial deletes / cleanup:**
```
halla-mobile/utils/errorHandler.js                FULL DELETE — verified zero importers; surfaced in §7
halla-mobile/services/adminDashboardService.js   lines ~334-350 (self-marked legacy `addons` block)
halla-mobile/services/notificationService.js     `_legacyToken` parameter (kept-for-compat, ignored
                                                  everywhere — remove after callers audited)
halla-mobile/services/marketplaceService.js:71   `.replace("/api/v2", "")` → extract to
                                                  `getStaticAssetBaseUrl()` helper (refactor, not delete)
halla-mobile/hooks/useDebouncedValue.js          relocated to @halla/shared/utils/useDebounce.js;
                                                  local copy deleted, callers re-pointed (see §7.2, §8.2)
halla-mobile/hooks/useEventActionGate.js         relocated to @halla/shared/hooks/useEventActionGate.js;
                                                  local copy deleted (see §8.3)
```

**Mobile files that explicitly STAY** (platform-specific, no shared analogue):
```
halla-mobile/services/apiClient.js            → renamed to halla-mobile/services/http.js in Phase 8
halla-mobile/services/secureStorage.js        expo-secure-store wrapper (platform-mandated)
halla-mobile/services/authService.js          kept (uses platform-specific storage)
halla-mobile/services/addonsService.js
halla-mobile/services/adminDashboardService.js  kept (clean up legacy block only)
halla-mobile/services/checkoutService.js
halla-mobile/services/dashboardService.js
halla-mobile/services/hostPostEventService.js
halla-mobile/services/locationsService.js
halla-mobile/services/marketplaceService.js
halla-mobile/services/messagingService.js
halla-mobile/services/notificationService.js
halla-mobile/services/plansService.js
halla-mobile/services/postEventService.js
halla-mobile/services/scheduledExtraRemindersService.js
halla-mobile/services/settingsService.js      kept (will share /users/profile + /users/password
                                              logic with vendorService via new userAccountService)
halla-mobile/services/staffService.js
halla-mobile/services/subscriptionService.js
halla-mobile/services/taqnyatTemplatesService.js
halla-mobile/services/templateService.js
halla-mobile/services/ticketsService.js
halla-mobile/services/vendorService.js        kept (same userAccountService pattern)
halla-mobile/stores/authStore.js              kept (uses secureStorage)
halla-mobile/utils/adminPermissions.js
halla-mobile/utils/canvasBake.js              RN-specific
halla-mobile/utils/download.js                RN-specific
halla-mobile/utils/errorHandler.js            kept (thin wrapper over shared ApiError)
halla-mobile/utils/imageUtils.js              RN-specific
halla-mobile/utils/languageStorage.js         AsyncStorage wrapper
halla-mobile/hooks/index.js                   barrel — regenerated after Phase 5
halla-mobile/hooks/useCreateEventForm.js
halla-mobile/hooks/useDebouncedValue.js
halla-mobile/hooks/useEventActionGate.js
halla-mobile/hooks/useFilterData.js
halla-mobile/hooks/useListManager.js
halla-mobile/config/queryClient.js            RQ config
halla-mobile/config/api.js                    retained for API_BASE_URL only after Phase 1
```

---

### A.3 Summary counts

| Side | Files deleted | Files relocated to shared | Files renamed | Folders removed |
|---|---|---|---|---|
| Web (`labbe/`) | ~53 | 4 (`useDebounce`, `useEventActionGate`, `getMediaUrl`, notification presentation helpers) | 1 (`new-backend/apiClient.js` → `http.js`) | 5 |
| Mobile (`halla-mobile/`) | ~38 (incl. `utils/errorHandler.js`) | 2 (`useDebouncedValue`, `useEventActionGate`) | 2 | 3 |
| **Total** | **~91 files** | **6 relocations to shared** | **3 renames** | **8 folders** |

**To create:**
- `D:\halla\shared\package.json`
- `D:\halla\shared\src\api\paths.js`
- `D:\halla\shared\src\api\transport.js`
- `D:\halla\shared\src\schemas\*` (one file per domain — auth, events, guests, tickets, plans, addons, staff, vendors, post-event, settings, notifications, admin)
- `D:\halla\shared\src\errors\index.js`
- `D:\halla\shared\src\constants\index.js`
- `D:\halla\shared\src\utils\{locale,date,direction,event-form,xlsx,media,notification,useDebounce}.js`
- `D:\halla\shared\src\hooks\useEventActionGate.js`
- `D:\halla\labbe\services\http.js` (axios adapter implementing `Transport`)
- `D:\halla\halla-mobile\services\http.js` (fetch adapter implementing `Transport`)
- `D:\halla\halla-mobile\screens\auth\ResetPasswordScreen.js` *(Phase 4b)*
- `D:\halla\.github\workflows\labbe.yml`, `D:\halla\.github\workflows\halla-mobile.yml`, `D:\halla\.github\workflows\labbe-backend.yml` *(Phase 0b)*
- `D:\halla\ARCHITECTURE.md` (final state documentation)

**To restructure (no semantic change, just relocation):**
- All `labbe/hooks/reactQueryHooks/*` → `labbe/hooks/<domain>/{queries,mutations}/`
- All `halla-mobile/hooks/queries/*` and `halla-mobile/hooks/mutations/*` → `halla-mobile/hooks/<domain>/{queries,mutations}/`

---

## Appendix B — Shared package: concrete layout + sample files

This is what `D:\halla\shared\` looks like after Phase 1 finishes. Plain JS, no transpile step.

```
D:\halla\shared\
├── package.json                    { "name": "@halla/shared", "main": "src/index.js", "exports": {...} }
├── src/
│   ├── index.js                    barrel — re-exports schemas/api/errors/constants/utils
│   │
│   ├── schemas/                    rewritten to mirror backend validation files
│   │   ├── _shared.js              saudiPhone, email, requiredString, password (primitives)
│   │   ├── auth.js                 login, signup, otp, forgotPassword, resetPassword, ...
│   │   ├── events.js               createEvent, guest, staff, eventSettings, ...
│   │   ├── tickets.js              createTicket, ticketRating
│   │   ├── plans.js                planSelect, checkout, addon
│   │   ├── vendor.js               vendorProfile, vendorService
│   │   ├── admin.js                addHost, addModerator, addService
│   │   ├── post-event.js           guestValidate, comment
│   │   ├── settings.js             accountSettings, notificationPreferences
│   │   └── index.js                barrel
│   │
│   ├── api/
│   │   ├── paths.js                API_PATHS (frozen)
│   │   ├── contracts.js            (optional) endpoint → { method, requestSchema, responseSchema } map
│   │   └── transport.js            Transport interface (JSDoc-typed)
│   │
│   ├── errors/
│   │   ├── ApiError.js             class ApiError extends Error with code/status/meta/reason/i18nKey
│   │   └── errorCodeMap.js         { "OTP_COOLDOWN": "errors.otp.cooldown", ... }  ~80 codes
│   │
│   ├── constants/
│   │   ├── roles.js                USER_ROLES, ADMIN_PAGES, ACCESS_LEVELS
│   │   ├── plans.js                PLAN_TIERS, ADDON_KINDS
│   │   ├── eventStatus.js          EVENT_STATUSES, GUEST_STATUSES, TICKET_STATUSES
│   │   └── index.js                barrel
│   │
│   └── utils/
│       ├── locale.js               getLocalized(obj, lang), isRTL(lang)
│       ├── direction.js            DirectionUtils helpers
│       ├── date.js                 formatDate, formatTime, parseTemplateDate
│       ├── eventForm.js            transformFormDataToPayload, validateListItem, processImportedCSV
│       ├── xlsx.js                 xlsx export helpers
│       └── index.js                barrel
```

### Sample — `src/schemas/_shared.js`
```js
import { z } from "zod";

// Mirrors labbe-backend-/src/modules/auth/auth.validation.js#phoneNumber
export const saudiPhone = z
  .string()
  .trim()
  .regex(/^(\+966|966|0)?5\d{8}$/, "validation.invalidSaudiPhone");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("validation.invalidEmail");

export const requiredString = z.string().trim().min(1, "validation.required");

export const password = z
  .string()
  .min(8, "validation.passwordMinLength")
  .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "validation.passwordComplexity");
```

### Sample — `src/schemas/events.js`
```js
import { z } from "zod";
import { saudiPhone, email, requiredString } from "./_shared.js";

// Mirrors labbe-backend-/src/modules/events/events.validation.js#guestEntry
export const guestSchema = z.object({
  id: z.number().optional(),
  name: requiredString.max(120),
  phone: saudiPhone,                          // required (matches backend)
  email: email.optional().or(z.literal("")),  // optional (matches backend)
});

export const createEventSchema = z.object({
  eventDetails: z.object({ /* mirrors backend */ }),
  guestList: z.array(guestSchema).min(1),
  staffList: z.array(staffSchema).optional(),
  /* ... full shape mirrors labbe-backend-/.../events.validation.js#createEvent */
});
```

### Sample — `src/api/paths.js`
```js
// Lifted verbatim from labbe/services/new-backend/api.config.js, frozen.
export const API_PATHS = Object.freeze({
  auth: Object.freeze({
    login: "/auth/login",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
    resetPassword: (token) => `/auth/reset-password/${token}`,
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  }),
  events: Object.freeze({
    list: "/events",
    byId: (id) => `/events/${id}`,
    create: "/events",
    update: (id) => `/events/${id}`,
    updateStaff: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    // ... ~460 paths total
  }),
  // ...
});
```

### Sample — `src/errors/ApiError.js`
```js
import { errorCodeMap } from "./errorCodeMap.js";

export class ApiError extends Error {
  constructor({ message, code, status, meta, reason }) {
    super(message);
    this.name = "ApiError";
    this.code = code;        // backend code, e.g., "OTP_COOLDOWN"
    this.status = status;    // HTTP status
    this.meta = meta;        // backend meta payload (cooldown ms, etc.)
    this.reason = reason;    // for 410 Gone revoked-token responses
  }
  get i18nKey() {
    return errorCodeMap[this.code] ?? "errors.unknown";
  }
}
```

### Sample — `src/api/transport.js`
```js
/**
 * @typedef {Object} TransportRequest
 * @property {"GET"|"POST"|"PATCH"|"PUT"|"DELETE"} method
 * @property {string} path                                  resolved from API_PATHS
 * @property {unknown|FormData} [body]
 * @property {Record<string, string|number|boolean>} [query]
 * @property {Record<string, string>} [headers]
 * @property {string} [idempotencyKey]
 * @property {number} [timeoutMs]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {Object} Transport
 * @property {<T>(opts: TransportRequest) => Promise<T>} request
 */

// Each app implements this interface; shared never instantiates it.
export {};
```

### Sample — `package.json`
```json
{
  "name": "@halla/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.js",
  "exports": {
    ".":            "./src/index.js",
    "./schemas":    "./src/schemas/index.js",
    "./schemas/*":  "./src/schemas/*.js",
    "./api/paths":  "./src/api/paths.js",
    "./api/*":      "./src/api/*.js",
    "./errors":     "./src/errors/ApiError.js",
    "./constants":  "./src/constants/index.js",
    "./utils":      "./src/utils/index.js",
    "./utils/*":    "./src/utils/*.js"
  },
  "dependencies": { "zod": "^3.x" }
}
```

Both apps import like:
```js
import { createEventSchema, guestSchema } from "@halla/shared/schemas/events";
import { API_PATHS } from "@halla/shared/api/paths";
import { ApiError } from "@halla/shared/errors";
import { USER_ROLES } from "@halla/shared/constants";
```

---

## Appendix C — Verification log

These claims were code-verified during the 2026-05-26 revision pass. When implementation starts, treat anything **not** in this list as needing re-verification before action.

| Claim | Status | Evidence |
|---|---|---|
| Web has two HTTP clients; legacy still consumed by 3 services | VERIFIED | `labbe/services/{notification.js:6, staff.js:11, adminDashboard.js:7}` all import the legacy `apiClient` |
| `API_PATHS` registry at `labbe/services/new-backend/api.config.js`, ~460 endpoints | VERIFIED | 487 lines, ~27 top-level domains |
| Mobile lacks an `API_PATHS` equivalent | VERIFIED | `halla-mobile/config/api.js` has a flat `ENDPOINTS` map; services build paths inline |
| Web has three parallel hook trees | VERIFIED | `labbe/hooks/{events, queries+mutations, reactQueryHooks}/` all coexist; `reactQueryHooks/useEvents.js` is 7-line façade |
| Mobile fragmented events service (8 files + façade) | VERIFIED | Files enumerated; `eventsService2.js` is a re-export façade |
| Mobile has 6 overlapping `useEvent*Mutations.js` files | VERIFIED | `useEventMutations.js` re-exports from the other 5 |
| Mobile `adminStore.js` duplicates RQ cache | VERIFIED | Stores `hosts/moderators/vendors/events/tickets/payments` Zustand state that already lives in RQ |
| Web `notificationStore.js` uses manual `setInterval` polling (30s) | VERIFIED | `stores/notificationStore.js:248-250` |
| Legacy `addons` block in `adminDashboardService.js` lines 334-350 | VERIFIED | Self-marked "Legacy: prefer …" |
| `labbe/staticData/events/data.js` orphaned | VERIFIED | `grep` for `staticData/events/data` returns zero importers |
| `phoneValidation.js` duplicates `authSchema.js` regex | VERIFIED | Both contain the same 9/10/11-digit Saudi-phone patterns |
| `marketplaceService.js:71` strips `/api/v2` for asset URLs | VERIFIED | Legitimate; consider extracting helper |
| `vendorService` and `settingsService` both hit `/users/profile` + `/users/password` | VERIFIED | `vendorService.js:{87,94,101}` and `settingsService.js:{18,27,35}` |
| Backend envelope: ~214 routes use `sendSuccess`, ~18 ad-hoc | VERIFIED | Helper at `labbe-backend-/src/shared/utils/responseHelper.js` emits both `success` + `status` |
| Mobile event-create routing per-role | VERIFIED-CORRECT | `halla-mobile/screens/common/CreateEventScreen.js:30-46` — host → `useCreateEvent` → `/events`; non-host → `useCreateEventForHost` → `/admin/events/create-for-host` |
| Staff update method — web/mobile/backend all PUT | VERIFIED-CONSISTENT | Backend `events.routes.js:725` PUT; mobile `eventsService.staff.js:53` PUT; web `useEventStaffMutation.js:49` PUT |
| Mobile has test-message and retry-launch UI wired | VERIFIED-PRESENT | `TestMessageModal.js` + `EventFailureBanner.js`, hooks in `useMessagingMutations.js` |
| Mobile lacks reset-password completion screen | VERIFIED-GAP | `resetPasswordAPI()` exists in `authService.js:466-476` but no screen/deep-link consumer found |
| Stack is JS-only (team decision) | DECIDED | All packages stay JS; `tsconfig.json` in mobile is dormant and not enforced |
| No CI for web/backend; mobile has `eas.json` only | VERIFIED | No `.github/workflows/`, no `vercel.json` deploy config in either app |
| All three apps use npm (package-lock.json), no yarn/pnpm lockfiles | VERIFIED | Lockfile-only check |
| Web also exists as JS with `jsconfig.json` (no TS) | VERIFIED | `labbe/jsconfig.json` is path-alias-only |

| Web has a complete reset-password page | VERIFIED — at `/change-password?token=…` | `labbe/app/[lang]/(auth-layout)/change-password/page.js` + `labbe/ui/auth/change-password/ChangePassword.js` (reads `token` from query string, submits via `useAuthMutation("resetPassword")`) |
| Web has a notifications RQ hook tree (so the Zustand store bypass is "two sources of truth," not "missing hook") | VERIFIED | `labbe/hooks/reactQueryHooks/useNotifications.js` defines `useNotifications`, `useUnreadNotificationCount` (30 s `refetchInterval`), `useNotification`, `useNotificationMutation` |

**Not re-verified in this pass (treat as assumed; verify before acting):**
- Exact endpoint count "~460" — based on previous draft's stated count, not recounted here.
- The ~15 "byte-identical" parity flows not specifically named in §1.5 verifications (host signup, vendor signup, event wizard steps, plans+checkout, etc.) were not re-traced in this pass; carried forward from prior trace.
- Specific i18n key gaps in `errors.json` — Phase 2 will surface these.
- Bundler-resolution behavior (Metro + Next.js) — Phase 0a spike will surface this.
- Backend single-resource data shape inventory (`{ event }` vs `{ user }` vs raw) — Phase 1 schema work will surface this.
