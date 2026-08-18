# Halaa legal, privacy, consumer-rights, and code-alignment completion plan

**Status:** owner decisions recorded 2026-08-13; counsel status and live publication evidence remain separate gates.  
**Scope:** shared legal package, web, mobile, backend, data lifecycle, billing/refunds, UGC/moderation, support operations, Apple App Privacy, Google Play Data Safety, evidence, and release gates.  
**Execution rule:** complete the phases in order. Engineering may prepare blocked work, but no document may be marked approved and no store submission may occur before the approval gates are signed.

## 1. Outcome

Halaa must have one approved, versioned set of Arabic/English legal facts and documents, and the product must behave exactly as those documents promise. Completion means:

1. The same legal entity, contacts, policies, versions, and URLs appear on web, mobile, backend responses, checkout, reviewer notes, and store listings.
2. Every privacy statement has a corresponding code control, retention/deletion rule, processor obligation, and test.
3. Every refund statement matches the actual web, Apple, Google, RevenueCat, add-on, and fulfillment behavior.
4. Support and moderation promises are measurable in the backend, not merely displayed text.
5. Apple App Privacy and Google Play Data Safety answers are generated from the same approved data inventory as the Privacy Policy.
6. No `BLOCKED_NEEDS_OWNER`, provisional value, stale legal name, conflicting email, unresolved template token, or unapproved effective date reaches a production or store build.

This plan extends the already-implemented foundation in:

- `shared/src/legal/`
- `docs/store-readiness-LEGAL-PARITY-PLAN.md`
- `docs/evidence/store-readiness/LEGAL-PARITY.md`
- `docs/evidence/store-readiness/DELETION-MATRIX.md`
- `docs/store-readiness/store-metadata/data-safety-worksheet.md`

## 2. Existing work to preserve

The following should be used, tested, and extended rather than rebuilt:

| Existing component | Current value | Required completion work |
|---|---|---|
| Shared six-document AR/EN legal package | One source for web/mobile and backend manifest | Replace blocked copy with approved copy; add an operational policy contract and approval evidence |
| Legal manifest and SHA-256 hashes | Prevents document/version drift | Permit approved states, bind approval ID/hash, validate rendered operational values |
| Public AR/EN legal routes | Privacy, Terms, Community Rules, Refund, Deletion, Support | Confirm every route is public, server-rendered, canonical, accessible, and returns 200 in production |
| Mobile legal screens | All six documents available for roles | Native visual/accessibility matrix and mixed-direction testing remain |
| Checkout/signup legal links | Shared routes are linked | Verify every host/business/vendor purchase and signup path exposes the correct policies before action |
| Versioned UGC acceptance | Terms and Community Rules gated on protected writes | Complete guest-portal coverage, material-change reacceptance, and acceptance-evidence retention decision |
| Account deletion pipeline | Retryable DB/S3 deletion with truthful completion | Finalize retention, processors, live IAM proof, 30-day request SLA, and processor completion |
| RevenueCat post-deletion behavior | Deleted accounts terminate cleanly | Verify against real sandbox provider data and approved retention wording |
| Store metadata templates | AR/EN Apple/Google templates and data-safety worksheet | Generate final answers from the approved data inventory and compare to console exports |

## 3. Confirmed facts and remaining owner inputs

### 3.1 Confirmed from the landing page

| Fact | Approved working value | Required action |
|---|---|---|
| English legal entity | `Afaq hala Company For Communications and Information` | Owner confirmed exact official translation |
| Arabic legal entity | `افاق هلا للاتصالات والمعلومات` | Owner confirmed exact Commercial Registration name |
| Support email | `support@halaa.com.sa` | Mark approved and remove `.net` everywhere |
| Support phone/WhatsApp | `+966552619282` | Mark approved; display in localized readable format while preserving a normalized machine value |
| Postal address | `Museum Street, Jeddah, Postal Code 23326, Saudi Arabia` | Owner confirmed registered legal address |
| Postal code | `23326` | Confirmed present |
| Governing law | Kingdom of Saudi Arabia | Owner approved; counsel status unconfirmed |
| Authoritative language | Arabic | Owner approved; counsel status unconfirmed |

