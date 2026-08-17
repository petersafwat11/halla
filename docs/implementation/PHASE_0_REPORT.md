# Phase 0 Report — Stop the Bleeding

## Landed

### TENANT-F01 / RBAC-F02 — commit `dc20aef`

`filterByWhitelabel` no longer issues a `{ whitelabelId: null }` filter to platform ADMIN/MODERATOR users. Both roles are now scoped to their assigned `req.user.whitelabelId`, mirroring `WHITELABEL_ADMIN`/`WHITELABEL_MODERATOR`. A missing `whitelabelId` fails closed with a 500 ("Admin tenant configuration error...") so a new ADMIN/MODERATOR cannot be created without an assigned tenant and an existing one without one cannot silently downgrade to a null filter.

User-creation enforcement was added at four call sites:
- `admin.controller.js` — non-super-admin creators inherit the tenant via the middleware filter; SUPER_ADMIN must explicitly pass `whitelabelId` in the body.
- `admin.service.js` — `createModerator` rejects calls with no `whitelabelId`.
- `users.controller.js` — passes `targetWhitelabelId` from `req.body.whitelabelId` for SUPER_ADMIN; other roles continue to inherit their own scope.
- `users.service.js` — branches by `userRole` and rejects when no tenant is assignable.

Migration audit: `labbe-backend-/scripts/audit-admin-whitelabel.js`. Read-only. Lists every ADMIN / MODERATOR / WHITELABEL_ADMIN / WHITELABEL_MODERATOR with no `whitelabelId`. Output is grouped by role and prints the User _id, username, name, email, phone, status, and createdAt for each offender. Per the prompt, no auto-assignment is performed — Peter must run this against the dev/prod DB and assign manually before Phase 1.

SUPER_ADMIN's middleware behavior was deliberately left unchanged ("Leave SUPER_ADMIN with cross-tenant access unchanged" — Phase 0 prompt step 4). The comment in `whitelabel.js` was updated to remove the no-longer-true claim that SUPER_ADMIN behaves "same as regular admin/moderator."

### PIPELINE-F02 / FLOW-18-F01 — commit `31a69bc`

POST `/messaging/webhook` HMAC verification fails closed.

- `src/config/env.js` — `WHATSAPP_APP_SECRET` is now `Joi.string().min(1).required()`. The server fails fast at startup with a Joi validation error if the secret is unset.
- `src/modules/messaging/messaging.controller.js` — extracted `verifyWebhookSignature(req)`. Every webhook request must carry `x-hub-signature-256`; the secret must be present (defense-in-depth — env validation already enforces this); and the computed HMAC must match the header byte-for-byte (compared with `crypto.timingSafeEqual`). Any failure returns HTTP 401 with a `{ status, message, reason }` body. The previous "if env && header" branch is gone.
- `src/server.js` — startup banner now prints "🔐 WhatsApp webhook HMAC verification: ACTIVE" once the listener is up, so the operator gets a positive boot signal rather than only failure logs.

The implementation continues to verify over `JSON.stringify(req.body)`. That preserves prior behavior; raw-body capture (which would be the strictly-correct signature input) is flagged for Phase 3d "Webhook + RSVP correctness" and is out of scope here per "no drive-by refactors."

The original code returned 403 on a bad signature; the prompt asked for 401 on missing or invalid. The new handler returns 401 in both cases.

---

## Deviations from plan

1. **Sub-agent dispatch was skipped.** `PHASE_0_PLAN.md` documents the rationale: both findings together touch only seven source files and the main session had already completed the diagnostic reads needed to write the patches. Dispatching to a stateless sub-agent would have re-done that research. The progress-file convention, finding-IDs-in-commits rule, and stop-gate output — the procedural pieces Phase 0 was meant to validate — landed without sub-agent involvement. Phases 1, 3a–3e have substantially larger parallel-safe scope and will exercise the sub-agent rule for real.
2. **Branch name.** The prompt names the branch `implementation/phase-0-stop-the-bleeding`. The harness designated `claude/implement-phase-0-HOIto` for this session and required pushes go there. Both commits land on the harness-assigned branch. If Peter prefers the prompt's name, both commits cherry-pick cleanly onto a fresh branch off `master`.
3. **`.env.example`** does not exist in the repo. The prompt's parenthetical "(if it exists)" was honored — the required-env enforcement is in `env.js` instead, which is more authoritative.
4. **Status code 403 → 401** for invalid HMAC signatures. The previous code returned 403; the prompt asked for 401. The new handler matches the prompt.

