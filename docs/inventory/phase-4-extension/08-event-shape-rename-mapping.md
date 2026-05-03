# Inventory 08 — `Event.invitationSettings` rename mapping (Phase 4b Wave −1)

**Status.** Pre-flight inventory. Produced on `claude/implement-phase-4b-MgwjZ` (per user direction; the Phase 4b plan §7 originally specified an `inventory/phase-4c-preflight` branch — the mapping is identical, the branch differs).

**Gating role.** Peter locks the rename mapping (Task 4) and migration approach (Task 5) BEFORE Phase 4c kicks off (`PHASE_4C_PLAN.md` references this file in `W0-RENAME`).

**Scope.** Catalogue every persisted/transit field whose name is going to move when the visual + Taqnyat template system lands in 4c. This is a paper exercise — no code changes.

**Repos surveyed:** `labbe-backend-/`, `labbe/`, `halla-mobile/` (May 3 2026 head).

---

## Task 1 — Field inventory (current shape)

The `invitationSettings` sub-document on `EventModel` (see `models/EventModel.js:143-158`) currently carries seven fields:

| Field | Type | Source / set by | Read by | Notes |
|-------|------|-----------------|---------|-------|
| `selectedTemplate` | `templateSchema` (id, name, language, hasImageHeader) | StepFour (web) / mobile StepFour | `messaging.service.js:_getEventBodyParams`, `_getEventImageUrl`, `runEventLaunch` | Taqnyat-approved template metadata. `name` is the Taqnyat templateName. |
| `visualTemplate` | `visualTemplateSchema` (id, name, src, data) | StepThree (web) / mobile StepThree | not consumed at send time today; UI-only | Visual invitation card customized by host. 4c moves `id` → `templateId` (DB ref to `TemplateModel`). |
| `templateImage` | `String` (S3/local URL) | multer upload on create + invitation-settings PATCH | `messaging.service.js:_getEventImageUrl`, `dashboard.service.js`, mobile `LastEvent.js`, web `EventActionsHeader.jsx`, `LastEventStats.jsx` | Header image. URL construction is inconsistent — see Task 3. |
| `attendanceAutoReply` | `String` | StepFive (web) / mobile StepFive | `messaging.service.js:handleButtonResponse` (button=سأحضر) | Sent as the WhatsApp text reply when the guest taps "I'll attend". |
| `absenceAutoReply` | `String` | StepFive | `handleButtonResponse` (button=سأعتذر) | "I won't attend" auto-reply. |
| `expectedAttendanceAutoReply` | `String` | StepFive | `handleButtonResponse` (button=ربما) | "Maybe" auto-reply. **Naming is awkward — it is the *maybe* reply, not the *expected attendance* reply.** Rename candidate. |
| `note` | `String` | StepFive | UI-only (rendered in EventDetails) | Host-supplied note shown alongside the invitation. |

There is also a `testMessageSent` field on the parent event (sibling of `invitationSettings`) that the test-message UX gates on; it lives outside `invitationSettings` and is left untouched by 4c.

---

## Task 2 — Call-site inventory (per surface)

### Backend (`labbe-backend-/`)

| Path | Purpose | Notes |
|------|---------|-------|
| `models/EventModel.js:143-244` | Schema definition | `invitationSettingsSchema` is `{_id: false}`. |
| `src/modules/events/events.service.js:355-358` | Initial set on create | Hoists multer-uploaded `templateImage` into `invitationSettings.templateImage`. |
| `src/modules/events/events.service.js:583` | `updateEvent` allowedFields | Generic merge fallback. |
| `src/modules/events/events.service.js:1125-1144` | `updateInvitationSettings` | Object merge `{ ...event.invitationSettings, ...settings }`. |
| `src/modules/events/events.controller.js:144-145` | createEvent FormData parse | JSON-parses string. |
| `src/modules/events/events.controller.js:231-251` | `updateInvitationSettings` controller | JSON-parses `selectedTemplate` / `visualTemplate` strings on FormData. |
| `src/modules/admin/admin.controller.js:401, 501` | admin create/update event | Same parsing. |
| `src/modules/admin/admin.service.js:1351, 1383-1384` | admin update event | Allowed-fields list, templateImage hoist. |
| `src/modules/messaging/messaging.service.js:68, 71, 97, 157, 503, 513, 730-732` | Send-time consumers | `selectedTemplate.name`, `selectedTemplate.hasImageHeader`, `templateImage`, all three auto-replies. |
| `src/modules/dashboard/dashboard.service.js:303, 352-354` | Dashboard payload | Returns selectedTemplate + templateImage to "last event" widget. |
| `src/shared/utils/scheduledTasks.js:292` | Launch decision | `canUseWhatsApp = !!fresh.invitationSettings?.selectedTemplate?.name`. |
| `src/config/swagger.js:259` | OpenAPI definition | Mirror of model schema. |

### Web (`labbe/`)

