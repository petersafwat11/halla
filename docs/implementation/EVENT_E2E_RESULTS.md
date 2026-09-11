# Event lifecycle verification results

Run: E2E-260908. **In progress.** See EVENT_E2E_TEST_PLAN.md for the full matrix. Untested cases are not passes.

## Environment and fixtures

- Seeded host and admin; host provisioned with a 200-invitation monthly test subscription plus its standard 30 compensation invitations. Previous subscription records and user reference backed up privately. Admin unlimited plan unchanged.
- Local API with a strict five-recipient provider transport guard; global cron never initialized. In-app notifications restricted to the two seeded users; native push suppressed in this test process.
- Web first, mobile later. Public template assets copied locally without changing global template records. Only QA event artwork copied to public production media storage for real provider access (HTTP 200 verified).
- Private fixture manifest, backups, message evidence and transport audit: `.cache/event-e2e/` (ignored).

## Event ledger

| Case | Event | Evidence / current state |
|---|---|---|
| WH-01 wedding, reply + QR | 6aa04594ee99a5c1c1ba799f | Created through web host UI with all five authorized guests, Azure Riyadh selection, custom image and customized accept/decline replies. Updated title/date through UI; test invalidated correctly. Schedule saved for Sep 9 at 21:00 Riyadh, then scoped worker invoked early. Now live, 5 sent, 0 failed, 0 pending. |
| WH-02 engagement, reply only | 6aa04f5450728b8827de12a3 | Created through web host UI with CSV guests/categories, one supervisor, built-in edited artwork. Sep 14 noon event; Sep 10 noon send schedule. Matching test delivered; staff access accepted; initial launch 5/5 accepted. Live counters 5 sent, 0 failed, 0 pending; cumulative consumption 10. |
| WH-03 birthday, plain | 6aa05849c78fbd71309a14b4 | Created through web host UI with required-column-only CSV, edited guest name, Azure Dammam hotel and built-in birthday artwork. Sep 15 noon event. Artwork clipping fixed and rebaked through Update Event. Plain test delivered; Sep 12 noon boundary schedule saved/reopened correctly; scoped launch accepted 5/5. Cumulative consumption 16 including WH-02 resend. |

## Verified cases and defects

- WH-01: nine category choices visible; three-day date picker gate visible; all five local-format phone numbers normalize correctly in DB; custom image upload, three invitation modes, custom replies and reviewed-save flow pass UI/DB checks. Balance shows 230, consumed 0 after creation/test.
- Test-message submission initially crashed with `t._parse is not a function`, stuck on Sending without any provider request. Root cause: composing web Zod 3 schemas with shared fragments resolving to workspace Zod 4. Web bundler now resolves both to the web Zod package. Browser retest passed and real provider request was recorded. Production rebuild still pending.
- WH-01 test message: `halaa_wedding_reply_qr_ar_v2`, recipient ending 7741, provider ID `wamid.HBgMOTY2NTMzNDQ3NzQxFQIAERgSN0QyMEI1MjI3NEY0QjVDQUE2AA==`. Database status **delivered**. Public image verified HTTP 200. Real inbound reply / recipient visual confirmation pending; user asked us to continue using logs/DB evidence.
- Scheduling defect found: shared client calendar parsing dropped the Riyadh day rollover in serialized dates; backend event parser rejected wizard 12-hour times, silently disabling event-instant-dependent validation. Parser fixes added; 5 backend and 5 shared targeted tests pass. UI retest pending.
- Schedule popup now prefers the event's authoritative trial/paid entitlement over the signed-in actor's potentially stale subscription (also relevant to admins acting for hosts). UI retest pending.
- Outstanding: blank weekday in template previews; Arabic-only interface labels in English creation and guest table; broaden UI/UX inspection and fix.

### Subsequent verification / fixes

- Revised test to recipient ending 0353 also **delivered**. Editing title/date reset the test fingerprint gate and hid scheduling until retested.
- Fixed scheduling range verified in browser: Sep 9–10 for Sep 13 event, paid entitlement; schedule persisted as UTC calendar token plus 21:00 Riyadh time.
- Actual launch initially rejected all five invitations with provider `131008`: initial/manual bulk send had not populated host name/account type. Both now populate host consistently with test/single sends; manual ownership check handles populated IDs. Retried same fixture: 5/5 accepted with provider IDs, four delivered at first receipt check; fifth awaiting later receipt. Failed attempts remain in audit. Exactly 5 invitations consumed, not 10. Second worker invocation on the live event returned stale and sent nothing.
- Found stale mixed-object save in launch worker overwriting batch counters after retry. Replaced post-send document save with targeted lifecycle/delivery updates. Existing QA counters repaired by the actual authoritative recomputation helper: 5 sent / 0 failed / 0 pending. New-event regression still required.
- Backend suite: **578 passed** after timezone and host-population fixes. Final atomic-counter change needs its own regression/retest.
- Weekday preview helper and six web/mobile consumers updated; focused weekday test passes. Added missing English strings for observed template/reply/preview controls and sent-via heading. UI retest pending.

