# Phase 6 — Remaining Ledger Closure — Plan (REVISED)

**Branch:** `claude/implement-phase-6-KL2nQ` (designated session branch).
**Cut from:** `master` post-Phase-5 merge.
**Goal:** Close every remaining active finding in `IMPLEMENTATION_LEDGER.md` after ledger reconciliation, plus production hand-offs from Phases 4c/4d/5.

**Scope boundary:** This phase targets the ~24 active findings remaining after Track 0 reconciliation (see `PHASE_6_REMAINING_REPORT.md` §5). Mobile vendor profile screens (`FLOW-25-F02`) and WhatsApp RSVP plus-ones (`FLOW-19-F01`) are flagged as **deferred to Phase 6b** because they require UI design or Peter's product decision.

---

## 1. State of the world before this phase

**Branch:** `claude/implement-phase-5-xP9mK` has merged to `master`.
**Ledger status:** 39 IDs listed `Open`. Of those, ~15 are already implemented but not moved out of `Open` (discrepancies documented in `PHASE_6_REMAINING_REPORT.md` §4).

### Key utilities available (verified in code):

- **Payment scaffold:** `src/infrastructure/paymentProvider/index.js` (factory), `moyasar.js` (real), `stub.js` (stub). Factory chooses by `MOYASAR_API_KEY` presence. `charge(params)` wraps with `withIdempotency` when key provided. SAR major-unit contract enforced. `refund()` is stub-only.
- **Idempotency:** `src/shared/middleware/idempotency.js` — middleware with upsert race safety, polling (200ms interval, 10s timeout), response caching. Already wired to `POST /subscribe`, `POST /addons/purchase`, `POST /events/:id/retry-launch`, `POST /events/:eventId/staff/:staffId/revoke`, `POST /events/:id/step2`.
- **Audit log:** `logAudit()` utility in `src/shared/utils/auditLog.js` + `AuditLogModel`. Already wired in auth (login_locked, login_failed, login, password_reset, password_changed), events (created, updated, deleted, details_updated, launch_manual_retry), subscriptions (pending_refund, auto_cancelled), vendors (status_updated), notifications (broadcast).
- **`runBatched`:** `src/shared/utils/runBatched.js` — concurrency 5, rate 10/sec, adaptive 429 backoff. Already used in `scheduleGuestReminders`, `scheduleNotificationDelivery`, `sendBulkAccessMessages`.
- **`timezone`:** `src/shared/utils/timezone.js` — `nowUtc()`, `parseEventTime()`, `isDue()`, `formatRiyadh()`. Asia/Riyadh = UTC+3, no DST. Already used in `scheduleEventLaunch` (timezone-aware via `parseEventTime` + `isDue`).
- **S3 upload:** `src/shared/utils/s3Upload.js` — `processUploadedFiles()`, `getFileUrl()`, `uploadToS3()`, multer instances (`uploadVendorFiles`, `uploadUserProfile`, etc.). Fail-closed in production. Already used in `signupVendor` (auth.service.js:541), profile image update (users.service.js:708), whitelabel logo (auth.service.js:595).
- **`@halla/shared-schemas`:** workspace package for Zod validation — adopted on event atomic endpoint in Phase 4d.

### CRITICAL DISCREPANCIES FOUND (plan assumptions vs actual code):

1. **FLOW-03-F01, FLOW-03-F02, FLOW-03-F03/FLOW-24-F03 are ALREADY CLOSED in code.** `signupVendor` in `auth.service.js` lines 503-545 already:
   - Validates `serviceCategories` keys against `ALLOWED_CATEGORY_KEYS` set (FLOW-03-F01 ✅)
   - URL-validates `socialLinks` fields with regex (FLOW-03-F02 ✅)
   - Uses `processUploadedFiles(files)` for S3 upload, NOT local disk paths (FLOW-03-F03/FLOW-24-F03 ✅)

2. **FLOW-24-F05 is ALREADY CLOSED.** `admin.service.js` lines 654-661 already writes `logAudit({ action: 'vendor.status_updated', ... })` on every vendor status transition.

