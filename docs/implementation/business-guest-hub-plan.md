# Professional Business Guest Hub — implementation plan

Status: proposed implementation plan; no application changes made.
Date: 2026-09-07.

## 1. Product contract

Business invitations use `/{lang}/business-invitation/{code}` and remain responsive websites. Personal invitations retain their current WhatsApp-native journey.

**Business WhatsApp templates contain message text and a guest-specific link in the body, with zero buttons of any kind.** This supersedes the earlier proposal for a dynamic URL CTA button. Do not send quick-reply buttons, URL buttons, or QR follow-ups for this business journey. Invitation type controls the website only.

| Stored invitation type | Business WhatsApp | Business website |
| --- | --- | --- |
| `reply_and_qr` | Message + body link; zero buttons | Confirm / Decline; server-issued QR pass after confirmation |
| `reply_only` | Message + body link; zero buttons | Confirm / Decline; confirmation without QR |
| `none` | Message + body link; zero buttons | Event information and greeting/message; no RSVP form or QR |

Retain the existing `none` value for information-only invitations; no new enum is necessary. Calendar, directions, and ride utilities remain available in information-only mode: “no buttons” in this website mode means no response controls, consistent with the original event-information requirements.

No custom brand color field. Cover, logo, and business name provide the identity.

## 2. Repository findings

- `halaa-backend/models/EventModel.js` already has `branding.logoKey`, `branding.businessName`, and `invitationDeliveryMode`; add the cover to this existing snapshot.
- `events.crud.service.js` already snapshots business name, copies the logo to an event-owned key, and sets `portal_link`. It currently permits business creation without a logo.
- `messaging.send.service.js` and `messaging.reminder.service.js` still construct `/ar/invitation/...` links directly, including preview/test paths.
- `messaging.formatting.js` includes the SMS response link only when replies are enabled, excluding information-only invitations.
- `TaqnyatTemplateModel.js` stores a single `invitationMode`. `taqnyat-template-capabilities.js` treats verified zero-button templates as compatible only with `none`; it needs delivery-aware compatibility.
- `guests.service.js` already rejects information-only RSVP and conditionally returns a pass on confirmation. Preserve and extend this behavior rather than building a second RSVP implementation.
- The existing web portal supports forms and response changes, but treats all 409/410 errors as success and supplies the invitation code to its QR component. The business hub must use authoritative response/pass data.
- RSVP writes currently replace omitted message, dietary, and plus-one values with empty defaults. Define partial-update behavior so response changes retain existing values unless deliberately cleared.
- Android intent filters in `halaa-mobile/app.json` enumerate the current invitation paths. Verify deployed iOS association rules and all other routing layers before assuming the new path stays on the web.
- `messaging.businessLink.service.js` handles subscription checkout links, not guest invitations; keep that responsibility separate.

## 3. Phase 1 — delivery and template contracts

Implement shared backend helpers for delivery resolution and guest URL generation. Use them from all send paths.

- New events: derive delivery from the actual event owner's account type, including admin-created events. Store `quick_reply` for personal and `portal_link` for business; clients cannot override it.
- Existing events: prefer the saved delivery snapshot. For null legacy values, classify once using available ownership evidence and persist a reviewed migration result. Account changes must not silently change an issued event's journey.
- Generate URLs from the configured trusted web origin, supported language, and encoded invitation code. Preserve the existing personal route.
- Add template `deliveryMode` and `compatibleInvitationModes[]`. Keep legacy `invitationMode` during transition for existing consumers.
- Business compatibility requires: approved and active template, verified button metadata, **zero buttons**, and a validated body mapping for `invitation.url`. One business template may support all three invitation types when its wording is mode-neutral.
- Derive/validate capabilities server-side from synced provider metadata and the body-variable mapping. An admin cannot declare an incompatible template safe.
- Missing/stale capability metadata must fail business selection and sending with an actionable template error. Never fall back to personal button templates.
- Update sync, assignment validation, host catalog filtering, admin mapping UI, template previews, and reminder-template lookup. Scope non-invite template activation rules by delivery mode so business and personal reminders can coexist.
- Include delivery/template contract changes in the invitation fingerprint and test-send validation. Exclude real guest codes from fingerprints/logs.

External prerequisite: approved, zero-button Meta/Taqnyat templates with a verified guest URL body variable for each launch language and required message purpose. A dynamic URL-button template is **not** the prerequisite. Validate actual delivered messages on test devices before launch; approval and clickability must not be assumed from the API schema.

Acceptance: one eligible business template can power all three modes; business payloads contain zero button components and the correct body URL; personal selection remains compatible.

## 4. Phase 2 — cover upload and event creation

Extend `branding` with `coverImageKey`, stored as an event-owned optimized asset. Continue deriving logo/name exclusively from the business account.