### UX and import/design follow-up

- Step 4 rebuilt as three compact choices with one title/description each; removed numeric badges and redundant feature chips. Desktop screenshot reviewed. Narrow viewport DOM works, but two screenshot attempts at 390px failed in browser tooling; native/mobile visual verification still pending.
- Summary expanded with invitation mode, configured replies, expandable guests/categories and supervisor lists. Verified WH-02 UI data before save. Fixed omitted canonical event-category translations (e.g. engagement).
- Add Guest moved into guest-table toolbar; desktop screenshot reviewed and text size corrected. Event metadata font size corrected. Table sent-via heading translated.
- Shared action gate hides the matching completed test immediately. WH-02: no manual refresh; Test Message disappeared, Schedule Sending appeared with computed pulse animation, and guidance changed. Focused gate test passes. Schedule emphasis respects reduced motion on web.
- WH-02 schedule reopened without manual refresh with Sep 10 and 12:00 PM intact. Guidance shows exact time bounds; empty scheduling windows explain that the event date must move later. Mobile equivalents still need full UI coverage.
- CSV was advertised but rejected by MIME gate; fixed advertised extension/MIME support and preserved raw phone strings. UI imported all five categories/phones correctly. Shared header validator also incorrectly required optional Category; fixed with regression test, optional-column browser retest pending.
- Built-in gallery crashed on Next image host validation and used public media origin for authenticated template assets. Web template queries now normalize API asset URLs; authenticated images bypass server image optimization. Gallery/editor/save verified. Cards are keyboard-accessible buttons.
- Empty optional template fields were printing labels into artwork; removed placeholders on web/mobile. Regenerated WH-02 image; blank optional fields verified in preview and saved image flow.

### Remaining known issues / follow-up

- Finish native/mobile Step 4 redesign and summary parity, first-use hints and pulse behavior.
- Message preview date/day language follows UI language rather than template language; reconcile with actual provider body parameters.
- Review draft recovery after a runtime failure (gallery crash reset the unsaved draft).
- Finish import button/row-selection translations, general accessibility and RTL inspection.
- Remove obsolete Step 4 icon/style code after final layout review.
- Full web/mobile/backend regression and fresh production build pending after latest changes; add regression for atomic launch counters.

## Not yet verified

Remaining host lifecycle actions, reminder variants, other categories/modes, web admin, mobile host/admin, native-only behavior, final regression/build and fixture cleanup remain in progress or not run. Both recorded five-guest launches have been verified.

### Reminder reliability and real inbound reply

- WH-02 guest ending 7741 confirmed through a real inbound reply at 18:18 UTC. DB RSVP and host UI agree. Its `rsvp_auto_reply` acknowledgement is delivered with provider ID `wamid.HBgMOTY2NTMzNDQ3NzQxFQIAERgSQzIxRTJDRkQ3MjdCRUY5MzZBAA==`. No simulated RSVP was used.
- Fixed automatic reminder completion on missing templates/partial failures/rate limits. Successful guests are tracked individually; retries exclude them and guests outside the current authoritative guest list. Provider failures no longer become permanently cached idempotency successes. Two in-memory integration tests pass, including retry and duplicate suppression.
- **Release blocker:** the only approved attendance/pending reminder templates have wedding-specific wording, IMAGE headers, and respectively six/five variables. Both currently have null type/category and empty mappings. They cannot correctly serve engagement or other categories. Scoped WH-02 reminder execution sent nothing and correctly retained incomplete status. No global template records changed. Proper category-safe approved templates and mappings are needed before this feature can meet its UI promise.
- Manual reminder service also uses a fixed three-variable text-only payload for personal events; this is incompatible with those approved templates. Requires correction with configured template metadata and meaningful unavailable-state UI.
- Latest full web/mobile suites: 216/540 passed. Mobile runtime and production build remain unverified.

### Continued guest-management and UX checks

