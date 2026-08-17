# 21 — post-event-content

## One-paragraph description
After an event concludes, the host can create post-event content (photos, videos, thank-you messages, galleries) via the post-event module. Host authenticates with user JWT and uploads media files to S3, which are stored in PostEventContentModel. Guest access to post-event content is controlled via GuestAccessTokenModel—each guest receives a time-limited token (email or WhatsApp link) that allows viewing the published gallery without logging in. Guests can like posts and add comments (with optional moderation). The flow includes token generation (bulk or per-guest), email distribution, and guest interaction tracking (views, likes, comments).

peter note : notification that will be sent to guests will be via whatsapp not via email that's important we need to keep all notification primary (and mostly only chanel along with in app notification and notification sent in the notification component) as whatsapp
## Scope tags
- Post-event content creation (host)
- Media upload to S3 (photos, videos)
- Guest access token generation and validation
- Post-event content publishing
- Guest interactions (likes, comments)
- Comment moderation and hiding
- Visitor tracking and analytics

## Roles involved
- Host (creates, uploads, publishes post-event content)
- Guest (views gallery via access token, likes, comments)
- Backend (manages tokens, validates access, tracks interactions)

## Entry points (cite file:line)
- `labbe-backend-/src/modules/post-event/post-event.routes.js:222-226` — GET /:eventId (host content view)
- `labbe-backend-/src/modules/post-event/post-event.routes.js:261-266` — POST /:eventId/photos (upload photos)
- `labbe-backend-/src/modules/post-event/post-event.routes.js:299-304` — POST /:eventId/videos (upload video)
- `labbe-backend-/src/modules/post-event/post-event.routes.js:78-83` — GET /:eventId/content (guest view via guestAuth)
- `labbe-backend-/src/modules/post-event/post-event.routes.js:428-432` — POST /:eventId/publish (publish content)
- `labbe-backend-/src/modules/post-event/post-event.routes.js:469-473` — POST /:eventId/generate-tokens (bulk token generation)
- `labbe-backend-/src/modules/post-event/post-event.routes.js:510-514` — POST /:eventId/send-emails (bulk email distribution)

## Exit / terminal states
- Content published: settings.isPublished = true, settings.publishedAt recorded
- Tokens generated: GuestAccessTokens created and returned
- Emails sent: guest access tokens distributed (completion status TBD) 
peter note : notification that will be sent to guests will be via whatsapp not via email that's important we need to keep all notification primary (and mostly only chanel along with in app notification and notification sent in the notification component) as whatsapp

- Guest interaction recorded: like toggle, comment added, visitor count incremented
- Comment hidden (optional): comment.isHidden = true, hiddenBy/hiddenAt recorded

## Touched modules (file paths by repo)
**labbe-backend-:**
- `src/modules/post-event/post-event.routes.js` — post-event endpoints
- `src/modules/post-event/post-event.controller.js` — HTTP handlers
- `src/modules/post-event/post-event.service.js` — business logic
- `models/PostEventContentModel.js` — posts, likes, comments schema
- `models/GuestAccessTokenModel.js` — token schema, validation
- `models/GuestModel.js` — guest reference for interactions
- `src/shared/utils/s3Upload.js` — uploadPostEventMedia(), uploadMedia()
- `src/shared/middleware/guestAuth.js` — guest token validation
- `src/shared/utils/emailService.js` (TBD) — send bulk access emails

**halla-mobile/:**
- `screens/PostEventScreen.js` — confirmed present; guest gallery view
- `screens/HostPostEventScreen.js` — confirmed present; host content management (upload photos, publish, generate tokens)
- `services/hostPostEventService.js` — confirmed present; host post-event API calls
- `services/postEventService.js` — confirmed present (mobile); guest post-event API calls

