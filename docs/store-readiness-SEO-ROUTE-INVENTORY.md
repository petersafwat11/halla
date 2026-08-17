# Halaa web route index/noindex inventory (SEO-01) — SIGNED policy

**Session:** 6 (web SEO / mobile ASO) · **Date:** 2026-07-02 · **DB/console touched:** none.

**Executable source of truth:** `shared/src/brand/routePolicy.js`
(`@halla/shared/brand`). Both `generateMetadata` in pages AND the metadata tests
import `robotsFor(routeClass)` / `ROUTE_INVENTORY` from that module — this
document is the human-readable rendering of it and is kept in lockstep (a test
asserts every `ROUTE_CLASS` resolves and that the indexable set matches).

## Policy model — DEFAULT-DENY

The App-Router root layout (`labbe/app/[lang]/layout.js`) sets
`robots: { index: false, follow: false }` as the inherited default. Because Next
metadata inherits down the tree and `robots` is replace-on-override, **every
route is `noindex` unless it explicitly opts in.** Only the indexable public
classes opt in (`index: true`). A new/forgotten private, token, auth, dashboard,
checkout, or post-event route is therefore `noindex` **by construction** — never
by per-route bookkeeping. This satisfies "do not rely only on authentication to
prevent indexing" (§2): the directive is present regardless of the auth
redirect.

`robots()` (`labbe/app/robots.js`) additionally `Disallow`s the private/token
path prefixes at the crawler level as defense-in-depth on top of the per-page
`noindex`.

## Robots directives

| Directive | index | follow | Applied to |
|---|---|---|---|
| `INDEX_FOLLOW` | ✓ | ✓ | landing, marketplace, vendor-profile, legal |
| `NOINDEX_NOFOLLOW` (+`nocache`) | ✗ | ✗ | **everything else** — auth, dashboard, checkout, post-event, token-link, and the inherited root default for any unlisted route |

The policy has exactly two outcomes. Auth/dashboard pages define no
`generateMetadata`, so they inherit the root `{index:false, follow:false}`; the
policy resolves them to the same `noindex,nofollow` so the signed inventory
equals what the server actually returns (verified live). `nofollow` is stricter,
never leaks, and is correct for private shell + token/guest routes alike.

## Signed inventory (one row per public route family)

`pii = true` means the page renders user/guest data to whoever holds the URL, so
its metadata/preview MUST NOT contain names, phones, tokens, exact private
locations, or payment IDs.

### INDEXABLE (public, substantive, no PII)

| Route | Class | robots | In sitemap | Notes |
|---|---|---|---|---|
| `/[lang]` | landing | index,follow | ✓ | Localized landing page. |
| `/[lang]/market-place` | marketplace | index,follow | ✓ | Public marketplace; listing content client-rendered (metadata added; full SSR is a separate task). |
| `/[lang]/market-place/vendors/[vendorId]` | vendor-profile | index,follow | dynamic (best-effort) | Approved+active public vendors only; thin/suspended/deleted → backend 404 → `notFound()` → inherits root noindex. |
| `/[lang]/privacy` | legal | index,follow | ✓ | Session 5. |
| `/[lang]/terms` | legal | index,follow | ✓ | Session 5. |
| `/[lang]/refund` | legal | index,follow | ✓ | Session 5. |
| `/[lang]/community-rules` | legal | index,follow | ✓ | Session 5. |
| `/[lang]/support` | legal | index,follow | ✓ | Session 5 (store support URL). |
| `/[lang]/delete-account` | legal | index,follow | ✓ | Session 5 (public deletion-policy resource). |

### NOINDEX/NOFOLLOW — private app shell (auth-redirected; inherits root default-deny)

| Route | Class | PII | Notes |
|---|---|---|---|
| `/[lang]/login` | auth | — | Renders to crawlers (not auth-gated) → explicit noindex,nofollow (inherited). |
| `/[lang]/signup` | auth | — | " |
| `/[lang]/signup/continue-signup` | auth | ✓ | Profile completion; renders user data. |
| `/[lang]/signup-vendor` | auth | — | Vendor signup. |
| `/[lang]/verify-email` | auth | ✓ | Verification (token/email context). |
| `/[lang]/forget-password` | auth | — | Reset request. |
| `/[lang]/change-password` | auth | ✓ | Password change (universal-link target). |
| `/[lang]/host/**` | dashboard | ✓ | Host dashboard (auth-gated + noindex). |
| `/[lang]/vendor-dashboard/**` | dashboard | ✓ | Vendor dashboard. |
| `/[lang]/admin-dash/**` | dashboard | ✓ | Admin/moderator dashboard. |
| `/[lang]/staff` | dashboard | ✓ | Staff check-in tools. |

