# Halla — Master Implementation Plan

**Status:** Draft. Subject to Peter's approval before any code is written.

**Scope:** All 131 audit findings closed before production launch. Solo execution with Claude Code, sub-agents for parallelism within phases.

**Launch target:** When ready (no fixed date). Optimize for completeness over speed.

---

## 1. The six phases

| Phase | Name | Estimated duration | Findings closed |
|-------|------|--------------------|-----------------|
| 0 | Stop the bleeding | 1–2 days | 2 (TENANT-F01, PIPELINE-F02 hardening) |
| 1 | Foundations | 2–3 weeks | ~25 |
| 2 | Subscriptions, addons, plans | 1 week | ~15 |
| 3 | RSVP pipeline coherence | 2–3 weeks | ~40 |
| 4 | Mobile parity + admin gaps | 1.5 weeks | ~25 |
| 5 | Audit log activation + edges + polish | 1–1.5 weeks | ~24 |

**Total estimated duration:** 9–12 weeks of focused solo work. Real elapsed time depends on how many hours/day you can put in.

---

## 2. Phase descriptions

### Phase 0 — Stop the bleeding

**Goal:** Close the two confirmed-real security holes that shouldn't sit in code another day.

**Findings:**
- **TENANT-F01** — `filterByWhitelabel` returns `whitelabelId: null` for ADMIN and MODERATOR, granting cross-tenant access. Verified real (line 49–52 of `whitelabel.js`). Fix: assign each ADMIN/MODERATOR a `whitelabelId` at creation; scope them to their assigned tenant.
- **PIPELINE-F02 / FLOW-18-F01** — Webhook HMAC fails open if `WHATSAPP_APP_SECRET` is unset or signature header is absent. Fix: require env var at startup, fail closed on missing or invalid signature.

**Why it's a separate phase:** Both are critical security issues, both are small in scope, both are independent of every other finding. Fixing them today validates the workflow (progress files, sub-agent orchestration, stop gate review) before the bigger phases run.

**Parallelism:** Two independent fixes, two parallel sub-agents.

**Stop gate criteria:** Both fixes implemented, manually verified, no test failures, progress files written.

---

### Phase 1 — Foundations

**Goal:** Build the shared utilities that Phases 2–5 depend on. Everything else is faster and cleaner if these land first.

**Foundations to build:**

1. **Auth redesign** — short-lived access token (15 min) + rotating refresh token (30 days), server-side revocation, mobile uses `expo-secure-store`, web uses HttpOnly cookies for refresh. Closes FLOW-01-F01 through F07, FLOW-05-F01, FLOW-06-related findings.

2. **Idempotency utility** — a single utility (likely a Mongo collection with TTL + key-hash function) used by every external side effect. Closes idempotency findings across Taqnyat sends, RSVP submissions, addon purchase, password reset, notifications.

3. **Moyasar payment scaffold** — a `paymentProvider.charge()` interface with a stub implementation that returns synthetic success when keys are absent, and a real implementation gated on `MOYASAR_API_KEY`. Closes payment-placeholder findings in subscription, addon, and plans flows. Real Moyasar integration is its own follow-up ticket once you have keys.

4. **S3 file storage utility** — replace local filesystem writes (`uploads/portfolios/`, avatar paths, etc.) with S3-backed multer middleware. One utility used by all upload paths. Closes FLOW-03-F03, FLOW-07-F02, FLOW-07-F03.

5. **Audit log middleware** — Express middleware that wraps sensitive writes and records to `AuditLogModel`. Lays the groundwork for Phase 5 to wire it everywhere, but the middleware itself lands here. Doesn't close findings yet — those close in Phase 5.

6. **Timezone-aware datetime utility** — store all timestamps as UTC ISO strings in MongoDB, convert to user timezone on the frontend at display time. Backend never assumes server timezone. Closes PIPELINE-F05 and prevents an entire category of bugs.

7. **Drop the `/api` non-versioned mount** — small, but a foundation: every other route work assumes only `/api/v2` exists. Closes FLOW-01-F04.

**Why this ordering:** Auth must come first because every other endpoint depends on it. Idempotency, payment, S3, and audit-log middleware are independent of each other and of auth — they can run in parallel. Timezone utility is independent of all of the above. `/api` mount removal lands last in the phase to avoid disrupting other in-flight work.

**Parallelism:**
- Track A (sequential): auth redesign — backend → web → mobile.
- Track B (parallel with A): idempotency utility, S3 utility, audit log middleware, timezone utility, payment scaffold. Five sub-agents on five different module trees.
- Track C (after A and B): `/api` mount removal.