**labbe/:**
- `app/[lang]/post-event/page.js` — confirmed present; guest gallery page
- `app/[lang]/post-event/_components/PostEventContent/PostEventContent.jsx` — confirmed present; gallery content component
- `hooks/reactQueryHooks/usePostEvent.js` — confirmed present; React Query hooks for all post-event mutations (uploadPhotos, uploadVideos, publishContent, generateTokens, sendEmail, addComment, deletePhoto, deleteVideo)

## Dependencies on other flows
- Flow 22 (event-stats-visibility): post-event gallery stats (view count, etc.)

## Known divergences (web ↔ mobile, frontend ↔ backend)
- Backend: API for upload, token generation, email dispatch 
peter note : notification that will be sent to guests will be via whatsapp not via email that's important we need to keep all notification primary (and mostly only chanel along with in app notification and notification sent in the notification component) as whatsapp

- Mobile: HostPostEventScreen.js present for host management; PostEventScreen.js present for guest gallery
- Web: post-event guest page confirmed at labbe/app/[lang]/post-event/; host management UI confirmed via usePostEvent.js hooks
- Guest access: token-based (no login required), differs from authenticated guest portal (Flow 19)

## Open questions

**Q1: GuestAccessTokenModel schema: fields, expiry duration?**

A: Fields: `guest` (ObjectId ref), `event` (ObjectId ref), `type` enum ('post_event'/'invitation'/'check_in'), `token` (32-byte hex, unique indexed), `expiresAt` (30-day TTL), `firstUsedAt`, `lastUsedAt`, `useCount`, `isRevoked`, `devices` array (capped at last 10 devices). The static `createForGuest()` method returns an existing valid non-revoked token if one already exists for the guest+event+type combination rather than creating a duplicate.

Source: `labbe-backend-/models/GuestAccessTokenModel.js:10-122`

**Q2: Bulk email delivery: where is the email template? Async and retried?**

A:
**Current behavior:** `sendBulkAccessEmails()` sends via WhatsApp (Taqnyat), with SMS as fallback — not email, despite the function name. The function iterates guests sequentially with no batching, no retry on per-guest failure, and no async job dispatch.

**Assessment:** BUG

**Why:** The function name `sendBulkAccessEmails` is a misnomer — it dispatches WhatsApp/SMS messages, not emails. Operators reading the code or API docs will expect email delivery and get WhatsApp/SMS. Any email-based access distribution is entirely absent.

**Recommended change:** Rename to `sendBulkAccessLinks()`. If email distribution is required, add a separate `sendBulkAccessEmails()` using the email service. Document clearly that the current bulk send is via WhatsApp/SMS only.

peter note : notification that will be sent to guests will be via whatsapp not via email that's important we need to keep all notification primary (and mostly only chanel along with in app notification and notification sent in the notification component) as whatsapp
we will use the same infra for sending invites that infra should be perfect after we address our updates in it
Source: `labbe-backend-/src/modules/post-event/post-event.service.js:341-`

**Q3: Comment moderation: hideComment endpoint? Are guests notified when comment hidden?**

A: A `hideComment` endpoint exists in the routes. `PostEventContentModel` stores `isHidden`, `hiddenBy`, and `hiddenAt` on comment subdocuments. Guests are NOT notified when a comment is hidden. `getComments()` filters out comments where `isHidden` is true before returning the list to guests.

Source: `labbe-backend-/models/PostEventContentModel.js:28-37`, `labbe-backend-/src/modules/post-event/post-event.service.js:277`

**Q4: Media types: how are gallery types handled?**

A: `postSchema.type` enum accepts 'photo', 'video', 'message', and 'gallery'. Gallery posts store their media in `content.mediaUrls` (an array of URL strings) rather than a single `content.mediaUrl`. Individual photos are uploaded as separate 'photo' type posts; no special bulk-upload handling for the 'gallery' type is present in the current service.

Source: `labbe-backend-/models/PostEventContentModel.js:63-77`

**Q5: Expiry mechanism: cron to unpublish expired content?**

