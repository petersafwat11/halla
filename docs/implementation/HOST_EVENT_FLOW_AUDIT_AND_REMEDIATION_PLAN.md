# Host Event Flow Audit and Remediation Plan

> Implementation update (2026-09-06): the functional remediation is recorded in
> [HOST_EVENT_FLOW_IMPLEMENTATION_REPORT.md](HOST_EVENT_FLOW_IMPLEMENTATION_REPORT.md).
> The findings below describe the pre-implementation snapshot. Read the report
> before treating a finding as still open; its remaining-release-work section
> explicitly identifies work and device checks that are not yet complete.

Date: 2026-09-06  
Scope: host event creation, update, single-event management, guest/staff operations, messaging launch/recovery, responsive web, native mobile, shared contracts, and backend integrity.

## Executive verdict

The prior review found several real defects, but its implementation plan should not be executed as written. It misses two release-blocking cross-layer defects, proposes duplicate messaging work, and treats several stale or incorrect observations as current issues.

The safest implementation order is:

1. Repair guest capacity/integrity and update-save contracts.
2. Make guest data server-paginated and make actions operate on an explicit, complete audience.
3. Publish one backend-owned lifecycle capability contract and use it in web and mobile.
4. Rebuild the host single-event information and action hierarchy responsively.
5. Finish create/update workflow, location, template, validation, and recovery UX.
6. Complete accessibility, localization, device QA, observability, and rollout.

Do not begin with visual polish or a bulk toolbar. In the current code, a polished bulk toolbar would be acting on an incomplete first page of guests and could perform the wrong operation on the wrong audience.

## Audit method and confidence

This is a source-level, cross-repository audit of the current workspace, not a visual test against authenticated production data. It traced UI handlers through shared hooks and API paths into backend routes, middleware, services, models, and lifecycle constants.

Automated regression suites executed during the audit:

- Backend event validation, creation idempotency/compensation, entitlement/stats, and live guest invariants: 28 passed.
- Web event creation, routes/messaging, scheduling, and step validation: 13 passed.
- Mobile event details, creation resilience, scheduling, validation, and live guest gating: 30 passed.

These passing suites are useful but do not cover the newly identified canonical quick-add failure, first-page-only audience behavior, or real responsive/device interactions. Full browser/native E2E and visual QA remain required.

## Prior-review validation

### Confirmed

| Earlier finding | Verdict | Current-code evidence and correction |
|---|---|---|
| Web host header lacks event metadata | Confirmed | `halaa-web/components/event-detail/HostEventHeader.jsx` presents the title and controls but not a coherent status/date/time/location summary. |
| No in-page Add Guest on web | Confirmed | `GuestTable/index.jsx` has edit/delete operations only; “Edit guests” deep-links to the update flow. Add an in-context drawer/modal after the backend add path is fixed. |
| Web update Step 2 and Step 3 silently fail to save | Confirmed, P0 | `useEventForm.buildStepPayload()` emits `guestList` and `visualTemplate`, while `useUpdateEventActions.js` branches on `step2` and `invitationSettings`. The action can display an undefined success message and redirect without a mutation. |
| Update flow sends host back to dashboard | Confirmed | The return target is the host root rather than the source event. Preserve and honor an explicit event-detail return URL. |
| Staff columns are inverted | Confirmed | `StaffPopup.js` declares Phone then Name, while the generic table infers row keys in Name then Phone order. |
| Existing staff phone can be blank in the web update flow | Confirmed, missed detail | The transformed list uses `mobile`; `StaffPopup.js` reads `phone`. Normalize the DTO at the API boundary. |
| Web map failure blocks the flow | Confirmed | `MapInput.jsx` renders only an error when the Google key is absent and has no usable manual-address state when provider calls fail. |
| Zero-field design template can deadlock Step 3 | Confirmed | Selecting a template clears the image, while the template form returns nothing for zero fields, leaving no route to produce the required image. |
| Switching design modes destroys work without warning | Confirmed | Template/upload state is cleared immediately. Add a dirty-mode confirmation and retain per-mode drafts. |
| Summary date formatting is inconsistent and shadows the shared formatter | Confirmed | The local helper in web Summary masks the imported formatter and ignores the locale argument. |
| Summary omits the actual invitation visual | Confirmed | Both web and mobile summaries need the selected/baked image and a realistic message preview. |
| Create summary implies immediate launch | Confirmed | Creation produces a pre-launch event; testing and scheduling happen later. The confirmation copy and success destination must reflect that. |
| Hard-coded Arabic remains in preview UI | Confirmed | Preview labels/placeholders bypass translation in several web components. |
| Web checkboxes have no bulk workflow | Confirmed | The generic table exposes selection without an event-page action bar. Selection behavior also has correctness problems described below. |
| Mobile partial-delivery banner is not mounted | Confirmed | The component and translations exist, but `EventDetailsScreen.js` mounts `EventFailureBanner`, not `PartialFailureBanner`. |