- Duplicate add on live WH-02 was rejected; DB retained five guests. Category field was outside modal padding: moved into the form, added persistent inline error text, and labeled the close control. Corrected layout reviewed in the browser.
- Localized row-selection labels now announce guest names rather than Arabic text plus database IDs in English UI. Event header time now displays `12:00 PM` instead of `12:00:PM`.
- Selected resend to guest ending 0353 delivered: `wamid.HBgMOTY2NTA2NjMwMzUzFQIAERgSNTJCQjQyRkM2Nzg1RUJBRkE1AA==`. Exactly one invite consumed; DB and UI immediately show 11 consumed / 219 remaining. No manual refresh needed.
- Resend popup overflow/padding fixed and visually reviewed. Added audience/cost guidance, accessible checkbox names and selection locking during dispatch. Selection count/send payload now intersect the current eligible audience. Zero-success results use error feedback instead of a green success toast.
- Event reads now expose reminder configuration availability. Web banner explains unavailable reminders and disables extra reminder/customization while no template is configured. Browser verified. Mobile banner parity implemented; runtime retest pending.
- Submitted a new category-neutral Arabic attendance reminder `halaa_event_attendance_reminder_ar_v1`; local ID `6aa0558242519a7784c5fb9d`, provider status **PENDING**, kept **inactive**. Existing wedding templates untouched. Script supports dry-run preview by default: `halaa-backend/scripts/submit-general-event-reminder.js`.
- Added category-specific-first/general-event fallback for mapped confirmed reminders, preserving personal/business template isolation; added a formatted-time mapping. Three focused integration tests pass. Provider approval, scoped real send and activation still pending.
- Backend full suite **580 passed** before the later availability/fallback additions; those additions still need final broader regression.

### WH-03 and additional visual checks

- Required-column-only CSV initially still hit stale bundled shared code. Webpack now treats the workspace shared package as mutable instead of a managed dependency snapshot. Fresh browser retest imported all five phones with leading zeroes; a subsequent shared formatter change hot-reloaded successfully. Localized Add/Edit/Cancel/import/download controls in the wizard.
- Plain invitation selected the approved birthday plain template, hid reply buttons and showed no automatic replies. Removed contradictory editable-replies guidance in this mode.
- Arabic message previews now use the template language for date/day/time rather than English UI formatting. Backend mapped time and shared preview time both format `12:00:PM` as `12:00 م`; two focused shared tests pass. Summary time also corrected to `12:00 PM` in English.
- Actual birthday export revealed the venue was clipped by line clamping. Added text fitting to authored line budgets, corrected font-overhang measurement, then rebaked via the UI and inspected the final JPEG: full venue and prominent celebrant name visible. Final image: `/uploads/events/templates/6aa05849c78fbd71309a14b4/template-image-1788893597537-bd357995a28b6d78.jpg` (public HTTP 200). Mobile uses configured maxLines/font fitting; native parity unverified.
- Time picker dropdown covered schedule confirmation and the trigger only opened it. It now expands in flow, toggles closed, supports Escape/Done, labels increment controls, accepts 24h/12h stored values and displays localized time. Browser boundary test: Sep 12 13:00 rejected as too late; Sep 12 12:00 accepted. Reopen without refresh restored date/time; screenshot reviewed.
- WH-03 test ending 5122 delivered, provider ID `wamid.HBgMOTY2NTAwMTE1MTIyFQIAERgSRjQ4QUZBOTg0M0IzMDFCN0NBAA==`. Test button hid immediately and schedule action/hint appeared. All five launch IDs recorded in private outbound evidence. At first receipt check: two delivered, one read, two accepted/sent. DB counters 5/0/0, subscription consumption 16.
- Newly noted UX follow-ups: event-list categories display raw lowercase codes and its Date & Time column omits time; scheduled worker/inbound changes need automatic refresh of event/guest state; compact first-use hint placement in the event header still needs refinement; explicit Saudi time-zone label desirable in scheduling.

### Further real reply evidence

- WH-01 ending 5122 confirmed at 18:45 UTC; QR follow-up **read**, ID `wamid.HBgMOTY2NTAwMTE1MTIyFQIAERgSNENBNjM5NUI1MEQwODk5Q0I3AA==`.
- WH-02 ending 8429 declined at 18:46 UTC; apology **read**, ID `wamid.HBgMOTY2NTUzODg4NDI5FQIAERgSOUU0QkJDMzQ2NEUwMUQ5QTIyAA==`.
- WH-02 ending 0353 confirmed at 18:52 UTC; acknowledgement **delivered**, ID `wamid.HBgMOTY2NTA2NjMwMzUzFQIAERgSNjk3QjdDOTUzMzQxRjYzRjQzAA==`.
- WH-02 supervisor access now **delivered**. All replies above were real inbound messages, not DB simulation.
- Latest web/mobile suites passed 216/540. Backend full run: 580/581, with one old raw-time expectation failing after intentional localized-time change; updated that expectation and reran its suite plus reminder regressions (12/12 passed). Final full backend rerun still pending.