3. **FLOW-26-F01 and FLOW-26-F02 are ALREADY CLOSED.** `services.service.js` lines 26-30 already filters to `VENDOR_STATUS.APPROVED` + `profileCompleted: true`. Line 49 already populates `profile.vendorData.rating` in the vendor populate fields.

4. **FLOW-12-F01 sort order is ALREADY CORRECT.** `SubscriptionModel.findActiveForUser` already sorts `createdAt: -1, _id: -1` (newest first). The plan's assumption that it sorts oldest-first is outdated — this was likely fixed in a prior phase but the ledger wasn't updated.

5. **FLOW-14-F02 timezone is ALREADY FIXED.** `scheduleEventLaunch` in `scheduledTasks.js` already uses `parseEventTime()` + `isDue()` from the timezone utility. The plan's assumption that it uses `now.getHours()` is outdated.

6. **FLOW-14-F03 (sendBulk concurrency) is ALREADY FIXED.** `sendBulk` already uses `runBatched()` with concurrency 5, rate 10/sec.

7. **FLOW-14-F05 (legacy Taqnyat path) is ALREADY REMOVED.** The `taqnyatDeleteId` branch was removed in Phase 3a/4c cleanup.

8. **FLOW-01-F04 (login lockout) is ALREADY ENFORCED.** `auth.service.js` lines 270-294 already:
   - Checks `user.isLocked()` before password verification
   - Calls `user.incLoginAttempts()` on failed password
   - Resets `loginAttempts` and `lockUntil` on successful login
   - Logs `auth.login_locked` audit event
   - Throws `AccountLockedError` (which maps to 423)

9. **FLOW-09-F02 (trial expiry) needs clarification.** The audit flow 09 Q3 says: "The trial plan is **not time-limited**. It is a permanent per-event plan assigned to hosts on signup with a max of 15 invites per event and no `endDate`. Hosts can use it indefinitely." The plan's assumption that trial gets `expiresAt = createdAt + 14d` contradicts this decided policy. **This finding should be CLOSED as "by design" not implemented.**

10. **FLOW-13-F03 (Taqnyat cancel) is NOT APPLICABLE.** The Taqnyat native scheduling path (`taqnyatDeleteId`) has been removed. `updateLaunchSettings` no longer needs to cancel Taqnyat jobs because the platform now owns the send lifecycle entirely via `runBatched`. **This finding should be CLOSED as "resolved by prior removal of Taqnyat native path."**

11. **FLOW-20-F02 (staff SMS failure visibility) — needs verification.** `messagingStatus` already has `failedCount` field. The plan says to add `staffFailedCount` but this field may not exist in the schema. Need to verify `EventModel.messagingStatus` schema before implementation.

### Updated discrepancy list (add to Track 0):

| ID | Evidence | Recommended Ledger Action |
|----|----------|---------------------------|
| **FLOW-03-F01** | `signupVendor` validates categories at auth.service.js:503-514 | Close as `closed in PHASE_5` |
| **FLOW-03-F02** | `signupVendor` validates socialLinks URLs at auth.service.js:517-525 | Close as `closed in PHASE_5` |
| **FLOW-03-F03** | `signupVendor` uses `processUploadedFiles` at auth.service.js:541 | Close as `closed in PHASE_5` |
| **FLOW-12-F01** | `findActiveForUser` already sorts `createdAt: -1` in SubscriptionModel | Close as `closed in PHASE_5` (or earlier) |
| **FLOW-14-F02** | `scheduleEventLaunch` already uses `parseEventTime` + `isDue` | Close as `closed in PHASE_1b` |
| **FLOW-14-F03** | `sendBulk` already uses `runBatched` | Close as `closed in PHASE_3b` |
| **FLOW-14-F05** | Legacy Taqnyat path removed in Phase 3a/4c | Close as `closed in PHASE_3a` |
| **FLOW-24-F03** | `signupVendor` uses `processUploadedFiles` at auth.service.js:541 | Close as `closed in PHASE_5` |
| **FLOW-24-F05** | `updateVendorStatus` writes audit at admin.service.js:654-661 | Close as `closed in PHASE_5` |
| **FLOW-26-F01** | `getPublicServices` populates rating at services.service.js:49 | Close as `closed in PHASE_5` |
| **FLOW-26-F02** | `getPublicServices` filters approved vendors at services.service.js:26-30 | Close as `closed in PHASE_5` |
| **FLOW-13-F03** | Taqnyat native path removed; platform owns send lifecycle | Close as `resolved by design change` |
| **FLOW-09-F02** | Trial plan is permanent per-event plan (flow 09 Q3 decision) | Close as `by design — not a bug` |
| **FLOW-01-F04** | Login lockout enforced at auth.service.js:270-294 | Close as `closed in PHASE_1a` |

