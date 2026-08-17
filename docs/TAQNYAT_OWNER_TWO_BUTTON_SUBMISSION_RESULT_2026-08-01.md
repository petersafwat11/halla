# Taqnyat two-button template submission — 1 August 2026

## Result

- Submitted and found upstream: **14 / 14**.
- Assigned in Hala: **14 / 14**.
- Requested category: **UTILITY**.
- Current provider status after the 3 August sync: **14 APPROVED**, **0 PENDING**.
- Header: **IMAGE**, using the Step 3 event design at send time.
- Body variables: **7**.
- Buttons: **2 QUICK_REPLY** controls — `سأحضر`, `سأعتذر`.

The seven previously submitted plain templates are retained and were not resubmitted. All seven are **APPROVED**, have zero buttons, and their body ending omits the response instruction.

## Data cleanup applied

- Converted two stored tentative guest responses to the non-response state.
- Removed the old third auto-reply field from six events.
- Normalized seven legacy events to the default `reply_and_qr` mode.
- Permanently removed 19 obsolete local Hala template records that exposed a third reply or a direct QR control. Historical provider templates remain in Taqnyat.
- Removed obsolete template references from six existing events.
- Mapped the approved general-event template to graduation and meeting as the catalog fallback; two graduation events were assigned.
- Reassigned the approved replacements to all affected events, including four wedding events and one birthday event. No reply-enabled events remain unassigned.

All 14 replacements are approved, synced, assigned, and selectable in Hala. Ladies' events and baby showers now have distinct Hala categories; graduation and meeting intentionally use the general-event fallback.

## Files

- `TAQNYAT_OWNER_TWO_BUTTON_TEMPLATES_MANIFEST.json`
- `TAQNYAT_OWNER_TWO_BUTTON_TEMPLATES_DRY_RUN.json`
- Backend submission state: `.taqnyat-owner-two-button-submission-state.json` (not committed)