### Admin lane in progress

- Admin dashboard crashed on entry: missing useTranslation import in DashboardCharts. Fixed and browser retry + screenshot verified working.
- Admin on-behalf guest quota correctly showed host remaining balance 214, not admin unlimited; imported all five authorized guests.
- Code review found Step 4, summary and WhatsApp preview used signed-in actor name. Passed selected/event owner through create/update desktop/modal previews. Browser replay pending.
- Update form dropped populated template varMapping, risking incorrect placeholder order. Mapping retained; regression validation pending.
- Full development reload discarded the in-progress admin draft before save; no event was created. Draft recovery remains an open UX item. Admin self-selection is a clickable card without button semantics and needs accessibility improvement.

### WA-01 evidence and user-directed presentation fixes

- Created WA-01 `6aa05f7f2e5bf015713a8542` for seeded host, with admin createdBy/onBehalfOf audit, five guests, wedding reply_and_qr, Sep 16 noon Riyadh, Azure Hilton Riyadh coordinates 24.785636/46.729171. No creation charge; remaining 214.
- Owner-name correction visually verified in Step 4 and summary. Admin final button had said Next; wired currentStep so final step says Save, and disabled Previous during save.
- Test to ending 6383 **delivered**: `wamid.HBgMOTY2NTA1ODI2MzgzFQIAERgSQ0MwRTIxRDMxNjAyQzIzRkM3AA==`. Test hid and schedule/hint appeared without reload. Sep 10 noon schedule saved and reopened with values intact.
- Admin header action buttons and workflow hint previously competed in one flex row. Consolidated actions into one wrapping row with guidance beneath. Removed first subscription/balance panel, retaining second canonical Remaining invites card as requested. Screenshot verified.
- Header was supplied stats projection without eventDetails; schedule had no upper bound. Enriched header from canonical event query. Browser now shows Sep 13 noon latest sending time for Sep 16 noon event. Localized admin status actions.
- Time-picker Done button no longer inherits tiny text: 16px semibold, 48px height, padding, hover/focus states. Browser screenshot reviewed. Mobile iOS confirm text/tap area enlarged with flexible width; native inspection pending.
- Mobile parity code review found same actor-name preview and duplicate remaining balance. Passed selected/event owner through create/update summary/previews and removed duplicate quota row. Mobile runtime verification remains pending.
- WA-01 has not yet launched. Public QA artwork uploaded and HTTP 200: `/uploads/events/templates/new/azure-qa-card-1788888467863-8c2b8ecbc0e0b238-1788895102552-aac38ff2a6cc2e5b.jpg`.

### Header redesign and direction correction

- Removed hard-coded right text alignment from shared Statistics/staff styles. Admin English screenshot now starts left; Arabic starts right through inherited document direction.
- Replaced host/admin event header styling with shared EventHeader.module.css: title and owner metadata, consistent primary controls, secondary actions in an accessible disclosure, workflow guidance separated below. Secondary action menu closes on outside interaction, action selection and Escape.
- Admin English/Arabic screenshots reviewed. Host runtime replay in progress. Mobile StatsCards/EventActionsSection code has no equivalent fixed-right/row-reverse override; native visual review remains pending.
- Latest web 216/216 pass; mobile suite passed after owner/balance/picker changes. No production build yet.

### Dashboard follow-up

