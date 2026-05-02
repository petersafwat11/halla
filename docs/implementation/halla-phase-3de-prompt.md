# Halla Implementation — Phase 3d + 3e (Webhook/RSVP + Scanner/Post-Event)

> Paste this into a **fresh** Claude Code session. This prompt closes the remaining two sub-phases of Phase 3: webhook + RSVP correctness (3d) and scanner + post-event correctness (3e). It assumes Phase 3abc has been merged into `audit/pre-production` with tag `phase-3abc-merged`.

## 0. Why this exists

Phase 3a (pipeline ordering), 3b (bulk dispatch), and 3c (launch failure) are merged. The remaining audit findings in the RSVP pipeline cluster around two surfaces:

- **Inbound webhook + guest RSVP correctness (3d)** — HMAC verification must be confirmed fail-closed (Phase 0 work needs verification + smoke specs), RSVP submit needs idempotency, duplicate webhook fires must not double-notify the host, and stats need a defined refresh cadence on web + mobile.
- **Scanner + post-event correctness (3e)** — staff scanner tokens need a revocation path, check-in must be idempotent, guests need a QR rotation endpoint for compromised codes, and post-event GuestAccessTokens need an expiry/revocation lifecycle.

This is one Claude Code session. Two parallel sub-tracks (3d and 3e) with internal sub-agents where parallel-safe.

## 1. State of the world before this prompt

**Branches:**
- `audit/pre-production` — integration branch, post-Phase-3c merged, tag `phase-3abc-merged`
- This prompt cuts a new branch: `implementation/phase-3de-webhook-rsvp-scanner`

**Reports already written and merged:**
- `docs/implementation/PHASE_2_FINAL_REPORT.md`
- `docs/implementation/PHASE_3abc_REPORT.md`
- `docs/implementation/IMPLEMENTATION_LEDGER.md` — current source of truth

**Key utilities available (built in earlier phases):**
- Idempotency HTTP middleware: `src/shared/middleware/idempotency.js` (BSON contract documented in `src/shared/utils/idempotency.js`)
- Audit log middleware: writes to `AuditLogModel` — `targetType` enum is **lowercase** (gotcha from Phase 3a)
- Event lock helper: `src/shared/utils/eventLock.js`
- runBatched utility (from Phase 3b)
- Timezone-aware datetime utility (from Phase 1)

**Phase 0 leftover to verify in 3d:**
HMAC fail-closed in `src/modules/messaging/messaging.controller.js`. Phase 0 fixed it; 3d adds the smoke specs to lock it and confirm the implementation matches the policy.

## 2. Decisions to lock

The plan commit must record these as the locked policy. If Peter wants to override any, edit this prompt before pasting.

**D1 — HMAC verification check (3d / PIPELINE-F02 / FLOW-18-F01)**
Phase 0 already changed the messaging webhook to fail closed when `WHATSAPP_APP_SECRET` is unset OR signature header is missing OR HMAC mismatch. This sub-phase verifies the implementation matches that behavior and adds smoke specs covering all three failure modes plus the success path. If the implementation drifted from the policy, fix-forward inside 3d.1.

**D2 — RSVP idempotency key (3d / FLOW-19-F02)**
Key shape: `rsvp:<eventId>:<guestId>:<rsvpChoice>` where `rsvpChoice` is `attending` / `not_attending` / `pending`.
Reason: a guest changing their answer is a legitimate new request (different key, new write); a double-tap on the same answer is deduplicated. TTL 24 hours. If the request omits an `Idempotency-Key` header, derive one server-side from a SHA256 of `${eventId}:${guestId}:${rsvpChoice}`.

**D3 — Webhook duplicate-notification dedup (3d / FLOW-18-F02)**
Strategy: prefer Taqnyat-supplied `messageId` from the webhook payload as the dedup key. Fallback when `messageId` is absent: SHA256 of `${eventId}:${guestId}:${statusType}:${Math.floor(timestamp / 30000)}` (30-second bucket). TTL 24 hours via the same idempotency utility. Dedup applies to **host notification dispatch only** — the underlying delivery-status field on the guest doc is allowed to overwrite (last-write-wins on delivery state).

