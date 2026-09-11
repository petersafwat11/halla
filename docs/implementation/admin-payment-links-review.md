# Admin payment links — implementation review

Reviewed and corrected in the shared working tree. Application code is implemented; merchant sandbox certification and deployment have not been performed. Creation now defaults to disabled until the merchant configuration and hosted flow are verified.

## Corrections made

- Fixed the provider expiry parameter to `expired_at`. Verify the returned expiry as well as invoice identity, metadata, environment, currency and amount before publishing a usable link.
- Replaced the nominal reconciliation counter with a Mongo lease shared by creation, recovery, refresh and cancellation. A wakeup arriving during provider I/O remains scheduled. Stale workers cannot publish a link projection after losing their lease.
- Unsigned invoice callbacks only persist a reconciliation wakeup. They cannot adopt an invoice ID from supplied metadata, store a raw payment payload or mark anything paid. Database failures return a retryable error. Added callback throttling and bounded parsing.
- Payment evidence must identify the request and invoice and contain the expected amount/currency. A paid invoice label alone is insufficient. Existing transactions belonging to another checkout are never reassigned to a link.
- Ledger updates use unique provider IDs and monotonic refunded/captured amounts. Failed ledger writes prevent a Paid projection and schedule recovery. Failed/authorized attempts are retained without counting as collected funds. Duplicate collections are recorded and flagged for review.
- Cancellation never infers success from HTTP success. It fetches the authoritative final state, preserves uncertainty and allows a concurrent payment to win. In-flight cancellation suppresses sharing actions.
- Creation retries reuse the durable request key, including UI remount/reload within the same browser session. Removed the generic response cache from creation so an old 202 response cannot permanently hide recovery. Recovery uses provider pagination information and does not issue a second create request.
- Routed Moyasar payment-link events through durable wakeups before generic payment/renewal handling, including refund updates without distinct event IDs. Kept the existing subscription renewal implementation and added direct tests for it. Excluded guest invoice attempts from the generic pending-payment reconciler.
- Kept moderator access limited to the payment-link capability, with explicit Payments NONE overrides respected. View endpoints also require an eligible staff role. Existing global refund/capture/void privileges were not expanded.
- Removed automatic dummy provider-key injection. Added a required configured amount ceiling when creation is enabled, exact HTTPS hosted-host checks, callback URL validation, a bounded worker and an additive index deployment script.
- Strengthened guest Payment invariants and suppressed misleading payer/subscription notifications. Registered payment links under the existing six-year financial retention duration, using financial activity rather than polling timestamps. Account deletion clears the creator's display snapshot. Unchanged payment snapshots no longer keep resetting ledger retention timestamps.
- Fixed pending/failed creation UX, live recovery in the dialog, disabled-feature controls, amount limits, clipboard fallback, error visibility and cancellation uncertainty. Added date/my-creator filters and a clear-filters path, transaction detail access, refund totals, dialog focus trapping/restoration and narrow-screen modal styling. Added English/Arabic strings.

## Local verification

- Backend: 71 tests passed across payment-link provider/integration/reconciliation tests, direct Moyasar webhooks, existing RevenueCat billing tests, retention and account deletion.
- Web: 25 runtime tests passed across payment-link dialogs/tables and existing admin route/table tests.
- Web lint: zero errors; 33 existing repository warnings. No payment-link warnings in that run.
- Web production build completed, including `/[lang]/admin-dash/payments/links`. The previously reported `_document` failure did not recur.
- Backend application factory initialized with an isolated test configuration; no listener or provider request was made. Backend JavaScript syntax checks passed.
- Generated privacy operations passed their consistency check.

Regression cases include concurrent creation, concurrent reconciliation, lost writes, forged callback recovery metadata, incorrect amount/currency/membership/environment, repeated/stale partial refunds, duplicate collection, payment/cancellation races, invoice-status-only false success, callback persistence failure, and ordinary invoice subscription renewal.

