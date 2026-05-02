# Phase 3de — Report

**Branch:** `claude/implement-phase-3-plans-ZWa40`
**Cut from:** post-3abc state on the same branch.
**Status:** complete pending review.

## Sub-track summary

| Sub-task | Status | Key file(s) |
|----------|--------|-------------|
| 3d.1 HMAC verify + spec | done — Phase 0 implementation matched D1; 4 spec scenarios in `static-checks-3de.js` | `messaging.controller.js` (read), `static-checks-3de.js` |
| 3d.2 RSVP submit idempotency | done — header-derived key when client omits one | `guests.routes.js`, `idempotency` middleware |
| 3d.3 webhook dedup | done — `messageId` preferred, 30s bucket fallback | `messaging.controller.js` |
| 3d.4 stats polling cadence | done — 30s live / 5min completed / off otherwise; web + mobile | `useSingleEventStats.js` (web), `hooks/queries/useEvents.js` (mobile), `EventStats.jsx`, `EventsScreen.js` |
| 3e.1 staff token revoke | done — endpoint + service + audit + idempotent re-revoke | `events.routes.js`, `staff.controller.js`, `staff.service.js`, `AuditLogModel.js` (enum extended) |
| 3e.2 check-in idempotency | done — atomic CAS via `findOneAndUpdate` with `status !== 'checked_in'` guard. The DB row IS the cache; second scan deterministically reports `alreadyCheckedIn: true` with the original `checkedInAt`. | `staff.service.js` |
| 3e.3 guest QR rotation | done — endpoint, service, structured `qr_rotated` reason → 410 Gone | `guests.routes.js`, `guests.service.js`, `GuestAccessTokenModel.js`, `post-event.controller.js` |
| 3e.4 GAT expiry + manual revoke + backfill | done — manual revoke endpoint, `qr_revoked` 410 path, idempotent backfill script (NOT RUN) | `guests.routes.js`, `guests.service.js`, `scripts/backfill-guest-access-token-expiry.js` |
| Smoke tests | done — `static-checks-3de.js` 16/16 PASS, `static-checks.js` regression 19/19 PASS, Phase 1+2 regression PASS | `phase-3-smoke-tests/` |

## Findings closed in 3de

| ID | Status | Sub-task |
|----|--------|----------|
| FLOW-18-F01 / PIPELINE-F02 | closed (verification) | 3d.1 — Phase 0 already implemented; this phase added the 4 scenario assertions |
| FLOW-18-F02 | closed | 3d.3 — webhook host-notification dedup |
| FLOW-19-F02 | closed | 3d.2 — RSVP idempotency with derived key |
| FLOW-20-F01 | closed | 3e.1 — staff token revocation endpoint |
| FLOW-20-F03 | closed | 3e.2 — check-in idempotency |
| FLOW-18-F03 | closed | 3e.3 — guest QR rotation |
| FLOW-21-F03 | closed | 3e.4 — GAT expiry + manual revoke + backfill |
| (Stats polling — UX, no FLOW ID) | closed | 3d.4 |

## Smoke tests

```
phase-3-smoke-tests/static-checks.js     — 19 / 19 PASS
phase-3-smoke-tests/static-checks-3de.js — 16 / 16 PASS
phase-2-smoke-tests/static-checks.js     — 13 / 13 PASS
phase-1-smoke-tests/utilities-static-checks.js — 5 / 5 PASS
phase-1-smoke-tests/timezone-unit.js     — 16 / 16 PASS
```

Live runbooks for each spec are appended to `phase-3-smoke-tests/runbooks.md`
and `static-checks-3de.js` (commented at the top of each `check(...)`).

## Decisions locked (D1–D8)

All 8 decisions from the prompt landed verbatim. See `PHASE_3de_PLAN.md` §
"Locked decisions".

## AuditLog targetType enum extension

Phase 3de added `staff_access_token`, `guest_access_token`, and `rsvp` to
the enum (Phase-2 hand-off identified `plan` and `addon` as still
needed). The Phase 5 audit-log-everywhere pass should add those last two
and migrate any historical rows that used `targetType: 'system'` as a
placeholder.

## Files produced

- `docs/implementation/PHASE_3de_PLAN.md`
- `docs/implementation/PHASE_3de_PROGRESS.md`
- `docs/implementation/PHASE_3de_REPORT.md`
- `docs/implementation/PHASE_3de_NOTES.md`
- `docs/implementation/phase-3-smoke-tests/static-checks-3de.js`
- `labbe-backend-/scripts/backfill-guest-access-token-expiry.js` (**NOT
  YET RUN** — Phase 3de close-out runs it; documented in `PHASE_3de_NOTES.md`)