- Redesigned compact Remaining invites/Add More card for desktop, tablet and phone web widths; inspected screenshots at default, 768 and 390px. Prominent remaining count, secondary usage, 44px Add More action; narrow web layout stacks action full width. Mobile compact card typography/touch targets updated; native visual verification pending.
- Latest-event thumbnail used raw `/uploads/...` against Next origin, causing 404. Web now uses existing canonical getMediaUrl wrapper. Mobile already resolves `/uploads` against API origin via getImageUrl; inspect native image loading in mobile phase.
- User explicitly withdrew the request to resize Create Event button. It remains unchanged.
- Also localized raw dashboard time using shared formatTime. Runtime recheck in progress.
- WA-01 scoped launch succeeded 5/5; total consumption now 21, remaining 209. Real RSVP changes visible in dashboard; receipt/DB reconciliation pending.
- Thumbnail follow-up: canonical URL wrapper alone retained relative path because dev API uses same-origin proxy. Added `/uploads/:path*` to configured BACKEND_PROXY_URL rewrites alongside API proxy; image endpoint now returns HTTP 200 through port 3000. Dashboard reload verification in progress.
- Dashboard thumbnail verified loaded (naturalWidth 600) and visually inspected. Web/mobile thumbnails now contain the full card rather than crop it; subtle border keeps white artwork visible.
- Dashboard had independently computed action gates and still offered scheduling for a live event. Web now uses shared useEventActionGate, resets optimistic test state per event/fingerprint, and passes flattened date/time fallback to schedule. Browser confirmed Schedule Sending absent after live launch. Mobile LastEvent already uses shared gate.
- Host event header English screenshot verified after shared redesign. Create Event button untouched.
- Final regression at this checkpoint: backend 581/581, web 216/216, mobile 540/540 pass. Production build and native runtime remain pending.
- WA-01 receipt reconciliation: all five initial invitations delivered or read (three delivered, two read). Real inbound replies produced delivered/read QR follow-ups and read acknowledgement/decline follow-ups; saved private evidence wa01-outbound.json. Event counters 5 sent / 0 failed / 0 pending, live, deliveryStatus delivered. Original saved Sep 10 noon schedule retained as audit data after scoped early launch.
- Web optimized production build passed with isolated NEXT_DIST_DIR=.next-e2e-production after the latest changes (Next 15.5.23). Build log saved privately. This does not establish native runtime readiness or completion of remaining scenario matrix.


### Arabic default RSVP replies (web, mobile, backend)
- Replaced interface-language-dependent defaults with shared Arabic guest copy in `shared/src/constants/guestReplies.cjs`. Web/mobile Step 4 and backend web/WhatsApp fallback consume the same source; both locale catalogs match. Existing nonempty customized replies remain unchanged.
- Reply editors follow content direction (web auto; mobile adaptive), including Arabic inside the English interface.
- Validation: web 216/216; mobile 540/540; two backend regression tests cover language-independent fallback, blank override, custom override preservation and confirmation captions.
- Visual recheck pending: the browser currently reports localhost:3000 unavailable. No new real WhatsApp message was sent for this wording change.


### Resumed after app closure: documentation and live saved replies
- Added EVENT_E2E_CHANGELOG.md with consolidated fixes, reasons, affected flows, verification and release limitations before resuming scenarios. Restarted guarded API and web only.
- DB traced reported English apology to stored guestReplies, not WhatsApp button language: WH-02/03 and WA-01 had exact old English defaults; WH-01 had custom QA English copy.
- Added dry-run-first migrate-arabic-guest-replies.js. Dry run found four events / eight exact historical default fields; backed up and compare-and-set migrated all eight. Repeat dry run found zero. Separately backed up and translated only the known WH-01 QA copy. Arbitrary custom host text preserved. No code deployment performed.
- Browser replay found inline direction/textAlign still overrode dir=auto. Removed it; screenshot and computed style now show Arabic apology with RTL/start in English UI. Mobile adaptive editor has no corresponding fixed override.
- Admin self-owner semantic button works after restart. WA-02 graduation created as admin self, createdBy.onBehalfOf=false, five guests normalized including both local 050 numbers, manual venue with null coordinates, reply_only general-event template. DB contains both Arabic replies exactly. ID 6aa069e2032849ae494186c4.
- Saved actual invitation JPEG inspected, public copy HTTP 200. New visual findings: template date follows English UI inside Arabic artwork, and time omits AM/PM; title/venue require repeat entry instead of prefilling event details. These remain open.