A:
**Current behavior:** `GuestAccessToken` records are auto-deleted by a MongoDB TTL index (`expireAfterSeconds: 0` on the `expiresAt` field). `PostEventContentModel` exposes a `settings.expiresAt` field but no scheduled job queries for expired-but-still-published content and sets `isPublished = false`.

**Assessment:** WEAK

**Why:** The TTL index handles token cleanup, but the content itself is never auto-unpublished. A host who sets an expiry date expects guests to lose access when it passes; the content remains published and can still be reached by anyone who bookmarked a direct URL.

**Recommended change:** Add a daily cron job that queries `PostEventContent` where `settings.expiresAt < now` and `settings.isPublished = true`, and sets `isPublished = false`. This closes the gap between token expiry and content expiry.

Source: `labbe-backend-/models/GuestAccessTokenModel.js:85`, `labbe-backend-/models/PostEventContentModel.js:176`

**Q6: Guest search: directory page or token-only access?**

A: Token-only access. No guest directory exists. Guests reach post-event content only via the personalised link they receive, which embeds their access token. `validateGuestToken()` is the sole gateway — it verifies the token, checks revocation and expiry, and resolves the guest identity before any content is served.
peter note : notification that will be sent to guests will be via whatsapp not via email that's important we need to keep all notification primary (and mostly only chanel along with in app notification and notification sent in the notification component) as whatsapp
but i agree that's is the only way they will see the page with their token i just want to change the channel for sending
Source: `labbe-backend-/src/modules/post-event/post-event.service.js:197-227`

**Q7: Comment images: auto-moderated or manually approved?**

A:
**Current behavior:** `addComment()` accepts a `files` array and stores the resulting image URLs directly on the comment subdocument without any moderation step. A `settings.requireApproval` field exists on `PostEventContentModel` (default `false`) but is never read or enforced in the service layer.

**Assessment:** WEAK

**Why:** Without moderation, any guest can attach an image to a comment on the host's post-event gallery immediately. `requireApproval` exists in the schema but is dead code — it has no runtime effect.

**Recommended change:** Enforce `settings.requireApproval` in `addComment()`. When `true`, set `comment.isHidden = true` and `comment.pendingApproval = true` until the host reviews. Add a `GET /:eventId/comments/pending` endpoint and a `POST /:eventId/comments/:commentId/approve` endpoint for host review.

peter note : do we have ui ready for this pending state for hosts to review? 
also worth noting that the postevent page hosts and whitelabel and admin can get to it and make their post event galery not only for hosts and it should work the same way for all roles 

Source: `labbe-backend-/models/PostEventContentModel.js:167-170`, `labbe-backend-/src/modules/post-event/post-event.service.js:239-265`

**Q8: Analytics: view counts per-guest for return visits?**

A: `stats.uniqueVisitors` is an array of guest ObjectIds that functions as a set — a guest is pushed at most once. `stats.totalViews` is a simple increment counter. Return visits by the same guest increment `totalViews` but do not add another entry to `uniqueVisitors`, and no per-visit timestamps are stored.

Source: `labbe-backend-/models/PostEventContentModel.js:179-195`

**Q9: Email sending scale: rate limiting or batching for large events?**

A:
**Current behavior:** `sendBulkAccessEmails()` (misnamed — actually dispatches via WhatsApp/Taqnyat) iterates the guest list sequentially with no batching, no rate cap, and no async job dispatch. The loop runs inside a synchronous HTTP request context.

**Assessment:** WEAK

**Why:** Same structural problem as flow 17 Q1. For events with thousands of guests this will run for minutes in-process, risk hitting Taqnyat rate limits, and block the HTTP response. There is no job ID returned, so callers have no way to track progress or handle partial failures.

**Recommended change:** Move to the same batched-parallel approach recommended in flow 17 Q1 — batches of N with a per-second rate cap. Return immediately with a job ID and process the sends asynchronously.

peter note :notification for postevent will be done via whatsapp not email
Source: `labbe-backend-/src/modules/post-event/post-event.service.js:341-`

## Notes from answer pass