### 3.2 Still required from the owner

1. Commercial Registration number only if counsel or a store field requires disclosure.
2. Named privacy contact or DPO contact only if different from `support@halaa.com.sa`.
3. Adult-only versus minor/guardian account rule and the truthful store questionnaire responses.
4. Final processor list and confirmation of applicable contracts/data-processing terms.

Recorded decisions: no support hours, working-day calendar, public-holiday schedule, or numeric SLA will be published. The owner approved the refund rules, six-year/two-year retention schedule, Saudi governing-law/court clause, Arabic-authoritative clause, and effective date of 13 August 2026. Counsel status remains unconfirmed.

## 4. Recommended service commitments

These are non-published operational examples, not user-facing commitments or statutory conclusions. The owner decided not to publish working hours or numeric SLAs.

| Work type | Acknowledgement/triage target | Resolution/decision target | Clock |
|---|---:|---:|---|
| General support | 1 business day | First meaningful response within 2 business days | Published support hours, `Asia/Riyadh` |
| Billing/refund request | 1 business day | Eligibility decision within 5 business days | Provider settlement time disclosed separately |
| Urgent safety/illegal-content report | 4 hours | Immediate restriction when credible risk exists; final outcome as investigation permits | 24/7 urgent intake only if operationally staffed |
| Standard moderation report | 1 business day | 3 business days | Published support hours |
| Moderation appeal | 2 business days | 5 business days | Published support hours |
| Privacy/data-subject request | 1 business day | No more than 30 calendar days | An additional 30 days only when permitted and notified with reasons |
| Account deletion | Immediate request receipt and session revocation | All in-scope personal data/processor obligations completed within 30 calendar days | Status remains pending until mandatory work finishes |

Implementation requirements:

- Add due-at, first-response-at, resolved-at, paused-at, pause-reason, priority, and breach-status fields to the existing Ticket/Report workflow or a shared SLA record.
- Calculate deadlines from a single timezone/calendar configuration.
- Create staff queues for approaching and breached SLAs.
- Notify the requester when a deadline is extended or provider settlement remains pending.
- Add metrics for acknowledgement, first response, resolution, reopen rate, moderation appeal outcome, and deletion completion.
- Never advertise 24/7 urgent moderation unless an on-call process exists and is tested.

## 5. Proposed data-retention and legal-basis contract

### 5.1 Important current mismatch

`halaa-backend/src/shared/constants/dataRetention.js` currently declares:

- payments: 10 years;
- subscriptions: 10 years;
- audit logs: 7 years;
- business-plan assignments: 10 years.

The public recommendation discussed with the owner is six years for tax/accounting records and two years for security/anti-fraud logs. The backend values are also primarily disclosure/configuration data; a comprehensive scheduled purge/anonymization mechanism is not yet proven. This mismatch is a release blocker.

### 5.2 Proposed schedule for counsel approval

