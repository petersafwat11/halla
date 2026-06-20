# Round 2 — Codex Critique Verification (business-account plan)

**Date:** 2026-06-20 · **Method:** read-only source verification (file:line cited). Each Codex claim was tested against live code, NOT trusted.
**Central question:** is the pivot from a new `role:'business'` to `role:'host'` + `accountType:'business'` justified?

---

## (1) Verdict table — claims 1–8

| # | Claim | Verdict | Evidence (file:line) | Note |
|---|-------|---------|----------------------|------|
| 1a | `dashboard.routes.js:107` exact-host check | **CONFIRMED (hard)** | `restrictTo(ROLES.HOST)` `dashboard.routes.js:107` | Host-only 403; `role:'business'` rejected. |
| 1b | `events.routes.js:70` exact-host check | **PARTIAL (hard)** | `restrictTo(ROLES.HOST, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.WHITELABEL_ADMIN, ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR)` `:70` | Not "exact host" — a 6-role allow-list. But `business` is absent → 403 on ALL `/events` routes. Real breakage, mischaracterized as "exact host." |
| 1c | `tickets.service.js:69` exact-host check | **PARTIAL (soft)** | `if (role === ROLES.HOST)` `:69` | Exact, but it is a source/priority selector that **falls through to `TICKET_SOURCE.OTHER`** `:77` — no error. Degradation, not a 403. |
| 1d | `checkout.service.js:49`/`:46` exact-host check | **CONFIRMED (hard)** | `user.role !== ROLES.HOST` `:49`; `availableFor==='whitelabel' && role !== WHITELABEL_ADMIN` `:46` | Wrong-plan validation; `business` rejected on both branches. |
| 1e | `PaymentModel.js:377` exact-host check | **PARTIAL (soft)** | `if (payer.role === "host" || payer.role === "whitelabel_admin")` `:377` | Notification-recipient branch. Business misses the payment notification — no error. (Same soft pattern at `webhook.controller.js:322`.) |
| 1f | `EventModel.js:327` host-only enum | **CONFIRMED (hard)** | `role.enum:["host","whitelabel_admin",...]` `:329-336`; **also a 2nd enum `:358-368`** | Two `role` enums (createdBy + createdFor); both omit `business` → mongoose enum validation reject. |
| 1g | `AuditLogModel.js:29` host-only enum | **CONFIRMED (hard)** | `performedByRole.enum:[...,"host",...]` `:29-36` | `business` not listed → enum reject when an audited action is performed by a business user. |
| 1h | `NotificationPreferencesModel.js:28` host-only enum | **CONFIRMED (hard)** | `role.enum:["host","vendor",...]` `:28-36` | `business` not listed → enum reject creating prefs doc. |
| 2 | `accountType` is net-new; `businessData` is clean home | **CONFIRMED** | zero `accountType` matches in backend or `shared`; `profile.hostData` schema `UserModel.js:28-38`, mounted `:364`, `roleDataMap[HOST]="hostData"` `:769`; no `businessData` | `accountType` does not exist anywhere. `profile.businessData` (mirror of `hostDataSchema`) is the clean place for description/displayName/logo/colors/invitationMessage/website. |
| 3 | `BusinessSetupFeeModel` is unused | **CONFIRMED** | model `BusinessSetupFeeModel.js:1-17`; only reference in live `src/` is `server.js:13` (model registration). Zero read/write consumers. | Audit doc's claimed consumer `subscriptions.service.js:319` is **STALE** — grep of live `src/modules/subscriptions/*` finds nothing. Genuinely orphaned. |
| 4 | Setup fee not charged by checkout | **CONFIRMED** | `subtotal = planPrice + addonsTotal` `checkout.service.js:77`; `setupFeeAmount` never read in checkout. `setupFeeAmount:1200` lives on BUSINESS_EVENT plans `planDefaults.js:215`; schema field `PlanModel.js:141` (default 0) | The 1,200 SAR exists as plan data + swagger doc but is **never added to the charge total**. Real gap. |
| 5 | `getEventTargets` exact-role excludes business | **CONFIRMED (but pivot FLIPS it)** | `admin.events.service.js:185-188`: `role = type==='whitelabel'?WHITELABEL_ADMIN:HOST; query={role,...}` | True for a separate `role:'business'`. **Under the pivot it INVERTS:** business *is* `role:'host'`, so it would appear automatically → the work becomes *segregation* (`accountType:{$ne:'business'}`), not inclusion. |
| 6 | Host plans SSR always prefetches host plans | **CONFIRMED** | `host/plans/page.js:17-22` unconditionally prefetches `plansKeys.host()` / `API_PATHS.plans.getHostPlans` whenever a token exists; no account-type branch | A business user gets a wasted host fetch SSR + a second client fetch unless SSR branches. |
| 7 | `events.resend.service` is a separate send path | **CONFIRMED** | `events.resend.service.js:113 resendInvite` calls `taqnyat.sendWhatsAppTemplate(WithImage)`/`sendSMS` directly `:174,:182,:203` — NOT via `messaging.send.service.sendToGuest` | Multiple send entrypoints exist (list below). |
| 8 | `availableFor:'whitelabel'`→`'business'` rename surface | **CONFIRMED (small, ~13 files)** | enumerated below | Cheap post-DB-reset; touches constants, schemas, planDefaults, services, swagger, web/mobile assignment UI. |