## Issues encountered

- **`AuditLogModel.targetType` enum** lacked `staff_access_token`,
  `guest_access_token`, and `rsvp`. We extended it inline in 3e.1 because
  the new audits would otherwise drop on enum-fail. Drive-by fix; covered
  by smoke check.
- **`GuestAccessToken.validateToken` was opaque** — returned a single
  string `"Token invalid or expired"` for every failure mode, so the
  controller couldn't return a structured 410 with a reason. We rewrote
  it to look up by token alone first, then branch on revoked / expired /
  unknown to surface a structured `reason`. Backwards-compatible for
  existing callers (the `valid: false` shape is unchanged; only the
  `reason` field gained meaning).
- **No live host** — same as Phase 1 / 2 / 3abc. Smoke is static + runbook.

## Drive-by fixes

- AuditLog enum extension (above).
- GuestAccessToken `revokedReason` enum tightened (`'rotation' | 'manual' | 'admin' | null`).
- GuestAccessToken `revokedBy` field added (was missing despite being
  used by `revoke()`).

## Anomalies surfaced

- The mobile `EventDetails.js` screen is the only mobile event-detail
  surface. Phase 4's mobile-parity work should ensure the new event
  fields (`attemptCount`, `failureReason`, `launchLock`) come through
  `eventsService2.getEventById` so the failure banner renders as
  intended on mobile too. Currently the banner reads from props and
  renders nothing if those fields are absent — graceful degradation, but
  Phase 4 should fix the data flow.
- The migration script targets only post_event tokens implicitly via the
  schema (it re-applies to *any* GAT row missing `expiresAt`). If the
  schema gains a new `type` value later, re-evaluate the script's
  default-expiry policy.

## Hand-offs to Phase 4

- Mobile UI for guest QR rotation and manual revoke (this phase shipped
  backend + web only).
- Mobile UI for staff token revocation (host management screen).
- Mobile UI for the new "stats polling cadence" override env var (QA
  feature).
- Mobile event-detail screen polish — see "Anomalies surfaced".

## Hand-offs to Phase 5

- AuditLog enum still needs `plan` and `addon` (Phase 2 hand-off).
- Audit-log-everywhere pass should wrap RSVP submit, check-in, etc. The
  new endpoints in 3de already emit audits; existing endpoints (RSVP, GAT
  validation) do not.
- Run `scripts/backfill-guest-access-token-expiry.js --apply` during a
  quiet window. The Phase 3de close-out prompt is the expected runner.

## Stop gate

```
STOP — Phase 3de complete

Branch: claude/implement-phase-3-plans-ZWa40

Findings closed (8):
- FLOW-18-F01 / PIPELINE-F02 (webhook HMAC verified + smoke specs)
- FLOW-18-F02 (webhook host-notification dedup)
- FLOW-18-F03 (guest QR rotation)
- FLOW-19-F02 (RSVP submit idempotency)
- FLOW-20-F01 (staff token revocation endpoint)
- FLOW-20-F03 (check-in idempotency)
- FLOW-21-F03 (GuestAccessToken expiry/revocation)
- (Stats polling — UX, no FLOW ID)

Smoke tests:
- Phase 3de specs: 16 / 16 PASS
- Phase 3abc regression: 19 / 19 PASS
- Phase 2 regression: 13 / 13 PASS
- Phase 1 regression: 21 / 21 PASS

Files produced:
- docs/implementation/PHASE_3de_PLAN.md
- docs/implementation/PHASE_3de_PROGRESS.md
- docs/implementation/PHASE_3de_REPORT.md
- docs/implementation/PHASE_3de_NOTES.md
- docs/implementation/phase-3-smoke-tests/static-checks-3de.js
- labbe-backend-/scripts/backfill-guest-access-token-expiry.js (NOT YET RUN)

Issues encountered: AuditLog enum + GuestAccessToken.validateToken — drive-by fixed.
Drive-by fixes: AuditLog enum extension, GAT revokedReason enum, GAT revokedBy field.
Anomalies surfaced: mobile EventDetails data flow needs Phase-4 polish.
Hand-offs to Phase 4: mobile UI for QR rotate / revoke / staff revoke; data flow.
Hand-offs to Phase 5: enum `plan`/`addon`; audit-log-everywhere on RSVP+checkin;
                       run backfill script.

Phase 3de status: COMPLETE
```
