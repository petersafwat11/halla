# Privacy operations contract (generated)

Generated from `shared/src/legal/operations.json`. Do not edit by hand.

- Policy version: `2026-08-13`
- Owner approval: `OWNER_APPROVED`
- Counsel status: `UNCONFIRMED`
- Policy hash: `ccf3ce9891df5d6575a614ece96ba39eb199524525ef94b7616635f8a40e5864`

| Rule | Collection | Trigger | Duration | Action | Legal basis |
|---|---|---|---:|---|---|
| financial-payment-links-6y | paymentlinks | financialActivityAt (end_of_calendar_year) | 6 years | delete | legal_obligation |
| financial-payments-6y | payments | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |
| billing-subscriptions-6y | subscriptions | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |
| billing-provider-events-6y | revenuecatevents | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |
| security-audit-2y | auditlogs | timestamp (record_timestamp) | 2 years | delete | legitimate_interest_security |
| business-contract-6y | businessplanassignments | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |

Processors inventoried: **11**. Fields containing `*_CONFIRMATION_REQUIRED` remain external account/contract checks.
