# Halaa store-readiness — IMPLEMENTATION STATUS (code stream)

> **Independent review correction (2026-06-28):** this document records what was
> implemented, but several completion claims failed code-level review and none of
> the native-billing flow has sandbox evidence. Do **not** use its checkmarks as a
> release decision. Read `docs/store-readiness-REVIEW-FINDINGS.md` and execute
> `docs/store-readiness-CLAUDE-MASTER-PLAN.md`; the current release verdict is
> **NO-GO** until their acceptance gates pass.

**Companion to** `docs/store-readiness-SHIP-plan.md` (source of truth) and
`docs/store-readiness-EXTERNAL-STEPS.md` (your parallel, non-code work).

Locked decisions: **D1 = Path B** (native subscriptions), **D3 = iPad
supported**, **D8 = max parity** (sell all host + business-self-serve + add-ons
via IAP; discounts via store offer codes; Moyasar stays web-only).

Legend: ✅ code complete · 🟦 code in progress · ⬜ not started · 🔶 needs
throwaway-DB/device verification · 🔴 EXTERNAL (see EXTERNAL-STEPS)

---

## §3.2 Backend fail-closed hardening — ✅
- ✅ Global NAT-safe backstop limiter on all `/api/v2` + route limiters on
  deletion, event-create, uploads, addon/payment checkout (`rateLimiter.js`,
  `app.js`, route files).
- ✅ WhatsApp webhook **fail-closed in production** (`messaging.webhook.controller.js`).
- ✅ `/health/ready` readiness probe + boot config gate (warn; fail-closed under
  `STRICT_CONFIG`) (`readiness.js`, `app.js`, `server.js`).
- ✅ nodemailer → 9.x (GHSA-p6gq-j5cr-w38f fixed); prod audit clean.
- ✅ `.gitignore` now covers secret files (untrack + history purge are 🔴).
- Swagger gated to dev + sanitized prod errors + secure cookies: pre-existing, verified.
- 🔴 Deploy prereqs: set `WHATSAPP_APP_SECRET`, `RATE_LIMIT_ENABLED=true`,
  `STRICT_CONFIG=true` after rotation (EXTERNAL §2).

## §5.1 Password reset + deep links — ✅ 🔶
- ✅ Canonical `/<lang>/change-password?token=` across all 5 places: backend
  email, mobile RN linking, AASA, Android intent filters, web route; plus a
  `/reset-password`→`/change-password` redirect for in-flight emails.
- ✅ AASA/assetlinks loudly error in production on placeholder IDs.
- 🔴 Set `APPLE_APP_ID` + `ANDROID_CERT_FINGERPRINT` (EXTERNAL §2b).
- 🔶 Verify on clean iOS/Android installs + AASA/assetlinks validators.

## §5.2 Reviewer access — ✅
- ✅ Demo-OTP bypass hard-disabled in production (`otp.service.js`).
- ✅ `scripts/seedReviewerAccounts.js` (env-driven, no default passwords,
  non-privileged host+vendor, host entitlement, AR/EN data).
- 🔴 Run the seed + enter creds/steps in App Store Connect / Play (EXTERNAL §5).

## §4.1/4.2 Account deletion — ✅ 🔶
- ✅ Idempotent workflow: `AccountDeletionRequest` (requestId + status + steps);
  reauth (password or OTP); session invalidation (refresh revoke + protect
  DELETED check); comprehensive PII/S3 cleanup (user + nested profile, guest
  names/phones/RSVP, post-event media/comments + S3, vendor services + S3,
  tickets, notifications); configurable retention matrix + disclosure;
  append-only audit event.
- ✅ Reauth + Path B store-subscription warning + deep link in mobile
  `DeleteAccountSection.js`; pre-deletion-info + OTP endpoints.
- 🔶 Run deletion fixtures on a **throwaway DB** (NOT shared Atlas) to prove no
  non-retained PII remains + old tokens 401 + duplicate-safe.
- 🔴 Legal to finalize the retention field list/durations (D5).

## §4.3 Public /delete-account page — ✅ 🔶
- ✅ `app/[lang]/delete-account/page.js`: sign-in → reauth → request + live
  status; AR/EN; reuses the same backend service.
