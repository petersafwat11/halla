# Phase 6 — Remaining Implementation Report

**Date:** 2026-05-04  
**Source of truth:** `docs/implementation/IMPLEMENTATION_LEDGER.md` (as of post-Phase-5)  
**Cross-reference:** `docs/audit/FINDINGS_SUMMARY.md`, `docs/implementation/PHASE_5_REPORT.md`, `docs/implementation/PHASE_5_PROGRESS.md`

---

## 1. Executive Summary

After Phases 0–5, the **IMPLEMENTATION_LEDGER.md** still lists **39 finding IDs** in the `Open` section.  
Of these, **~8 appear to already be implemented** in code but were never moved out of `Open` during Phase 5 (discrepancies noted in §4).  
That leaves **~31 findings** requiring active implementation work, plus **4 infrastructure/production hand-offs** carried from Phase 4d/5.

**Severity of remaining active findings:**

| Severity | Count (ledger Open) | Count (after discrepancy adjustment) |
|----------|---------------------|--------------------------------------|
| Critical | 3 | 3 |
| High | 11 | 9 |
| Medium | 19 | 15 |
| Low | 6 | 4 |

> The Critical items are payment/subscription flows that were deferred from Phase 5: `FLOW-09-F01`, `FLOW-10-F01`, and `FLOW-12-F01`.

---

## 2. Complete List of Ledger-Open Findings

Below is every ID still listed under `Open` in `IMPLEMENTATION_LEDGER.md`, with its audit title, severity, and whether it needs active work.

### Critical (3)

| ID | Audit Title | Location / Notes | Active Work Required? |
|----|-------------|------------------|----------------------|
| **FLOW-09-F01** | `subscribe()` creates subscription without any Moyasar payment check | `subscriptions.service.js` | **Yes** — full payment-charge pipeline |
| **FLOW-10-F01** | Addon purchase creates pending record only — no payment, activation, or quota update | `addons.service.js` | **Yes** — end-to-end addon purchase pipeline |
| **FLOW-12-F01** | `findActiveForUser()` sorts oldest-first; `validateLimits()` enforces wrong plan | `subscriptions.service.js` | **Yes** — sort order + concurrent-sub guard |

### High (11)

| ID | Audit Title | Location / Notes | Active Work Required? |
|----|-------------|------------------|----------------------|
| **FLOW-03-F03** | Vendor document upload saved to local filesystem (not S3) | multer config | **Yes** — migrate to `processUploadedFiles` |
| **FLOW-07-F02** | Profile image saved to local filesystem; S3 integration missing | multer config | **Yes** — but may already be closed; see §4 |
| **FLOW-08-F01** | POST /admin (create plan) and DELETE /admin/:code endpoints missing | plans routes | **Yes** — CRUD + soft-delete |
| **FLOW-08-F02** | Live plan update silently changes limits for all active subscribers | plans service | **Yes** — guard + subscriber count check |
| **FLOW-09-F04** | Admin-assign plan endpoint is missing | admin routes | **Yes** — `POST /admin/subscriptions/assign` |
| **FLOW-11-F04** | `consumeInvites()` debits pool before `Event.save()`; no rollback | events service | **Yes** — compensating transaction |
| **FLOW-12-F03** | Pool debit before `Event.save()`; same race as FLOW-11-F04 | events service | **Yes** — same fix as FLOW-11-F04 |
| **FLOW-14-F02** | Timezone bug: launch cron uses server local time, not event timezone | scheduledTasks | **Yes** — use `timezone.isDue` (PIPELINE-F05 twin) |
| **FLOW-14-F03** | `sendBulk` called with no concurrency; >100 guests degrades perf | scheduledTasks | **Yes** — but may already be closed; see §4 |
| **FLOW-24-F03** | Vendor signup documents saved to local filesystem, not S3 | multer config | **Yes** — same as FLOW-03-F03 |
| **FLOW-28-F02** | `generateExcel()` has no row cap; large exports will OOM | excel export | **Yes** — streaming or row-cap guard |

### Medium (19)

