# Halaa legal parity, policy, and mobile alignment plan

**Executor:** Claude Code  
**Goal:** one legally approved, versioned source rendered consistently on web and mobile, with correct RTL/LTR layout and store-review-ready links.  
**Legal caveat:** Claude implements structure and approved copy; Saudi counsel/owner must approve legal substance, retention periods, entity/contact data, subscription/refund wording, and minors/UGC provisions.

## 1. Current state

- Web/mobile Privacy and Terms JSON files currently have identical SHA-256 hashes.
- This parity is fragile because the files are duplicated.
- Refund/Cancellation exists on web only.
- Backend publishes Community Rules URLs that currently 404.
- No complete public Support legal/resource page exists.
- Delete Account is a separate hardcoded document/workflow.
- Contact emails conflict (`support@halaa.net` vs `support@halaa.com.sa`).
- Policy versions are hardcoded in backend and not derived from document content.
- Mobile legal layout has title/header and RTL alignment defects.

## 2. Canonical legal document set

Create a shared package such as `shared/legal/` with these documents in Arabic and English:

1. Privacy Policy
2. Terms of Use / Terms and Conditions
3. Community Rules / UGC Standards
4. Cancellation, Subscription, and Refund Policy
5. Account and Data Deletion Policy
6. Support and Contact page
7. Optional cookie/web tracking notice if the final web inventory requires it

Each document schema must include:

- stable `documentType`
- semantic `version` and effective date
- owner/legal approval reference
- authoritative-language declaration
- localized title/subtitle/sections
- permanent canonical URLs
- support/legal contact block
- change summary

Store acceptance records must reference `documentType + version + locale + acceptedAt + actor`, never a date copied independently from a page.

## 3. Content requirements

### 3.1 Privacy Policy

Generate the policy from a signed data inventory covering at least:

- account identity/contact/profile data
- business/vendor verification documents
- event, guest, RSVP, staff, and location data
- contacts access and selected contact data
- photos/videos/documents and UGC
- device/push token, IP, logs, diagnostics, interaction data
- web Moyasar payment records
- Apple/Google/RevenueCat purchase/subscription data
- Sentry crash/diagnostic data
- Expo/APNs/FCM push processing
- AWS/S3, MongoDB Atlas, Maps, Meta/WhatsApp/Taqnyat, email/SMS providers
- reports, blocks, moderation, abuse/fraud data
- support tickets

For every data family state: purpose, legal basis as approved by counsel, required/optional, collection source, sharing/processor, country/cross-border handling, security, retention, deletion/rights, and whether linked/tracking.

The policy and Apple App Privacy/Google Data Safety answers must be generated from the same inventory and reviewed together.

### 3.2 Terms and native subscriptions

Terms must distinguish:

- Halaa web payments through Moyasar
- Apple/Google native purchases
- auto-renewing monthly/quarterly/annual subscriptions
- one-time event packages
- consumable/non-consumable add-ons
- offers/promo codes
- upgrade/downgrade effective timing
- store-controlled cancellation/refund and Halaa support responsibilities
- account deletion does not cancel a store subscription
- taxes/prices shown by the applicable store
- managed B2B contracts vs simplified in-app business plans

In-app checkout must link to Terms and Privacy. App Store metadata must use Apple’s standard EULA or an owner-approved custom EULA consistently.

### 3.3 Community Rules

Publish clear Arabic/English rules covering:

- prohibited illegal, abusive, hateful, sexual, violent, deceptive, spam, impersonation, IP-infringing, privacy-invasive, and unsafe content
- minors and sensitive event/guest information
- reporting and blocking
- moderation actions and appeals
- response targets and emergency/escalation channel
- repeat-offender/account suspension policy

Link the same document from acceptance UI, report/block UI, settings, web footer, and reviewer notes.

### 3.4 Refund/Cancellation

Current web copy appears written for service/event cancellation and does not fully model store billing. Split or clearly section:

- web/Moyasar service cancellation
- Apple/Google subscriptions
- event consumables before/after first send
- extra-invite credits before/after use
- design/customization services before/after work begins/fulfillment
- store refund/reversal effects on Halaa access
- contact and expected response time

Copy must match backend behavior exactly.

### 3.5 Deletion and retention

The public deletion page must state:

- what account/data is deleted
- what is retained, exact fields/categories, reason, and duration
- store subscription warning
- processor deletion/retention behavior
- expected completion time
- request/status process and support escalation

Do not set `RETENTION_MATRIX_FINALIZED=true` until counsel signs the exact matrix and code tests prove it.

## 4. One source across web/mobile/backend

### 4.1 Shared content module

- Move legal JSON to `shared/legal/documents/`.
- Web and mobile import the same source through the workspace package.
- Backend imports a generated `policyManifest` containing current versions/URLs/hashes.
- Delete duplicate copies only after all consumers migrate.
- Validate schema at build/test time.

### 4.2 CI drift checks

Fail CI when:

- a required locale/document is missing;
- section IDs differ between AR/EN;
- backend policy version/hash differs from the document;
- any canonical policy URL is non-HTTPS, placeholder, redirecting, or non-200 in release verification;
- checkout/settings/footer omit required documents;
- store metadata URLs differ from the canonical manifest;
- support/legal entity/contact details differ across documents.

### 4.3 Acceptance flow

- Show document names, versions, and links before consent.
- Do not silently “accept on action” without clear disclosure; use an explicit review/accept flow where policy requires it.
- Require current Terms + Community Rules before every UGC write route.
- Re-prompt after a material version change.
- Store evidence without excessive PII; define retention for acceptance IP/user agent.

## 5. Mobile layout correction

### 5.1 Fix the shared TopBar

Current `TopBar` is structurally off-center. Replace with a three-column layout:

- logical start slot: 44×44 back/action control
- center slot: absolute or flex-balanced title independent of side controls
- logical end slot: matching 44×44 action/placeholder
- use logical `start/end`, not hardcoded left/right
- choose back-chevron from resolved layout direction once
- minimum touch target 44×44
- title supports truncation and screen-reader label

Do not hardcode `row-reverse` for both languages.

### 5.2 Fix LegalScreen direction/alignment

- Use one direction source from the localization provider; avoid combining global RTL mirroring with manual double reversal.
- Section number remains visually stable while title/body use locale direction.
- Badge aligns to logical start.
- Arabic and English paragraphs use appropriate alignment and line height.
- Respect safe areas, device rotation (iPad), and keyboard/accessibility settings.
- Support Dynamic Type/font scale without clipped cards or header overlap.
- Make email, phone, URLs, and mixed LTR tokens render correctly inside Arabic.
- Add accessible headings/labels and predictable reading order.

### 5.3 Add all legal screens

Mobile settings for personal host, business host, vendor, moderator/admin must expose the same applicable set:

- Privacy
- Terms
- Community Rules
- Refund/Subscription Policy
- Delete Account/Data Policy
- Support

Unauthenticated signup and native checkout must also expose relevant documents without requiring login.

## 6. Web legal pages

- Add `/[lang]/community-rules`, `/[lang]/support`, and a canonical deletion-policy resource.
- Keep legal pages reachable without login, geoblocking, or PDF-only delivery.
- Add route metadata: localized title/description, self-canonical, reciprocal AR/EN alternates, Open Graph, robots index/follow.
- Use a single approved contact component.
- Ensure print layout and keyboard navigation.
- Add structured breadcrumbs where appropriate.
- Verify no legal page returns a client-only blank state to crawlers.

## 7. Account-deletion implementation audit tasks

Before legal text is finalized, Claude must create a model-by-model matrix for every collection and external processor. At minimum include:

- User and all nested profiles
- RefreshToken and other sessions
- Event including `staffList`, visual templates, branding, location
- Guest and all RSVP/check-in fields
- PostEventContent including cover, media, thumbnails, comments/likes
- Service/vendor portfolio/documents
- Ticket/notifications/preferences/push tokens
- Payment/subscription/business assignments
- Addon/EventEntitlement/RevenueCatEvent
- Report/Block/TermsAcceptance
- AccountDeletionRequest/AuditLog
- discounts/refunds/idempotency rows where user-linked
- S3 objects referenced as keys or full URLs
- RevenueCat customer/attributes, Sentry data, messaging/email/SMS processors

Then:

- mark every collection `delete | anonymize | retain` with fields/reason/duration;
- make PII cleanup mandatory for truthful completion;
- implement retryable background work and admin visibility;
- prevent raw payloads from defeating anonymization;
- preserve only approved pseudonymous billing/audit links;
- handle post-deletion RevenueCat webhooks deterministically rather than dead-lettering forever.

## 8. Visual and functional test matrix

Capture golden screenshots and accessibility checks for:

| Platform | Locale/direction | Sizes |
|---|---|---|
| iOS | Arabic RTL + English LTR | small iPhone, current large iPhone, 13-inch iPad portrait/landscape |
| Android | Arabic RTL + English LTR | compact phone, large phone, tablet |
| Web | Arabic RTL + English LTR | 360, 768, 1280, print |

Test:

- top-bar title centering and back placement
- long titles/paragraphs
- 200% font scale
- VoiceOver/TalkBack order and labels
- keyboard navigation/web focus
- external links/email/phone
- exact document/version parity
- all public URLs return 200 with correct locale/canonical

## 9. Completion gate

- Counsel/owner signs AR/EN content, retention matrix, entity/contact data, and refund/subscription behavior.
- Shared documents are the only source.
- Web/mobile/backend/store URL/version drift tests pass.
- Mobile layout matrix passes with screenshots.
- Every UGC write/read route passes moderation/block tests.
- Throwaway DB/S3 deletion proof finds no non-retained PII.
- Apple App Privacy, Google Data Safety, and public Privacy Policy are cross-reviewed and consistent.
