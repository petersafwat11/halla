# Invitation types and automatic replies: cross-platform alignment

Date: 2026-09-10

## Actual delivery behavior

| Mode / response | Personal invitations: WhatsApp reply | Business invitations: website result |
| --- | --- | --- |
| RSVP + QR, confirmed | One QR image with a caption: host reply, event title, date/time, venue address, party size, entrance instruction | Host reply and guest-specific entry pass on the invitation website |
| RSVP without QR, confirmed | Host reply text only | Host reply on the invitation website; no entry pass |
| Either RSVP mode, declined | Host decline reply text only | Host decline reply on the invitation website; no entry pass |
| Invitation only | No RSVP buttons or automatic reply | Information-only invitation; no RSVP or automatic reply |

The WhatsApp venue is a text address in the caption. There is no separate location message, map pin, map link, calendar action, or ride action in this reply. Business website directions, calendar, and ride controls are separate website features, available when the event has the required data.

Dates use Asia/Riyadh, Gregorian dates, and Latin digits. Date/time and venue lines are included only when available. The WhatsApp caption uses Arabic by design, independently of the host interface language. Custom reply text remains exactly the host's text apart from trimming; empty or whitespace-only overrides use the shared Arabic defaults. The QR is generated for the actual guest; the form uses a clearly labelled illustrative symbol and a sample party size of one.

If the immediate WhatsApp reply fails, the backend attempts SMS delivery. For QR confirmations the SMS contains the caption plus a link to the QR image, not an image attachment. Business website responses do not trigger this WhatsApp/SMS auto-reply path. Repeated identical WhatsApp RSVPs are ignored, and replies to test invitations are intentionally ignored.

## Gaps found

- Personal Step 4 already had an explanatory delivery hint listing the QR caption fields, but the editor showed only the custom text and no complete computed reply. The landing preview also omitted most automatically appended fields.
- Web and mobile mode metadata and marketing descriptions were duplicated. The landing section was substantially larger than the Step 4 selector.
- Business Step 4 used WhatsApp auto-reply explanations even though responses and passes appear on the website.
- BusinessGuestHub preferred the guest's optional note over the backend's host-reply message. An entered guest note could hide the configured automatic reply.
- Review summaries showed only the custom text and could miss the actual default used when the field was blank.

## Changes

- Shared invitation metadata and Arabic/English mode copy in `shared/src/constants/invitationTypes.js`. Web, mobile, summaries, and landing use these definitions.
- Shared caption/date/default resolver and delivery policy in `shared/src/utils/rsvpMessages.js`. The backend WhatsApp sender and both form previews use the same implementation; the outbound caption content is preserved.
- Step 4 now distinguishes editable text from the computed guest-facing result. Mode changes, confirmation/decline tabs, edits, blank defaults, current event details, and personal/business delivery all affect the preview.
- Review summaries show the same reply preview instead of only the editable portion.
- Business guest pages show the host reply and a separately labelled guest note.
- Landing reduced to three compact, non-interactive option summaries; precise delivery details, business behavior, and SMS fallback sit in an expandable explanation. No fabricated conversation, oversized preview, or popularity claim remains. The inspected desktop section is approximately 328px high when collapsed.

## Verification

- Shared contract: 5 tests, covering all mode/response/delivery combinations, exact QR caption fields, blank defaults, omitted fields, Riyadh day boundaries, and party size.
- Backend: 21 tests across invitation-reply-delivery, Arabic guest replies, date localization parity, and business RSVP integration. Actual webhook handlers ran against an isolated in-memory MongoDB with transport calls mocked. Their outgoing caption/text matches the frontend preview. Includes SMS fallback and business reply preservation after reload.
- Web: 11 tests across runtime Step 4/guest hub, business invitation rules, and landing copy. Runtime tests cover Arabic/English, personal/business, edits, defaults, switching modes, decline, and separate guest notes.
- Mobile: 13 existing localization and keyboard-owner checks passed; all three changed mobile JSX components parsed successfully. Native Android/iOS rendering was not run.
- Landing visually reviewed in Arabic desktop/mobile and English desktop. Expandable details work.
- Targeted web lint: no errors; existing image-element warning in Summary.js. No production build or live provider send was performed.