| Path | Purpose | Notes |
|------|---------|-------|
| `hooks/events/useEventForm.js:67-74` | Initial form values | Flatten `invitationSettings.*` to top-level form keys (`templateImage`, `visualTemplate`, etc.). |
| `hooks/events/useEventForm.js:98, 290, 301` | Step payload builder | Reconstructs `invitationSettings: {…}` from flattened form. |
| `hooks/events/mutations/useEventMutation.js:43-44` | PATCH builder | Strips `templateImage` File before JSON-stringify. |
| `services/createAndUpdateEvents.js:112-141, 224-260, 605, 659-666` | API calls (create + update + read normalize) | FormData append + read normalization. |
| `services/events.js:312` | Read-side template image accessor | |
| `app/[lang]/host/create-event/_components/stepThree/StepThree.js:66-75` | Wizard step 3 setter | Uses dotted-paths `invitationSettings.templateImage` / `invitationSettings.selectedTemplate`. |
| `app/[lang]/host/create-event/_components/templateForm/TemplateForm.jsx:125-160` | Template selection setter | Same dotted-path API on `setEventValues`. |
| `app/[lang]/host/update-event/page.js:124` | Update wizard PATCH dispatcher | Branch on `payload.type === "invitationSettings"`. |
| `app/[lang]/admin-dash/update-event/_components/UpdateEventContent.jsx:69-226` | DUPLICATE admin update wizard | **Deleted in 4b W1-UNIFY.** |
| `app/[lang]/admin-dash/create-event/_components/AdminCreateEvent.jsx:95` | Admin create event PATCH | FormData append. |
| `utils/schemas/createEventSchema.js:117-145` | Zod schema | `invitationSettings: z.object({…})`. |
| `ui/host/events/EventActionsHeader.jsx:28` | Gate condition | `!!(event?.invitationSettings?.selectedTemplate?.name)`. |
| `ui/host/main-page/latsEventStats/LastEventStats.jsx:36` | Same gate on dashboard widget | |

### Mobile (`halla-mobile/`)

| Path | Purpose | Notes |
|------|---------|-------|
| `services/eventsService2.js:222-260` | API calls | FormData append + strip `templateImage` File. |
| `screens/host/UpdateEventScreen.js:50, 195` | Update wizard | Reads `eventData.invitationSettings`, dispatches PATCH per step. |
| `components/admin-dashboard/events/UpdateEventForm.js:46, 117-119` | Admin update form | Same pattern. |
| `components/admin-dashboard/events/CreateEventForm.js:89-91` | Admin create form | Same. |
| `components/home/LastEvent.js:31-32` | Gate on host home | `!!(event.invitationSettings?.selectedTemplate?.name)`. |

---

## Task 3 — Cross-cutting issues uncovered while inventorying

1. **`templateImage` URL construction is inconsistent.** `messaging.service.js:_getEventImageUrl` branches on `imagePath.startsWith('http')`; web `services/events.js:312` accesses the path directly with no helper; mobile `LastEvent.js` does the same; admin update path serializes the File separately. **4b W1-IMG-PATH** centralises this through a single `getMediaUrl` helper on web and audits the rest.
2. **`expectedAttendanceAutoReply` is misnamed.** It is the "maybe" reply. Rename candidate: `maybeAutoReply`. (Marked `propose alternative` in Task 4.)
3. **The `templateSchema` `id` field collides with the future `TemplateModel._id` reference.** In 4c, `selectedTemplate.id` becomes a Taqnyat catalog identifier (string) and `visualTemplate.id` becomes a `TemplateModel` ObjectId reference (`templateId`). Today both happen to be numeric placeholders.
4. **The web `useEventForm` flattens `invitationSettings.*` to top-level form keys**, but the API contract is `{ invitationSettings: {…} }`. The flatten-then-rehydrate dance hides the actual schema shape and is the main reason renaming has historically been painful.
5. **No "messaging settings" container.** All five "what to say to the guest" fields (3 auto-replies + invitationMessage + note) live mixed with the visual/Taqnyat template under one `invitationSettings` umbrella. 4c locks D4c-1 wizard step 5 = `messaging+replies+note`, suggesting a future `messagingSettings` sub-doc — flagged in Task 4.

---

## Task 4 — Proposed rename mapping (Peter to lock)

> Conventions: `agree` = recommended for 4c; `propose alternative` = strongly suggested rename (Peter to confirm); `needs Peter decision` = blocking choice.

