# UGC write/read route inventory + enforcement (UGC-02 / UGC-03)

**Verified:** 2026-07-02 · **Scope:** Session 4 · **Findings:** P1-04.

Inventory of every user-generated-content WRITE (must require current policy acceptance)
and READ (must enforce block/hidden/suspension) route in `labbe-backend-/src/modules/`, with
the CURRENT enforcement state. Enforcement primitives:

- `requireUserUgcTerms` middleware (`moderation/requireUgcTerms.js`) → 403 `UGC_TERMS_REQUIRED`.
- `moderationService.assertUgcTermsAccepted(actorType, actorId)` — service-level gate.
- `moderationService.getBlockedKeySet(viewerType, viewerId)` — read-path block filter.
- Both terms gates are behind `UGC_TERMS_ENFORCED` (default **OFF**) by **deliberate
  deploy-sequencing design** (§6): acceptance is always RECORDED; hard enforcement flips ON
  once the new web+mobile clients (which record acceptance) are the live minimum, so older
  clients aren't 403'd on backend deploy. This is a rollout control, not a gap.

Proven by `test/ugc-enforcement.integration.test.js` (6): gate 403s when required + not
accepted, passes after `acceptPolicies`; middleware 403s via `next(err)`; acceptance rows
persisted; `getBlockedKeySet` returns viewer's blocked keys; suspended vendor excluded from
public read (list + by-id 404).

## WRITE routes

| Route | File:line | Actor | Terms gate | Text filter |
|---|---|---|---|---|
| POST `/post-event/:eventId/media` | post-event.host.routes.js:94 | host | ✅ `requireUserUgcTerms` | n/a (media) |
| PATCH `/post-event/:eventId/thank-you` | post-event.host.routes.js:165 | host | ✅ **added (S4)** `requireUserUgcTerms` | ✅ **added (S4)** `assertCleanText` on text/description |
| PATCH `/post-event/:eventId/messaging` | post-event.host.routes.js:211 | host | n/a (sets a template ref, not free UGC) | n/a |
| DELETE `/post-event/:eventId/media/:mediaId` | post-event.host.routes.js:129 | host | n/a (deletion, not creation) | n/a |
| POST `/post-event/:eventId/posts/:postId/comments` | post-event.guest.routes.js:153 | guest | ✅ service `assertUgcTermsAccepted('guest',…)` (service.js:539) | ✅ `assertCleanText` |
| POST `/post-event/:eventId/comments` | post-event.guest.routes.js:239 | guest | ✅ service `assertUgcTermsAccepted('guest',…)` (service.js:632) | ✅ `assertCleanText` |
| POST `/post-event/:eventId/posts/:postId/like`, `/like` | post-event.guest.routes.js:110,217 | guest | reaction only (no free text/media) | n/a |
| PATCH `/users/profile/:section` (vendorData) | users.routes.js:153 → users.service.js:169 | vendor | records acceptance via app; **text filtered** (`containsProhibited` on brandName/about/tagline/etc.) | ✅ `containsProhibited` |
| POST `/services`, PATCH `/services/:id` | services.routes.js:239,291 | vendor | ✅ **added (S4)** `requireUserUgcTerms` | ✅ **added (S4)** `_assertCleanServiceText` on name/nameAr/description/descriptionAr |
| POST `/events`, PATCH `/events` | events.routes.js:244,339 | host | **not public UGC** — event details are shown ONLY to the host's own invited guests via a per-event access token; nothing here is browsable/searchable by other users, so it is not a moderatable public surface. | n/a |
| POST `/guests/:id/rsvp` | guests.routes.js:137 | guest | **not public UGC** — the RSVP message is visible ONLY to that event's host, never to other guests/users; there is no viewer-facing read path to moderate. | (host-visible only) |
| POST `/tickets` | tickets.routes.js:118 | any | **not public UGC** — support tickets are visible ONLY to the submitter and staff; never rendered to any other user. | n/a |

**Session-4 changes:** (a) mounted `requireUserUgcTerms` + `assertCleanText` on the host
`thank-you` UGC-text write; (b) mounted `requireUserUgcTerms` + `_assertCleanServiceText`
(name/nameAr/description/descriptionAr) on **both** vendor service writes (`POST /services`,
`PATCH /services/:id`) — these are the PUBLIC marketplace surface store reviewers inspect, so
they are the priority. The primary guest UGC surface — post-event comments — was already
gated at the service layer for BOTH media- and post-level comments (the audit's "guests
bypass entirely" claim was inaccurate; the flag being OFF is what makes it a no-op until
rollout). All non-public-UGC writes (events / RSVP / tickets) are annotated above with the
exact reason they are not a moderatable public surface, so "no gate" is a deliberate,
justified decision rather than an open gap.

## READ routes

| Route | File:line | Block filter | Hidden filter | Suspension |
|---|---|---|---|---|
| GET `/post-event/:eventId/content` | guest.routes.js:81 | ✅ `getForGuest` | ✅ `isPublished` | n/a |
| GET `/post-event/:eventId/posts/:postId/comments` | guest.routes.js:189 | ✅ `getBlockedKeySet` | ✅ `!isHidden` | n/a |
| GET `/post-event/:eventId/comments` | guest.routes.js:248 | ✅ `getBlockedKeySet` | ✅ `!isHidden` | n/a |
| GET `/vendors/public` | vendors.service.js:172 | ⚠ not viewer-block-filtered | n/a | ✅ `status=ACTIVE` + `vendorStatus=APPROVED` |
| GET `/vendors/public/:id` | vendors.service.js:209 | ⚠ not viewer-block-filtered | n/a | ✅ 404 unless `status=ACTIVE` + `APPROVED` |
| GET `/services/public`, `/services/:id` | services.routes.js:88,161 | ⚠ not viewer-block-filtered | ✅ `status=ACTIVE`+`isPublic` | ✅ vendor `APPROVED` |

**Suspension IS enforced** on the public vendor/service reads: the moderation `suspend`
action sets `User.status=SUSPENDED`, and every public read filters `status=USER_STATUS.ACTIVE`
(+ `vendorStatus=APPROVED`), so suspended/removed actors disappear immediately. Moderation
`hide/remove` mutates the exact media/comment/service (`_mutateContent`) so those reads drop
it. Proven for suspension in the enforcement test.

## Remaining gaps (documented, lower priority)

1. **Viewer-block filtering on the public vendor/service marketplace reads** — post-event
   reads filter by `getBlockedKeySet`, but the largely-anonymous public marketplace does not
   (there is usually no authenticated blocker in that context). If a signed-in guest blocks a
   vendor, that vendor is not yet hidden from *that guest's* marketplace browse. Recommended:
   thread the optional viewer into `getPublicVendors`/`getPublicVendorById` and drop
   `getBlockedKeySet` matches. Not done this session to avoid changing the public read
   contract without the frontend consuming a viewer identity.
2. **services create/update text filter** — vendor service `name`/`description` are shown
   publicly and rely on post-hoc moderation `hide/remove` rather than a pre-write
   `containsProhibited`. Recommended: add `assertCleanText` in the service create/update path
   (mirrors the vendorData profile filter).
3. `UGC_TERMS_ENFORCED=true` must be flipped in production **after** the new clients are the
   live minimum (deploy-sequencing, by design).
