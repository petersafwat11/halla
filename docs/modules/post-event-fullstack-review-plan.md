# post-event — Full-Stack Review Plan

**Module:** post-event
**Generated:** 2026-05-07
**Last audit:** 2026-05-08 (decisions locked, claims re-verified against current code)
**Prompt:** docs/implementation/MODULE_FULLSTACK_REVIEW_PROMPT.md
**Status:** READY TO IMPLEMENT — all decisions locked

---

## 0. Executive Summary

Verified state of the module after deep audit (deltas vs. 2026-05-07 snapshot are noted with **[delta]**):

- **15 total endpoints** in module (1 public token validate · 4 guest-auth · 10 host-auth) — to be **collapsed to 14** after merging `/photos` + `/videos` into a unified `/media` endpoint
- **Backend bugs verified:**
  - Mongoose **^8.9.7** (`labbe-backend-/package.json:32`) — `post.remove()` at `post-event.service.js:134, 151` is broken; must use `content.posts.pull(id)`
  - Taqnyat send flow **claims** WhatsApp+SMS-fallback (comment at `service.js:405`) but the implementation calls `taqnyat.sendSMS` only (`service.js:436`). SMS-only today.
  - Hardcoded message body in Arabic at `service.js:435, 484` instead of consuming the existing **`taqnyat-templates`** module
  - `validateToken` controller (`controller.js:135–146`) bypasses `responseHelper` to shape 410-Gone responses; `globalErrorHandler.js:130–161` does **not** read `err.body`
  - Direct `process.env.JWT_SECRET` read at `service.js:277` (canonical path is `config.jwt.secret` per `config/index.js:41–42`)
  - Status string literals `'attended'`, `'confirmed'` at `service.js:369–370` — values match `GuestModel.js:292` enum but should be centralised in a `GUEST_STATUS` constant
  - Dead controller export `getGuestContent` at `controller.js:119` (no router consumer)
  - No Zod validation file for the module; `validateZod` middleware available at `shared/middleware/validation.js:401`
- **Backend file-size violation** (1): `post-event.routes.js` — 523 lines (cap 400)
- **Web file-size violation** (1): `hooks/reactQueryHooks/usePostEvent.js` — 255 lines (cap 250)
  - **[delta]** `LastEventStats.jsx` is now **122 lines** (was 570 in 2026-05-07 snapshot) and the `responseData?.data || responseData` fallback is **already removed** (line 39 reads `responseData?.data`). Out of scope for this plan.
  - **[delta]** `services/postEvent.js` legacy SDK status — re-verify during Phase 2.B; if dead exports remain, delete them.
- **Mobile file-size violation** (1): `components/host/post-event/PostCard.js` — 371 lines (cap 350)
- **Cross-platform path bugs (both platforms):**
  - Web `services/new-backend/api.config.js:370` → `sendBulkAccessEmails: '/post-event/${id}/send-emails'` (404 against backend `/send-access-links`)
  - Mobile `config/api.js:206` → `SEND_EMAILS: '/post-event/${id}/send-emails'` (same 404)
- **Web has DELETE `unlikeContent` mutation** (`usePostEvent.js:101–122`) — backend only supports POST toggle. Dead code.
- **Missing endpoints on consumers:**
  - `unpublish` — no path entry on either platform
  - `uploadVideo` / `deleteVideo` (which will be replaced by unified `/media`) — no UI on either platform
- **Mobile has no canonical hooks** — both screens use `useState` + `useEffect` calling services directly (violates C2). Web uses React Query end-to-end. Mobile must catch up so both platforms are structurally identical.
- **Web orphan navigation** — `EventActionsHeader.jsx:106` and `LastEventStats.jsx` link to `/${lang}/host/post-event/${eventId}`, which 404s. **Decision locked: build the page.**
- **InvitationCard is hardcoded demo data** (`InvitationCard.jsx:11–16`). **Decision locked (Q6):** the visual card reads directly from the parent `Event` (host name, event title, date, location, `visualTemplate`) returned in the `getPostEventContent` response — no new sub-doc on `PostEventContent`. The only new persisted field on `PostEventContent` is `taqnyatTemplate.templateRef` (the WhatsApp messaging template).
- **Taqnyat templates module exists** at `labbe-backend-/src/modules/taqnyat-templates/` with `GET /taqnyat-templates?category={category}` (audit-verified host-facing endpoint at `taqnyat-templates.service.js:108–123`). The events module already consumes it via the canonical pattern `Event.taqnyatTemplate.templateRef` (`EventModel.js:170–175`) saved by StepFour and resolved at dispatch by `messaging.formatting.js → resolveTaqnyatTemplate / getEventBodyParams`. Post-event does not consume the module today. **Decision locked: copy the StepFour pattern verbatim** — host picks a template (filtered by `category: 'post_event'`) on the new web host page, save endpoint persists `PostEventContent.taqnyatTemplate.templateRef`, dispatch reuses the existing `resolveTaqnyatTemplate` helper plus a sibling `getPostEventBodyParams` resolver and the existing `taqnyat.sendWhatsAppTemplate` client (with native `smsFallback`).
- **Mobile `_legacyToken` parameter** (`hostPostEventService.js:11`) is dead — every screen still passes `token` as the second arg (lines 28, 31, 37, 43, 48, 51 in `HostPostEventScreen.js`). Drop everywhere.
- **~10 comment-hygiene markers** (FLOW-21-F02/F04, Phase 3b.3, Phase 3e, Track-B, H-16, Phase 4 W0-AUTH) confirmed across all three platforms — full inventory in §2.7 / §3.6 / §4.7.
- **Estimated effort: L** (large — backend route split + media unification + WhatsApp template-ref pattern (StepFour port) + dynamic invitation card sourced from Event + new web host page + mobile hook layer + cross-platform cleanup + comment hygiene)

---

## 0.1 Locked Decisions (final, no further confirmation needed)

| # | Question | Locked answer | Rationale |
|---|----------|---------------|-----------|
| Q1 | Build web host post-event management page? | **YES — build `app/[lang]/host/post-event/[eventId]/page.js`** | Mutations already defined in `usePostEvent.js`; mobile already has `HostPostEventScreen.js` — web must match (web ↔ mobile parity) |
| Q2 | Unified media endpoint vs. separate photos/videos? | **UNIFY into `POST /post-event/:eventId/media` (multi-file, photos OR video, S3-backed). Delete `/photos` and `/videos` routes.** | Backend currently has two endpoints with the same `uploadMedia` middleware feeding S3; one endpoint reduces frontend coupling and simplifies hooks. Verified two endpoints today (`routes.js:261, 299`). |
| Q3 | 410-Gone shaping fix | **Option (a) — generalise `globalErrorHandler` to honour `err.body` and bubble it into the response.** Move shaping into the service so the controller is plain. | Audit confirmed `globalErrorHandler.js:130–161` does not read `err.body`. Generalising is preferred (the validateToken case will recur for other token-revocation flows). |
| Q4 | `requireSubscription` on post-event host endpoints? | **NO — post-event is guaranteed for every event regardless of plan.** | User direction. |
| Q5 | Quota / size restrictions on uploads? | **NO — do not add `checkMediaLimit` or per-plan quota gating.** Multer's per-file limits stay (size, MIME) — these are correctness, not metering. | User direction. |
| Q6 | InvitationCard + access-link messaging data source | **Dynamic, two separate concerns — both follow the events/StepFour canonical pattern.** (a) **Visual invitation card** rendered on the guest post-event page reads its metadata (host name, event title, date, location, etc.) **directly from the parent `Event` document** in the `getPostEventContent` response — the metadata already exists on Event from create-event; we do NOT add a new `invitation{}` sub-doc on PostEventContent. (b) **Access-link WhatsApp message** is a Taqnyat-template selection saved on `PostEventContent.taqnyatTemplate.templateRef` (ref: `TaqnyatTemplate`) — **identical canonical shape to `Event.taqnyatTemplate.templateRef`** at `EventModel.js:170–175`. Host picks from a category-filtered list via the same `useHostTaqnyatTemplates({ category })` hook used by StepFour. **No legacy dual-write** (post-event has no legacy data — straight canonical only). | User direction: same pattern as `labbe/app/[lang]/host/create-event/_components/stepFour/StepFour.js`. |
| Q7 | (was Q7 — `usePostEvent.js` split strategy) | **Split into `useGuestPostEvent.js` (validate/content/comments) + `useHostPostEvent.js` (host mutations).** Mirrors backend route split (`post-event.guest.routes.js` + `post-event.host.routes.js`). | Cleanest mapping; both files easily under 250-line cap. |
| Q8 | `LastEventStats.jsx` 570→split, fallback chain | **Out of scope.** File is already 122 lines today and the fallback is already gone (`responseData?.data` only at line 39). No change. | Audited 2026-05-08. |
| Q9 | `generateBulkTokens` `errors` shape | **Always return `errors: []`** (never `undefined`). | Predictable frontend contract; trivial change. |
| Q10 | `event.guestList` populate validity | **Confirmed valid** — `EventModel.js:291` defines `guestList: [{ ref: 'Guest' }]`. **No change needed.** | Audited 2026-05-08. Plan note 6.4 in old version is RESOLVED. |

### Additional locked guidance from user

