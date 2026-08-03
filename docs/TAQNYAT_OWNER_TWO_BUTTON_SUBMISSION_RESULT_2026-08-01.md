# Taqnyat two-button template submission — 1 August 2026

## Result

- Submitted and found upstream: **14 / 14**.
- Assigned in Hala: **14 / 14**.
- Requested category: **UTILITY**.
- Current provider status after the final sync: **7 APPROVED**, **7 PENDING**.
- Header: **IMAGE**, using the Step 3 event design at send time.
- Body variables: **7**.
- Buttons: **2 QUICK_REPLY** controls — `سأحضر`, `سأعتذر`.

The seven previously submitted plain templates are retained and were not resubmitted. All seven are **APPROVED**, have zero buttons, and their body ending omits the response instruction.

## Data cleanup applied

- Converted two stored tentative guest responses to the non-response state.
- Removed the old third auto-reply field from six events.
- Normalized seven legacy events to the default `reply_and_qr` mode.
- Deactivated 19 locally assigned legacy templates that exposed a third reply or a direct QR control.
- Removed obsolete template references from six existing events.
- Mapped the approved general-event template to graduation and meeting as the catalog fallback; two graduation events were assigned.
- Reassigned one conference event after its replacement was approved. Five wedding/birthday events remain intentionally unassigned until their replacements are approved.

Because the 14 replacements are still pending, those existing events are intentionally left without a selectable reply template. Re-run `npm run migrate:two-choice-invitations -- --apply` after Meta approval; the migration automatically assigns approved `v2` replacements by event category and mode.

## Files

- `TAQNYAT_OWNER_TWO_BUTTON_TEMPLATES_MANIFEST.json`
- `TAQNYAT_OWNER_TWO_BUTTON_TEMPLATES_DRY_RUN.json`
- Backend submission state: `.taqnyat-owner-two-button-submission-state.json` (not committed)