| Data family | Purpose and proposed legal basis | Proposed retention trigger/period | Required code behavior |
|---|---|---|---|
| Active account/profile | Perform the user contract | Until deletion or account termination | Delete/anonymize through the deletion pipeline |
| Event, guest, RSVP, staff, location | Perform the event-management contract | While the event/account requires it, followed by a documented short cleanup window | Scheduled anonymization/deletion plus owner deletion |
| Abandoned incomplete request | Service administration/legitimate interest | 3 months from last activity | Add a tested cleanup job; the policy already promises this |
| Photos, videos, documents, UGC | Contract and user-directed publishing; consent where counsel requires it | Until owner deletion, content deletion, or defined post-event expiry | DB and S3 delete, including derivatives/thumbnails |
| Payments, invoices, accounting records | Legal obligation | Minimum 6 years from the end of the relevant tax period, or longer only when another documented obligation applies | Pseudonymize non-required identifiers; purge after legal hold/period ends |
| Subscription and refund/chargeback evidence | Contract/legal obligation/defence of claims | Align to the accounting period or documented chargeback limitation | Retain the minimum transaction evidence; remove free-text PII |
| Security, abuse and fraud logs | Legitimate interest, supported by a documented assessment | Proposed 2 years; longer only for an active case/legal hold | Enforced TTL/purge; restrict access; preserve case-linked holds |
| Notifications | Contract/legitimate interest | Current 90-day TTL unless a shorter approved period is selected | Keep and test TTL index |
| OTP and temporary authentication data | Security/contract | Existing short TTL only | Verify TTL and no raw OTP retention |
| Support tickets | Contract/legitimate interest/legal claims | Counsel-approved period measured from closure | Redact attachments/free text and purge on schedule |
| Consent and policy-acceptance evidence | Legal obligation/accountability | Counsel-approved period measured from withdrawal/account closure | Retain minimum proof where required; remove raw IP/user agent if unnecessary |
| Account-deletion request proof | Legal obligation/accountability | Counsel-approved period from completion | Store request/status/hash only, without restorable PII |
| Backups | Security/business continuity | 30–90-day rotation | Document restore-time re-deletion and processor rotation |
| Marketing preferences | Consent | Until withdrawal plus minimal suppression evidence | Separate marketing consent and immediate opt-out enforcement |

Official baseline used for counsel review:

- Saudi PDPL requires destruction without undue delay when data is no longer necessary, subject to permitted/required retention: <https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf>
- Data-subject requests are generally acted on within 30 days, with a permitted additional 30 days when the conditions and notice requirements are met: <https://sdaia.gov.sa/en/SDAIA/about/Documents/ImplementingRegulation.pdf>
- ZATCA VAT records are generally retained for at least six years from the end of the relevant tax period: <https://zatca.gov.sa/en/RulesRegulations/Taxes/Documents/Implmenting%20Regulations%20of%20the%20VAT%20Law_EN.pdf>

### 5.3 Required code changes

1. Add `shared/src/legal/operations.json` as the machine-readable operational policy contract containing:
   - legal identity/contact facts;
   - support/moderation/privacy SLAs;
   - retention rules with trigger, duration, legal basis, legal-hold behavior, purge action, and user-facing summary;
   - refund rules by product type/provider/fulfillment state;
   - processor register and deletion behavior;
   - approval ID, approver roles, approval date, effective date, and content hash.
2. Generate backend policy/retention artifacts from this shared contract. Do not maintain durations separately in `dataRetention.js`.
3. Replace the manual `RETENTION_MATRIX_FINALIZED=true` assertion with verification of an approved operations-document hash. Production readiness must fail closed if the hash is missing or stale.
4. Add an idempotent, leased retention worker with dry-run/report mode, bounded batches, legal-hold exclusion, audit events, and retry/dead-letter visibility.
5. Add indexes needed to find expired records without collection scans.
6. Add integration tests proving records are retained before their deadline, purged/anonymized after it, excluded during legal hold, and safe across repeated runs.
7. Add a restore test proving data deleted in production is re-deleted if restored from a backup.

## 6. Canonical document completion

Retain the six existing documents:

1. Privacy Policy
2. Terms and Conditions
3. Community Rules
4. Cancellation, Subscription, and Refund Policy
5. Account and Data Deletion Policy
6. Support and Contact Policy

For every Arabic and English document:

- use the approved entity/contact facts;
- use one synchronized semantic version and effective date;
- retain Arabic as authoritative but require faithful professional English translation;
- include the approval record and operations-contract hash;
- ensure AR/EN section IDs remain parallel;
- remove stale `Halaa Digital Technology Establishment`, `support@halaa.net`, conflicting dates, and all `BLOCKED_NEEDS_OWNER` text from production artifacts;
- show a concise change summary and material/non-material classification;
- preserve historical versions needed to prove what a user accepted.

