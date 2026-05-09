# PR: feat(payments): full-stack review — 'manage' RBAC, host-self lock, mobile parity

**Branch:** `claude/payments-fullstack-review`
**Open PR:** https://github.com/petersafwat11/halla/pull/new/claude/payments-fullstack-review

---

## Summary

Full-stack payments module refactor per `docs/modules/payments-fullstack-review-plan.md`. All 11 locked decisions implemented across backend, web (Next.js), and mobile (Expo / RN).

- **Backend (Phase A)** — new `'manage'` RBAC action verb for sensitive global actions (refund/capture/void); `/payments/:id` and `/:id/poll` locked as host-self-only with dual-id detection (Mongo `_id` OR Moyasar UUID, so 3DS callback still works); `runFinalization` collapses 3 finalization sites into 1 (and fixes a missing `checkout`-purpose dispatch in the reconcile cron); refund + linked-subscription cancel wrapped in a Mongo transaction with a standalone-Mongo fallback; zod validation on refund/capture; full Swagger on all 8 module routes; `search` parameter added to `/admin/payments`; new `GET /subscriptions/payments/export` for host export.
- **Web (Phase B)** — `AdminPaymentsClient` split 503 → 225 lines + 5 components + a custom hook (CSS preserved + new keys for lifted inline styles); real-fields `PaymentDetailModal` replaces `JSON.stringify`; `PaymentReturnClient` uses canonical `usePoll3DS` and branches redirect on `payment.metadata.purpose`; new `useMyPaymentsExport` / `useAdminPaymentsExport`; legacy `paymentsAPI` deleted; URL-state on host page; ErrorBoundary on all 3 payment pages; `StatusBadge` fixed (`completed`/`failed`/`refunded` cases).
- **Mobile (Phase C)** — new `PaymentDetailScreen` + `PaymentReturnScreen` + `usePaymentPoll` hook; refund/capture/void mutations with idempotency-key minting; `'refunded'` filter added; dead hooks deleted.
- **Locales** — en + ar adminPayments / hostPayments / mobile admin updated with all new keys.

See `docs/modules/payments-fullstack-review-plan.md` §11 for the full ship report and §0.1 for the locked decision table.

## Test plan

- [ ] Backend: `cd labbe-backend- && npm run dev` — boots clean, swagger at `/api/v2/docs` shows all 8 payment routes + new schemas
- [ ] RBAC: log in as `WHITELABEL_ADMIN` (with `PAYMENTS: FULL`), confirm POST `/payments/:id/refund` returns 403 (was succeeding before)
- [ ] RBAC: log in as `ADMIN`, confirm refund/capture/void succeed
- [ ] 3DS flow: trigger a `creditcard_3ds_test` source via `/payments/checkout`, complete the redirect, land on `/host/payments/return?id=<moyasar-uuid>`, confirm `usePoll3DS` flips to `paid` and redirect target matches `payment.metadata.purpose` (subscription / addon / checkout)
- [ ] Refund flow: full refund on a paid subscription payment cancels the linked subscription atomically; verify `payment.refunded` and `subscription.cancelled` either both land or both don't (transaction)
- [ ] Refund flow on dev (standalone Mongo): confirms warning logged and writes still apply sequentially
- [ ] Search: `/admin/payments?search=<host-name>` returns matching rows; same for moyasar id
- [ ] Web admin: action modal → refund/capture/void → success toast + cache invalidation
- [ ] Web admin: payment detail modal renders all fields (no JSON dump)
- [ ] Web admin: export downloads `.xlsx` via the new `useAdminPaymentsExport` hook
- [ ] Web host: `/host/payments` filter+page in URL; export downloads `my_payments_*.xlsx`
- [ ] Mobile: `AdminPaymentsScreen` row tap → `PaymentDetailScreen`; admin can refund/capture/void; non-admin sees no buttons
- [ ] Mobile: 3DS callback `host/payments/return` deep-link lands on `PaymentReturnScreen`, polls, navigates per purpose
- [ ] LTR + RTL visual smoke on all admin payments + host payments pages

## Risks / things to revisit

- Mongo transaction fallback is non-atomic; in production the replica set will be required for the atomicity guarantee. The fallback is logger-warned but acceptable in dev.
- Mobile `PaymentListItem` is now ~46 lines (cap was 36) to deliver web parity (method/last4/Moyasar id subtitle). Sub-agent flagged this deliberately.
- `D.4` follow-up: only `notifications.routes.js POST /notifications/send` (lines 244, 280) currently has the same WHITELABEL_ADMIN over-grant pattern. Consider migrating once a NOTIFICATIONS page exists in `ADMIN_PAGES`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