### WA-02 launch, real Arabic responses and staff/owner clarification
- WA-02 test delivered, provider ID wamid.HBgMOTY2NTMzNDQ3NzQxFQIAERgSMUQ1MDc5Mjc0QzUyMzMxMkVEAA==. Schedule Sep 10 noon persisted and reopened correctly in screenshot. Scoped early launch succeeded 5/5; private wa02-outbound.json holds receipt evidence.
- Replayed the Arabic apology only for the existing actually-declined WH-02 guest ending 8429; no synthetic RSVP. Message wamid.HBgMOTY2NTUzODg4NDI5FQIAERgSRjgyMzY0NkNCMEM1MzlDMzg1AA== was read. Subsequent real WA-02 attendance and decline replies also generated delivered/read Arabic messages; content hashes match the new copy. Private wa02-real-replies.json records IDs.
- Replaced the More actions text glyph with an aria-hidden SVG chevron, rotating when expanded and respecting reduced motion. Screenshots verified in English and Arabic.
- User clarified Staff should remain management when no staff; renamed Manage staff / إدارة الطاقم. Separate Notify Staff / إشعار الطاقم remains gated by actual staff and event eligibility on shared web/mobile gate. Admin WH-02 notification tested: successful API, provider ID wamid.HBgMOTY2NTA1ODI2MzgzFQIAERgSMEY1QjlBQUQzODUzQkYxOUUxAA==, initially sent. No guest invite quota debit.
- WA-02 is deliberately admin-self, with its own unlimited subscription. WA-01 is host-owned: DB owner/subscription and admin UI agree on 209 remaining / 21 used / 230 total. Admin header now explicitly labels own-account events; ordinary host owner named. No owner or quota reassignment was needed.
- Full regression: backend 583/583, web 216/216, mobile 540/540. Optimized web build passed (latest wording-only locale tweaks followed it). Expo web export compiled successfully, 4160 modules; this is build validation, not native or interactive mobile testing.
- Interactive Expo startup was rejected by automatic approval review with no reason beyond blocked by policy. No attempt to bypass it. Web restarted for requested visual checks, API remains guarded. Mobile interactive scenarios remain blocked.
- Artwork time noted earlier is intentionally converted to 24-hour notation (so absence of AM/PM alone is not incorrect); artwork language and event-field prefilling remain UX review items.

- A safer loopback-only Expo startup (--host localhost) was also rejected by automatic approval review, with no detailed reason. Web runtime is stopped to preserve sequential UI testing. Guarded local API remains on port 8000. User-side mobile startup is needed for interactive mobile scenarios.

## Mobile parity checkpoint — before resuming E2E

Completed code comparison and repairs recorded in EVENT_MOBILE_PARITY_REVIEW.md. Final mobile verification: 542/542 tests, changed-file ESLint zero warnings, Expo web export passed. Native/mobile UI remains unverified because runtime startup was rejected by automatic approval review. No additional real sends or DB mutations in this pass. The new document distinguishes existing shared parity, new mobile repairs and required runtime follow-up.

## 2026-09-09 — resumed Expo web, reduced matrix, first mobile save

User approved fewer events/iterations while retaining functionality coverage. Added reduced execution strategy to the plan. Expo is user-started on 8081; web app is stopped. Guarded local API restarted, mobile local ignored .env points to http://127.0.0.1:8000/api/v2. No deployment/push. VPS/public WhatsApp webhook remains on its deployed code.

Runtime findings and repairs:
- API CORS lacked X-Client and Idempotency-Key, blocking browser login/create before handler execution. Added these existing app headers to the existing origin policy. Host login and POST /events 201 now verified.
- English category selector used missing top-level translation keys and displayed Arabic Cancel/Confirm. Corrected to common.buttons; English labels verified live.
- Native date picker does not open in Expo web. Added web-only HTML date/time picker with required/min/max validation, explicit Save/Cancel and form-value commit. Native implementation unchanged. Sep18 and20:00 saved/reopened; native device behavior still pending.
- Expo web map component was intentionally disabled. Enabled manual-address entry only, with explicit limitation hint; native map remains unchanged.
- Protected gallery artwork appeared blank because RN web Image ignores source headers. Added web-only authenticated blob loader with abort/object-URL cleanup; template asset paths now use configured API. UI cards visible and asset200 logs verified.
- Artwork time prefill converted8PM to8AM. Reused shared parseClockParts in template defaults; test covers space/colon PM,24h,noon,midnight. Editor now shows20:00/8PM.
- Native view-shot export is not supported in browser (findNodeHandle error). Recorded device-only limit; used uploaded-card path for the creation pipeline.
- Uploaded-card normalization used native file-system size lookup. Web uses blob size; create/update multipart helper now appends real Blob in browser and preserves native URI file objects.
- User explicitly rejected individual guest rows in summaries. Removed guest disclosure/names/phones from BOTH web Summary and mobile EventSummary. Kept guest count. Verified removal in running mobile summary. This supersedes earlier summary-disclosure enhancements for guests; staff disclosure remains.