- The function `sendBulkAccessEmails()` is misnamed — it sends via WhatsApp/SMS (Taqnyat), not email. The route name and frontend labels may be misleading to operators.
- `stats.uniqueVisitors` array grows unbounded as guests revisit. For large events with many return visits, this array could become very large. Consider capping or using a Set-based counter.

---

## State machine

```
PostEventContent states:
  (none) → POST /:eventId/photos → post created (type='photo', mediaUrl=S3 URL)
  (none) → POST /:eventId/videos → post created (type='video', mediaUrl=S3 URL)
  unpublished → POST /:eventId/publish → settings.isPublished=true, settings.publishedAt=now
  published → (no auto-unpublish when settings.expiresAt passes — BUG: FLOW-21-F03)
  comment added → comment.isHidden=false (default, regardless of settings.requireApproval — BUG: FLOW-21-F02)
  comment → hideComment() → comment.isHidden=true, hiddenBy/hiddenAt recorded

GuestAccessToken states:
  (none) → POST /:eventId/generate-tokens → token created (32-byte hex, 30-day TTL)
  valid → GET /:eventId/content?token=X → guest content served; uniqueVisitors array appended
  valid → createForGuest() called again → existing valid token returned (no duplicate)
  expired → MongoDB TTL index deletes token document → 404 on next access
  MISSING: content itself not auto-unpublished when settings.expiresAt passes
```

---

## Data handoffs

| Step | Producer | Consumer | Payload | Validation? |
|------|----------|----------|---------|-------------|
| POST /:eventId/photos | multipart FormData (photo files) | post-event.service.js → s3Upload.uploadPostEventMedia() | File buffer → S3 → PostEventContentModel.create() | S3 upload; no virus scan or file-type enforcement beyond MIME type |
| POST /:eventId/generate-tokens | no body | GuestAccessToken.createForGuest() for each guest | `(guestId, eventId, type='post_event')` → token doc | createForGuest() returns existing valid token if one already exists (deduplication built-in) |
| POST /:eventId/send-emails (misnamed) | no body | sendBulkAccessEmails() → Taqnyat per guest | Guest list → sequential WhatsApp/SMS sends | Sequential loop, no batching, no async dispatch, no retry |
| GET /:eventId/content?token=X | query param `token` | guestAuth.validateGuestToken() | 32-byte hex token → GuestAccessToken doc → guest identity | Checks isRevoked, expiresAt; no auth login required |
| addComment() | guest via guestAuth | PostEventContentModel subdocument | `{ text, imageUrls[] }` | requireApproval field NOT read — all comments immediately visible |

---

## Role variations

| Role | Can | Cannot | Notes |
|------|-----|--------|-------|
| Host | Create content, publish, generate tokens, distribute via WhatsApp/SMS, hide comments | Cannot approve comments (no approval endpoint exists yet) | JWT auth required |
| Guest | View published gallery, like posts, add comments (incl. images) | Cannot view before content is published; cannot see hidden comments | GuestAccessToken auth only — no user login |
| Admin / SUPER_ADMIN | No dedicated post-event admin endpoint found in routes | Cannot manage post-event content directly — all service methods use `Event.findOne({ host: userId })` (verified at `post-event.service.js:23,45,75,98,119`) which blocks admin callers | Peter's intent (Q7 note): admin should be able to manage post-event gallery; code reality: blocked. See FLOW-21-F06. |
| Whitelabel Admin | Scoped to own events (per intent) | Cannot manage post-event content for events they administer — all service methods restrict to `event.host === userId`; whitelabel admin is blocked just as platform admin is (verified at `post-event.service.js:45,299,341`) | Peter's intent (Q7 note): whitelabel admin should be able to manage post-event gallery; code reality: blocked. See FLOW-21-F06. |

---

## Web ↔ mobile parity