---

## (2) Exact-host-check inventory — the role-vs-accountType quantification

> **The Codex "N vs 0" framing is one-sided.** Measure BOTH columns: what `role:'business'` *breaks* AND what `accountType:'business'` (still `role:'host'`) *costs* (host-scoped queries now silently include business rows). Below is the honest two-sided count.

### Column A — what a separate `role:'business'` BREAKS (must be fixed)

**Hard failures (403 / mongoose enum reject):**
| Site | file:line | Kind |
|------|-----------|------|
| Host dashboard route | `dashboard.routes.js:107` | restrictTo 403 |
| All `/events` routes | `events.routes.js:70` | restrictTo 403 (allow-list miss) |
| Event retry-launch | `events.routes.js:962` | restrictTo 403 (allow-list miss) |
| Checkout host-plan gate | `checkout.service.js:49` | validation 400 |
| Checkout business-plan gate (also WL-admin) | `checkout.service.js:46` | validation 400 |
| completeHostProfile | `auth.service.js:1205` | `role !== HOST` → 404 |
| EventModel createdBy.role enum | `EventModel.js:327` | enum reject |
| EventModel createdFor.role enum | `EventModel.js:358` | enum reject |
| AuditLogModel performedByRole enum | `AuditLogModel.js:29` | enum reject |
| NotificationPreferencesModel role enum | `NotificationPreferencesModel.js:28` | enum reject |

→ **~10 hard sites.**

**Soft degradations (no error, wrong behavior — these are the OVERSTATED Codex "breaks"):**
| Site | file:line | Effect |
|------|-----------|--------|
| Ticket source/priority | `tickets.service.js:69` | falls through to `TICKET_SOURCE.OTHER` `:77` |
| Payment notify (model) | `PaymentModel.js:377` | business skips payment notification |
| Payment notify (webhook) | `webhook.controller.js:322` | same |
| Report email role label | `email/templates/reports.js:214` | display only |
| PDF role label | `pdfGenerator.js:434` | display only |
| Notif backward-compat host field | `NotificationPreferencesModel.js:115` | `host` field left undefined |

→ **~6 soft sites.**

**Config additions either approach needs anyway (~5):** `ROLE_HIERARCHY` (`shared/.../roles.js:43` + backend `:43`), `DEFAULT_PERMISSIONS` (`permissions.js:45`), `roleDataMap` (`UserModel.js:769`), notif role schema (`shared/src/schemas/settings.js`), swagger role enums.

### Column B — what `accountType:'business'` (keeps `role:'host'`) COSTS

Because the account stays `role:'host'`, every **host-scoped query** silently returns business accounts too. These must gain `accountType:{$ne:'business'}` (or accept the leak):