**D4 — Stats refresh strategy (3d, master plan called this a Type C decision)**
Client-side polling. Web + mobile RSVP/stats screens poll `GET /events/:id/stats` at:
- 30 seconds while `event.status === 'live'`
- 5 minutes while `event.status === 'completed'`
- No polling for `'draft'` / `'scheduled'` / `'failed'`

Cancel any in-flight request before re-polling. Stop polling on screen unmount. Document the cadence in `docs/implementation/PHASE_3de_NOTES.md` under "Stats polling cadence" so it's discoverable.

**D5 — Staff token revocation (3e / FLOW-20-F01)**
New endpoint: `POST /events/:eventId/staff/:staffId/revoke`. RBAC: host (event creator) or whitelabel-admin only.
Implementation: status flag on `StaffAccessTokenModel` — `revoked: Boolean (default false)`, `revokedAt: Date`, `revokedBy: ObjectId(User)`. The auth middleware that validates `StaffAccessToken` rejects revoked tokens with **401 Unauthorized**. Audit log entry on revocation: `targetType: 'staff_access_token'`, `action: 'revoke'`. Re-revoking an already-revoked token is idempotent at the action level (same final state, 200 response).

**D6 — Check-in idempotency (3e / FLOW-20-F03)**
Key shape: `checkin:<eventId>:<guestId>`. First check-in succeeds and is cached; subsequent check-ins within TTL return the **same cached response** with `alreadyCheckedIn: true` and the original `checkedInAt` timestamp so the scanner UI can render "already checked in at HH:MM". TTL 24 hours. Use the existing idempotency middleware.

**D7 — Guest QR rotation (3e / FLOW-18-F03)**
New endpoint: `POST /events/:eventId/guests/:guestId/rotate-qr`. RBAC: host or whitelabel-admin only.
Implementation: mark current `GuestAccessToken` `revoked: true` (set `revokedAt`, `revokedBy`), generate a new `GuestAccessToken`, return the new QR payload. Single-active-token policy. Old QR scan attempts return **410 Gone** with body `{ reason: "qr_rotated", message: "..." }` (not 401 — 410 communicates "this resource is permanently gone, here's why"). Audit log entry on rotation.

**D8 — GuestAccessToken expiry + revocation (3e / FLOW-21-F03)**
- Add `expiresAt: Date` to `GuestAccessTokenModel`. Default for new tokens: `event.eventDate + 90 days` if known, otherwise `createdAt + 90 days`.
- Add `revoked: Boolean`, `revokedAt: Date`, `revokedBy: ObjectId(User)` (shared with D7).
- Validation middleware rejects expired tokens (`now > expiresAt`) with **410 Gone**, `reason: 'qr_expired'`. Rejects revoked tokens with **410 Gone**, `reason: 'qr_revoked'` or `'qr_rotated'`.
- New endpoint: `POST /events/:eventId/guest-access/:guestId/revoke`. RBAC: host or whitelabel-admin.
- Migration script: `scripts/backfill-guest-access-token-expiry.js`. Find all `GuestAccessToken` docs with no `expiresAt`, set to `createdAt + 365 days`. Document in `PHASE_3de_NOTES.md`. **Do NOT run from this prompt** — the Phase 3de close-out prompt runs and verifies it.

## 3. Standing rules

- All code lands on `implementation/phase-3de-webhook-rsvp-scanner`.
- One commit per sub-step labeled `[PHASE-3d.N]` or `[PHASE-3e.N]`.
- Smoke specs land in `docs/implementation/phase-3de-smoke-tests/` and run live against staging Atlas.
- Update `PHASE_3de_PROGRESS.md` after every commit. `PHASE_3de_REPORT.md` is written at the end.
- File ownership: no two parallel sub-agents touch the same file. The plan commit declares ownership.
- BSON gotcha (carried from Phase 1+2): when writing smoke specs that compare cached idempotency responses, assert on core fields (id, status, key data), not deep-equal entire bodies.
- AuditLog `targetType` enum is **lowercase** (Phase 3a gotcha). Use `'staff_access_token'`, `'guest_access_token'`, `'rsvp'`, `'event'`, `'subscription'`, etc.
- All new endpoints use existing RBAC middleware. Don't reinvent permission checks. Grep for the host/whitelabel-admin pattern used by similar endpoints in `events.controller.js` and reuse.
- Idempotency middleware has a documented BSON contract: error instances flatten on cache replay. Test happy path and replay; fault-injection tests are documentary, not assertion-rich.
- No `git add -A`. Use targeted `git add <specific file>` per commit (carried-anomaly: ~70 untracked files in working tree, plus inner `labbe-backend-` repo).
- If a sub-task surfaces an out-of-scope finding, write it to `IMPLEMENTATION_LEDGER.md` under the appropriate hand-off section. Don't fix in 3de.

