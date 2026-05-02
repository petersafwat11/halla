# Phase 2 — Live smoke runbooks

Live Playwright was not available in this Phase 2 environment (same
constraint as Phase 1, see `PHASE_1b_REPORT.md` anomalies). The
`static-checks.js` runner is the executable gate; this runbook
documents the curl invocations a reviewer can run against a live
backend (default port 8000) to validate the same paths end-to-end.

Set `BASE=http://localhost:8000/api/v2`, `HOST_TOKEN=…`,
`SUPER_ADMIN_TOKEN=…`, `USER_ID=…` before running.

---

## Track A — Subscriptions

### subscribe-trial-guard
```
curl -X POST $BASE/subscriptions/subscribe \
  -H "Authorization: Bearer $HOST_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: trial-1" \
  -d '{"planCode":"trial"}'
```
Expect: 201; subscription saved; provider was **not** called (check
boot log — only one `[paymentProvider] active provider:` line, no
charge log lines).

### subscribe-paid-plan
```
curl -X POST $BASE/subscriptions/subscribe \
  -H "Authorization: Bearer $HOST_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: paid-1" \
  -d '{"planCode":"basic_event_25"}'
```
Expect: 201; response.data.paymentTransactionId starts with `stub-`
when MOYASAR_API_KEY is unset, else with `pay-` (Moyasar pattern).
`getMySubscription` reflects the new sub.

### subscribe-idempotency
Run subscribe-paid-plan **twice** with the same Idempotency-Key.
Expect: same response body byte-for-byte, single Subscription row.

### findActiveForUser auto-cancel
1. Subscribe to `basic_event_25`.
2. Subscribe to `premium_event_50`.
3. `GET /subscriptions/my-subscription`.
Expect: only one active sub returned (the premium one). Old basic
sub has `status: 'cancelled'` with `cancelReason` containing
"Auto-cancelled".

### expiry-cron
1. Pre-seed a subscription with `expiresAt = nowUtc() - 1 minute`.
2. Trigger the daily cron (or manually invoke
   `scheduleSubscriptionStatusUpdate`'s body).
Expect: subscription.status flips to `expired`; `AuditLogModel`
contains a `subscription.expired` row with the correct targetId.

### admin-assign
```
curl -X POST $BASE/subscriptions/admin/assign \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: assign-1" \
  -d "{\"userId\":\"$USER_ID\",\"planCode\":\"premium_event_25\",\"notes\":\"VIP onboarding\"}"
```
Expect: 201; AuditLogModel row `subscription.assigned_by_admin` with
the admin as actor and the host as target. No paymentProvider charge
log line.

---

## Track B — Plans CRUD

### plans-create
```
curl -X POST $BASE/plans/admin \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"smoke_basic_event_5","planType":"basic_event","planFamily":"basic","billingType":"event","availableFor":"host","nameAr":"اختبار","nameEn":"Smoke","pricing":{"oneTime":50},"limits":{"maxEvents":1,"maxInvitesPerEvent":5,"durationDays":30},"features":{}}'
```
Expect: 201; AuditLogModel row `plan.created`.

### plans-delete-block
With one active subscriber on plan `basic_event_25`:
```
curl -X DELETE $BASE/plans/admin/basic_event_25 \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```
Expect: 409; body cites the active subscriber count. Plan stays
`isActive: true`.

### plans-delete-soft
DELETE on a fresh plan with no subscribers:
```
curl -X DELETE $BASE/plans/admin/smoke_basic_event_5 \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```
Expect: 200; plan now `isActive: false`. AuditLogModel row
`plan.deactivated`.

### plans-update-guard
With at least one subscriber whose pool is e.g. 100, attempt:
```
curl -X PATCH $BASE/plans/admin/basic_monthly_100 \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"limits":{"maxEvents":1,"invitePool":50,"durationDays":30}}'
```
Expect: 422 ValidationError; body cites affectedCount and reducedKeys.

### plans-update-audit
PATCH a non-destructive field (e.g. nameEn). AuditLogModel row
`plan.updated` with `changes.before.nameEn` and `changes.after.nameEn`
populated.

---

## Track C — Addons

### addon-purchase-pool
With a pool plan (`basic_monthly_100`) active:
```
curl -X POST $BASE/addons/purchase \
  -H "Authorization: Bearer $HOST_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: addon-pool-1" \
  -d '{"addonType":"extra_invites","quantity":50,"scope":"pool"}'
```
Expect: 201; addon.status = `active`; subscription.invitePool +50;
audit row `addon.purchased`.

### addon-purchase-event
With a per-event plan and an active event:
```
curl -X POST $BASE/addons/purchase \
  -H "Authorization: Bearer $HOST_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: addon-event-1" \
  -d "{\"addonType\":\"extra_invites\",\"quantity\":20,\"scope\":\"event\",\"eventId\":\"$EVENT_ID\"}"
```
Expect: 201; event.guestLimit increased by 20.

### addon-purchase-business
```
curl -X POST $BASE/addons/purchase \
  -H "Authorization: Bearer $HOST_TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: biz-1" \
  -d '{"addonType":"business_customization"}'
```
Expect: 201; addon.status = `pending_provisioning`. Then:
```
curl -X POST $BASE/addons/admin/$ADDON_ID/activate \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"notes":"webpage delivered"}'
```
Expect: 200; addon.status = `active`; audit row
`addon.activated_by_admin`.

### addon-idempotency
Run addon-purchase-pool twice with the same Idempotency-Key. Same
response body. Single Addon row. paymentProvider sees one charge.

### addon-audit
After any successful purchase: AuditLogModel has an `addon.purchased`
row with metadata.scope and metadata.paymentTransactionId.

---

## Phase-1 regression smoke

Run these utility-static checks after the Phase 2 merge to confirm
nothing regressed:

```
node docs/implementation/phase-1-smoke-tests/utilities-static-checks.js
node docs/implementation/phase-1-smoke-tests/timezone-unit.js
```

Both must report all checks passed. The Phase 2 runner sits alongside:

```
node docs/implementation/phase-2-smoke-tests/static-checks.js
```
