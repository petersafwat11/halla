# Phase 3abc — Manual Runbooks (live backend required)

These runbooks correspond to the spec list in the Phase 3abc prompt
(§3.7 / §4.4 / §5.7). Live Playwright host wasn't available in this
session, so each spec is captured as curl commands ready to execute
against a running staging API.

> **Auth**: every authenticated curl below assumes you've already run
> `BASE=http://localhost:8080/api/v2`, `TOKEN=…` (host JWT), and where
> noted, `ADMIN_TOKEN=…`.

## 3a.1 — `failed` status accepted

```bash
curl -s -X PATCH "$BASE/events/admin/$EVT/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"failed"}' | jq .
# Expect 200 with event.status === 'failed'
```

## 3a.2 — Send-then-mark-live ordering

Schedule an event, force `messagingService.sendBulk` to throw (e.g. unset
`TAQNYAT_API_KEY`), and observe the cron tick:

- `event.status` stays `scheduled` (not `live`).
- `event.attemptCount` increments by 1.
- `event.failureReason` is set to the propagated error.
- Audit row `event.launch_failed` exists (`AuditLog.find({ action: 'event.launch_failed' })`).

When sendBulk succeeds:

- `event.status` flips to `live`.
- `event.launchedAt` is set.
- Audit row `event.launched` exists.

## 3a.3 — Send lock prevents dual-tick races

```bash
# Manually call the cron's runEventLaunch helper twice, in parallel,
# from a node REPL on the backend host:
node -e '
  const { runEventLaunch } = require("./src/shared/utils/scheduledTasks");
  const Event = require("./models/EventModel");
  Event.findById("'$EVT'").then(e => Promise.all([
    runEventLaunch(e, "test-A"),
    runEventLaunch(e, "test-B"),
  ])).then(r => console.log(r));
'
# Expect: one returns { launched: true }, the other { launched: false, reason: "locked" }
```

## 3a.4 — Pool debit compensating return

Force `Event.create()` to throw (e.g. revoke MongoDB write permission for
the test user, or temporarily add a pre-save hook that throws when title
contains a sentinel), then call `POST /events`. After the request:

- Subscription `invitesConsumed` is unchanged (the catch block called
  `releaseInvites`).

## 3a.5 — taqnyat-native scheduling removed

```bash
grep -r "taqnyatDeleteId" labbe-backend-/
# Expect: only the launchSettingsSchema docstring describing its removal,
# nothing functional.
```

## 3b.1 — Batched dispatch wall-time

For 100 guests:

```bash
time curl -X POST "$BASE/messaging/send-bulk" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"eventId":"'$EVT'","guestIds":[…100 IDs…],"channel":"sms"}'
# Old: ~10 sec (100ms/guest)
# New: 1–3 sec (concurrency 5, 10/sec cap)
```

## 3b.2 — Idempotency replay

```bash
curl -X POST "$BASE/messaging/send-bulk" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"eventId":"'$EVT'","guestIds":["G1"]}'
# Run twice within 24h and observe the IdempotencyKey collection:
mongosh "use halla; db.idempotencykeys.findOne({ key: 'event_launch:'+'$EVT'+':G1:1' })"
# Expect a single record, not two; second request returns the cached body.
```

## 3b.3 — Post-event bulk uses runBatched

Same as 3b.1 but against `POST /post-event/:eventId/send-access-emails`.
Observe the runBatched concurrency limit (5 parallel SMSes) in logs.

## 3c.1 — Manual retry (RBAC + state guard)

```bash
# Host triggers retry on failed event:
curl -X POST "$BASE/events/$EVT/retry-launch" -H "Authorization: Bearer $TOKEN"
# Expect 200, attemptCount reset to 0, event.status === 'scheduled'.

# Other-host triggers retry:
curl -X POST "$BASE/events/$EVT/retry-launch" -H "Authorization: Bearer $OTHER_HOST_TOKEN"
# Expect 403.

# Admin triggers retry:
curl -X POST "$BASE/events/$EVT/retry-launch" -H "Authorization: Bearer $ADMIN_TOKEN"
# Expect 200.

# Retry an already-live event:
curl -X POST "$BASE/events/$EVT_LIVE/retry-launch" -H "Authorization: Bearer $TOKEN"
# Expect 409 (status guard).
```

## 3c.2 — Failure notifications

After `attemptCount === 5` OR `now > scheduledLaunchUtc + 24h`, the retry
cron flips status to `failed` and:

- `db.notifications.find({ type: 'event_launch_failed', user: hostId })` returns 1.
- All admins/super_admins receive the same notification.
- AuditLog row `event.launch_failed_terminal` exists.

## 3c.3 — WhatsApp contact button

Web: visit `/ar/host/events/<failed event id>`, click the green WhatsApp
button. Browser opens `wa.me/<NUMBER>?text=أحتاج للمساعدة...`.

Mobile: open the EventDetails screen for a failed event, tap the WhatsApp
button. The OS's WhatsApp app opens with the prefilled message.

## 3c.4 / 3c.5 — Failure UI

Web: failed event renders the red banner with "نعتذر — تعذّر إطلاق
مناسبتك", failure reason, retry button (if RBAC allows), WhatsApp button.

Mobile: same banner inside `EventDetails`. `attemptCount > 0` while
`status === 'scheduled'` shows the softer "نُعيد محاولة" banner instead.
