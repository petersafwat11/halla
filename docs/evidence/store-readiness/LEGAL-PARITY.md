# Legal parity, shared package & mobile legal UI (Session 5)

**Verified:** 2026-07-02 · **Scope:** Session 5 (LEG-01/02/03, UGC-01, P1-03/06/07/08)
· **DB/provider/console touched:** none.

Single, versioned AR/EN legal source consumed by web + mobile, a backend-generated
hashed policy manifest, live public web routes, mobile legal screens for every role +
signup + checkout + UGC-acceptance, a symmetric-controls mobile app bar, and
parity/version/schema/URL CI checks. **No legal copy is approved** — every document is
`ownerApproval: BLOCKED_NEEDS_OWNER`.

## Shared canonical legal package (LEG-01)

- **Location:** `shared/src/legal/` in the ESM `@halla/shared` workspace (consumed by web
  + mobile; the backend reads the JSON via `fs`). Rationale: unlike the CAT-01 catalog
  (derived from backend CJS constants → kept in the backend to avoid an ESM bridge),
  legal content is **inert JSON**, so all three consumers read it cleanly — web/mobile
  `import` (bundlers load `.json` by extension), backend `fs.readFileSync`. One source, no
  duplicate copies.
  - `documents/{privacy,terms,communityRules,refund,deletion,support}.json` — canonical
    `{ ar, en }` docs in the exact render shape the web `LegalPage` and mobile
    `LegalScreen` already consumed (`{ badge, title, subtitle, lastUpdated, sections:[{id,num,label,title,body}] }`)
    plus envelope metadata (`documentType`, `version`, `authoritativeLanguage`,
    `ownerApproval`, `changeSummary`).
  - `documents.js` (re-exports + `getLegalDocument`), `manifest.js`
    (`LEGAL_ROUTES`/`LEGAL_MANIFEST`/`SURFACE_DOCUMENTS`/`UGC_REQUIRED_DOCUMENTS`),
    `contact.js` (`LEGAL_CONTACT` — single contact source, all values
    `BLOCKED_NEEDS_OWNER`), `index.js` (public API).
  - `package.json` exports extended: `"./legal"` + `"./legal/*"`.
- **Privacy/Terms/Refund** content was carried over from the pre-existing web docs
  **byte-for-byte** for the section bodies (verified: `sections` JSON identical to the old
  `labbe/ui/landing/Legal/data/*.json`). **This carried-over copy is NOT approved** — it
  is marked `BLOCKED_NEEDS_OWNER` like the net-new docs.
- **Refund** gained store-billing sections (10–15) reflecting the SIGNED DECISION-RECORD
  substance as real content: Apple/Google auto-renew, consumables non-restorable, design
  **non-refundable from creation** (DEC-03L), store-refund effects, RevenueCat
  keep-with-original (DEC-04), Saudi VAT 15% — exact legal phrasing marked owner-gated.
- **Deletion** describes the ACTUAL Session-4 implementation (retryable, truthful
  completion, RevenueCat `retained_by_policy`, store-subscription warning) — factual;
  retention **durations**/legal basis marked owner-gated.
- **Community Rules / Support** are new structured docs (§3.3 categories; support/contact
  scaffolding) with owner-gated copy.

## Backend policy manifest (LEG-03, mirrors CAT-01)

- `src/shared/legal/legalContent.js` (reads shared JSON via `fs`),
  `legalManifest.js` (builds + hashes; AR/EN section-id parity + version lockstep + fail
  closed), `legalPolicies.generated.json` (committed artifact:
  6 docs, per-doc version/URLs/sectionIds/SHA-256 contentHash + overall `manifestHash`),
  `scripts/generateLegalManifest.js` (`--check` drift gate).
- **P1-07 closed:** `src/shared/constants/policies.js` now **derives**
  `POLICY_VERSIONS`/`POLICY_URLS` from the manifest (was hardcoded `2026-06-27`). The
  acceptance keys (`terms`/`community`/`privacy`) are preserved; `community` maps to the
  canonical `community-rules` doc, so the acceptance API + existing `TermsAcceptance` rows
  are unchanged. Community version now `2026-07-02` (re-prompts UGC acceptance, by design).
  - **NOTE (not a bug):** deriving from document content moved the **terms** version
    "backwards" in time (`2026-06-27` → `2026-02-03`) because it now equals the terms doc's
    own `version`. Policy versions are **string identities**, not date comparisons —
    `moderation.service` re-prompts on any string change and makes no monotonic/date
    assumption, so this is safe. The owner should be aware the displayed "current terms
    version" string is now Feb 2026.
