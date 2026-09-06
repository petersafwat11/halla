# Host event flow implementation report

Date: 2026-09-06

## Review verdict

The audit correctly prioritized the silent update-save failures and guest integrity problems ahead of visual changes. Those findings reproduced against the current source. The implementation keeps the existing messaging engine, template preview/bake pipeline, shared table, and native event components; replacing those wholesale would add risk without fixing the underlying contracts.

This report records the implemented remediation, not a claim that the audit's entire multi-device release checklist has passed.

## Implemented

- Web guest/design saves use an explicit shared section adapter, preserve the multipart image, reject unknown sections, and require a mutation result before reporting success. Update navigation supports named sections, unsaved-change confirmation, event return paths, and an auto-unschedule success explanation.
- Quick-add uses the stamped event subscription, treats `-1` as unlimited per event, counts active documents, includes compensation, and creates the guest and event reference in one Mongo transaction. Event writes serialize concurrent additions. The existing list-add/replacement APIs now delegate to the atomic step-2 service, with version checks against concurrent changes.
- Normalized phones are enforced through a model setter, including insert/update paths. Quick-add catches duplicates; the database uniqueness index has an explicit report-first installation script. The API accepts idempotency keys for quick-add and requires them for bulk operations.
- Single and bulk removal retain guest documents with deletion metadata. Event-list aggregates, detail population, model stats, exports, and guest portal reads exclude removed guests in the changed paths.
- Guest list queries accept bounded pagination, search, status combinations, category, sorting, and failed-delivery filtering. Web pages/search persist in the URL. Native uses an infinite query and a FlatList that owns scrolling; the add/edit modal no longer renders another roster.
- A backend audience-preview endpoint supplies complete eligible IDs/counts. The send engine and preview use the same audience predicates. Compatibility consumers collect all pages and fail on incomplete loads. An explicit empty ID selection targets nobody rather than the full audience.
- Backend lifecycle capability flags and denial reasons are included in event detail, stats, and the existing capability response. Web/native controls use these flags where available. Test/notify-staff visibility agrees with backend lifecycle rules; quota, test validity, edit locks, and resource-specific prerequisites remain authoritative server checks.
- Web quick-add, page-scoped selection, bulk category/removal, and selected resend reuse existing components. Native provides selection, category/removal, and selected resend with confirmation. Bulk results report requested/eligible/updated/skipped/failed counts.
- Existing dates can remain unchanged after the moving creation floor passes. Changed invalid dates are rejected before unscheduling. Event-specific constraints reach update date pickers. Unchanged date/time/location fields no longer trigger the scheduled edit lock merely because a full form submitted them.
- Manual/legacy addresses normalize without invented coordinates; zero coordinates remain valid real coordinates. Web has manual entry and map retry. Native manual entry clears any earlier pin. The flat latitude/longitude API shape is retained for compatibility, using null for an absent pin.
- Zero-field web templates can open preview and save a baked image. Switching web design modes retains separate drafts, and cancelling customization preserves the committed design. Changing template fields without a new image fails visibly before unscheduling. Provider-template empty/error states offer refresh.
- Summaries show the invitation visual, use corrected date formatting, and explain saving followed by testing/scheduling. Creation returns to the event when its ID is available. Native partial-delivery feedback is mounted and opens a failed-recipient filter; refresh waits for all relevant queries.
- Selection, confirmation, back navigation, and new copy received targeted accessibility/localization improvements. This is not a complete screen-reader or visual certification.

## Verification

- Backend remediation/creation/lifecycle/scheduling/subscription integration suites: **68 tests passed**.
- Web suite: **206 tests passed**.
- Mobile event/regression suites: **82 tests passed**.
- Shared suite: **204 of 205 passed**. The existing localization-parity test fails on untouched `landing.json` and `plans.json` Arabic compensation plural keys missing from English. The new section, pagination, and location tests pass.
- Web production build passed. It reports existing metadata/lint warnings and an invitation-preview image optimization advisory.
- Changed JavaScript/JSX received syntax and undefined-variable checks; modified native surfaces passed their ESLint checks.

Regression coverage includes canonical `-1` events, concurrent capacity exhaustion, normalized duplicates, a real partial unique index, soft-delete counts/history, 201-row pagination and audience calculation, bulk lifecycle rejection, unchanged dates, invalid-date schedule preservation, and stale template-image rejection.

## Database and deployment procedure

1. Use a Mongo replica set/sharded deployment for transactional quick-add, removal, and bulk operations. These paths fail rather than silently degrading to non-atomic writes. The existing step-2 standalone compensation path remains for compatibility.
2. From `halaa-backend`, set the intended database's `MONGODB_URI` and run `node scripts/audit-active-guests.js`. The default reports normalized duplicate IDs, invalid-phone IDs, and stale event-reference counts without changing data.
3. Review duplicate histories and stale references with the data owner. The script deliberately does not choose a guest history to delete or merge.
4. Pause guest writes for normalization/index installation, then run `node scripts/audit-active-guests.js --apply`. It refuses to apply when duplicates/invalid phones remain, normalizes active phones, fills legacy `deleted: false`, and installs `active_event_phone_unique`.
5. Deploy the additive backend endpoints/contracts before the clients. Keep the index after a client rollback; do not restore physical guest deletion. New bulk/audience calls must not be enabled against an older backend.

No production database migration, deployment, provider send, or live guest mutation was performed during implementation.

## Remaining release work / roadmap

- Execute duplicate/stale-reference review and index installation against the intended database; the local replica-set tests are not a production-data audit.
- Run authenticated browser/device E2E and visual checks across the audit's viewport, RTL/LTR, keyboard, text scaling, offline, permissions, and native iOS/Android matrix. A production build and source tests do not establish these results.
- Test canonical image generation against the configured media/provider environment, including CORS/network failures. This implementation repairs the existing preview/bake path; it does not introduce a separate server renderer/media service.
- The audit's wholesale responsive card redesign, exhaustive field-schema migration, broad accessibility/literal sweep, persisted offline drafts, feature-flag rollout, and performance telemetry comparison remain separate work. They are not represented as completed by the targeted functional remediation above.
- Capability flags describe lifecycle permission after ownership scoping. A future fully prerequisite-aware capability contract can also summarize per-field edit locks, valid-test fingerprints, retry readiness, and post-event token existence.

The original audit remains a historical source snapshot. Use this report to distinguish repaired paths from the broader uncompleted roadmap before implementing further changes.
