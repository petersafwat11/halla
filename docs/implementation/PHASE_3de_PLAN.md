# Phase 3de — Webhook + RSVP / Scanner + Post-Event — PLAN

**Branch:** `claude/implement-phase-3-plans-ZWa40` (single-branch session
per harness convention; 3abc landed first in the same branch).
**Cut from:** post-3abc state on this branch.
**Mode:** Single session.

## Locked decisions (D1–D8 from prompt)

**D1 — HMAC verification.** Phase 0 already fixed `messaging.controller.js`
to fail closed when `WHATSAPP_APP_SECRET` is unset, header missing, or
HMAC mismatch. Phase 3d.1 verifies the implementation matches and adds a
static-check spec for all four scenarios.

**D2 — RSVP idempotency key.** Shape: `rsvp:<eventId>:<guestId>:<choice>`.
24h TTL. If `Idempotency-Key` header missing, derive server-side via
SHA256(`${eventId}:${guestId}:${choice}`). Choice values:
`confirmed | declined | maybe`.

**D3 — Webhook duplicate-notification dedup.** Prefer Taqnyat
`payload.messageId` as dedup key; fallback to
SHA256(`${eventId}:${guestId}:${statusType}:${Math.floor(Date.now()/30000)}`).
24h TTL. Dedup applies to **host notification dispatch only**; the
delivery-status field on the guest doc still updates last-write-wins.

**D4 — Stats polling cadence.** Client-side polling. 30s while `live`,
5min while `completed`, no polling for `draft` / `scheduled` / `failed`.
Cancel inflight before re-poll. Cleanup on unmount. Documented in
`PHASE_3de_NOTES.md`.

**D5 — Staff token revocation.** Reuse the existing `isRevoked` /
`revokedAt` / `revokedBy` fields on `StaffAccessTokenModel` (already
defined). Validation middleware already rejects revoked tokens. Add a new
endpoint: `POST /events/:eventId/staff/:staffId/revoke`. RBAC: host or
whitelabel-admin only. Idempotent (re-revoke returns 200). Audit log.

**D6 — Check-in idempotency.** Key: `checkin:<eventId>:<guestId>`. Cached
success response includes `alreadyCheckedIn` and `checkedInAt`. Use the
existing `withIdempotency` utility (no header required).

**D7 — Guest QR rotation.** New endpoint
`POST /events/:eventId/guests/:guestId/rotate-qr`. RBAC: host or
whitelabel-admin. Sets the current `GuestAccessToken` `isRevoked: true`
with `revokedReason: 'rotation'`, generates a new token, returns the new
QR payload. Old QR scan returns **410 Gone** with `reason: 'qr_rotated'`.

**D8 — GuestAccessToken expiry / manual revocation.** `expiresAt` already
exists on the model. Validation middleware rejects expired with **410**
`reason: 'qr_expired'`. New manual-revoke endpoint
`POST /events/:eventId/guest-access/:guestId/revoke` (RBAC same as D7),
sets `revokedReason: 'manual'`, returns 200; subsequent scan → 410
`reason: 'qr_revoked'`. Migration script
`scripts/backfill-guest-access-token-expiry.js`. **Not run from this
session** — close-out prompt runs it.

## File ownership map

| Sub-task | Files |
|----------|-------|
| 3d.1 HMAC verify + spec | `labbe-backend-/src/modules/messaging/messaging.controller.js` (read-only — already fixed in Phase 0); spec `phase-3-smoke-tests/static-checks-3de.js` |
| 3d.2 RSVP idempotency | `labbe-backend-/src/modules/guests/guests.routes.js`, `labbe-backend-/src/modules/guests/guests.controller.js`, `labbe-backend-/src/modules/guests/guests.service.js`; spec |
| 3d.3 webhook dedup | `labbe-backend-/src/modules/messaging/messaging.controller.js` (write — adds dedup branch), `labbe-backend-/src/modules/messaging/messaging.service.js` (extract host-notify into a separate function); spec |
| 3d.4 stats polling | `labbe/hooks/events/queries/useSingleEventStats.js`, `halla-mobile/components/events/SingleEventStats.js` (verify); `PHASE_3de_NOTES.md` |
| 3e.1 staff revoke | `labbe-backend-/models/StaffAccessTokenModel.js` (small): add `revoke` instance method already exists — verify; new endpoint in `labbe-backend-/src/modules/staff/staff.routes.js` + `staff.controller.js` + `staff.service.js`; spec |
| 3e.2 check-in idempotency | `labbe-backend-/src/modules/staff/staff.controller.js`, `labbe-backend-/src/modules/staff/staff.service.js`; spec |
| 3e.3 QR rotation | `labbe-backend-/models/GuestAccessTokenModel.js` (add `revokedReason` enum), `labbe-backend-/src/modules/guests/guests.routes.js`, `guests.controller.js`, `guests.service.js`; spec |
| 3e.4 GAT expiry + manual revoke + backfill | same controllers; new `labbe-backend-/scripts/backfill-guest-access-token-expiry.js` |

## Smoke tests

`docs/implementation/phase-3-smoke-tests/static-checks-3de.js` — covers
all 8 sub-tasks via source-grep assertions. Same approach as Phase 3abc.
Live runbooks added to the existing `runbooks.md`.

## Findings closed in 3de

| ID | Sub-task |
|----|----------|
| FLOW-18-F01 / PIPELINE-F02 | 3d.1 (verification close; original Phase 0) |
| FLOW-18-F02 | 3d.3 |
| FLOW-19-F02 | 3d.2 |
| FLOW-20-F01 | 3e.1 |
| FLOW-20-F03 | 3e.2 |
| FLOW-18-F03 | 3e.3 |
| FLOW-21-F03 | 3e.4 |
| (Stats polling — UX, no FLOW ID) | 3d.4 |