| Site | file:line | Leak |
|------|-----------|------|
| Admin Hosts list/CRUD/lookup | `admin.hosts.service.js:26,50,95,195,220,269,301,361,391,426,443,477` | business appears in the **Hosts admin page** (~12 sites) |
| Dashboard host metrics | `dashboard.service.js:120,121,122,123,140` | business inflates host counts/recent-hosts (~5 sites) |
| Event-target selector | `admin.events.service.js:188` (`getEventTargets`) | business appears in "create event for…" host list |

→ **~18 host-query sites** to segregate (or knowingly tolerate).

### Verdict on role-vs-accountType

**The pivot to `accountType:'business'` is justified, but not because it is "free."** It trades **~10 hard breakages + ~6 soft + ~5 config** (the `role:'business'` path) for **~18 host-query segregation edits** (the `accountType` path). The decisive advantages of `accountType`:
- It **inherits all host authorization automatically** — the ~10 hard 403/enum sites (routes, model enums, completeHostProfile) need **zero** change, which is exactly the brittle, scattered, easy-to-miss class (model enums silently reject at write time).
- The cost it adds (host-query segregation) is **mechanical, greppable, and centralized** in two service files (`admin.hosts.service.js`, `dashboard.service.js`) — far lower-risk than hunting auth gates and enums.
- Both approaches still require the same *intentional* differ-sites (checkout :46/:49, plans page, invites, settings).