---

## Open items

1. **Migration:** `node scripts/audit-admin-whitelabel.js` must be run against the dev DB (and later staging/prod) to identify ADMIN/MODERATOR users still missing `whitelabelId`. Each must be assigned a tenant manually before Phase 1, otherwise their admin endpoints will start returning 500 ("Admin tenant configuration error...").
2. **Operational env:** Confirm `WHATSAPP_APP_SECRET` is set in every deployment's `config.env` / runtime environment. The server now refuses to boot without it.
3. **Phase 3d carry-over:** Raw-body HMAC verification on the webhook (vs. the current `JSON.stringify(req.body)` approach) was scoped out of Phase 0 and must be picked up in Phase 3d "Webhook + RSVP correctness." The audit's `FLOW-18-F02` (webhook duplicate-notification dedup) and `FLOW-19-F02` (RSVP idempotency) are also queued for that sub-phase per the master plan.

---

## Notes for the next session

- The `getWhitelabelIdFromFilter` helper in `admin.controller.js` is internally inconsistent with the middleware: the helper expects `{}` to mean "super admin sees all" but the middleware sets `{ whitelabelId: null }` for SUPER_ADMIN. After the TENANT-F01 fix this is functionally fine for ADMIN/MODERATOR (they get a real ObjectId) but the SUPER_ADMIN path still returns `null` instead of `undefined`. Several services then add `whitelabelId: null` to the query, which restricts SUPER_ADMIN to platform-only data on those routes — which the rest of the codebase relies on intentionally. Recorded here so Phase 1 (auth redesign + foundations) doesn't accidentally invert it.
- `admin.service.js getModerators` (around line 782) and `getEventTargets` (around line 1395) branch on `whitelabelId === null` vs `=== undefined` to decide who sees what. After TENANT-F01, ADMIN/MODERATOR no longer hit the `=== null` branch — they pass a real ObjectId. The fallback `else` branch in `getModerators` is now reachable only by SUPER_ADMIN, who continues to see only platform-level moderators because the SUPER_ADMIN middleware path still returns `null`. Behavior preserved; flagged so a future cleanup pass doesn't get surprised.
- The audit's tenant scoping matrix (`docs/audit/TENANT_SCOPING_MATRIX.md`) describes the *intended* model. After TENANT-F01, the implementation matches the intended model for ADMIN/MODERATOR; SUPER_ADMIN still operates per the existing "platform-only via filter, cross-tenant via routes that bypass the filter" pattern. Phase 1 may want to revisit whether SUPER_ADMIN should genuinely have a no-filter (`{}`) state; out of scope here.
- Anomaly: `admin.service.js` `createModerator` previously re-derived `moderatorRole` from a "Whitelabel-creator vs. Platform-creator" branch using the (incoming) `whitelabelId`. After this commit both branches require a `whitelabelId`, so the branch is now purely about *which* role list is allowed. Logic preserved; comment updated.
- No unrelated bugs were fixed. Two were noticed in passing and intentionally left alone:
  - `admin.routes.js` POST `/moderators` swagger schema does not document the new `whitelabelId` body field. Update during the documentation pass in Phase 5c.
  - The webhook handler runs `for (const status of statuses)` and `for (const message of messages)` sequentially with `await` — duplicate of the bulk-dispatch pattern flagged in `FLOW-17-F01`. Out of scope here; Phase 3b owns it.

---

## Findings closed

- `TENANT-F01` / `RBAC-F02`: closed in commit `dc20aef`.
- `PIPELINE-F02` / `FLOW-18-F01`: closed in commit `31a69bc`.

Both branches are pushed to `origin/claude/implement-phase-0-HOIto` at the conclusion of this session.
