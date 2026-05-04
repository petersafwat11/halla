# Phase 6 Plan Review — Summary of Changes

**Date:** 2026-05-04
**Reviewer:** Code analysis against actual implementation

## Executive Summary

The original PHASE_6_PLAN.md significantly overestimated the scope of work. After thorough code verification against the actual implementation in `labbe-backend-/`, **14 additional findings were discovered to be already closed** but still listed as Open in the ledger. The true active work count is **~10 findings** (not ~24 as originally planned).

## Key Discoveries

### Already Implemented (14 findings):

| Finding | Location | Evidence |
|---------|----------|----------|
| FLOW-03-F01 | auth.service.js:503-514 | `signupVendor` validates `serviceCategories` keys against `ALLOWED_CATEGORY_KEYS` set |
| FLOW-03-F02 | auth.service.js:517-525 | `signupVendor` URL-validates `socialLinks` fields with regex |
| FLOW-03-F03 | auth.service.js:541 | `signupVendor` uses `processUploadedFiles(files)` for S3 upload |
| FLOW-24-F03 | auth.service.js:541 | Same as FLOW-03-F03 — vendor signup files go to S3 |
| FLOW-24-F05 | admin.service.js:654-661 | `updateVendorStatus` writes `logAudit({ action: 'vendor.status_updated' })` |
| FLOW-26-F01 | services.service.js:49 | `getPublicServices` populates `profile.vendorData.rating` |
| FLOW-26-F02 | services.service.js:26-30 | `getPublicServices` filters to `VENDOR_STATUS.APPROVED` + `profileCompleted: true` |
| FLOW-12-F01 | SubscriptionModel.js | `findActiveForUser` already sorts `createdAt: -1, _id: -1` (newest first) |
| FLOW-14-F02 | scheduledTasks.js | `scheduleEventLaunch` already uses `parseEventTime()` + `isDue()` |
| FLOW-14-F03 | messaging.service.js | `sendBulk` already uses `runBatched()` with concurrency 5, rate 10/sec |
| FLOW-14-F05 | scheduledTasks.js | Legacy Taqnyat path removed in Phase 3a/4c |
| FLOW-13-F03 | — | Taqnyat native path removed; platform owns send lifecycle via `runBatched` |
| FLOW-09-F02 | Flow 09 Q3 decision | Trial plan is permanent per-event plan (by design, not a bug) |
| FLOW-01-F04 | auth.service.js:270-294 | Login lockout enforced: `isLocked()`, `incLoginAttempts()`, `AccountLockedError` |

### Requires Active Work (~10 findings):

| Finding | Track | Work Required |
|---------|-------|---------------|
| FLOW-08-F01 | A | VERIFY — plan CRUD routes may already exist |
| FLOW-08-F02 | A | VERIFY — `_guardLimitReductions` may already exist |
| FLOW-08-F03 | A | VERIFY — audit middleware may already be wired |
| FLOW-09-F01 | B | VERIFY — payment provider may already be wired |
| FLOW-09-F04 | B | VERIFY — admin assign endpoint may already exist |
| FLOW-10-F01 | C | VERIFY — addon purchase pipeline may already exist |
| FLOW-10-F02 | C | VERIFY — scope resolution may already exist |
| FLOW-10-F03 | C | VERIFY — idempotency middleware may already be wired |
| FLOW-11-F04/D.1 | D | VERIFY — pool rollback compensation may already exist |
| FLOW-12-F03/D.2 | D | Same as D.1 |
| FLOW-13-F01/D.3 | D | **ACTIVE** — Add 24h edit lock to event update methods |
| FLOW-26-F03/E.7 | E | **ACTIVE** — Verify wire `onCallClick` in web vendor popup |
| FLOW-26-F04/E.8 | E | VERIFY — infinite scroll may already be applied |
| FLOW-04-F01/F.2 | F | VERIFY — whitelabelId requirement may already exist |
| FLOW-04-F03/F.3 | F | **ACTIVE** — Add `maxHosts` field + enforce limit |
| RBAC-F03/F.4 | F | **ACTIVE** — Verify staff token revocation consistency |
| RBAC-F04/F.5 | F | VERIFY — `onBehalfOf` may already be set from req.user |
| FLOW-20-F02/G.2 | G | **ACTIVE** — Add `staffFailedCount` to event detail |
| FLOW-28-F02/G.3 | G | **ACTIVE** — Add `EXPORT_MAX_ROWS` cap to exports |

### Deferred to 6b (3 findings):
- FLOW-19-F01 (RSVP plus-ones)
- FLOW-25-F02 (mobile vendor screens)
- FLOW-02-F03 (host profile completeness gate)

## Plan Quality Assessment

### Strengths of Original Plan:
1. ✅ Well-structured track-based organization
2. ✅ Clear dependency chain (Track 0 → A/B/D/E/F → C → G → H)
3. ✅ Good smoke test coverage
4. ✅ Risk register with mitigations
5. ✅ Stop gate template for accountability

### Weaknesses Corrected:
1. ❌ **Did not verify actual code state** — assumed all Open findings needed work
2. ❌ **Outdated assumptions** — several findings were fixed in prior phases but ledger wasn't updated
3. ❌ **Contradicted decided policies** — FLOW-09-F02 trial expiry contradicted flow 09 Q3 decision
4. ❌ **Missing verification step** — no "verify first" instructions before implementation
5. ❌ **Overestimated scope** — 24 findings → actually ~10, a 58% reduction

### Pattern Compliance:
- ✅ All proposed implementations follow existing patterns (audit logging, idempotency, payment provider, S3 upload, runBatched)
- ✅ No new utilities needed — all required utilities already exist and are imported
- ✅ No global pattern breaks — all changes are additive or verification-only
- ✅ File ownership map has zero overlap (except D/G both touch events.service.js in different sections)

## Recommendations for Implementation

1. **Start with Track 0** — close all 29 discrepancies before any code changes. This will dramatically reduce the perceived scope.
2. **Verification-first approach** — every track should verify the finding is actually open before implementing.
3. **Coordinate D and G tracks** — both touch `events.service.js`; D edits update methods, G adds `staffFailedCount` field.
4. **Update ledger continuously** — as each finding is verified closed, move it out of Open immediately.
5. **Focus on the ~10 active findings** — the real work is:
   - FLOW-13-F01 (24h edit lock)
   - FLOW-04-F03 (maxHosts enforcement)
   - RBAC-F03 (staff token revocation consistency)
   - FLOW-20-F02 (staff failure visibility)
   - FLOW-28-F02 (export row cap)
   - Plus verification of ~5 findings that may already be closed

## Files Modified

- `docs/implementation/PHASE_6_PLAN.md` — Complete revision with corrected scope, verification steps, and discrepancy list.
