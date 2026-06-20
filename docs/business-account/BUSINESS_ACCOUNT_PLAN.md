# Business Account — Feature Plan (post-removal phases)

**Status:** Spec / future · **Created:** 2026-06-20 · **Rev 2** (folds in the Codex review + `round2-codex-verification.md` + owner decisions)
**Depends on:** [whitelabel removal](../whitelabel-removal/FINAL_MIGRATION_PLAN.md) fully complete first.
**Research/verification:** [research-account-and-dashboard.md](research-account-and-dashboard.md) · [research-invites-and-event-page.md](research-invites-and-event-page.md) · [round2-codex-verification.md](round2-codex-verification.md).

## The core model decision (changed)
A business account is **`role: 'host'` + `accountType: 'business'`** — **NOT** a new `role: 'business'`. Role = authorization; `accountType` = product behaviour / plan eligibility / branding. This gives business accounts all host authorization for free (event ownership/editing, host dashboard endpoint, tickets, add-ons, payments, post-event, templates, mobile host nav, host audit). Verification confirmed a separate `role:'business'` would break **~10 hard sites** (403s + Mongoose enum rejects) + ~6 soft branches; the `accountType` pivot sidesteps all of them.

### The mirror risk this introduces (the key new concern)
Because business stays `role:'host'`, it **leaks into ~18 host-scoped queries** that must be **segregated by `accountType`**:
- **`admin.hosts.service.js` (~12 sites)** — the admin **Hosts** page would list business accounts. Filter to `accountType: 'personal'` (or `{$ne:'business'}`).
- **`dashboard.service.js` (~5 sites)** — host metrics would count businesses. Same filter.
- **`getEventTargets` (`admin.events.service.js:185`)** — under the pivot this now **includes** business automatically (Codex's "must add them" inverts to "must label/segregate them"): show a **combined host+business list with an account-type badge** so admins can create events for either.

## Locked owner decisions (2026-06-20)
1. **Model:** `role:host` + `accountType:'business'` (above).
2. **Mobile:** **full parity** — business users use the mobile host stack too; `accountType` must be handled in mobile routing / `isHost`-style gates / plans / settings / nav (not just web).
3. **Subscription lifecycle:** a business is created with **NO subscription**. An admin then **assigns a plan**, choosing one of **two modes**:
   - **(A) Direct grant** — admin activates the assigned plan immediately, no payment (comp/manual); setup fee waived. (Optionally notify the business "your plan is active" via WhatsApp/in-app.)
   - **(B) Checkout link** — admin generates a link to a **hosted checkout page** showing the **summary = assigned plan + the initial setup fee**; the business pays there and the subscription activates on success.
   **Delivery (decided): the business receives the mode-B link over WhatsApp** — the platform already sends user-directed Taqnyat messages (OTP to users; **staff-access links** to staff). The link is delivered the same way, with **SMS fallback** (plain-text link, no template approval) and optionally an email copy as a paper-trail.
   The account is **gated** (cannot send invites) until a subscription is active.
4. **Setup fee (1,200 SAR — today defined but never charged):** charged **only on the mode-B checkout link**, as an authoritative line item (`subtotal = planPrice + setupFee + addons`). Mode-A grant waives it. Charged **once** (first business-plan checkout), not on every purchase. (Sub-rules defaulted: non-refundable, not discountable, idempotent per account; B mode marks it paid; A mode marks it waived. Adjust in B0 if wanted.)
5. **Branding:** **minimal — logo only.** **No colors** (the invite page uses global Halaa tokens/CSS vars; the whitelabel removal already strips the color plumbing — do not re-add). The **business logo** is **snapshotted** onto the event at creation (`event.branding.logoUrl`) so old invitations don't change when the business edits settings. The "message about the event" is the **existing `event.description`** (rendered). Remove website / displayName / custom-message / colors from any branding model.

## Minimal branding + invite-page model (per decision #5)
- **Business profile:** `User.accountType:'business'` + `User.avatar` (logo, signed on read like hosts) + `profile.businessData.description` (account-level text, for the admin page/settings). **No** color/website/displayName/invitationMessage fields.
- **Event snapshot:** at business-event creation, copy the business logo → `event.branding = { logoUrl }` (snapshot; nothing else). Personal-host events get no logo.
- **Public DTO:** extend `_formatEventForGuest` (`guests.service.js:618`) to return `branding: { logoUrl }` **only** (no colors, no internal fields) + it already returns `description` (the "message").
- **Invite page (web `PortalRsvpForm` + mobile `InvitationScreen`):** render the snapshot **logo** + business **name** (= existing `hostName`) + event **title** + event **description** (the message) + the RSVP form (3 buttons + "+1" + guest message — now on both platforms). Styled with global tokens; **no per-event colors.**

## Hard prerequisites
1. Whitelabel removal merged + verified.
2. **Web RSVP-submit fix + mobile +1/message parity** — code-level done 2026-06-20 (`page.jsx` + `hooks/guests/mutations.js`; mobile `InvitationScreen`). **Per Codex: these live in the uncommitted working tree — mark truly complete only after they are committed and live-tested.** B5 relies on the web page-submit path.

---

## Phase order (B0–B6)

### B0 — Domain decisions & contracts (decide before code)
The decisions above are locked; B0 finalises the remaining contracts: the **host-query segregation policy** (filter `accountType` in `admin.hosts.service` + `dashboard.service`; combined event-target list with badge), the **setup-fee sub-rules** (refund/idempotency/how A-grant marks waived, whether to use the existing **`BusinessSetupFeeModel`** — *registered at `server.js:13` but has zero consumers* — vs a flag on the subscription/payment), and the **Taqnyat template delivery contract** (see B5). **Start Meta/Taqnyat approval for BOTH link templates here** — the **`business_checkout`** template (mode-B checkout link, B2) and the **invite link** template (B5) — approval can take longer than the code. Both follow the proven `staff_access` link-template shape.

### B1 — Rename plan availability `'whitelabel'` → `'business'` (~13 files)
Do this **immediately after** whitelabel removal + the dev DB reset (no live data to migrate). Files (from verification): backend `constants/plans.js:63`, `PlanModel.js:101`, `planDefaults.js:210`, `plans.service.js`, backend plan schemas, `shared/src/schemas/plans.js:46`, `checkout.service.js:46`, swagger (3 enums), web `SubscriptionAssignmentPopup.jsx`, mobile subscription modals, the seed script + seeded business Plan docs. After this, `availableFor:'business'` is the canonical tag and the legacy string is gone.

### B2 — Backend: account model, management, eligibility, assignment
- **Model:** add `accountType: 'personal' | 'business'` to `UserModel` (default `'personal'`) + `profile.businessData.description`. **No `whitelabelId`.**
- **Segregation:** add the `accountType` filter to the ~12 `admin.hosts.service.js` host-list sites + ~5 `dashboard.service.js` host-metric sites so business doesn't leak into host surfaces.
- **CRUD module** `src/modules/admin/admin.business.{service,routes,controller}.js` (clone `admin.hosts.*`): list/get/create (`role:host`+`accountType:business`, no whitelabelId, `description→businessData`, **no auto-subscription** per decision #3)/update/suspend/activate/delete. Mount in `admin.routes.js`. Plural route naming: `/admin/businesses`, `/admin/businesses/:id`.
- **Subscription assignment** endpoint with **two modes**: (A) direct grant (activate now, mark setup fee waived); (B) generate a checkout link/token for the assigned plan **and deliver it to the business over WhatsApp**. Reuse the existing user-send pattern — model on `events.staff.service.js:258+` (`staff_access` global Taqnyat template: token → `${frontendUrl}/...` link → `taqnyat.sendWhatsAppTemplate` with the link in the body via the `getEventBodyParams` `accessUrl`-style ctx → SMS/no-capability fallback). Needs a `business_checkout` managed template (B0 approval) + a checkout token model/route.
- **Authoritative checkout (the real fix):** `checkout.service.js` currently does `subtotal = planPrice + addonsTotal` (`:77`) and **never reads `setupFeeAmount`**. For a business-plan checkout via mode B, add the **setup fee** as a line item (idempotent, charged once per account). Decide `BusinessSetupFeeModel` vs a subscription/payment flag (B0).
- **Server-side eligibility (both checkout + admin assignment):** enforce `plan.availableFor === 'business' && account.accountType === 'business'`; personal hosts cannot buy business plans, business cannot get host-only plans. Do **not** rely on the UI showing only business plans.
- **Event targets:** `getEventTargets` returns host **and** business with an account-type badge.
- API/eligibility/amount **tests**.

### B3 — Admin "Businesses" management page (web; mobile-admin optional)
A dedicated **`admin-dash/businesses`** page (full management) mirroring the Hosts page:
- Web page `app/[lang]/admin-dash/businesses/` + `_components/` (`BusinessesTable`, `PageHeader`, optional stats/detail); **Add/Edit** popups (clone `AddHostPopup`) with fields **email, name, description, phone, logo, password**; row actions **assign-plan (2 modes)**, **suspend/activate**, **delete**.
- **Full plumbing** (verified real, mirror the Hosts feature): `shared/src/api/paths.js` entries; web admin **keys/queries/mutations/index** + exports; backend **validation schema** (`addBusinessSchema`/`updateBusinessSchema`/`assignBusinessSubscriptionSchema` in `shared/src/schemas/admin.js`); controller/service **barrels + route mount**; `providers/index.js` **namespace** registration; **`adminBusinesses.json`** (en + ar); **cache invalidation** after create/edit/status/subscription/delete.
- **Subscription-assignment UI:** the whitelabel removal collapsed `SubscriptionAssignmentPopup`/`Modal` to host-only — **re-add a clean `entityType:'business'` variant** (lists `availableFor:'business'` plans; offers the A/B modes). Do not revive whitelabel code.
- **Logo upload (Codex was right — option B fails):** `PATCH /users/profile` updates the *authenticated* user, so an admin can't use it to set someone else's logo. Use **multipart `POST /admin/businesses`** or a dedicated **`PATCH /admin/businesses/:id/logo`**, with MIME/size/dimension validation + old-image cleanup.

### B4 — Business-user dashboard, settings, plans (web + mobile, full parity)
- **Routing:** `accountType`-aware so a business user lands on the host stack (web `middleware.js getRedirectPath:88` + host gate `:210`; the mobile equivalent — full parity, decision #2).
- **Settings:** business edits **description + logo**; hide host-only sections that don't apply.
- **Plans:** show **business** plans (`useBusinessPlans` / `/plans/business`) instead of host plans, same components/styles. **SSR fix:** `host/plans/page.js:15` unconditionally prefetches host plans — branch the prefetch on `accountType` so a business user gets the business query/endpoint server-side (no wasted host fetch + double client fetch). Shapes differ (`{event,quarterly,annual}` vs host `{basic,premium}×{event,monthly}`) → a business variant of `usePlansPageState`, not a drop-in swap.
- **Checkout-link page:** the hosted summary page (plan + setup fee) the business opens from the admin's mode-B link; authoritative amounts from B2.

### B5 — Invitation delivery (link template) + minimal logo branding
- **Branding:** snapshot `event.branding.logoUrl` at creation; render logo + `event.description` on the invite page (web + mobile); **no colors**. Public DTO returns only `branding.logoUrl`.
- **All send paths (not just `sendToGuest`):** apply the business link behaviour to single send, **bulk/launch**, **test message**, **retry** (note: `events.resend.service.js` is a **separate** send implementation — must be covered), **resend**, **scheduled**, and the **SMS fallback** (the SMS body already carries the link).
- **Template contract (B0-approved):** a Meta URL-button template needs an exact component payload — define `deliveryMode: 'quick_reply' | 'portal_link'`, whether the URL is a body var or a dynamic URL-button suffix, the exact Taqnyat component payload, how synced templates expose their button structure, and how the event wizard **prevents a business from selecting an incompatible template**. **Approved Meta template is a release prerequisite** (started in B0).
- The branch predicate is the **event owner's `accountType === 'business'`** (clean; available on the loaded event/owner).

### B6 — Verification
- **Personal-host regression** (segregation + accountType changes don't break existing hosts).
- **Business e2e:** create → assign (mode A and mode B) → pay plan + setup fee → branded (logo) invite → RSVP with +1/message.
- **Payment-amount tests:** checkout charges plan + setup fee exactly (no UI/server mismatch).
- **Invite URL/template tests;** eligibility tests (personal host can't buy business plans; business excluded from Hosts page/metrics).

---

## Open sub-items (resolve in B0)
1. Setup-fee mechanism: reuse `BusinessSetupFeeModel` (currently unused) vs a flag on subscription/payment; exact idempotency + how mode-A marks it waived.
2. Host-query segregation: confirm `accountType:'personal'` vs `{$ne:'business'}` filter and every host-list/metric site.
3. Event-target UI: combined list + badge (assumed) vs a separate "Businesses" tab.
4. Whether admins manage businesses on **mobile** too (business *users* on mobile are already in scope per decision #2; admin-side mobile management is optional).
5. Taqnyat link-template payload + Meta approval timeline (start in B0).