## 4. Process

### Step 1 — Pre-flight + branch cut + plan commit

```
git fetch --all
git checkout audit/pre-production
git pull
git log --oneline -5                                # confirm phase-3abc-merged is HEAD or recent
git tag --list | grep phase-3abc-merged             # confirm tag exists
git checkout -b implementation/phase-3de-webhook-rsvp-scanner
```

Confirm env vars are set in `config.env`:
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- `WHATSAPP_APP_SECRET`

If any missing, stop and ask Peter.

Create `docs/implementation/PHASE_3de_PLAN.md` with:
- Sub-track summary (3d.1–3d.4, 3e.1–3e.4)
- Locked decisions D1–D8 (copy verbatim from this prompt)
- File ownership map (which sub-task touches which files)
- Parallelism map (see "Parallelism" below)

Create `docs/implementation/PHASE_3de_PROGRESS.md` with the empty checkbox table for the 8 sub-tracks.

Create `docs/implementation/PHASE_3de_NOTES.md` with two stub sections:
- "Stats polling cadence" (filled in 3d.4)
- "GuestAccessToken expiry migration" (filled in 3e.4)

Commit: `[PHASE-3de-PLAN] plan + progress + notes + branch cut. Locks D1–D8.`

**Parallelism map (declared in plan commit):**

| Sub-task | Track | Files (primary) | Parallel-safe with |
|----------|-------|-----------------|--------------------|
| 3d.1 — HMAC verify + specs | A1 | `messaging.controller.js` (read), new spec | A2, A4, B1, B2, (B3+B4) |
| 3d.2 — RSVP idempotency | A2 | `rsvp.controller.js`, `rsvp.service.js`, new spec | A1, A4, B1, B2, (B3+B4) |
| 3d.3 — Webhook dedup | A3 | `messaging.controller.js` (write), `messaging.service.js`, new spec | sequential after A1 (same file) |
| 3d.4 — Stats polling UI | A4 | web + mobile stats components, NOTES.md | A1, A2, B1, B2, (B3+B4) |
| 3e.1 — Staff token revoke | B1 | `StaffAccessTokenModel.js`, staff routes, new spec | A1, A2, A4, B2, (B3+B4) |
| 3e.2 — Check-in idempotency | B2 | scanner/checkin controller, new spec | A1, A2, A4, B1, (B3+B4) |
| 3e.3+3e.4 — QR rotate + GAT expiry | B3+B4 | `GuestAccessTokenModel.js`, guest-access routes, new specs, migration script | A1, A2, A4, B1, B2 |

Six max-parallel sub-agents. A3 is the only forced-sequential gate (same file as A1).

---

### Step 2 — 3d.1: HMAC verification confirm + smoke specs (sub-agent A1)

**Files:** `src/modules/messaging/messaging.controller.js` (read-only — verify Phase 0 work), `docs/implementation/phase-3de-smoke-tests/webhook-hmac.spec.js` (new).

**Task:**
1. Read `messaging.controller.js` and locate the webhook handler. Verify the HMAC block matches D1: rejects when env var is unset, when signature header is absent, when signature mismatch. If it doesn't, fix-forward and note prominently in the commit message.
2. Write `webhook-hmac.spec.js` with 4 scenarios:
   - `WHATSAPP_APP_SECRET` unset → 401. (If unsetting in test env is infeasible, write a unit-style assertion that the env-unset code path returns 401 — flag in the report.)
   - Signature header missing → 401.
   - Signature mismatch → 401.
   - Valid signature → 200 with normal webhook handling.
3. Run live; expect 4/4 pass.

Commit: `[PHASE-3d.1] webhook HMAC fail-closed verified + 4 smoke scenarios (PIPELINE-F02 / FLOW-18-F01)`.

---