- npm scripts: `legal:generate` / `legal:check` / `legal:test` / `legal:verify` (isolated
  from `catalog:*`, so catalog stays 26).

## Web routes (P1-03)

Live public AR/EN routes under `labbe/app/[lang]/`, all server-rendered from the shared
package via `getLegalDocument`, cross-linked, footer-linked, with canonical + AR/EN
`hreflang` + OG + `robots:index` metadata (`ui/landing/Legal/legalMetadata.js`):

| documentType | route | matches mobile hard-link |
|---|---|---|
| privacy | `/[lang]/privacy` | ✓ (`privacy`) |
| terms | `/[lang]/terms` | ✓ (`terms`) |
| refund | `/[lang]/refund` | ✓ (`refund`) |
| community-rules | `/[lang]/community-rules` | new (backend URL now 200, was 404) |
| support | `/[lang]/support` | new |
| deletion | `/[lang]/delete-account` (pre-existing) | new manifest mapping |

**Render-verified** (not just compiled): `next start` + curl showed `/en/privacy`
("Privacy Policy"/"Definitions"), `/ar/privacy` ("سياسة الخصوصية"/"التعاريف"),
`/en/community-rules` ("Prohibited Content"), `/en/support` (HTTP 200). `BLOCKED_NEEDS_OWNER`
appears only in the non-visible RSC hydration payload (metadata field), never in visible copy.

## Mobile (P1-08 + surfaces)

- **Screens:** `screens/legal/{Privacy,Terms,CommunityRules,Refund,Deletion,Support}Screen.js`
  all consume `getLegalDocument` from the shared package.
- **Navigation:** all 6 registered for **host** + **vendor** (`AppNavigator.js`) and
  **admin/moderator** (`AdminNavigator.js`, page-gated). Settings lists (host/vendor/admin
  reuse `SettingsTabs`/`VendorSettingsTabs`) expose all 6.
- **Signup** (unauthenticated): `components/legal/LegalLinks.js` opens the canonical web
  pages (same shared content) for Terms/Privacy/Community Rules.
- **Checkout:** `PurchaseLegalLinks` now manifest-driven (Terms/Privacy/Refund/Support).
- **UGC acceptance** (§4.3): `ManagePostEventScreen` shows a disclosure + Terms/Community
  Rules links at the publish (acceptance) point.
- **TopBar (P1-08):** rewritten to a symmetric three-column bar — 44×44 start/end controls,
  an **absolutely-centered title** (independent of side controls, no shift RTL↔LTR),
  logical start/end via plain `row` (auto-flips under global RTL — **no `row-reverse`, no
  manual double reversal**), back chevron chosen once from resolved direction, truncation +
  screen-reader header. Back-compat preserved for all ~20 callers (`title`/`showBack`/
  `onBack`/`leftContent`/`rightContent`).
- **LegalScreen (§5.2):** logical start alignment (`flex-start` badge), `flex-start`
  card header so scaled/wrapped titles don't clip (Dynamic Type), header/section
  `accessibilityRole="header"`, mixed-direction tokens via ambient bidi, safe-area top +
  scroll bottom padding. Direction-agnostic (no per-component `isRTL`).

## Contact single source (P1-06)

`@halla/shared/legal` `LEGAL_CONTACT` is the one source. Web `LegalPage.jsx`, `Footer.jsx`,
and `delete-account/page.js` now read from it (PROVISIONAL, owner-gated). **No hardcoded
`support@halaa.*` remains in web/mobile source** (grep-clean). The footer email changes
`.net`→`.com.sa` (the intended de-conflict) — still owner-gated.

## Verification gates (all on the FINAL tree, after duplicate-JSON deletion)