The verifier now requires the recorded `ownerApproval === OWNER_APPROVED` state and synchronized effective dates. A later hardening phase may extend this to the full state machine:

`DRAFT -> OWNER_APPROVED -> COUNSEL_APPROVED -> PUBLISHED -> SUPERSEDED`

CI must reject an illegal transition, a missing approval reference, a future/unpublished version selected as current, or a production build whose active document is not `PUBLISHED`.

## 7. Privacy-policy-to-code alignment

Create a policy-to-code contract with one row for every data family and every claim. At minimum:

| Privacy claim/data family | Collection/source | Purpose/basis | Processor/recipient | Deletion/retention implementation | Proof |
|---|---|---|---|---|---|
| Account identity/contact/profile | Signup/profile APIs and User model | Contract | MongoDB/AWS/support providers as applicable | Account deletion + retention worker | Integration test and DB diff |
| Business/vendor verification | Vendor/business onboarding and uploaded documents | Contract/legal obligation | Storage and verification staff/processors | S3/DB deletion or approved retained fields | File-key inventory and deletion test |
| Event/guest/RSVP/staff/location | Event and guest workflows | Contract | Messaging/maps providers where invoked | Event/account lifecycle cleanup | Model and processor test |
| Contacts permission | OS-selected contacts only | User action/permission; counsel assigns legal basis | Device OS; backend only receives selected data | Do not upload address book wholesale; delete selected guest data with event/account | Permission and network inspection |
| Photos/videos/documents/UGC | Upload/post-event flows | Contract/user direction/consent where needed | S3, moderation, diagnostics | Delete DB rows, objects, thumbnails, comment media | S3 integration proof |
| Purchases/subscriptions | Moyasar, Apple, Google, RevenueCat | Contract/legal obligation | Payment/store providers | Pseudonymous retention and refund/revocation rules | Sandbox event/DB proof |
| Diagnostics/crash data | Sentry and application logs | Legitimate interest with assessment | Sentry/log infrastructure | Scrub at ingest, processor retention, deletion obligation | Config export and sample-event inspection |
| Push tokens/messages | Expo/APNs/FCM and messaging providers | Contract/legitimate interest | Push/messaging processors | Token removal and provider obligation | Device/logout/deletion tests |
| Reports/blocks/moderation | UGC safety tools | Legitimate interest/legal obligation | Authorized moderation staff | Case retention/legal hold and eventual purge | Authorization and retention tests |
| Support tickets | Support UI/email/WhatsApp | Contract/legitimate interest | Support staff and communication providers | Approved ticket retention/redaction | SLA and purge tests |

Required engineering controls:

- Inventory model fields, API payloads, mobile permissions, SDKs, cookies/storage, telemetry, logs, file uploads, exports, and external network destinations.
- Classify required/optional, linked/not linked, tracking/not tracking, sensitive/not sensitive, collection source, country/transfer mechanism, and access role.
- Add privacy-safe structured logging rules and tests that reject passwords, tokens, receipts, raw provider payloads, full contact lists, or excessive PII.
- Add a data-export/access-request workflow that returns the verified user's data in a readable format.
- Ensure correction requests use existing profile controls or a tracked support/privacy request.
- Add consent withdrawal/marketing opt-out enforcement. Do not use a generic privacy checkbox as consent for unrelated purposes.
- Maintain a legitimate-interest assessment for security/fraud processing and do not use legitimate interest for sensitive data without counsel confirmation.
- Add a processor register covering at least MongoDB Atlas, AWS/S3, Moyasar, Apple, Google, RevenueCat, Expo/APNs/FCM, Sentry, Maps, Meta/WhatsApp, Taqnyat, and email/SMS services actually enabled.

## 8. Deletion and data-subject rights

Preserve the existing retryable deletion state machine and complete these items:

1. Public and in-app deletion must display the canonical Deletion Policy, not a second manually maintained policy summary.
2. Re-authenticate destructive requests; invalidate sessions immediately.
3. Keep `completed` impossible while personal DB/S3 data or mandatory processor work remains.
4. Prove live production-like IAM can delete every supported S3 key shape.
5. Expand processor obligations from the current partial list to the approved full processor register.
6. Define processor states (`pending`, `completed`, `retained_by_policy`, `failed`, `manual_review`) and staff escalation.
7. Warn that deleting a Halaa account does not itself cancel an Apple/Google subscription; provide store-management links.
8. Provide unguessable status lookup, email confirmation without sensitive content, and a 30-day deadline/extension mechanism.
9. Add authenticated privacy-request endpoints/workflows for access/export, correction, deletion, objection/restriction where applicable, and consent withdrawal.
10. Decide whether TermsAcceptance proof is deleted or minimally retained. The current deletion service deletes it because it contains IP data; counsel must decide the accountable minimum and the code must follow that exact choice.

## 9. Refund and consumer-rights alignment

### 9.1 Required policy model

Represent refund rules by:

- payment provider (`moyasar`, `apple`, `google`);
- product type (subscription, event package, extra invitations, managed design, business customization);
- fulfillment state;
- invitations sent/credits consumed/design work started;
- purchase date/event date;
- provider refund state and entitlement reversal;
- statutory override and exceptional/manual-review reason.

### 9.2 Wording that must be reconciled

The current 72-hour event rule should be described as Halaa's service-specific/voluntary rule only after counsel checks it against Saudi consumer rights. Official Ministry of Commerce guidance states that electronically supplied services are covered by the E-Commerce Law, describes a seven-day right where the service has not been used or benefited from, identifies exceptions including custom-made products/services, and describes cancellation for delivery/performance delays over 15 days: <https://mc.gov.sa/ar/mediacenter/News/Pages/10-07-19-01.aspx>

The final policy must therefore distinguish:

- any non-waivable statutory cancellation/refund right;
- Halaa's additional no-use/no-send, at-least-72-hours-before-event promise;
- custom/personalized service exceptions;
- defective, materially misdescribed, unavailable, duplicated, or delayed services;
- Apple/Google store refund administration without suggesting that platform rules remove mandatory local rights;
- subscription cancellation versus refund;
- entitlement revocation after a successful refund/reversal;
- refund decision time versus bank/store settlement time.

### 9.3 Required code/tests

- Remove or rewrite the landing FAQ statement that all prepaid amounts are non-refundable.
- Ensure web and mobile show the same refund disclosure before purchase.
- Make backend refund eligibility derive from the operational policy contract.
- Add exact tests for every product/provider/fulfillment combination, including partial use, duplicate events, out-of-order provider notifications, refund reversal, deletion during refund, and manual review.
- Verify support staff cannot grant or revoke more value than the exact transaction/entitlement lineage permits.
- Record the policy version used for the purchase/refund decision.

## 10. Terms, minors, consent, and UGC

- Replace the current entity name and blanket two-year retention statement in Terms.
- Make the age/guardian clause consistent with the actual signup fields, age gate, guardian process, privacy handling, and Apple/Google age rating. Do not leave a textual age rule that the product cannot enforce.
- Separate acceptance of Terms/Community Rules from privacy notice acknowledgement and from optional consent.
- Require current Terms and Community Rules on every host, business, vendor, admin/moderator, and guest UGC write route.
- Complete the known guest-portal acceptance disclosure gap.
- Store policy type, version, content hash, locale, actor, time, method/surface, and only the minimum approved evidence.
- Re-prompt only for material changes, with a change summary.
- Provide report, block, appeal, emergency/escalation, repeat-offender, and staff-audit behavior matching Community Rules.
- Test authorization, blocked interactions, suspended/removed content, appeals, and SLA deadlines.

## 11. Web and mobile accessibility and discoverability

