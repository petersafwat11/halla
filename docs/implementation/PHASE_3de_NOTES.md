# Phase 3de — Operational Notes

## Stats polling cadence (3d.4 / D4)

The host event-detail stats query (web React Query, mobile `useEffect` +
interval) polls `GET /events/:id/stats` at the following cadence,
keyed off `event.status`:

| Event status | Poll interval | Rationale |
|--------------|---------------|-----------|
| `live` | 30 s | RSVP responses arrive in real time as guests press WhatsApp buttons; host wants a near-live view. |
| `completed` | 5 min | Late RSVPs are rare but possible; check-in counters keep accruing in some flows. |
| `draft` / `scheduled` / `failed` | none | No new data possible; polling would burn battery / API quota. |

### Cancellation rules

- **Re-poll cancellation.** Each new tick aborts any in-flight request
  before issuing the next one (web: React Query `refetchInterval` does
  this implicitly via the same query key; mobile: `AbortController`
  passed into `fetch`).
- **Unmount cleanup.** Web's React Query stops polling when the
  component using the hook unmounts. Mobile's interval is cleared in the
  `useEffect` cleanup function.
- **Status flip.** When `event.status` changes (e.g. `live → completed`),
  the next render re-evaluates the interval; the previous interval is
  cleared and the new cadence applies on the next tick.

### Override for debugging

Set `localStorage.STATS_POLL_INTERVAL_MS = "5000"` (web) to override the
30-second cadence to 5 seconds for QA. Mobile uses the
`EXPO_PUBLIC_STATS_POLL_INTERVAL_MS` env var; if set, it overrides the
status-keyed values for both `live` and `completed`.

## GuestAccessToken expiry migration (3e.4 / D8)

Script: `labbe-backend-/scripts/backfill-guest-access-token-expiry.js`.

The model already has `expiresAt` as a required field (line 47 of
`GuestAccessTokenModel.js`), so all post-creation tokens carry an expiry
already. The script defends against any pre-existing rows that may have
slipped through schema migrations and is idempotent (a second run finds
zero affected rows).

### Behaviour

- `--dry-run` (default): prints the count of `GuestAccessToken` rows that
  *would* be touched. No writes.
- `--apply`: sets `expiresAt = createdAt + 365 days` on every doc whose
  `expiresAt` is missing or null.
- A second `--apply` returns `0 affected` (idempotent).

### Operator notes

- **Do NOT run this script during a live launch window.** A bulk update
  on a hot collection competes with QR-validation reads.
- Run during a quiet window. The Phase 3de close-out prompt is the
  expected runner; this session lands the script but does not execute it.
- The script logs to stdout; pipe to a file in production:
  `node scripts/backfill-guest-access-token-expiry.js --apply > backfill.log 2>&1`.

## Webhook dedup observability

The dedup write goes through `withIdempotency` with scope
`webhook_dedup`, so the `idempotencykeys` collection is queryable to
audit duplicate webhook fires:

```
db.idempotencykeys.find({ scope: 'webhook_dedup' }).sort({ createdAt: -1 }).limit(10)
```

A high duplicate rate is informational, not alarming — Meta retries are
expected, and the dedup is what keeps the host inbox sane.