Saved MH01 through actual UI: 6aa078b4374d11806b73f0c8, E2E-260908-MH-01 Meeting, seeded host,5 authorized phones normalized,Sep18 20:00,manual Riyadh Conference Centre,reply_and_qr,Arabic replies. DB status pending_scheduling, API201, detail UI loaded. Balance stays209remaining/21used/230total. No messages sent in this resumed pass. Private mh01.json and manifest updated. Uploaded artwork was reused from WA02 to verify upload; replace with date/category-consistent artwork BEFORE any real test/send for this fixture.

UI evidence: host home at phone viewport, balance, resolved artwork cards, step4 stacked cards/all three mode switches (none hides reply fields), Arabic attendance/apology, summary date/time/count/venue and saved details. Browser viewport390x844, not native-device proof. Remaining: mobile admin/create/update/manage, test/schedule transitions, scoped lifecycle messaging, Arabic UI replay and device-only matrix. General reminder approval/payload and native capture remain open.

At checkpoint mobile suite542/542 and template-time regression1/1 passed; targeted lint passed before the last multipart/removal changes. Final follow-up checks recorded in runtime-final logs. No overall E2E or production sign-off.

### Mobile balance presentation follow-up

User requested a cleaner full balance card. Replaced the squeezed icon/helper header and separate Used/Total box with: remaining label, prominent32px count, one localized usage line,44px Add More action, full-width helper below a divider. Compact home card remains unchanged. Removed obsolete full-card styles. English phone-width screenshot inspected after translation reload:209,21of230used,full explanation,clear button. Targeted ESLint passed. No accounting logic changed.

### Mobile continuation — host update, schedule and launch (2026-09-09)

- MH01 full host update replay passed in the Expo UI: renamed title to `E2E-260908-MH-01 Meeting Updated`, preserved all five canonical guest phones, added one whitelisted supervisor, replaced artwork with a matching Sep18 meeting card, saved all invitation settings. Local API step2 and invitation-settings returned200.
- Fixed backend phone round-trip: existing canonical966 phones were truncated by an input clamp, rejecting unchanged guests during update. Event and guest validators now normalize digits/formatting without truncation; strict Saudi validation retained. Two new regressions cover supported formats and invalid long/letter inputs. Backend585/585passed.
- Fixed mobile populated templateRef conversion to its ID on load and mutation. Before: final update400 Expected string; after: actual UI success and persisted settings.
- Fixed Manage Event heading translation and staff list button incorrectly labelled Guest list. Staff label has English/Arabic translations; latter needs runtime replay.
- Mobile test invitation sent through UI to authorized7741; Arabic template and provider ID persisted; delivery receipt confirmed. Immediately Test Message disappeared, Schedule Delivery and the correct guidance appeared without refresh.
- Scheduled through mobile UI for Sep10 at12:00; API200; database scheduledDate2026-09-10T00:00Z and scheduledTime12:00. Reopened from home: both saved values retained. Notify Staff appeared for the scheduled event with staff; actual authorized6383 notification accepted with provider ID and Arabic template.
- Copied only MH01 QA artwork to existing VPS upload volume; publicHTTP200. No code deployment.
- Scoped scheduler launch using existing guarded harness (no global cron):5/5 invitation successes, event live, mobile home balance204remaining/26used/230total after reload. Four delivery receipts and one accepted at initial audit. This proves scoped worker execution, not passage of the wall-clock scheduled time.
- Mobile542/542passed and targeted lint passed after update fixes. Evidence: ignored mobile-continuation-tests.log, backend-continuation-tests.log, mh01-after-update.json, mh01-schedule-evidence.json, mh01-launch.log, transport audit and backend-runtime-mobile.log. Schedule evidence file refreshed by audit and now reflects latest live state; original scheduled values remain in launchSettings and runtime logs.
- Still open: admin mobile execution, remaining management/lifecycle branches, reminder provider approval/payload blocker, native-only matrix, RTL/runtime replay, cleanup. Browser reload of EventDetails routed to Home; record for navigation follow-up. No full mobile or production sign-off.

### Admin mobile runtime blockers repaired

The admin Events tab crashed because useBulkCancelEvents was not exported from hooks/admin. Exported it and moved AdminEventList to the domain-specific admin import, avoiding the duplicate generic bulk-delete hook name. Replayed list successfully. Opening live details then crashed because EventActionsSection imported a default-only EventActionRow as a named export; fixed and replayed owner detail successfully. Two executable module/component regressions added, full mobile suite544/544 and targeted lint passed.