### Web

- All six legal resources must be reachable without authentication, app installation, geoblocking, JavaScript-only rendering, or a PDF-only workflow.
- Footer, signup, login, checkout, account settings, deletion, report, and support surfaces must expose the applicable links.
- Add localized title/description, canonical URL, reciprocal `hreflang`, Open Graph, robots index/follow, and accessible breadcrumbs.
- Verify keyboard navigation, visible focus, heading order, link purpose, color contrast, zoom to 200%, print layout, and screen-reader reading order.
- Ensure `/[lang]/delete-account` clearly separates the policy content from the destructive authenticated workflow while using the same canonical source.

### Mobile

- Preserve the shared legal screens and correct TopBar/RTL foundation.
- Verify Arabic RTL and English LTR on small/large iPhone, iPad portrait/landscape, compact/large Android phone, and Android tablet.
- Test Dynamic Type/font scale up to 200%, VoiceOver/TalkBack, 44x44 minimum touch targets, title centering, rotation, safe areas, mixed Arabic/English emails/numbers/URLs, and external-link failure states.
- Legal documents must be reachable for personal hosts, business hosts, vendors, admins/moderators, unauthenticated signup, native checkout, UGC acceptance, deletion, and support.
- Capture approved AR/EN screenshots from signed native builds; local Expo web screenshots are development evidence only.

## 12. Store privacy and listing alignment

Generate the following from the approved inventory/operations contract:

- Apple App Privacy answers;
- Google Play Data Safety answers;
- privacy-policy and deletion URLs;
- reviewer data-access/deletion instructions;
- support contact and SLA statements;
- age rating/minors statements;
- subscription and refund disclosures.

Zero-drift checks must compare repository expectations to App Store Connect and Play Console exports. A release fails if a collected data type, purpose, linkage/tracking classification, processor, permission, SDK, or deletion statement differs.

## 13. Implementation phases and order

### Phase 0 — Owner facts and provisional legal decisions

1. Record the exact Arabic/English CR names, CR number if applicable, registered address, contacts, the decision not to publish support hours/SLAs, and privacy contact.
2. Owner accepts/edits refund exceptions, minor policy, and proposed retention matrix.
3. Saudi counsel reviews the statutory basis, retention, refunds, jurisdiction, and authoritative-language clauses.
4. Create a signed decision record with IDs; do not edit production policy text anonymously.

**Exit:** `LEGAL_FACTS_SIGNED_FOR_IMPLEMENTATION`.

### Phase 1 — Canonical operational contract and documents

1. Add the machine-readable operational policy contract.
2. Update six AR/EN documents using approved facts and professionally reviewed translation.
3. Replace provisional contact handling and stale terms/privacy copy.
4. Upgrade the legal manifest, approval state machine, historical-version storage, generated backend artifact, and CI gates.
5. Regenerate evidence and verify all public routes.

**Exit:** `LEGAL_CONTENT_AND_CONTRACT_UNIT_VERIFIED`.

### Phase 2 — Backend privacy lifecycle

1. Implement/enforce the retention schedule, legal holds, dry run, metrics, retries, and purge evidence.
2. Complete privacy access/export/correction/withdrawal request workflows.
3. Complete processor erasure tracking and live S3 IAM proof.
4. Implement support/moderation SLA fields, queues, alerts, and reports.
5. Complete UGC acceptance coverage and acceptance-evidence retention.

**Exit:** `PRIVACY_LIFECYCLE_INTEGRATION_VERIFIED`.

### Phase 3 — Refund/billing and surface alignment

1. Implement the shared refund decision table and align backend fulfillment/reversal behavior.
2. Fix landing FAQ and every purchase disclosure.
3. Wire canonical policies to all web/mobile roles and unauthenticated surfaces.
4. Complete web/mobile accessibility, RTL/LTR, SEO, and signed-device visual testing.

**Exit:** `LEGAL_SURFACES_AND_REFUNDS_VERIFIED`.

