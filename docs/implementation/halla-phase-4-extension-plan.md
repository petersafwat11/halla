# Halla — Phase 4 Extension Master Plan (4b / 4c / 4d)

**Status.** Draft. Awaiting Peter's decisions in §3 before any Claude Code prompt is written.

**Background.** Phase 4 closed the mobile-parity / admin-gap findings from the original 131-finding audit (see `PHASE_4_FINAL_REPORT.md`). After Phase 4 shipped, six inventory passes were run to map work that sat outside the original audit but is required before launch — covering correctness, tier consistency (host / admin / whitelabel), and the visual + Taqnyat template system. Those inventories are files 01 through 06 (also in `SESSION_1_PROGRESS.md` and `SESSION_2_PROGRESS.md`).

**Scope of this plan.** All gaps surfaced in inventories 01–06, organized into three sub-phases (4b, 4c, 4d) with parallelism map, stop gates, and per-tier impact. No new features beyond what the inventories surfaced.

**Out of scope.** Phase 5 (audit log + edges + polish) stays untouched. Test infrastructure remains skipped per earlier decision. Real Moyasar integration is still its own follow-up.

---

## 1. The three sub-phases

| Phase | Name | Estimated duration | Key deliverable |
|-------|------|--------------------|-----------------|
| 4b | Tier consistency + UX gates | 1.5 weeks | Host / admin / whitelabel see consistent stats, edit flows, and schedule buttons. Admin can dispatch whitelabel setup-password email. |
| 4c | Template system unification | 2–2.5 weeks | Hardcoded SVG templates replaced with the DB-driven flow end-to-end (backend, web wizard, mobile wizard, dynamic Taqnyat var mapping). |
| 4d | Mobile update flow + create-event correctness | 1 week | Mobile gets the 4-step update wizard. Mobile create-event template field names normalized. Web/mobile schemas unified. |

**Total estimated duration:** 4.5–5 weeks of focused solo work.

**Sequencing rule.** 4b is independent and runs first. 4c starts after 4b's stop gate passes. 4d starts after 4c's stop gate passes — 4d's mobile work depends on the `renderField` + dynamic template plumbing that 4c builds.

**Parallelism inside each phase.** Same convention as earlier phases: sub-agents on disjoint file sets, file ownership tracked in each phase's `PHASE_4{B|C|D}_PLAN.md`.

---

## 2. Sub-phase details

### Phase 4b — Tier consistency + UX gates

**Goal.** Make host, admin, and whitelabel see the same data and the same action buttons across web and mobile, with backend RBAC honoring all three tiers correctly. Ship the missing whitelabel-approval email dispatch UI. Carry the Phase 4 W2-STAFF block over the line.

**Findings closed (with inventory file ref):**

1. **Stats polling parity (01)**
   - Admin web `EventDetailsContent` adopts the same Phase 3d.4 cadence as host (30 s live / 5 min completed).
   - Admin web swaps the legacy `@/hooks/events` import for `@/hooks/reactQueryHooks/useEvents` to share the polling-aware hook.
   - Mobile `SingleEventStats` adopts polling — equivalent to web cadence (Phase 3d.4 is already wired in `EventsScreen.js`; SingleEventStats inherits the strategy).

2. **Stats RBAC for whitelabel tier (01)**
   - Backend `events.service.js` `isAdmin` check extended: `whitelabel_admin` and `whitelabel_moderator` are included for `GET /events/stats/:id` and `GET /events/:id`.
   - Whitelabel scoping: a whitelabel admin can read stats for events whose host's `whitelabelId` matches their own. Default scope per **D1**.

3. **Admin update-event page (03)**
   - `app/[lang]/admin-dash/update-event/page.js` currently renders `<UpdateEventContent />` shell. 4b lands the implementation: mirrors host wizard, RBAC already gated by `requirePageAccess("events", lang)`.
   - Whitelabel update-event page: same pattern, scoped by `whitelabelId`. Conditional on **D2**.

4. **Capacity-reduce guard (03)**
   - Backend `events.service.js` `updateGuestList`: reject with 400 if new guest count would drop below current `confirmed` RSVP count. Closes Bug #6.

