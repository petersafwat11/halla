# Phase 3abc — Report

**Branch:** `claude/implement-phase-3-plans-ZWa40`
**Cut from:** `master` post-Phase-2 merged state (commit `1566632`).
**Status:** complete pending review.

## Sub-phase summary

| Sub-phase | Status | Notes |
|-----------|--------|-------|
| 3a.1 `failed` status added | done | EVENT_STATUS.FAILED constant + Event model exposure via `Object.values(EVENT_STATUS)`. |
| 3a.2 send-then-mark-live | done | `runEventLaunch` helper in `scheduledTasks.js`: sendBulk first, status='live' only on success. |
| 3a.3 event-level send lock | done | Option A: `launchLock.lockedAt/lockedBy` fields on Event doc. Stale-after-10-min recovery. |
| 3a.4 transactional pool debit | done | Option B (compensating return): `Subscription.releaseInvites` in `createEvent`'s catch block. |
| 3a.5 remove Taqnyat-native | done | `taqnyatDeleteId` field removed from EventModel; cron skip branch removed; `messaging.scheduleBulkSend` no longer writes the field. |
| 3a.6 timezone regression | done — no code change | `parseEventTime` / `isDue` already correct from Phase 1b. |
| 3b.1 batched parallel send | done | New `src/shared/utils/runBatched.js`. `sendBulk`, `scheduleGuestReminders`, post-event bulk all consume it. Concurrency 5, 10/sec cap. |
| 3b.2 idempotency keys | done | Per-guest key shape: `${scope}:${eventId}:${guestId}:${attemptCount}`. Reminders use a 24h-bucket key (`reminder:${eventId}:${guestId}:${type}:24h`). |
| 3b.3 post-event bulk fix | done | `sendBulkAccessEmails` and `_generateTokensAndNotify` both wrapped in `runBatched` + `withIdempotency`. |
| 3c.1 retry cron | done | `scheduleEventRetry` registered (every 5 min). Backoff 5m / 30m / 2h / 6h / 12h. `MAX_LAUNCH_ATTEMPTS = 5`. 24h retry window. |
| 3c.1 manual retry endpoint | done | `POST /api/v2/events/:id/retry-launch`. RBAC: host / wl-admin / admin / super_admin. Idempotency-Key supported. 409 outside retryable states. |
| 3c.2 failure notifications | done | `_markFailedAndNotify` fires user notification (sendEmail=true) + admin notification + audit row. Wrapped in `withIdempotency` so terminal-fail handler is replay-safe. |
| 3c.3 WhatsApp contact button | done | Web: `labbe/ui/commen/whatsappButton/`. Mobile: `halla-mobile/components/shared/WhatsAppContactButton.js`. Number from env (`NEXT_PUBLIC_HALLA_WHATSAPP_NUMBER` / `EXPO_PUBLIC_HALLA_WHATSAPP_NUMBER`); falls back to placeholder `966500000000`. |
| 3c.4 web failure UI | done | `EventFailureBanner.jsx` + `EventFailureBannerClient.jsx` wired into host event detail page. Renders failed banner, retry button (RBAC-gated UI side; backend re-enforces), WhatsApp button, failure reason, and softer "retrying" variant. |
| 3c.5 mobile failure UI | done | `halla-mobile/components/events/EventFailureBanner.js` wired into `EventDetails.js`. Same banner semantics; retry calls `eventsService2.retryLaunch`. |
| Smoke tests | done | `docs/implementation/phase-3-smoke-tests/static-checks.js` — **19 / 19 PASS**. `runbooks.md` covers each spec for live execution. |

## Findings closed (full)

