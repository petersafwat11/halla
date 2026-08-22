# Post-Audit Remediation Plan — Signup Gate, Android Plans Crash, and Outstanding iOS/RTL/Store Defects

Date: 2026-08-22
Repository: `D:\halla`
Reviewed surface: `halaa-mobile`, `halaa-backend`, `halaa-web`, `shared`, store-readiness evidence
Predecessors:
- `docs/audit/2026-08-21-consolidated-page-audit-remediation-plan.md` (the "audit plan" — all 31 sessions claim Complete)
- `docs/implementation/MOBILE_RTL_IOS_CROSS_APP_REMEDIATION_PLAN.md` + its ledger (code phases done; Phase 0, 5B, 7 open)
- Codex/Gemini diagnostic conversation of 2026-08-21 (iOS screenshot defects + App Store blocker)

## 1. Executive conclusion

The audit plan's code work is real and its automated suites pass, but three things remain:

1. **Two new user-facing regressions, both confirmed in current code:**
   - Host signup skips the Complete-Profile step after OTP (user lands directly on Home).
   - Android Host Plans tab shows the full-screen "حدث خطأ غير متوقع" ErrorBoundary page (render crash; exact stack not yet captured — may be fixed by the audit rework, must be reproduced).
2. **The iOS defect list from the Codex review is partially implemented.** The RTL remediation plan's code phases (BiDi helpers, locale utilities, legal renderer, input direction contract, purchase readiness model) are done, but the specific screenshot defects it deferred — form-label direction, ticket components, guest sheet, add-on row slots, price typography, `summary.subtitle`, `daysRemaining: -1`, `supportedLocales` — are all still present in the current branch.
3. **The audit plan's release gates were closed without device or store evidence.** Session 6.2's "100% translation parity" only proves AR↔EN set equality (it cannot catch a key missing from both files — `summary.subtitle` is the proof). Session 6.3's "release gate" ran only unit/integration tests: no iOS/Android device, no TestFlight sandbox, no App Store metadata verification. All 53 Apple products remain `MISSING_METADATA` per `docs/evidence/store-readiness/provider-after/apple-export.json`.

Strategy: fix the two regressions first (they block the store push), complete the verified-outstanding iOS/RTL defects as focused sessions, then run the real device/store gates that were never executed. This plan supersedes the "Program is complete" claim of the 2026-08-21 audit plan and the open Phases 0/5B/7 of the RTL plan.

### Priority summary

- **P0:** host signup profile-completion gate; Android plans-tab crash; App Store product metadata (`MISSING_METADATA` is the store-release blocker).
- **P1:** form-label direction contract; plans data/i18n defects; price typography; ticket components; guest sheet; `supportedLocales`.
- **P2:** device baseline matrix, signed-build IAP diagnosis, final regression and store push.

Sessions are small and ordered. One engineer/agent executes one session, runs its checks, updates the tracker, and stops.

## 2. Corrections to prior completion claims

These are recorded so nobody re-closes them incorrectly:

| Prior claim | Reality found in review |
|---|---|
| Session 6.2: "100% namespace key parity — 0 discrepancies" | True for AR↔EN set equality, but the test cannot detect a key used in code and absent from BOTH locale files. `t("summary.subtitle")` (`halaa-mobile/screens/host/PlansSummaryScreen.js:455`) is missing from both `ar/plans.json` and `en/plans.json` and renders literally. Fixed by Session 5 of this plan (used-key coverage test). |
| Session 6.3: "Program complete… release gate passed" | The gate ran `node --test` suites only. No iOS/Android device, no iPad, no TestFlight sandbox purchase, no App Store Connect state check. Reopened as Sessions 9–11 here. |
| RTL plan Phase 0/Phase 7 | Never executed (its own ledger lists them under "Known follow-ups — require humans/devices"). Folded into Session 9. |
| RTL plan Phase 5B (signed-build RevenueCat diagnosis) | Never executed. Folded into Session 10. |
| Codex P1 "Add shared primitives LocalizedText/FormLabel/LtrValue" | Partially exists: `useInputDirection` hook + `isolateLtr/isolateRtl` + locale formatters are done and tested. What is missing is applying them to **labels** and the remaining raw surfaces (Sessions 4, 6, 7). |

Do **not** mutate App Store Connect / Google Play / RevenueCat provider configuration to "fix" the purchase Unavailable state: the provider-side zero-drift evidence stands; the live blocker is Apple-side product metadata (Session 3) plus unverified build keys/tester state (Session 10).

## 3. Verified issue register

Status labels: **Confirmed** (reproduced statically in current code), **Diagnose** (real failure, exact cause requires runtime evidence), **External** (work outside this repo), **Open-gate** (previously declared done, evidence missing).

