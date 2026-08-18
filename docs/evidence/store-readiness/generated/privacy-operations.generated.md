# Privacy operations contract (generated)

Generated from `shared/src/legal/operations.json`. Do not edit by hand.

- Policy version: `2026-08-13`
- Owner approval: `OWNER_APPROVED`
- Counsel status: `UNCONFIRMED`
- Policy hash: `28b061780f1e0162a38080ab919acb2ec1490b68168c60934924a8cfd7f9ccfd`

| Rule | Collection | Trigger | Duration | Action | Legal basis |
|---|---|---|---:|---|---|
| financial-payments-6y | payments | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |
| billing-subscriptions-6y | subscriptions | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |
| billing-provider-events-6y | revenuecatevents | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |
| security-audit-2y | auditlogs | timestamp (record_timestamp) | 2 years | delete | legitimate_interest_security |
| business-contract-6y | businessplanassignments | updatedAt (end_of_calendar_year) | 6 years | delete | legal_obligation |

Processors inventoried: **12**. Fields containing `*_CONFIRMATION_REQUIRED` remain external account/contract checks.