### Step 3 — 3d.2: RSVP submit idempotency (sub-agent A2 — parallel with A1)

**Files:** `src/modules/rsvp/rsvp.controller.js` (or wherever `submitRSVP` lives — grep first), `src/modules/rsvp/rsvp.service.js`, `docs/implementation/phase-3de-smoke-tests/rsvp-idempotency.spec.js` (new).

**Task:**
1. Grep for `submitRSVP` to find the request handler.
2. Wire the existing `idempotencyMiddleware` to the RSVP submit route. Key strategy per D2: include `eventId`, `guestId`, and `rsvpChoice`. The middleware accepts an `Idempotency-Key` header from clients; if absent, derive the key server-side from `crypto.createHash('sha256').update(\`${eventId}:${guestId}:${rsvpChoice}\`).digest('hex').slice(0, 32)`.
3. Smoke spec scenarios (3):
   - First RSVP submit → 200, persisted, host notification fires.
   - Same submit again → 200 cached response, no double-write, no second host notification.
   - Different `rsvpChoice` for same guest+event → 200, new write, host notification fires (fresh response, not cached).
4. Run live; expect 3/3 pass.

Commit: `[PHASE-3d.2] FLOW-19-F02: RSVP submit idempotency wired (key: rsvp:<eventId>:<guestId>:<choice>, 24h TTL)`.

---

### Step 4 — 3d.3: Webhook duplicate-notification dedup (sub-agent A3 — sequential after A1)

**Files:** `src/modules/messaging/messaging.controller.js` (write), `src/modules/messaging/messaging.service.js`, `docs/implementation/phase-3de-smoke-tests/webhook-dedup.spec.js` (new).

**Task:**
1. In the webhook handler, after HMAC verification succeeds, derive a dedup key per D3: prefer `payload.messageId`; fallback to a SHA256 hash of `${eventId}:${guestId}:${statusType}:${Math.floor(Date.now() / 30000)}`.
2. Use the idempotency utility (`getOrCreateIdempotencyRecord(key, ttlSeconds: 86400)`). If a record already exists, **skip the host notification dispatch** but still update the delivery-status field on the guest doc (last-write-wins on delivery state).
3. Smoke spec scenarios (2):
   - Same webhook payload fired twice within 30s (no `messageId`, falls back to bucket key) → status updated, host notified once.
   - Same webhook payload fired twice with `messageId` → status updated, host notified once (`messageId` path).
4. Run live; expect 2/2 pass.

Commit: `[PHASE-3d.3] FLOW-18-F02: webhook host-notification dedup (messageId or 30s bucket key, 24h TTL)`.

---

### Step 5 — 3d.4: Stats polling UI (sub-agent A4 — parallel with A1/A2)

**Files:**
- Web: `labbe/app/[lang]/host/events/[eventId]/...` — locate the stats query/fetch hook (likely React Query or SWR).
- Mobile: `halla-mobile/components/...` — equivalent stats screen.
- `docs/implementation/PHASE_3de_NOTES.md`.
- `docs/implementation/phase-3de-smoke-tests/stats-polling.spec.js` (new, web only).

**Task:**
1. Web: identify the stats hook. Add a `refetchInterval` driven by `event.status` per D4. When status flips, the interval adapts on next render. On unmount or status flipping out of `live`/`completed`, cancel cleanly. Cancel any in-flight request before re-polling (use `AbortController` or query-key invalidation, depending on the existing pattern).
2. Mobile: equivalent — `useEffect` interval timer keyed off `event.status`, cleanup on unmount.
3. Add to `PHASE_3de_NOTES.md` → "Stats polling cadence" section: the table from D4, plus a note on how to override the interval for debugging.
4. Smoke spec (Playwright, web only):
   - Mount stats page for a `live` event. Use a network interceptor to count `GET /events/:id/stats` requests over a 90-second window. Assert ≥3 polls.
   - Flip `event.status` to `completed` (DB direct or test endpoint). Observe the interval extend — assert via timer cadence, not a full 5-min wait. Timing-sensitive, so use a 30s observation window post-flip and assert exactly 0 or 1 polls within that window.
5. Mobile e2e is out of scope here — covered later in Phase 4. Document expected behavior in `PHASE_3de_NOTES.md`.
6. Run live; expect 1/1 web spec to pass.

