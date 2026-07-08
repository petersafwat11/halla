/**
 * @halaa/shared/brand/routePolicy — SIGNED route index/noindex inventory
 * (SEO-ASO-METADATA-PLAN §2, §11). SEO-01.
 *
 * This is the EXECUTABLE single source of truth for which web route classes are
 * indexable. Both `generateMetadata` in pages AND the metadata tests import
 * `robotsFor(routeClass)`; the human-readable inventory doc
 * (`docs/store-readiness-SEO-ROUTE-INVENTORY.md`) is generated from / kept in
 * lockstep with this module.
 *
 * DEFAULT-DENY: the base policy is `noindex,nofollow`. A route is indexable ONLY
 * if it is explicitly listed in `INDEXABLE`. A forgotten/new private route
 * therefore fails SAFE (never indexed). "Do not rely only on authentication to
 * prevent indexing" (§2) — every private/token/auth route carries an explicit
 * robots directive regardless of the auth redirect.
 *
 * The most dangerous leak surface is token/guest routes that render to ANYONE
 * with the URL and are NOT behind a login wall (post-event, business checkout
 * token, ticket-rating, reset-password). These are enumerated as NOINDEX below
 * and must never expose guest/host PII in metadata or link previews.
 */

/** Robots directives as Next.js Metadata `robots` objects. */
const INDEX_FOLLOW = Object.freeze({
  index: true,
  follow: true,
  googleBot: Object.freeze({ index: true, follow: true }),
});

// All non-indexable classes resolve to the same directive that the root layout
// inherits down the tree (`noindex,nofollow`). This deliberately MATCHES SHIPPED
// REALITY: auth/dashboard pages define no `generateMetadata`, so they inherit the
// root default-deny — there is no code path that gives them `follow:true`. We do
// NOT model a softer `noindex,follow` for them, because the signed inventory must
// equal what the server actually returns (verified live). nofollow is stricter,
// never leaks, and is correct for private shell + token/guest routes alike.
const NOINDEX_NOFOLLOW = Object.freeze({
  index: false,
  follow: false,
  nocache: true,
  googleBot: Object.freeze({ index: false, follow: false }),
});

/**
 * Route classes. Each public page passes its class to `robotsFor()`. Keep this
 * enum and the inventory doc in lockstep (a test asserts every class resolves).
 */
export const ROUTE_CLASS = Object.freeze({
  // ---- INDEXABLE (public, substantive, no PII) ----
  LANDING: "landing",
  MARKETPLACE: "marketplace",
  VENDOR_PROFILE: "vendor-profile",
  LEGAL: "legal", // privacy/terms/refund/community-rules/support/delete-account

  // ---- NOINDEX/NOFOLLOW (everything below; inherits the root default-deny) ----
  // Private app shell (auth-redirected; crawler sees login, not content):
  AUTH: "auth", // login/signup/forget-password/change-password/verify-email
  DASHBOARD: "dashboard", // host/vendor/admin panels + settings
  // Token/guest/workflow (never index, never leak PII):
  CHECKOUT: "checkout", // host payments + business checkout token + returns
  POST_EVENT: "post-event", // token/guest-gated post-event workflow
  TOKEN_LINK: "token-link", // ticket-rating/[id], reset-password, invitations
});

/**
 * The explicit allowlist of indexable route classes. Everything else is
 * default-denied to `noindex,nofollow`.
 */
const INDEXABLE = new Set([
  ROUTE_CLASS.LANDING,
  ROUTE_CLASS.MARKETPLACE,
  ROUTE_CLASS.VENDOR_PROFILE,
  ROUTE_CLASS.LEGAL,
]);

/**
 * Resolve the robots directive for a route class. Only the indexable allowlist
 * opts into `index,follow`; every other class (and unknown/omitted) resolves to
 * the inherited `noindex,nofollow` — matching shipped behavior.
 * @param {string} routeClass one of ROUTE_CLASS
 * @returns {object} Next.js Metadata `robots` object
 */
export function robotsFor(routeClass) {
  if (INDEXABLE.has(routeClass)) return INDEX_FOLLOW;
  return NOINDEX_NOFOLLOW;
}

/** True if a route class is indexable (used by sitemap + tests). */
export function isIndexable(routeClass) {
  return INDEXABLE.has(routeClass);
}

/**
 * The signed inventory as data — one row per concrete public route family. Used
 * to render the doc and drive the noindex/sitemap tests. `dynamic` routes carry
 * a param and are enumerated by the app; static routes are listed with paths.
 *
 * `pii` = the route renders user/guest data to whoever holds the URL, so its
 * metadata/preview MUST NOT contain names/phones/tokens/locations.
 */