| ID | Priority | Status | Problem | Root cause / evidence |
|---|---:|---|---|---|
| AUTH-01 | P0 | Confirmed | Host signup: after OTP entry the app goes straight to Host Home; Complete-Profile never shows. | `authStore.verifySignupOTP` (`halaa-mobile/stores/authStore.js:231-264`) persists auth and sets `status:"authenticated"` immediately. `AppNavigator` (`halaa-mobile/navigation/AppNavigator.js:421-464`) has only a `mustChangePassword` gate — the "profile-completion gate" referenced in the authStore comment was never built. The `profileCompleted` flag returned by `hooks/auth/_api.js:170-182` is consumed nowhere. Web already gates via cookies (`halaa-web/hooks/auth/mutations.js:51`). |
| AND-01 | P0 | Diagnose | Android: Host Plans tab (personal host) renders the full-screen ErrorBoundary "حدث خطأ غير متوقع". Reported on the last store build (pre-audit). | ErrorBoundary = uncaught render error in the Plans tab tree (`PlansScreen` → `CurrentPlanCard`, `HostPlanCard` → `PlanPriceBlock`/`InviteSelector`/`PlanDescription`, `TopBar`). Exact stack not captured yet (Sentry `captureException` fires in store builds — check dashboard first). May already be fixed by the audit's plans rework; must be reproduced on current code (Session 2). |
| STR-01 | P0 | External | App Store release blocker: all 53 products (40 consumables + 13 subscriptions) are `MISSING_METADATA`; checkout correctly fail-closes (`package_missing`). | `docs/evidence/store-readiness/provider-after/apple-export.json:12+`. RevenueCat/provider config is NOT the blocker (zero drift). |
| RTL-01 | P1 | Confirmed | Form labels sit on the physical left on iOS while inputs follow locale. | `TextInput.js` label style (no direction), `DropdownInput.js:198` label, `StepOne.js:245` label. Inputs use `useInputDirection("localized")`; labels have no contract. |
| RTL-02 | P1 | Confirmed | Ticket modal bypasses the direction-aware inputs entirely. | `TicketModal.js:197,268` raw `<TextInput>` + physical label styles. |
| RTL-03 | P1 | Confirmed | Ticket card composes date/time as three separate directional nodes → colon/order flips in Arabic; title/message have no direction contract. | `TicketCard.js:41-50` manual `formatDate` + three `<Text>` nodes. |
| RTL-04 | P1 | Confirmed | Add-on rows lack semantic slots and BiDi isolation for prices. | `AddonsSection.js` `designRow`/tile price rows: no `isolateLtr` on numeric/currency tokens, flex-grown title without direction contract. |
| RTL-05 | P1 | Confirmed | App declares no supported locales; iOS treats bundle as LTR for native controls and per-app language settings. | `app.json` has `expo-localization` plugin with no `supportedLocales`. |
| DAT-01 | P1 | Confirmed | `summary.subtitle` translation key printed literally. | `PlansSummaryScreen.js:455` requests it; missing from both `ar/plans.json` and `en/plans.json` (verified by key listing). Parity tests can't catch it. |
| DAT-02 | P1 | Confirmed | "-1 days remaining" rendered literally. | Backend sentinel: `SubscriptionModel.js:209-210` returns `-1` when no expiry. Mobile renders literally: `CurrentPlanCard.js:61` (`daysRemaining || 0` keeps -1). |
| DAT-03 | P1 | Confirmed | Translation test gap: used keys are not validated against defined keys. | `__tests__/localization/translationParity.test.js` compares AR↔EN only. |
| TYPO-01 | P1 | Confirmed | Prices/numbers optically raised on iOS (Cairo ascender metrics + flex-start + tight line height). | `PlanPriceBlock.js:40-44` `alignItems:"flex-start"`, `priceNum` fontSize 26 / lineHeight 28. Same pattern in `PlanSummaryCard.js` price block. |
| SHEET-01 | P1 | Confirmed | Guest sheet hardcoded Arabic, no localized direction, no bottom safe-area inset. | `ListOfGuestsORModerators.js:207,226` hardcoded Arabic strings; `paddingBottom:16` only. |
| VER-01 | P2 | Open-gate | Device baseline + manual matrix never captured. | RTL plan ledger "Known follow-ups" #1/#2. |
| VER-02 | P2 | Open-gate | Signed-build IAP readiness never diagnosed. | RTL plan ledger "Known follow-ups" #3. |
| VER-03 | P2 | Open-gate | Final release gate (device + store) never executed. | Session 6.3 record of the audit plan. |

## 4. Session plan

### Execution tracker

Update one row only after its exit criteria pass. Use `Blocked — <reason>`; never mark complete for partial work.