Commit: `[PHASE-3d.4] stats: client-side polling cadence (30s live / 5min completed) + web smoke`.

---

### Step 6 — 3e.1: Staff token revocation endpoint (sub-agent B1 — parallel with all 3d tracks)

**Files:** `models/StaffAccessTokenModel.js` (or wherever it lives — grep), staff routes (likely `src/modules/staff/...` or under events), staff auth middleware, `docs/implementation/phase-3de-smoke-tests/staff-revoke.spec.js` (new).

**Task:**
1. Add fields to `StaffAccessTokenModel`: `revoked: { type: Boolean, default: false }`, `revokedAt: Date`, `revokedBy: { type: ObjectId, ref: 'User' }`.
2. Update the staff auth middleware that validates `StaffAccessToken` to reject revoked tokens with 401.
3. New endpoint `POST /events/:eventId/staff/:staffId/revoke`. RBAC: host (event creator) or whitelabel-admin. Returns 200 with `{ revoked: true, revokedAt }`. Audit log entry: `targetType: 'staff_access_token'`, `action: 'revoke'`, `targetId: staffAccessToken._id`.
4. Smoke spec scenarios (4):
   - Host revokes their own staff token → 200, subsequent scan attempt with that token → 401.
   - Whitelabel-admin revokes a host's staff token → 200.
   - Non-host non-admin tries to revoke → 403.
   - Revoke an already-revoked token → 200 (idempotent at action level — same final state).
5. Run live; expect 4/4 pass.

Commit: `[PHASE-3e.1] FLOW-20-F01: staff access token revocation endpoint + 401 on revoked token`.

---

### Step 7 — 3e.2: Check-in idempotency (sub-agent B2 — parallel with B1)

**Files:** `src/modules/scanner/scanner.controller.js` or `src/modules/checkin/...` (grep), `docs/implementation/phase-3de-smoke-tests/checkin-idempotency.spec.js` (new).

**Task:**
1. Wire idempotency middleware to the check-in endpoint. Derive key per D6: `checkin:${eventId}:${guestId}`. Don't require an `Idempotency-Key` header — the eventId+guestId pair is canonical.
2. The cached success response includes the original `checkedInAt` and an `alreadyCheckedIn: true` flag for replay. First check-in returns `alreadyCheckedIn: false`.
3. Update the controller to surface `alreadyCheckedIn` on the response so the scanner UI can render the right state ("Checked in" vs "Already checked in at HH:MM").
4. Smoke spec scenarios (3):
   - First check-in → 200, `alreadyCheckedIn: false`, `checkedInAt` set.
   - Same check-in 100ms later → 200, `alreadyCheckedIn: true`, same `checkedInAt`.
   - Different guest → 200, fresh check-in.
5. Run live; expect 3/3 pass.

Commit: `[PHASE-3e.2] FLOW-20-F03: check-in idempotency (key: checkin:<eventId>:<guestId>, 24h TTL, alreadyCheckedIn flag)`.

---

### Step 8 — 3e.3+3e.4: Guest QR rotation + GuestAccessToken expiry/revocation (sub-agent B3+B4 merged)

**Why merged:** both touch `GuestAccessTokenModel` and the guest-access validation middleware. Single sub-agent, two commits within the agent (3e.3 then 3e.4) for traceability.

**Files:** `models/GuestAccessTokenModel.js`, guest-access middleware, guest-access routes, `scripts/backfill-guest-access-token-expiry.js` (new), 2 smoke specs.

**Task — 3e.3 (rotation, lands first):**

1. Add fields to `GuestAccessTokenModel`: `revoked: { type: Boolean, default: false }`, `revokedAt: Date`, `revokedBy: { type: ObjectId, ref: 'User' }`.
2. Update guest-access validation middleware: revoked tokens return **410 Gone** with body `{ reason: 'qr_rotated', message: '...' }` when `revokedReason === 'rotation'`, else `{ reason: 'qr_revoked', message: '...' }`. Track the reason via a discriminator field on the doc (`revokedReason: 'rotation' | 'manual'`).
3. New endpoint `POST /events/:eventId/guests/:guestId/rotate-qr`. RBAC: host or whitelabel-admin.
   - Find current `GuestAccessToken` for guest+event.
   - Set `revoked: true`, `revokedAt: now`, `revokedBy: req.user._id`, `revokedReason: 'rotation'`.
   - Generate a new `GuestAccessToken` with a fresh value.
   - Return 200 with `{ qrUrl, expiresAt }`.
   - Audit log: `targetType: 'guest_access_token'`, `action: 'rotate'`.