### Partly correct or overstated

| Earlier finding | Verdict | Required interpretation |
|---|---|---|
| Update wizard traps users with no navigation | Partly correct | The wizard shell has no previous/next controls, but event-header edit items deep-link to individual steps. The real issue is misleading section/wizard semantics, no cross-section navigation, and wrong return behavior. |
| Mobile add modal freezes at 200+ guests | Directionally correct | It performs an unvirtualized `.map()`, but the normal API currently returns only 50. The deeper problem is that the modal unnecessarily duplicates the roster and the main screen also maps rows inside a scroll view. |
| Mobile needs an active filter bar | Partly correct | Status filtering already exists through stats/chips. It lacks a persistent visible active-filter state, result count, and one-tap clear action. |
| Stepper should be clickable | Needs scope | In create mode, visited steps should be navigable. In update mode, use a section editor with explicit save semantics rather than pretending the operation is one atomic wizard. |
| Step 4 empty-template state is a dead end | Confirmed as recovery weakness | Blocking creation may be correct if an approved provider template is mandatory, but the screen needs refresh, diagnostic guidance, saved progress, and a support/admin escalation path. |

### Incorrect, stale, or unsuitable plan items

| Earlier claim/proposal | Verdict | Why |
|---|---|---|
| Guest mutations fail to invalidate event stats | Incorrect | React Query prefix invalidation of `eventsKeys.detail(eventId)` also invalidates `['events', eventId, 'stats']` with the default non-exact match. A shared invalidation helper would improve clarity, but this is not the observed root bug. |
| Moderator card uses a physical right border | Stale | `ModeratorListItem.js` already uses `borderEndWidth`, which follows RTL/LTR direction. |
| The decorative phone clock must show event time | Incorrect | `9:41` is device chrome, not event content. Keep it decorative; localize only actual UI and message text. |
| Build a separate bulk-resend implementation | Unsuitable | `SendMessagesMenu` and `SendActionPopup` already support selected `guestIds`. Reuse that pipeline and fix its incomplete audience data instead of adding a parallel send route. |
| Add mobile list virtualization only inside the add modal | Incomplete | Remove the roster from the add/edit modal and virtualize/paginate the primary guest and staff lists. |

## Newly identified issues

### P0 — Release blockers and data correctness

#### 1. Quick-add guest can reject valid events

The current `POST /guests/events/:eventId` path is not safe for production use:

- `checkGuestLimit(1)` looks for `req.params.id`, but the route uses `eventId`, so the middleware does not load the event’s stamped subscription.
- It then asks for a fresh subscription through `Subscription.getCapacityForEvent()`. Per-event/trial subscriptions may no longer be available after creation even though they correctly belong to this event.
- `guests.service.addGuest()` treats any truthy `event.guestLimit` as a finite cap. Canonical pool-plan creation stores `guestLimit = -1`; therefore `currentGuestCount >= -1` is always true and quick-add is rejected.
- Middleware and service capacity rules differ from `events.step2.service`, which already reasons about the attached subscription, invite pool, and compensation.
- Existing tests construct events without the canonical `-1` value, so they do not detect this path.

Remediation:

- Create one backend `resolveEventGuestCapacity(event, actor, session?)` service and use it for create, update-list, quick-add, import, and bulk actions.
- Read `event.subscriptionId`; never require a new subscription for an already-created event.
- Define `guestLimit = -1` as unlimited per event, while still enforcing a finite subscription invite pool where applicable.
- Count active guest documents, not raw `event.guestList.length`.
- Make guest creation plus event linkage transactional and idempotent.
- Add canonical pool-plan, per-event, compensation, admin, live-add, and concurrent-add integration tests.