| # | Current path | Proposed path | Rationale | Status |
|---|--------------|---------------|-----------|--------|
| 1 | `invitationSettings` | `templateSettings` | Umbrella now holds visual template + Taqnyat template + auto-reply text. "invitation" is too narrow now that the visual editor is first-class. | **needs Peter decision** (touches every consumer; also acceptable to keep `invitationSettings` and split the contents — see #11.) |
| 2 | `invitationSettings.selectedTemplate` | `templateSettings.taqnyatTemplate` | Names the actual provider. Field shape `{id, name, language, hasImageHeader}` stays. | **agree** |
| 3 | `invitationSettings.selectedTemplate.id` | `templateSettings.taqnyatTemplate.taqnyatId` | Disambiguates from `templateId` (visual). | **agree** |
| 4 | `invitationSettings.selectedTemplate.name` | `templateSettings.taqnyatTemplate.templateName` | "name" is overloaded. | **agree** |
| 5 | `invitationSettings.visualTemplate` | `templateSettings.visualTemplate` | No rename, just nesting. | **agree** |
| 6 | `invitationSettings.visualTemplate.id` | `templateSettings.visualTemplate.templateId` | Maps to `TemplateModel._id` once 4c lands `TemplateModel`. ObjectId. | **agree** |
| 7 | `invitationSettings.visualTemplate.src` | `templateSettings.visualTemplate.imageUrl` | Match `TemplateModel.imageUrl` from 4c v4.1 §A-7. | **agree** |
| 8 | `invitationSettings.visualTemplate.data` | `templateSettings.visualTemplate.overrides` | "data" is meaningless; this carries host-specific overrides on top of the template defaults. | **propose alternative** |
| 9 | `invitationSettings.templateImage` | `templateSettings.headerImageUrl` | "templateImage" is ambiguous — it's the WhatsApp header image. | **propose alternative** |
| 10 | `invitationSettings.attendanceAutoReply` | `messagingSettings.attendanceAutoReply` | Move all three replies + note + invitationMessage under a sibling `messagingSettings` sub-doc. Decouples send-time text from visual template work. | **needs Peter decision** (if #11 is `keep invitationSettings`, then keep these too.) |
| 11 | `invitationSettings.absenceAutoReply` | `messagingSettings.absenceAutoReply` | Same. | **needs Peter decision** |
| 12 | `invitationSettings.expectedAttendanceAutoReply` | `messagingSettings.maybeAutoReply` | Two changes: nest under `messagingSettings`, rename to `maybeAutoReply` (matches the actual button mapping in `handleButtonResponse`). | **propose alternative** |
| 13 | `invitationSettings.note` | `messagingSettings.note` | Sibling of the auto-replies. | **needs Peter decision** |
| 14 | (new) `invitationMessage` | `messagingSettings.invitationMessage` | Already referenced by the web read-side normalizer (`createAndUpdateEvents.js:661`) but never persisted by the model — orphan field. 4c either persists it as part of `messagingSettings` or removes the read-side reference. | **needs Peter decision** |

---

## Task 5 — Migration considerations (Peter to lock)

1. **Dual-write for one release cycle?** Yes (matches D4c-2 already locked). 4c W0-RENAME ships writers that emit BOTH old + new shapes; readers prefer new, fall back to old. Phase 5 drops the old shape.
2. **Backfill strategy?** A one-shot script `scripts/migrate-event-shape.js` copies old → new on every existing event document. Run on staging during 4c stop gate, on production at Phase 5. **Decision needed:** run with `--dry-run` first, then `--apply` after Peter signs off.
3. **API compat strategy?** Keep `PATCH /events/:id/invitation-settings` accepting the OLD body shape for one cycle; controller normalizes to the new shape internally. Add `PATCH /events/:id/template-settings` if Task 4 #1 lands as `templateSettings`.
4. **Mobile rollout?** Mobile reads new shape with old-shape fallback (same as web). Mobile send is server-driven so no client-side churn beyond the form layer.
5. **Validation drift?** The Zod schema (`utils/schemas/createEventSchema.js`) and the Mongoose schema must stay in lockstep. Phase 4d's `@halla/shared-schemas` workspace will own this; until then the rename ships in two synchronized PRs (Mongoose first, Zod follows in same commit).

---

## §6 — Files & call-sites blocked by Peter's lock decisions (cross-reference)

When `templateSettings` (#1) is decided, the rename touches every row in Task 2. Estimated diff: ~80 lines across ~20 files (mostly mechanical). Bundled into 4c W0-RENAME.

When `maybeAutoReply` (#12) is decided, `messaging.service.js:732` switches to `event.messagingSettings?.maybeAutoReply || …`. Trivial.

---

## §7 — Open questions for Peter

1. **Q1.** `templateSettings` vs keep `invitationSettings`? (Drives Task 4 #1.)
2. **Q2.** Split `messagingSettings` sub-doc (Task 4 #10–#14) or keep auto-replies under `invitationSettings`?
3. **Q3.** Rename `expectedAttendanceAutoReply` → `maybeAutoReply` (Task 4 #12)? Pure naming, semantics unchanged.
4. **Q4.** Persist `invitationMessage` (Task 4 #14)? It's read-only today; either drop the read or persist it.
5. **Q5.** `--dry-run` vs straight `--apply` for `migrate-event-shape.js` on staging?
6. **Q6.** Compat window length — one release cycle (default) or longer if mobile rollout takes more than two weeks post-merge?

> Answer-template: paste under each question with a one-line decision. Once all six have decisions, this file is locked and 4c W0-RENAME proceeds.

---

## §8 — Acceptance for this inventory (per Phase 4b plan §7 stop gate)

- [x] One file at `docs/inventory/phase-4-extension/08-event-shape-rename-mapping.md`.
- [x] Task 4 (rename table) with every row marked `agree | propose alternative | needs Peter decision`.
- [x] Task 5 (migration considerations) — answers or `needs Peter decision`.
- [x] §7 (open questions) — six pin-pointed questions.
- [ ] Peter answers §7 → file is locked → 4c W0-RENAME proceeds.
