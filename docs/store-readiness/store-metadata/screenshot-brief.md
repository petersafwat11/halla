# Screenshot & creative brief (ASO-02)

**Session:** 6 · **Date:** 2026-07-02 · **Gate:** requires the release-candidate
build + design capture. This brief is the plan; the assets themselves are
`ASO-02: NOT_STARTED` (need signed IPA/AAB — ART-IOS/ART-AND).

## Hard requirements (store policy + truthfulness)

- Capture from the **actually submitted build** only. No mockups of unbuilt
  features, no unsupported features, no prices that differ from the store.
- **No real PII** — use seeded demo data (reviewer/demo accounts, demo vendor
  `6a368f9120dfa5841546e228`). No real guest names/phones/photos.
- Localized embedded text: an **AR (RTL)** set and an **EN (LTR)** set.
- WhatsApp invitation shown as a workflow **without implying Meta/WhatsApp
  affiliation** (no WhatsApp logo lockups suggesting partnership).
- No fabricated ratings/awards/"#1"/testimonials/store badges in the frames.
- Device frames + caption text must obey each store's screenshot policy.

## Device / localization matrix

| Platform | Devices (tablet REQUIRED — `supportsTablet:true`) | Locales |
|---|---|---|
| iOS | 6.7" iPhone, 6.5"/6.1" iPhone, **13" iPad** (portrait + landscape) | ar, en |
| Android | compact phone, large phone, **tablet**, + **feature graphic** (1024×500) | ar, en |

## Shot list (truthful — each maps to a real screen)

1. Create / manage an event (event wizard).
2. Digital invitation customization (template editor).
3. Guest / RSVP management.
4. WhatsApp invitation workflow (no affiliation claim).
5. Real-time attendance / check-in (staff/host view).
6. Marketplace / vendor discovery (public marketplace + a vendor profile).
7. Business organization features (business plans / self-serve).
8. Privacy / report / block controls (where useful for trust).

## Captions

- Derive from the approved store description once the owner signs the ASO copy
  (`apple-listing.template.json` / `google-listing.template.json`). Captions must
  match real on-screen functionality. **Currently BLOCKED_NEEDS_OWNER** (same
  gate as the descriptions).

## IAP review screenshot (Apple, §8)

- For each in-app product reviewed, the Apple IAP review screenshot must show the
  **actual paywall/product** (the Session-3 purchase sheet with the store price),
  not a marketing frame.