| Feature | Web | Mobile | Gap? |
|---------|-----|--------|------|
| Host content creation (upload photos/videos) | Confirmed at `labbe/hooks/reactQueryHooks/usePostEvent.js` — uploadPhotos, uploadVideos mutations | Confirmed at `halla-mobile/screens/HostPostEventScreen.js` — photo upload via expo-image-picker, delete photos, update thank-you message, publish | No gap |
| Host publish content | Confirmed at `labbe/hooks/reactQueryHooks/usePostEvent.js` — publishContent mutation | Confirmed at `halla-mobile/screens/HostPostEventScreen.js` — publish button | No gap |
| Host generate access tokens | Confirmed at `labbe/hooks/reactQueryHooks/usePostEvent.js` — generateTokens mutation | Confirmed at `halla-mobile/screens/HostPostEventScreen.js` — generatePostEventTokens call | No gap |
| Host send access links to guests | Confirmed at `labbe/hooks/reactQueryHooks/usePostEvent.js` — sendEmail mutation (calls POST /:eventId/send-emails) | Confirmed missing — `halla-mobile/screens/HostPostEventScreen.js` does not import sendBulkAccessEmails; no send-access-links button found | Gap: mobile host cannot trigger bulk send of access links |
| Comment moderation (hide/show) | Confirmed missing — no hideComment mutation in `labbe/hooks/reactQueryHooks/usePostEvent.js` | Confirmed missing — `halla-mobile/screens/HostPostEventScreen.js` has no hideComment call | Gap: comment moderation UI absent on both platforms |
| Guest gallery view | Confirmed at `labbe/app/[lang]/post-event/page.js` and `PostEventContent.jsx` | Confirmed at `halla-mobile/screens/PostEventScreen.js` | No gap |

---

## Edge cases & failure modes