Admin host-owned MH01 now displays the host name, Basic Monthly and203remaining/27of230used, matching the host after the mobile one-guest resend. That resend was delivered with a durable provider ID; no extra guests were targeted. New-guests action had no eligible audience; reminder action showed the provider setup limitation. Changed misleading Suspend Event label to Cancel Event, verified in the admin list. Added missing Event owner localization and corrected cancellation text that falsely promised guest notifications; inspected backend path, which only notifies the host. Runtime replay of the final translated copy is in progress.

### Admin actions brought into a phone-sized header sheet

User requested direct comparison with web. Full comparison table added to EVENT_MOBILE_PARITY_REVIEW.md. Added AdminEventActionsMenu wrapping existing status/delete handlers, plus direct staff-management shortcut. Removed the duplicate lower-page admin action card. Improved EventActionRow readable type/wrapping/accessibility. Actual phone-width sheet screenshot and staff shortcut replay passed. Missing owner heading and corrected cancellation copy verified after a full browser reload. Suite544/544passed; lintpassed; production exports running. Latest MH01 received a real attendance response from5122; UI attending1/pending4. Receipt/QR audit pending.

### Admin create-on-behalf verified (MA01)

Found HostSelectorStep ignored the backend targets array and the query retained an extra API envelope. Fixed query unwrapping/error propagation, target array selection, and added localized empty/retry UI. Web HostSelector already reads data.targets/targets. Executable regression verifies the nested success payload and failed-request behavior. Actual UI now lists the seeded host, selects it and advances with the host's203-invite allowance. DB target subscription audit confirms basic_monthly_200,203remaining,27consumed,230total; Unlimited in owner selector means unlimited event count, not unlimited invitation balance.

Created one mobile admin-on-behalf fixture through all six steps:6aa0825aa962bf90df979af7,E2E-260908-MA-01 Conference,host6a9dfeda51f0c164d00994e8,Sep19 2026 20:00Riyadh,manual venue,5authorized guests reused from admin guest library,matching QA artwork,reply_only,Arabic replies. API201 and DB pending_scheduling verified. Balance unchanged203/27/230. No outbound messages for MA01. Registered manifest and private ma01.json. Public copy of this new artwork is still required BEFORE sending.

Final mobile suite545/545passed, targeted lintpassed. Android/iOS/web production exports passed after action-sheet changes (before final owner-selector adapter fix); no native binary runtime claim. Additional findings for subsequent E2E: admin-created guests display Added by host rather than admin (audit actor semantics to inspect); admin Publish status transition exists on both platforms before a schedule/test is set (verify semantics and avoid treating a bare scheduled status as a real queued delivery). Remaining MA update/self/lifecycle, RTL/device tests and cleanup remain open.

## September 9 release checkpoint — reported mobile fixes

- Fixed sibling category-picker presentation and guest-list re-entry; moved removal confirmation into a separate visible sheet. Local browser replay passed; native device confirmation remains user-led.
- Normalize canonical Saudi guest numbers to local 05 format for display/editing without changing database storage. Test-message validation accepts 05 (10 digits) and 5 (9 digits).
- Added Expo browser download implementation; export endpoint returned HTTP 200. User must confirm the saved spreadsheet in their browser/device.
- Web/mobile auto-reply descriptions now match backend behavior: QR confirmation includes editable reply, event title/date/time/address, guest count and entry instructions; text-only confirmation and decline contain only the configured reply. No separate location pin is sent.
- Scheduling hint explicitly distinguishes trial 15-minute and paid 24-hour lead times; both require sending at least three days before the event, in Riyadh time.
- MA01 audit: test message accepted with provider message ID; status scheduled with September 10, 2026 at 02:35 Riyadh. User-edited guest ending 6384 is outside the original QA recipient allowlist; restore an approved recipient before a scoped send.
- User now owns UI testing. Remaining lifecycle/reminder/device verification is open; this release does not certify those checks as complete.
- Release checks: backend 585/585, mobile 547/547, web 216/216, check-in contracts/API/web 132/132. Check-in production build passed. Production deployment evidence will be recorded separately.

September 11 MA01 scoped launch: restored edited phone 966505826384 to originally authorized 966505826383; four guests retained. Copied latest local QA artwork to matching persistent VPS upload path and verified public retrieval. Fingerprint matched before launch. Guarded worker accepted 4/4 invitations, zero failures, four provider IDs; initially two delivered/two accepted pending receipt. Subscription used27->31 and remaining203->199. Second worker call returned launched:false/reason:stale, preventing duplicate send. Admin completed endpoint returned200 and post-event management GET200. User can now test post-event photo/message save, reopen and sharing. No reminder test performed and no post-event notification sent yet.