- **Validation library:** Zod only. Use `validateZod` at `shared/middleware/validation.js:401`. Joi is forbidden. (Memory entry already in place.)
- **Messaging contract:** Taqnyat WhatsApp template **primary**, SMS **fallback**. Email is **never** mentioned in code or copy. All naming hangovers (`sendEmail`, `sendBulkAccessEmails`, `SEND_EMAILS`, `/send-emails`) must be renamed in the same pass — see **§5.bis Naming Cleanup**.
- **Web ↔ Mobile parity:** Both platforms must call the same endpoints with the same body shapes, expose the same hook surface, and render an equivalent feature set. Any divergence (currently: mobile lacks hooks, web has dead DELETE, both lack unpublish path, both lack media-unified consumer, both lack template picker, both have wrong send-access-links path) is a bug to fix in this PR.
- **Dead code policy:** No backwards-compatibility shims, no aliases, no deprecation periods. If a name changes, every call site changes in the same commit. If a route moves to a unified endpoint, the old routes are deleted, not aliased.
- **Templates from backend:** Frontend must fetch templates from `GET /taqnyat-templates` (existing endpoint) before sending access links, and present a picker. Hardcoded Arabic message bodies (`service.js:435, 484`) are removed.

---

## 1. Endpoint Inventory (post-implementation target)

After this plan lands, the module exposes **14 endpoints** (was 15; `/photos` + `/videos` merged into `/media`).

| # | Method | Path | Controller | Service | Middleware chain | Web hook | Mobile hook |
|---|--------|------|------------|---------|------------------|----------|-------------|
| 1 | GET | `/post-event/validate?token=` | `validateToken` | `validateGuestToken` | `authLimiter`, public | `useValidatePostEventToken` | `useValidatePostEventToken` |
| 2 | GET | `/post-event/:eventId/content` | `getContent` | `getPostEventContent` | `validateObjectId`, `guestAuth` | `usePostEventContent` | `usePostEventContent` |
| 3 | POST | `/post-event/:eventId/posts/:postId/like` | `toggleLike` | `toggleLike` | `validateObjectId`, `guestAuth` | `useTogglePostEventLike` | `useTogglePostEventLike` |
| 4 | POST | `/post-event/:eventId/posts/:postId/comments` | `addComment` | `addComment` | `validateObjectId`, `guestAuth`, `uploadMedia.array("files",5)`, `validateZod(addCommentSchema)` | `useAddPostEventComment` | `useAddPostEventComment` |
| 5 | GET | `/post-event/:eventId/posts/:postId/comments` | `getComments` | `getComments` | `validateObjectId`, `guestAuth`, `validateZod(paginationSchema,'query')` | `usePostEventComments` | `usePostEventComments` |
| 6 | GET | `/post-event/:eventId` | `getHostContent` | `getPostEventContent` | `validateObjectId`, `protect` | `useHostPostEventContent` | `useHostPostEventContent` |
| 7 | POST | `/post-event/:eventId/media` | `uploadMedia` | `uploadMedia` | `validateObjectId`, `protect`, `uploadMedia.array("files",20)`, `validateZod(uploadMediaSchema)` | `useUploadPostEventMedia` | `useUploadPostEventMedia` |
| 8 | DELETE | `/post-event/:eventId/media/:mediaId` | `deleteMedia` | `deleteMedia` | `validateObjectId`, `protect` | `useDeletePostEventMedia` | `useDeletePostEventMedia` |
| 9 | PATCH | `/post-event/:eventId/thank-you` | `updateThankYouMessage` | `updateThankYouMessage` | `validateObjectId`, `protect`, `validateZod(updateThankYouMessageSchema)` | `useUpdateThankYouMessage` | `useUpdateThankYouMessage` |
| 10 | PATCH | `/post-event/:eventId/messaging` | `updateMessagingTemplate` | `updateMessagingTemplate` | `validateObjectId`, `protect`, `validateZod(updateMessagingTemplateSchema)` | `useUpdatePostEventMessagingTemplate` | `useUpdatePostEventMessagingTemplate` |
| 11 | POST | `/post-event/:eventId/publish` | `publishContent` | `publishContent` | `validateObjectId`, `protect`, `idempotency` | `usePublishPostEventContent` | `usePublishPostEventContent` |
| 12 | PATCH | `/post-event/:eventId/unpublish` | `unpublishContent` | `unpublishContent` | `validateObjectId`, `protect` | `useUnpublishPostEventContent` | `useUnpublishPostEventContent` |
| 13 | POST | `/post-event/:eventId/generate-tokens` | `generateBulkTokens` | `generateBulkTokens` | `validateObjectId`, `protect`, `authLimiter`, `idempotency`, `validateZod(bulkGuestActionSchema)` | `useGeneratePostEventTokens` | `useGeneratePostEventTokens` |
| 14 | POST | `/post-event/:eventId/send-access-links` | `sendBulkAccessLinks` | `sendBulkAccessLinks` | `validateObjectId`, `protect`, `otpHourlyLimiter`, `idempotency`, `validateZod(sendAccessLinksSchema)` | `useSendPostEventAccessLinks` | `useSendPostEventAccessLinks` |

**New endpoint #10 (`PATCH /:eventId/messaging`)** is introduced by this plan to let the host pick the Taqnyat template used for access-link WhatsApp messages — identical save-flow to the events module's `PATCH /events/:id/invitation-settings` (StepFour). Body shape: `{ taqnyatTemplateRef: ObjectId }`. The visual invitation card on the guest page is **not** persisted on PostEventContent — it renders from the parent `Event` (host name, event title, date, location, image) which the `getPostEventContent` response includes.

**Hook naming convention:** every hook is a single semantic verb (`useToggleX`, `useUploadX`, `useDeleteX`) — replaces the prior `usePostEventMutation('actionKey')` indirection so hook usage is grep-able and parity between web and mobile is mechanical.

**Removed / consolidated:**
- Old `POST /:eventId/photos` and `POST /:eventId/videos` → merged into `POST /:eventId/media`
- Old `DELETE /:eventId/photos/:photoId` and `DELETE /:eventId/videos/:videoId` → merged into `DELETE /:eventId/media/:mediaId`
- Web `unlikeContent` (DELETE) mutation → DELETED (toggle is POST-only)
- Controller `getGuestContent` (`controller.js:119`) → DELETED (dead export)
- Service `getPublishedContentForGuest` → DELETED if no other consumer (verify with grep first)

---

## 2. Backend Findings

### 2.1 File-size violations
- `post-event.routes.js` — **523 lines** (cap 400). Split into:
  - `post-event.guest.routes.js` — endpoints #1–#5 (validate + guest-auth)
  - `post-event.host.routes.js` — endpoints #6–#14 (host-auth)
  - `post-event.routes.js` — thin parent that mounts both. Swagger blocks travel with the routes they document.
- `post-event.service.js` — 512 lines (under 600 cap, OK).
- `post-event.controller.js` — 228 lines (under 300 cap, OK).

### 2.2 Swagger drift
- **New endpoint #7 (`POST /:eventId/media`)** — write JSDoc with `multipart/form-data`, `files[]` (binary array, max 20, mixed photo/video), 200 response with `{ media: [{ _id, type, url, mimeType, size }] }`, 401/404/400 errors.
- **New endpoint #8 (`DELETE /:eventId/media/:mediaId`)** — write JSDoc.
- **New endpoint #10 (`PATCH /:eventId/messaging`)** — write JSDoc with body `{ taqnyatTemplateRef: ObjectId }` and 200 response. Mirrors `events.routes.js` JSDoc for `PATCH /events/:id/invitation-settings`.
- **Endpoint #12 (`PATCH /:eventId/unpublish`)** — currently no JSDoc (route at `routes.js:434–438`). Add.
- **Endpoint #14 (`POST /:eventId/send-access-links`)** — JSDoc at `routes.js:483–515` says "Send bulk access **emails**" with body "Send post-event access emails to guests in bulk." Implementation now sends WhatsApp+SMS via Taqnyat. Update summary, description, and request/response examples. Document `templateId` (now required) and `templateParams` (optional).
- **Endpoint #4 (`addComment`)** — request body is `multipart/form-data type: object` with no fields. Document `text` (required string, max 1000) and `files[]` (optional binary, max 5).
- **Schema reuse:** every JSDoc currently inlines parameters & responses. Move to `config/swagger.js` `components.parameters` / `components.schemas` and `$ref` from JSDoc:
  - `components.parameters`: `EventIdParam`, `PostIdParam`, `MediaIdParam`
  - `components.schemas`: `PostEventContent`, `PostEventPost`, `PostEventComment`, `PostEventMessagingConfig`, `PostEventMedia`, `GuestAccessLinkSummary`