1. **Content not auto-unpublished at expiresAt:** Content remains accessible after intended expiry date — `settings.expiresAt` field is schema-only with no enforcement cron (see FLOW-21-F03).
2. **Guest accesses content via bookmarked URL after token expires:** MongoDB TTL index deletes the token record; `validateGuestToken()` returns 404 — guest correctly locked out.
3. **requireApproval=true set on PostEventContent:** `addComment()` never reads this flag — all comments appear immediately regardless of the setting (see FLOW-21-F02).
4. **sendBulkAccessEmails sequential loop for 1000-guest event:** ~100s of sequential Taqnyat calls blocks the HTTP request (Gate-1 #8 violation, see FLOW-21-F01).
5. **Large uniqueVisitors array on popular content:** Every unique guest visit appends guest._id via `$addToSet`; for a 5000-guest event with many return visitors this array grows to thousands of ObjectId entries per content document (see FLOW-21-F05).
6. **Generate-tokens called twice for same event:** `GuestAccessToken.createForGuest()` returns the existing valid token — correctly idempotent; no duplicate created.

---

## Findings

### FLOW-21-F01 — sendBulkAccessEmails uses sequential per-guest loop
- **Severity**: High
- **Type**: CONFLICT
- **Location**: `labbe-backend-/src/modules/post-event/post-event.service.js:341`
- **Description**: `sendBulkAccessEmails()` iterates the guest list sequentially with `await new Promise(r => setTimeout(r, 100))` between sends — the same 100ms-per-guest pattern as Flow 17's bulk send loop. For 1000 guests this occupies the Node.js event loop for ~100 seconds.
- **Why it matters**: Gate-1 #8 explicitly names sequential per-guest loops as a violation to be replaced. The HTTP request that triggers the send does not return until all sends complete. For events with 500+ guests the HTTP server appears unresponsive; no job ID is returned so callers cannot track progress or handle partial failures.
- **Recommended change**: Replace the sequential loop with batched-parallel sends using `Promise.allSettled` on groups of N guests (N = Taqnyat per-second rate cap), with a 1-second inter-batch delay. Return immediately with a job status ID and process sends asynchronously.
- **Related**: FLOW-17-F01

### FLOW-21-F02 — requireApproval flag exists in schema but is never enforced
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/models/PostEventContentModel.js:167-170` (requireApproval field) + `labbe-backend-/src/modules/post-event/post-event.service.js:239-265` (addComment)
- **Description**: `PostEventContentModel.settings.requireApproval` defaults to `false` but the field is never read by `addComment()`. Even when set to `true`, all guest comments are immediately visible in the gallery. The flag is dead schema code.
- **Why it matters**: A host who enables comment approval to review submissions before they appear in the gallery gets no protection. Inappropriate or unwanted content can appear without moderation.
- **Recommended change**: In `addComment()`, read `settings.requireApproval`. When `true`, set `comment.isHidden = true` and `comment.pendingApproval = true` on the new comment. Add a `GET /:eventId/comments/pending` endpoint and a `POST /:eventId/comments/:commentId/approve` endpoint for host review.
- **Related**: none

### FLOW-21-F03 — Content is never auto-unpublished when settings.expiresAt passes
- **Severity**: Medium
- **Type**: BUG
- **Location**: `labbe-backend-/models/PostEventContentModel.js:176` (settings.expiresAt field, no cron consumer)
- **Description**: `PostEventContentModel.settings.expiresAt` allows a host to set a content expiry date. `GuestAccessToken` records are auto-deleted by a MongoDB TTL index, so tokens expire correctly. However, no cron job sets `settings.isPublished = false` when `expiresAt` passes. Content remains publicly accessible to anyone with the direct URL even after the intended expiry.
- **Why it matters**: A host who grants time-limited gallery access expects guests to lose access at the expiry date. The current implementation allows content to remain published indefinitely after expiry.
- **Recommended change**: Add a daily cron job that queries `PostEventContent` where `settings.expiresAt < now` and `settings.isPublished = true`, and sets `isPublished = false`. This mirrors the subscription expiry cron pattern.
- **Related**: FLOW-09-F03

### FLOW-21-F04 — sendBulkAccessEmails function and route are misnamed
- **Severity**: Low
- **Type**: Inconsistency
- **Location**: `labbe-backend-/src/modules/post-event/post-event.service.js:341` (function name) + `labbe-backend-/src/modules/post-event/post-event.routes.js:510-514` (route name)
- **Description**: The function `sendBulkAccessEmails()` sends WhatsApp/SMS messages via Taqnyat, not emails. The route is `POST /:eventId/send-emails`. Both the function name and route name imply email delivery. The web hook (`usePostEvent.js`) calls this mutation `sendEmail`, perpetuating the misnaming through all layers.
- **Why it matters**: Operators and frontend developers expecting email distribution will receive WhatsApp/SMS messages and may misconfigure or misdiagnose delivery failures. If email distribution is ever needed alongside WhatsApp/SMS, the naming conflict requires a rename.
- **Recommended change**: Rename the service function to `sendBulkAccessLinks()` and the route to `POST /:eventId/send-access-links`. Update the React Query hook action name to `sendAccessLinks`. Document explicitly that the current delivery channel is WhatsApp/SMS via Taqnyat.
- **Related**: FLOW-21-F01

### FLOW-21-F05 — uniqueVisitors stored as unbounded array on content document
- **Severity**: Low
- **Type**: Performance
- **Location**: `labbe-backend-/models/PostEventContentModel.js:179-195` (uniqueVisitors array)
- **Description**: `stats.uniqueVisitors` is implemented as an array of guest ObjectIds. Each unique guest visit appends the guest's `_id` via `$addToSet`. For a 5000-guest event with many return visitors, this array accumulates thousands of ObjectId entries per content document, making each `$addToSet` update increasingly expensive.
- **Why it matters**: MongoDB documents have a 16MB size limit. A very active event with thousands of unique visitors could cause `uniqueVisitors` to grow to several hundred KB per content document. The primary risk is performance degradation on update operations as the array grows.
- **Recommended change**: Replace the array-based `uniqueVisitors` with a separate `GuestView` collection using a compound index on `(contentId, guestId)`. Query the count with a `countDocuments` call. This scales indefinitely and avoids document bloat.
- **Related**: none

<!-- updated per peter note -->
### FLOW-21-F06 — Admin and whitelabel admin blocked from post-event gallery management
- **Severity**: High
- **Type**: Bucket-3, Missing
- **Location**: `labbe-backend-/src/modules/post-event/post-event.service.js:23,45,75,98,119,136,153,299,341`
- **Description**: Peter stated: "the postevent page hosts and whitelabel and admin can get to it and make their post event galery not only for hosts and it should work the same way for all roles". Every write method in `post-event.service.js` uses `Event.findOne({ _id: eventId, host: userId })` as the ownership guard, restricting all post-event operations (uploadPhotos, uploadVideo, updateThankYouMessage, deletePhoto, deleteVideo, publishContent, generateBulkTokens, sendBulkAccessEmails) to the event host only. An admin or whitelabel admin who calls any of these endpoints receives a `FORBIDDEN` error or empty-result response because their `userId` is not the event's `host` field.
- **Why it matters**: Whitelabel admins manage events on behalf of clients and need to operate post-event workflows (publish galleries, send access links) without requiring host credentials. Platform admins cannot assist a host with post-event tasks. This makes post-event a host-only feature when the product intent is multi-role.
- **Recommended change**: In each service method, replace `Event.findOne({ _id: eventId, host: userId })` with a role-aware lookup: for platform admins/super_admins, query by `eventId` only (bypass host check); for `whitelabel_admin`, add `event.whitelabelId === req.user.whitelabelId` to the query. Pass the caller's role and `whitelabelId` into service methods. Log all non-host post-event write operations per Gate-1 #10 (audit log).
- **Related findings**: none

---

## Cross-flow notes

- **Flow 17**: FLOW-21-F01 (sequential send loop) and FLOW-17-F01 share the same root cause. Both should be fixed with a single shared batched-parallel utility function.
- **Flow 09**: FLOW-21-F03 (content not auto-expired) and FLOW-09-F03 (subscription not auto-expired) share the same pattern — a cron job sends notifications but never transitions the status field. Both need a second cron pass that writes the state change.
- **Flow 20**: Guest access in this flow uses `GuestAccessTokenModel`; staff check-in in Flow 20 uses `StaffAccessTokenModel`. Both have 30-day TTL and similar revocation fields but different creation paths. Consider a shared `AccessTokenService` to avoid future divergence.
- **Flow 22**: Post-event view counts (uniqueVisitors, totalViews) feed into the stats visible in Flow 22. FLOW-21-F05 (unbounded array) will impact Flow 22 query performance if `getDetailedStats()` ever joins post-event stats.

---

## Post-Phase-3 surgical updates

- **Peter notes on WhatsApp channel (×5, in description, exit states, known divergences, Q2, Q6, Q9) acknowledged but no change to downstream sections.** Phase 3 Q2 already established that `sendBulkAccessEmails()` sends via WhatsApp/SMS (Taqnyat), not email. FLOW-21-F04 (misnamed function/route) is unchanged — rename recommendation remains valid. The "same infra" reference in Q2 note is already reflected in FLOW-21-F01's cross-reference to FLOW-17-F01. No state machine, data handoffs, or findings need updating from these channel confirmation notes.
- **Added FLOW-21-F06** (Bucket-3, High) based on peter note in Q7 (second part): Peter's intent is that admin and whitelabel admin can manage post-event gallery; code restricts all write methods to `event.host === userId` (verified at `post-event.service.js:23,45,75,98,119,136,153,299,341`). Role Variations table updated (Admin and Whitelabel Admin rows).
- **Peter note in Q7 first part ("do we have ui ready for this pending state?") acknowledged but no change.** Q8 already recommends building the approval UI as a [PETER DECISION]. The question does not change the finding FLOW-21-F02 or its severity.
- **Cross-flow:** No propagation needed to flows 13–20 from these changes.
