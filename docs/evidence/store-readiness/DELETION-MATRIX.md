# Account-deletion data matrix (DEL-01)

**Verified:** 2026-07-02 · **Scope:** Session 4 · **State:** INTEGRATION_VERIFIED
(pending legal sign-off of `RETENTION_MATRIX_FINALIZED`).

Model-by-model and processor-by-processor `delete | anonymize | retain` matrix for
self-service account deletion. Derived from a read-only inventory of every model in
`labbe-backend-/models/` and implemented by
`labbe-backend-/src/modules/account-deletion/deletion.service.js` (+ `deletion.collect.js`,
`deletion.processors.js`, `deletion.retry.js`). Proven by
`test/account-deletion.integration.test.js` (7) and `test/revenuecat-post-deletion.test.js`
(2) against an ephemeral `MongoMemoryReplSet` with an isolated in-memory S3 stub — the
shared cluster and real S3 are never touched.

## Completion semantics (the P1-02 fix)

Two distinct states are no longer conflated:

- **account-closed** (mandatory, always runs): refresh tokens deleted + User PII
  anonymized (`status=deleted`, `deletedAt` set). Already-issued access JWTs stop
  working via the `UserModel` `deletedAt` pre-find hook.
- **request-completed** (`completed`): additionally requires that **every personal S3
  object is gone**. A residual S3 object (or a failed non-mandatory step) yields
  **`pending_retry`** — NOT `completed` — and the `account_deletion_retry` cron
  (`scheduledTasks.scheduleAccountDeletionRetry`, leased) re-runs the residual S3 deletes
  until clean, then flips to `completed`. This makes a `completed` claim provably truthful.
- **`partial`**: a MANDATORY step failed (account may not be fully closed → investigate).

## S3 object coverage (P1-02 core bug)

The previous `isS3Key()` guard treated **any** `http(s)://…` value as "not an S3 key" and
skipped it, so post-event media persisted as full bucket URLs (`file.location`) was left in
S3 forever. Fixed by `resolveDeletableS3Key()` (`s3Upload.js`), which normalizes **bare
keys AND our-bucket URLs** (canonical / virtual-host / path-style) to a deletable key and
drops local-disk and external URLs. `deletion.collect.js` now gathers **every** variant:

| Source | Field paths collected | Previously missed? |
|---|---|---|
| User | `avatar`, `profile.vendorData.{businessLogo,nationalIdImage,commercialRecordImage,profileFile,cv,portfolioImages[],pricePackages[]}` | partial (cv/pricePackages) |
| Event | `templateImage`, `branding.logoKey`, **`visualTemplate.bakedImagePath`** | **bakedImagePath ✗** |
| PostEventContent | **`coverImage`**, `media[].url` (incl. full-URL), **`media[].thumbnailUrl`**, **`media[].comments[].images[].url` + `.thumbnail`**, **`comments[].images[].url` + `.thumbnail`** | **all ✗** |
| Service | `image` | ok |

Idempotent retry: an already-absent key (S3 DeleteObject returns 204 for a missing key)
counts as success, so the residual list converges.

## Model matrix