**Total discrepancies to close: 15 (original) + 14 (new) = 29**

**True active-work count after reconciliation: ~10 findings (not 24)**

---

## 2. Decided policies

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ledger reconciliation first | Track 0 closes 29 discrepancies before any code changes | Prevents double-work; true scope is ~10 findings, not 24 |
| Payment provider | Reuse Phase 2 Moyasar factory (`paymentProvider.charge`) | Already wired to `subscribe()`; same pattern for addons |
| Plan update guard (`FLOW-08-F02`) | Reject limit reduction if `activeSubscribers > newLimit`; return 422 + count | Protects existing subscribers from sudden cap drops |
| Addon scope mapping (`FLOW-10-F02`) | `pool` → `subscription.invitePool += qty`; `event` → `event.guestLimit += qty`; `org` → `subscription.invitePool` | Same mapping as Phase 2; now fully wired through purchase pipeline |
| Pool rollback (`FLOW-11-F04`) | Compensating `releaseInvites` in `events.service.createEvent` if `Event.save()` fails after debit | Mirror of Phase 3a `releaseInvites` pattern; already pattern exists in codebase |
| Edit lock (`FLOW-13-F01`) | Hard block (422) not warn; lock triggers at `scheduledTime - 24h` | Consistent with other hard-gates in the codebase |
| Trial expiry (`FLOW-09-F02`) | **CLOSED as by-design** — trial plan is permanent per-event plan (flow 09 Q3) | Peter confirmed trial has no expiry; no implementation needed |
| Taqnyat cancel (`FLOW-13-F03`) | **CLOSED as resolved** — native path removed in prior phase | Platform owns send lifecycle via `runBatched`; no Taqnyat jobs to cancel |

---

## 3. Findings → tasks mapping

### Track 0 — Ledger Reconciliation (main session, first)

| # | Task | Action |
|---|------|--------|
| 0.1 | Close 15 original discrepancies | Move IDs from `Open` to `Closed in Phase 5` with commit SHAs (see `PHASE_6_REMAINING_REPORT.md` §4). |
| 0.2 | Close 14 newly discovered discrepancies | Close IDs listed in §1 "Updated discrepancy list" above with evidence references. |
| 0.3 | Re-count Open list | True active count becomes ~10 findings + 2 cross-flow. |

### Track A — Plan CRUD + Guards (Sub-agent A)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| A.1 | FLOW-08-F01 | `plans.routes.js`, `plans.controller.js`, `plans.service.js` | **VERIFY FIRST:** `createPlan` and `deletePlanByCode` already exist in `plans.service.js`. `POST /admin` and `DELETE /admin/:code` routes already exist in `plans.routes.js`. If confirmed present, CLOSE this finding. If routes exist but are incomplete, fix gaps. |
| A.2 | FLOW-08-F02 | `plans.service.js` | **VERIFY FIRST:** `_guardLimitReductions` already exists in `plans.service.js`. If it already blocks destructive reductions with subscriber count check, CLOSE this finding. If guard is incomplete, enhance it. |
| A.3 | FLOW-08-F03 | `plans.routes.js`, `plans.controller.js` | `PATCH /admin/:code` route already has `auditLog` middleware wired. Controller already stashes `res.locals.planAudit` with before/after snapshots. **VERIFY if audit middleware fires correctly.** If yes, CLOSE. If not, fix middleware wiring. |

