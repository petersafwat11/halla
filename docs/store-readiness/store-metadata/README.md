# Store listing / product metadata TEMPLATES (ASO-01) — Session 6

**Date:** 2026-07-02 · **Status:** versioned DRAFT templates ·
**Gate:** `OWNER_AND_COUNSEL_REQUIRED` before any console submission.

These are **templates with explicit approval gates**, NOT approved listings. Only
fields marked `approved: true` are derived from ALREADY-SIGNED facts. Every
persuasive/marketing field is `BLOCKED_NEEDS_OWNER`. Do NOT fabricate ratings,
awards, superlatives, user counts, or unverified feature claims. Do NOT write to
the Apple/Google/RevenueCat consoles from this session.

## Files

| File | Purpose |
|---|---|
| `apple-listing.template.json` | App Store Connect AR/EN listing fields (name/subtitle/promo/keywords/description/URLs/EULA/category). |
| `google-listing.template.json` | Google Play AR/EN listing fields (name/short+full description/category/contact/URLs/access). |
| `data-safety-worksheet.md` | Apple App Privacy + Play Data Safety answers, generated from the same privacy inventory. |
| `screenshot-brief.md` | AR/EN screenshot + creative plan (device/localization matrix, shot list). |
| `reviewer-notes.md` | Reviewer access + product-behavior notes (credentials env-only, never committed). |
| `product-metadata.md` | Per-store-product (plan/add-on) name/description behavior rules, tied to the canonical catalog. |

## Validation

`node shared/scripts/validate-aso-metadata.mjs` (or `npm run aso:verify` in
`shared/`) validates every present field/proposal against the store limits.
**Apple `keywords` is 100 BYTES** (Arabic ≈ 2 bytes/char); every other field is
character-limited. The validator never fails on a `BLOCKED_NEEDS_OWNER` field — it
only fails on an actual over-limit value.

## Facts that ARE approved (safe to submit)

- **App name:** `هلا` / `Halaa` (matches `app.json`; ≤30 chars both).
- **Bundle/package:** `com.halla.app`.
- **Availability:** Saudi Arabia only (signed D2).
- **Legal/support/marketing URLs:** `https://halaa.com.sa/<lang>/{privacy,terms,refund,community-rules,support,delete-account}` and `https://halaa.com.sa/<lang>` (Session 5 — live + indexable).
- **Feature set** (truthful, from code): event creation/management, digital
  invitation design, WhatsApp invitation sending (no affiliation), real-time
  attendance/check-in, guest/RSVP management, vendor marketplace, business
  features, report/block controls.
- **Catalog facts:** 34 plans / 22 add-ons, six-tier, current prices final
  (PRICE-OWNER); subscriptions + one-time packages + add-ons; store shows
  price/VAT (Saudi VAT 15%).

## EXACT list of BLOCKED_NEEDS_OWNER ASO / marketing copy blocks

Persuasive/marketing (owner sign-off) — **per platform × AR/EN**:

1. **Apple subtitle** (AR + EN) — 30-char tagline.
2. **Apple promotional text** (AR + EN) — 170 chars.
3. **Apple keywords** (AR + EN) — 100-byte field.
4. **Apple description** (AR + EN) — 4000-char body (facts available; wording gated).
5. **Apple "What's New"** (AR + EN) — release notes.
6. **Google short description** (AR + EN) — 80 chars.
7. **Google full description** (AR + EN) — 4000-char body.
8. **Google release notes** (AR + EN) — 500 chars.
9. **Categories** — Apple secondary category; Google primary category + tags.
10. **Copyright / EULA** — depends on the unresolved legal entity name.
11. **Screenshot captions** — derive from the approved description (same gate).
12. **Age-rating questionnaire** — final answers (owner).

Contact/identity (carried over from Session 5 — do NOT re-resolve, reuse the
existing `BLOCKED_NEEDS_OWNER` placeholders):

13. **Legal entity name** — 2-way conflict.
14. **Support email** — 2-way conflict (`support@halaa.net` vs `support@halaa.com.sa`).
15. **Support phone / WhatsApp** — provisional `+966552619282`.
16. **Postal address** — provisional Jeddah address.
17. **Support response SLA / hours**.
18. **Data-safety legal characterizations + retention durations** (`RETENTION_MATRIX_FINALIZED=false`).

## Not done here (by design)

- No console writes (Apple/Google/RevenueCat) — MCP-02/03/04.
- Screenshot assets — need the signed IPA/AAB (ART-IOS/ART-AND, ASO-02).
- Analytics/Search-Console tags — owner + privacy-inventory gated (§6).
