# Halaa Email Activation and First-Party Observability Plan

Status: implementation-ready plan  
Scope: Halaa API, web app, Expo mobile app, admin dashboard, and production VPS  
Default retention: 30 days for detailed diagnostic events  
Initial alert destination: admin dashboard; email after Mailtrap production delivery is verified

## 1. Outcomes

This work has two deliverables:

1. Make transactional email work consistently in local development and production through Mailtrap without committing credentials.
2. Replace the currently inactive Sentry integration with a privacy-safe, first-party error and health monitoring system hosted on the existing VPS and MongoDB Atlas deployment.

Completion means an operator can detect, group, investigate, acknowledge, and resolve backend, web, and mobile application failures; correlate client failures with API request IDs; inspect service and disk health; and receive reliable high-severity notifications without exposing credentials or customer PII.

## 2. Current-state findings

### Email

- The VPS has Mailtrap credentials under `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, and `EMAIL_PASSWORD`.
- `EMAIL_HOST` is `smtp.mailtrap.io` on port 25 and is network-reachable from the VPS.
- `EMAIL_FROM` is not configured.
- `halaa-backend/email/config.js` selects custom SMTP only when `SMTP_HOST` exists. With the current `EMAIL_*` variables it falls through to its Gmail branch and fails authentication.
- The backend also exposes `EMAIL_*` through `src/config`, so two configuration conventions currently coexist.
- The configured hostname may represent Mailtrap Sandbox/legacy SMTP rather than the current production sending endpoint. Production delivery must not be assumed until Mailtrap domain status and inbox delivery are verified.

### Monitoring

- `@sentry/react-native` and privacy hooks exist in the mobile app, but the EAS production environment has no `SENTRY_DSN`; production Sentry reporting is therefore inactive.
- Backend 5xx errors are written to container stdout, and Docker retains only three 10 MB JSON log files per container.
- Every API request already receives an `X-Request-ID`, which is a strong correlation foundation.
- Web errors currently go to `console.error` through `errorHandlingService`.
- Mobile already has a React error boundary.
- Readiness endpoints, Winston/prom-client dependencies, audit logging, RBAC, rate-limiting, privacy retention tooling, and admin UI patterns already exist and should be reused.

## 3. Design principles

- Never collect passwords, tokens, authorization headers, cookies, raw request bodies, payment details, invitation tokens, email addresses, phone numbers, or precise location.
- Do not use diagnostic data for product analytics or advertising.
- Treat client payloads as untrusted input even when the client is authenticated.
- Store stable pseudonymous hashes where correlation is required, not raw identifiers.
- Keep ingestion non-blocking: monitoring failure must never fail the customer action.
- Apply sampling and rate limits before database writes.
- Group repeated failures instead of storing unlimited duplicates.
- Preserve `requestId`, release, platform, environment, and error fingerprint across all applications.
- Make monitoring independently disableable with feature flags and a kill switch.
- Keep native crash diagnosis in Apple Organizer/TestFlight and Google Play Android Vitals; the first-party system covers JavaScript, API, workflow, and health failures.

## 4. Workstream A: activate Mailtrap safely

### A1. Consolidate configuration

Use `EMAIL_*` as the single canonical convention because it is already validated by `src/config/env.js` and present on the VPS:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USERNAME`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_SENDER_NAME`
- `EMAIL_ENABLED`

Update `email/config.js` to consume the validated backend configuration or these canonical names. Remove the implicit Gmail fallback in production. In production, missing/inconsistent configuration must make email readiness fail clearly; in development, email may be explicitly disabled.

Do not duplicate VPS values into `SMTP_*`. Supporting legacy `SMTP_*` temporarily is acceptable only as a documented compatibility fallback with a startup deprecation warning.

### A2. Correct Mailtrap product configuration

In the Mailtrap dashboard, determine whether the existing account is:

- Email Sandbox, which captures tests and does not deliver to customers; or
- Email API/SMTP Sending, which delivers transactional mail.

For production Email Sending:

1. Add and verify a Halaa-controlled sending domain, preferably a subdomain such as `mail.halaa.com.sa`.
2. Publish Mailtrap-provided SPF and DKIM DNS records.
3. Publish a DMARC record initially in monitoring mode, then strengthen it after delivery is stable.
4. Use the exact SMTP host and port shown by Mailtrap for the verified sending domain; do not assume the legacy host is correct.
5. Create or rotate production SMTP credentials and store them only in `/opt/halaa/config.env` with mode 600.
6. Set a real sender such as `Halaa <noreply@mail.halaa.com.sa>`.
7. Keep separate credentials/inboxes for local/staging and production.

### A3. Local configuration

Add safe placeholders and documentation to `halaa-backend/config.env.example`; never add real credentials. Recommended local modes:

- Default: `EMAIL_ENABLED=false` so tests and ordinary development do not send externally.
- Delivery test: developer-specific Mailtrap Sandbox credentials.
- Integration tests: inject Nodemailer JSON/stream transport and assert message content without network access.

Add `npm run email:verify` and `npm run email:send-test -- --to <address>` scripts. The verification script must show only provider, host, port, sender-domain status, and success/failure; it must never print credentials.

### A4. Production readiness and rollout

Extend `/health/ready` with a configuration-only email check. Do not connect to SMTP on every health probe. Add a separate operator command for an authenticated SMTP handshake and optional canary delivery.

Rollout sequence:

1. Merge and deploy code that understands canonical `EMAIL_*` values while email remains disabled.
2. Update `/opt/halaa/config.env` directly on the VPS after the deploy; secrets are not transported through Git.
3. Restart only the API container and verify readiness.
4. Run SMTP handshake verification.
5. Send one canary to controlled Gmail and Outlook inboxes.
6. Confirm inbox placement, sender identity, SPF, DKIM, and DMARC results.
7. Enable transactional email.
8. Exercise password-reset and one notification flow end-to-end.

Rollback is `EMAIL_ENABLED=false` plus an API container restart. SMS/WhatsApp recovery paths must remain available while email is disabled.

### A5. Email acceptance criteria

- Production never selects Gmail unless Gmail is deliberately configured.
- Mailtrap SMTP authentication succeeds.
- The From domain passes SPF and DKIM and aligns with DMARC.
- Password-reset email arrives and contains the correct HTTPS link and expiry.
- Arabic and English templates render correctly on mobile and desktop mail clients.
- No secret appears in logs, readiness output, tests, or API responses.
- Failed delivery is recorded as an operational event with provider response category, not recipient PII.
- The free-plan thresholds (4,000/month and 150/day at time of planning) have dashboard warnings before they are reached.

## 5. Workstream B: first-party observability architecture

### B1. Components

Create an `observability` backend module containing:

- ingestion controller and strict Zod schemas;
- normalization and redaction service;
- fingerprint/grouping service;
- diagnostic event and issue models;
- health snapshot and alert-state models;
- admin query/controller/routes;
- retention and aggregation jobs;
- alert evaluator;
- Prometheus-compatible metrics endpoint restricted from public access;
- operator scripts for smoke tests and cleanup verification.

Client integrations:

- shared telemetry envelope and scrubber in `@halaa/shared`;
- web reporter integrated with the root error boundary, global browser handlers, and existing error service;
- mobile reporter integrated with the React error boundary, global JavaScript handler, unhandled promise handler, API wrapper, app-state metadata, and release metadata;
- backend reporter integrated with the global Express error handler, process-level fatal handlers, scheduled jobs, provider boundaries, and readiness checks.

Admin integrations:

- bilingual observability summary page;
- issue list and issue detail views;
- health/status panel;
- acknowledgement, assignment, resolution, mute, and regression controls;
- audit records for every admin mutation.

### B2. Diagnostic event schema

`DiagnosticEvent` should include only bounded, validated fields:

- `occurredAt`, `receivedAt`, `expiresAt`;
- `environment`: production/staging/development;
- `source`: backend/web/mobile;
- `platform`: node/web/ios/android;
- `severity`: fatal/error/warning/info;
- `kind`: exception, unhandled-rejection, api-failure, job-failure, provider-failure, health-failure;
- `messageNormalized`, with length limit;
- `stackNormalized`, with frame and character limits;
- `fingerprint` and `issueId`;
- `release`, `buildNumber`, `runtimeVersion`;
- `routeTemplate` or screen name, never a URL containing identifiers/query strings;
- `requestId`, response status, safe application error code;
- device family, OS major/minor, locale, and network class where available;
- pseudonymous session/device/user hashes generated with a rotating server-side salt;
- bounded breadcrumbs containing allowlisted action names and relative timestamps;
- occurrence/sample weight and ingestion version.

MongoDB indexes:

- TTL on `expiresAt` for automatic detailed-event deletion after 30 days;
- `{ fingerprint: 1, occurredAt: -1 }`;
- `{ severity: 1, occurredAt: -1 }`;
- `{ release: 1, occurredAt: -1 }`;
- `{ requestId: 1 }` sparse;
- `{ issueId: 1, occurredAt: -1 }`.

`DiagnosticIssue` stores long-lived aggregates without raw event content:

- fingerprint, title, status, severity;
- first/last seen and last regressed time;
- total and rolling occurrence counts;
- affected pseudonymous-user estimate;
- affected releases/platforms;
- sample event reference;
- assignee, acknowledgement, mute and resolution metadata.

Keep aggregate issue history for 12 months; detailed events expire after 30 days.

### B3. Fingerprinting and grouping

Build a deterministic SHA-256 fingerprint from:

```text
source + kind + normalized error class + normalized message + top application stack frames + route/screen
```

Normalization must remove ObjectIds, UUIDs, numeric database IDs, timestamps, phone/email-like values, URLs, and changing query parameters. Maintain fingerprint algorithm versioning so grouping changes are explicit.

An issue reopens as a regression when the same fingerprint appears in a newer release after being resolved.

### B4. Ingestion API

Add `POST /api/v2/observability/client-events` with these controls:

- maximum body size around 32 KB;
- maximum small batch, for example 10 events;
- dedicated rate limiter by authenticated user/device token hash/IP fallback;
- no requirement to be authenticated so login/startup failures can report, but anonymous limits must be strict;
- accepted origin/application identifiers;
- schema version allowlist;
- server-side timestamps and environment; never trust client values for authorization or retention;
- redaction after parsing and before every log/database write;
- return `202 Accepted` with no stored content reflected;
- fail silently in clients with a short timeout and no retry storm.

Suggested production limits:

- 20 events/minute/device;
- 100 events/hour/device;
- 1,000 events/minute global circuit breaker;
- maximum five identical raw reports per fingerprint/device/hour, with later occurrences aggregated.

### B5. Backend instrumentation

Extend the global error handler to capture unexpected 5xx failures after response-safe transformation. Capture operational 5xx errors at warning/error severity; do not store ordinary validation or authentication failures unless an abnormal-rate alert is triggered.

Instrument:

- `uncaughtException` and `unhandledRejection`, followed by controlled shutdown where required;
- MongoDB connection loss/recovery;
- Taqnyat send failures and unusual failure rate;
- Moyasar charge/webhook/reconciliation failures without payment details;
- RevenueCat webhook/reconciliation failures without receipt/token data;
- Mailtrap authentication/delivery failures without recipients;
- scheduled-job duration, failures, and missed-run detection;
- upload/storage failures;
- health and readiness state transitions;
- event creation and guest-send latency histograms;
- HTTP totals, latency, and 4xx/5xx rates by normalized route.

Upgrade the logger to structured JSON in production. Standard fields are timestamp, level, service, environment, release, requestId, event code, and redacted metadata. Preserve human-readable development output.

### B6. Web instrumentation

Add:

- root App Router `global-error.js`/appropriate error boundaries;
- `window.error` and `unhandledrejection` listeners in a client-only provider;
- reporting from the existing centralized error handling service for unexpected/network/5xx failures;
- release and route-template metadata;
- API `X-Request-ID` propagation into diagnostic reports;
- in-memory breadcrumbs limited to safe navigation/action names;
- offline queue capped by count, bytes, and age; no persistent queue unless reviewed for privacy.

Do not report expected 4xx business errors, cancelled requests, known offline failures, or errors already reported by the same boundary.

### B7. Mobile instrumentation

Replace Sentry initialization with a first-party reporter abstraction so Sentry can remain removed/disabled without rewriting call sites.

Capture:

- React error-boundary failures;
- global JavaScript exceptions;
- unhandled promise rejections where supported;
- API 5xx/timeouts with request ID;
- app release/build/runtime version;
- platform, OS version, device family, locale, and app foreground/background state;
- safe screen and action breadcrumbs.

Store a maximum of 20 pending reports locally in SecureStore/AsyncStorage with a 24-hour expiry and bounded total size. Flush on next successful foreground/network opportunity with exponential backoff and jitter. Never block app startup.

Do not attempt to replace native crash reporting in phase one. Document operator workflows for Apple Organizer/TestFlight crash reports and Google Play Android Vitals, including weekly review ownership.

### B8. Admin dashboard

Add `/[lang]/admin-dash/observability` with:

- last 24 hours/7 days error volume;
- new, regressed, unresolved, and fatal issue counts;
- affected releases/platforms;
- API 5xx rate and p50/p95/p99 latency;
- MongoDB, storage, email, Taqnyat, Moyasar, RevenueCat, cron, and disk health cards;
- issue filters for date, status, source, platform, release, severity, and error code;
- issue detail with sanitized sample stack, occurrence graph, request IDs, safe breadcrumbs, and release history;
- acknowledge, assign, resolve, mute-until, and reopen actions;
- CSV aggregate export only; never export raw diagnostic payloads or stable user identifiers.

Access is limited to super-admin/admin roles. Moderator access should be explicitly decided rather than inherited. All mutations use existing RBAC and audit-log patterns.

### B9. Alerts

Start with dashboard alerts and a persistent health banner. Add email alerts only after Workstream A passes production canary tests.

Initial alert rules:

- any fatal backend process failure;
- readiness failing for two consecutive probes;
- new issue affecting at least five users or 20 occurrences in 10 minutes;
- 5xx rate greater than 2% with at least 20 requests in five minutes;
- p95 API latency above two seconds for 10 minutes;
- payment provider failures above 5% over 15 minutes;
- messaging failures above 10% over 15 minutes;
- scheduled job missed by more than twice its interval;
- disk usage warning at 70%, critical at 85%;
- MongoDB connectivity loss;
- email authentication failure or monthly/daily quota approaching limits.

Deduplicate alerts by rule and issue, add cooldowns, and emit recovery notifications. Alert delivery failure must itself appear in the dashboard but must not recursively alert forever.

### B10. Infrastructure health

Add a host-side collector or timer, kept outside the application container lifecycle, to record:

- disk total/used/free and inode use;
- memory/swap pressure;
- CPU/load;
- container running/restart/health state;
- container memory/CPU;
- upload directory size;
- certificate expiry;
- latest successful backup and restore-verification age.

Prefer a small systemd timer and authenticated/internal API submission over giving the application access to the Docker socket. Never mount the Docker socket into the public API container.

Prometheus metrics should be reachable only from localhost/internal Docker network or protected with strong operator authentication; do not expose raw metrics publicly through Caddy.

## 6. Privacy and security controls

Create one shared recursive redactor with an allowlist-first policy. Redact keys and values matching:

- authorization, cookie, token, secret, password, key, signature, credential;
- email, phone, OTP, invitation/reset/staff token;
- card number, CVV, bank/account identifiers, payment sources and receipts;
- names, addresses, exact coordinates, contact-list values;
- URL query strings and request bodies.

Additional requirements:

- Hash identifiers with HMAC-SHA-256 and a dedicated rotating secret, not plain SHA hashes.
- Keep encryption in transit and Atlas encryption at rest.
- Prevent diagnostic collections from being returned through generic admin/model serializers.
- Add privacy documentation identifying purpose, categories, retention, access, and deletion behavior.
- Delete or irreversibly unlink a person's diagnostic identifiers during account deletion while preserving non-identifying aggregate issue counts.
- Maintain an emergency ingestion kill switch.
- Add payload fuzzing, NoSQL-injection, oversized-body, rate-limit, and authorization tests.

## 7. Retention and capacity

Default policy:

- detailed events: 30 days via TTL;
- pending mobile reports: 24 hours;
- health samples: high-resolution seven days, hourly rollups 90 days;
- aggregate issues/alerts: 12 months;
- acknowledged audit events: follow the existing audit retention policy.

Capacity controls:

- maximum stored event size 32 KB;
- server-side sampling for noisy low-severity fingerprints;
- hard daily event budget and dashboard warning;
- aggregation counters for dropped/sampled events;
- indexes reviewed with `explain()`;
- Atlas storage alert before diagnostic storage becomes a material percentage of the database.

At an average stored size of 5 KB, 100,000 detailed events/month are roughly 0.5 GB before index/replication overhead. The system should target far below that through grouping and sampling.

## 8. Implementation phases

### Phase 0: contracts and threat model

- Finalize schemas, retention, severity definitions, alert ownership, and privacy threat model.
- Decide whether moderators may view anything.
- Record baseline API latency/error rate and existing log volume.

Exit: reviewed contracts, data inventory, and abuse cases.

### Phase 1: Mailtrap activation

- Consolidate configuration, remove production Gmail fallback, add scripts/tests/readiness.
- Verify Mailtrap sending product and domain DNS.
- Deploy code, rotate/update VPS secrets, send canaries, and test password reset.

Exit: authenticated, domain-aligned email delivered end-to-end with rollback tested.

### Phase 2: backend observability foundation

- Add models, redactor, fingerprinting, ingestion, TTL/indexes, structured logger, global backend capture, metrics and tests.
- Add database migration/index script and dry-run verification.

Exit: synthetic backend and client failures group correctly, contain no seeded PII, and expire under TTL policy.

### Phase 3: web and mobile clients

- Integrate boundaries/global handlers/API correlation and safe breadcrumbs.
- Add bounded mobile queue and release metadata.
- Remove or leave disabled Sentry behind a provider interface; remove unused upload secrets/config after verification.

Exit: staged web/mobile failures arrive once, correlate with request IDs, survive temporary offline state, and never affect user flows.

### Phase 4: admin dashboard and workflow

- Build bilingual overview/list/detail screens and issue lifecycle actions.
- Add RBAC, audit logs, filters, pagination, aggregates and accessible UI tests.

Exit: an admin can investigate a seeded cross-client/API failure from alert to resolution.

### Phase 5: health collector and alerts

- Add host metrics, service health, alert evaluator, cooldown/recovery state, dashboard banner, and then Mailtrap email delivery.
- Add backup-age and certificate-expiry checks.

Exit: controlled service, disk, provider and cron failures trigger one alert and one recovery notification.

### Phase 6: production hardening

- Capacity/load tests, chaos tests, privacy review, index review, runbooks and rollback rehearsal.
- Run a one-week observation period with conservative alerts and tune thresholds.

Exit: acceptance report signed off with measured event volume, DB growth, query latency, false-alert rate, and operator response evidence.

## 9. Test plan

### Unit

- schema bounds and versioning;
- redaction including nested/circular/malformed objects;
- fingerprint stability and normalization;
- sampling, deduplication, severity and alert rules;
- Mailtrap configuration selection and sender formatting.

### Integration

- anonymous/authenticated ingestion and rate limits;
- admin RBAC and audit trail;
- TTL/index creation;
- account-deletion unlinking;
- global 5xx capture without response leakage;
- provider failure capture without secrets;
- Nodemailer injected transport and template links.

### Web/mobile

- render exceptions, unhandled promises and API failures;
- request-ID preservation;
- offline queue bounds/expiry;
- duplicate suppression;
- Arabic/English fallback UI;
- reporter failure never causes a second crash.

### Production rehearsal

- synthetic error with a unique canary fingerprint;
- controlled SMTP canary;
- temporary readiness failure;
- disk threshold simulation without filling the real disk;
- missed-job simulation;
- alert acknowledgement/resolution/recovery;
- database inspection proving no forbidden PII/secrets.

## 10. Deployment and rollback

- Introduce `OBSERVABILITY_ENABLED`, `CLIENT_ERROR_INGEST_ENABLED`, `OBSERVABILITY_SAMPLE_RATE`, and `OBSERVABILITY_ALERTS_ENABLED`, defaulting safely off until migrations/indexes exist.
- Deploy backend storage/read APIs first, then admin UI, then clients, then alerts.
- Use a staged sample rate before full enablement.
- Do not enable email alerts until Mailtrap delivery is proven.
- Keep schema readers backward-compatible with at least the previous client envelope version.
- Rollback clients by disabling ingestion remotely where possible; rollback backend via feature flags without dropping diagnostic collections.
- Never delete diagnostic collections during rollback. Let TTL remove detailed events naturally after the incident is understood.

## 11. Operational runbooks

Document:

- investigate a new/regressed issue;
- correlate a support reference/request ID across client, API and provider events;
- handle fatal/restart loops;
- handle disk 70%/85% alerts;
- diagnose Atlas connectivity;
- diagnose Taqnyat/Moyasar/RevenueCat failures;
- rotate Mailtrap credentials and verify SPF/DKIM/DMARC;
- handle email quota exhaustion;
- review Apple Organizer/TestFlight and Android Vitals weekly;
- execute and verify retention;
- disable ingestion during abuse;
- restore monitoring after rollback.

## 12. Cost and ownership

Expected incremental vendor cost at current scale: SAR 0 while Mailtrap remains within its free Email API/SMTP allowance and existing Atlas/VPS capacity is sufficient.

Hidden cost is engineering and operator time. Assign named owners for:

- application observability and weekly issue triage;
- infrastructure/backup health;
- Mailtrap deliverability and DNS;
- privacy/retention review;
- mobile native crash review;
- monthly capacity and quota review.

Review thresholds when any of these occur:

- more than 100,000 detailed events/month;
- diagnostics add more than 20% to Atlas storage or materially affect query latency;
- Mailtrap exceeds 150/day or approaches 4,000/month;
- alert response is routinely delayed;
- native crashes cannot be diagnosed from Apple/Google reports;
- maintaining the custom solution costs more engineering time than a managed service.

## 13. Definition of done

- Mailtrap production delivery works locally in explicit test mode and on the VPS with separate secrets.
- Password reset and notification email paths are verified.
- Backend, web and mobile unexpected errors are captured and grouped.
- Request IDs correlate client and backend failures.
- Admin dashboard provides investigation and lifecycle workflow in Arabic and English.
- Health covers API, database, containers, disk, cron, backup age and configured providers.
- Alerts deduplicate, recover, and do not depend solely on the failing system.
- Redaction, retention, RBAC, audit and deletion behavior pass automated tests.
- Native crash review through Apple/Google has an assigned owner and runbook.
- Load, privacy, deployment and rollback rehearsals have recorded evidence.
- Production runs for seven days with acceptable DB growth and false-alert rate before the system is considered fully operational.
