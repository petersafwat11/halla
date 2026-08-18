# Halaa Data Protection Impact Assessment

**Version:** 2026-08-15 draft  
**Engineering status:** `COMPLETE_FOR_OWNER_DPO_LEGAL_REVIEW`  
**Policy hash:** see generated privacy operations manifest

## Processing and necessity

Halaa manages events, invitations, guests/RSVP, attendance, vendors, purchases, user content, support and safety reports. Account/contact data is necessary to authenticate users and deliver the service. Guest contact and RSVP data is necessary to send user-directed invitations and manage attendance. Location supports event/vendor discovery. Purchase records support fulfillment, refunds, tax and fraud controls. Diagnostics support reliability and security.

Data minimization controls include OS-mediated contact selection rather than bulk address-book upload, no advertising tracking, no storage of complete payment card/CVV data, allowlisted public vendor DTOs, scoped permissions, pseudonymized retained billing records, and account deletion.

## Higher-risk data and people

- Vendor verification may contain official identity documents.
- Dietary information may reveal health-related or sensitive preferences.
- Event/guest content may include children or people without accounts.
- Location, phone numbers, media and UGC can expose individuals if access controls fail.
- Payment, refund and fraud records can materially affect users.
- Cross-border processors may receive limited operational data.

## Risk assessment

| Risk | Inherent | Controls | Residual | Required follow-up |
|---|---:|---|---:|---|
| Unauthorized account/event access | High | Authentication, RBAC, token revocation, tenant checks, tests | Medium | Production access-log and role review |
| Excessive exposure through public marketplace/UGC | High | Public DTO allowlists, report/block, suspension, content filtering | Medium | Enable UGC enforcement after compatible-client rollout |
| Uploaded identity/media leakage | High | Private S3 paths/signing, type checks, deletion inventory | Medium | Verify bucket policy, encryption, version lifecycle and IAM |
| Diagnostic PII leakage | High | Sentry default PII off; event/trace/breadcrumb scrubbers | Low–Medium | Confirm Sentry server-side settings with synthetic event |
| Data retained too long | High | Generated schedule, dry-run worker, legal holds, bounded purge and evidence | Medium | Deploy, review dry run, execute and verify backup lifecycle |
| Deletion falsely reported complete | High | Durable state machine, residual S3 checks, retries, processor obligations | Low–Medium | Run development canary and external processor checks |
| Child/incapable-person data without valid authority | Medium–High | Not child-directed; organizer/guardian context; legal-capacity wording proposed | Medium | Owner selects audience response; legal review of guardian wording |
| Processor/cross-border mismatch | High | Processor register and store worksheet | Medium–High | Confirm regions, DPAs, transfers and account settings |
| Billing/refund inconsistency | High | Canonical catalog, exact fulfillment ledger, refund rules/tests | Low–Medium | Store sandbox and console verification |

## Retention and deletion

The owner-approved rules retain terminal payments, subscriptions and business assignments for six years and security/audit logs for two years. The worker excludes active/non-terminal records, applies active legal holds, defaults to dry run, requires explicit execution confirmation, limits every batch and preserves durable run results. Account deletion separately anonymizes/deletes active personal data and records processor obligations.

Open operational evidence: first reviewed dry-run output, first execution output against synthetic expired records, AWS/S3 canary, processor completion, backup rotation and isolated restore/re-deletion proof.

## Decision

Engineering controls reduce the identified risks but release privacy status remains `NO_GO` until processor/account facts, store declarations, retention/deletion deployment evidence and qualified review are attached. The assessment must be revisited when adding children-directed features, advertising, new sensitive-data use, a processor/region change, or materially different AI/profiling.

Approvals:

- Owner: pending dated signature
- Privacy/DPO reviewer: pending
- Saudi legal reviewer: status unconfirmed
