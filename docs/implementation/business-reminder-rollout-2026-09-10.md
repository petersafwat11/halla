# Business templates and account scoped reminders

Eight Arabic templates were submitted to Taqnyat and synced into the backend-configured database (`test`). The seven invitation templates retain the owner-approved category wording and IMAGE header, replace the WhatsApp reply instruction with a body URL, and have zero buttons. The business attendance reminder has six body variables, no image header and zero buttons. Exact payload copy and mappings are in `docs/TAQNYAT_BUSINESS_TEMPLATES_MANIFEST.json`; provider receipts are in `docs/TAQNYAT_BUSINESS_SUBMISSION_RESULT.json`.

At submission sync, all eight business templates were PENDING. The personal template `halaa_event_attendance_reminder_ar_v1` was APPROVED. No guest messages were sent.

## Reminder configuration

Confirmed-attendance reminders use `type=reminder_confirmed`, `category=null` and the event's authoritative delivery mode. Personal events use `quick_reply`; business events use `portal_link`. There is one active reminder assignment per delivery mode across all event categories. Saving an active reminder deactivates previous reminder assignments in the same delivery mode. APPROVED, active and not-removed checks still apply; business send validation also requires verified zero buttons and a mapped body URL.

The personal reminder and the new business reminder are configured and active. Active is an administrative selection, not approval: PENDING templates remain unavailable for dispatch. An ordinary provider sync makes an approved selected template available without another category assignment. Existing per-event reminder timing and audience rules remain unchanged.

The admin assignment form hides event category for reminders, exposes personal/business account selection, and explains the global assignment. The catalogue shows account type and “All event categories” for reminders. Invitations retain category selection; graduation and meeting can use the general-event invitation for both account types.

## Event management caller audit

| Action | Audience | Caller and endpoint | Message selection |
| --- | --- | --- | --- |
| Automatic reminder | Confirmed guests | Backend scheduler; web/mobile automatic-reminder settings | Global approved reminder for event delivery mode |
| Extra reminder | Confirmed guests | Shared web send popup and mobile send modal, `POST /events/:id/extra-reminder` | Same global approved reminder; existing pool charging retained |
| Resend invitation | Non-responders | Shared web guest table/send menu and mobile send modal, `POST /events/:id/resend-invite` | Event invitation template; existing pool charging retained |
| Manual SMS nudge | Invited, sent/delivered guests who have not responded | Shared mobile EventDetailsScreen, `POST /messaging/send-reminder`, channel=sms | SMS response request with guest link |

The web pending-reminder hook exists but has no mounted UI caller. Mobile's shared EventDetailsScreen is registered by host and admin navigators; business owners use the host flow. Staff permissions remain enforced by existing role/scoped-event authorization. There is no separate mobile Taqnyat-template administration screen to update.

The manual mobile SMS action incorrectly described its audience as confirmed guests. Its localized text and component comment now say non-responders; information-only events hide/reject this action. The optional WhatsApp branch formerly used a legacy template-name override and three fixed variables for personal accounts, and the confirmed reminder for business accounts. It now resolves the event's approved invitation and mappings for either account type. Client template overrides are removed. The old wedding-specific pending reminder is not selected by these flows.

## Verification and release

Backend: 585 tests passed. Web: 216 tests passed. Mobile: 547 tests passed. Focused reminder tests cover approval gating, global category-independent selection, account isolation, replacement assignments, and information-only rejection. No deployment or native device validation was performed.

Deploy backend and web changes together, and ship the mobile copy correction. Until deployment, older backend instances still use the old category lookup and will not resolve the new category-null reminder assignments. Business dispatch remains blocked pending template approval. After approval sync, verify one real business invitation and confirmed reminder on physical devices before broad rollout.