### Phase 4 — Store disclosure and independent approval

1. Generate and fill Apple App Privacy/Google Data Safety/store copy.
2. Export console values and run zero drift.
3. Run sandbox purchase/refund/deletion/restore tests.
4. A second person independently reviews documents, code evidence, screenshots, data-safety answers, and console exports.
5. Owner gives explicit submission approval.

**Exit:** `READY_FOR_OWNER_SUBMISSION_APPROVAL`.

## 14. Required tests and evidence

### Automated gates

- Shared legal schema, AR/EN parity, approval-state, contact, SLA, retention, refund, URL, and unresolved-token checks.
- Backend legal-manifest drift and production-readiness tests.
- Retention-worker integration tests using an isolated replica set and fake clock.
- Deletion DB/S3/processor integration tests, including retry and legal hold.
- Privacy export/correction/withdrawal authorization tests.
- Support/moderation SLA calculation and breach tests.
- Refund decision-table and provider-event integration tests.
- Web route/link/metadata/accessibility tests.
- Mobile policy-surface, direction, accessibility-label, and purchase-link tests.
- Data inventory versus Apple/Google worksheet drift test.

### Standard commands

Run on the final tree:

```text
shared:  node scripts/verify-legal.mjs
backend: npm test
backend: npm run legal:verify
backend: npm run catalog:verify
web:     npm test
web:     npm run lint
web:     npm run build
mobile:  npm test
mobile:  npm run lint
mobile:  npx expo-doctor
mobile:  signed iOS/Android build and device QA
```

### Evidence artifacts

Create/update:

- `docs/store-readiness-LEGAL-DECISION-RECORD.md`
- `docs/evidence/store-readiness/LEGAL-POLICY-TO-CODE-MATRIX.md`
- `docs/evidence/store-readiness/DATA-INVENTORY-AND-PROCESSORS.md`
- `docs/evidence/store-readiness/RETENTION-ENFORCEMENT.md`
- `docs/evidence/store-readiness/PRIVACY-RIGHTS-QA.md`
- `docs/evidence/store-readiness/REFUND-CONTRACT-QA.md`
- `docs/evidence/store-readiness/LEGAL-ACCESSIBILITY-SCREENSHOTS.md`
- `docs/evidence/store-readiness/STORE-PRIVACY-ZERO-DRIFT.md`
- `docs/evidence/store-readiness/LEGAL-INDEPENDENT-REVIEW.md`
- update `docs/store-readiness-CORRECTIVE-STATUS.md`

All evidence must be secret-free and identify environment, build/version, policy hash, test command, result, date, and reviewer.

## 15. Final release blockers

Do not mark legal/privacy work complete while any of these remain:

- entity/address/contact mismatch anywhere;
- `BLOCKED_NEEDS_OWNER` or provisional values in a production artifact;
- unapproved/future/null effective date;
- AR/EN version or substantive mismatch;
- Terms still promise a blanket two-year maximum while code retains longer;
- backend retention values differ from the signed matrix or are not enforced;
- abandoned-request three-month deletion is not implemented;
- privacy rights cannot be exercised and tracked;
- processor deletion/retention list is incomplete;
- landing/purchase/refund wording conflicts;
- the 72-hour refund rule has not been reviewed against Saudi e-commerce rights;
- legal links are missing or inaccessible for any user type;
- deletion can say completed with personal data/mandatory processor work outstanding;
- App Privacy/Data Safety differs from code or the Privacy Policy;
- signed-device AR/EN accessibility evidence is missing;
- second-person review or explicit owner submission approval is missing.

## 16. Definition of done

The work is complete only when the approved Arabic/English documents, operational policy contract, backend behavior, web/mobile surfaces, provider disclosures, retention/deletion evidence, refund behavior, and console exports all match the same version/hash; every automated and signed-device gate passes; Saudi counsel and the owner sign the decision record; and the independent reviewer records no unresolved submission blocker.