| ID | Status | Notes |
|----|--------|-------|
| PIPELINE-F01 / FLOW-14-F01 | closed | 3a.2 send-then-mark-live |
| PIPELINE-F03 | closed | 3a.4 compensating return |
| PIPELINE-F04 / FLOW-15-F01 | closed | 3a.1 `failed` enum value |
| FLOW-17-F01 | closed | 3b.1 runBatched |
| FLOW-17-F02 | closed | 3b.2 idempotency keys |
| FLOW-21-F01 | closed | 3b.3 post-event bulk |
| FLOW-14-F04 | closed | 3b.2 idempotency keys |
| FLOW-15-F02 | closed | 3c.1 retry cron auto-fires |
| FLOW-15-F03 | closed | 3c.4 / 3c.5 "we're sorry" UI |
| FLOW-15-F04 | closed | 3c.1 manual retry endpoint + UI button |
| FLOW-15-F05 | closed | 3c.2 failure notifications |

## Smoke test results

```
SUMMARY: 19 pass / 0 fail
```

Static checks are the substitute for live Playwright runs in this
environment (no available backend host). `runbooks.md` is
runbook-ready against any staging API.

## Anomalies / hand-offs

- **WhatsApp number constant** — UI uses `NEXT_PUBLIC_HALLA_WHATSAPP_NUMBER`
  (web) / `EXPO_PUBLIC_HALLA_WHATSAPP_NUMBER` (mobile). Both fall back to
  the placeholder `966500000000` already used in landing UI. Replace with
  the production support number when known. **Hand-off to deployment.**
- **AuditLog `targetType` enum** — Phase 2 already noted that `plan` and
  `addon` aren't in the enum; this phase emits `event.launch_failed*`
  audits with `targetType: 'event'` (already in enum), so no schema change
  needed here. The Phase-5 audit-log-everywhere pass should still extend
  the enum for the previously-noted `plan` / `addon` rows.
- **Mobile wizard parity** — per the prompt §5.5, we did not deep-verify
  step 3, step 4, step 5 of the mobile create-event wizard nor the
  WhatsApp preview / template selection. The mobile EventDetails screen
  exists and renders the failure banner correctly (verified via the
  static check + manual code walk). The deeper parity check is **handed
  off to Phase 4**.
- **Live host unavailable** — same as Phase 1 / Phase 2: smoke is static
  + runbook. Once a backend host is online, run `runbooks.md` end-to-end
  before merging into production.

## Hand-offs to Phase 3de

- The new `failed` enum value and the `attemptCount` / `failureReason`
  fields are exposed on `getEventById` (no controller change needed —
  they're plain Mongoose schema fields). Webhook + RSVP work in 3de can
  rely on the new status without mocking.
- `withIdempotency` is now used by sends, reminders, post-event bulk, and
  the terminal-fail notify. RSVP submit (3d.2) and check-in (3e.2) plug
  into the same utility with their own key namespaces.
- `runEventLaunch` is exported from `scheduledTasks.js` for the manual
  retry endpoint. 3de doesn't consume it.
- The `event.launchSettings.taqnyatDeleteId` field is gone from the model,
  but legacy DB documents may still carry it (Mongoose ignores unknown
  fields on read). No migration required for 3de.

## Hand-offs to Phase 4

- Mobile create-event wizard parity (steps 3, 4, 5; WhatsApp preview;
  template selection).
- Mobile event-detail screen polish — only the failure banner was added
  in 3c.5. The screen still pulls limited data; Phase 4 should ensure it
  reads `event.attemptCount`, `event.failureReason`, etc. correctly.
- Mobile `eventsService2.getEventById` — confirm it surfaces the new
  fields to the EventDetails screen via `EventsScreen.handleEventPress`.

## Hand-offs to Phase 5

- AuditLog `targetType` enum extension (already-noted Phase 2 hand-off).
- Audit-log-everywhere pass should also wrap: `event.launch_manual_retry`
  is already wired here; `event.create`, `event.update_*`, `event.delete`,
  `event.cancel` are still uncovered.
- The static-checks smoke runner is appropriate for CI as a regression
  guard once a Node test runner is wired into the project.