### Track B — Subscription Payment Pipeline (Sub-agent B)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| B.1 | FLOW-09-F01 | `subscriptions.service.js` | **VERIFY FIRST:** `subscribe()` already calls `paymentProvider.charge()` with SAR major units, derived idempotency key, trial guard, and pending-refund on failure. If confirmed, CLOSE this finding. The Phase 2 implementation already covers this. |
| B.2 | FLOW-09-F02 | — | **CLOSED as by-design** — trial plan is permanent per-event plan (flow 09 Q3 decision). No implementation needed. |
| B.3 | FLOW-09-F04 | `subscriptions.routes.js`, `subscriptions.controller.js`, `subscriptions.service.js` | **VERIFY FIRST:** `POST /admin/assign` route already exists in `subscriptions.routes.js` with `protect` + `restrictTo(SUPER_ADMIN)` + `idempotency` + `auditLog`. Controller has `adminAssignSubscription`. Service has `assignSubscription`. If confirmed complete, CLOSE this finding. |

### Track C — Addon Purchase Pipeline (Sub-agent C)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| C.1 | FLOW-10-F01 | `addons.service.js`, `addons.controller.js`, `addons.routes.js` | **VERIFY FIRST:** `purchaseAddon` already calls `paymentProvider.charge()` with SAR major units, derived idempotency key, scope resolution, quota application via `_applyQuota`, and pending-refund on failure. If confirmed, CLOSE this finding. |
| C.2 | FLOW-10-F02 | `addons.service.js` | **VERIFY FIRST:** `_resolveScope` and `_applyQuota` already exist and branch on scope field. Pool/org → `$inc: {invitePool}`, event → `$set: {guestLimit}`. If confirmed, CLOSE this finding. |
| C.3 | FLOW-10-F03 | `addons.routes.js` | **VERIFY FIRST:** `POST /purchase` route already has `idempotency({scope: 'addons.purchase'})` middleware wired. If confirmed, CLOSE this finding. |

### Track D — Event Pipeline Race Fixes (Sub-agent D)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| D.1 | FLOW-11-F04 | `events.service.js` | **VERIFY FIRST:** `createEvent` already calls `Subscription.consumeInvites()` and has compensating `releaseInvites()` in catch block. If confirmed with M-22 double-failure handling (audit + admin notification when release also fails), CLOSE this finding. If compensation is missing, add it. |
| D.2 | FLOW-12-F03 | `events.service.js` | Same as D.1 — same code path. Verify and close if already fixed. |
| D.3 | FLOW-13-F01 | `events.service.js`, `events.routes.js` | **ACTIVE WORK REQUIRED:** Add 24h edit lock. In `updateEventDetails`, `updateGuestList`, `updateInvitationSettings`, `updateLaunchSettings`: if `event.status === 'scheduled'` and `launchSettings.scheduledDate` is within 24h of `nowUtc()`, reject changes to date/time/location with 422 `EVENT_EDIT_LOCKED`. Allow cosmetic edits (title, notes). Use `timezone.isDue` for timezone-safe comparison. |
| D.4 | FLOW-13-F03 | — | **CLOSED as resolved** — Taqnyat native path removed. No cancel needed. |
| D.5 | FLOW-14-F02 | — | **CLOSED** — already uses `parseEventTime` + `isDue`. |
| D.6 | FLOW-14-F03 | — | **CLOSED** — already uses `runBatched`. |