The browser interaction tests use JSDOM and a stubbed HTTP adapter. They verify behavior but are not screenshots or an end-to-end real merchant checkout. Provider tests use mocks and isolated Mongo databases. No live transaction, production migration or deployment was run.

## Deployment checklist

1. Keep `PAYMENT_LINKS_ENABLED=false` while preparing the merchant sandbox. Confirm hosted invoice capability, supported payment methods, Arabic/English checkout, successful/declined/retried payment behavior, returned `expired_at`, complete invoice payment evidence, metadata filtering/pagination, callbacks, expiry and cancellation. Confirm refund events and out-of-order delivery against real test-mode responses.
2. Set the merchant-approved `PAYMENT_LINKS_MAX_AMOUNT_SAR`; the prior assumed SAR 50,000 default was removed. Configure `PAYMENT_LINKS_CALLBACK_BASE_URL` with a public HTTPS backend base URL. The code adds `/api/v2/payment-links/provider-callback`. Review the exact hosted-host allowlist against the provider's actual invoice URLs.
3. Deploy compatible backend/schema changes first. Run `node scripts/migrate-payment-links-indexes.js` to inspect the dry-run message, then run it with `--apply` against the intended database. It adds required indexes without dropping unrelated indexes. Do not use `syncIndexes()` as a deployment shortcut. Resolve duplicate/index conflicts before enabling creation.
4. Deploy the web build; validate the real admin screens in Arabic/English on desktop and a narrow mobile browser, including copy permissions and dialogs. Enable creation only after the merchant sandbox and account capability checks pass.
5. For rollback, disable creation while leaving existing list/detail routes, callbacks and reconciliation workers available. Do not delete requests or orphan provider invoices. Any invoices created by the earlier implementation with missing expiry/metadata will be flagged for review and must be resolved against the provider, not silently adopted.

## Provider references used

