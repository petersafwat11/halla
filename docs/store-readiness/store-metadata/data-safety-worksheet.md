# App privacy / Data Safety answer worksheet (ASO-01)

**Session:** 6 · **Date:** 2026-07-02 · **Gate:** `OWNER_AND_COUNSEL_REQUIRED`

This worksheet feeds BOTH the Apple **App Privacy** questionnaire and the Google
Play **Data Safety** form. Per the LEGAL-PARITY-PLAN §3.1, these answers and the
public Privacy Policy MUST be generated from the **same signed data inventory**
and reviewed together. The data families below are taken from the shipped privacy
document (`shared/src/legal/documents/privacy.json`) and the verified
implementation (Session-4 deletion matrix, `evidence/store-readiness/DELETION-MATRIX.md`).

**Status legend:** `FACT` = observable in code/infra (safe to state). `BLOCKED`
= legal-basis / retention-duration / third-party-declaration wording requires
counsel (Session-5 blocked). Nothing here is a final submission — counsel signs
the exact declarations.

> **Critical accuracy rule (both stores):** do NOT declare "no data collected."
> The app collects account, event, guest, contact-selection, media, purchase,
> and diagnostic data. Do NOT claim data is used for advertising/tracking unless
> that is actually true — **no ad/tracking SDK is present** (FACT), so the
> "used for tracking" / "data linked to advertising ID" answers should be **No**
> unless an owner-approved analytics SDK is added later (§6 gate).

## Data types collected (from the privacy inventory)

| Data type | Collected | Purpose (FACT) | Linked to identity | Used for tracking/ads | Retention/legal-basis |
|---|---|---|---|---|---|
| Name | Yes | Account/app functionality | Yes | No | BLOCKED (duration) |
| Email address | Yes | Account, auth, support | Yes | No | BLOCKED |
| Phone number | Yes | Account, invitations, WhatsApp send | Yes | No | BLOCKED |
| Physical address / event location | Yes | Event functionality (map/venue) | Yes | No | BLOCKED |
| Approximate location | Yes (opt-in) | Pick event location on map (COARSE only; FINE blocked in app.json) | Yes | No | BLOCKED |
| Contacts | Yes (opt-in) | User selects guests; **phonebook not uploaded** (permission string) | Yes | No | BLOCKED |
| Photos/videos | Yes (opt-in) | Event/profile/service images + post-event media | Yes | No | BLOCKED |
| Other user content (UGC) | Yes | Events, invitations, comments, vendor listings | Yes | No | BLOCKED |
| Guest / RSVP / check-in data | Yes | Attendance management | Yes | No | BLOCKED |
| Purchase history | Yes | Subscriptions/packages/add-ons (web Moyasar; Apple/Google/RevenueCat native) | Yes | No | BLOCKED |
| Business/vendor verification docs | Yes | Vendor approval (private; never public — `PUBLIC_VENDOR_SELECT` excludes) | Yes | No | BLOCKED |
| Device identifiers / push token | Yes | Push notifications (Expo/APNs/FCM) | Yes | No | BLOCKED |
| Crash logs / diagnostics | Yes | Stability (Sentry) | Maybe | No | BLOCKED |
| IP address / app-interaction logs | Yes | Security, fraud/abuse prevention | Maybe | No | BLOCKED |

## Third parties / processors (declare as data sharing where applicable)

FACT that these processors are used (from privacy inventory + code): AWS/S3,
MongoDB Atlas, Moyasar (web payments), Apple/Google/RevenueCat (native
purchases), Sentry (crash), Expo/APNs/FCM (push), Google Maps, Meta/WhatsApp
message channel, Taqnyat/SMS + email providers. **Whether each is "sharing" vs a
"service provider/processor" is a legal characterization — BLOCKED (counsel).**

## Security / practices (FACT where implemented)

- Data encrypted in transit (HTTPS): **Yes** (FACT).
- Users can request deletion: **Yes** — in-app + public deletion-policy resource
  (`/[lang]/delete-account`), retryable truthful pipeline (Session 4, FACT).
- Account deletion behavior: retained-by-policy items = RevenueCat purchase
  lineage (DEC-04); everything else deleted/anonymized per DELETION-MATRIX.md.
  Exact retained fields/durations = **BLOCKED** (`RETENTION_MATRIX_FINALIZED` is
  still `false`).
- Data-deletion URL for the Play form: `https://halaa.com.sa/<lang>/delete-account` (FACT).

## Apple App Privacy specifics

- **Tracking (ATT):** No tracking across apps/websites; no ad SDK → **"Data Not
  Used to Track You."** (FACT — verify no analytics SDK added before submit.)
- **Data linked / not linked:** most account/event/purchase data is *linked* to
  identity; diagnostics *may* be not-linked — counsel/owner confirm the exact
  mapping.

## Age rating / content

- No user-generated public social feed beyond event/vendor context; UGC is
  moderated + gated (Session 4 UGC-02/03). Report/block controls exist (FACT).
- Exact age-rating questionnaire answers (violence, sexual content, etc.) =
  **BLOCKED** (owner) — but the app has no such content by design; default to the
  lowest applicable rating pending owner confirmation.

## Explicitly BLOCKED_NEEDS_OWNER (do not answer before sign-off)

1. Legal basis per data family (Session-5 blocked).
2. Retention durations per data family (`RETENTION_MATRIX_FINALIZED=false`).
3. Processor "sharing vs processor" legal characterization for each third party.
4. Final age-rating questionnaire answers.
5. Whether any future analytics/measurement SDK will be added (§6 privacy gate) —
   if added, this worksheet + the privacy policy + the store forms must all be
   updated together before that SDK ships.