**Net:** recommend the pivot, but the plan/owner must explicitly decide the host-query segregation policy (don't let business silently leak into the Hosts admin page and host dashboard metrics).

---

## (3) Setup-fee reality

- **Model:** `BusinessSetupFeeModel.js` — `{ organizationId(ref User, required), status('pending'|'paid', default pending), amount(Number, default 1200), currency('SAR'), paidAt, notes }`, index `{organizationId,status}`. **Orphaned:** registered at `server.js:13`, **zero consumers in live `src/`** (the audit doc's `subscriptions.service.js:319` reference is stale/removed).
- **Plan field:** `setupFeeAmount` exists on `PlanModel.js:141` (default 0); set to **1200** only on BUSINESS_EVENT plans (`planDefaults.js:215`); 0 on all quarterly/annual/host/trial tiers. Exposed via `plans.service.js:399` and swagger `:1113` ("1,200 for event tiers").
- **Checkout gap:** `checkout.service.js:77` computes `subtotal = planPrice + addonsTotal`. **`setupFeeAmount` is never read in checkout.** So the 1,200 SAR is documented plan metadata but is **not charged** anywhere, and no code records/reads a `BusinessSetupFee` row. The setup fee is, today, vestigial: a number on the plan + an unused model.

---

## (4) Rename surface — `availableFor:'whitelabel'` → `'business'`

Renaming the plan-availability tag is small (~13 files), cheap post-DB-reset (no live WL plan docs to migrate beyond the seeded business plans):

| File | What changes |
|------|--------------|
| `labbe-backend-/src/shared/constants/plans.js:63` | `PLAN_AVAILABILITY.WHITELABEL:'whitelabel'` → the canonical constant value |
| `labbe-backend-/models/PlanModel.js:101` | `availableFor` enum `['host','whitelabel','platform_admin']` |
| `labbe-backend-/src/shared/constants/planDefaults.js:210` | `availableFor: PLAN_AVAILABILITY.WHITELABEL` on business plans |
| `labbe-backend-/src/modules/plans/plans.service.js:35` | `getBusinessPlans` query `availableFor:'whitelabel'` (also `:24,114,385` pass-through) |
| `labbe-backend-/src/modules/plans/plans.schemas.js:117` | `availableFor` zod |
| `labbe-backend-/src/modules/payments/checkout.service.js:46` | the gate literal `'whitelabel'` (also repoint role check to BUSINESS/host+accountType) |
| `labbe-backend-/src/config/swagger.js:859,996,1066` | three `availableFor` enums + doc text `:1113` |
| `shared/src/schemas/plans.js:46` | `availabilityEnum` includes `"whitelabel"` |
| `labbe/app/[lang]/admin-dash/_components/SubscriptionAssignmentPopup.jsx:36,80` | `useAdminPlans({availableFor: entityType})` — entityType drives the tag |
| `halla-mobile/.../common/SubscriptionAssignmentModal.js:93` | same `availableFor: entityType` |
| `halla-mobile/.../hosts/SubscriptionModal.js` | `availableFor` usage |
| `halla-mobile/.../whitelabels/WhitelabelSubscriptionModal.js` | `availableFor` usage (whitelabel modal — slated for removal) |
| `labbe-backend-/scripts/assignAdminUnlimitedPlan.js:42` | `availableFor: planConfig.availableFor` pass-through |

Plus the seeded business Plan docs' `availableFor` value (one-off DB update). **Cheap and self-contained.**

---

## (5) Overstated / incorrect Codex points

1. **"Exact HOST check" mischaracterization (claims 1b, 1c, 1e):**
   - `events.routes.js:70` / `:962` are **multi-role allow-lists**, not exact-host checks. `business` still fails (it's absent), so the *conclusion* holds, but the *characterization* is wrong.
   - `tickets.service.js:69` and `PaymentModel.js:377` are **soft** branches (fall-through to `OTHER`; skipped notification) — framing them as breakages that "would 403" overstates them. Marked PARTIAL/soft above.
2. **Claim 5 is inverted under the recommended pivot.** Codex says business "would NOT appear in `getEventTargets` without a change." True for a *new role*; but the plan's own pivot keeps `role:'host'`, so business would appear *automatically* and the actual task is to **exclude** it. The claim is correct only against the rejected design.
3. **BusinessSetupFee "unused" is correct** — and Codex is right where prior audit docs were stale. (Not overstated; flagged here as a point where the docs disagree and live source wins.)

Everything else (claims 2, 3, 4, 6, 7, 8 + the missing-plumbing list) is accurate.

**Missing-plumbing list spot-check (review #3) — CONFIRMED real.** The Hosts admin feature wires exactly the parallel set a Businesses feature needs: shared `api/paths.js` hosts block (`shared/src/api/paths.js:386-396`), web `hooks/admin/{index,keys,queries,mutations}.js`, i18n namespaces `adminHosts.json` (en+ar), backend route mount `admin.routes.js:20`, validation schemas, nav/RBAC. A Businesses feature must replicate each.

---

## (6) Decisions the owner must make

1. **Host-query segregation policy (NEW — surfaced by the pivot).** Since business = `role:'host'`, decide whether business accounts leak into the **Hosts admin list** (`admin.hosts.service.js` ~12 sites) and **host dashboard metrics** (`dashboard.service.js` ~5 sites). Recommend adding `accountType:{$ne:'business'}` to host-scoped queries (or a shared scope helper).
2. **Trial policy.** Do business accounts get an auto-trial at admin creation (like `createHost` `:231-250`), or no subscription until they buy a business plan? Trial plan's `availableFor` must be checked against the checkout gate.
3. **Setup-fee semantics.** Is the 1,200 SAR (a) charged inside checkout for `business_event` (add to subtotal at `checkout.service.js:77` + write a `BusinessSetupFee` row), (b) one-time-per-org gated, or (c) dropped? Today it is vestigial.
4. **Mobile scope.** Web-only business dashboard, or mobile host shell too? (Mobile business plan tabs/types are KEPT; rest of mobile business UX undefined.)
5. **Event-target UI.** Should admins be able to "create event for" a business account? If yes, `getEventTargets` needs a business branch; if no, it needs the `accountType` exclusion.
6. **Branding: live vs snapshot.** Is the event-page branding (logo/name/colors/message) read live from the business `User` at render, or snapshotted onto the event/guest at send time? Affects `_formatEventForGuest` (`guests.service.js`) and whether later branding edits change already-sent invites.
7. **Invite send-path coverage.** B-invite branding/link work must cover ALL send entrypoints, not just `sendToGuest`: `messaging.send.service` (sendToGuest + test-message `:31`), bulk/launch (`runBatched`→sendToGuest `:439`), `events.resend.service.resendInvite:113`, `messaging.reminder.service:91,208,216`, `post-event.dispatch.service:83,92`, `events.staff.service:327,335`.