Implement Step 1 in both web and mobile creation flows, including the shared/admin creation path:

- Show the cover input only when the event owner is a business account.
- Require a cover for newly created business events; validate on both client and server.
- Offer 16:9 crop, preview, replacement, upload progress, and recoverable errors before continuing.
- Proposed initial limits: JPEG/PNG/WebP, 10 MB maximum source file, maximum 8,192 pixels per side and 40 megapixels decoded; require a crop large enough for a 960 × 540 output. Recommend 1,600 × 900 or larger. Keep these limits centrally configured.
- Validate actual file type and decoded image dimensions server-side, normalize orientation, strip metadata, reject corrupt/animated inputs, and optimize to a maximum 1,600 × 900 WebP image without upscaling. Target approximately 350 KB, allowing quality-based adjustment.
- Reuse existing storage/upload infrastructure; bind temporary assets to the authenticated owner and validate ownership before finalization. Do not accept arbitrary client-supplied storage keys as branding.
- Fail creation if the business logo is missing, with a stable error code and a direct link to the correct business settings screen. Admin creation identifies the selected business. Preserve wizard input when returning from settings.
- Finalize cover/logo snapshots with cleanup for failed creation and abandoned uploads. Confirm account logo changes cannot alter issued event branding.
- Include the cover in wizard summaries and hub previews. Keep it distinct from existing invitation artwork/template images; it is not automatically a WhatsApp image header.

Acceptance: new business events cannot be created through any entry point without valid logo and cover; personal creation remains unaffected.

## 5. Phase 3 — authoritative guest API and privacy

Extend the existing guest service and minimal guest DTO rather than copying RSVP logic.

- Return signed cover/logo URLs, business name, event details, existing RSVP values, and server-derived capabilities such as `canRespond` and `canShowPass`.
- Return a pass only for a confirmed guest on `reply_and_qr`, on both successful RSVP and subsequent page reloads. Pending, declined, reply-only, and information-only guests receive no pass payload.
- Validate event status, guest/code association, guest deletion/revocation, allowed response, and existing plus-one rules on every mutation.
- Reject crafted information-only requests. Block business RSVP mutations through the WhatsApp reply webhook, including stale message replies and text-based matching. Delivery-status webhooks continue normally.
- Preserve repeat-request behavior without duplicate notifications or passes. Test concurrent submissions and legitimate response changes. Keep omitted optional values; explicit empty values clear them.
- After a decline, stop returning the pass. Audit check-in validation so a saved QR cannot bypass current eligibility. Since invitation URLs currently use `guest.qrcode`, verify whether that code is also an entry credential; if it is, enforce scanner eligibility and separate portal/pass credentials where needed to satisfy confirmation-only entry.
- Use server success/state for UI transitions. Do not convert generic 409/410 responses into successful confirmation; reconcile a documented replay response by fetching current state.
- Set `Cache-Control: private, no-store` on private guest reads, mutations, and calendar responses; disable route/CDN/service-worker caching and persistent client caching for guest data.
- Use generic metadata and `noindex, nofollow, noarchive`, with no guest/event PII in titles, descriptions, Open Graph data, or structured data. Exclude the route from sitemaps.
- Apply `Referrer-Policy: no-referrer`; redact invitation codes and guest fields from analytics and request/error logs. Generate QR locally from the authorized pass rather than sending its credential to a third-party QR image service.

Acceptance: hiding controls is never the only enforcement; reloads, retries, response changes, and direct API calls produce the same authorized state.

## 6. Phase 4 — responsive Business Guest Hub

Create `halaa-web/app/[lang]/business-invitation/[code]/page.jsx` with a server metadata boundary and a client interaction component. Share suitable existing guest hooks and form primitives while keeping the business visual layout independent.

Page composition:

1. Responsive 16:9 event cover with readable business logo/name treatment.
2. Digital pass card overlapping the bottom of the cover.
3. Event title, Riyadh date/time, location, and utility actions.
4. Guest greeting and existing event/invitation message.
5. For reply modes: message to business, dietary restrictions, plus-one input, Confirm and Decline.
6. Server-confirmed outcome, response-change action, and eligible QR pass.

Use restrained neutral styling, consistent spacing, and no event color picker. Business identity must remain legible on both bright and dark cover images.

Implement Arabic RTL and English LTR, keyboard navigation, explicit labels, focus/error announcements, accessible contrast, and usable touch targets. Cover narrow phones and wide desktop layouts.

States: loading, retryable network failure, invalid/revoked link, closed event, information-only, pending response, submitting, confirmed with QR, confirmed without QR, declined, and changing response. Closed events show available information and a clear closed state with response controls disabled; pass visibility follows backend policy.