| Model | Action | Fields / notes |
|---|---|---|
| **User** | anonymize | `$set name="Deleted User", status=deleted, deletedAt`; `$unset email,mobile,phoneNumber,username,avatar,pushTokens,profile.vendorData,profile.businessData,profile.hostData.{bio,company,position}`. `billingUserId` **retained** as the pseudonymous RC tombstone key (copied to the deletion request). |
| **RefreshToken** | delete | `deleteMany({userId})` — session revocation. |
| **Event** (owned) | anonymize + soft-delete | `status=deleted, deletedAt`, `title="Deleted Event"`, `staffList[].name="Deleted"`, `staffList[].phone=""`; `$unset location, description, branding`. Row kept for referential integrity. |
| **Guest** (of owned events) | anonymize | `deleted=true`, `name="Deleted Guest"`, `phone=""`, `rsvp.{message,dietaryRestrictions}=""`, `checkIn.checkedInByStaff.{name,phone}=""`. |
| **GuestAccessToken / StaffAccessToken** | delete | Device `ip`/`userAgent` + staff `name`/`phone` PII → `deleteMany` for owned events' guests/staff. |
| **PostEventContent** (owned) | delete | `deleteMany({host})`; all media/comment images collected for S3 delete first. |
| **Service** (vendor) | delete | `deleteMany({vendorId})`; `image` collected for S3. |
| **Ticket** | delete | `deleteMany({user})` — user-submitted subject/message. |
| **Notification / NotificationPreferences** | delete | `deleteMany({userId})`. |
| **TermsAcceptance** | delete | `deleteMany({actorType:"user",actorId})` — stores acceptance **IP** (PII). |
| **Block** | delete | `deleteMany` where user is blocker OR blocked actor. |
| **Report** | delete | `deleteMany` where user is reporter OR reported actor (content snapshots + linkage). |
| **Addon** | delete | `deleteMany({userId})` — operational, not in RETAINED. |
| **EventEntitlement** | delete | `deleteMany({userId})` — operational, not in RETAINED. |
| **Subscription** | **retain** (pseudonymized) | Row kept (billing/tax audit). Free-text `notes`/`cancelReason` scrubbed to `null`. Restorable identity removed via User anonymization. |
| **Payment** | **retain** (pseudonymized) | Row kept (accounting/tax/chargeback). Identity pseudonymized via User anonymization. |
| **OTP / IdempotencyKey** | delete | `deleteMany({userId})` — phone/email/hashed bodies (also TTL-expire). |
| **RevenueCatEvent** | retain (redacted) | Ingested **redacted** (no receipts/tokens/PII). `appUserId` is the opaque billing id, not internal PII. Post-deletion webhooks classified `account_deleted` (below). |
| **AuditLog** | retain (pseudonymized) | Immutable audit trail (IDs/actions; `ipAddress`/`userAgent` are security-audit data retained per matrix). |
| **BusinessPlanAssignment / BusinessSetupFee** | retain (pseudonymized) | B2B contract accounting (RETAINED matrix). |
| **AccountDeletionRequest** | retain | The deletion audit proof itself (requestId + status + steps; NO PII; retains `billingUserId` tombstone). |
| Plan / Template / TemplateCategory / TaqnyatTemplate / Discount | no action | Global/admin collections; no per-user personal data. |

`RETAINED` list + reasons/durations: `src/shared/constants/dataRetention.js` (payments,
subscriptions, auditlogs, businessplanassignments — all pseudonymized).
`LEGAL_FINALIZED` stays `false` until counsel signs the exact list.

## Processor matrix (LEGAL §7)

Recorded as durable, pseudonymous obligations in `ProcessorErasure`
(`deletion.processors.js`) so the request never silently claims downstream data is erased.

| Processor | Status | Rationale |
|---|---|---|
| **revenuecat** | `retained_by_policy` | **DEC-04** — purchases kept with the original App User ID; NO cross-account transfer, NO proactive wipe; billing/tax retention. `externalRef = billingUserId`. |
| **sentry** | `pending` | Crash/diagnostic data; Sentry scrubs PII at ingest; user-scoped purge is a manual ops action if required. |
| **taqnyat** | `pending` | Outbound WhatsApp/SMS delivery logs at the provider — erasure obligation recorded. |
| **push** | `not_applicable` | Push tokens removed from the account during anonymization. |

Post-deletion RevenueCat webhooks: `revenuecat.service.processEvent` now checks a deletion
tombstone (`AccountDeletionRequest.billingUserId`) in the null-user branch and returns a
terminal **`account_deleted`** disposition (HTTP 200, non-retryable) instead of an
`unknown_user` permanent dead-letter (LEGAL §7). A genuinely unknown user still
dead-letters. Proven by `test/revenuecat-post-deletion.test.js`.

## Retry / operations visibility

- `AccountDeletionRequest`: `status` (adds `pending_retry`), `pendingS3Keys[]`,
  `retryCount`, `lastRetryAt`, `nextRetryAt`, `billingUserId`.
- `ProcessorErasure`: per-processor status/attempts/reason for an ops worklist.
- `account_deletion_retry` cron (every 5 min, leased) converges `pending_retry` requests.
- Append-only `logAudit("user.account_deleted", …)` records status + residual count (no PII).

## Known verification gap (honest)

Whether the backend IAM user can `s3:DeleteObject` is **not provable without live
credentials**. Memory + `docs/feature-planning/02-BACKEND-AND-DB.md:291` confirm the
explicit Deny is on **`s3:GetObject`** (the read path); nothing documents a Delete Deny, and
`DeleteObjectCommand` is already used in production (`safeDeleteOldKey`, template cleanup),
which is circumstantial evidence it works. The fail-closed design is robust either way: if
Delete is denied in production, the request stays `pending_retry` (never falsely
`completed`) and the residual is surfaced in ops visibility. **Live-credential
confirmation is required before GO.**