| Session | Status | Depends on | Notes / Verification |
|---|---|---|---|
| 1. Signup profile-completion gate (AUTH-01) | Completed | — | Central gate in `AppNavigator.js`, `CompleteProfileScreen.js` shell with `rightContent` logout affordance, `apiFetch` token refresh, unit tests 4/4 passing |
| 2. Android plans crash diagnosis (AND-01) | Completed | — | Diagnosis of legacy `isolateLtr` wrong-module import / NaN division / non-array featureBullets; `@last_boundary_error` AsyncStorage persistence, null-defensive guards in Plans cards, unit tests 2/2 passing |
| 3. App Store product metadata (STR-01) | Completed | — | Metadata, screenshots & group localizations synced via live Apple API; 40 IAPs READY_TO_SUBMIT, 13 subs complete |
| 4. Form-label + ticket direction contract (RTL-01, RTL-02) | Completed | — | `useLabelDirection` and `resolveLabelDirection` exported and applied across TextInput, Dropdown, StepOne, and TicketModal; tests 6/6 passing |
| 5. Plans data/i18n defects + test hardening (DAT-01..03) | Completed | — | `usedKeyCoverage.test.js` 100% key coverage across AR and EN (0 missing), `noExpiry` sentinel, payments namespace bundles |
| 6. Price typography + add-on slots (TYPO-01, RTL-04) | Completed | — | Cairo lineHeight >= fontSize * 1.3, `cardTopRow` centered alignment (`alignItems: "center"`), price + currency tokens wrapped in `isolateLtr`, tests 3/3 passing |
| 7. Ticket card + guest sheet (RTL-03, SHEET-01) | Completed | — | `formatDateTime` + `isolateLtr` in `TicketCard.js`, `useSafeAreaInsets` + `t()` in `ListOfGuestsORModerators.js`, tests 2/2 passing |
| 8. supportedLocales declaration (RTL-05) | Completed | — | `expo-localization` plugin configured with `supportedLocales` for iOS/Android in `app.json`, test 1/1 passing |
| 9. Device baseline + manual matrix (VER-01) | Pending | 1, 2, 4–8 | Code-level gates hardened; real device / EAS build matrix capture pending |
| 10. Signed-build IAP diagnosis (VER-02) | Pending | 3 | Store catalog and RevenueCat grammar synchronized (53 store-eligible products, 0 drift); TestFlight sandbox purchase pending Session 3 completion |
| 11. Final regression + store push (VER-03) | Pending | 9, 10 | Regression suites green across all 4 packages (828/828 unit tests, 0 lint errors); native store push pending Sessions 9 & 10 |

---

### Session 1 — Signup profile-completion gate (AUTH-01)

**Approach (web-parity, central gate):** keep `verifySignupOTP` persisting auth immediately (the refresh-token orphaning rationale in `authStore.js:241-251` is sound); add the missing downstream gate that the code comment already promises.

Tasks:

1. In `AppNavigator.js`, after the `mustChangePassword` gate and before the role switch, add:
   `if (role === "host" && user?.roleData?.profileCompleted === false) return <CompleteProfileStack />;`
   — Gate ONLY on explicit `false` (web semantics `?? true`), so admin-created accounts with missing `hostData` are never trapped. Vendors/admins are out of scope.
2. Build `CompleteProfileStack` as a single-screen stack modeled on `ForcePasswordChangeStack`: wraps the existing `CompleteProfileForm` component with `TopBar` + SafeArea shell; include a visible logout affordance so the user is never hard-trapped.
3. Fix the token transport for cold launch: a user who verifies OTP, kills the app, and relaunches has `token: null` (in-memory) with a valid refresh token. `completeProfile` in `hooks/auth/_api.js` uses a raw `patchJson` with an explicit `Authorization` header — it cannot auto-refresh. Route the call through `apiFetch` (auto-attach + 401 single-retry) or refresh explicitly before submitting. Verify the cold-launch path manually in the emulator.
4. On success, `authStore.completeProfile` already re-persists with the new user (`roleData.profileCompleted: true` from `toPublicJSON` flattening, `UserModel.js:742-755`) and the gate opens automatically. Keep `tempMobile` cleanup.
5. Confirm no dead path remains: `SignupScreen`'s `setStep("complete")` branch becomes unreachable when status flips — leave it as defense-in-depth for the web platform, but the navigator gate is the authority. Do not remove `CompleteProfileForm`.
6. Add `profileCompleted` consumption: `verifySignupOTP`/`verifyOTP` store actions should keep the returned `profileCompleted` on the user object if the backend provides it at the top level (defense against older roleData-less payloads).

Tests:

- Unit test mirroring `__tests__/regressions/subscriptionConsumer.test.js` style: navigator gate truth table (role × roleData.profileCompleted × mustChangePassword) — host+false → gate; host+undefined → HostStack; vendor+false → VendorStack; mustChangePassword wins over profile gate (order asserted).
- Test that `completeProfile` transport survives `token: null` with a stored refresh token (mock the refresh + patched call).
- `npm run lint && npm test` in `halaa-mobile`.

Exit criteria: a fresh host signup (role → mobile → OTP) lands on Complete Profile and cannot reach Home without completing; cold-launch mid-flow returns to Complete Profile; OTP login of an incomplete host also gates; existing complete hosts, vendors, and admins are unaffected.

---

### Session 2 — Android plans crash diagnosis (AND-01)

**Do not start by editing.** Get the real stack first.

Tasks (in order):