| ID | Audit Title | Location / Notes | Active Work Required? |
|----|-------------|------------------|----------------------|
| **FLOW-01-F04** | No account lockout after repeated failed login attempts | auth.service.js | **Partial** — `lockUntil`/`loginAttempts` exist (Phase 1a); verify the login path actually increments attempts |
| **FLOW-03-F01** | Vendor category not validated against allowed enum at signup | vendors service | **Yes** |
| **FLOW-03-F02** | Vendor social links not URL-validated at signup | vendors service | **Yes** |
| **FLOW-04-F01** | Whitelabel ADMIN created without assigning whitelabelId | auth service | **Yes** |
| **FLOW-04-F03** | Whitelabel plan limits not enforced at host creation time | whitelabels service | **Yes** — deferred from Phase 5; needs `PlanModel.maxHosts` design |
| **FLOW-08-F03** | No audit event when a plan is updated | plans service | **Yes** |
| **FLOW-10-F02** | Addon scope field stored but never read; wrong quota counter | addons service | **Yes** — quota mapping logic |
| **FLOW-10-F03** | No idempotency key on addon purchase; double-tap = duplicate | addons routes | **Yes** — middleware already exists (Phase 1b) |
| **FLOW-11-F02** | `onBehalfOf` hardcoded false; audit trail gap for SUPER_ADMIN | events service | **No** — code already supports it; ledger not updated; see §4 |
| **FLOW-11-F05** | No idempotency key on event creation endpoint | events routes | **No** — middleware already wired; ledger not updated; see §4 |
| **FLOW-13-F01** | No 24-hour lock enforced before event launch time | events service | **Yes** — edit-lock guard |
| **FLOW-13-F03** | Taqnyat delivery status for existing messages not updated on guest-list change | messaging service | **Yes** — cancel/reschedule logic |
| **FLOW-14-F05** | Legacy Taqnyat native call path coexists with new pipeline | messaging service | **No** — already removed; ledger not updated; see §4 |
| **FLOW-17-F03** | Bulk messaging stats lost if loop crashes mid-run | messaging service | **No** — already persisted; ledger not updated; see §4 |
| **FLOW-17-F04** | `guestIds` array not validated as belonging to the event | messaging service | **No** — already validated; ledger not updated; see §4 |
| **FLOW-19-F01** | WhatsApp RSVP button does not capture plus-ones | RSVP flow | **Yes** — product decision needed (see audit §Items Requiring Peter's Decision) |
| **FLOW-20-F02** | Staff SMS delivery failure is invisible to host | messaging service | **Yes** — failure surface in host UI |
| **FLOW-21-F04** | `sendBulkAccessEmails` function and route misnamed (email but sends SMS) | post-event service | **No** — already renamed; ledger not updated; see §4 |
| **FLOW-24-F05** | No audit log on vendor status transitions | admin service | **Partial** — `vendor.status_updated` wired in Phase 5; verify coverage |

### Low (6)

| ID | Audit Title | Location / Notes | Active Work Required? |
|----|-------------|------------------|----------------------|
| **FLOW-02-F03** | Host profile not validated for completeness before first event | auth / events | **Yes** — profile-completeness gate |
| **FLOW-09-F02** | Trial period never expires — trial stays indefinitely | subscriptions | **Partial** — expiry cron exists; verify trial gets `expiresAt` set correctly |
| **FLOW-13-F05** | No audit log emitted on event update | events service | **No** — wired in Phase 5; ledger not updated; see §4 |
| **FLOW-16-F03** | No per-event throttle on test-message endpoint | messaging routes | **No** — `lastTestAt` throttle added Phase 5; ledger not updated; see §4 |
| **FLOW-25-F02** | Mobile missing vendor profile management screens | mobile | **Yes** — UI screens |
| **FLOW-26-F05** | `numberOfClicks` never incremented; vendor view analytics always zero | services | **No** — incremented in Phase 5; ledger not updated; see §4 |

---

## 3. Infrastructure & Production Hand-Offs (Non-Audit)

These items do not have audit FLOW-IDs but block production launch.

| Item | Source Phase | Description |
|------|--------------|-------------|
| `scripts/check-schema-drift.sh` CI integration | 4d | Add schema-drift check to CI pipeline |
| MongoDB topology verification | 4d | Confirm production is a replica set so atomic `step2` transactions are active |
| `migrate-event-shape.js --apply` | 4c | Run production migration for canonical event sub-objects |
| `seedInitialTemplates.js` | 4c | Seed initial template catalog after admin sign-off |
| `scripts/backfill-guest-access-token-expiry.js` | 3de | Run backfill for guest access token expiry (if not already run) |
| CloudFront + ClamAV virus-scan Lambda | 4c | Template image delivery + security scanning |

---

## 4. Discrepancies — Ledger Says Open, Code Says Closed

The following IDs appear to be **already implemented** in prior phases but were **never moved out of the `Open` section** in `IMPLEMENTATION_LEDGER.md`. They should be closed in a ledger-reconciliation commit before Phase 6 work begins.

| ID | Evidence | Recommended Ledger Action |
|----|----------|---------------------------|
| **FLOW-07-F02** | `processUploadedFiles` used for profile image in Phase 5 Track C (`427c772`) | Close as `closed in PHASE_5` |
| **FLOW-11-F02** | `onBehalfOf` pattern exists in `createEvent`; admin path sets it from `req.body` | Close as `closed in PHASE_4` (pre-existing) |
| **FLOW-11-F05** | Idempotency middleware already on `POST /events` since Phase 3/4 | Close as `closed in PHASE_3` or `PHASE_4` |
| **FLOW-13-F05** | `event.created` / `event.updated` / `event.deleted` wired in Phase 5 Track B/E | Close as `closed in PHASE_5` |
| **FLOW-14-F05** | Legacy Taqnyat path removed in Phase 3a cleanup | Close as `closed in PHASE_3a` |
| **FLOW-16-F03** | `lastTestAt` throttle added in Phase 5 Track E (`bbab695`) | Close as `closed in PHASE_5` |
| **FLOW-17-F03** | Bulk stats persisted after each batch in Phase 3b/5 | Close as `closed in PHASE_3b` |
| **FLOW-17-F04** | `guestIds` validation exists in `sendBulk` / targeting endpoints | Close as `closed in PHASE_3b` |
| **FLOW-21-F04** | Rename to `sendBulkAccessMessages` completed in Phase 3/5 | Close as `closed in PHASE_5` |
| **FLOW-25-F03** | `whatsapp` field already in `UserModel.socialLinks` per Phase 5 progress | Close as `closed in PHASE_5` (pre-existing) |
| **FLOW-26-F01** | `rating` populated in `getPublicServices` per Phase 5 progress | Close as `closed in PHASE_5` (pre-existing) |
| **FLOW-26-F02** | Approval filter in `getPublicServices` per Phase 5 progress | Close as `closed in PHASE_5` (pre-existing) |
| **FLOW-26-F03** | `onCallClick` wired in web vendor popup (`e4a38a5`) | Close as `closed in PHASE_5` |
| **FLOW-26-F04** | Mobile marketplace infinite scroll via `useInfiniteQuery` per Phase 4/5 | Close as `closed in PHASE_4` |
| **FLOW-26-F05** | `numberOfClicks` increment added in Phase 5 Track D (`e730e3d`) | Close as `closed in PHASE_5` |

> **Recommendation:** Open Phase 6 with a **Track 0 — Ledger Reconciliation** commit that closes the 15 IDs above and updates `IMPLEMENTATION_LEDGER.md`. This brings the true active-work count from 39 down to ~24.

---

## 5. True Active-Work Inventory (post-reconciliation)

After closing the discrepancies in §4, the following **24 findings** still require code changes:

**Critical (3):** `FLOW-09-F01`, `FLOW-10-F01`, `FLOW-12-F01`  
**High (9):** `FLOW-03-F03`, `FLOW-08-F01`, `FLOW-08-F02`, `FLOW-09-F04`, `FLOW-11-F04`, `FLOW-12-F03`, `FLOW-14-F02`, `FLOW-24-F03`, `FLOW-28-F02`  
**Medium (10):** `FLOW-01-F04`, `FLOW-03-F01`, `FLOW-03-F02`, `FLOW-04-F01`, `FLOW-04-F03`, `FLOW-08-F03`, `FLOW-10-F02`, `FLOW-10-F03`, `FLOW-13-F01`, `FLOW-13-F03`, `FLOW-19-F01`, `FLOW-20-F02`, `FLOW-24-F05`  
**Low (2):** `FLOW-02-F03`, `FLOW-25-F02`  

Plus **2 cross-flow gaps:** `RBAC-F03`, `RBAC-F04`.

---

## 6. Cross-Reference with Audit "Items Requiring Peter's Decision"

Two remaining findings are blocked on product decisions documented in the audit:

| Finding | Decision Required |
|---------|-------------------|
| **FLOW-19-F01** (plus-ones via WhatsApp RSVP) | Max plus-ones allowed? Reduce host quota? |
| **FLOW-04-F03** (plan limits at host creation) | `PlanModel.limitsSchema.maxHosts` field design |

Phase 6 should either:
- A) Assume reasonable defaults and implement, or
- B) Explicitly defer these two until Peter responds.

---

## 7. Recommended Phase 6 Scope

Given the dependency chains, Phase 6 should be scoped as **"Payment, Subscription & Addon Pipeline + Remaining High/Critical Closure"** rather than trying to close all 24 findings at once. The Critical findings (`FLOW-09/10/12`) form a natural dependency chain:

1. `FLOW-12-F01` (subscription sort order) fixes quota correctness.
2. `FLOW-09-F01` (Moyasar payment on subscribe) fixes the core revenue path.
3. `FLOW-10-F01` (addon purchase pipeline) reuses the payment provider from #2.
4. `FLOW-08-F01/F02/F03` (plan CRUD + guards + audit) enables #1–3 to have correct plan data.
5. `FLOW-11-F04` / `FLOW-12-F03` (pool rollback) closes the last major pipeline race.

The remaining Medium/Low items (`vendor marketplace`, `RSVP plus-ones`, `mobile vendor screens`, etc.) can form a **Phase 6b** or be batched into a later polish phase.

---

*End of report.*
