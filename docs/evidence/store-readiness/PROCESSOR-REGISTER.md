# Halaa processor register

**Release treatment:** operational compliance inventory; it does not require a new owner product decision and is not, by itself, a technical App Store/Play submission blocker. Account-specific facts can be maintained after the initial store setup without inventing values.

**Repository status:** `INVENTORIED_ACCOUNT_AND_CONTRACT_FACTS_PENDING`  
**Canonical machine source:** `shared/src/legal/operations.json`

| Processor | Purpose/data | Region/transfer | Retention/deletion | Required confirmation |
|---|---|---|---|---|
| MongoDB Atlas | Accounts, events, guests, billing, UGC | Account-specific | Halaa schedule plus backup rotation | Cluster region, backup retention, DPA, transfer mechanism |
| AWS/S3 | Uploads, vendor documents, event media | Bucket-specific | Object lifecycle and deletion pipeline | Bucket region, versioning/lifecycle, IAM delete, DPA |
| Moyasar | Web payment and card metadata | Provider-specific | Provider/legal schedule | Merchant terms, DPA, retention and deletion request path |
| Apple | iOS distribution and purchases | Provider controlled | Platform/legal schedule | Agreements, privacy terms and store declarations |
| Google | Android distribution, purchases and push | Provider controlled | Platform/legal schedule | Agreements, privacy terms and store declarations |
| RevenueCat | Pseudonymous app user ID, transactions, entitlements | Project-specific | Retained billing history under approved policy | Project region/options, DPA, retention, erasure/export behavior |
| Expo/APNs/FCM | Push token, payload, delivery data | Provider controlled | Delivery/diagnostic period | Payload policy, token deletion and agreements |
| Sentry | Crash/performance diagnostics | Project-specific | Account setting | Region, retention, IP scrubbing, inbound filters, DPA, erasure |
| Maps provider | Queries, coordinates | Provider controlled | Provider terms | Enabled provider/API, account settings and contractual terms |
| Taqnyat | Phone, SMS/WhatsApp content and delivery metadata | Provider-specific | Provider-specific | Hosting/transfer, retention, DPA and deletion process |
| Email provider | Email and delivery metadata | Account-specific | Account-specific | Actual provider, region, retention, DPA and deletion process |
| Meta/WhatsApp | Recipient phone, message/delivery metadata | Provider controlled | Platform terms | Business account configuration and applicable terms |

No `ACCOUNT_CONFIRMATION_REQUIRED`, `PROVIDER_CONFIRMATION_REQUIRED`, or `OWNER_CONFIRMATION_REQUIRED` value may be replaced by an assumption. Evidence should be an account export, contract/DPA, provider response or dated screenshot with secrets removed.

## Deletion classifications

- AWS/MongoDB first-party controlled data: automated in the account deletion pipeline.
- Push tokens: removed with the account and recorded as not applicable downstream.
- RevenueCat: retained by the approved billing/tax policy under the original pseudonymous app-user identifier.
- Sentry/Taqnyat/email/SMS: durable processor-erasure obligations are recorded; account/manual completion evidence remains required.
- Apple/Google purchase records: controlled by store/legal obligations; user-facing store account controls remain available.