#### 2. Both clients silently show only the first 50 guests

The backend correctly defaults `GET /guests/events/:eventId` to page 1, limit 50. Neither client passes pagination/filter parameters or consumes the pagination envelope.

Consequences:

- Hosts see at most 50 guests while stat cards and export can refer to the full event.
- Web/mobile search and status filtering operate only on the loaded page.
- Tab and result counts can be wrong.
- “Select all” cannot mean all matching guests.
- `SendMessagesMenu` derives new/resend/reminder audiences from the first page, so counts and selected recipients are incomplete on larger events.

Remediation:

- Web: use server-driven page, page size, search, status, category, and sort parameters; retain query state in the URL.
- Native: use an infinite query and `FlatList` with cursor/page loading, pull-to-refresh, and empty/error/footer states.
- Keep aggregate counts separate from loaded rows.
- Move messaging audience eligibility/count calculation to a backend preview endpoint or return server-authoritative audience summaries with the event detail.
- Define selection as explicit IDs for the first release. Label “Select this page” honestly. Add global “all matching” only with a server-side filter token/descriptor and exclusion model.

#### 3. Update Steps 2 and 3 report success without persistence

Replace stringly typed step dispatch with a single shared section contract:

```text
details -> updateEventDetails
people -> updateGuestList/updateStaffList
design -> updateInvitationSettings with multipart image
messages -> updateInvitationSettings
```

Each adapter must return a normalized mutation result, its translation key, and invalidation policy. Unknown sections must throw in development and produce a visible error in production; they must never fall through to a success toast.

#### 4. Duplicate guests are not protected at the database boundary

Quick-add has no duplicate phone check and `GuestModel` has no active-event phone uniqueness constraint. Add/update/import operations can race.

Remediation:

- Normalize phone before comparisons and writes.
- Run a migration that reports and resolves existing active duplicates.
- Add a partial unique compound index on `{ event: 1, phone: 1 }` for non-deleted records.
- Convert duplicate-key errors to a localized `GUEST_ALREADY_EXISTS` response.
- Add concurrency tests.

### P1 — Broken or contradictory host workflows

#### 5. Lifecycle permissions disagree across UI and backend

Examples in current code:

- Shared `canSendTest` allows `pending_review`, while the backend only accepts `pending_scheduling` and `scheduled`.
- Shared `canSendTest` hides the action for `scheduled`, while the backend permits it.
- Notify Staff is shown whenever staff exist, while the backend accepts only `scheduled` and `live`.
- Web shows event edit and guest row controls in statuses the backend rejects.
- Mobile gates guest mutation more carefully but still exposes staff/QR operations inconsistently in terminal states.
- Quick-add backend rejects only cancelled/completed, leaving failed/archived behavior accidental.

Recommended product matrix:

| Action | pending review / ready | scheduled | live | completed | cancelled / archived | failed |
|---|---:|---:|---:|---:|---:|---:|
| Edit details/design/messages | Yes | Yes; auto-unschedule and explain | No | No | No | No |
| Add new guest | Yes | Yes | Yes; offer “send to new guest” | No | No | No |
| Edit/delete existing guest | Yes | Yes | No | No | No | No |
| Manage staff | Yes | Yes | Yes | No | No | No |
| Notify staff | No | Yes | Yes | No | No | No |
| Send test | Ready only | Yes | No | No | No | No |
| Schedule/reschedule | After successful test | Yes | No | No | No | No |
| Resend/new guest/reminder | No | No | Yes | No | No | Recovery only |
| Retry launch | No | When retryable | No | No | No | Yes |
| Rotate/revoke post-event access | No | No | No | Yes, after content access exists | No | No |
| Manage/share post-event content | Draft allowed where defined | Draft allowed where defined | Draft allowed | Publish/share | No | No |

Implementation:

- Add a backend-owned `capabilities` object to event detail responses: `canEditDetails`, `canEditDesign`, `canEditMessages`, `canAddGuest`, `canEditGuest`, `canDeleteGuest`, `canManageStaff`, `canNotifyStaff`, `canSendTest`, `canSchedule`, `canSendLiveMessages`, `canRetryLaunch`, `canManageGuestAccess`, plus machine-readable denial reasons.
- Derive it from the same functions used to authorize mutations.
- Render controls from capabilities in web/mobile; keep backend authorization authoritative.
- Add a table-driven contract test for every status/action/role combination.

#### 6. Guest deletion semantics are inconsistent

Step-2 replacement soft-deletes removed guests; the single-guest endpoint physically deletes. This breaks audit/history consistency and makes bulk deletion risky.

Remediation:

- Standardize single and bulk removal on soft delete with `deletedAt`, actor, and reason.
- Remove or reconcile event references transactionally.
- Decide whether invited/sent/responded/checked-in records may be removed; otherwise archive/hide them rather than erase history.
- Make export, stats, messaging, contact book, and all event aggregates share an `activeGuestFilter` helper.
- Add a cleanup/migration check for stale references.

#### 7. Some event-list aggregates count soft-deleted guests

`events.crud.service.js` guest aggregations match only `event` and status, without excluding `deleted: true`. Event lists can disagree with single-event stats. Apply the shared active filter to every `Guest.find`, `countDocuments`, and `$match` used for host/admin counts.

#### 8. Bulk selection is currently unsafe

The generic web table’s select-all uses raw `data`, not the displayed/filtered set. Adding destructive actions now would select hidden rows during client search.

Remediation:

- Move event guest table to controlled server selection.
- Prune invalid selections when page/filter changes or preserve them in an explicit cross-page selection store.
- Add indeterminate state and selected/visible/total counts.
- Implement bulk delete and bulk category as transactional endpoints with capability checks, idempotency, normalized structured results, and audit records.
- Reuse existing send endpoints for resend; do not duplicate provider logic.

#### 9. The update experience has misleading save semantics

Web exposes a four-step frame but only Cancel/Save, and redirects away. Mobile “Next” saves each section immediately, while the final “Save all” wording implies one final transaction. Going back cannot undo already-saved sections.

Remediation:

- Treat update as a section editor, not an atomic creation wizard.
- Route by named section (`details`, `people`, `design`, `messages`) instead of numeric step where possible.
- Provide “Save changes” and “Save and return to event”; preserve an explicit `returnTo`.
- If Previous/Next remains, label it “Save and continue” and show which sections are already saved.
- Show a dirty-state app dialog for navigation, mode switch, and close. Do not use `window.confirm`.

### P1 — Creation, location, template, and launch correctness

#### 10. Update date rules use the current viewer’s subscription and can invalidate an existing date

Both clients calculate a future minimum from the current subscription even in update mode. An already-valid stored date earlier than today-plus-lead-time becomes unselectable; an admin editing a host event may use the wrong subscription.

Remediation:

- Backend returns `constraints.minEventDate`, `constraints.canKeepExistingDate`, and the event-stamped subscription basis.
- Create applies the new-event floor. Update allows the unchanged stored date and validates only a changed date against event-specific rules.
- Admin updates use the event owner/subscription, never the viewer’s personal plan.

#### 11. Location fallback is inconsistent and can save a false Riyadh pin

- Web has no manual fallback if Google is unconfigured/unavailable.
- Native supports typed/manual addresses, but normalization supplies Riyadh coordinates by default and still requires finite coordinates to confirm.
- Update loaders also manufacture Riyadh coordinates for text-only legacy locations.
- Summaries build a map link whenever coordinates are truthy, so an address without a real pin can link to Riyadh.
- The React Native web stub is disabled and cannot satisfy validation if that target is used.

Remediation:

- Represent location as `{ address, coordinates: null | { latitude, longitude }, provider, placeId }`; no sentinel coordinates.
- Permit a manual address with null coordinates.
- Show map links only for explicitly selected coordinates.
- Provide retry and manual-entry paths for missing keys, API failure, permission denial, and geocode failure.
- Add create/update round-trip tests for Google, device, manual, and legacy text-only locations.

#### 12. Template generation is fragile and overly client-dependent

The backend requires a public event image when the selected WhatsApp template has an image header. Clients currently shoulder baking/uploading, and Step 3 requires an image even when the selected visual template has no editable fields.

Remediation:

- For zero-field templates, let selection immediately become a valid preview using the canonical template asset and have a trusted backend path materialize the required public image.
- For customizable templates, show explicit “Preparing preview” progress, cancellation, retry, and actionable CORS/render failures.
- Prefer backend rendering or a same-origin media proxy for canonical templates; do not depend on arbitrary browser canvas CORS behavior for a required business artifact.
- Version the baked image against template ID plus normalized field values, and invalidate it only when that fingerprint changes.
- Preserve the previous mode’s draft until the user confirms destructive switching.
- Validate that the selected provider template’s image-header requirement matches the visual asset before creation/update can finish.

#### 13. Creation success lands in the wrong place and tells the wrong story

Both clients ignore the created event ID and return to Home. Route directly to the new event detail page and display a lifecycle-specific next-step checklist:

1. Event saved.
2. Send a test message.
3. Schedule invitations.

Do not claim the event was launched. If scheduling is intentionally moved into creation later, make it a real input backed by the launch endpoint; remove unused phantom schedule fields until then.

#### 14. Validation is fragmented

Frontend step validation is frequently presence/truthiness based while backend Zod/model constraints are richer. Align web/mobile through shared client-safe schemas and field adapters. Map backend error codes to the exact field/section and retain entered data after recoverable failures.

### P2 — Single-event information architecture and responsive UX

#### Target page hierarchy

Use the same conceptual hierarchy on desktop, tablet, mobile web, iOS, and Android:

1. **Event identity:** back navigation, event title, localized status badge.
2. **Operational facts:** date, time, venue, verified map link, guest capacity/invite balance.
3. **One primary next action:** determined by capabilities and lifecycle (test, schedule, send to new guests, retry, or post-event publish).
4. **Secondary actions:** compact overflow/menu for editing sections, staff notification, export, and destructive actions.
5. **Warnings/recovery:** failure, partial delivery, auto-unschedule, exhausted quota.
6. **Stats as filters:** total, confirmed, declined, no response, checked in; active state, result count, clear action.
7. **People workspace:** Guests and Gate Staff tabs/panels, search, filters, add, import/export, selection, bulk actions, paginated/virtualized results.

#### Responsive behavior

- Desktop: compact metadata header, right-aligned primary action, secondary overflow, two-column stats/people layout only where content remains readable.
- Tablet: wrap metadata deliberately; keep the primary action prominent; table may reduce low-priority columns.
- Mobile web: do not force a seven-column table as the main interaction. Use priority columns or accessible guest cards; keep one sticky primary action and an overflow sheet.
- Native: `FlatList`/sectioned lists must own scrolling. Avoid nesting a full roster inside a form scroll view or modal.
- RTL/LTR: use logical spacing/borders/icons consistently; isolate user-entered mixed-direction names, phones, and addresses.

#### Quick Add Guest

Add the requested in-page flow on both clients after P0 capacity fixes:

- Open from the People workspace without leaving the event.
- Fields: name, normalized phone with country handling, optional category with suggestions, duplicate warning.
- Show remaining capacity and whether this live-event guest still needs an invitation.
- On success: close or offer “Add another”; update the current page, stats, category options, balance/capabilities, and send-to-new-guest eligibility.
- Preserve input on server/network error and focus the failing field.

Do not render the full existing guest list inside this modal.

#### Bulk action bar

Implement the requested web bulk bar and matching mobile multi-select mode:

- Actions: resend invitation (reuse existing messaging action), change category, remove/archive guests.
- Display selected count, clear selection, and capacity/cost impact where relevant.
- Require confirmation for removal and messaging, including the exact eligible/skipped counts.
- Return structured results (`requested`, `eligible`, `updated/sent`, `skipped`, `failed`) and preserve failed selections for retry.
- Never infer “all guests” from the currently loaded page.

### P2 — Performance, error states, accessibility, localization

#### Performance

- Replace `.map()` rosters in `EventDetailsScreen.js` and `AddGuestOrmoderatorPopup.js` with one paginated virtualized source.
- Remove the duplicate modal roster; the add/edit modal should contain only its form.
- Debounce server search, cancel obsolete queries, retain previous page data, and prefetch the next page.
- Memoize row/card rendering and use stable guest IDs.
- Fix `AddGuestOrmoderatorPopup`’s `styles.listActions` reference; the style is declared as `actions`.