5. **Launch settings exposed in update wizard (03)**
   - Web update wizard step 4 wires `launchSettings` (the backend endpoint `PATCH /:id/launch-settings` already exists; the form just doesn't dispatch it). Host can reschedule a send after creation.
   - Same change applied on the new admin and whitelabel update pages.

6. **Field-schema parity in update flow (03)**
   - `services/createAndUpdateEvents.js` continues normalizing `mobile`/`phone` and `moderatorsList`/`supervisorsList`. Verify, document, and unify on the backend names so the form-to-payload transform stays in one place.

7. **Schedule pipeline gates and failure UI (04)**
   - **Backend min-date validation on `POST /messaging/schedule`** — reject if `scheduledDate` is less than (now + 2 days), configurable. Mirrors the existing client-side rule that today is browser-only.
   - **Shared `useEventActionGate(event)` hook** — extract `canSendTest`, `canSchedule`, `canSubmitTemplate`, `hasSupervisors` from `EventActionsHeader.jsx` (web), `EventActionsHeader.js` (mobile), and `LastEvent.js` (mobile). One hook, three consumers.
   - **Failure UI on event detail page** — when `event.status === 'failed'`, web `EventStats` and mobile `SingleEventStats` render `failureReason`, `attemptCount`, and a "Manual Retry" button. The retry endpoint already exists from Phase 3c; UI never surfaced it.
   - **Partial-failure warning banner** — when `messagingStatus.failedCount > 0` but `event.status === 'live'`, surface a warning banner on the event detail page (web + mobile). Visibility only — no pipeline behavior change. Threshold per **D9**.

8. **Whitelabel setup-password admin dispatch (06)**
   - Add admin dashboard action: "Send setup-password email" button on the whitelabel detail page.
   - Backend handler:
     1. Calls `user.createPasswordSetupToken()` (already exists in `UserModel.js:545`).
     2. Constructs `setupPasswordUrl = ${frontend.url}/setup-password/${rawToken}`.
     3. Calls `emailModule.send.whitelabelApproval(user.email, { ...platformContext, setupPasswordUrl }, lang)` — the richer template (`whitelabels.js`), not the generic `passwordSetupEmail`.
   - Auto-send-on-approval vs button-only is **D5**.
   - Pre-flight: confirm web `/setup-password/{token}` page exists (inventory 06 §7 GAP 5).
   - Mobile setup-password screen already shipped in Phase 4 W3-WL — no work here.

9. **W2-STAFF carry-forward from Phase 4**
   - Add `GET /events/:eventId/staff-tokens` (host-scoped, returns active `StaffAccessToken` records with `_id`, `staffName`, `phone`, `isRevoked`).
   - Wire mobile staff-token revocation UI (Phase 4 already built the UI; was blocked on the missing list endpoint).

**Tier impact matrix (4b):**

| Concern | Host | Admin | Whitelabel admin |
|---------|------|-------|------------------|
| Stats polling | already done (Phase 3d.4) | NEW (web + mobile) | NEW (depends on D1) |
| Stats RBAC | already correct | already correct | NEW backend fix |
| Update-event page | already done | NEW (admin-dash/update-event) | NEW (depends on D2) |
| Capacity guard | NEW backend | NEW backend (same code) | NEW backend (same code) |
| Launch-settings in update | NEW web | NEW web | NEW web |
| Failure UI + retry | NEW web + mobile | NEW web + mobile (read-only per D8) | informational only (D8) |
| Setup-password dispatch | n/a | NEW admin button | receives email |
| Staff-token revoke (mobile) | NEW | n/a | n/a |

**Parallelism (4b):**
- **Track A — Backend (one sub-agent).** RBAC fix, capacity guard, schedule min-date validation, staff-tokens GET endpoint, whitelabel-approval dispatch handler.
- **Track B — Web (one sub-agent, parallel with A).** Admin update page, launch-settings in wizard step 4, failure UI, partial-failure banner, admin whitelabel dispatch button, shared `useEventActionGate` hook.
- **Track C — Mobile (one sub-agent, parallel with A and B).** `SingleEventStats` polling, failure UI, partial-failure banner, gate-hook consumer, staff-token list+revoke wiring.

3 sub-agents, no shared files. Coordinator merges A first (so B and C can integrate against the new endpoints), then B and C in any order.

**Stop gate (4b):**
- All three tiers can open an event detail page on web and see live stats with polling.
- Capacity reduction below confirmed RSVPs returns 400 with a clear error.
- Schedule for "tomorrow" rejected by backend.
- A failed event surfaces failure reason + manual retry on host's event page (web + mobile).
- Admin dispatches whitelabel setup-password email; whitelabel admin clicks button in email; password is set; whitelabel session works on web and mobile.
- Mobile staff-token list + revocation works end-to-end.
- IMPLEMENTATION_LEDGER.md updated.

---

### Phase 4c — Template system unification

**Goal.** Migrate from the hardcoded 3-template SVG flow to the DB-driven visual + Taqnyat template system end-to-end. Variable substitution becomes dynamic. Hosts pick from real DB templates on web and mobile.

**Findings closed (inventory 05 + 04 §gap-4):**

1. **`TaqnyatTemplateModel` + admin CRUD (05 critical-3, blocks dynamic substitution)**
   - New model: `name`, `taqnyatTemplateId`, `language`, `categorySlug` (FK → `TemplateCategoryModel.slug`), `varMapping[]` where each entry is `{ varIndex: 1..N, sourceKey: string, sourceType: enum["fieldKey","eventField","computed"] }`.
   - Admin CRUD: `GET/POST/PUT/DELETE /api/v2/admin/taqnyat-templates`.
   - Admin UI under `admin-dash/templates/taqnyat/` — list, edit, varMapping editor.
   - Whether mapping lives on a separate model or on `TemplateModel` itself is **D3**.

2. **Dynamic `_getEventBodyParams` (05 critical-2, 04 gap-4)**
   - `messaging.service.js` `_getEventBodyParams` (line 34) currently returns 4 hardcoded params. Replace with:
     1. Read the `TaqnyatTemplate` chosen for the event (`Event.messaging.taqnyatTemplateId`).
     2. For each `varMapping[i]`, resolve `sourceKey` against either the host's saved `template.fields[]` data (snapshot in `Event.invitationSettings.visualTemplate`) or `Event` model fields.
     3. Return ordered `{{1}} ... {{N}}` array.
   - Backward compat: events with no chosen `TaqnyatTemplate` fall back to the legacy 4-param behavior (so old events continue to send correctly during rollout).

3. **Web wizard StepThree wired to DB (05 critical-1)**
   - `host/create-event/_components/stepThree/StepThree.js`: drop the hardcoded `templates` array (currently 3 inline SVGs); fetch via `templatesService.getTemplates({ category })` (already implemented in the service layer).
   - `TemplatesCards.js`: thumbnail-first grid using `template.thumbnailUrl`, category filter chips above, search by `nameEn`/`nameAr`.
   - `StepThree.js` is reused by host create, admin create, admin update — all three consume the new flow.

4. **Web `TemplateForm` dynamic field renderer (05 gap)**
   - `templateForm/TemplateForm.jsx`: replace the static `templateFormSchema` with a `renderField(fieldDef, locale)` helper that maps the 9 field types (`text`, `textarea`, `date`, `time`, `color`, `font`, `number`, `email`, `password`) to the corresponding inputs.
   - Validation: dynamic Zod schema built from `template.fields[]` honoring `required`, `minLength`, `maxLength`, `min`, `max`, plus format checks for email, color (hex), and so on.
   - Locale-aware labels: `labelEn` / `labelAr` based on current locale; `dir: ltr|rtl|auto` honored on inputs.

5. **Wizard Taqnyat-template picker step (05 open-question 7)**
   - New step 3.5 (per **D4**): host picks a Taqnyat-approved template filtered by the visual template's `categories`. Required when the event will use the WhatsApp channel.
   - Stored on `Event.messaging.taqnyatTemplateId`.

6. **Mobile StepThree wired to DB (05 mobile)**
   - `halla-mobile/components/createEvent/StepThree.js`: same migration as web. Fetch `GET /templates`, render thumbnail grid, dynamic field form, dynamic preview.
   - `PreviewInvitation.js`: render overlays from `template.overlays[]` instead of fixed positions.

7. **Admin sidebar link (05 gap)**
   - Confirm `/admin-dash/templates` is in the admin sidebar nav. Add if missing.

8. **Seed initial DB templates (05 open-question 3)**
   - Run `scripts/seedInitialTemplates.js` on staging. Document the seeded set: Wedding (multiple variants), Engagement, Baby Shower, Birthday, Graduation, Corporate.

9. **Backward compat for events created on the old hardcoded flow (05 open-question 6)**
   - One-time migration: events whose `invitationSettings.visualTemplate` references the old hardcoded IDs (1, 2, 3) get a snapshot of the equivalent new template's `fields[]` / `overlays[]` baked into their existing record. No retroactive change to send behavior.

**Tier impact matrix (4c):**

| Concern | Host | Admin | Whitelabel |
|---------|------|-------|-----------|
| Pick from real DB templates | NEW web + mobile | NEW (admin create-event uses host StepThree) | NEW (whitelabel uses host StepThree) |
| Dynamic field rendering | NEW | NEW (same code) | NEW (same code) |
| TaqnyatTemplate admin CRUD | n/a | NEW admin UI | n/a (super admin scope) |
| Dynamic variable substitution | behind scenes | same | same |

**Parallelism (4c):**
- **Track A — Backend (one sub-agent).** `TaqnyatTemplateModel` + routes + dynamic `_getEventBodyParams` + migration script.
- **Track B — Web (one sub-agent, after A's API contract is locked).** StepThree dynamic, TemplateForm renderField, new step 3.5 picker, admin sidebar link.
- **Track C — Mobile (one sub-agent, after A).** StepThree dynamic, dynamic preview.
- **Track D — Admin (one sub-agent, after A).** TaqnyatTemplate CRUD admin UI.

**Stop gate (4c):**
- Host on web creates an event from a real DB template; the template's overlays/fields render correctly; preview matches the actual send.
- Mobile host does the same flow.
- Admin creates a TaqnyatTemplate, maps `{{1}}–{{4}}` to fields, and a host-created event picks it; `sendBulk` dispatches the correct values to Taqnyat.
- A non-Saudi-timezone event displays correctly across the wizard.
- An old (pre-migration) event still sends correctly via the legacy 4-param fallback.
- IMPLEMENTATION_LEDGER.md updated.

---

### Phase 4d — Mobile update flow + create-event correctness

**Goal.** Mobile gets the 4-step update wizard. Mobile create-event field-naming bug closed. Web/mobile schemas unified. Step 2 update is atomic.

**Findings closed (inventory 02 + 03):**

1. **Mobile update event wizard (03 gap-1)**
   - New screens: `screens/update-event/{StepOne,StepTwo,StepThree,StepFour}.js`, `UpdateEventScreen.js`.
   - Reuse 4c's `renderField` for step 3 customization.
   - Per-step PATCH dispatch matching web (`updateEventDetails`, `updateGuestList` + `updateSupervisorsList` via 4d's atomic endpoint, `updateInvitationSettings`, `updateLaunchSettings`).
   - Hook into `EventDetailsScreen.js` "Edit" action (currently absent on mobile).

2. **Mobile create-event template field-name normalization (02 gap-1, HIGH)**
   - Mobile `StepThree.js` currently emits `templateBrideName`, `templateGroomName`, `templateIntroduction`, `templateClosingMessage`, `templatePrimaryColor`, `templateFont`. Web schema uses `brideName`, `groomName`, `messageText`, etc. under `selectedTemplate.data`.
   - With 4c's `renderField` in place, the mobile form already iterates over `template.fields[].key` directly — verify the form-state-to-payload transform emits the canonical keys.
   - Add a regression check: mobile-created event round-trips template data correctly through `Event.invitationSettings.visualTemplate`.

3. **Schema unification (02 gap-5)**
   - **Option A:** publish `labbe/utils/schemas/createEventSchema.js` as a shared package consumed by both web and mobile.
   - **Option B:** keep two schemas, add a sync utility + a CI check that fails if they diverge.
   - Choice is **D6**.

4. **Wizard scheduleDate/Time input control (02 gap-2)**
   - **D7** decides: add a sub-step in the create wizard, or keep scheduling post-creation only?
   - If added: a small UI control on step 4 or in the summary, gated behind `event.whatsappTemplateStatus.status === 'approved' && testMessageSent` — reuses 4b's `useEventActionGate`.

5. **Multi-section atomicity in update step 2 (03 gap-5)**
   - Backend: single `PATCH /events/:id/step2` endpoint that updates `guestList` and `supervisorsList` in one transaction (MongoDB session).
   - Web + mobile clients call the unified endpoint instead of two parallel PATCHes.

**Tier impact matrix (4d):**

| Concern | Host | Admin | Whitelabel |
|---------|------|-------|-----------|
| Mobile update wizard | NEW | deferred (admin web is enough) | deferred |
| Create-event field normalization | mobile only | mobile only | mobile only |
| Schema unification | all | all | all |
| Atomic step 2 endpoint | web + mobile | web + mobile | web + mobile |

**Parallelism (4d):**
- **Track A — Backend (one sub-agent).** Atomic step 2 endpoint, schema sync utility (if D6 = Option B), regression check for template field round-trip.
- **Track B — Mobile (one sub-agent).** Update event wizard + create-event field normalization. Single sub-agent because both touch the mobile create-event tree.
- **Track C — Web (one sub-agent).** Switch to atomic step 2 endpoint.

**Stop gate (4d):**
- Mobile host creates an event with template data; data round-trips correctly to backend.
- Mobile host edits an existing event end-to-end (4 steps).
- Web and mobile guest+moderator updates land atomically (a single failed call leaves the event in its original state).
- IMPLEMENTATION_LEDGER.md updated, inventory files 01–06 archived under `docs/inventory/phase-4-extension/`.

---

## 3. Decision gate — needed before any prompt is written

These open questions block prompt generation. Each has a recommended default; confirmation locks it in.

| # | Decision | Default recommendation | Source |
|---|----------|------------------------|--------|
| D1 | Whitelabel-admin stats scope: tenant-wide, or own-events-only? | **Tenant-wide.** A whitelabel admin manages all hosts under their `whitelabelId`. | 01 §8 Q1 |
| D2 | Whitelabel update-event page: build now (4b) or defer? | **Build now.** Shares code with the admin update page; defer is more cost than benefit. | 03 §8 Q1, 8 |
| D3 | Taqnyat var mapping: separate `TaqnyatTemplateModel`, or store mapping on `TemplateModel`? | **Separate model.** Taqnyat templates are a distinct concept; one Taqnyat template can map to many visual templates. | 05 §8 Q4 |
| D4 | Wizard structure for Taqnyat picker: new step 3.5, fold into step 3, or keep post-creation? | **New step 3.5.** Visual template chosen → Taqnyat picker filtered by category → customization. Clearest UX. | 05 §8 Q7 |
| D5 | Whitelabel approval email: auto-send on approval, or admin button only? | **Admin button only.** Gives admin control over re-sends and avoids accidental dispatch on status correction. | 06 §8 Q1 |
| D6 | Web/mobile schema strategy: shared package, or sync + CI check? | **Shared package.** Single source of truth, no drift possible. | 02 §8 Q4 |
| D7 | scheduleDate/Time in create wizard: add sub-step, or keep post-creation only? | **Keep post-creation only.** The testMessage gate makes pre-creation scheduling fragile; matches existing button-based UX. | 02 §8 Q3 |
| D8 | Manual retry button visibility: host only, host + admin, or all three tiers? | **Host + admin (whitelabel sees but cannot trigger).** | 04 §8 Q3 |
| D9 | Partial-failure warning threshold: any failed, or >5%? | **Any failed.** Be honest with hosts; they should know. | 04 §7 gap-5 |
| D10 | State-machine field locks during `live` events: lock all editing, or allow guest-list additions only? | **Allow guest-list additions only.** Everything else locked. | 03 §8 Q4 |
| D11 | Admin/whitelabel create-event: use host wizard with role-aware branches, or build separate pages? | **Use host wizard with role-aware branches.** No separate pages. | 02 §7 gap-3 |

---

## 4. Progress and continuity convention

Same as the master plan:

- Per sub-phase: `docs/implementation/PHASE_4{B|C|D}_PLAN.md`, `PHASE_4{B|C|D}_PROGRESS.md`, `PHASE_4{B|C|D}_REPORT.md`.
- `IMPLEMENTATION_LEDGER.md` updated at sub-phase end.
- Inventory files 01–06 stay under `docs/inventory/phase-4-extension/` as the historical reference for which gaps were closed.
- Every new session begins by reading the ledger + the current phase's PROGRESS file. Every session ends by updating both.

---

## 5. Sub-agent parallelism rule

Same as the master plan §4: parallel-safe ⇔ disjoint file sets + no dependency. The coordinator owns the merge order and tracks file ownership in each phase plan. If two findings touch the same file, they collapse into one task.

---

## 6. What's not in scope (intentional)

- **Test infrastructure.** Same exclusion as the master plan.
- **Phase 5 (audit log activation + edges + polish).** Untouched — runs after 4d.
- **Real Moyasar integration.** The Phase 1 stub stands.
- **New features.** Only the gaps surfaced in inventories 01–06.
- **Detox / Maestro mobile UI test baseline.** Carried over from Phase 4 hand-offs; lives in Phase 5 or later.

---

## 7. Approval gate

Before Phase 4b kickoff, Peter approves:

1. The three sub-phase ordering and scope above.
2. The 11 decisions in §3 (or amended versions).
3. The estimated 4.5–5 weeks total.
4. Any reorganization of findings between 4b / 4c / 4d.

Once approved, the next deliverable is the Phase 4b Claude Code prompt — same shape as the prompt that produced `PHASE_4_FINAL_REPORT.md`.
