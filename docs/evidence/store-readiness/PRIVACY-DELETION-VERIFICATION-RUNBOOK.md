# Privacy deletion verification runbook

> Internal engineering reference only. This is not an owner-facing store-submission checklist.

## Safety

The script creates a uniquely named synthetic `example.invalid` host, a refresh token and a notification, then invokes the real account-deletion pipeline. It never accepts an existing user ID. The durable anonymized user tombstone, deletion request and processor obligations remain as evidence; all inserted personal canary values must disappear.

## Development execution

1. Point the backend environment to the intended development database and storage configuration.
2. Set `PRIVACY_DELETION_CANARY_CONFIRMED=true`.
3. Run `npm run privacy:deletion:canary` from `halaa-backend`.
4. Save the secret-free JSON output under the release evidence folder.
5. A valid run reports `passed: true`. `pending_retry` is truthful when storage/provider cleanup remains; investigate it rather than rewriting it to completed.

## Release checks

- AWS/S3: object deletion succeeds with the deployed IAM role; missing objects count as idempotent success.
- Backend truthfulness: integration tests must continue proving that mandatory database failure produces `partial`, residual S3 work produces `pending_retry`, and only a clean result produces `completed`.

## Non-blocking operational records

- RevenueCat is automatically recorded as `retained_by_policy` using the approved pseudonymous billing-history decision; no per-deletion owner action is required.
- Sentry is automatically `not_applicable` for account-scoped erasure because the SDK does not send a stable Halaa user identifier and scrubs PII before ingest.
- Taqnyat/email/SMS `ProcessorErasure` rows are an internal follow-up worklist. They do not block account closure or store submission; staff may later mark a row requested, acknowledged, not applicable or retained by policy when a real provider fact is available.
- Halaa currently has no backup system. Restore/re-deletion testing is `NOT_APPLICABLE`. If backups are introduced later, restore deletion must be added to the backup design before enabling them.
- The backend retains an unguessable request ID and exposes `GET /users/deletion-status/:requestId` without the revoked session. The public web deletion page can query it. A separate mobile post-logout status screen is optional and is not a release requirement.

Do not paste credentials, raw database dumps, user content or provider secrets into the evidence output.