4. Smoke spec `guest-qr-rotate.spec.js` scenarios (3):
   - Host rotates → 200, new QR returned.
   - Old QR scan attempt → 410 Gone with `reason: 'qr_rotated'`.
   - New QR scan attempt → 200, valid.

Commit: `[PHASE-3e.3] FLOW-18-F03: guest QR rotation endpoint + revoked-token 410 Gone`.

**Task — 3e.4 (expiry + manual revocation, lands on top of 3e.3):**

5. Add `expiresAt: Date` field. Default for new tokens: `event.eventDate + 90 days` if event.eventDate is known, otherwise `createdAt + 90 days`.
6. Validation middleware: reject expired tokens (`now > expiresAt`) with 410 Gone, `{ reason: 'qr_expired' }`.
7. New endpoint `POST /events/:eventId/guest-access/:guestId/revoke` (manual revocation, distinct from rotation). RBAC: host or whitelabel-admin. Sets `revoked: true`, `revokedReason: 'manual'`. Returns 200; subsequent scans → 410 Gone, `{ reason: 'qr_revoked' }`. Audit log: `action: 'revoke'`.
8. Migration script `scripts/backfill-guest-access-token-expiry.js`:
   - Find all `GuestAccessToken` docs with no `expiresAt`.
   - Set `expiresAt = createdAt + 365 days`.
   - Print `--dry-run` mode count vs `--apply` mode count.
   - Idempotent: second run reports 0 affected.
   - **Do NOT run from this prompt.** The Phase 3de close-out prompt runs and verifies it.
9. Document the migration in `PHASE_3de_NOTES.md` → "GuestAccessToken expiry migration" section.
10. Smoke spec `guest-access-expiry.spec.js` scenarios (4):
    - Token with valid `expiresAt` scanned → 200.
    - Token with `expiresAt < now` scanned → 410 Gone, `reason: 'qr_expired'`.
    - Manual revocation → 200; subsequent scan → 410 Gone, `reason: 'qr_revoked'`.
    - Migration script idempotency: dry-run reports N tokens affected (using a small test fixture), second dry-run reports 0.

Commit: `[PHASE-3e.4] FLOW-21-F03: GuestAccessToken expiresAt + manual revocation + 410 Gone validation + backfill script`.

Run both 3e.3 + 3e.4 smoke specs live; expect 3/3 + 4/4 pass.

---

### Step 9 — Phase 3de full smoke regression

```
npx playwright test docs/implementation/phase-3de-smoke-tests/
```

Expected: all 8 specs pass (4+3+2+1+4+3+3+4 across the sub-tracks).

Then run prior-phase regression to confirm no break:

```
npx playwright test docs/implementation/phase-3abc-smoke-tests/
npx playwright test docs/implementation/phase-2-smoke-tests/
node docs/implementation/phase-1-smoke-tests/auth-1a.mjs
node docs/implementation/phase-1-smoke-tests/timezone.js
npx playwright test docs/implementation/phase-1-smoke-tests/
```

If any regression fails:
- If the fix is small and obvious (≤10 LOC, clear cause), fix-forward with a `[PHASE-3de-FIXFWD]` commit and re-run.
- Otherwise stop and ask Peter.

---

### Step 10 — Update progress + write report

Update `PHASE_3de_PROGRESS.md` with all 8 sub-tracks marked done, smoke results, anomalies, hand-offs surfaced.

Write `PHASE_3de_REPORT.md` mirroring the `PHASE_3abc_REPORT.md` format:
- Sub-track summary table
- Git operations log (commit-by-commit)
- Findings closed table (FLOW IDs, severity, commits)
- Smoke results (Phase 3de + regression)
- Deviations from this prompt (if any)
- Drive-by fixes (if any)
- Anomalies surfaced
- Hand-offs to Phase 4 (mobile parity — likely staff revoke UI, QR rotate UI, revoke UI)
- Hand-offs to Phase 5 (audit log everywhere, etc.)