**Stop gate criteria:** All seven foundations land, with a smoke test for each. Auth flow works end-to-end on web and mobile. Idempotency utility is callable from a test endpoint. S3 utility uploads a test file to a real bucket. Audit log middleware writes to `AuditLogModel` from a test write. Timezone utility round-trips a date correctly across web/backend/mobile. Payment scaffold returns success in stub mode.

---

### Phase 2 — Subscriptions, addons, plans

**Goal:** Fix the subscription/quota/payment flow now that foundations exist. Unblocks event creation logic.

**Findings clusters:**
- Concurrent subscription bug (FLOW-09-F02) — sort order in `findActiveForUser`.
- Expiry cron (FLOW-09-F03) — add status transition to `expired`.
- Admin-assign endpoint (FLOW-09-F04) — new endpoint with audit log.
- Addon activation pipeline (FLOW-10-F01) — wire payment scaffold + activation + quota update.
- Addon scope handling (FLOW-10-F02) — branch on `scope` field.
- Addon idempotency (FLOW-10-F03) — use idempotency utility.
- Plan CRUD endpoints (FLOW-08-F01) — add POST/DELETE.
- Plan update validation guard (FLOW-08-F02) — block destructive limit reductions.
- Plan update audit log (FLOW-08-F03) — wire audit middleware.

**Parallelism:**
- Subscription work, addon work, and plan work are independent — three parallel sub-agents.
- Within each, backend before frontend, web and mobile can run in parallel after backend lands.

**Stop gate criteria:** Subscription upgrade test passes (host upgrades, new quota applied). Addon purchase end-to-end test passes (purchase → activate → quota update). Plan CRUD reachable from admin dashboard.

---

### Phase 3 — RSVP pipeline coherence

**Goal:** The big one. Make the entire event-creation-to-post-event pipeline correct end-to-end.

This phase touches the most code and has the highest risk of regressions, so it gets the most stop-gate discipline. Sub-phases:

**3a. Pipeline ordering and atomicity (1 week)**
- PIPELINE-F01 — send-then-mark-live ordering. Await `sendBulk()` before status flip.
- PIPELINE-F03 — transactional pool debit. Use MongoDB transaction or compensating returnInvites on save failure.
- PIPELINE-F04 — add `failed` status to event enum.
- PIPELINE-F05 — timezone-aware launch cron (uses Phase 1 utility).
- Event-level send lock — prevent dual cron tick races.

**3b. Bulk dispatch correctness (1 week)**
- FLOW-17 batched parallel dispatch (replaces 100ms sequential loop, uses Phase 1 idempotency utility).
- FLOW-21-F01 same fix for post-event bulk access emails.
- Idempotency keys on every Taqnyat send.

**3c. Launch failure flow (3–4 days)**
- 24h pre-send retry window with retry cron.
- On exhaustion: `event.status = 'failed'`, notify host + admin + super admin, dedicated "we are sorry" UI on web and mobile.
- Manual retry button (host or admin can trigger) — Peter to confirm ownership in pre-Phase-3 review.

**3d. Webhook + RSVP correctness (3–4 days)**
- HMAC fail-closed (already done in Phase 0, but this sub-phase verifies and adds tests).
- RSVP idempotency (FLOW-19-F02).
- Webhook duplicate-notification dedup (FLOW-18-F02).
- Stats refresh strategy — Peter to confirm polling interval per Type C decision.

**3e. Scanner + post-event (3–4 days)**
- Staff token revocation endpoint (FLOW-20-F01).
- Check-in idempotency (FLOW-20-F03).
- Guest QR rotation endpoint (FLOW-18-F03).
- Post-event content GuestAccessToken expiry/revocation (FLOW-21-F03).

**Parallelism:** 3a is sequential within itself (each fix depends on the previous). 3b, 3c, 3d, 3e can run in parallel after 3a lands. Each sub-phase has its own progress file.

**Stop gate criteria:** End-to-end test of one event from creation through post-event passes on web and mobile. Specifically: create event, schedule launch, send fires correctly, RSVP buttons update stats, scanner check-in works, post-event content publishes, all timestamps correct in non-Saudi timezone.

---

### Phase 4 — Mobile parity + admin gaps

**Goal:** Close the parity gaps and admin-side gaps that aren't pipeline-critical.

**Findings clusters:**
- Mobile event creation wizard step 5 (template confirm + launch settings).
- Mobile ticket assignment UI (FLOW-23-F03).
- Mobile exports (FLOW-23-F04, FLOW-28 findings).
- Whitelabel post-approval setup-password on mobile.
- Mobile pagination across all list screens.
- Mobile request timeouts.
- Mobile error boundary.
- Mobile RTL via `I18nManager.forceRTL(true)`.
- Mobile Arabic numerals (`toLocaleString('ar-SA')`).
- Centralized auth token interceptor.

**Parallelism:**
- Wizard step 5 is one sub-agent (touches multiple files but coordinated).
- Each other gap is an independent sub-agent.
- Up to 5 parallel agents safely.

