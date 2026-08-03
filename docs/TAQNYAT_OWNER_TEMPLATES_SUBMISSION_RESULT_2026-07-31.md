# Taqnyat Owner Templates — Submission Result

**Recorded:** 2026-07-31 01:57 (UTC+03:00)  
**Manifest:** `TAQNYAT_OWNER_TEMPLATES_SUBMISSION_MANIFEST.json`

## Submission outcome

- Planned templates: **21**
- Found upstream after `sync: 1`: **21**
- Assigned in Hala: **21**
- Meta category requested and returned: **UTILITY**
- Language: **Arabic**
- IMAGE headers: **21**
- Seven-variable mappings: **21**
- Purpose `invite`: **21**

## Current Meta/Taqnyat status

| Status | Count |
| --- | ---: |
| APPROVED | 1 |
| PENDING | 13 |
| REJECTED | 7 |

Approved:

- `halaa_engagement_plain_ar_v1`

Rejected with reason `INCORRECT_CATEGORY`:

- `halaa_wedding_qr_ar_v1`
- `halaa_engagement_qr_ar_v1`
- `halaa_conference_qr_ar_v1`
- `halaa_ladies_event_qr_ar_v1`
- `halaa_baby_shower_qr_ar_v1`
- `halaa_birthday_qr_ar_v1`
- `halaa_general_event_qr_ar_v1`

All reply-button and plain templates avoided rejection at the time of this
report. Thirteen remain under Meta review.

## Runtime consistency

- The approval sample uses `https://halaa.com.sa/logo.png`.
- Runtime invitations use the event-specific public image stored from Step 3 at
  `event.visualTemplate.bakedImagePath`, with `event.templateImage` as the
  legacy fallback.
- The QR-only URL uses the live production domain:
  `https://halaa.com.sa/ar/invitation/{{1}}`.
- Reply templates are assigned to `reply_and_qr`.
- Plain templates are assigned to `none`.
- QR-button templates are assigned to `qr_only`.

## Provider findings

1. The live Taqnyat v2 media upload endpoint is `/media/`; the alternative
   `/templates/media/` returned HTTP 404.
2. A media upload ID is not accepted as a template `header_handle`. The live
   template endpoint requires a public image URL.
3. Meta rejected all seven QR-only Utility templates as
   `INCORRECT_CATEGORY`. They were not automatically resubmitted or changed to
   Marketing because the requested category was explicitly locked to Utility.

## Next action

Continue `sync: 1` status checks for the 13 pending templates. The seven rejected
QR-only templates require a product decision before creating versioned
replacements: either permit Marketing classification for that mode, or redesign
the Utility QR journey and submit it under new unique names.