### NOINDEX/NOFOLLOW (token / guest / payment / workflow — PII risk)

| Route | Class | PII | Notes |
|---|---|---|---|
| `/[lang]/host/payments` | checkout | ✓ | Payment workflow. |
| `/[lang]/host/payments/return` | checkout | ✓ | Provider return. |
| `/[lang]/host/plans/summary` | checkout | ✓ | Checkout summary. |
| `/[lang]/business/checkout/[token]` | checkout | ✓ | Tokenized B2B checkout — renders quote to token holder; **no PII in metadata** (inherits root noindex, no `generateMetadata`). |
| `/[lang]/business/checkout/[token]/return` | checkout | ✓ | Tokenized return. |
| `/[lang]/post-event` | post-event | ✓ | Guest post-event portal — guest/host PII + media; token/guest-gated. |
| `/[lang]/host/post-event/[eventId]` | post-event | ✓ | Host post-event management. |
| `/[lang]/admin-dash/post-event/[eventId]` | post-event | ✓ | Admin post-event management. |
| `/[lang]/ticket-rating/[id]` | token-link | ✓ | Tokenized rating link. |
| `/[lang]/reset-password` | token-link | ✓ | Tokenized reset link. |

## No-PII-in-metadata proof

None of the NOINDEX routes define a `generateMetadata`/`metadata` export, so
their `<title>`/`<meta description>`/OG all come from the **static** localized
brand default in the root layout (brand name + generic product description) —
there is **no code path that reads a guest name, host name, phone, token, event
title, or payment id into any of these routes' metadata**. The only routes that
build metadata from fetched data are the indexable public ones:

- **Landing / marketplace** — static localized brand/marketing strings only.
- **Vendor profile** — builds title/description/OG from the backend **PUBLIC**
  vendor projection (`PUBLIC_VENDOR_SELECT`), which is asserted by
  `labbe-backend-/test/vendors.public.test.js` to **exclude** `ownerFullName`,
  `nationalId`, `commercialRecord`, `profileFile`, `adminNotes`,
  `rejectionReason`. The vendor's own business brand/about/contact are
  public-by-design (rendered visibly on the page).

## Structured data (JSON-LD)

- **Vendor profile** emits `LocalBusiness` JSON-LD from public fields only,
  serialized attack-safe via `safeJsonLd` (escapes `<`, `>`, `&`, U+2028/U+2029)
  so a vendor cannot inject `</script>` through `brandName`/`about`. `areaServed`
  = Saudi Arabia (signed D2). Empty keys pruned.

## Sitemap / robots / manifest / icons

- `app/sitemap.js` — always emits static indexable URLs (landing + marketplace +
  6 legal routes × ar/en) with reciprocal `alternates`; appends approved-vendor
  URLs best-effort (try/catch, 4 s abort) so the **offline production build never
  throws**. Vendor population against a live DB is a known offline-build
  limitation.
- `app/robots.js` — allow `/`, disallow private/token prefixes, points to
  `sitemap.xml`, absolute `host`.
- `app/manifest.js` — `/manifest.webmanifest` (brand name/colors, `/logo.png`).
- `app/icon.png` + `app/apple-icon.png` — the owner-provided brand mark
  (`public/logo.png`); `app/opengraph-image.js` — build-time-generated default OG
  card (Latin "Halaa", brand colors).

## Known limitations / follow-ups

- Marketplace listing is client-rendered; per-vendor indexable content depends on
  the vendor-profile pages (which ARE server-rendered + indexable). Full
  marketplace SSR is out of scope.
- Sitemap vendor rows require a reachable backend; the offline build ships the
  static set only.
- Analytics/Search-Console verification tags are intentionally **not** added
  (owner + privacy-inventory gated — §6).