#### Loading/error/refresh

- Web needs explicit page-level loading, forbidden, not-found, and retry states rather than partially rendering an empty title/table.
- Native refresh must await event, stats, guest, and staff requests together; do not stop the spinner when only the stats request ends.
- Mount PartialFailureBanner on native and add an actionable view/filter of failed recipients. Automated backend retries can stay silent until intervention is needed.
- Close dropdowns/sheets on outside press, Escape/back, navigation, and successful actions; restore focus on web.

#### Accessibility

- Make the web back affordance a real button/link with an accessible name and 44px target.
- Replace clickable summary `div` checkmarks with native checkboxes/buttons and visible focus.
- Add `aria-current`/accessible state to steps, tabs, filters, selection, and expanded menus.
- Use empty alt text for decorative stat/action icons; localize meaningful labels.
- Add keyboard navigation for guest actions and bulk toolbar; announce mutation results and selection counts.
- Verify contrast, dynamic type/text scaling, screen-reader order, reduced motion, and touch targets.

#### Localization/content

- Remove hard-coded Arabic/English from previews, table selection copy, tooltips, alert fallbacks, accessibility labels, and empty/error states.
- Use shared locale date/time/number formatters in summary and event detail.
- Keep AM/PM internal storage if required, but display locale-correct time and use localized picker controls.
- Clarify lifecycle copy: “saved,” “test sent,” “scheduled,” “sending,” “partially delivered,” “live,” “completed,” and “failed” are not interchangeable.

## Implementation phases

### Phase 0 — Contract freeze and safety tests

Deliverables:

- Lifecycle/action matrix approved and encoded as table-driven backend tests.
- Event detail `capabilities` and `constraints` response contract.
- Guest pagination/filter/sort and audience-preview contracts.
- Regression tests that currently fail for `eventId` capacity, `guestLimit = -1`, first-50 audiences, soft-delete counts, and update Step 2/3 dispatch.
- Analytics/error taxonomy for add, update, bulk, test, schedule, retry, and partial delivery.

Exit criteria: contracts are documented; failing tests reproduce every P0 item before implementation.

### Phase 1 — Backend guest and lifecycle integrity

Primary files/modules:

- `halaa-backend/src/shared/middleware/subscription.js`
- `halaa-backend/src/modules/guests/*`
- `halaa-backend/src/modules/events/events.step2.service.js`
- `halaa-backend/src/modules/events/events.crud.service.js`
- `halaa-backend/models/GuestModel.js`
- shared lifecycle/status utilities

Deliverables:

- Unified capacity resolver and transactional/idempotent quick add.
- Duplicate migration/index and localized error codes.
- Unified active-guest filtering and soft-deletion semantics.
- Bulk category/remove endpoints; existing messaging endpoints remain the resend engine.
- Backend-owned capabilities/constraints.
- Correct all soft-delete-sensitive aggregates and exports.

Exit criteria: integration and concurrency tests pass; no UI action is enabled where the backend will deterministically reject it.

### Phase 2 — Client data architecture and update-save repair

Web:

- Parameterized `useEventGuests` query keys and controlled pagination.
- Server-backed GuestTable filters/search/selection.
- Fix typed update adapters and staff DTO normalization.
- Preserve event return path and replace false success fallthrough.

Mobile:

- Infinite event guest query and `FlatList` people workspace.
- Refresh coordination, stable selection, and removal of modal roster.
- Align update section save/continue semantics.

Shared:

- Normalizers for event, guest, staff, location, capability, API envelope, and date/time display.
- One invalidation helper for event detail, stats, guests, categories, and invitation balance after mutations.

Exit criteria: events with 0, 1, 50, 51, 200, and maximum-plan guests have correct rows, counts, search, filters, selection, export, and audiences.

### Phase 3 — Host single-event redesign

Deliverables:

- Metadata/status header and lifecycle-specific primary CTA.
- Guests/Gate Staff workspace with quick add and requested bulk bar.
- Responsive desktop/tablet/mobile-web layouts and native parity.
- Capability-gated edit, guest, staff, messaging, recovery, and post-event actions.
- Mounted partial/failure recovery states.