Update business-only Step 4 copy and WhatsApp previews in both clients: explain that the selected mode affects the guest website. Remove promises of WhatsApp buttons or QR follow-up from business copy.

Routing verification must cover middleware, deployed Apple association documents, Android intent filters, mobile linking configuration, and any app-opening scripts. Explicitly exclude the new route where wildcard claims exist. Test links inside WhatsApp on installed-app and no-app devices. Existing business links can redirect on the website, but links already intercepted by an installed app may require mobile handling; document that legacy limitation before rollout.

## 7. Phase 5 — calendar, directions, and rides

Use shared helpers that accept event details and return safe action URLs/download data, without guest fields or invitation credentials.

- Calendar: downloadable RFC 5545 `.ics` with stable event UID, escaped text, title, location, and start time derived from existing fields in `Asia/Riyadh`. Use UTC serialization or correct timezone components. No new end-time field; proposed default is a start-only event where supported, with a documented one-hour calendar-only duration where an integration requires an end. The hub must not present that duration as the event's actual end. Test Apple Calendar, Outlook, and Google Calendar import.
- Google Calendar: provide a prefilled calendar link using the same normalized start time. Verify the supported creation-link behavior during implementation.
- Directions: Google Maps universal URL `https://www.google.com/maps/dir/?api=1&destination={latitude},{longitude}` with validated coordinates and proper encoding. [Official Maps URL documentation](https://developers.google.com/maps/documentation/urls/get-started).
- Ride provider helper: generate Uber universal deep links using destination coordinates and event location label; use the documented provider parameters. Provide directions as an explicit browser fallback. Browser code cannot reliably infer app installation, so do not promise automatic failure detection. [Official Uber deep-link documentation](https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links/introduction).
- Keep Careem disabled until its production contract is verified. Missing/invalid coordinates leave location text visible and omit unavailable ride/directions actions.

## 8. Phase 6 — complete messaging integration

Apply the same resolver, body-link mapping, and template validation to:

| Path | Required verification |
| --- | --- |
| Initial/scheduled invitations | New business route, body link, zero buttons |
| Test messages | Safe preview code, correct route, no real RSVP/check-in mutation |
| Resends and failed-send retries | Same journey and guest identity; existing charging/deduplication preserved |
| Newly added guests | Shared dispatch primitive and business template |
| Automatic reminders | Business template/link; existing audience/timing rules preserved |
| Extra reminders | Business template/link; existing budget checks preserved |
| SMS and provider SMS fallback | Business link in every invitation mode, including `none` |

Do not expand automatic reminder audiences as a side effect. Information-only events have no confirmations, so existing confirmed-only reminder rules must not invent an audience. Any later information-only broadcast reminder is a separate product decision.

Taqnyat supports template body parameters, but production approval and the rendered URL must be verified for this specific contract. [Official Taqnyat WhatsApp API](https://dev.taqnyat.sa/en/doc/whatsapp/).

## 9. Phase 7 — migration, verification, and release

Migration is additive and repeatable:

- Inventory events with null delivery, missing branding, existing selected templates, and outstanding scheduled messages.
- Preserve existing personal template behavior; classify legacy business templates only when verified. Do not silently mark unknown zero-button metadata as safe.
- Enforce cover/logo requirements for new business events. Existing business events retain access with a neutral missing-cover fallback until upgraded; do not fabricate a historical branding snapshot from today's account data.
- Explicitly map eligible business templates before switching outstanding dispatches. Hold incompatible sends with an actionable reason rather than sending personal buttons.
- Deploy schema/helpers and the usable hub before enabling link-only business dispatch. Keep issued hub URLs functioning through rollback; pause new business sends if needed instead of falling back to personal WhatsApp controls.

Required verification matrix:

- Personal/business × three invitation types × every listed send path.
- Arabic/English × mobile/desktop, with real WhatsApp link-opening checks on iOS/Android.
- Missing/invalid images, spoofed file types, excessive dimensions, ownership mismatch, upload/copy failure, and cleanup.
- Crafted RSVP, repeated and concurrent submissions, closed/deleted events, optional-field persistence, page reload, response changes, and unauthorized QR access/check-in.
- Provider template sync/assignment/fallback behavior; assert zero business button components and correct body URL.
- No private response caching, metadata leaks, token referrers, or QR-service disclosure.
- Calendar time correctness from devices outside Riyadh, .ics imports, map destinations, and ride fallback.
- Existing personal invitations, budgets, retries, reminders, and WhatsApp confirmations remain functional.

Release sequence: contracts and template approval work → upload/creation and guest API → hub and utilities → all messaging paths and previews → migration rehearsal → end-to-end verification → controlled business rollout.

Done means all three website modes work, every business send contains the correct body link and zero buttons, new business events require valid branding/cover, privacy and server authorization checks pass, and personal flows retain their behavior.