**Stop gate criteria:** Mobile parity matrix shows zero gaps for in-scope features. Admin tickets workable from mobile. All admin lists paginate correctly.

---

### Phase 5 — Audit log activation + edges + polish

**Goal:** Wire audit log everywhere, close all remaining Mediums and Lows.

**Phase 5a — Audit log wiring**
Walk the audit log policy from Phase 1 + Gate-1 #10. Every sensitive write gets the middleware. Specifically: every admin action, every status transition on event/subscription/ticket/vendor, every assignment, every delete, every plan update, every payment.

**Phase 5b — Edge cases**
The remaining Mediums grouped by category: validation gaps, performance issues that aren't pipeline-critical, parity nits.

**Phase 5c — Polish**
The 15 Lows. Polish, naming, dead code removal, redundant routes.

**Parallelism:** 5a is sequential (one writer per file to avoid conflicts). 5b and 5c can run in parallel after 5a.

**Stop gate criteria:** Audit log shows entries for every sensitive write tested. All findings marked closed in `IMPLEMENTATION_LEDGER.md`. Optionally: re-run the audit (or a subset) to confirm zero new findings introduced by fixes.

---

## 3. Progress and continuity convention

Long phases will exceed a single Claude Code session's context. To keep continuity across sessions:

**Per phase, three files:**
- `docs/implementation/PHASE_<N>_PLAN.md` — written at phase start. Detailed task breakdown, file paths, finding IDs, sub-agent assignments, parallelism map.
- `docs/implementation/PHASE_<N>_PROGRESS.md` — updated continuously. What's done, what's in flight, what's blocked. Updated after every meaningful milestone (every commit-worthy change).
- `docs/implementation/PHASE_<N>_REPORT.md` — written at phase end. What landed, what deviated from plan, what's open, hand-off notes for the next session.

**Cross-phase ledger:**
- `docs/implementation/IMPLEMENTATION_LEDGER.md` — single source of truth listing every finding ID and its status: `not started` | `in progress` | `closed in PHASE_N` | `deferred (reason)`. Updated at every phase end.

**Session-jumping rules:**
- New session starts by reading `IMPLEMENTATION_LEDGER.md` + the current phase's `PROGRESS.md`.
- Old session ends by updating both files with current state.
- No work begins until the new session confirms its understanding of where the previous session stopped.

---

## 4. Sub-agent parallelism — the rule

In every phase prompt, work is classified as:

- **Sequential** — touches the same file as another task, or depends on another task's output. Runs one at a time in the main session.
- **Parallel-safe** — touches different files than other parallel tasks, no dependency. Dispatched to a sub-agent. Main session reviews each sub-agent's diff before merging.

Two parallel sub-agents must never edit the same file. The main session enforces this by tracking file ownership in the phase plan. If two findings touch the same file, they collapse into one task.

---

## 5. Findings that are low-value to fix before launch (but in scope per product owner)

This section exists so Peter has data to discuss with the product owner if priorities shift. Fixing these still happens per the product owner's request, but they are the ones where the cost-of-fix is high relative to the cost-of-not-fixing-yet:

- **Bulk admin operations on mobile** (rating updates, bulk delete, bulk suspend) — web has full UI, mobile would need significant new screens. Real users do these from desktops.
- **Marketplace search filters polish** — vendors are findable; nicer filters are quality-of-life.
- **Notifications preferences UI on mobile** — settings exist, defaults are fine for most users.
- **Some Low polish items** — naming consistency, dead route removal, internal-only.

If you want, after Phase 4 wraps, we can revisit whether to push these into a post-launch fast-follow. But the master plan as written closes them all in Phase 5.

---

## 6. What's not in this plan (intentional)

- **Test infrastructure.** You decided in earlier conversation to skip the test phases. This plan does not include writing Playwright/Maestro/Jest tests. Smoke tests during stop gates are manual. We can revisit after launch.
- **Observability rollout.** A separate prompt drafted earlier produced an observability plan. Implementation of that plan is its own work, not part of this 131-finding closure.
- **Performance optimization beyond what's in audit findings.** No premature optimization. If the audit didn't flag it, it's not in scope here.
- **New features.** Anything that wasn't audited isn't here.

---

## 7. Approval gate

Before any Phase 0 code is written, Peter approves:

1. The phase ordering and scope above.
2. The progress file convention (PLAN/PROGRESS/REPORT per phase, plus IMPLEMENTATION_LEDGER).
3. The sub-agent parallelism rule.
4. The estimated duration (9–12 weeks).
5. The list in section 5 (low-value findings) — confirm fixing all anyway, or push some to post-launch.

After approval, Phase 0 prompt runs. Subsequent phase prompts are written after the previous phase's report file is reviewed.