Exit criteria: action hierarchy and functionality match across breakpoints and native platforms; terminal states expose no invalid mutations.

### Phase 4 — Create/update workflow completion

Deliverables:

- Named update sections with explicit persistence and return behavior.
- Event-specific date constraints.
- Manual/verified location model without sentinel coordinates.
- Zero-field and customizable template pipeline with progress/retry.
- Full visual/message summary and honest pre-launch confirmation.
- Direct redirect to the created/updated event and next-step checklist.
- Shared validation/error mapping and saved-progress behavior.

Exit criteria: every field round-trips create -> detail -> update -> detail on web and mobile without silent loss.

### Phase 5 — Accessibility, localization, resilience, and observability

Deliverables:

- Keyboard/screen-reader/dynamic-type pass.
- Arabic/English and RTL/LTR content audit.
- Offline/retry/slow-network handling and non-destructive dirty-state dialogs.
- Performance budgets and instrumentation for page load, list interaction, image bake, add guest, bulk actions, test, and schedule.

Exit criteria: no hard-coded user-facing copy in audited surfaces; automated accessibility checks pass; native list interactions remain responsive at the plan maximum.

### Phase 6 — E2E, visual QA, migration, and rollout

Test matrix:

- Roles: host, admin, super-admin/moderator as supported; owned vs forbidden event.
- Statuses: pending review, pending scheduling/ready, scheduled, live, completed, cancelled, failed, archived/deleted.
- Plans: trial, per-event finite, pool finite, unlimited, compensation/add-on, exhausted.
- Guest sizes: 0, 1, 49, 50, 51, 200, maximum, plus duplicates/concurrent adds.
- Data: Arabic/English/mixed-direction, long names/addresses/categories, legacy text-only location, zero-field/custom template, missing provider template.
- Web viewports: 360, 390, 768, 1024, 1280, 1440+; keyboard-only and 200% zoom.
- Native: representative small/large iPhone and Android, RTL/LTR, dynamic type, permission denied, offline/slow network.
- Messaging: test success/failure, scheduled retry, partial failure, new guest live send, resend, reminder, insufficient balance, idempotent double tap.

Rollout:

1. Run duplicate and stale-reference reports; resolve before the unique index.
2. Deploy additive backend contracts/endpoints first.
3. Release clients behind capability/data-v2 feature flags.
4. Compare old/new counts and audience previews in telemetry.
5. Enable quick add, then pagination, then bulk actions.
6. Remove legacy step/audience paths only after supported web/mobile versions are adopted.

## Definition of done

The work is complete only when all of the following are true:

- No save path can show success without a confirmed backend mutation.
- No guest operation uses a fresh subscription when the event has a stamped subscription.
- `-1` unlimited semantics are consistent everywhere.
- Counts, filters, selection, export, and messaging audiences remain correct beyond 50 guests.
- Duplicate active phone numbers cannot be created for one event, including under concurrency.
- UI capabilities and backend authorization pass the same status/role matrix.
- All guest removals preserve the agreed audit/history semantics.
- Creation/update returns to the event and accurately explains the next lifecycle step.
- Manual locations never masquerade as a Riyadh map pin.
- Zero-field and custom templates both produce a sendable public invitation asset or a clear recoverable error.
- Web desktop/tablet/mobile and native iOS/Android pass functional, accessibility, RTL/LTR, slow-network, and visual regression tests.
- Existing audit documents that describe old paths/statuses are updated or marked superseded so they cannot drive a future incorrect implementation.

## Recommended pull-request sequence

1. Contract tests + capability/constraint DTO.
2. Capacity resolver + quick-add transaction + canonical regression tests.
3. Duplicate cleanup/index + soft-delete/aggregate consistency.
4. Guest pagination/filter API consumption + server-authoritative audience preview.
5. Web/mobile update adapter and return-path repair.
6. Web single-event header and capability-driven actions.
7. People workspace, quick add, category, and bulk actions.
8. Native virtualization, partial-failure UI, and refresh repair.
9. Location and template pipeline.
10. Create/update summary, success routing, accessibility/localization.
11. Cross-device E2E/visual suite, telemetry comparison, and legacy cleanup.

Each PR should be independently deployable, include rollback notes, and avoid mixing schema/data migrations with large visual changes.
