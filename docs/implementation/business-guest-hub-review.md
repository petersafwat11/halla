# Business Guest Hub review

Reviewed the original implementation across event creation, guest RSVP, staff check-in, template assignment, message delivery, routing/privacy, and web/mobile presentation.

## Corrections

- Moved guest-page copy and metadata into `businessGuestHub.json` in Arabic and English. Cover inputs use `createEvent.json`; template administration and the mobile browser handoff use their existing dictionaries. Components call the established translation hooks.
- Split the guest hub into the page layout, RSVP state hook, response form, and calendar/navigation actions. Guest routes load only their required translation namespaces. Query keys include the requested language; RSVP mutation data is discarded when inactive.
- Preserve drafts during background reads and rejected submissions. Prevent duplicate submissions throughout the write/read cycle. Recover uncertain writes by checking saved values, and retain a successful write when the follow-up read fails.
- Preserve business delivery mode in event-edit template previews. Existing business events can be edited without supplying another cover. New business events still require a cover and logo.
- Share cover limits and crop geometry between web, mobile, and backend. Crops stay within image bounds and do not enlarge the source. Mobile crops resize before upload. Backend dimension checks account for EXIF rotation.
- Handle the event wizard's colon-separated AM/PM time format in calendar actions. Escape standalone carriage returns in calendar text.
- Preserve attendance and the original check-in timestamp when a guest updates an RSVP after check-in. Business check-in advances the revision to prevent a concurrent RSVP from overwriting it. Legacy guests without a stored revision can respond; orphaned events cannot.
- Keep private guest URLs out of failed-request console logs as well as successful-request logs. Private signed images bypass the shared Next image optimizer.

## Visual direction

The redesign anchors the Business Guest Hub firmly inside Halaa's design system, replacing the isolated slate-blue direction with Halaa's warm camel, sand, and charcoal design tokens. The event cover and overlapping digital invitation card remain the central visual feature, elevated with a VIP entry pass card, Cairo/Inter typography, and authentic ticket perforation.

| Token | CSS Variable | Value | Purpose |
| --- | --- | --- | --- |
| Text | `--color-natural-900` | `#2c2c2c` | Event title, headings, and primary body |
| Secondary text | `--color-natural-500` | `#4c4c4c` | Descriptions, metadata, and form help |
| Primary action | `--color-primary-800` | `#6b4e33` | Confirm button, VIP pass count badge (WCAG AAA 7.66:1) |
| Secondary action | `--color-primary-100` / `800` | `#f5ece4` / `#6b4e33` | Secondary button background and text (6.50:1 contrast) |
| Page background | `--bg-artboard` | `#f9f4ef` | Signature Halaa warm sand artboard canvas |
| Card surface | `--color-natural-50` | `#ffffff` | Overlapping digital invitation card & pass card |
| Card border | `--color-primary-100` | `#f5ece4` | Subtle luxury border definition |
| Input boundary | `--color-secondary-300` | `#8b827a` | Form inputs and textareas (WCAG 1.4.11 3.78:1 contrast) |
| Confirmed tone | `--color-success-500` / `50` | `#2a8c5b` / `#eaf4ef` | Attendance confirmation banner and badge |
| Ticket divider | `--color-primary-200` | `#e3cbb4` | Dashed ticket stub with `#f9f4ef` cutout notches |

All colors satisfy WCAG 2.1 AA/AAA accessible contrast (headings > 10:1, buttons > 7.6:1, input boundaries 3.78:1, input focus visible). Menus stay within mobile viewports in both reading directions, support Escape, and expose keyboard focus. Forms use semantic labels, fieldsets, optional-field indicators, and an accessible saving state. The unified `.entryPass` layout fits a 320px viewport without horizontal scrolling, preserving line breaks and wrapping unbroken words safely.

## Verification

- Backend: 566 passing tests, including real HTTP route, database concurrency, cover decoding, QR/check-in, and messaging integration checks.
- Web: 211 passing tests.
- Mobile: 540 passing tests.
- Production Next.js build passed.
- Production browser harness: 252 assertions across 12 Arabic/English, invitation-mode, and desktop/mobile scenarios; automated in-browser relative luminance calculations (Confirm button/badge = 7.60:1 AAA, input border = 3.77:1 non-text); single-surface pass verification with QR prioritized above response note; additional 320px pass checks with long multiline and unbroken text. Includes downloads, menu placement/Escape, reloads, response changes, saved fields, rejected writes, lost responses, failed follow-up reads, and closed/preview/invalid links.
- All changed JavaScript/JSX/CJS/MJS files parsed. Changed web JS and JSX linted with zero errors.
- Reviewed screenshots for all language/mode/layout variants with realistic executive corporate assets and localized copy. Updated fixture screenshots are in `docs/evidence/business-guest-hub/`.

Browser data and messaging-provider responses are test fixtures. Native application handoff, physical QR scanning, real calendar apps, and approved Taqnyat delivery still need the release checks in the rollout notes. No production migration, external messages, or deployment was performed.
