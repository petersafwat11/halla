# Research — Invites & Event Page (for the Business-Account invite feature)

**Date:** 2026-06-20 · **Status:** research only (read-only investigation; no source modified)
**Goal:** Spec a *business-account* invite variant where the WhatsApp message contains a **link to the web event page** (logo + name + event message + accept/reject/maybe buttons + "+1" + guest message) instead of the normal 3-quick-reply-button WhatsApp template.

> Context: the **whitelabel** feature is being removed (`docs/whitelabel-removal/FINAL_MIGRATION_PLAN.md`). Do **not** build on `whitelabelId`. The business-account feature reuses the **kept business plans** (`business_event` / `business_quarterly` / `business_annual`). A related effort, `docs/invites-plans-rework/PLAN.md`, reworks invites/plans/reminders and touches the same send path — coordinate (see §B and §C).

---

## (A) Event page — routes / components / data / branding / RSVP submit

### A.1 Web (the public "event page" the owner means)

- **Route:** `labbe/app/[lang]/invitation/[code]/page.jsx` (client component `GuestPortalPage`). URL shape: `/{lang}/invitation/{code}` where `{code}` = the guest's `qrcode`.
- **Components (`_components/`):**
  - `PortalRsvpForm.jsx` — the RSVP form (initial state).
  - `PortalConfirmed.jsx` — post-confirm screen.
  - `PortalThankYou.jsx` — post-decline / maybe screen.
  - `PortalSkeleton.jsx` — loading.
