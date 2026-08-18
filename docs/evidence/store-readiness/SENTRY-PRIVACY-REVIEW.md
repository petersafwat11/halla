# Sentry privacy review

**Code status:** `SDK_SCRUBBING_VERIFIED_ACCOUNT_SETTINGS_PENDING`

The mobile SDK is disabled when no DSN is supplied, sets `sendDefaultPii: false`, removes authorization/cookie/query data, strips URL query strings, deletes user email/IP/username, and redacts sensitive keys plus common email, bearer-token and Saudi-phone patterns. The same scrubber now covers error events, transaction events and breadcrumbs.

## Account checks still required

1. Confirm the correct Sentry organization/project and environment separation.
2. Export or screenshot event-retention duration and data-residency settings.
3. Confirm server-side IP address storage/scrubbing and inbound data filters.
4. Confirm attachments, replays and profiling are disabled unless separately assessed and disclosed.
5. Send a synthetic event containing a fake email/phone/token; verify none appears in event details, breadcrumbs, spans or raw payload.
6. Record the DPA/contract status and user-erasure procedure in the processor register.

Never use a real user identifier in the synthetic inspection event.