- [Moyasar Create Invoice](https://docs.moyasar.com/api/invoices/01-create-invoice): `expired_at`, minimum minor-unit amount, server callback versus browser return, invoice/payment evidence.
- [Moyasar List Invoices](https://docs.moyasar.com/api/invoices/03-list-invoice): metadata filtering and pagination fields.

Unrelated in-progress repository changes were preserved. This review does not certify untested merchant configuration or authorize a live charge.

## Follow-up review — 11 September 2026

- Replaced payment-link form controls and dialogs with existing `InputGroup`, `InputSelect`, `Button`, `PopupLayout` and `MoneyAmount`. Creation uses React Hook Form and a Zod schema. Durable retry/recovery behavior remains intact. Extended the shared select with keyboard navigation and accessible combobox semantics.
- Replaced invented/fallback colors with Halaa palette tokens and registered payment-link states in the shared status-tone map (including its mobile mirror).
- Removed duplicate native date fields. Links use the existing dashboard header date picker; URL state is authoritative and full local-day bounds are converted to ISO timestamps. Verified Today in Arabic includes the reported invoice, which was created on the previous UTC date.
- Reused shared digit normalization, money display/conversion, card-brand detection and credit-card source construction. Kept the strict backend amount parser: generic rounded monetary conversion cannot replace validation of an exact requested amount.
- Reused backend Zod validation for direct service calls. List totals and worker reconciliation are scoped to the configured provider environment. The UI displays test mode and stale synchronization instead of implying that old data is current.
- Retired an obsolete localhost `/sw.js` registration that was serving outdated application code and causing hydration failures. The replacement worker unregisters itself, has no fetch handler and deletes no user data. Added a no-store response header. Browser reloads then consistently loaded the updated form.

### Reported Visa transaction

`HPL-C0AD4037307B5516` was verified against Moyasar using the configured **test** key. The invoice had a successful SAR 500 payment while the local projection was awaiting payment. The local services had stopped and the configured localhost callback cannot be reached by the provider. Ran the normal reconciliation service with verified provider evidence; the link and guest ledger now show Paid, SAR 500. Confirmed the paid row and totals in the Arabic browser. No new charge or invoice was created.

The local backend now runs the payment-link reconciliation schedule. Production still needs an always-running worker and a public HTTPS callback; a localhost process cannot supply reliable production delivery.

### Hosted branding and payment methods

The actual invoice response contains Moyasar's default logo URL. The invoice API does not accept an arbitrary per-invoice logo or payment-method list. Configure Halaa's logo in the merchant dashboard under Settings → Company Logo; hosted methods depend on merchant settings/capabilities. The dashboard opened at its login screen, and merchant sign-in was requested. These settings have **not** been changed or certified.

Web plans offered cards (Visa/Mastercard/mada), STC Pay and an unfinished Apple Pay path submitting `token: null`; Google Pay was absent. Removed the nonfunctional Apple Pay choice and reused existing card helpers. Web plans now expose cards and STC Pay. This does not change the provider-hosted invoice's method settings or guarantee merchant activation/device eligibility.

References: [Moyasar account settings](https://help.moyasar.com/en/article/moyasar-dashboard-account-settings-194t8x2/), [invoice API](https://docs.moyasar.com/api/invoices/01-create-invoice), [hosted invoice methods](https://docs.moyasar.com/ecommerce/woocommerce/methods).

### Follow-up verification

#### Domain registration completed (11 September 2026)

- Located the user-downloaded `apple-developer-merchantid-domain-association` in Downloads (228 bytes). Copied it unchanged into `halaa-web/public/.well-known/` and configured its text/plain header.
- Published only the exact verification endpoint through Caddy, using an inline response mirroring the public file so registration does not require deploying unrelated working-tree application changes. Updated the repository Caddyfile with the same endpoint for subsequent deployments. Keep the inline response and public file identical when replacing the association file.
- Production Caddy configuration was validated before graceful reload. Backup: `/opt/halaa/Caddyfile.before-apple-pay-20260911`. Existing application containers were not restarted or upgraded.
- Public HTTPS response: 200, text/plain, no redirect, 228 bytes. Downloaded/source/live SHA256 all equal `0A64C169855257B6F2FA0D544117498ED757084B8BB8C86B5972612D11C3D455`.
- Clicked Moyasar Validate; the Live Environment domain row now shows **registered** for `halaa.com.sa` (02:10 AM dashboard time).
- Reopened Account Information: merchant logo now points to an uploaded `logo.png` Active Storage asset instead of the provider default. The user's manual logo upload was saved.
- Domain registration is complete; this is not evidence of an end-to-end Apple Pay transaction or a completed Halaa plans Apple Pay UI implementation. No money was charged and no Apple certificates were changed.

The following earlier entry records the state before the file was downloaded and installed:

Merchant access follow-up: Signed into Moyasar and Apple Developer. Added `halaa.com.sa` under Moyasar Live Environment → Apple Pay - Domains; status is pending. Validate returned `Validation Failed: Server responded with status 404 Not Found`. The provider association file must be served at `https://halaa.com.sa/.well-known/apple-developer-merchantid-domain-association` before validation and registration. The browser's Domain Association download was clicked, but no file was available in the local Downloads directory. No certificate was created or revoked. Apple has no existing Merchant IDs, and Moyasar's existing certificate is Not configured. Web registration does not require creating an Apple Developer certificate. Company logo remains unchanged pending file upload. No Apple Pay activation or payment test has completed.

- Backend payment-link and billing regression suites: 60/60 passed.
- All web runtime suites: 55/55 passed on final source.
- Checkout/riyal presentation checks: 7/7 passed.
- Scoped JS/JSX lint: zero errors; existing shared-component warnings remain.
- Browser: actual paid record, Arabic Today filter, localized amount validation, create dialog interactions and recovery from obsolete cached code verified without submitting another invoice.
- Final production build passed (exit 0), including the payment-links route. Google Fonts DNS retries recovered during the build. Output: `data/local-runtime/payment-links-refactor-build-final.log`.
- Local listeners verified at web port 3001 and backend port 8000. No production deployment or live-money certification performed.
