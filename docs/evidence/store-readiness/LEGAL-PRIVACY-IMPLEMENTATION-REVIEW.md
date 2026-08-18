# Halaa legal and privacy implementation review

**Reviewed:** 2026-08-13  
**Engineering status:** `CODE_VERIFIED_OWNER_APPROVED_COUNSEL_STATUS_UNCONFIRMED`  
**Excluded at owner request:** signed iOS/Android build testing and independent pre-submission review.

## 1. What “the six AR/EN legal documents” means

Halaa has six shared policies, each with Arabic and English content generated from one source and rendered by web and mobile:

| Document | Purpose | Public route |
|---|---|---|
| Terms and Conditions | Account, service, purchasing, conduct, governing-law contract | `/ar/terms`, `/en/terms` |
| Privacy Policy | Data collected, purposes, sharing, rights, retention and deletion | `/ar/privacy`, `/en/privacy` |
| Cancellation, Subscription & Refund Policy | Subscription, event-package, add-on and managed-service refund rules | `/ar/refund`, `/en/refund` |
| Community Rules | User-generated content, reports, blocking and moderation | `/ar/community-rules`, `/en/community-rules` |
| Support Policy | Support channels, scope, escalation and response wording | `/ar/support`, `/en/support` |
| Account Deletion Policy | In-app/public deletion paths, effects, exceptions and retries | `/ar/delete-account`, `/en/delete-account` |

All six sources use version and effective date `2026-08-13`, have AR/EN parity, use the owner-confirmed legal identity, `support@halaa.com.sa` and `+966552619282`, and feed the backend hash/version manifest. Each now records `OWNER_APPROVED`.

## 2. Implemented alignment

### Legal facts and policy copy

- Working English entity: `Afaq hala Company For Communications and Information`.
- Support email and phone are owner-approved; `.net` and the old entity were rejected by the legal verifier.
- The landing refund FAQ now says cancellation stops renewal, access continues through the paid period, and no automatic prorated refund is created.
- Terms and Refund Policy now use the same product rules:
  - subscriptions: cancellation stops the next renewal; no automatic prorated refund;
  - event packages and extra invitations: consumed value is not refundable; unused value may be reversed when approved and technically possible;
  - custom design/business customization: completed work or provisioning already begun is not refundable; no-start, failed fulfillment, duplicate charge and verified technical error receive manual review;
  - Apple/Google decide store-purchase refunds under their policies; mandatory legal rights remain unaffected.

### Privacy and retention

The Privacy Policy was reconciled against web, mobile and backend behavior. It covers account/contact data, vendor verification and identity documents, guest/RSVP/dietary data, events/location, locally selected contacts, uploads/content, purchases, push identifiers, diagnostics, IP/user-agent and interactions. It identifies the actual processor categories, including AWS/S3, MongoDB, Moyasar, Apple/Google/RevenueCat, Expo/APNs/FCM, Sentry, maps, Taqnyat/email/SMS and Meta/WhatsApp. It does not claim advertising tracking, full address-book upload, full payment-card storage, or a universal three-month deletion timer that the code does not provide.

The working engineering retention schedule is:

| Record | Working period |
|---|---:|
| Tax, payments, subscriptions and business plan assignments | 6 years |
| Security, fraud and operational audit logs | 2 years |
| Active service data | While needed to provide the service |
| Account data after deletion | Deleted/anonymized subject to stated legal exceptions and processor completion |

These constants and disclosures now agree through a generated, hash-stamped privacy-operations contract. The backend now has guarded dry-run/execute modes, bounded batches, durable run evidence, collection/document/subject legal holds, a daily opt-in scheduler, and integration tests for idempotence and deleted-account billing records. A development dry-run completed on 2026-08-15 with policy hash `28b061780f1e0162a38080ab919acb2ec1490b68168c60934924a8cfd7f9ccfd` and zero eligible existing rows. Production scheduling remains deliberately disabled until deployment review.

### Access surfaces

| Surface | Legal access now present |
|---|---|
| Landing footer | Six policies, including account deletion |
| Authentication pages | Terms, Privacy, Community Rules and Support |
| Host checkout | Terms, Privacy, Refund and Support |
| Business checkout | Terms, Privacy, Refund and Support |
| Web/mobile UGC composer | Terms and Community Rules |
| Mobile settings/legal screens | All six shared documents |
| Store metadata templates | Public support, privacy and deletion URLs in AR/EN |

### Account deletion

The mobile settings flow and public web page call the same authenticated backend deletion pipeline. Integration coverage proves session invalidation, database and S3 cleanup, idempotency, truthful `pending_retry`, convergence after transient failure, terminal `failed` after exhausted cleanup, and RevenueCat tombstone behavior. The deeper audit also added password/reset-secret removal, local outbound-message deletion, retained billing-record privacy timestamps, and free-text scrubbing for payments, business assignments, RevenueCat events and audit logs. A synthetic development canary passed on 2026-08-15 (`9d7fd15f-2010-49e5-94a6-b0cca80c6795`). Production-like AWS deletion and deployed public URLs still require live smoke tests.

### UGC safety

Reporting, blocking, host moderation and staff actions exist. Hidden/removed content and suspended vendors are excluded from public reads. Web and mobile vendor profiles now provide both Report and Block. Authenticated marketplace reads apply the viewer's block list to vendor listings, vendor profiles, service listings and service profiles. Vendor service text is checked before publication. The remaining release action is to enable `UGC_TERMS_ENFORCED=true` only after compatible clients are the supported minimum.

### Store privacy declarations

`docs/store-readiness/store-metadata/data-safety-worksheet.md` is the code-audited source for Apple App Privacy and Google Data Safety console answers. It classifies collected data, purpose, linkage, requirement level, processor and tracking status. The console forms themselves cannot be completed or exported from repository code; the owner must provide authenticated App Store Connect and Play Console sessions and confirm the remaining account-level answers before entry.

## 3. Still required before publication

### Owner decisions

No further owner decision is open for this block. The general-audience, not-child-directed classification is owner-approved. Processor account/contract details are maintained as a non-blocking compliance register and are not a prerequisite for completing repository engineering or opening the store records.

### Saudi counsel

1. Approve the legal entity presentation, Saudi governing-law/court clause and Arabic-authoritative clause.
2. Approve the refund exceptions, retention/legal-basis matrix and data-rights wording.
3. Confirm the owner-approved effective date and final hashes for publication.

### Live/external verification

1. Deploy and verify every AR/EN public legal URL without authentication.
2. Prove production-like S3 deletion permission and processor follow-up handling.
3. Enter the approved privacy answers into Apple and Google, export both console states and compare them to the worksheet.
4. Enable the UGC enforcement flag after rollout.
5. Perform the signed-build tests and independent review reserved by the owner.

No legal document or store declaration should be marked final merely because the code tests pass; publication requires the owner/counsel decisions and live console evidence above.