- 🔴 Publish as the canonical Google Data Safety URL; set real support email.
- 🔶 Verify the page submits + completes on staging.

## §6 UGC moderation — ✅ (post-event surfaces) 🔶
- ✅ Versioned Terms/Community Rules: `TermsAcceptance` model + `policies.js` +
  user/guest acceptance + enforcement on guest comments + host media upload.
- ✅ Server-side text filter (`contentFilter.js`) on comments + vendor copy.
- ✅ `Report` + `Block` models + `/moderation` (user) + `/moderation/admin`
  (staff queue: list/get/action hide·remove·warn·suspend·approve·dismiss) +
  guest `/post-event/:id/report|block|policies` + host approve/reject pending.
- ✅ Block read-path filtering on guest comments.
- ✅ Upload hardening: extension validation on all filters, size limits, http(s)
  link validation, malware-scan hook (`scanUploadHook`). Full magic-byte/
  malware scan + S3 quarantine = infra → EXTERNAL §6.
- ✅ Report/Block UI on post-event comments (web `CommentList` + mobile
  `PostInteractions`) + accept-on-action so the terms gate doesn't break flows.
- 🟦 Remaining UI (spawned follow-up): report/block on vendor profiles +
  post-event media (backend already supports them).
- 🔴 Moderation owner + SLA + public contact + live AR/EN policy pages.

## §7.2 Minimize permissions — ✅
- ✅ Dropped `ACCESS_FINE_LOCATION` (blocked); blocked `READ_MEDIA_IMAGES/VIDEO`
  (forces system photo picker); MapPicker uses coarse accuracy. `supportsTablet`
  stays true (iPad). Camera/mic/write-contacts already blocked.

## §7.3 Push + telemetry — ✅ 🔶
- ✅ Logout unregisters the device push token for the account (mobile authStore +
  backend `removeToken` / `PATCH /auth/remove-push-token`).
- ✅ Sentry release + environment + dist + PII scrub (`beforeSend`) + sampling.
- Existing: cold-start tap queue + invalid-token pruning on send.
- 🔴 dSYM/source-map upload needs `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`
  EAS secrets (EXTERNAL). 🔶 Verify symbolicated forced crash with no PII.

## §8.1 EAS config — ✅ (code) 🔴
- ✅ Pinned production `ios.image: latest` (newest Xcode/iOS SDK) + Sentry env.
- 🔴 Verify the build log shows Xcode 26+/iOS 26 SDK; fill submit Apple
  identifiers; set EAS secrets (Sentry, Maps, RevenueCat, Play service account);
  point dev/preview at a staging API if one exists (EXTERNAL §4).

---

## §9.1 Path B billing identity — ✅
- ✅ `User.billingUserId` (UUID) + `scripts/backfill-billing-user-id.js`; exposed
  via `toPublicJSON`. Mobile `services/purchases.js` rewritten: configure-then-
  `logIn` on switch, never `logOut`, `canPurchase()` gates purchase/restore;
  `initPurchases(billingUserId)` + `onSignedOut()` on logout. Webhook resolves
  `app_user_id` by `billingUserId` (legacy `_id` fallback) → real `_id`.

## §9.2 Path B webhook + reconciliation — ✅ 🔶
- ✅ `RevenueCatEventModel` (unique `eventId` dedupe + dead-letter). Webhook
  rewritten: auth → validate envelope (env/app_id) → durable insert (dup→2xx) →
  idempotent process → 2xx; transient→500. `revenuecat.api.js` (subscriber
  snapshot) for canonical reconciliation. Provider-neutral Payment ledger
  (provider/txn/store/currency/expiry/rcEventId + unique txn index). Correct
  event-behavior table (CANCELLATION/BILLING_ISSUE/PAUSED do NOT revoke;
  EXPIRATION revokes on inactive; UNCANCELLATION no new pool; REFUND/REVERSED).
  Subscription store fields + `metadata.rcEventId` unique index. Webhook resolves
  `billingUserId`. Dead-letter for unknown user/product + TRANSFER/TEMPORARY.

