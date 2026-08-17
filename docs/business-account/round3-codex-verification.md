# Round 3 — Codex Verification (load-bearing code claims)

**Date:** 2026-06-20 · **Method:** read actual source, cite file:line. Read-only verification.
**Scope:** the 12 load-bearing claims + the #14 segregation-site feasibility + the `getEventTargets` inversion re-check.
**Backend** = `D:\halla\labbe-backend-`, web = `D:\halla\labbe`, mobile = `D:\halla\halla-mobile`, shared = `D:\halla\shared`.

---

## Verdict table

| # | Claim (Codex) | Verdict | Evidence (file:line) | Implication |
|---|---------------|---------|----------------------|-------------|
| 1 | Setup fee = 1200 for `business_event` tiers, 0 for `business_quarterly`/`business_annual` | **CONFIRMED** | `planDefaults.js:215` (factory `setupFeeAmount:1200`); `:294` quarterly `0`; `:310` annual `0` | The 1,200 fee is event-only by data; time-based business plans carry no setup fee. |
| 2 | Paid payment whose activation fails → refund; refunds on a single total (no line items) | **PARTIAL** | Activation-fail = full single-total refund `checkout.service.js:589-601` (`recordPendingRefund` on `paymentRecord.amount`). BUT addon failures = **per-line** refunds `:450-461` (`recordPendingRefund` with `addonType`/`scope`/per-line `amount`) | "No line items" is wrong: **line-item pending refunds already exist as a pattern** — so a granular setup-fee refund has precedent (relevant to plan decision #4's "non-refundable" sub-rule). |
| 3 | Discount applies to `plan + addons` subtotal | **CONFIRMED** | `subtotal = planPrice + addonsTotal` `:77`; `discountsService.validate(code, subtotal, ...)` `:86-90`; `total = Math.max(0, subtotal - discountAmount)` `:98`. `setupFeeAmount` is **never read** in checkout. | The plan's own formula `subtotal = planPrice + setupFee + addons` (plan lines 24, 52) would cause the **setup fee to be discounted** (discount hits the whole subtotal). That contradicts the plan's "setup fee not discountable" rule — fee must be added *after* discount, or excluded from the discount base. |
| 4 | `toPublicJSON` maps `profile.hostData`→`roleData` then deletes whole `profile`; `profile.businessData` would NOT serialize | **CONFIRMED** | `UserModel.js:749` method; `:768-782` role→subdoc map (`HOST→hostData`); `:783` `delete obj.profile` | A `profile.businessData` field is invisible to the public DTO. Business description must be surfaced another way (own top-level field, or extend the role map / DTO). |
| 5a | `avatar` is an S3 key, signed (~1h) on read | **CONFIRMED** | `UserModel.js:744` comment ("1-hour pre-signed URL"); `:763` `obj.avatar = await signStoredImage(obj.avatar)` | Avatar URLs are ephemeral; an event snapshot must store the **key**, not a signed URL. |
| 5b | Replacing the avatar DELETES the previous S3 object | **CONFIRMED** | `users.service.js:86-88` (`safeDeleteOldKey(user.avatar)` → `:36-47` `deleteFromS3(oldKey)`) before assigning new key | Validates the immutable event-logo-snapshot design — but the snapshot must **copy the S3 object** (new key), not just reference the user's key, or the object is deleted when the business changes its logo. |
| 6 | `accountType` does not already exist (net-new) | **CONFIRMED** | Repo-wide grep (`D:\halla`, excl. node_modules): `accountType` appears ONLY in `docs/business-account/*.md`. Zero in backend/web/mobile/shared source. | `accountType` is genuinely net-new; no collision risk for B2. |
| 7 | Cron/scheduled send bypasses the subscription check | **CONFIRMED** | `scheduledTasks.js:171` `runEventLaunch` → `:300` `messagingService.sendBulk` with NO subscription check. HTTP guard `requireSubscription` (`subscription.js:24`, `findActiveForUser :50`) is on routes only. | Real gap is narrow given #8: a sub **active at schedule time that lapses before the cron fires** still sends. Snapshot send-eligibility on the event or re-check in the cron path. |
| 8 | Event CREATE is subscription-gated (not just sending) | **CONFIRMED** | `events.routes.js:243-246` `POST "/"` mounts `requireSubscription` + `checkEventLimit` | A no-subscription business cannot create an event/draft. The cron exposure (#7) is therefore lapse-after-create, not no-sub. |
| 9 | Send paths populate only `name username` (not `accountType`) | **CONFIRMED** | `messaging.send.service.js:34, :142` `.populate('host','name username')`; `events.resend.service.js:122, :272-274` `.populate("host","name username")` | `owner.accountType` is not available at send time. Snapshot delivery-mode/logo on the **event**, don't read `owner.accountType` at send. |
| 10 | Backend validation is its own CommonJS zod module, not the shared ESM zod | **CONFIRMED** | `users.validation.js:1` `require("zod")` (CommonJS), defines own schemas (`:22 updateProfileSchema`). Repo grep: backend imports **zero** `@halla/shared`/`shared/src/schemas` | Backend admin/business validation must be added to the backend's own CJS modules; the shared ESM schemas are not consumed server-side (duplication is the existing pattern). |
| 11 | Identity uniqueness + `findOrCreateHost` would mis-filter business → dup-key | **PARTIAL** | `mobile` unique+sparse `UserModel.js:255-256`; `email` unique sparse index `:425-428`; `phoneNumber` only sparse `:268`. `findOrCreateHost` filters `{ phoneNumber, role:HOST }` `admin.hosts.service.js:443` (NO accountType today). `createHost` runs its OWN `$or` dup check across ALL users `:171-176` → throws `ConflictError('Email…')` `:178-184` BEFORE `User.create` | Direction is right but precision matters: adding `accountType:'personal'` to the find filter would miss an existing business, then `createHost` throws a **service-level `ConflictError`**, not (usually) a raw Mongo duplicate-key. Still blocks find-or-create. Filter find-or-create on identity, not accountType. |
| 12 | Canonical URL inconsistency `halaa.sa` vs `halaa.com.sa` | **CONFIRMED** | Backend fallback = `halaa.sa` (no `.com`): `scheduledTasks.js:897,1038,1060`; `guests.service.js:130`; `messaging.send.service.js:51,159`; `messaging.reminder.service.js:85,179`; `events.resend.service.js:156`; `post-event.dispatch.service.js:38`; also `api.halaa.sa` `swagger.js:26,50,54`, `noreply@halaa.sa` `config/index.js:54`, `auth.js:240`. Mobile = `halaa.com.sa`: `App.js:142`, `config/api.js:18-19`, `ResetPasswordScreen.js:6`. Deploy/live domain = `halaa.com.sa`. | **No single shared config value.** Backend RSVP/reminder/invite links fall back to `halaa.sa` (wrong host) while the real site + mobile deep-link prefix are `halaa.com.sa`. Masked only if `FRONTEND_URL` env is set in prod. Business invite links inherit this fallback risk — fix the fallback or require the env. |
| 14 | Host-segregation helper feasible (~18 sites in `admin.hosts.service.js` + `dashboard.service.js`) | **CONFIRMED (feasible)** | `admin.hosts.service.js`: 12 `role:ROLES.HOST` query sites. `dashboard.service.js:120-123, :140`: 5 host-scoped count/find sites. ≈ 17–18 enumerable sites. | A segregation filter (add `accountType` to these queries) is feasible exactly where the plan claims. |
| — | `getEventTargets` "must ADD business" (Codex) | **REFUTED / inverted** | `admin.events.service.js:185` queries `{ role: ROLES.HOST, ... }` `:186-188`. Under the `accountType` pivot, business (`role:host`) is **automatically INCLUDED**. | The plan's own correction (lines 14) is right: the work is **label/segregate** (badge), not "add them." Matches the prior round's inversion finding. |

---

## Per-business-plan `setupFeeAmount` (claim #1)

| Plan code | setupFeeAmount | source |
|-----------|----------------|--------|
| `business_event` 25 / 50 / 75 / 100 / 150 / 200 (all 6 tiers) | **1200** | `businessEventPlan()` factory `planDefaults.js:215` |
| `business_quarterly` | **0** | `planDefaults.js:294` |
| `business_annual` | **0** | `planDefaults.js:310` |

(For reference: all host/basic/premium plans, trial, unlimited = `setupFeeAmount: 0`.) → The 1,200 setup fee is **event-tier only** by the data model.

---

## Checkout refund + discount formulas (claims #2, #3)

```
// checkout.service.js
addonsTotal = Σ resolvedAddons.price                         // :76
subtotal    = planPrice + addonsTotal                         // :77   (no setupFee)
discount validated against `subtotal`                         // :86-90
total       = Math.max(0, subtotal - discountAmount)          // :98
```

**Refunds:**
- Subscription activation fails *after* a paid charge → **full single-total** `recordPendingRefund(amount = paymentRecord.amount, reason:'checkout_subscribe_create_failed')` (`:589-601`), plus a user-facing "money taken, contact support" message.
- Each **addon** create/quota failure → **per-line** `recordPendingRefund(amount = item.price, addonType, scope, reason:'checkout_addon_create_failed')` (`:450-461`); subscription stays.

→ Granular (line-item) pending refunds already exist. Adding `setupFee` to `subtotal` *before* discount would wrongly discount the fee.

---

## `toPublicJSON` DTO shape (claim #4)

For a **host**, `toPublicJSON()` returns: all top-level user fields minus sensitive ones (`password`, reset/setup tokens, email-verification fields, `__v`) + **signed `avatar`** + **`roleData`** (= `profile.hostData`, via the role→subdoc map) + `permissions` + optional `whitelabelId`. The **entire `profile` is deleted** (`:783`). A `profile.businessData` subdoc is **not serialized** — only the role-mapped subdoc survives.

---

## Avatar / S3 snapshot facts (claim #5)

- `User.avatar` stores an **S3 key**; serialized via `signStoredImage` → ~1h pre-signed URL (`UserModel.js:744, :763`).
- On profile update with a new avatar, `safeDeleteOldKey(user.avatar)` → `deleteFromS3(oldKey)` runs **before** assigning the new key (`users.service.js:86-88`, `:36-47`).
- **Design consequence:** an event logo snapshot must (a) store a **separate copied S3 object** (not the user's live key — it gets deleted on logo change) and (b) store the **key**, not a signed URL (URLs expire). The "immutable snapshot" goal requires an object copy at event-create time.

---

## Overstated / wrong Codex points

- **#2 ("no line items")** — overstated. Activation-failure refund is single-total, but addon refunds are per-line; the line-item refund pattern exists.
- **#11 ("duplicate-key error")** — imprecise. The collision surfaces as a service-level `ConflictError` from `createHost`'s own `$or` dup check (`admin.hosts.service.js:171-184`) before `User.create`, not (typically) a raw Mongo E11000. Risk direction is correct; the mechanism is the find-or-create filter, and the fix is to filter find-or-create on identity, not on `accountType`.
- **`getEventTargets` (#14-adjacent)** — **inverted**, as in the prior round. The host query already captures business under the pivot; the work is labeling, not adding.

## Out-of-scope observation (not a verdict; flagged separately)

`checkout.service.js:511`/`:515` reference `user.email` / `user.name` inside `_fulfillBundle`, but that method (`:389`) destructures only `{ userId, plan, planCode, discountCode, paymentRecord, addons, totals }` — there is **no `user` binding in scope** (the `user` at `:44` is local to `checkout()`). This is a `ReferenceError` on the success path of any checkout that reaches the payment-confirmation-email block. Spawned as a separate task; excluded from the business-account verdicts.
