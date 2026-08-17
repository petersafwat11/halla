**Title:** feat(messaging): full-stack review — zod validation, service split, canonical hooks

**Open the PR here:** https://github.com/petersafwat11/halla/pull/new/claude/messaging-fullstack-review

---

## Summary

Implements `docs/modules/messaging-fullstack-review-plan.md`. Reduces the messaging surface from 12 endpoints to 7 (webhook GET/POST, send, send-bulk, retry, send-reminder, schedule), splits a 1098-line service into focused files, replaces the Zustand-server-state web data layer with a canonical React Query hook, and fixes both clients' broken test-message paths.

- **Backend** — Delete 5 unused routes (`/balance`, `/stats`, `/status`, `/templates/approved`, `/template/status`). Split `messaging.service.js` (1098→6 files, façade preserves API) and `messaging.controller.js` (461→4 files). New `messaging.validation.js` with **Zod** schemas wired through `validateZod`. Service failure paths throw typed errors; controllers use `responseHelper`. Idempotency middleware + rate limiters + audit logs added to every paid-message route. Host-ownership checks on `sendReminder` + `scheduleBulkSend`. `sendReminder` migrated to `runBatched(5/5)`. Webhook DB write moved into the service. `console.*` → shared logger. Silent Unsplash fallback deleted. Swagger schemas defined. ~40 phase markers stripped.
- **Web** — Delete `services/messaging.js` and `stores/messagingStore.js`. New `hooks/reactQueryHooks/useMessaging.js` (6 hooks, all with `Idempotency-Key`). `useSendTestMessage` now PATCHes the canonical events route. All consumers (GuestTable, AdminGuestTable, TestMessagePopup, ScheduleSendingPopup) migrated.
- **Mobile** — Drop dead `MESSAGING.*` constants. Fix `sendTestInvitation` to PATCH `/events/:eventId/test-message`. Strip `_legacyToken` parameter. Extract messaging mutations into `useMessagingMutations.js`. Delete `useSubmitTemplate` (route never existed) and its trigger button. Migrate Arabic auto-reply defaults + partial-failure banner to i18n.

## Test plan

- [ ] Backend: `node -c` passes for every file in `src/modules/messaging/`; module loads via `require('./src/modules/messaging')`; the events module's `messagingService.sendTestMessage` delegation still resolves.
- [ ] Backend: Smoke each surviving route — `POST /messaging/send`, `/send-bulk`, `/retry`, `/send-reminder`, `/schedule` — with valid body returns 2xx; with invalid body returns 400 with the Zod error message; same `Idempotency-Key` reused on the same body replays the cached response; reused with a different body returns 409.
- [ ] Backend: Confirm rate limiter trips after the configured threshold on `/send`, `/send-bulk`, `/send-reminder`, `/retry`, `/schedule`, and on `POST /webhook`.
- [ ] Backend: Confirm host-ownership rejection — log in as user A, attempt `/send-reminder` or `/schedule` with user B's eventId → 403.
- [ ] Backend: WhatsApp webhook still verifies HMAC, processes status updates and button responses; `markGuestAsSmsFallback` fires for `no_capability`/`failed` statuses.
- [ ] Backend: Audit log entries appear for `messaging.{schedule,bulk_send,retry,send_one,reminder}` and `guest.rsvp.button`.
- [ ] Web: `npm run lint` clean. Send test message from `TestMessagePopup`, schedule from `ScheduleSendingPopup`, send invitations + reminders from host `GuestTable` and admin `AdminGuestTable` — all hit the canonical paths and refresh the UI on success.
- [ ] Web: Fast double-click on send/retry/schedule does NOT double-charge (idempotency middleware replays cached response).
- [ ] Mobile: Test-message modal sends successfully (now PATCH `/events/:id/test-message`, was 404 in production).
- [ ] Mobile: Schedule, send-bulk, retry, send-reminder mutations work; `useSubmitTemplate` button is gone from `EventActionsHeader`.
- [ ] Mobile: Visual check `StepFive.js` and `PartialFailureBanner.js` render correctly in both ar and en — i18n keys resolve.
- [ ] Cross-platform: Grep `/messaging/{test,template/submit,templates/approved,template/status,balance,stats,status}` across `labbe`, `labbe-backend-/src`, `halla-mobile` returns zero hits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
