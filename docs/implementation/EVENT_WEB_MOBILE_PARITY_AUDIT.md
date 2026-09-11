# Event lifecycle web/mobile parity audit — 2026-09-11

Scope: user's admin update, guest/staff management and lifecycle checklist. Review compares current mobile fixes to the web implementation. This is code/regression verification, not a fresh full E2E run. MA01 is already completed and has four active guests; the historical instructions describing five unsent guests must not be replayed as current facts.

## Fixed in this pass

- Web event-management guest editor and Step 2 editor now convert saved 966-prefixed Saudi phone values to local editable format. Staff editor receives the same correction.
- Step 2 duplicate validation now runs during edit, excluding only the edited row. Previously it skipped all duplicate checks when editing.
- Removed direct Publish-to-scheduled status shortcut from web and mobile admin actions. Schedule Delivery remains the supported flow after a valid test.
- Backend rejects pending_scheduling -> scheduled through generic single/bulk status changes. Reopening cancelled/completed events continues to map to pending_scheduling and clear old launch fields. Restarted the local API with this guard.

## Checklist mapping

| Area | Finding / evidence | Verification level |
| --- | --- | --- |
| Host-owned versus admin-owned plan/balance | Admin EventDetailsContent merges enriched event query; RemainingInvitesBanner uses event.invitationBalance / event.subscription, not signed-in admin subscription | Code |
| Title/venue save and reopen | Shared update sections and location round-trip utilities are used; manual/legacy location tests pass | Shared tests |
| Guest name/category | Shared web StepTwo table/editor, CategoryAssignModal, category combobox; unlike native nested modals, web editor is inline and category modal independent | Code |
| Guest editor phone | Local format seeded in both editors; staff editor corrected too | Web render test + code |
| Duplicate number | Normalized add comparison existed; edit comparison fixed in this pass | Code; shared normalization tests |
| Guest remove/add and balance | Shared guest service scopes active guests; guest list mutation does not call invitation send/charge pipeline | Code; backend collection/delete tests |
| Staff management/notify | Admin header uses staff CRUD mutations and normalized staff projection; shared action gate controls Notify Staff | Code |
| Export | Web downloads authenticated XLSX through guests.exportGuests; backend emits string phone cells, preserves stored values (international values remain international) | Code, not a fresh downloaded-file check |
| Artwork | Existing section update contract and shared media handling; post-event relative URL fix from prior parity pass | Shared tests; invitation artwork not reuploaded |
| Invitation modes/Arabic replies | Web StepFour and Summary render ReplyDeliveryPreview from shared builder, with business/personal branches | Five web runtime tests |
| Test message phone | Uses shared Saudi phone schema and sanitizer, accepts 05 and 5 forms | Shared tests |
| Test-to-schedule without refresh | Optimistic flag bridges successful send; event detail prefix invalidation refreshes detail/stats; full event merged for admin header | Code |
| Schedule values/reopen | ScheduleSendingPopup seeds and resets from launchSettings, receives event date/time and event capabilities.isTrial | Code + shared scheduling tests |
| Scheduling windows | Shared Riyadh-time window helper in web/mobile; backend authoritative | Five shared scheduling tests |
| Cancelled jobs | Shared backend cancellation clears old launch time, lifecycle/launch guards prevent invalid sends | Backend regression suite |
| Reschedule old time | Reopen maps to pending_scheduling and unsets both schedule fields | Backend regression suite |
| Publish bypass | Removed from both clients and rejected server-side, including bulk operations | New backend regression assertions |
| Launch/charging | Shared backend scoped launch, duplicate/stale guards and invite-pool handling | Backend regression suite; no real send this pass |
| Automatic completion | Shared 24-hour Riyadh completion job and retry coverage; local QA launcher does not run global workers | Backend regression suite |
| Completed/post-event controls | Shared action gate and web/admin post-event canonical route | Code; prior post-event browser verification |
| Delete last | Shared delete/tombstone constraints tested; MA01 not deleted | Backend regression suite |

Validation: 22 backend lifecycle/admin tests; 24 shared phone/scheduling/update tests; 6 web phone-editor/reply-preview tests. Targeted web/mobile lint passed (staff prefill is a subsequent single-line equivalent correction). No WhatsApp messages sent, event data unchanged, no VPS deployment. Remaining device/E2E checks should not be represented as closed by this audit.

## Reminder controls follow-up — 2026-09-11

MA-01 is completed (verified in mobile admin UI); sending controls are intentionally hidden. Corrected the misleading future-reminder banner for completed/cancelled events on web and mobile, with Arabic/English explanations. Reminder customization now uses the event owner's entitlement instead of the signed-in administrator's subscription on both clients. Targeted ESLint passed; the new English explanation was verified on MA-01 after a full browser reload (Metro hot refresh initially retained old translation resources).

Checklist correction: the customization switch selects custom timing versus the default automatic time; it is not an automatic-reminder enable/disable switch. Live delivery, template availability, recipient selection, duplicate prevention and charging tests remain open. Use an active seeded event (MH-01 is shown Live) for those tests. No event state was changed and no messages were sent in this follow-up.
