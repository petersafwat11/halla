/**
 * Static-checks for the payments stack (PAYMENT_SYSTEM_COMPLETION_PLAN §10.3 / §15.8).
 *
 * Pure-text scan — no `require()` of project modules so it runs even
 * without `npm install`. Asserts the post-cutover invariants:
 *   1. Provider factory exposes the new methods.
 *   2. PaymentModel statics carry the lifecycle enum (PENDING_3DS, etc.).
 *   3. app.js mounts /payments under /api/v2.
 *   4. scheduledTasks.js calls schedulePaymentReconcile() from initScheduledTasks.
 *   5. Webhook controller consults MOYASAR_WEBHOOK_SECRET.
 *
 * Run as: `node scripts/static-checks-payments.js`
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let checks = 0;
const ok = (label) => {
  checks += 1;
  // eslint-disable-next-line no-console
  console.log(`  [✓] ${label}`);
};

// 1. Provider factory exposes the new methods.
const factorySrc = read('src/infrastructure/paymentProvider/index.js');
['charge', 'refund', 'capture', 'voidPayment', 'fetchPayment'].forEach((m) => {
  assert(
    new RegExp(`\\b${m}\\b`).test(factorySrc),
    `paymentProvider factory does not expose ${m}`
  );
});
ok('paymentProvider factory exposes charge/refund/capture/voidPayment/fetchPayment');

// 2. PaymentModel statics carry the lifecycle enum.
const paymentModelSrc = read('models/PaymentModel.js');
assert(
  /PENDING_3DS:\s*['"]pending_3ds['"]/.test(paymentModelSrc),
  'PaymentModel.PAYMENT_STATUS.PENDING_3DS missing'
);
assert(
  /PARTIALLY_REFUNDED:\s*['"]partially_refunded['"]/.test(paymentModelSrc),
  'PaymentModel.PAYMENT_STATUS.PARTIALLY_REFUNDED missing'
);
ok('PaymentModel exposes PENDING_3DS and PARTIALLY_REFUNDED enum values');

// 3. app.js mounts /payments under /api/v2.
const appSrc = read('src/app.js');
assert(
  appSrc.includes('paymentsRoutes') && appSrc.includes('`${prefix}/payments`'),
  '/payments routes not mounted on app.js'
);
ok('app.js mounts /payments routes under the /api/v2 prefix');

// 4. scheduledTasks initialises the reconcile cron.
const tasksSrc = read('src/shared/utils/scheduledTasks.js');
assert(
  tasksSrc.includes('schedulePaymentReconcile()'),
  'schedulePaymentReconcile() not invoked from initScheduledTasks'
);
assert(
  tasksSrc.includes('scheduleSubscriptionRenewal()'),
  'scheduleSubscriptionRenewal() not invoked from initScheduledTasks'
);
ok('scheduledTasks.js wires schedulePaymentReconcile + scheduleSubscriptionRenewal');

// 5. Webhook secret env var is referenced + constant-time compare in place.
const webhookSrc = read('src/modules/payments/webhook.controller.js');
assert(
  webhookSrc.includes('MOYASAR_WEBHOOK_SECRET'),
  'webhook handler does not consult MOYASAR_WEBHOOK_SECRET'
);
assert(
  webhookSrc.includes('timingSafeEqual'),
  'webhook handler missing constant-time secret compare'
);
ok('webhook.controller.js consults MOYASAR_WEBHOOK_SECRET via timingSafeEqual');

// 6. Idempotency wrapped charge.
assert(
  factorySrc.includes('withIdempotency') && factorySrc.includes('payment.charge'),
  'paymentProvider.charge does not flow through withIdempotency(payment.charge)'
);
ok('paymentProvider.charge flows through withIdempotency(scope: payment.charge)');

// 7. Moyasar uses given_id, not Idempotency-Key header.
const moyasarSrc = read('src/infrastructure/paymentProvider/moyasar.js');
assert(
  moyasarSrc.includes('given_id'),
  'moyasar.js does not include given_id idempotency field'
);
assert(
  !moyasarSrc.match(/['"]Idempotency-Key['"]\s*:/),
  'moyasar.js still uses Idempotency-Key header (should use given_id body field)'
);
ok('moyasar.js uses given_id (no Idempotency-Key HTTP header)');

// 8. Addons service writes Payment rows + finalize3ds path.
const addonSvcSrc = read('src/modules/addons/addons.service.js');
assert(
  addonSvcSrc.includes('finalizePending3ds') && addonSvcSrc.includes('PaymentModel'),
  'addons.service.js missing Payment write or finalize3ds'
);
ok('addons.service.js writes Payment rows and exposes finalizePending3ds');

// 9. Checkout service is the canonical finalization path (subscriptions
// no longer owns its own subscribe-3DS finalization).
const checkoutSvcSrc = read('src/modules/payments/checkout.service.js');
assert(
  checkoutSvcSrc.includes('finalizePending3ds') && checkoutSvcSrc.includes('PaymentModel'),
  'checkout.service.js missing Payment write or finalize3ds'
);
ok('checkout.service.js writes Payment rows and exposes finalizePending3ds');

// 10. Legacy paymentTransactionId removed from getSummary; replaced with paymentId.
const subModelSrc = read('models/SubscriptionModel.js');
assert(
  !/paymentTransactionId:\s*this\.metadata\?\.paymentTransactionId/.test(subModelSrc),
  'SubscriptionModel.getSummary still exposes paymentTransactionId — should be paymentId'
);
assert(
  /paymentId:\s*this\.metadata\?\.paymentId/.test(subModelSrc),
  'SubscriptionModel.getSummary should expose paymentId'
);
ok('SubscriptionModel.getSummary exposes paymentId (legacy paymentTransactionId removed)');

// 11. Legacy PAYMENT_STATUS constant removed.
const constantsSrc = read('src/shared/constants/status.js');
assert(
  !/^const PAYMENT_STATUS = \{/m.test(constantsSrc),
  'shared/constants/status.js still defines legacy PAYMENT_STATUS — should live on PaymentModel only'
);
ok('shared/constants/status.js no longer defines legacy PAYMENT_STATUS');

// 12. Admin payments routes include summary + detail + write actions.
const paymentsRoutesSrc = read('src/modules/payments/payments.routes.js');
assert(
  /\/:id\/refund/.test(paymentsRoutesSrc) &&
    /\/:id\/capture/.test(paymentsRoutesSrc) &&
    /\/:id\/void/.test(paymentsRoutesSrc),
  'payments.routes.js missing refund/capture/void admin actions'
);
// Admin write actions are gated by the CURRENT permission architecture —
// requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage') — not the obsolete
// restrictTo(SUPER_ADMIN, ADMIN) text. The 'manage' verb resolves to FULL
// access AND role ∈ {SUPER_ADMIN, ADMIN} in canAccessPage (permissions.js).
assert(
  /requirePageAccess\(\s*ADMIN_PAGES\.PAYMENTS\s*,\s*['"]manage['"]\s*\)/.test(paymentsRoutesSrc),
  "payments.routes.js admin write actions not gated by requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage')"
);
ok("payments.routes.js gates refund/capture/void via requirePageAccess(PAYMENTS,'manage')");

// 13. AddonModel status enum extended with pending_3ds.
const addonModelSrc = read('models/AddonModel.js');
assert(
  /'pending_3ds'/.test(addonModelSrc),
  'AddonModel status enum missing pending_3ds value'
);
ok('AddonModel status enum includes pending_3ds');

// 14. Backfill script exists.
assert(
  fs.existsSync(path.join(root, 'scripts/backfill-payments.js')),
  'scripts/backfill-payments.js missing'
);
ok('scripts/backfill-payments.js exists');

// 15. Joi env schema has Moyasar entries.
const envSrc = read('src/config/env.js');
assert(
  envSrc.includes('MOYASAR_API_KEY') && envSrc.includes('MOYASAR_WEBHOOK_SECRET'),
  'env.js Joi schema missing Moyasar entries'
);
ok('env.js Joi schema declares MOYASAR_* entries');

// 16. AuditLog targetType enum includes "payment" — refund / capture /
// void / webhook / pending_refund all write rows with that target.
const auditLogSrc = read('models/AuditLogModel.js');
assert(
  /['"]payment['"]\s*,/.test(auditLogSrc),
  'AuditLogModel targetType enum missing "payment" — webhook + admin actions will silently drop audit rows'
);
ok('AuditLogModel.targetType enum includes "payment"');

// 17. No leftover paymentTransactionId writes in the active service paths.
// (subSvcSrc was previously undefined here — a dormant bug masked by check #12
// exiting first; defined now so the suite runs to completion. addonSvcSrc is
// already read above at check #7.)
const subSvcSrc = read('src/modules/subscriptions/subscriptions.service.js');
const subSvcLegacy = subSvcSrc.match(/paymentTransactionId\s*[=:]\s*[^/]/g) || [];
assert(
  subSvcLegacy.length === 0,
  `subscriptions.service.js still writes paymentTransactionId (${subSvcLegacy.length} sites) — should use paymentId`
);
const addonSvcLegacy = addonSvcSrc.match(/paymentTransactionId\s*[=:]\s*[^/]/g) || [];
assert(
  addonSvcLegacy.length === 0,
  `addons.service.js still writes paymentTransactionId (${addonSvcLegacy.length} sites) — should use paymentId`
);
ok('subscriptions/addons services no longer write paymentTransactionId');

// 18. Shared FE api paths declare hostPayments + payments.refund/capture/void.
// (Repointed from the removed labbe/services/new-backend/api.config.js to the
// current canonical shared paths module consumed by web + mobile — a stale-path
// fix, dormant until check #12 stopped exiting early.)
const feApiSrc = read('../shared/src/api/paths.js');
assert(
  /hostPayments:\s*\{/.test(feApiSrc) &&
    /poll3ds:/.test(feApiSrc) &&
    /payments:\s*\{[\s\S]*refund:/.test(feApiSrc) &&
    /capture:/.test(feApiSrc) &&
    /void:/.test(feApiSrc),
  'shared/src/api/paths.js missing hostPayments or payments admin write paths'
);
ok('shared/src/api/paths.js declares hostPayments + payments.refund/capture/void');

// eslint-disable-next-line no-console
console.log(`\nstatic-checks-payments: OK (${checks} / 18)`);