### Track E — Vendor & Marketplace (Sub-agent E)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| E.1 | FLOW-03-F01 | — | **CLOSED** — already validated in `signupVendor`. |
| E.2 | FLOW-03-F02 | — | **CLOSED** — already URL-validated in `signupVendor`. |
| E.3 | FLOW-03-F03 / FLOW-24-F03 | — | **CLOSED** — already uses `processUploadedFiles`. |
| E.4 | FLOW-24-F05 | — | **CLOSED** — already writes audit on status transition. |
| E.5 | FLOW-26-F01 | — | **CLOSED** — rating already populated. |
| E.6 | FLOW-26-F02 | — | **CLOSED** — approved vendor filter already applied. |
| E.7 | FLOW-26-F03 | `labbe/` marketplace components | **ACTIVE WORK REQUIRED:** Verify `onCallClick` handler is wired in web vendor detail popup. Read existing `WhatsAppContactButton` component first. If handler is missing, wire it to open `tel:` or WhatsApp URL. |
| E.8 | FLOW-26-F04 | `halla-mobile/` marketplace screen | **VERIFY FIRST:** Check if `useInfiniteQuery` + `AdminFlatList` infinite scroll is applied to vendor list. Phase 4 already applied this pattern to hosts/vendors/events/tickets/whitelabels/payments. If already present, CLOSE. If missing, apply Phase 4 pattern. |

### Track F — Auth, RBAC & Tenant (Sub-agent F)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| F.1 | FLOW-01-F04 | — | **CLOSED** — login lockout already enforced at auth.service.js:270-294. |
| F.2 | FLOW-04-F01 | `auth.service.js`, `users.service.js` | **VERIFY FIRST:** Whitelabel ADMIN/MODERATOR creation paths already require `whitelabelId`. Phase 0 closed TENANT-F01/RBAC-F02 which required this. If confirmed, CLOSE. If any path bypasses, add the guard. |
| F.3 | FLOW-04-F03 | `whitelabels.service.js`, `plans.service.js` | **ACTIVE WORK REQUIRED:** Enforce `maxHosts` limit when whitelabel admin creates host. First verify if `PlanModel.limitsSchema.maxHosts` exists. If absent, add the field with `default: null` (no limit). When creating a host under a whitelabel, count existing hosts for that whitelabel and compare against `maxHosts`. Return 422 `HOST_LIMIT_EXCEEDED` if exceeded. |
| F.4 | RBAC-F03 | `auth.js` middleware, `StaffAccessToken` model | **ACTIVE WORK REQUIRED:** Staff portal token revocation already exists (`POST /events/:eventId/staff/:staffId/revoke` from Phase 3e). Verify it uses the same revocation store as refresh tokens OR document why a separate store is acceptable. If separate, ensure there's a unified revocation endpoint or at minimum consistent audit logging. |
| F.5 | RBAC-F04 | `events.service.js` | **VERIFY FIRST:** `createEvent` already sets `createdBy.onBehalfOf` and `createdFor` fields. Check if admin callers can set `onBehalfOf: true` via request body. If hardcoded false still, add logic: when SUPER_ADMIN/ADMIN calls with `onBehalfOf: true` in body, set `createdBy.onBehalfOf = true`, `createdBy.adminId = req.user._id`, `createdFor.user = targetUserId`. Gate behind role check. |

### Track G — Event Lifecycle Edges (Sub-agent G)

| # | Finding | File(s) | Note |
|---|---------|---------|------|
| G.1 | FLOW-19-F01 | — | **DEFERRED to Phase 6b** — requires Peter's decision on max plus-ones and quota debit. |
| G.2 | FLOW-20-F02 | `messaging.service.js`, `events.service.js`, web/mobile host dashboard | **ACTIVE WORK REQUIRED:** Verify `EventModel.messagingStatus` schema has `staffFailedCount` field. If absent, add it. In staff check-in/SMS send failure paths, increment `staffFailedCount`. Add `staffFailedCount` to event detail response (`_formatEvent`). Render in web/mobile host dashboard as a warning badge if > 0. |
| G.3 | FLOW-28-F02 | `src/shared/utils/excelExport.js`, all export service methods | **ACTIVE WORK REQUIRED:** Add `EXPORT_MAX_ROWS` env var (default 10,000). At the start of each export service method, count matching documents before fetching. If count exceeds limit, throw 422 with message instructing admin to narrow filters. This is Phase 1 fix per audit flow 28 Q4. |

### Track H — Infrastructure & Production Hand-offs (main session, last)