Update `IMPLEMENTATION_LEDGER.md`:
- FLOW-18-F01 / PIPELINE-F02 → closed in PHASE_3d.1 (verification close; original code-change close was Phase 0)
- FLOW-18-F02 → closed in PHASE_3d.3
- FLOW-19-F02 → closed in PHASE_3d.2
- (Stats polling — note in ledger as "closed in PHASE_3d.4 (UX, no audit FLOW ID)")
- FLOW-20-F01 → closed in PHASE_3e.1
- FLOW-20-F03 → closed in PHASE_3e.2
- FLOW-18-F03 → closed in PHASE_3e.3
- FLOW-21-F03 → closed in PHASE_3e.4

## 5. STOP gate

Output exactly the following block, filled in:

```
STOP — Phase 3de complete

Branch: implementation/phase-3de-webhook-rsvp-scanner
Commits: <list of [PHASE-3d.*] and [PHASE-3e.*] SHAs in order>

Findings closed (8):
- FLOW-18-F01 / PIPELINE-F02 (webhook HMAC fail-closed verified + smoke specs)
- FLOW-18-F02 (webhook host-notification dedup)
- FLOW-18-F03 (guest QR rotation)
- FLOW-19-F02 (RSVP submit idempotency)
- FLOW-20-F01 (staff token revocation endpoint)
- FLOW-20-F03 (check-in idempotency)
- FLOW-21-F03 (GuestAccessToken expiry/revocation)
- (Stats polling — UX, no FLOW ID)

Smoke tests:
- Phase 3de specs: <pass>/<total>
- Phase 3abc regression: <pass>/<total>
- Phase 2 regression: <pass>/<total>
- Phase 1 regression: <pass>/<total>

Files produced:
- docs/implementation/PHASE_3de_PLAN.md
- docs/implementation/PHASE_3de_PROGRESS.md
- docs/implementation/PHASE_3de_REPORT.md
- docs/implementation/PHASE_3de_NOTES.md
- docs/implementation/phase-3de-smoke-tests/* (8 specs)
- scripts/backfill-guest-access-token-expiry.js (NOT YET RUN — handed to close-out)

Issues encountered:
- <list with resolutions, or "none">

Drive-by fixes:
- <list, or "none">

Anomalies surfaced:
- <list, or "none">

Hand-offs to Phase 4:
- <list>

Hand-offs to Phase 5:
- <list>

Phase 3de status: COMPLETE
Ready for Phase 3de close-out prompt (merge to audit/pre-production + run migration + final report).
```

Then stop. Do not merge to `audit/pre-production` — the close-out prompt handles that.

## 6. If something goes wrong

- **Phase 0 HMAC code doesn't match D1 policy:** fix-forward in 3d.1, document prominently in commit message and report. Don't block the phase.
- **Idempotency middleware crashes on RSVP submit replay:** check the BSON contract docstring in `src/shared/utils/idempotency.js`. Likely the response includes a Mongoose subdocument that's misbehaving. Convert to plain object via `.toObject()` before returning. If still crashing, isolate with a smaller test request and confirm Phase 1 idempotency tests still pass.
- **Staff token model field collision (`revoked` already used elsewhere):** namespace as `revokedStatus` and `revokedStatusAt`. Document in the report.
- **Test env doesn't allow unsetting `WHATSAPP_APP_SECRET`:** write a unit-style test for the env-unset branch that mocks `process.env`. Flag in the report under deviations.
- **Mobile screens for guest QR rotation / staff revocation / manual revoke don't exist yet:** scope Phase 3de to backend + web only; mobile UI for these is a Phase 4 hand-off. Document explicitly in the report.
- **`event.status` flip in stats polling spec is timing-flaky:** widen the observation window; if still flaky, mark as `test.fixme` and document. Don't block the phase on test flake.
- **Migration script anomaly (duplicate `expiresAt` field, MongoDB write conflict on backfill):** don't run the script (the prompt doesn't anyway). Land it as NOT-RUN. The close-out prompt runs and verifies it on a quiet window.
- **A finding turns out to span more than its track:** note in the report's "Anomalies surfaced" section and add to `IMPLEMENTATION_LEDGER.md` under the next phase's hand-off list. Don't expand 3de scope mid-session.

Begin.