- **What `PortalRsvpForm.jsx` renders** (this is exactly the owner's "event page"):
  - Logo image — `PortalRsvpForm.jsx:31-37` (from `logoUrl`, see branding below).
  - Event title — `:38` (`event.title`); host line — `:39-45` (`event.hostName`); date/venue list — `:47-65`.
  - Greeting with guest name — `:67-73`.
  - **Guest message** textarea (optional) — `:79-88`.
  - **Dietary restrictions** input (optional) — `:92-97`.
  - **"+1" / plus-ones** number input (0–10) — `:101-108`.
  - **3 RSVP buttons** confirm / maybe / decline — `:111-136`.
  - => **The web page already renders everything the business feature needs.** No new inputs required on web.
- **Data source (query):** `useGuestByToken(code)` → `hooks/guests/queries.js:11` → `GET /guests/invitation/{code}` (`API_PATHS.guests.getByInvitationCode`, `shared/src/api/paths.js:150`).
  - Backend handler: `guests.controller.js:19` `getByInvitationCode` → `guests.service.js:33` **`getGuestByCode(code)`** (matches on `Guest.qrcode`, `guests.service.js:34-36`).
  - Returns `{ guest: _formatGuestPortal(...), event: _formatEventForGuest(...) }` (`guests.service.js:46-49`).
  - **`_formatEventForGuest` (`guests.service.js:618-629`) returns:** `id, title, date, time, location, description, hostName`. It returns **`description`** ("a message about the event" — currently **not rendered** by `PortalRsvpForm`). It returns **NO branding/whitelabel object.**
- **Branding TODAY (important):**
  - `page.jsx:64` reads `event?.whitelabel || {}`, derives `--portal-primary` / `--portal-bg` CSS vars (`:66-72`) and `logoUrl` (`:74`).
  - **But the live endpoint never returns `event.whitelabel`** — `_formatEventForGuest` omits it. So `whitelabel` is **already always `{}`** and the portal **already always falls back** to `DEFAULT_PRIMARY="#2a8c5b"` / `DEFAULT_BG="#faf7f1"` and **no logo** (`page.jsx:16-17,68-69,74`).
  - Whitelabel-removal will *delete* this vestigial `event.whitelabel` theming/logo plumbing from `page.jsx` + the 3 Portal children (FINAL_MIGRATION_PLAN.md:96). **=> The portal has no real branding source today; the business feature must add one (see §C.3).**
- **RSVP submit (web):** `page.jsx:76-95` `handleRsvp` → `useGuestMutation("rsvp")` → `hooks/guests/mutations.js:86-97` → `POST /guests/{code}/rsvp` (`API_PATHS.guests.submitRSVP`, paths.js:151).
  - **Payload:** `{ response, invitationCode: code, lang, message?, dietaryRestrictions?, plusOnes? }` (assembled in `PortalRsvpForm.jsx:20-27` + `page.jsx:78-86`). NOTE: the URL `:id` segment is the `qrcode`, and `invitationCode` in the body is the same `qrcode` (used as the auth proof — see A.3).

### A.2 Mobile (`halla-mobile`)

- **Screen:** `screens/guest-portal/InvitationScreen.js`. Deep-linkable: `App.js:142-157` registers `Invitation: "invitation/:code"` under prefixes `["halla://", "https://halaa.com.sa"]` (on the AuthStack so unauthenticated taps land directly). => the same business link `https://halaa.com.sa/invitation/{code}` (or `halla://…`) can open the mobile app.
- **What it renders:** logo (`:131-133,173-175`), event name (`:134-136,176-178`), greeting + prompt (`:179-182`), and **3 RSVP buttons only** — confirm/maybe/decline (`:184-212`). Confirmed state shows a QR (`:126-145`).
  - **GAP:** the mobile screen has **NO "+1" input and NO guest-message input** (unlike web). If the business link is expected to open the app (universal link), mobile needs these inputs added; otherwise this is web-only. (Open question §D.)
- **Data source:** `hooks/guestPortal/queries.js:30` `useGuestByToken(code)` → `ENDPOINTS.GUESTS.INVITATION(code)` = same `GET /guests/invitation/:code`. Same `{ guest, event }` shape.
- **Branding TODAY:** `InvitationScreen.js:41-49` reads `event.whitelabel` then falls back to `event.eventDetails.primaryColor` then `FALLBACK_*`. Same vestigial situation; whitelabel-removal strips the `event.whitelabel` overlay (FINAL_MIGRATION_PLAN.md:105).
- **RSVP submit (mobile):** `hooks/guestPortal/mutations.js:14-58` `useSubmitRSVP` → `POST /guests/{guestId}/rsvp` with `{ response, invitationCode, message?, dietaryRestrictions?, plusOnes? }` + `Idempotency-Key`. (Mobile currently only ever sends `response` + `invitationCode`; it *supports* the optional fields but the screen doesn't collect them.)

### A.3 Backend RSVP write (shared by web + mobile)

- `guests.service.js:59-122` `submitRSVP(guestId, response, additionalInfo)`:
  - Validates `response ∈ {confirmed, declined, maybe}` (`:60`), requires `invitationCode` (`:65`), loads guest (`:69`), **verifies `guest.qrcode === invitationCode`** (`:75-78`) — this code match is the authz for the public route.
  - Rejects if event status ∉ `{scheduled, live, published}` (`:81-84`).
  - Writes `guest.status = response` + `guest.rsvp = { response, respondedAt, message, dietaryRestrictions, plusOnes }` (`:88-95`).
  - Notifies host (`_notifyHostRSVP`, `:99-102,631-656`); returns a reply message + (for confirmed) an entry-pass (`:104-121`).
- **Route:** `guests.routes.js:138-144` `POST /:id/rsvp` (public; `apiLimiter`, `idempotency`, `validateZod(submitRSVPSchema)`). GET lookup: `guests.routes.js:84` `GET /invitation/:code`.
- **Validation:** `guests.validation.js:38-48` `submitRSVPSchema` — `response`, `invitationCode` (required), `message ≤500`, `dietaryRestrictions ≤200`, `plusOnes int 0..10`, `lang`. The +1 and message inputs are **defined and validated** server-side.

> **⚠️ KNOWN WEB BUG — web RSVP submit currently fails (id vs qrcode).** The route is `POST /:id/rsvp` with **`validateObjectId('id')`** middleware (`guests.routes.js:140`), and the controller does `Guest.findById(req.params.id)` (`service.js:69`, expects an ObjectId).
> - **Mobile (works):** sends `:id = guest._id` (a real ObjectId) and the qrcode as `invitationCode` in the body (`InvitationScreen.js:109`) → passes `validateObjectId`, `findById` resolves, `guest.qrcode === invitationCode` matches (`service.js:75`). **Mobile is the working reference.**
> - **Web (broken):** sends `:id = code` = the **qrcode** (`guest_<id>_<ts>`) (`page.jsx:78` token=code → `mutations.js:87` `submitRSVP(token)` → `/guests/{qrcode}/rsvp`). The qrcode is **not** a valid ObjectId → **`validateObjectId('id')` 400s before the controller runs.** So the web page-submit path does **not** work today.
> - **Fix (do as part of the business work):** web should put `guest.id` in the `:id` slot — `_formatGuestPortal` already returns `id` (`service.js:609-616`) — and keep the qrcode as the `invitationCode` body field (mirroring mobile). No backend change needed.

---

## (B) WhatsApp invite send + 3-button mechanics + RSVP capture

### B.1 Who builds & sends the invite

- **Provider:** Taqnyat — `src/infrastructure/taqnyat.js`. WhatsApp sends use **Meta-approved managed templates**.
- **Send service:** `src/modules/messaging/messaging.send.service.js`.
  - Single guest: `sendToGuest({ guestId, eventId, channel, userId })` — `:139`.
  - Bulk: `sendBulk(...)` — `:324` (this is the event-launch path; runs `sendToGuest` per guest via `runBatched` + idempotency, `:417-439`).
  - Test/preview: `sendTestMessage(...)` — `:33`.
- **In `sendToGuest` (`:139-313`):**
  - Resolves the event's cached template: `resolveTaqnyatTemplate(event)` → `event.taqnyatTemplate.templateRef` (`formatting.js:29-39`); `templateName = cached?.templateName` (`:162-163`).
  - `channel === 'whatsapp'` → sends the **template** via `taqnyat.sendWhatsAppTemplate(...)` or `...WithImage(...)` (`:188-208`) with body params from `getEventBodyParams(...)` (`:179`).
  - `channel === 'sms'` (and the WA→SMS fallback) → plain text `buildSmsBody(...)` (`:210-211,183-186`).
  - **The per-guest RSVP LINK** `${frontendUrl}/invitation/{guest.qrcode}` is built at `:159-160` — **but it is passed ONLY into `buildSmsBody` (the SMS body), NOT into the WhatsApp template.** `getEventBodyParams`' context (`formatting.js:79-92`) has **no link/qrcode key**, so a WhatsApp template literally cannot render the per-guest link today. (Precedent for adding one: `getPostEventBodyParams` exposes an `access.link` ctx branch — `formatting.js:183-186`.)

### B.2 The 3 interactive buttons — where they're defined

- **They are NOT in app code.** The accept/reject/maybe quick-reply buttons live **inside the Meta-managed WhatsApp template** referenced by `templateName`. The app only stores `templateName`, `varMapping[]`, `hasImageHeader`, `bodyText`, etc. — see `models/TaqnyatTemplateModel.js`.
- **Template taxonomy** (`TaqnyatTemplateModel.js`): `type` enum = **`['invite', 'reminder_confirmed', 'post_event', 'staff_access']`** (`:69-74`); plus `category` (`:54`), `varMapping` (`:87`), `hasImageHeader` (`:80`). **There is NO field distinguishing a "buttons" template from a "link/URL-button" template, and no `hasUrlButton`.** => buttons-vs-link is a **template-level (Meta) choice**, surfaced to the app only as *which `templateName` is assigned*. A link-style invite therefore needs a **new template** (new `type`, e.g. `invite_link`, or a new flag) whose body has a URL `{{N}}` slot.
- Template assignment to an event happens in event setup (`event.taqnyatTemplate.templateRef`); admins curate templates in `src/modules/taqnyat-templates/*`.

### B.3 Per-guest link/code generation

- The per-guest code is **`guest.qrcode`**, generated in a Mongoose pre-save hook at guest creation: `guest_${this._id}_${Date.now()}` (`models/GuestModel.js:204-206`, `qrcode` field `:35`, unique). The link is `{frontendUrl}/invitation/{guest.qrcode}` (`send.service.js:160`).
- **Note:** the generated link has **no `[lang]` segment**, but the web route is `[lang]/invitation/[code]`. This resolves: web `middleware.js:123-130` parses the first path segment as a locale and **falls back to `defaultLocale`** when it isn't one, so `/invitation/{code}` still routes to the `[lang]` page. (Link works for the business flow as-is.)

### B.4 How a button tap is received & recorded (RSVP capture via webhook)

- **Webhook route:** `POST /messaging/webhook` (Meta/Taqnyat) → `messaging.webhook.controller.js:52` `exports.webhook`. (Signature check is **temporarily disabled** — accepts all payloads, `:27-30`; matches PLAN.md:77.) GET verify at `:189`.
- Controller parses Meta payload; for each `message.type === 'button'` (`:117`) it dedups on `message.id` (`:124-130`) and calls `handleButtonResponse({ phoneNumber: message.from, buttonText: message.button.text, messageId })` (`:137-146`).
- **`handleButtonResponse` (`messaging.webhook.service.js:69-199`):**
  - Resolves the guest by **phone** (multiple format variants, `:72-82`).
  - **Maps the Arabic button text → status** (`:102-106`): `'سأحضر'→confirmed`, `'سأعتذر'→declined`, `'ربما'→maybe`.
  - Persists `guest.status = rsvpStatus` + `rsvp.responded=true` + `rsvp.respondedAt` (`:112-116`). **Does NOT capture plusOnes/message** (a quick-reply button carries none).
  - Notifies host (`:134-151`), sends an Arabic auto-reply; for *confirmed* sends a QR image + caption (`:155-198`).
- **=> Two RSVP-capture paths that differ:**
  1. **Button/webhook path** — status only, no +1/message (the normal-host WhatsApp flow).
  2. **Page-submit path** — `submitRSVP` captures status **+ plusOnes + message + dietary** (`guests.service.js:88-95`). The business requirement (+1 + message) is satisfiable **only via the page path** — which is precisely why the business invite must send a *link to the page* instead of the buttons template. **Caveat:** this path works on **mobile** today but is **broken on web** (id/qrcode bug, §A.3) — fix it as part of the business work.

### B.5 Overlap with `invites-plans-rework/PLAN.md`

- That plan reworks the **same `sendToGuest` / `sendBulk` send path** (per-guest consume-on-success at `send.service.js:261-281`, send-budget gate `:365-384`), the reminder/resend templates (`reminder_confirmed`), template types, and delivery reliability (`finalizeWaResult`). The business-account variant adds a **branch on sender type + a new link template + link-param plumbing** in this same code — sequence after / alongside that rework to avoid churn. It does **not** change the consume/budget logic.

---

## (C) Proposed business-account invite differences

> Three pieces of real work: **(1) a link-style WhatsApp template**, **(2) plumb the per-guest link into the WhatsApp template params** (does not exist today), **(3) re-add a branding source to the event page** (whitelabel branding is being deleted). The web page already *renders* buttons + "+1" + message, so little/no web-page UI work — **but the web RSVP submit is currently broken (id/qrcode bug, see §A.3)** and must be fixed as part of this work, since the business model relies on the page-submit path to capture +1/message (the webhook/button path cannot). "Cheap if/else in `sendToGuest`" is **not** sufficient — see #2.

### C.1 Decide a link-style message instead of the 3-button template
- **Real chokepoint = template selection, not a runtime if/else.** Because buttons-vs-link is a Meta template property (§B.2), the business variant needs a **new managed template** (e.g. `TaqnyatTemplate.type = 'invite_link'` or a `category`/flag) whose body contains the event blurb + a `{{N}}` URL slot (and a URL/CTA button instead of 3 quick-reply buttons). Add the enum value in `models/TaqnyatTemplateModel.js:69-74` and the admin curation UI (`src/modules/taqnyat-templates/*`).
- **Code branch point = `messaging.send.service.js:162-208` (`sendToGuest`)** — and mirror in `sendTestMessage` (`:54-98`). After `resolveTaqnyatTemplate`, when the sender is a business account, select the link template (or a per-event link template assigned at setup) and send the link template. The event is already loaded here, so the business check is cheap to evaluate (see C.4); the *work* is the link template + params (C.2), not the branch.

### C.2 Plumb the per-guest LINK into the WhatsApp template (the central new mechanism)
- **Today the link only reaches SMS** (`send.service.js:160` → `buildSmsBody`). To put it in the WhatsApp message body/URL button you must thread the link into the template params:
  - Add an `invite.link` (and/or `guest.qrcode`) branch to the context in **`getEventBodyParams` (`messaging.formatting.js:79-108`)**, mirroring the existing `access.link` branch in `getPostEventBodyParams` (`:183-186`).
  - Pass the `rsvpLink` from `sendToGuest` into `getEventBodyParams` (new `extraContext`/`accessCtx` arg) — `send.service.js:179`.
  - The link template's `varMapping[]` maps the URL `{{N}}` slot to `invite.link`.

### C.3 Brand the event page from the business account (logo / name / message)
- **Backend:** extend **`_formatEventForGuest` (`guests.service.js:618-629`)** to include a `business`/`branding` object — e.g. `{ logoUrl, name, message }` — resolved from the event's owner. (It already returns `description`, currently unrendered — could serve as the event message.)
  - Source data candidates exist but are **scattered/unconfirmed** in `models/UserModel.js`: `brandName` (`:46`, vendor), `businessLogo` (`:92`), `companyName` (`:168`), `logo` (`:169`). The canonical business logo/name/message source is an **open question** (§D) — likely a new business-account profile.
- **Web:** `PortalRsvpForm.jsx` already renders `logoUrl` + title; just feed the new branding fields (and render `event.description`/message). **Sequence against whitelabel-removal**, which is *deleting* the `whitelabel`/`logoUrl` props from `page.jsx` + `PortalRsvpForm`/`PortalConfirmed`/`PortalThankYou` (FINAL_MIGRATION_PLAN.md:96) — business must **re-add** a branding prop (cleaner: a `branding`/`business` prop, not the old `whitelabel` one).
- **Mobile (if link opens the app):** same branding fields into `InvitationScreen.js:41-49`, **plus add the missing +1 + message inputs** (A.2 gap).

### C.4 Identifying a "business account" (the branch predicate)
- The event already carries `planId` (`models/EventModel.js:300-303`) and `subscriptionId` (`:294-297`); `Subscription.planId` is populated to expose `planType` / `planFamily` (`models/SubscriptionModel.js:168-169,403`); `getPlanFamily(planType) === 'business'` for the business plan set (`src/shared/constants/plans.js:81`). So a **plan-family proxy** ("event is on a business plan") is implementable cheaply at the `sendToGuest` branch.
- **BUT** "business account" is **net-new** and **not the same as** "bought a business plan" (a normal host can buy `business_event`). The actual identity model — a new role? a `User` flag / `accountType`? a dedicated business-profile doc? derived from plan family? — is an **open question (§D)** and must be decided before C.1/C.3 land. Whichever it is becomes the predicate the `sendToGuest` branch and the `_formatEventForGuest` branding lookup both read.

### C.5 Concrete files to touch (summary)
- **Backend**
  - `models/TaqnyatTemplateModel.js` — add link-template `type` (or flag). *(C.1)*
  - `src/modules/taqnyat-templates/*` — admin curation for the link template. *(C.1)*
  - `src/modules/messaging/messaging.send.service.js` — `sendToGuest` (`:162-208`) + `sendTestMessage` (`:54-98`): business branch → link template; pass link into params. *(C.1, C.2)*
  - `src/modules/messaging/messaging.formatting.js` — `getEventBodyParams` (`:53-108`): add `invite.link` ctx branch. *(C.2)*
  - `src/modules/guests/guests.service.js` — `_formatEventForGuest` (`:618-629`): add business branding object. *(C.3)*
  - Business-account identity (model/flag/role) — TBD. *(C.4)*
- **Web** — `app/[lang]/invitation/[code]/page.jsx` + `_components/PortalRsvpForm.jsx` (+ `PortalConfirmed.jsx`, `PortalThankYou.jsx`): consume new branding prop, render event message. *(C.3)*
- **Mobile (conditional)** — `screens/guest-portal/InvitationScreen.js`: branding + add +1/message inputs; `hooks/guestPortal/mutations.js` already supports the fields. *(A.2, C.3)*

---

## (D) Open questions

1. **Business-account identity model.** How is a "business account" represented? New role? `User.accountType`/flag? Dedicated business-profile doc? Or derived from plan family (`getPlanFamily === 'business'`)? This predicate drives both the `sendToGuest` branch (C.1/C.4) and the branding lookup (C.3). *Plan-family is a usable proxy but is explicitly NOT the same as an "account" — decide first.*
2. **Branding data source.** Where do the business **logo / name / event-message** live? `UserModel` has scattered candidates (`brandName`, `businessLogo`, `companyName`, `logo` — UserModel.js:46/92/168/169) but no single business-account branding object. Is `event.description` (`_formatEventForGuest`) the "message about the event", or a separate business field?
3. **Link template specifics.** New `TaqnyatTemplate.type='invite_link'` vs a `category`/flag? Does Meta approve a UTILITY template with a dynamic URL button + the event blurb? (Buttons-vs-link is a Meta property; the app can't synthesize it.)
4. **Does the business link open the mobile app?** `halla://invitation/:code` + `https://halaa.com.sa` already route to mobile `InvitationScreen` (App.js:142-157). If yes, mobile must gain the +1/message inputs (A.2) and branding; if the business flow is web-only, mobile is out of scope.
5. **RSVP capture parity / "+1 capacity".** The page path captures `plusOnes` (`guests.service.js:94`); the webhook button path does not. Should a business event's +1 count against any invite/guest cap? (Interacts with `invites-plans-rework` consumption.)
6. **Sequencing vs the two in-flight reworks.** Whitelabel-removal *deletes* the portal branding plumbing (re-add it cleanly); `invites-plans-rework` reworks the very `sendToGuest`/`sendBulk` path the business branch sits in. Land business after/with both.
7. **SMS fallback for business.** WhatsApp template falls back to SMS via `buildSmsBody` (already contains the link). Is the SMS body acceptable for business sends as-is, or does it need business branding text too?
8. **Web RSVP submit bug (must-fix, not strictly an open question).** Web sends the qrcode in the `:id` slot → `validateObjectId` 400s (§A.3). The business feature's reliance on the page-submit path means this must be fixed (web → send `guest.id`). Mobile already works. Flagged here so it isn't lost.

---

### Key file:line index
- Web page: `labbe/app/[lang]/invitation/[code]/page.jsx` (branding `:64-74`, submit `:76-95`); `_components/PortalRsvpForm.jsx` (inputs `:79-108`, buttons `:111-136`).
- Mobile page: `halla-mobile/screens/guest-portal/InvitationScreen.js` (branding `:41-49`, buttons `:184-212`); deep-link `halla-mobile/App.js:142-157`.
- Guest hooks: web `labbe/hooks/guests/{queries.js:11, mutations.js:86-97}`; mobile `halla-mobile/hooks/guestPortal/{queries.js:30, mutations.js:14-58}`.
- Backend RSVP: `labbe-backend-/src/modules/guests/guests.{controller.js:19,28; service.js:33,59,618; routes.js:84,138; validation.js:38}`.
- Send/template: `labbe-backend-/src/modules/messaging/messaging.send.service.js:139,159-160,162-208,324`; `messaging.formatting.js:53-108,113-120,183-186`.
- Webhook/buttons: `labbe-backend-/src/modules/messaging/messaging.webhook.{controller.js:52,117-146; service.js:69,102-106,112-116}`.
- Template model: `labbe-backend-/models/TaqnyatTemplateModel.js:69-74`. Guest code: `labbe-backend-/models/GuestModel.js:204-206`.
- Plans/business: `labbe-backend-/src/shared/constants/plans.js:7-9,49-56,81`; `models/EventModel.js:280-303`; `models/SubscriptionModel.js:168-169,403`; `models/UserModel.js:46,92,168,169`.
- Shared paths: `shared/src/api/paths.js:149-160`.