## §9.4 Consumable event entitlements — ✅ (layer) 🟦
- ✅ `EventEntitlementModel` (no force-cancel, no auto-expiry, `hasUnused` guard),
  webhook grants consumables as entitlements (idempotent on store txn id), ledger
  rows. Full catalog→SKU matrix: `docs/store-readiness-SKU-matrix.md`.
- 🟦 Remaining (spawned follow-up, needs sandbox): wire EventEntitlement into the
  event-access/send-allowance path (so a consumable buyer can create+send) +
  consume-on-first-send + paywall 2nd-purchase guard.

## §9.3 Client paywall — ✅ (core) 🟦
- ✅ Post-purchase **reconcile-then-success** (no optimistic nav) via
  `GET /payments/revenuecat/reconcile`; `canPurchase()` gating; restore→reconcile;
  discount box already web-only.
- 🟦 Remaining (follow-up): render store `priceString` in the card (not backend
  SAR), Manage/Cancel deep link, native add-on purchase flow.

**Full plan + add-on IAP wiring (host + business) — ✅ 🔶**
- ✅ Plans: every host (basic/premium × event/monthly, all tiers) AND business
  (event/quarterly/annual) plan is surfaced in the mobile plan screens and
  purchased via IAP — `findPackageForPlan` matches the RC package by `plan.code`.
- ✅ Add-ons via IAP: backend `addonsService.grantAddonFromStore` (reuses
  `applyQuota`, idempotent on store txn) + webhook `parseAddonMap`/`parseAddonCode`
  branch; mobile `findPackageForAddon` + native purchase of each selected add-on
  after the plan+reconcile. Host add-ons (extra invites, design templates) AND
  business add-ons (business customization, extra invites) are surfaced
  (`AddonsSection` with `showBusiness`, wired into BusinessPlansScreen).
- SKU matrix lists all add-on codes + `REVENUECAT_ADDON_PRODUCT_MAP`.
- 🔶 Requires the store products + `REVENUECAT_PRODUCT_PLAN_MAP` /
  `REVENUECAT_ADDON_PRODUCT_MAP` configured (EXTERNAL §3); RC package identifier
  must equal the plan/add-on code.

**Follow-ups now COMPLETE (were 🟦):**
- ✅ Report/Block UI on vendor profiles (web `ReportVendorButton` + mobile
  `VendorPublicProfileScreen`) and post-event media (web `PostMediaGallery` +
  mobile `PostInteractions`).
- ✅ §9.4 consume-on-first-send wired (`messaging.send.service.js` flips the
  linked `EventEntitlement` to `consumed` on the first send); consumable access
  rides the existing per-event subscription (C2-safe — never cancels a pool sub).
- ✅ §9.3 paywall renders the store `priceString` (not backend SAR) + a
  Manage/Cancel store deep link.

## Review pass — 4 parallel agents (backend, frontend, Path B, completeness)
Audit verdict: "genuinely substantive, not checkbox theater." All
critical/high/medium findings fixed:
- **Web crash** — barrel `hooks/postEvent/index.js` now exports the report/block
  hooks (CommentList would have thrown).
- **Path B C1** — retried webhook events reprocess if the prior attempt was
  non-terminal (no more silent drop on transient failure).
- **Path B C2** — store event purchase never cancels an active pool/recurring
  subscription; **H1** — renewal populates the plan so the pool actually refills;
  **M1/M2** — ledger trace link + RC webhook body-limit; PRODUCT_CHANGE reconciles
  from the canonical snapshot (no early deferred-downgrade).
- **Moderation** — hide/remove resolves content by sub-doc `_id` (no silent no-op
  when a report lacks `contextEventId`); `warn` uses a valid notification type;
  service `remove` uses the valid `disabled` enum.
- **Deletion** — event PII (title/location/branding) + `businessData` scrubbed;
  reauth requires the password for password accounts.
- **Content filter** — word-boundary match (no "grape"→"rape" false positives).

## Remaining for Path B = the §9.5 sandbox matrix
Implemented code is interdependent + **only testable after** the RevenueCat +
App Store + Play products/sandbox exist (EXTERNAL §3). See PATHB-design.md +
SKU-matrix.md. 🔶 Nothing in §9 has run against real store events yet.

_Acceptance = verification evidence, not "code written." Items marked 🔶 still
need a real run/device/build before the SHIP-plan checkbox is earned._