| Gate | Result |
|---|---|
| Backend `npm test` | **231 / 231** (215 prior + 16 new `legal-manifest.test.js`) |
| Backend `npm run catalog:verify` | drift-clean + **26** contracts |
| Backend `npm run legal:verify` | drift-clean + **16** contracts |
| Backend payment static-checks (`MOYASAR_API_KEY=dummy`) | **18 / 18** |
| Shared `node scripts/verify-legal.mjs` | pass (6 docs, AR/EN parallel, schema/URL/slug OK) |
| Web `npm run lint` | 0 errors (34 pre-existing warnings) |
| Web `npm run build` | **exit 0** (all 6 legal routes) |
| Web render (`next start` + curl) | AR + EN privacy, community-rules, support all render |
| Mobile `npm test` | **33 / 33** (29 prior + 4 new `legalContent.test.js`) |
| Mobile `npm run lint` | 0 |
| Mobile `npx expo export --platform android` | **exit 0**; bundle contains the shared legal content (Community Rules / Deletion / Refund docs + `getLegalDocument`) |

## Honest verification boundaries

- **Mobile Metro bundling of `@halla/shared/legal` IS proven.** `npx expo export` produced a
  complete Android Hermes bundle (exit 0) whose bytecode contains the shared legal strings
  ("Community Rules and Content Standards", "Account and Data Deletion Policy",
  "BLOCKED_NEEDS_OWNER", "getLegalDocument") — so Metro resolves the `exports`-map subpath
  and the JSON-imports-inside-`documents.js` end-to-end (the resolution is also deductive:
  `@halla/shared/api/paths` ships today with no physical `api/paths.js`, so only the exports
  map can resolve it). Web bundling is proven by build **and** render. What is NOT done is
  **on-device runtime/visual QA** (rendering the screens on a phone/iPad).
- **TopBar verified by lint/compile + the two widest prop-patterns walked
  (VendorHome greeting+bell no-title; Tickets/Notifications title+rightContent), NOT
  on-device.** `RTL_ALIGNMENT_REPORT.md` had frozen TopBar as high-blast-radius; the new
  absolutely-centered title uses a `44+8` horizontal inset so a very long title with wide
  side content could visually crowd the corner — non-legal screens were not visually QA'd.
- **Guest-portal UGC accept** (`post-event/:id/policies/accept`) disclosure not added
  (host UGC + signup + checkout were). Documented follow-up.
- i18n JSON does not hot-reload under turbopack (memory) — translation edits verified via a
  fresh production build/render, not live reload.

## BLOCKED_NEEDS_OWNER — exact copy blocks requiring owner + counsel sign-off

1. **Legal entity name** — TWO-WAY CONFLICT: "مؤسسة هلا الرقمية للتقنية / Halaa Digital
   Technology Establishment" (privacy + terms docs) vs "Afaq hala Company For
   Communications and Information" (web footer `t("footer.legalName")`). One approved name
   for every surface + store listings.
2. **Support email** — TWO-WAY CONFLICT: `support@halaa.net` (was web LegalPage/Footer) vs
   `support@halaa.com.sa` (delete-account). Provisional consolidated to `halaa.com.sa`
   (domain-consistent) — **owner must confirm**.
3. **Phone / WhatsApp** — provisional `+966552619282` — confirm the official number(s).
4. **Postal address** — provisional "Museum Street, Jeddah, 23326" — confirm.
5. **Support response SLA / hours** — placeholders in Support + Community docs.
6. **Data-retention durations + legal basis** — Privacy art.7 + Deletion arts.3/5 (exact
   statutory periods per category; `RETENTION_MATRIX_FINALIZED` stays false — see
   DELETION-MATRIX.md).
7. **Refund/subscription exact wording** — Refund arts.11–15 store-billing phrasing incl.
   design **non-refundable-from-creation** and store-refund exceptions (substance signed;
   exact legal text owner-gated).
8. **Community Rules** — appeal mechanism, response targets, emergency/escalation channel,
   repeat-offender policy specifics.
9. **Jurisdiction / governing law / authoritative-language** — Terms arts.3/26 (Saudi law,
   Arabic authoritative) — confirm as final binding text.
10. **Carried-over Privacy / Terms / Refund copy** — pre-existing, NOT reviewed or approved
    this session; all marked `ownerApproval: BLOCKED_NEEDS_OWNER`. Must be signed before any
    document is treated as approved. **Includes an AR/EN vintage mismatch to reconcile:**
    Terms AR `lastUpdated` = "24 نوفمبر 2025" while EN = "03 February 2026" (carried over
    from the original web JSON) — counsel should confirm both language versions correspond to
    the same effective text.