| # | Task | Owner | Note |
|---|------|-------|------|
| H.1 | `scripts/check-schema-drift.sh` CI integration | DevOps/CI | Add to GitHub Actions or equivalent. |
| H.2 | MongoDB topology verification | SRE | Confirm production is a replica set (required for atomic `step2` transactions). |
| H.3 | Run `migrate-event-shape.js --apply` | DBA | Phase 4c migration: canonical event sub-objects. |
| H.4 | Run `seedInitialTemplates.js` | DBA | After admin sign-off on template catalog. |
| H.5 | Run `backfill-guest-access-token-expiry.js` | DBA | Phase 3de backfill (if not already run). |

---

## 4. Sub-agent owned-files map

| Track | Owned files (write-allowed) | Read-only consumed |
|-------|----------------------------|--------------------|
| 0 | `docs/implementation/IMPLEMENTATION_LEDGER.md` | `PHASE_5_REPORT.md`, `PHASE_5_PROGRESS.md`, `PHASE_6_REMAINING_REPORT.md` |
| A | `src/modules/plans/{service,routes,controller}.js` | `models/PlanModel.js`, `models/SubscriptionModel.js`, `src/shared/middleware/auditLog.js` |
| B | `src/modules/subscriptions/{service,routes,controller}.js` | `src/infrastructure/paymentProvider/*`, `src/shared/middleware/{idempotency,auditLog}.js` |
| C | `src/modules/addons/{service,routes,controller}.js` | Same shared utilities; `models/SubscriptionModel.js`, `models/EventModel.js` |
| D | `src/modules/events/{service,controller,routes}.js` | `src/shared/utils/{timezone,runBatched}.js`, `models/EventModel.js` |
| E | `labbe/` marketplace components, `halla-mobile/` marketplace screens | `src/shared/utils/s3Upload.js` |
| F | `src/modules/auth/{service,controller,routes}.js`, `src/modules/users/{service,controller,routes}.js`, `src/modules/whitelabels/{service,controller,routes}.js`, `src/shared/middleware/auth.js` | `models/UserModel.js`, `models/StaffAccessTokenModel.js`, `src/shared/middleware/auditLog.js` |
| G | `src/modules/events/events.service.js`, `src/modules/messaging/messaging.service.js`, `src/shared/utils/excelExport.js` | `models/EventModel.js`, `models/GuestModel.js` |
| H | `scripts/*`, CI config | `docs/implementation/PHASE_4C_REPORT.md`, `PHASE_4D_REPORT.md` |

**Zero-overlap verification:**
- Tracks A, B, C touch subscription/addon/plan module trees — no writable overlap.
- Track D touches events module only — distinct from A/B/C/E/F/G.
- Track E touches frontend only (web + mobile) — no backend overlap.
- Track F touches auth + users + whitelabels — distinct from all others.
- Track G touches events service (for staffFailedCount), messaging service, and excelExport utility — no write overlap with D (D touches events routes/controller, G touches events service for a different field).
- **NOTE:** Track D and Track G both touch `events.service.js` — D for edit lock, G for staffFailedCount. These are independent code sections but should be coordinated to avoid merge conflicts.

---

## 5. Sequential implementation order

1. **Track 0** (main session) — ledger reconciliation commit. Must land first so the true scope is known. **This will close 29 findings, reducing active work from ~24 to ~10.**
2. **Tracks A + B + C + F** dispatch in parallel — all are primarily verification tasks after Track 0. Most findings in these tracks are likely already closed in code.
3. **Track D** dispatches after Track 0 — only FLOW-13-F01 requires active work (24h edit lock).
4. **Track E** dispatches after Track 0 — only FLOW-26-F03/F04 may require work (frontend verification).
5. **Track G** dispatches after Track D — FLOW-20-F02 and FLOW-28-F02 require active work.
6. **Track H** runs last — production hand-offs require all code to be merged and signed off.

---

## 6. Smoke tests

`docs/implementation/phase-6-smoke-tests/` will hold:

- `ledger-reconciliation.spec.js` — verify all 29 discrepancy IDs no longer appear in `Open`.
- `plans-crud.spec.js` — create, update, delete (soft), list (if FLOW-08-F01 required work).
- `plans-update-guard.spec.js` — reject limit reduction with active subscribers (if FLOW-08-F02 required work).
- `plans-audit.spec.js` — `plan.updated` audit row exists (if FLOW-08-F03 required work).
- `subscribe-payment.spec.js` — paid plan charges via Moyasar stub; trial skips charge (if FLOW-09-F01 required work).
- `addon-purchase-pipeline.spec.js` — charge → activate → quota update (if FLOW-10-F01 required work).
- `addon-idempotency.spec.js` — duplicate POST returns cached response (if FLOW-10-F03 required work).
- `event-edit-lock.spec.js` — 422 within 24h of launch; success outside window.
- `vendor-onboard-validation.spec.js` — category enum + socialLinks URL validation + S3 upload (if any required work).
- `marketplace-filter.spec.js` — suspended vendors excluded, rating populated (if any required work).
- `export-row-cap.spec.js` — 10,001 rows triggers 422.
- `staff-failure-visibility.spec.js` — `staffFailedCount` appears in event detail response when > 0.

---

## 7. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Findings already closed but ledger says open** | Very High | Low | Track 0 verification pass closes all 29 discrepancies before any code changes. |
| **Payment provider charge fails silently** | Medium | Critical | Already implemented with error logging + pending-refund pattern. Verify in Track B. |
| **Plan limit reduction affects live events** | Low | High | `_guardLimitReductions` already exists. Verify in Track A. |
| **Pool rollback under-compensates** | Low | High | `releaseInvites` pattern already exists. Verify in Track D. |
| **Edit lock blocks legitimate updates** | Medium | Medium | 24h lock only applies to `scheduled` events; cosmetic edits (title, notes) allowed. |
| **FLOW-04-F03 schema change breaks existing plans** | Low | Medium | Add `maxHosts` to `limitsSchema` with `default: null` (no limit); existing docs unaffected. |
| **Track D and G both touch events.service.js** | Medium | Low | Coordinate sub-agents; D edits update methods, G adds field to formatEvent — different sections. |

---

## 8. Deferred to Phase 6b

| Finding | Reason |
|---------|--------|
| **FLOW-19-F01** (RSVP plus-ones) | Requires Peter's decision on max plus-ones and quota debit (audit §Items Requiring Peter's Decision #5). |
| **FLOW-25-F02** (mobile vendor profile screens) | UI design not ready; large feature scope. |
| **FLOW-02-F03** (host profile completeness gate) | Product decision: which fields constitute "complete"? |

---

## 9. Stop gate

To be filled in `PHASE_6_REPORT.md` at end:

```
STOP — Phase 6 complete

Branch: claude/implement-phase-6-KL2nQ
Commits: <list of [PHASE-6-*] SHAs in order>

Track 0 (Ledger reconciliation):
- <commit> — close 29 discrepancy IDs (15 original + 14 newly discovered)

Track A (Plan CRUD):
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-08-F01: plan create/delete endpoints
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-08-F02: plan update guard
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-08-F03: plan audit log

Track B (Subscriptions):
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-09-F01: Moyasar charge on subscribe
- <commit or "CLOSED BY DESIGN"> — FLOW-09-F02: trial expiry (permanent per-event plan)
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-09-F04: admin assign endpoint

Track C (Addons):
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-10-F01: purchase pipeline
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-10-F02: scope quota mapping
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-10-F03: idempotency middleware

Track D (Event pipeline):
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-11-F04 / FLOW-12-F03: pool rollback
- <commit> — FLOW-13-F01: 24h edit lock
- <commit or "CLOSED BY DESIGN"> — FLOW-13-F03: Taqnyat cancel (native path removed)
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-14-F02: timezone fix
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-14-F03: runBatched verification

Track E (Vendor marketplace):
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-03-F01: category enum validation
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-03-F02: socialLinks URL validation
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-03-F03 / FLOW-24-F03: vendor files to S3
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-24-F05: vendor audit verification
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-26-F01: rating populate
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-26-F02: approval filter
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-26-F03: onCallClick wired
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-26-F04: mobile infinite scroll

Track F (Auth / RBAC):
- <commit or "CLOSED IN PRIOR PHASE"> — FLOW-01-F04: login lockout enforced
- <commit or "VERIFIED ALREADY CLOSED"> — FLOW-04-F01: whitelabelId required on admin create
- <commit> — FLOW-04-F03: maxHosts plan limit enforced
- <commit> — RBAC-F03: staff token unified revocation
- <commit or "VERIFIED ALREADY CLOSED"> — RBAC-F04: onBehalfOf from req.user

Track G (Edges):
- <commit> — FLOW-20-F02: staff failure visibility
- <commit> — FLOW-28-F02: export row cap

Track H (Infrastructure):
- <commit> — CI schema-drift check
- <commit> — MongoDB topology verified
- <commit> — Production migrations run

Smoke tests:
- Phase 6 static-checks: <pass>/<total>
- Phase 1–5 regression: <pass/fail summary>

Findings closed (full): <list>
Findings deferred to 6b: FLOW-19-F01, FLOW-25-F02, FLOW-02-F03

IMPLEMENTATION_LEDGER.md updated: yes/no
PHASE_6_REPORT.md written: yes/no

Ready for merge: yes/no
Reason if no: <track or test that blocked>
```

---

## 10. Hand-offs to post-launch / Phase 6b

- **FLOW-19-F01**: RSVP plus-ones — awaiting product decision.
- **FLOW-25-F02**: Mobile vendor profile management — UI design cycle.
- **CloudFront + ClamAV**: Template image infrastructure — ops queue.
- **Adoption of `react-rnd` drag-resize**: Template editor v4.1 enhancement.
- **BullMQ + Redis export queue**: Phase 2 of export scaling (audit flow 28 Q4) — requires Redis provisioning.

---

## 11. Summary of changes from original plan

### Major corrections:
1. **14 additional findings discovered as already closed** — code verification revealed FLOW-03-F01, FLOW-03-F02, FLOW-03-F03, FLOW-24-F03, FLOW-24-F05, FLOW-26-F01, FLOW-26-F02, FLOW-12-F01, FLOW-14-F02, FLOW-14-F03, FLOW-14-F05, FLOW-13-F03, FLOW-09-F02, FLOW-01-F04 are all already implemented or resolved by design.
2. **True active work reduced from ~24 to ~10 findings** — the plan's scope was significantly overestimated.
3. **FLOW-09-F02 closed as by-design** — audit flow 09 Q3 explicitly decided trial plan is permanent with no expiry.
4. **FLOW-13-F03 closed as resolved** — Taqnyat native scheduling path was removed in prior phase; no cancel logic needed.
5. **Track E reduced to frontend verification only** — all backend vendor findings (E.1-E.6) are already closed.
6. **Track F reduced significantly** — FLOW-01-F04 already enforced; only FLOW-04-F03 and RBAC-F03 require active work.

### Additions:
1. **§1 "CRITICAL DISCREPANCIES FOUND"** — new section documenting 14 findings that are already closed in code but still listed as Open in the ledger.
2. **Updated discrepancy table** — added 14 new IDs to Track 0 reconciliation.
3. **Track D/G overlap warning** — noted that both tracks touch `events.service.js` and need coordination.
4. **Verification-first approach** — all tracks now start with "VERIFY FIRST" instructions before assuming work is needed.
5. **Smoke tests updated** — all specs now conditional on whether verification found gaps.

### Removals:
1. **Removed B.2 (FLOW-09-F02 implementation)** — closed as by-design.
2. **Removed D.4 (FLOW-13-F03 implementation)** — closed as resolved by Taqnyat path removal.
3. **Removed D.5, D.6 (FLOW-14-F02, FLOW-14-F03)** — already fixed in prior phases.
4. **Removed E.1-E.6 (vendor backend findings)** — all already closed.
5. **Removed F.1 (FLOW-01-F04 implementation)** — already enforced.