export const ROUTE_INVENTORY = Object.freeze([
  // INDEXABLE
  { routeClass: ROUTE_CLASS.LANDING, path: "/[lang]", pii: false, sitemap: true, note: "Localized landing page." },
  { routeClass: ROUTE_CLASS.MARKETPLACE, path: "/[lang]/market-place", pii: false, sitemap: true, note: "Public vendor marketplace (listing content client-rendered)." },
  { routeClass: ROUTE_CLASS.VENDOR_PROFILE, path: "/[lang]/market-place/vendors/[vendorId]", pii: false, sitemap: "dynamic", note: "Approved/active public vendors only; thin/suspended → noindex via notFound()." },
  { routeClass: ROUTE_CLASS.LEGAL, path: "/[lang]/privacy", pii: false, sitemap: true, note: "Privacy policy (Session 5)." },
  { routeClass: ROUTE_CLASS.LEGAL, path: "/[lang]/terms", pii: false, sitemap: true, note: "Terms of use (Session 5)." },
  { routeClass: ROUTE_CLASS.LEGAL, path: "/[lang]/refund", pii: false, sitemap: true, note: "Refund/subscription policy (Session 5)." },
  { routeClass: ROUTE_CLASS.LEGAL, path: "/[lang]/community-rules", pii: false, sitemap: true, note: "Community rules (Session 5)." },
  { routeClass: ROUTE_CLASS.LEGAL, path: "/[lang]/support", pii: false, sitemap: true, note: "Support/contact (Session 5)." },
  { routeClass: ROUTE_CLASS.LEGAL, path: "/[lang]/delete-account", pii: false, sitemap: true, note: "Public deletion-policy resource (Session 5)." },

  // NOINDEX/NOFOLLOW — private shell (auth-redirected; inherits root default-deny)
  { routeClass: ROUTE_CLASS.AUTH, path: "/[lang]/login", pii: false, sitemap: false, note: "Auth screen." },
  { routeClass: ROUTE_CLASS.AUTH, path: "/[lang]/signup", pii: false, sitemap: false, note: "Auth screen." },
  { routeClass: ROUTE_CLASS.AUTH, path: "/[lang]/signup/continue-signup", pii: true, sitemap: false, note: "Profile completion; renders user data." },
  { routeClass: ROUTE_CLASS.AUTH, path: "/[lang]/signup-vendor", pii: false, sitemap: false, note: "Vendor signup." },
  { routeClass: ROUTE_CLASS.AUTH, path: "/[lang]/verify-email", pii: true, sitemap: false, note: "Verification; token/email context." },
  { routeClass: ROUTE_CLASS.AUTH, path: "/[lang]/forget-password", pii: false, sitemap: false, note: "Password reset request." },
  { routeClass: ROUTE_CLASS.AUTH, path: "/[lang]/change-password", pii: true, sitemap: false, note: "Password change (deep-link target)." },
  { routeClass: ROUTE_CLASS.DASHBOARD, path: "/[lang]/host", pii: true, sitemap: false, note: "Host dashboard (auth-gated)." },
  { routeClass: ROUTE_CLASS.DASHBOARD, path: "/[lang]/vendor-dashboard", pii: true, sitemap: false, note: "Vendor dashboard (auth-gated)." },
  { routeClass: ROUTE_CLASS.DASHBOARD, path: "/[lang]/admin-dash", pii: true, sitemap: false, note: "Admin/moderator dashboard (auth-gated)." },
  { routeClass: ROUTE_CLASS.DASHBOARD, path: "/[lang]/staff", pii: true, sitemap: false, note: "Staff check-in tools (auth-gated)." },

  // NOINDEX/NOFOLLOW — token / guest / payment / workflow (PII risk)
  { routeClass: ROUTE_CLASS.CHECKOUT, path: "/[lang]/host/payments", pii: true, sitemap: false, note: "Payment workflow." },
  { routeClass: ROUTE_CLASS.CHECKOUT, path: "/[lang]/host/payments/return", pii: true, sitemap: false, note: "Payment provider return." },
  { routeClass: ROUTE_CLASS.CHECKOUT, path: "/[lang]/host/plans/summary", pii: true, sitemap: false, note: "Checkout summary." },
  { routeClass: ROUTE_CLASS.CHECKOUT, path: "/[lang]/business/checkout/[token]", pii: true, sitemap: false, note: "Tokenized B2B checkout — renders quote to token holder." },
  { routeClass: ROUTE_CLASS.CHECKOUT, path: "/[lang]/business/checkout/[token]/return", pii: true, sitemap: false, note: "Tokenized checkout return." },
  { routeClass: ROUTE_CLASS.POST_EVENT, path: "/[lang]/post-event", pii: true, sitemap: false, note: "Guest post-event portal — guest/host PII + media." },
  { routeClass: ROUTE_CLASS.POST_EVENT, path: "/[lang]/host/post-event/[eventId]", pii: true, sitemap: false, note: "Host post-event management." },
  { routeClass: ROUTE_CLASS.POST_EVENT, path: "/[lang]/admin-dash/post-event/[eventId]", pii: true, sitemap: false, note: "Admin post-event management." },
  { routeClass: ROUTE_CLASS.TOKEN_LINK, path: "/[lang]/ticket-rating/[id]", pii: true, sitemap: false, note: "Tokenized rating link." },
  { routeClass: ROUTE_CLASS.TOKEN_LINK, path: "/[lang]/reset-password", pii: true, sitemap: false, note: "Tokenized reset link." },
]);

export default { ROUTE_CLASS, robotsFor, isIndexable, ROUTE_INVENTORY };