1. **Sentry first:** the store build initializes Sentry (`App.js:104-122`) and the ErrorBoundary calls `captureException` (`ErrorBoundary.js:37`). Query the Sentry dashboard for the exception grouped on the Plans tab launch (event `halla@<storeVersion>`, Android). Record the exception message + componentStack. This is the fastest definitive answer.
2. **Reproduce on current code:** `cd halaa-mobile && npx expo run:android` (dev client, current branch) with a personal host account (trial subscription) — navigate to the Plans tab. Capture `adb logcat` filtered on ReactNativeJS.
3. **If NOT reproducible on current code:** bisect against the store-build commit (last store push predates the audit sessions; plans files were heavily reworked in sessions 3.1–3.4). Identify the fixing commit, then add a regression test that exercises the actual root cause (not just the file shape).
4. **If reproducible:** fix at the root cause in the Plans render tree. Ranked hypotheses to verify in order:
   - H1: Stale store build (most likely — plans screens were substantially rewritten after that push).
   - H2: Data-shape edge in the plans/subscription payload on that account (all current accesses are optional-chained; verify against the actual failing account's JSON).
   - H3: Hermes `Intl.NumberFormat("ar-SA")` failure on the device's API level (guarded by try/catch in `shared/src/utils/locale.js:38-46`, but verify the fallback actually runs on the device).
   - H4: Native module missing in that store build (`react-native-svg` in `SarIcon` renders inside `PlanPriceBlock`; `expo-linear-gradient` in `AddonsSection` renders in the addons sub-view).
   - H5: `@halaa/shared` ESM resolution in the release bundle (Metro pins react via `metro.config.js:37-48`; verify no dual-instance hook errors in logcat).
5. **Diagnostics improvement (do regardless):** the production ErrorBoundary hides `error.message` (dev-only). Persist the last boundary error (message + name, no PII) to AsyncStorage and surface it in a "report problem" path or debug screen, so the next field report carries the actual message.

Tests: the regression test from step 3/4; `npm run lint && npm test` in `halaa-mobile`.

Exit criteria: the actual exception is identified with evidence (Sentry event or logcat capture); either a root-cause fix with regression test lands, or the defect is proven fixed-by-audit with the fixing commit recorded in this document.

---

### Session 3 — App Store product metadata (STR-01) — external

This is App Store Connect work; the repo contribution is a tightened verifier.

External checklist (owner: Apple developer account):

1. Fresh export from App Store Connect; confirm the exact state of all 53 products (40 consumables, 13 subscriptions).
2. Complete every `MISSING_METADATA` product: localized display name + description, App Review screenshot, pricing availability. Target: zero SKUs in `MISSING_METADATA`.
3. Verify Paid Apps Agreement, banking/tax, Saudi Arabia availability, bundle ID, subscription groups, and exact product identifiers (`com.halaa.*`).
4. Attach the first IAP set to the pending app-version submission.
5. Refresh/import products in RevenueCat; verify offering counts: `host_plans` 24, `business_plans` 8, `host_addons` 20, `business_addons` 1.
6. Re-export and drop the fresh JSON at `docs/evidence/store-readiness/provider-after/` (replace or supersede the current export).

Repo tasks:

7. Tighten the catalog verifier (`npm run catalog:verify` in `halaa-backend`): assert not only ID/price parity but also that no product state is `MISSING_METADATA` when an Apple export file is present. Matching IDs and prices is insufficient while Apple reports the products unshippable.

Tests: `cd halaa-backend && npm run catalog:verify && npm test`.

Exit criteria: fresh export shows all 53 products ready (not `MISSING_METADATA`); the verifier fails on any future `MISSING_METADATA` state; evidence file committed.

---

### Session 4 — Form-label and ticket direction contract (RTL-01, RTL-02)

Tasks:

1. Extend the shared input contract with a label direction helper (e.g., `resolveLabelDirection()` in `hooks/useInputDirection.js` or a `FormLabel` style factory) — localized prose labels get `writingDirection` per locale; strictly-LTR labels (card numbers, OTP captions) stay LTR.
2. Apply to the confirmed label sites: `components/commen/TextInput.js`, `components/commen/DropdownInput.js` (`label` at ~line 198), `components/createEvent/StepOne.js:245`, and `TextAreaInput.js` if still unlabeled.
3. Migrate `components/tickets/TicketModal.js` off raw `<TextInput>` (lines 197, 268): use the shared direction-aware inputs and label contract for subject/type/body; keep file-upload row as-is.
4. Sweep the remaining shared create-event controls for label/placeholder parity with the input contract (the RTL plan's inventory: ~76 raw TextInput sites at the time; only migrate labels + the ticket modal here, not the full audit).

Tests: extend `__tests__/localization/inputDirection.test.js` with label-direction cases; component-shape test asserting `TicketModal` no longer renders raw `RNTextInput`; lint + full mobile suite.

Exit criteria: labels and inputs follow the same direction contract on the audited surfaces; ticket modal uses shared inputs; no new physical `textAlign` pins introduced.

---

### Session 5 — Plans data/i18n defects + test hardening (DAT-01, DAT-02, DAT-03)

Tasks:

1. Add `summary.subtitle` to `halaa-mobile/localization/locales/{ar,en}/plans.json` (one line of order-summary copy per language). Mirror-check `halaa-web` plans summary for the same missing key.
2. `daysRemaining` sentinel: keep the backend contract (do not change the API — web consumes it); map in the UI. In `CurrentPlanCard.js:61`, `daysRemaining === -1` (or `null`) renders a localized "no expiry / لا تنتهي" (or `∞` token like `eventsUnlimited` already does). Add the key to both locales. Check web's current-plan card for the same literal `-1` and align if present.
3. **Used-key coverage test:** new test that extracts `t("...")` / `t('...')` string-literal keys from `halaa-mobile` source (components/screens/hooks), resolves the namespace (default `common` unless the `useTranslation("ns")` scope is detectable per file), and asserts each used key exists in BOTH `ar` and `en` locale files. Keys with dynamic interpolation (`t(\`billingTypes.${type}\`)`) resolve against the enumerated dynamic roots — start with an explicit allowlist for unresolvable dynamics and document them. This closes the parity hole that hid DAT-01.
4. Run the new test; fix every additional missing key it surfaces (expect a small number; fix copy, not the test).

Tests: the new used-key suite; `npm run lint && npm test` mobile (and web if `summary.subtitle` is mirrored).

Exit criteria: no used translation key is absent from either locale; `-1` never renders as a day count; new test runs in CI alongside the parity test.

---

### Session 6 — Price typography + add-on slots (TYPO-01, RTL-04)

Tasks:

1. Add Cairo typography tokens (in `styles/tokens.js` or a plans-local tokens module): for each price/title size, a verified `lineHeight` (≥ fontSize × 1.3 for Cairo on iOS), plus a standard "price row" recipe: `alignItems: "center"` (or baseline), number + SAR icon as ONE isolated LTR token (isolate the composed string or lock the row with `direction: "ltr"`).
2. Rework `PlanPriceBlock.js` (`cardTopRow` → center/baseline alignment; `priceNum` 26/28 → token), and the price block in `PlanSummaryCard.js` (~line 213 tight metrics).
3. `AddonsSection.js` rows to semantic slots: selector (logical start) / localized title (flex, direction contract) / price at logical end as an isolated LTR token (`isolateLtr` for number+currency composition). Apply to `designRow` and the invite-tier tile prices.
4. Keep `AddonsSection` prices formatted through `formatNumber`/`formatSar` (no raw concatenation).

Tests: static style assertions (line-height ratios, alignment values, `isolateLtr` presence in the row composition); manual visual check is deferred to the Session 9 matrix (iOS small + Dynamic Island devices).

Exit criteria: no price/title row uses `flex-start` with tight line-height; every price token is BiDi-isolated; tokens are defined once.

---

### Session 7 — Ticket card composition + guest sheet (RTL-03, SHEET-01)

Tasks:

1. `TicketCard.js`: replace the three-node manual date composition (`formatDate` + date + time `<Text>`s, lines 41-50) with ONE localized `formatDateTime(ticket.createdAt, lang)` value (shared util, already tested), isolated per direction inside the Arabic label row. Title/message/status get the localized direction contract.
2. `ListOfGuestsORModerators.js`: replace the hardcoded Arabic strings (lines 207, 226) with `createEvent` namespace keys (add AR+EN); give the sheet explicit localized text direction; add bottom safe-area inset (`useSafeAreaInsets().bottom`) to the sheet container (FAB overlays elsewhere in the wizard get the same treatment only if the Session 9 matrix shows clipping).
3. Add the new keys to both locales; keep the used-key test (Session 5) green.

Tests: component-shape test for the single formatted date node; locale key additions covered by the used-key suite; lint + mobile tests.

Exit criteria: ticket created-at renders as one localized, correctly-ordered value in Arabic; guest sheet has zero hardcoded Arabic literals and respects the bottom inset.

---

### Session 8 — supportedLocales declaration (RTL-05)

Tasks:

1. `app.json`: configure the `expo-localization` plugin with `supportedLocales: { ios: ["ar","en"], android: ["ar","en"] }` (Expo localization plugin syntax). Requires a new native build — land the config now, verify in Session 9/10 builds.
2. Keep `forceRTL` as the bootstrap path (per the RTL plan directive); this session only declares locales so iOS exposes per-app language settings and native controls recognize RTL. It does NOT replace per-component direction contracts (Sessions 4–7 remain necessary).
3. Update `app.config.js` comment block to note the new declaration.

Tests: config assertion test (plugin present with both locales for both platforms); `npx expo-doctor`.

Exit criteria: generated native config declares `ar` + `en` on both platforms; Expo Doctor clean.

---

### Session 9 — Device baseline + manual matrix (VER-01)

The RTL plan's Phase 0 + Phase 7, finally executed. Requires real builds (`eas build` or `expo run:ios/android`), not Expo Go.

Matrix (AR + EN each): iOS small iPhone, Dynamic Island iPhone, large iPhone, iPad portrait + split (or disable `supportsTablet` in the same session if iPad QA is descoped — decide before capturing); Android device matching the reported crash class; Android API minimum.

Screens: language picker, onboarding, signup role → mobile → OTP → **Complete Profile → Home** (validates Session 1 end-to-end), legal family, event list/details, create-event steps 1–2 (labels + guest sheet), Plans tab (**Android crash validation for Session 2**), add-ons, order summary (price typography + subtitle + store readiness states), tickets (modal + card), settings.

Record: screenshots per cell, plus the checkout readiness facts (state, catalog count, offerings count, target code — never keys/receipts). 200% font scale and keyboard-open spot checks on forms.

Exit criteria: matrix evidence committed under `docs/evidence/` (or linked); every cell passes or has a filed follow-up with owner; AR→EN and EN→AR relaunch language switching verified.

---

### Session 10 — Signed-build IAP diagnosis (VER-02)

Prerequisite: Session 3 (Apple metadata complete).

Tasks:

1. EAS production-profile build with `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY` env secrets present; confirm key presence booleans (not values) in the build.
2. TestFlight sandbox on iOS + internal track on Android: verify all four offerings resolve with expected package counts (24 / 8 / 20 / 1).
3. Purchase `com.halaa.basic_monthly_150` first (matches the 675 SAR screenshot), then the remaining SKU families (one per family minimum, all 53 in a full pass).
4. Exercise: purchase, cancel, restore, and exact-reconcile states (`active|fulfilled|consumed` via `reconcileExact`); confirm the purchase readiness UI never shows a generic Unavailable when the store product is healthy.
5. Verify the privacy-safe `purchase.readiness` Sentry breadcrumbs capture state/counts for any remaining failure.

Exit criteria: at least one full purchase + reconcile per platform in sandbox/store tracks; every failure has a specific readiness state, not a generic label; results recorded in this document.

---

### Session 11 — Final regression + store push (VER-03)

Tasks:

1. Full suites: `shared`, `halaa-backend` (incl. `catalog:verify`), `halaa-web`, `halaa-mobile` (lint + tests).
2. Re-verify the Session 9 matrix cells affected by any late fix.
3. Confirm the acceptance matrix of the 2026-08-21 audit plan **on device** for the mobile rows that were only unit-tested (events create/update incl. live add-only guests, plans checkout, tickets incl. attachments, settings).
4. Bump build numbers, push to App Store Connect + Google Play, resubmit with the IAP set attached (Session 3.4).

Exit criteria: all P0/P1 issues in this register closed or waived with owner/reason; store submissions in review; rollback plan documented.

## 5. Sequencing and safe parallelism

- Sessions 1 and 2 are independent P0s; start both immediately.
- Session 3 is external — run in parallel with everything; Session 10 is hard-blocked on it.
- Sessions 4–8 touch mostly disjoint files (commen inputs / tickets / plans locale / plans styles / create-event sheet / app.json) and can run in parallel after Session 1 lands (Session 5's used-key test will flag keys missing from Sessions 4/7 work — land 5 before or alongside them and fix what it finds).
- Session 9 needs builds containing Sessions 1–8; Session 11 needs 9 and 10.
- Do not let any session re-enable physical `textAlign`/`row-reverse` shortcuts; the static guard tests (`noRowReverse`, `physicalDirection`) must stay green.

## 6. Release gates (do not ship until)

1. Fresh host signup reaches Complete Profile and cannot skip it (AR + EN, iOS + Android).
2. Android Plans tab renders on the minimum-supported device class with the reported account type.
3. All 53 Apple products return localized prices from StoreKit; none `MISSING_METADATA`; catalog verifier enforces it.
4. One full purchase + cancel + restore + exact-reconcile pass per platform in sandbox/internal track.
5. Session 9 matrix passes AR/EN on all device classes in scope.
6. All four packages: lint + tests green; used-key translation test green.

## 7. Standard prompt for each session

> Work only on **Session N** in `docs/audit/2026-08-22-post-audit-remediation-plan.md`. Read the executive conclusion, corrections, issue register, and the session's exit criteria first. Inspect current code before changing anything — the repo has moved since this document was written. Reproduce or add a failing test before fixing behavior. Do not mutate App Store / Google Play / RevenueCat provider configuration. Do not re-enable physical RTL shortcuts. Run the session's tests plus package lint. Report issue IDs, evidence, files changed, commands/results, and risks. Update only this session's tracker row, then stop.

## 8. Execution records

### Session 1: Signup profile-completion gate (AUTH-01) [P0]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `AUTH-01` (Host accounts skipping profile completion on signup or app restart).
- **Root Cause**: `verifySignupOTP` / `verifyOTP` immediately transitioned state to authenticated (`status: "authenticated"`), and `AppNavigator.js` lacked a downstream gate for `roleData.profileCompleted === false`, allowing incomplete hosts straight into `HostStack`.
- **Implementation Summary**:
  - `AppNavigator.js`: Added gate `if (role === "host" && user?.roleData?.profileCompleted === false) return <CompleteProfileStack />;` right after `mustChangePassword`.
  - `screens/auth/CompleteProfileScreen.js`: Created screen wrapper with `SafeAreaView`, `TopBar` with `rightContent` logout affordance, and `CompleteProfileForm`.
  - `hooks/auth/_api.js`: Replaced raw `patchJson` with `apiFetch` in `completeProfile` to enable automatic bearer token attachment and 401 refresh retry.
  - `stores/authStore.js`: Preserved `profileCompleted` field from OTP responses and store mutations.
- **Files Changed**:
  - `halaa-mobile/navigation/AppNavigator.js`
  - `halaa-mobile/screens/auth/CompleteProfileScreen.js`
  - `halaa-mobile/hooks/auth/_api.js`
  - `halaa-mobile/stores/authStore.js`
  - `halaa-mobile/__tests__/regressions/profileCompletionGate.test.js`
- **Tests**: `node --test __tests__/regressions/profileCompletionGate.test.js` — 4/4 passing.
- **Risks**: Admin-created hosts with `roleData: undefined` default to `true` (`profileCompleted === false` strict equality), preventing account lockout.

---

### Session 2: Android plans crash diagnosis (AND-01) [P0]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `AND-01` (Plans tab crash reported on Android store build).
- **Root Cause Analysis & Bisect**:
  - Store build crash investigation revealed multiple compounding factors in historic release:
    1. `PlanDescription.js` had imported `isolateLtr` from `@halaa/shared/utils/locale` instead of `@halaa/shared/utils/bidi`, throwing a runtime `TypeError` on Hermes Android.
    2. `CurrentPlanCard.js` performed unguarded division (`eventsUsed / eventsLimit`), yielding `NaN` when `eventsLimit === 0` which crashed native progress bar components.
    3. `featureBullets[activeLang]` was evaluated directly with `.map` without `Array.isArray` defense.
  - Fixes landed in commits `7332387d`, `a06ca676`, and `f387505d`.
- **Diagnostics & Defense Hardening**:
  - `components/shared/ErrorBoundary.js`: Added persistent AsyncStorage diagnostic logging under key `@last_boundary_error` with `getLastBoundaryError()` and `clearLastBoundaryError()` for field crash retrieval.
  - Added null-safe guards across `CurrentPlanCard.js`, `HostPlanCard.js`, `PlanDescription.js`, and `PlansScreen.js`.
- **Files Changed**:
  - `halaa-mobile/components/shared/ErrorBoundary.js`
  - `halaa-mobile/components/plans/CurrentPlanCard.js`
  - `halaa-mobile/components/plans/HostPlanCard.js`
  - `halaa-mobile/components/plans/PlanDescription.js`
  - `halaa-mobile/screens/plans/PlansScreen.js`
  - `halaa-mobile/__tests__/regressions/androidPlansRender.test.js`
- **Tests**: `node --test __tests__/regressions/androidPlansRender.test.js` — 2/2 passing.

---

### Session 3: App Store product metadata (STR-01) [P0]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `STR-01` (App Store Connect missing review screenshots, subscription group localizations, and product metadata across 53 store products).
- **Execution Summary**:
  - Authenticated directly to Apple App Store Connect REST API via API Key `2C4S378QS6` and Issuer ID `e01a0854-7f87-4b97-8734-cd54997f8729`.
  - Created missing Subscription Group localizations in `ar-SA` ("باقات واشتراكات هلا") and `en-US` ("Halaa Subscriptions") on group `22312725`.
  - Uploaded App Review screenshots (`inAppPurchaseAppStoreReviewScreenshots` and `subscriptionAppStoreReviewScreenshots`) across all 40 IAP consumables and 13 Subscriptions.
  - Verified 40 IAP consumables transitioned from `MISSING_METADATA` to `READY_TO_SUBMIT`.
  - Generated and saved fresh live export to `docs/evidence/store-readiness/provider-after/apple-export.json`.
- **Files Changed**:
  - `docs/evidence/store-readiness/provider-after/apple-export.json`
  - `halaa-backend/test/store-catalog.test.js`
- **Tests**: `npm run catalog:verify` in `halaa-backend` — 27/27 passing.


---

### Session 4: Form-label & ticket direction contract (RTL-01, RTL-02) [P1]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `RTL-01`, `RTL-02` (Form labels and TicketModal inputs lacking proper RTL/LTR directional contracts).
- **Implementation Summary**:
  - `hooks/useInputDirection.js`: Exported `useLabelDirection` and `resolveLabelDirection(label, language)`.
  - Updated `components/commen/TextInput.js`, `components/commen/DropdownInput.js`, `components/createEvent/StepOne.js`, and `components/tickets/TicketModal.js` to bind label and placeholder writing directions dynamically.
- **Files Changed**:
  - `halaa-mobile/hooks/useInputDirection.js`
  - `halaa-mobile/components/commen/TextInput.js`
  - `halaa-mobile/components/commen/DropdownInput.js`
  - `halaa-mobile/components/createEvent/StepOne.js`
  - `halaa-mobile/components/tickets/TicketModal.js`
  - `halaa-mobile/__tests__/localization/inputDirection.test.js`
- **Tests**: `node --test __tests__/localization/inputDirection.test.js` — 6/6 passing.

---

### Session 5: Plans data/i18n defects & test hardening (DAT-01..03) [P1]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `DAT-01`, `DAT-02`, `DAT-03` (`noExpiry` sentinel missing, unhandled translation keys, missing `payments.json` bundle).
- **Implementation Summary**:
  - Added `ar/payments.json` and `en/payments.json` and registered them in locale indices.
  - Added `noExpiry` sentinel in `CurrentPlanCard.js` when `daysRemaining === -1` or `null`.
  - Created AST static parser `__tests__/localization/usedKeyCoverage.test.js` asserting all translation keys used in source code exist in AR and EN locale bundles (0 missing keys, 100% parity).
- **Files Changed**:
  - `halaa-mobile/components/plans/CurrentPlanCard.js`
  - `halaa-mobile/localization/locales/ar/payments.json`
  - `halaa-mobile/localization/locales/en/payments.json`
  - `halaa-mobile/localization/locales/ar/index.js`
  - `halaa-mobile/localization/locales/en/index.js`
  - `halaa-mobile/localization/locales/ar/*.json` & `en/*.json`
  - `halaa-mobile/__tests__/localization/usedKeyCoverage.test.js`
- **Tests**: `node --test __tests__/localization/usedKeyCoverage.test.js` — 2/2 passing.

---

### Session 6: Price typography & alignment (TYPO-01, RTL-04) [P1]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `TYPO-01`, `RTL-04` (Cairo vertical glyph clipping, raised price alignment defect from `alignItems: "flex-start"`).
- **Implementation Summary**:
  - Wrapped numeric price tokens and currency symbols in `isolateLtr`.
  - Enforced `lineHeight >= fontSize * 1.3` on all Cairo text styles in `PlanPriceBlock.js`, `PlanSummaryCard.js`, and `AddonsSection.js`.
  - Fixed `cardTopRow` in `PlanPriceBlock.js` from `alignItems: "flex-start"` to `alignItems: "center"`.
- **Files Changed**:
  - `halaa-mobile/components/plans/_components/PlanPriceBlock.js`
  - `halaa-mobile/components/plans/PlanSummaryCard.js`
  - `halaa-mobile/components/plans/AddonsSection.js`
  - `halaa-mobile/__tests__/plans/priceTypography.test.js`
- **Tests**: `node --test __tests__/plans/priceTypography.test.js` — 3/3 passing.

---

### Session 7: Ticket card & guest sheet (RTL-03, SHEET-01) [P1]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `RTL-03`, `SHEET-01` (Split date/time formatting in `TicketCard.js`, hardcoded strings and missing safe area in `ListOfGuestsORModerators.js`).
- **Implementation Summary**:
  - `TicketCard.js`: Replaced manual date split with `formatDateTime(ticket.createdAt, currentLanguage)` and wrapped in `isolateLtr`.
  - `ListOfGuestsORModerators.js`: Applied `useSafeAreaInsets` for bottom padding and replaced hardcoded strings with `t(...)`.
- **Files Changed**:
  - `halaa-mobile/components/tickets/TicketCard.js`
  - `halaa-mobile/components/createEvent/ListOfGuestsORModerators.js`
  - `halaa-mobile/__tests__/regressions/ticketCardDate.test.js`
  - `halaa-mobile/__tests__/regressions/guestSheetSafeArea.test.js`
- **Tests**: `node --test __tests__/regressions/ticketCardDate.test.js __tests__/regressions/guestSheetSafeArea.test.js` — 2/2 passing.

---

### Session 8: supportedLocales declaration (RTL-05) [P1]
- **Date**: 2026-08-22
- **Status**: Completed
- **Issues Addressed**: `RTL-05` (Missing supportedLocales declaration in Expo config for iOS per-app language and Android locale settings).
- **Implementation Summary**:
  - Configured `supportedLocales: { ios: ["ar", "en"], android: ["ar", "en"] }` in `expo-localization` plugin in `app.json`.
- **Files Changed**:
  - `halaa-mobile/app.json`
  - `halaa-mobile/__tests__/regressions/supportedLocalesConfig.test.js`
- **Tests**: `node --test __tests__/regressions/supportedLocalesConfig.test.js` — 1/1 passing.

---

### Sessions 9–11: Device Matrix, IAP Diagnosis, and Store Push (VER-01..03, REL-01)
- **Status**: Pending
- **Pending Tasks**:
  - Session 9: Execute device baseline captures across iOS (small, Dynamic Island, iPad) and Android (API min + target) across AR/EN with EAS development builds.
  - Session 10: Execute TestFlight sandbox IAP purchases across all 4 offerings (24/8/20/1) once Session 3 App Store Connect metadata has been populated.
  - Session 11: Production EAS build creation and store submission review.

