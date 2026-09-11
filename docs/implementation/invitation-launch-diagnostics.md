# Invitation launch diagnostics

Launch failures now emit `[invitationBatch] guest failures` with event ID, attempt ID, scope, channel, total failures and up to 20 guest diagnostics. Each diagnostic includes guest ID, error code/name, processing stage, HTTP status when available, a bounded message and up to four stack frames. Partial failures are logged too.

Thrown errors retain diagnostics through the batch runner. All-failed launch exceptions carry the same diagnostics into the `event.launch_failed` audit metadata, so container replacement does not erase the only record of the cause. Stages identify claim acquisition, invitation capacity, template validation, image validation, provider send, provider response, or batch/idempotency processing. Unexpected failures after provider dispatch retain their stack location.

Diagnostics do not include provider request bodies, invitation text or raw guest records. URLs, common credential patterns, email addresses and phone-like numbers are redacted. The audit/log payload is bounded; `truncated` on batch logs indicates more than 20 failures.

After deploying, correlate the event ID and attempt ID in backend logs and the launch audit. Existing failures cannot be reconstructed retroactively; the first failed launch of the demo engagement event remains recorded only as ALL_SENDS_FAILED. Its second attempt succeeded.

Validation: regression tests cover retained error stage/code/frames, redaction, and provider-failure diagnostics attached to ALL_SENDS_FAILED. These changes do not resend invitations or change retry timing.