### 2.3 Missing middleware / safeguards
- **`GET /post-event/validate`** — guest token is a credential; brute-force enumeration is plausible. Add `authLimiter` (10/hr per IP, fail-only counting — already exists in `shared/middleware/rateLimiter.js`).
- **`POST /post-event/:eventId/send-access-links`** — triggers SMS/WhatsApp at real cost. Add `otpHourlyLimiter` (5/hr per host) to prevent spam, plus existing service-level idempotency.
- **`POST /post-event/:eventId/generate-tokens`** — currently unbounded. Add `authLimiter` and route-level `idempotency` (so HTTP retries don't double-generate).
- **`POST /post-event/:eventId/publish`** — add route-level `idempotency` (mobile retry after timeout currently re-fires the SMS batch).
- **No subscription gate** — confirmed not required (Q4 locked: post-event is guaranteed for all events).
- **No quota / size gating** — confirmed not required (Q5 locked).
- **Whitelabel isolation** — `getPostEventContent`, `getHostContent`, and every host service method scope by `{ _id: eventId, host: userId }` only. No `WHITELABEL_ADMIN` path is mounted today; if added later it must use `whitelabelFilter`. Out of scope for this plan; flag for the future.
- **Audit logging** — currently only on publish (`service.js:173`) and unpublish (`service.js:202`). Add `logAudit` (from `shared/utils/auditLog.js`) on:
  - `uploadMedia` — `post_event.media_uploaded` (count, ids, types)
  - `deleteMedia` — `post_event.media_deleted` (id, type)
  - `updateThankYouMessage` — `post_event.thank_you_updated`
  - `updateMessagingTemplate` — `post_event.messaging_template_updated` (templateRef)
  - `generateBulkTokens` — `post_event.tokens_generated` (count, filter)
  - `sendBulkAccessLinks` — `post_event.access_links_sent` (count, filter, templateRef, channelBreakdown { whatsapp, sms })

### 2.4 Duplicate / dead endpoints
- **No duplicate routes** in the router itself.
- **Dead controller export:** `getGuestContent` (`controller.js:119`) wraps `service.getPublishedContentForGuest` but nothing is mounted at `/:eventId/guest/:guestCode`. Audit confirmed no caller exists. Delete the controller export. Also delete `service.getPublishedContentForGuest` after confirming with grep that no other module consumes it.

### 2.5 Service / controller violations
- **`controller.validateToken` (`controller.js:135–146`)** wraps the call in a `try/catch` to map `statusCode === 410 && err.body` to a custom JSON shape. Violates **A2.1** ("never write try/catch in a controller for forwarding errors") and **A6.1** (single response shape via `responseHelper`).
  - **Fix (locked decision Q3, option a):** Teach `globalErrorHandler` (`shared/middleware/globalErrorHandler.js:130–161`) to copy `err.body` into the response when present (in addition to the existing top-level fields). Move 410-Gone shaping into `service.validateGuestToken` so it throws an `AppError(410, message, { body: { reason, ... } })`. Controller becomes a plain `responseHelper.sendSuccess` call.
- **`service.getPostEventContent` (`service.js:26–46`)** — sequential awaits for two independent reads. Use `Promise.all`. **(A3.3 violation)**
- **`service._generateTokensAndNotify` (`service.js:170, 489, 506`)** — uses `console.error` for failed dispatch. Replace with `logger.error` from `shared/utils/logger.js`, tagged with `eventId` for correlation. **(A3.2 / D6 violation)**
- **`service.publishContent` (`service.js:170`)** — fires `_generateTokensAndNotify` non-blocking with `.catch(console.error)`. Convert to `logger.error`.
- **String literal status filters** at `service.js:369–370` (`'attended'`, `'confirmed'`). Verified the values match `GuestModel.js:292` enum. Centralise in `shared/constants/guestStatus.js` (or extend `shared/constants/status.js`) as `GUEST_STATUS = { ATTENDED: 'attended', CONFIRMED: 'confirmed', ... }`. **(A3.8 violation)**
- **Hardcoded Arabic SMS bodies** at `service.js:435, 484`. **Replaced by template lookup** under §2.8 (Taqnyat templates). Hardcoded fallback removed.
- **JWT secret read** at `service.js:277`: `process.env.JWT_SECRET` → use `config.jwt.secret` per `config/index.js:41–42`.
- **Sequential per-guest loop** in `service.generateBulkTokens` (`service.js:380–393`): convert to `runBatched` (concurrency 5, ratePerSecond 10) — same contract as the existing SMS batch.

### 2.6 Validation gaps
- **No `post-event.validation.js` file exists.** All body-accepting endpoints are unvalidated.
- **Create `post-event.validation.js` (Zod, not Joi)** with the following schemas, wired via `validateZod(schema)` at the route layer:
  - `addCommentSchema` — `{ text: z.string().min(1).max(1000) }` (files validated by multer)
  - `uploadMediaSchema` — `{}` (multer handles file shape; schema enforces empty body)
  - `updateThankYouMessageSchema` — `{ text: z.string().max(2000).optional(), textAr: z.string().max(2000).optional(), description: z.string().max(5000).optional(), descriptionAr: z.string().max(5000).optional() }.refine(at-least-one-present)`
  - `updateMessagingTemplateSchema` — `{ taqnyatTemplateRef: objectIdSchema }` (the StepFour pattern: a single ObjectId pointing at a `TaqnyatTemplate` cache row)
  - `bulkGuestActionSchema` — `{ guestIds: z.array(objectIdSchema).optional(), filter: z.enum(['attended','confirmed','all']).optional() }.refine(exactly-one-of)`
  - `sendAccessLinksSchema` — extends `bulkGuestActionSchema` with `{ taqnyatTemplateRef: objectIdSchema.optional() }` — when omitted, the service uses `PostEventContent.taqnyatTemplate.templateRef` saved at endpoint #10
  - `paginationSchema` — `{ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }` (reuse `shared/utils/validators` if present; otherwise add)
- **Pattern reference:** copy from `addons.routes.js:98` (`validateZod(purchaseAddonSchema)`).

### 2.7 Comment hygiene (backend)
Remove these markers (audit-confirmed):
- `routes.js:516` — `// FLOW-21-F04: renamed from send-emails — sends WhatsApp/SMS access links, not email`
- `service.js:172` — `// Track-B: audit content publish — targetType:'event' (post_event_content not in enum)`
- `service.js:189` — `* Unpublish (revoke) post-event content (FLOW-21 Track-B)`
- `service.js:240–246` — `// Phase 3e.3 / 3e.4 (D7 / D8): rotated / revoked / expired tokens` (collapse to one why-line: "410 vs 403 — rotated/revoked/expired share Gone semantics")
- `service.js:308` — `// FLOW-21-F02: enforce requireApproval — hide comment until host reviews`
- `service.js:403` — `// FLOW-21-F04: renamed from sendBulkAccessEmails — sends WhatsApp/SMS, not email`
- `service.js:425–428` — `// Phase 3b.3 (FLOW-21-F01): same runBatched + idempotency contract as launch / reminder sends.` (collapse to: "two clicks within idempotency TTL deduplicate")
- `service.js:471–474` — same family (collapse)
- `controller.js:128–134` — keep the `Returns 410 Gone for rotated/revoked/expired tokens, with the structured reason in the body…` part (it's a contract worth documenting); drop the `(Phase 3e.3 / 3e.4)` chronology
- `controller.js:217` — `// FLOW-21-F04`

### 2.8 Taqnyat templates integration — copy the StepFour pattern

**Today (audit-verified):**
- `sendBulkAccessLinks` at `service.js:404–455` builds a hardcoded Arabic message body inline (`service.js:435`) and dispatches via `taqnyat.sendSMS` only — no Taqnyat template, no WhatsApp.
- The `taqnyat-templates` module exists at `labbe-backend-/src/modules/taqnyat-templates/` with a host-facing `GET /taqnyat-templates?category={category}` endpoint and full admin CRUD.
- Events module already implements the canonical pattern: `Event.taqnyatTemplate.templateRef` (`EventModel.js:170–175`, ref: `TaqnyatTemplate`), saved via `PATCH /events/:id/invitation-settings` and resolved at dispatch by `messaging.formatting.js → resolveTaqnyatTemplate(event)` + `getEventBodyParams(event, guestName, template)`.

**Target — adopt the events pattern verbatim, no legacy dual-write:**

1. **Schema (canonical only — `PostEventContent`):**
   ```js
   taqnyatTemplate: {
     templateRef: { type: Schema.Types.ObjectId, ref: 'TaqnyatTemplate' },
   }
   ```
   Identical shape to `EventModel.js:170–175` (`canonicalTaqnyatTemplateSchema`). **Skip** the legacy `invitationSettings.selectedTemplate` dual-write — that exists in events for backwards compat with pre-Phase-4c data; post-event has no legacy data, so it's canonical-only from day one.

2. **Save endpoint (#10):** `PATCH /post-event/:eventId/messaging`
   ```js
   // request body
   { taqnyatTemplateRef: ObjectId }   // resolved by templateRefResolver if a string is passed
   ```
   Service `updateMessagingTemplate(eventId, { taqnyatTemplateRef }, userId)`:
   - Validates host owns the event
   - Resolves the ref via the same `templateRefResolver` used by events (`labbe-backend-/src/modules/events/templateRefResolver.js`) — accepts ObjectId or legacy `taqnyatId` string and returns the canonical ObjectId
   - Sets `content.taqnyatTemplate.templateRef = resolvedRef`
   - Saves; returns the updated content
   - Calls `logAudit('post_event.messaging_template_updated', { templateRef })`

3. **Category filter — **OPEN ITEM, decide before A.6** **
   StepFour filters by `visualTemplate.categories[0]` (the event's visual category). For post-event we need a **distinct admin-curated category** so the picker only shows templates approved for post-event access-link messaging. **Recommended:** add a new admin-assignable category value `post_event` (the `TaqnyatTemplate.category` field is admin-editable per the audit — no schema change needed). Admin team curates which Meta-approved templates map to `post_event`. Frontend host page calls `useHostTaqnyatTemplates({ category: 'post_event' })`.
   - Action item for admin team (out of code scope): assign `category: 'post_event'` to at least one approved Meta WhatsApp template before this PR ships, otherwise the picker is empty and the controller returns the `NoTemplateConfigured` error described below.

4. **Variable mapping — extend resolution context for post-event:**
   The events resolver `getEventBodyParams(event, guestName, template)` (`messaging.formatting.js:59–102`) walks `template.varMapping[].sourceKey` against a context `{ guest, eventDetails, host }`. For post-event we need an additional `accessLink` field. **Approach:** add a sibling resolver `getPostEventBodyParams(event, guest, template, { accessLink })` in the same file with context `{ guest: { name }, eventDetails: { ...event.eventDetails }, host: { name }, access: { link, expiresAt } }`. Admin sets `varMapping` like:
   ```
   { placeholder: '1', sourceKey: 'guest.name', fallback: 'ضيفنا الكريم' }
   { placeholder: '2', sourceKey: 'eventDetails.title', fallback: 'مناسبة' }
   { placeholder: '3', sourceKey: 'access.link', fallback: '' }
   ```

5. **Dispatch at send time (`sendBulkAccessLinks` rewrite):**
   - Load `content.taqnyatTemplate.templateRef` (or accept an override `taqnyatTemplateRef` from the request body for ad-hoc sends)
   - For each guest: resolve template via `resolveTaqnyatTemplate({ taqnyatTemplate: content.taqnyatTemplate })` (the existing helper accepts any doc with the canonical shape) → `getPostEventBodyParams(event, guest, template, { accessLink })` → `taqnyat.sendWhatsAppTemplate(phone, template.templateName, template.language || 'ar', components, smsFallback)`
   - **Hardcoded Arabic strings at `service.js:435, 484` deleted** — templates own all copy.

6. **Image-header support:** if `template.hasImageHeader === true`, call `taqnyat.sendWhatsAppTemplateWithImage(phone, templateName, lang, imageUrl, bodyParams, smsFallback)` instead. `imageUrl` resolution for post-event: use `event.visualTemplate.bakedImagePath || event.invitationSettings?.templateImage` (same source events already uses — `messaging.send.service.js → getEventImageUrl`). If neither is set, fall back to the plain `sendWhatsAppTemplate` call.

7. **Backend response shape (host UI consumes):**
   ```js
   {
     sent: number,           // total successful dispatches
     channelBreakdown: { whatsapp, sms, failed },
     templateRef: ObjectId,
     templateName: string,   // for display in success toast
     errors: [{ guestId, reason }]   // ALWAYS present (per §2.12)
   }
   ```

8. **Frontend (web + mobile, identical hook surface):**
   - Reuse the **existing** `useHostTaqnyatTemplates({ category })` hook on web (`labbe/hooks/queries/useTaqnyatTemplates.js`) — verified to exist; passes `category` as query param via `taqnyatTemplatesService.getTemplates({ category })`
   - Mobile: create the parallel hook at `halla-mobile/hooks/queries/useTaqnyatTemplates.js` with identical query key (`["taqnyat-templates", "host", category || "all"]`), calling the same `GET /taqnyat-templates?category=post_event` endpoint
   - The host post-event page renders a **template picker section** with the same cards UX as `StepFour.js:100–181`: skeleton loaders, empty state with "Configure templates" CTA (links to `/host/settings/messaging-templates`), radio-button-style template cards showing `templateName`, `bodyText` preview, `varMapping.length`. Selection saves via `useUpdatePostEventMessagingTemplate` (calls `PATCH /post-event/:eventId/messaging`).
   - The "Send access links" flow re-uses the saved template by default; the dialog also offers an override picker (defaults to the saved template, lets the host change it for this single send without re-saving).

9. **Empty-state fallback:**
   If no templates exist with `category: 'post_event'` (or admin hasn't assigned any yet), the picker renders the same StepFour empty state copy ("لا توجد قوالب لهذه الفئة" + "تواصل مع الإدارة لتعيين قوالب لفئتك"). The controller for `sendBulkAccessLinks` rejects with `400 NoTemplateConfigured` if neither the saved nor the override `templateRef` resolves — the frontend renders a CTA pointing at `/host/settings/messaging-templates`.

### 2.9 WhatsApp primary + SMS fallback — use Taqnyat's native mechanism

**Today (audit-verified):**
- `infrastructure/taqnyat.js:132–170` already exposes `sendWhatsAppTemplate(recipient, templateName, language, components, smsFallback)` and `sendWhatsAppTemplateWithImage(...)` — both accept a `smsFallback: { sender, body }` argument that Taqnyat's WhatsApp API honours natively (Taqnyat dispatches SMS automatically when the recipient has no WhatsApp capability; no client-side retry logic needed).
- Events module already uses this correctly via `messaging.send.service.js:130–169` and `getEventBodyParams` / `buildSmsBody`.
- Post-event currently bypasses this entirely (`service.js:436` calls `sendSMS` only).

**Target — no custom wrapper needed:**
- Call `taqnyat.sendWhatsAppTemplate(...)` (or `sendWhatsAppTemplateWithImage` if `template.hasImageHeader`) directly, with `smsFallback = { sender: TAQNYAT_SENDER, body: buildPostEventAccessLinkSmsBody(event, guest, accessLink) }`
- Add `buildPostEventAccessLinkSmsBody(event, guest, accessLink)` in `messaging.formatting.js` (mirrors the existing `buildSmsBody`) — short Arabic SMS body with `{guestName}`, `{eventTitle}`, `{accessLink}`. **This is the only fallback copy in code**; the WhatsApp body comes from the Taqnyat template.
- Per-guest result returned by Taqnyat indicates the channel used (verify exact field with the Taqnyat API docs during A.10); aggregate into `channelBreakdown { whatsapp, sms, failed }`.
- **Channel selection** mirrors events (`scheduledTasks.js:290–299`): `if hasTemplate, prefer 'whatsapp' (which auto-falls-back to SMS via Taqnyat); else SMS-only`. For post-event, we always have a template after this plan lands (or we fail with `NoTemplateConfigured`), so the dispatch is always WhatsApp-first.

### 2.10 Unified `/media` endpoint (NEW — locked decision Q2)

**Today:** `POST /:eventId/photos` (multer `array("photos",20)`) and `POST /:eventId/videos` (multer `single("video")`). Two delete routes too.

**Target:** One route, one controller, one service method.
- **Route:** `POST /:eventId/media` with multer `uploadMedia.array("files", 20)`. Mixed photo/video uploads in one request supported.
- **Validation:** Multer's `fileFilter` distinguishes photo vs. video by MIME type and routes to the correct S3 sub-prefix (`/post-event/{eventId}/photos/...` or `/post-event/{eventId}/videos/...`). Reject anything else with a 400.
- **Per-file size caps:** photo 10 MB, video 100 MB (configured in multer; **not** quota gating, just basic input safety).
- **Service:** `uploadMedia(eventId, files, userId)` iterates files, builds a `{ type: 'photo'|'video', url, mimeType, size, _id: ObjectId() }` object per file, pushes into `content.media` (renamed from `content.posts`/separate `videos` arrays — see §2.11). Returns `{ media: [...] }`.
- **Delete:** `DELETE /:eventId/media/:mediaId` — single endpoint regardless of type. Service uses `content.media.pull(mediaId)` (Mongoose 8 fix).
- **Old routes deleted:** `POST /:eventId/photos`, `POST /:eventId/videos`, `DELETE /:eventId/photos/:photoId`, `DELETE /:eventId/videos/:videoId` removed entirely (no aliases — locked: no backwards-compat shims).

### 2.11 `PostEventContent` model changes

To support §2.10 (unified media) and §2.8 (canonical Taqnyat template ref):

- **`media: [{ _id, type: 'photo'|'video', url, mimeType, size, uploadedAt, comments: [...], likes: [...] }]`** — replaces the current `posts` (photos) and `videos` arrays. Comments and likes hang off each media item. Migration step in §7.A.3.
- **`taqnyatTemplate: { templateRef: ObjectId, ref: 'TaqnyatTemplate' }`** — canonical-only, identical shape to `EventModel.js:170–175`. **Do not** add the legacy `invitationSettings.selectedTemplate` sub-doc that exists in events for backwards compat — post-event has no legacy data.
- **Existing fields** (`thankYouMessage`, etc.) — keep.

**No `invitation{}` sub-doc is added.** The visual invitation card on the guest post-event page reads its metadata directly from the parent `Event` document via the existing `getPostEventContent` response (which already populates `eventDetails.title`, `eventDetails.date`, `eventDetails.location`, `host.name`, `visualTemplate`, etc.). The only new persisted field on `PostEventContent` is `taqnyatTemplate.templateRef`.

**Migration script** (`migrations/<timestamp>-post-event-unify-media.js`):
- Copy `content.posts[*]` (photo posts) into `content.media` with `type: 'photo'` plus the existing `comments` and `likes` arrays.
- Copy `content.videos[*]` into `content.media` with `type: 'video'` plus empty `comments`/`likes` (or migrated values if videos already had them).
- Drop old `posts` and `videos` arrays.
- Initialise `taqnyatTemplate: { templateRef: null }` on every existing document.
- Run on staging; verify counts; run on prod with migration record.

### 2.12 `generateBulkTokens` response normalisation
- `service.js:396–400`: change `errors: errors.length ? errors : undefined` → `errors` always (default `[]`). Frontend stops needing null checks.

---

## 3. Frontend Web Findings

### 3.1 Component tree per page

**Public guest page** (`app/[lang]/post-event/page.js` — 160 lines):
- `_components/PostEventContent/PostEventContent.jsx` (56 lines)
  - `_components/PageHeader/PageHeader.jsx` (13 lines)
  - `_components/UserInfo/UserInfo.jsx` (33 lines)
  - `_components/InvitationCard/InvitationCard.jsx` — **rewire to read from parent `Event`** in the `getPostEventContent` response (§3.3). Today still 91 lines of hardcoded floral/locale-key demo data.
  - `_components/ActionButtons/ActionButtons.jsx` (75 lines) — currently calls `usePostEventMutation('likeContent'/'unlikeContent')`. After §3.4 it calls `useTogglePostEventLike` once for both like and unlike. **Drop `unlikeContent` entirely (DELETE method is dead).**
  - `_components/CommentSection/CommentSection.jsx` (109 lines)

**Host integration entry points (read-only nav):**
- `ui/host/events/EventActionsHeader.jsx:106` navigates to `/${lang}/host/post-event/${eventId}` when `event.status === 'completed'`
- `ui/host/main-page/latsEventStats/LastEventStats.jsx` — same nav. **[delta]** This file is now 122 lines (audit-verified) and the data-fallback chain is already gone. Keep as-is.
- `hooks/events/useEventActionGate.js` (109 lines) — shared gate; not post-event-specific.

**Host management page (NEW — locked decision Q1):** `app/[lang]/host/post-event/[eventId]/page.js` does not exist today. Build it. Component tree:
- `app/[lang]/host/post-event/[eventId]/page.js` (≤ 200 lines) — page shell + data wiring via `useHostPostEventContent`
- `_components/MediaGrid/MediaGrid.jsx` — photo+video tiles, delete buttons (consumes `useDeletePostEventMedia`)
- `_components/MediaUploader/MediaUploader.jsx` — single drop zone for photos OR videos, calls `useUploadPostEventMedia`
- `_components/MessagingTemplatePicker/MessagingTemplatePicker.jsx` — **mirror of `StepFour.js:100–181`** — fetches `useHostTaqnyatTemplates({ category: 'post_event' })`, renders skeleton / empty state / radio-card list with `templateName` + `bodyText` preview + `varMapping.length`. Save calls `useUpdatePostEventMessagingTemplate` (PATCH `/post-event/:eventId/messaging`). The component is a near-1:1 copy of StepFour's template-picker block; only the category and the save mutation differ.
- `_components/ThankYouEditor/ThankYouEditor.jsx` — text fields (en/ar); consumes `useUpdateThankYouMessage`
- `_components/PublishControls/PublishControls.jsx` — Publish / Unpublish buttons; consumes `usePublishPostEventContent` + `useUnpublishPostEventContent`
- `_components/AccessLinksDialog/AccessLinksDialog.jsx` — modal with the same template picker (default-selects the saved `taqnyatTemplate.templateRef`; allows override for this single send), guest filter (attended / confirmed / specific guests), preview pane, send button; consumes `useGeneratePostEventTokens` + `useSendPostEventAccessLinks`
- `_components/PostEventStatsBar/PostEventStatsBar.jsx` — counts of media, comments, likes, sent links (with `channelBreakdown` from the last send)

Each child stays ≤ 250 lines. CSS modules per child. **No `InvitationEditor` component** — invitation card metadata is sourced from the parent `Event`, not editable on the post-event page.

### 3.2 File-size violations (web)
- `hooks/reactQueryHooks/usePostEvent.js` — **255 lines** (cap 250). **Locked plan: split into `useGuestPostEvent.js` and `useHostPostEvent.js`.** New file structure:
  - `hooks/reactQueryHooks/post-event/useGuestPostEvent.js` — `useValidatePostEventToken`, `usePostEventContent`, `usePostEventComments`, `useTogglePostEventLike`, `useAddPostEventComment`
  - `hooks/reactQueryHooks/post-event/useHostPostEvent.js` — `useHostPostEventContent`, `useUploadPostEventMedia`, `useDeletePostEventMedia`, `useUpdateThankYouMessage`, `useUpdatePostEventMessagingTemplate`, `usePublishPostEventContent`, `useUnpublishPostEventContent`, `useGeneratePostEventTokens`, `useSendPostEventAccessLinks`
  - **Drop the old `usePostEventMutation('actionKey')` indirection.** Each hook is a named export. Dead `unlikeContent` (DELETE) goes away in this split.

### 3.3 Hardcoded text / data / paths (web)
- `app/[lang]/post-event/_components/InvitationCard/InvitationCard.jsx:11–16` — entire wedding-info block (groomName, brideName, dates, address, etc.) is hardcoded locale demo data. **Rewire to read from the parent `Event`** returned in the `getPostEventContent` response — fields are already present from create-event: `event.host?.name`, `event.eventDetails?.title`, `event.eventDetails?.date`, `event.eventDetails?.time`, `event.eventDetails?.location?.address`, etc. The `validation.data.event.<...>` shape used elsewhere in the page (verified in audit) is the source of truth.
- `InvitationCard.jsx:8–9` — `<Image src="/post-event/floral-top.png" />` & `floral-bottom.png`. **Drive from the parent Event's `visualTemplate`** (the same visual-template choice the host made in create-event Step Three). The image / decorative assets come from `event.visualTemplate.bakedImagePath` (or whatever field the visualTemplate exposes for assets — verify in Phase 2). If the event has no `visualTemplate` (legacy events), fall back to the current floral defaults — kept as part of `InvitationCard.jsx` so the page never renders blank.
- **No new fields on PostEventContent for invitation metadata** — by Q6 lock, the visual card reads from `Event` directly.
- `app/[lang]/post-event/page.js:26–43` — error map uses `t("postEvent.errors.qrRotated", "هذا الرمز انتهت صلاحيته")` etc. **Drop the Arabic fallback strings** — fallbacks belong in the JSON, not in JSX. Keep just `t("postEvent.errors.qrRotated")`. List of keys to verify present in `localization/locales/{en,ar}/postEvent.json`: `errors.qrRotated`, `errors.qrRevoked`, `errors.qrExpired`, `errors.qrInvalid`, `errors.qrLookup`.
- `services/new-backend/api.config.js:370` — rename key `sendBulkAccessEmails` → `sendBulkAccessLinks`; fix path to `/post-event/${eventId}/send-access-links`.
- `services/new-backend/api.config.js` — add entries: `unpublishContent`, `uploadMedia`, `deleteMedia`, `updateMessagingTemplate`. Remove old `uploadPhotos`, `uploadVideos`, `deletePhoto`, `deleteVideo` keys (no aliases).

### 3.4 Data-mapping bugs / fallback chains (web)
- `LastEventStats.jsx:31` (claimed in old plan) — **[delta] already fixed**. Audit confirms current code at line 39 reads `responseData?.data` only. No work.
- `app/[lang]/post-event/page.js` — reads `validation?.data?.event?.title`, `validation?.data?.guest?.name`. Matches the wire shape. Keep.
- After §3.2 split, every hook reads `responseData?.data` only — no fallback chains. Add an ESLint rule (or grep guard in CI) for `data\?\.\w+ \|\| `?  *(out of scope; flag for the codebase plan)*.

### 3.5 Duplicate hooks / direct apiRequest calls (web)
- `services/postEvent.js` — legacy axios SDK. **Audit-verified action:** keep `guestTokenUtils` (cookie helpers) — these are imported by `app/[lang]/post-event/page.js`. Delete every other export (token validate, getContent, like, comment, getComments — none are imported anywhere). Rename file to `services/guestTokenUtils.js` (or move helpers under `services/new-backend/guestSession.js`).
- No `app/[lang]/post-event/**` component issues a direct `apiRequest` — clean.

### 3.6 State / loading / error / hygiene gaps (web)
- `_components/ActionButtons/ActionButtons.jsx:10–37` — `isLiked` is local `useState`, not initialised from `post.likes` server data, not re-synced after invalidation. After refetch the heart can be wrong. **Fix:** derive `isLiked` from `post.likes?.includes(guestId)` via `useMemo`; drop local state; convert mutation to optimistic with `onMutate` / `onError` rollback.
- `_components/CommentSection/CommentSection.jsx:20–24` — silent demo-mode bypass when `eventId`/`postId` missing. **Fix:** remove demo path; if either is missing in production, render an error state.
- `app/[lang]/post-event/page.js:14` — `// H-16: Phase 3e.3 / 3e.4 — multi-reason QR validation` (remove).
- Old `usePostEvent.js:252` — `console.error(...)` inside mutation `onError` (replace with toast via `handleError` — moot once split lands, but call out so the new hooks don't reintroduce).

### 3.7 Locale additions (web)
Listed in §8.

---

## 4. Frontend Mobile Findings

### 4.1 Screen → component tree

**Guest screen** (`screens/host/PostEventScreen.js` — 340 lines):
- Validates `?token=` then loads guest content, renders FlatList of media items.
- Children:
  - Inline ListHeader (event title, guest name, thank-you message, invitation card)
  - `components/host/post-event/PostCard.js` (371 lines) — VIOLATION cap=350

**Host management screen** (`screens/host/HostPostEventScreen.js` — 270 lines):
- ScrollView; CRUD on media + thank-you + publish + access links + invitation.
- Children:
  - Inline `MediaGrid` (delete buttons per item, mixed photo/video)
  - `components/host/post-event/ThankYouMessageSection.js` (65 lines)
  - `components/host/post-event/ContentSummary.js` (48 lines)
  - `components/host/post-event/ActionButtons.js` (64 lines)
  - **NEW** `components/host/post-event/MessagingTemplatePicker.js` — mirror of web's picker; uses `useHostTaqnyatTemplates({ category: 'post_event' })` and `useUpdatePostEventMessagingTemplate`
  - **NEW** `components/host/post-event/AccessLinksSheet.js` — bottom sheet with template picker (default-selects saved `taqnyatTemplate.templateRef`, allows override) + guest filter + send button

### 4.2 File-size violations (mobile)
- `components/host/post-event/PostCard.js` — **371 lines** (cap 350). Split into:
  - `components/host/post-event/post-card/PostCard.js` — orchestration + skeleton (≤ 200)
  - `components/host/post-event/post-card/PostMedia.js` — image/video render
  - `components/host/post-event/post-card/PostInteractions.js` — like + comments + composer
- **Style preservation:** every `StyleSheet.create({...})` value moves verbatim into the extracted children — no rounding, no rename, no `View`-tree changes.

### 4.3 Service / hook violations (mobile)
- **No canonical hooks exist.** Both screens use `useState` + `useEffect` and call services directly — violates **C2** (every screen consumes a query/mutation hook). Web/mobile parity (locked) requires creating the **same hook surface** as web's `useGuestPostEvent` + `useHostPostEvent`. Files:
  - `halla-mobile/hooks/queries/post-event/useGuestPostEvent.js`
  - `halla-mobile/hooks/queries/post-event/useHostPostEvent.js`
  - (mutations live in the same files as their related queries — match web's structure)
- `config/api.js:206` — rename `SEND_EMAILS` → `SEND_ACCESS_LINKS`; fix path to `/post-event/${id}/send-access-links`.
- `config/api.js` — add: `UNPUBLISH`, `UPLOAD_MEDIA`, `DELETE_MEDIA`, `UPDATE_MESSAGING_TEMPLATE`. Remove old `UPLOAD_VIDEO`, `DELETE_VIDEO`, photos endpoints (no aliases).
- `services/hostPostEventService.js:11` — drop the `_legacyToken` parameter. Fix every call site in `HostPostEventScreen.js` (lines 28, 31, 37, 43, 48, 51) to drop the `token` argument.
- `services/hostPostEventService.js:51` — `generatePostEventTokens` currently signs as `(eventId, filter, _legacyToken)`. Web sends `{ guestIds?, filter? }`. Mobile must match — change to `(eventId, body)` with `body = { guestIds?, filter? }`.
- `screens/host/PostEventScreen.js` and `HostPostEventScreen.js` — migrate from `useState` + `useEffect` to React Query hooks. Bulk of the mobile work.
- `PostCard.js:64–65` — swallows `loadComments` errors silently (`catch { /* silent */ }`). Surface via toast or retry control.
- `PostCard.js:39–40` — optimistic like update with no rollback on failure. Wrap in `useMutation({ onMutate, onError })` once moved into the hook layer.
- **Add unpublish UI** in `HostPostEventScreen.js` (after backend Swagger lands and the new mutation exists).
- **Add messaging template picker** in `HostPostEventScreen.js` (matches web's `MessagingTemplatePicker`). Reuses `useHostTaqnyatTemplates` from mobile (created in §C.4) — same API endpoint, same query key.
- **Add access-links sheet** in `HostPostEventScreen.js` — template picker + filter + send (matches web's `AccessLinksDialog`).
- **Single media uploader** (mixed photo/video picker) — replaces the photos-only picker. Matches web's `MediaUploader`.

### 4.4 Hardcoded text / data / paths (mobile)
- `HostPostEventScreen.js:77, 94, 110` — `t("common.error", "خطأ")`. **Drop Arabic fallback in JSX**; rely on `common.json`.
- `PostEventScreen.js:159` — `eventInfo?.title || t("postEventFallback")` — verify key exists.
- `PostEventScreen.js:53` — `catch { setStage("invalid"); }` collapses every error type into "invalid". Distinguish `qr_rotated`, `qr_revoked`, `qr_expired`, `qr_lookup_miss`; each has a localised message.
- All endpoint references via `ENDPOINTS.POST_EVENT.*` after §4.3 renames.

### 4.5 Comment hygiene (mobile)
- `services/hostPostEventService.js:4` — `// Phase 4 W0-AUTH` header (remove, audit-confirmed).
- `services/postEventService.js` — same family (audit during cleanup).
- `_legacyToken` references everywhere (remove with the parameter — §4.3).

### 4.6 Loading / error / empty states (mobile)
- `HostPostEventScreen.js:125` — refetch-after-publish silently swallows errors; if `fetchContent` fails the publish→resend toggle never updates. Replace with React Query refetch + error toast.
- All screens have loading + error states; empty states are minimal (e.g. no media → empty FlatList footer). Add "no media yet" CTA on host screen.

---

## 5. Cross-Platform API Consumption Diff (post-implementation truth)

After §1 lands, this diff should be empty. Tracking the deltas to fix:

| Endpoint | Web today | Mobile today | Backend target | Action |
|----------|-----------|--------------|----------------|--------|
| `GET /post-event/validate` | OK | OK | OK | OK |
| `GET /:eventId/content` | reads `data?.data?.*` | reads `data?.*` | `sendSuccess(res, content)` → `data.<...>` | Mobile: prefix `data?.data?.` |
| `POST /:eventId/posts/:postId/like` | POST + dead DELETE | POST toggle | POST toggle | Web: drop DELETE mutation |
| `POST /:eventId/posts/:postId/comments` | text only | text + images | text + files | Web: add image upload UX; Mobile: rename `images` → `files` |
| `GET /:eventId` (host) | OK | OK | OK | OK |
| `POST /:eventId/photos` | exists | exists | **DELETED** (replaced by `/media`) | Both: remove |
| `POST /:eventId/videos` | hook defined, no UI | not in service | **DELETED** (replaced by `/media`) | Both: remove |
| `POST /:eventId/media` | does not exist | does not exist | NEW | Both: add |
| `DELETE /:eventId/media/:id` | does not exist | does not exist | NEW | Both: add |
| `PATCH /:eventId/thank-you` | 4 fields | 2 fields | 4 fields | Mobile: pass all 4 |
| `PATCH /:eventId/messaging` | does not exist | does not exist | NEW (saves `taqnyatTemplate.templateRef`) | Both: add |
| `POST /:eventId/publish` | empty body | empty body | empty body | OK |
| `PATCH /:eventId/unpublish` | not in API_PATHS | not in ENDPOINTS | exists | Both: add |
| `POST /:eventId/generate-tokens` | `{ guestIds, filter }` | `{ filter }` | `{ guestIds?, filter? }` | Mobile: align body |
| `POST /:eventId/send-access-links` | `/send-emails` (404) | `/send-emails` (404) | `/send-access-links` (uses saved `templateRef`; optional override) | Both: fix path; both: integrate template picker |

---

## 5.bis Naming Cleanup (universal sweep)

User direction: no email-era hangovers anywhere. Audit-verified hits:

**Backend**
- `routes.js:483` Swagger summary "Send bulk access **emails**" → "Send bulk access links via WhatsApp/SMS"
- `routes.js:516` comment marker `// FLOW-21-F04: renamed from send-emails…` → delete (the rename is in the past now)
- `service.js:403` comment `// FLOW-21-F04: renamed from sendBulkAccessEmails…` → delete

**Web**
- `services/new-backend/api.config.js:370` key `sendBulkAccessEmails` → `sendBulkAccessLinks`; path `/send-emails` → `/send-access-links`
- `hooks/reactQueryHooks/usePostEvent.js:232–240` mutation key `sendEmail` → `sendAccessLinks` (becomes `useSendPostEventAccessLinks` after §3.2 split)
- `app/[lang]/host/post-event/[eventId]/_components/AccessLinksDialog.jsx` — never use the word "email" in copy or component names
- locale keys in `postEvent.json` — never `sendEmails`, `email`, `emailSent`. Use `sendAccessLinks`, `accessLinkSent`, etc.

**Mobile**
- `config/api.js:206` `SEND_EMAILS` → `SEND_ACCESS_LINKS`; path fix
- `services/postEventService.js`, `services/hostPostEventService.js` — function names `sendEmails`, `sendBulkEmail`, etc. → `sendAccessLinks`
- locale keys in `postEvent.json` — same rule as web

**Variable / log key sweep**
- `taqnyat.js` — keep `sendSMS` (it really does send SMS), but in post-event service call the new wrapper `sendAccessLinkMessage`
- audit metadata: `post_event.access_links_sent` (already named correctly per §2.3)

CI guard (out of scope, flag): grep for `sendBulkAccessEmail` / `sendEmails` / `SEND_EMAIL` across `labbe`, `halla-mobile`, `labbe-backend-` should return zero hits after this PR.

---

## 6. Suspected Bugs Worth Verifying During Phase 2

1. **Mongoose `post.remove()`** (`service.js:134, 151`) — confirmed broken in Mongoose ^8.9.7. Replace with `content.media.pull(mediaId)` after the model migration in §2.11. **High priority — silent delete failure today.**
2. **`controller.validateToken` 410-Gone bypass** — fix per Q3 (option a) by extending `globalErrorHandler` to read `err.body` (today does not, audit-verified at `globalErrorHandler.js:130–161`).
3. **`_generateTokensAndNotify` non-blocking** — if WhatsApp+SMS dispatch fails for every guest the host sees "published" but no guest got the link. After §2.9 the channel breakdown surfaces in the response; add UI in publish-success toast: "X access links sent (W: a, SMS: b, failed: c)". If failed > 0, show a "Resend" link.
4. **Mobile optimistic like** — wrap in `useMutation({ onMutate, onError })` once hook layer lands.
5. **Web orphan navigation** — `EventActionsHeader.jsx:106`, `LastEventStats.jsx` link to `/${lang}/host/post-event/${eventId}`. Resolved by Q1 (build the page).
6. **Idempotency cache key collision risk** — `sendBulkAccessLinks` scopes by `userId` but the cache key is `post_event_access:${eventId}:${guest._id}`. The `userId` in the scope is redundant. Audit: drop the redundant scope dimension to one source of truth.
7. **`generateBulkTokens` filter/guestIds branch** (`service.js:365–370`) — `if (guestIds?.length) … else filter logic`. Confirm intended behaviour: when both are provided, `guestIds` wins. After §2.6 Zod schema (`refine(exactly-one-of)`), this branch becomes unambiguous.
8. **Authorization edge case** — verify guest tokens scoped to event A cannot read event B. Read `validateGuestToken` flow + `guestAuth` middleware. (Likely already handled via `event` field on `GuestAccessToken`, but confirm.) Out of scope unless audit during Phase 2 finds a hole.

---

## 7. Implementation Plan (Ordered)

Each item has a checkbox the agent ticks during Phase 2.

### 7.A Backend (run first; web/mobile depend on the new endpoints + body shapes)
- [ ] **A.1** Create `post-event.validation.js` with all six Zod schemas (§2.6). Wire via `validateZod(schema)`.
- [ ] **A.2** Extend `globalErrorHandler` to read `err.body` and include it in the response (Q3 option a). Update `validateGuestToken` service to throw `AppError(410, ..., { body })`. Simplify `controller.validateToken` to a plain `responseHelper.sendSuccess` call (drop the try/catch).
- [ ] **A.3** `PostEventContent` model — add `media[]` and `taqnyatTemplate.templateRef` (canonical-only, identical to `EventModel.js:170–175`) per §2.11. Write a migration script `migrations/<timestamp>-post-event-unify-media-and-template.js` that (a) copies `posts[]` (photos) and `videos[]` into `media[]` with `type` set, (b) drops the old arrays, (c) initialises `taqnyatTemplate: { templateRef: null }`. Run on staging first.
- [ ] **A.4** Service: replace `post.remove()` at lines 134 / 151 with `content.media.pull(mediaId)`. Update queries to read from `content.media` everywhere.
- [ ] **A.5** Routes: replace `POST /:eventId/photos` and `POST /:eventId/videos` with `POST /:eventId/media`. Replace the two delete routes with `DELETE /:eventId/media/:mediaId`. Delete the old routes (no aliases).
- [ ] **A.6** Routes: add `PATCH /:eventId/messaging` with `validateZod(updateMessagingTemplateSchema)`. Service `updateMessagingTemplate(eventId, { taqnyatTemplateRef }, userId)` reuses `templateRefResolver` from the events module to coerce a string `taqnyatId` into the canonical ObjectId; sets `content.taqnyatTemplate.templateRef`; calls `logAudit('post_event.messaging_template_updated', ...)`. **Coordinate with admin team to assign at least one approved Meta template to `category: 'post_event'` before merge** (see §2.8.3).
- [ ] **A.7** Routes: add Swagger JSDoc for endpoints #4 (corrected body), #7 (new media), #8 (new media delete), #10 (new messaging template), #12 (unpublish — no JSDoc today), #14 (corrected: WhatsApp template + SMS fallback via `smsFallback` arg; saved templateRef used unless overridden).
- [ ] **A.8** Move repeated parameters/responses into `config/swagger.js` `components.parameters` / `components.schemas`.
- [ ] **A.9** Split `post-event.routes.js` (523 lines) → `post-event.guest.routes.js` + `post-event.host.routes.js` + thin parent (§2.1).
- [ ] **A.10** `messaging.formatting.js`: add `getPostEventBodyParams(event, guest, template, { accessLink })` (mirrors `getEventBodyParams`) — context `{ guest: { name }, eventDetails, host: { name }, access: { link, expiresAt } }`; uses `template.varMapping[]` to resolve `{{N}}` placeholders. Add `buildPostEventAccessLinkSmsBody(event, guest, accessLink)` (mirrors `buildSmsBody`) — short Arabic SMS body for the `smsFallback` arg. **No new wrapper in `infrastructure/taqnyat.js`** — call the existing `sendWhatsAppTemplate` / `sendWhatsAppTemplateWithImage` directly with `smsFallback`, which Taqnyat resolves natively.
- [ ] **A.11** Service: `sendBulkAccessLinks` — rewrite. (a) Resolve template: prefer request body `taqnyatTemplateRef` (override), else `content.taqnyatTemplate.templateRef`; if neither resolves, throw `400 NoTemplateConfigured` with `err.body = { reason: 'no_template', cta: '/host/settings/messaging-templates' }`. (b) Load via `resolveTaqnyatTemplate({ taqnyatTemplate: { templateRef } })` (the existing helper). (c) Per guest: build `accessLink`, call `getPostEventBodyParams` for body params and `buildPostEventAccessLinkSmsBody` for SMS fallback, then dispatch via `taqnyat.sendWhatsAppTemplateWithImage` if `template.hasImageHeader` (image URL from `event.visualTemplate.bakedImagePath` or `event.invitationSettings?.templateImage`) else `taqnyat.sendWhatsAppTemplate`. (d) Aggregate `{ sent, channelBreakdown: { whatsapp, sms, failed }, templateRef, templateName, errors: [] }`. **Delete hardcoded Arabic body at `service.js:435, 484`.**
- [ ] **A.12** Service: `_generateTokensAndNotify` (post-publish auto-send) — same template-driven dispatch as A.11. Reads `content.taqnyatTemplate.templateRef`; if null, log a warning and skip the auto-send (host can re-trigger via `sendBulkAccessLinks` from the UI).
- [ ] **A.13** Service: `getPostEventContent` — `Promise.all` for the two reads (§2.5).
- [ ] **A.14** Service: `generateBulkTokens` per-guest loop → `runBatched` (concurrency 5, ratePerSecond 10). Return `errors: []` always (§2.12).
- [ ] **A.15** Service: replace `console.error` with `logger.error` in `_generateTokensAndNotify`, the `.catch(...)` after `_generateTokensAndNotify` invocation, and any other call sites in this module.
- [ ] **A.16** Service: replace `process.env.JWT_SECRET` with `config.jwt.secret` at `service.js:277`.
- [ ] **A.17** Add `GUEST_STATUS` constants (or extend `shared/constants/status.js`). Replace `'attended'` and `'confirmed'` literals at `service.js:369–370` with the constant.
- [ ] **A.18** Audit logging: add `logAudit` calls per §2.3 (uploadMedia, deleteMedia, updateThankYouMessage, updateMessagingTemplate, generateBulkTokens, sendBulkAccessLinks).
- [ ] **A.19** Rate limiters: `authLimiter` on `GET /validate` and `POST /generate-tokens`; `otpHourlyLimiter` on `POST /send-access-links`.
- [ ] **A.20** Route-level `idempotency` middleware on `publish`, `generate-tokens`, `send-access-links` (in addition to existing service-level `withIdempotency`).
- [ ] **A.21** Delete dead `getGuestContent` controller export (`controller.js:119`). Grep for `getPublishedContentForGuest` — if no other consumer, delete it from the service too.
- [ ] **A.22** Comment hygiene pass — remove all markers in §2.7. Keep only why-lines.
- [ ] **A.23** Unit tests: validation schemas, `sendAccessLinkMessage` wrapper (mock Taqnyat), media migration, `generateBulkTokens` errors-always-array.

### 7.B Web (run after backend lands on staging)
- [ ] **B.1** `services/new-backend/api.config.js` — rename / fix paths per §3.3 and §5.bis. Add `unpublishContent`, `uploadMedia`, `deleteMedia`, `updateMessagingTemplate`. Remove old photo/video keys.
- [ ] **B.2** Split `hooks/reactQueryHooks/usePostEvent.js` into `hooks/reactQueryHooks/post-event/useGuestPostEvent.js` + `useHostPostEvent.js` (§3.2). Each hook is a named export. Drop the `usePostEventMutation('actionKey')` indirection and the dead DELETE `unlikeContent`.
- [ ] **B.3** Verify `hooks/queries/useTaqnyatTemplates.js` (`useHostTaqnyatTemplates`) is reusable as-is. If category filtering already works, no change. The post-event picker calls `useHostTaqnyatTemplates({ category: 'post_event' })`.
- [ ] **B.4** Build `app/[lang]/host/post-event/[eventId]/page.js` + sub-components (§3.1) — including `MessagingTemplatePicker` (port StepFour pattern verbatim, only changing the category and the save mutation). Each child ≤ 250 lines.
- [ ] **B.5** Rewire `_components/InvitationCard/InvitationCard.jsx` (guest-side) to read **parent `Event`** fields (`event.host?.name`, `event.eventDetails?.title|date|time|location`, `event.visualTemplate?.bakedImagePath`) from the `getPostEventContent` response. Drop hardcoded locale demo keys. If `visualTemplate` is missing on the Event (legacy), fall back to the existing floral assets so the card never renders blank.
- [ ] **B.6** `_components/ActionButtons/ActionButtons.jsx` — derive `isLiked` from `post.likes` via `useMemo`; convert to optimistic mutation with rollback (§3.6).
- [ ] **B.7** `_components/CommentSection/CommentSection.jsx` — remove demo-mode silent bypass (§3.6).
- [ ] **B.8** `app/[lang]/post-event/page.js:14` — drop `// H-16` marker; lines 26–43, drop Arabic-fallback strings from `t()` calls.
- [ ] **B.9** `services/postEvent.js` — delete dead SDK methods; keep only `guestTokenUtils`. Rename file to `services/guestTokenUtils.js`. Update the importer.
- [ ] **B.10** Comment hygiene — remove all FLOW-21 / Phase markers in web post-event surface area.
- [ ] **B.11** Add locale keys per §8.

### 7.C Mobile (run after backend; can run parallel to web)
- [ ] **C.1** `config/api.js` — rename `SEND_EMAILS` → `SEND_ACCESS_LINKS`; fix path; add `UNPUBLISH`, `UPLOAD_MEDIA`, `DELETE_MEDIA`, `UPDATE_MESSAGING_TEMPLATE`, `TAQNYAT_TEMPLATES_LIST` (`/taqnyat-templates`). Remove old photos/videos keys.
- [ ] **C.2** Create `hooks/queries/post-event/useGuestPostEvent.js` (validate, content, comments + toggle-like + add-comment mutations). **Mirror web's hook surface name-for-name.**
- [ ] **C.3** Create `hooks/queries/post-event/useHostPostEvent.js` (host content + all host mutations including `useUpdatePostEventMessagingTemplate`). Same name-for-name parity.
- [ ] **C.4** Create `hooks/queries/useTaqnyatTemplates.js` exposing `useHostTaqnyatTemplates({ category })` — identical query key (`["taqnyat-templates", "host", category || "all"]`) and behaviour to the web hook so cache and request shape are identical across platforms.
- [ ] **C.5** Migrate `screens/host/PostEventScreen.js` and `HostPostEventScreen.js` from `useState` + `useEffect` to the new hooks. Preserve every `View` / `Text` / `StyleSheet` value unchanged where possible.
- [ ] **C.6** Add new components to host screen: `MediaGrid` (mixed photo/video, single uploader), `MessagingTemplatePicker` (mirror of web's picker — same StepFour-style cards UX), `AccessLinksSheet` (template override picker + filter + send), `PublishControls` (publish + unpublish). All match the web component set semantically.
- [ ] **C.7** `services/hostPostEventService.js` — drop `_legacyToken` parameter and call sites. Update `generatePostEventTokens` signature to `(eventId, body)` per §4.3. Update all signatures to align with web request shapes.
- [ ] **C.8** `screens/host/PostEventScreen.js:53` — distinguish `qr_rotated` / `qr_revoked` / `qr_expired` / `qr_lookup_miss` errors instead of collapsing to `"invalid"`.
- [ ] **C.9** `HostPostEventScreen.js:77, 94, 110` — remove Arabic-fallback strings from `t("common.error", "خطأ")` style calls.
- [ ] **C.10** Split `components/host/post-event/PostCard.js` into `post-card/PostCard.js`, `post-card/PostMedia.js`, `post-card/PostInteractions.js` (§4.2). Convert optimistic like to a `useMutation` with `onMutate`/`onError` rollback.
- [ ] **C.11** `PostCard.js:64–65` — surface comment-load errors via toast (not silent).
- [ ] **C.12** Comment hygiene — remove `Phase 4 W0-AUTH` headers and any other markers in mobile post-event surface area.
- [ ] **C.13** Add locale keys per §8.

### 7.D Cross-platform alignment (run AFTER A/B/C)
- [ ] **D.1** Re-grep `post-event/.*/send-emails` across both frontends — must return zero hits.
- [ ] **D.2** Re-grep `unpublish` — must hit `api.config.js` (web), `config/api.js` (mobile), the new hook on both sides, and the new UI on both sides.
- [ ] **D.3** Re-grep `\/photos\b|\/videos\b` in both frontends' post-event surface area — must return zero hits (replaced by `/media`).
- [ ] **D.4** Re-grep `unlikeContent` / DELETE on like — zero hits.
- [ ] **D.5** Re-grep `_legacyToken` in mobile — zero hits.
- [ ] **D.6** Re-grep `sendEmail|SEND_EMAIL|sendBulkAccessEmail|/send-emails` across all three platforms — zero hits.
- [ ] **D.7** Confirm both web and mobile read `data?.data?.<field>` consistently; no fallback chains in this module's surface area.
- [ ] **D.8** Confirm the new `useGuestPostEvent` and `useHostPostEvent` hook surfaces are name-for-name identical between web and mobile.
- [ ] **D.9** Manual smoke (or document a script):
  - Host: open new host page → set invitation (pick template) → upload mixed media → set thank-you → publish → guest gets WhatsApp link (or SMS if no WhatsApp) → guest opens link → likes → comments → host opens "Send access links" → picks template → sends to "attended" filter → guests get message → host unpublishes → guest gets 410 with structured `body.reason`.
  - Run on both web and mobile. UX must be identical.

---

## 8. Locale-key additions required

(Listed for the user — agent does NOT modify locale JSON without explicit approval.)

**Web (`labbe/localization/locales/{en,ar}/postEvent.json`):**
- `host.title`
- `host.media.uploadHint`, `host.media.empty`, `host.media.deleteConfirm`
- `host.messaging.title`, `host.messaging.subtitle`, `host.messaging.empty`, `host.messaging.emptyHint`, `host.messaging.varCount`, `host.messaging.preview`, `host.messaging.saveSuccess`, `host.messaging.saveFailed`
- `host.thankYouMessage.{title, placeholder, save}`
- `host.publish`, `host.publishSuccess`, `host.publishConfirmTitle`, `host.publishConfirmMessage`
- `host.unpublish`, `host.unpublishSuccess`, `host.unpublishConfirmTitle`, `host.unpublishConfirmMessage`
- `host.accessLinks.{title, templatePicker, filterAttended, filterConfirmed, filterAll, send, success, channelBreakdown, noTemplateConfigured, noTemplateCta}`
- `host.summary.{photos, videos, comments, likes, linksSent}`
- `host.errors.{uploadFailed, deleteFailed, publishFailed, sendFailed}`
- `errors.qrRotated`, `errors.qrRevoked`, `errors.qrExpired`, `errors.qrInvalid`, `errors.qrLookup` (verify present; remove Arabic JSX fallbacks)

**Mobile (`halla-mobile/localization/locales/{en,ar}/postEvent.json`):**
- Mirror the web set above (same keys, same values where possible).
- Drop Arabic-fallback duplicates from `t("common.error", "خطأ")` style call sites.

---

## 9. Rollback plan

For each implementation item, the rollback is `git revert` of its commit. Items that are noteworthy:

- **A.3 (model migration: posts/videos → media)** — DB-level change. Migration script must be reversible (keep old arrays for 1 release behind a feature flag if anyone is nervous, but per "no backwards-compat" policy, revert = run an inverse migration).
- **A.4 (Mongoose pull fix)** — touches DB-mutation behaviour. Rollback restores the bug. Mitigate by smoke-testing delete on staging before prod.
- **A.2 (globalErrorHandler change)** — touches a shared file. Rollback means restoring the controller-level try/catch, which would lose the 410 body shaping for any other module that adopts this pattern in the meantime.
- **A.5 (route deletion: photos/videos)** — once deleted, any caller still pointing at the old paths 404s. Frontends in this PR are migrated in lockstep, but if any other module references the old paths, audit before merge.
- **A.10 / A.11 / A.12 (Taqnyat WhatsApp dispatch + StepFour-pattern template ref)** — runtime behaviour change; first prod send is a load-test moment. Mitigate by enabling on a single host's account first. **Pre-flight check:** at least one Meta-approved template assigned to `category: 'post_event'` in the cache (admin coordination); without it, `sendBulkAccessLinks` returns `NoTemplateConfigured` for every host and the feature is dark-launched until templates exist.
- **B.4 (new web host page)** — additive, no rollback risk beyond deleting the new files.

---

## 10. Acceptance checklist (run after Phase 2)

- [ ] No file in module exceeds the cap (backend routes ≤ 400, web files ≤ 250, mobile files ≤ 350)
- [ ] All 14 endpoints have current Swagger annotations
- [ ] No duplicate or dead endpoints / hooks / variables / parameters remain
- [ ] Web + Mobile call the same paths with the same shapes for every endpoint (`/send-access-links`, `/media`, `/invitation`, `/unpublish`)
- [ ] Web + Mobile expose the same hook surface (name-for-name) for guest and host post-event
- [ ] No fallback chains in data mapping in this module's surface area
- [ ] No `// FLOW-…` / `// PHASE-…` / `// BUG-…` / `H-16` / `Phase 4 W0-AUTH` / `Track-B` comments in module's surface area
- [ ] Backend has Zod validation file + every body-accepting route runs through `validateZod`
- [ ] Backend has `logAudit` on every mutation (media, thank-you, messaging-template, generate, send, publish, unpublish)
- [ ] Backend has rate limiters on `validate`, `generate-tokens`, `send-access-links`
- [ ] Backend has route-level idempotency on `publish`, `generate-tokens`, `send-access-links`
- [ ] Mongoose `post.remove()` replaced with `content.media.pull(...)`; manual delete-media smoke passes
- [ ] Taqnyat dispatch goes through `taqnyat.sendWhatsAppTemplate` / `sendWhatsAppTemplateWithImage` with `smsFallback` (Taqnyat handles WhatsApp+SMS fallback natively — no custom wrapper)
- [ ] No hardcoded message bodies in service code; all WhatsApp copy lives in `TaqnyatTemplate`; only the short SMS fallback string lives in `messaging.formatting.js`
- [ ] `PostEventContent.taqnyatTemplate.templateRef` matches the canonical shape at `EventModel.js:170–175`; `sendBulkAccessLinks` resolves it (with optional override) and rejects with `400 NoTemplateConfigured` when neither is set
- [ ] Frontend host page renders the StepFour-pattern picker via `useHostTaqnyatTemplates({ category: 'post_event' })`; `PATCH /post-event/:eventId/messaging` saves the choice
- [ ] At least one approved Meta WhatsApp template has `category: 'post_event'` assigned in the `TaqnyatTemplate` cache (admin team coordination)
- [ ] Invitation card renders from parent `Event` fields (host name, event title, date, location, visualTemplate assets) — no hardcoded locale demo data
- [ ] Web hosts `app/[lang]/host/post-event/[eventId]/page.js` (no orphan nav)
- [ ] Mobile has canonical query/mutation hooks; screens no longer call services directly with `useState`+`useEffect`
- [ ] Mobile `_legacyToken` parameter removed everywhere
- [ ] `globalErrorHandler` honours `err.body`; controller `validateToken` is plain
- [ ] No "email" / "send-emails" / `sendBulkAccessEmail` / `SEND_EMAIL` strings anywhere in the module
- [ ] `npm run lint` clean (no new warnings) on all three platforms
- [ ] Visual smoke test: every guest page/screen + the host page/screen looks identical before/after the refactor (where unchanged) and identical between web and mobile (where structurally aligned)
- [ ] End-to-end smoke (per §7.D.9) passes on both platforms

---
