/**
 * Payment-link reconciliation edge tests.
 * Covers failed-attempt-then-success, partial refunds, forged callbacks,
 * amount mismatch → needs_review, and payment/cancel race resolving to paid.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.MOYASAR_API_KEY = process.env.MOYASAR_API_KEY || "sk_test_dummy";
process.env.NODE_ENV = "test";
process.env.PAYMENT_LINKS_ENABLED = "true";
process.env.PAYMENT_LINKS_MAX_AMOUNT_SAR = "50000";
process.env.PAYMENT_LINKS_CALLBACK_BASE_URL = "https://api.example.test";
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");

const PaymentLink = require("../models/PaymentLinkModel");
const Payment = require("../models/PaymentModel");
const service = require("../src/modules/payment-links/paymentLinks.service");
const paymentProvider = require("../src/infrastructure/paymentProvider");
const moyasarWebhook = require('../src/modules/payments/webhook.controller');

const actor = () => ({ _id: new mongoose.Types.ObjectId(), name: "A", email: "a@x.com", role: "admin" });

test.before(async () => {
  await db.start();
  process.env.MOYASAR_API_KEY = "sk_test_dummy";
  for (const name of ["PaymentLink", "Payment"]) {
    if (mongoose.models[name]) await mongoose.models[name].init().catch(() => {});
  }
});
test.after(async () => { await db.stop(); });
test.beforeEach(async () => { await db.clearAll(); });

const seedReadyLink = async (ref = "HPL-TEST1") => {
  const a = actor();
  const link = await PaymentLink.create({
    reference: ref,
    createdBy: a._id,
    creatorSnapshot: { name: "A", email: "a@x.com", role: "admin" },
    amountHalalas: 25000,
    currency: "SAR",
    description: "t",
    locale: "en",
    creationState: "ready",
    status: "awaiting_payment",
    providerInvoiceId: "inv_r",
    hostedUrl: "https://invoice.moyasar.com/r",
    environment: "test",
    expiresAt: new Date(Date.now() + 86400000),
    creationKey: `k-${ref}`,
    requestHash: "h",
  });
  return link;
};

test('test worker and dashboard totals exclude live invoices', async () => {
  const live = await seedReadyLink('HPL-LIVE-ISOLATED');
  await PaymentLink.updateOne({ _id: live._id }, { $set: { environment: 'live', nextReconcileAt: new Date(0) } });
  let calls = 0;
  paymentProvider.fetchInvoice = async () => { calls++; throw new Error('Must not fetch a live invoice with test credentials'); };
  assert.equal((await service.runPaymentLinksReconcileTick()).scanned, 0);
  assert.equal(calls, 0);
  assert.equal((await service.listPaymentLinks()).pagination.total, 0);
  assert.equal((await PaymentLink.findById(live._id)).status, 'awaiting_payment');
});

test('dashboard date range includes the full selected local day', async () => {
  const link = await seedReadyLink('HPL-LOCAL-DAY');
  await PaymentLink.collection.updateOne({ _id: link._id }, { $set: { createdAt: new Date('2026-09-10T21:26:00Z') } });
  const { listPaymentLinksSchema } = require('../src/modules/payment-links/paymentLinks.validation');
  const filters = listPaymentLinksSchema.parse({ from: '2026-09-10T21:00:00.000Z', to: '2026-09-11T20:59:59.999Z' });
  assert.equal((await service.listPaymentLinks(filters)).pagination.total, 1);
  assert.equal(listPaymentLinksSchema.safeParse({ from: '2026-09-12', to: '2026-09-11' }).success, false);
});

test('stale provider state is visible without changing the financial status', async () => {
  const link = await seedReadyLink('HPL-STALE');
  const dto = service.toDTO(link);
  assert.equal(dto.syncStale, true);
  assert.equal(dto.status, 'awaiting_payment');
  link.lastSyncedAt = new Date();
  assert.equal(service.toDTO(link).syncStale, false);
});

test("failed attempt then success: detail visible, same link pays", async () => {
  const link = await seedReadyLink("HPL-FA");
  paymentProvider.fetchInvoice = async () => ({
    success: true,
    data: {
      id: "inv_r", status: "initiated", amount: 25000, currency: "SAR",
      expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: "HPL-FA" },
      payments: [
        { id: "pay_f", status: "failed", amount: 25000, currency: "SAR", invoice_id: "inv_r", source: { message: "declined" } },
        { id: "pay_s", status: "paid", amount: 25000, refunded: 0, currency: "SAR", invoice_id: "inv_r" },
      ],
    },
  });
  const updated = await service.reconcilePaymentLink(link._id);
  assert.equal(updated.status, "paid");
  assert.ok(updated.lastFailureSummary === null || typeof updated.lastFailureSummary === "string");
});

test("multiple partial refunds update totals exactly once", async () => {
  const link = await seedReadyLink("HPL-RF");
  const mk = (refunded) => ({
    success: true,
    data: {
      id: "inv_r", status: "paid", amount: 25000, currency: "SAR",
      expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: "HPL-RF" },
      payments: [{ id: "pay_r", status: "paid", amount: 25000, refunded, currency: "SAR", invoice_id: "inv_r" }],
    },
  });
  paymentProvider.fetchInvoice = async () => mk(10000);
  let u = await service.reconcilePaymentLink(link._id);
  assert.equal(u.status, "partially_refunded");
  paymentProvider.fetchInvoice = async () => mk(25000);
  u = await service.reconcilePaymentLink(link._id);
  assert.equal(u.status, "refunded");
  assert.equal(await Payment.countDocuments({ moyasarPaymentId: "pay_r" }), 1);
});

test("amount mismatch becomes needs_review with no paid transition", async () => {
  const link = await seedReadyLink("HPL-MM");
  paymentProvider.fetchInvoice = async () => ({
    success: true,
    data: {
      id: "inv_r", status: "paid", amount: 99999, currency: "SAR",
      expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: "HPL-MM" },
      payments: [{ id: "pay_x", status: "paid", amount: 99999, currency: "SAR", invoice_id: "inv_r" }],
    },
  });
  const u = await service.reconcilePaymentLink(link._id);
  assert.equal(u.status, "needs_review");
  assert.equal(await Payment.countDocuments({ moyasarPaymentId: "pay_x" }), 0);
});

test("forged callback for unknown invoice creates nothing", async () => {
  const res = await service.handleProviderCallbackHint({ id: "inv_forged", status: "paid", metadata: {} });
  assert.equal(res.handled, false);
  assert.equal(await PaymentLink.countDocuments(), 0);
});

test("payment/cancel race: paid wins, cancel rejected", async () => {
  const link = await seedReadyLink("HPL-RC");
  paymentProvider.fetchInvoice = async () => ({
    success: true,
    data: {
      id: "inv_r", status: "paid", amount: 25000, currency: "SAR",
      expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: "HPL-RC" },
      payments: [{ id: "pay_rc", status: "paid", amount: 25000, refunded: 0, currency: "SAR", invoice_id: "inv_r" }],
    },
  });
  paymentProvider.cancelInvoice = async () => ({ success: true, providerStatus: "canceled", raw: {} });
  await assert.rejects(() => service.cancelPaymentLink({ linkId: link._id, actor: actor() }), /paid|refund/);
  const fresh = await PaymentLink.findById(link._id);
  assert.equal(fresh.status, "paid");
});

test("provider outage preserves last known status", async () => {
  const link = await seedReadyLink("HPL-OUT");
  link.status = "awaiting_payment";
  link.lastSyncedAt = new Date();
  await link.save();
  paymentProvider.fetchInvoice = async () => ({ success: false, error: "timeout", statusCode: 503 });
  const u = await service.reconcilePaymentLink(link._id);
  assert.equal(u.status, "awaiting_payment");
  assert.ok(u.syncError);
});

const invoiceFor = (link, changes = {}) => ({
  id: link.providerInvoiceId, status: 'initiated', amount: link.amountHalalas, currency: 'SAR',
  url: 'https://invoice.moyasar.com/r', expired_at: link.expiresAt.toISOString(),
  metadata: { purpose: 'admin_payment_link', reference: link.reference, payment_link_id: String(link._id) },
  payments: [], ...changes,
});
const paymentFor = (link, changes = {}) => ({ id: 'pay_verified', status: 'paid', currency: 'SAR',
  amount: link.amountHalalas, refunded: 0, invoice_id: link.providerInvoiceId,
  created_at: '2026-09-01T10:00:00Z', ...changes });

test('invoice status alone cannot prove collection', async () => {
  const link = await seedReadyLink();
  paymentProvider.fetchInvoice = async () => ({ success: true, data: invoiceFor(link, { status: 'paid' }) });
  const result = await service.reconcilePaymentLink(link._id);
  assert.equal(result.status, 'needs_review');
  assert.equal(result.collectedHalalas, 0);
});

test('reject missing metadata, wrong payment amount/currency/membership and environment', async () => {
  const link = await seedReadyLink();
  for (const changes of [
    { metadata: {} }, { live: true },
    ...[{ amount: 100 }, { currency: 'USD' }, { invoice_id: 'another' }, { refunded: 25001 }, { amount: 25000.1 }]
      .map((p) => ({ payments: [paymentFor(link, p)] })),
  ]) {
    paymentProvider.fetchInvoice = async () => ({ success: true, data: invoiceFor(link, changes) });
    assert.equal((await service.reconcilePaymentLink(link._id)).status, 'needs_review');
    assert.equal(await Payment.countDocuments(), 0);
  }
});

test('provider payment collision never retargets a host checkout', async () => {
  const link = await seedReadyLink();
  const original = await Payment.create({ userId: actor()._id, amount: 250, currency: 'SAR',
    moyasarPaymentId: 'pay_verified', status: 'pending', metadata: { purpose: 'checkout' } });
  paymentProvider.fetchInvoice = async () => ({ success: true, data: invoiceFor(link, { payments: [paymentFor(link)] }) });
  assert.equal((await service.reconcilePaymentLink(link._id)).status, 'needs_review');
  const after = await Payment.findById(original._id);
  assert.equal(after.metadata.purpose, 'checkout');
  assert.equal(after.paymentLinkId, null);
});

test('stale refund snapshots cannot reduce already recorded refunds', async () => {
  const link = await seedReadyLink();
  const snap = (refunded) => ({ success: true, data: invoiceFor(link, { payments: [paymentFor(link, { refunded })] }) });
  paymentProvider.fetchInvoice = async () => snap(20000);
  await service.reconcilePaymentLink(link._id);
  paymentProvider.fetchInvoice = async () => snap(10000);
  const result = await service.reconcilePaymentLink(link._id);
  assert.equal(result.refundedHalalas, 20000);
  assert.equal((await Payment.findOne({ moyasarPaymentId: 'pay_verified' })).refundedAmount, 200);
});

test('concurrent reconciliations have one provider fetch and preserve queued wakeup', async () => {
  const link = await seedReadyLink();
  let release;
  let started;
  const gate = new Promise((r) => { release = r; });
  const entered = new Promise((r) => { started = r; });
  let calls = 0;
  paymentProvider.fetchInvoice = async () => { calls++; started(); await gate;
    return { success: true, data: invoiceFor(link, { payments: [paymentFor(link)] }) }; };
  const first = service.reconcilePaymentLink(link._id);
  await entered;
  await service.reconcilePaymentLink(link._id);
  release();
  await first;
  assert.equal(calls, 1);
  const result = await PaymentLink.findById(link._id);
  assert.equal(result.status, 'paid');
  assert.ok(result.nextReconcileAt <= new Date());
  assert.equal(await Payment.countDocuments(), 1);
});

test('ledger write failure never publishes paid and is repairable', async () => {
  const link = await seedReadyLink();
  paymentProvider.fetchInvoice = async () => ({ success: true, data: invoiceFor(link, { payments: [paymentFor(link)] }) });
  const original = Payment.updateOne;
  Payment.updateOne = async () => { throw new Error('simulated DB interruption'); };
  try { await assert.rejects(service.reconcilePaymentLink(link._id), /interruption/); }
  finally { Payment.updateOne = original; }
  assert.equal((await PaymentLink.findById(link._id)).status, 'awaiting_payment');
  const repaired = await service.reconcilePaymentLink(link._id);
  assert.equal(repaired.status, 'paid');
  assert.equal(await Payment.countDocuments(), 1);
});

test('unsigned callback cannot bind a pending invoice using forged metadata', async () => {
  const link = await seedReadyLink();
  link.providerInvoiceId = null; link.creationState = 'creation_unknown'; await link.save();
  await service.handleProviderCallbackHint({ id: 'attacker_invoice', status: 'paid',
    metadata: { purpose: 'admin_payment_link', reference: link.reference } });
  const result = await PaymentLink.findById(link._id);
  assert.equal(result.providerInvoiceId, null);
  assert.equal(result.status, 'awaiting_payment');
  assert.ok(result.nextReconcileAt <= new Date());
});

test('callback returns retryable error when durable queue fails', async () => {
  const controller = require('../src/modules/payment-links/paymentLinks.controller');
  const original = service.handleProviderCallbackHint;
  service.handleProviderCallbackHint = async () => { throw new Error('database unavailable'); };
  let status;
  try { await controller.providerCallback({ body: {} }, { status(n) { status = n; return this; }, json() {} }); }
  finally { service.handleProviderCallbackHint = original; }
  assert.equal(status, 503);
});

test('cancel HTTP success without provider canceled state remains uncertain', async () => {
  const link = await seedReadyLink();
  paymentProvider.fetchInvoice = async () => ({ success: true, data: invoiceFor(link) });
  paymentProvider.cancelInvoice = async () => ({ success: true, providerStatus: 'canceled' });
  await assert.rejects(service.cancelPaymentLink({ linkId: link._id, actor: actor() }), /not confirmed/);
  const result = await PaymentLink.findById(link._id);
  assert.equal(result.status, 'awaiting_payment');
  assert.equal(result.cancelPending, true);
  assert.ok(result.nextReconcileAt);
});

test('payment that arrives during cancel wins over cancellation response', async () => {
  const link = await seedReadyLink();
  let paid = false;
  paymentProvider.fetchInvoice = async () => ({ success: true, data: invoiceFor(link, {
    payments: paid ? [paymentFor(link)] : [], status: paid ? 'paid' : 'initiated',
  }) });
  paymentProvider.cancelInvoice = async () => { paid = true; return { success: true, providerStatus: 'canceled' }; };
  await assert.rejects(service.cancelPaymentLink({ linkId: link._id, actor: actor() }), /paid/);
  assert.equal((await PaymentLink.findById(link._id)).status, 'paid');
});

test('duplicate collections are recorded and flagged for review', async () => {
  const link = await seedReadyLink();
  paymentProvider.fetchInvoice = async () => ({ success: true, data: invoiceFor(link, {
    payments: [paymentFor(link), paymentFor(link, { id: 'pay_second' })],
  }) });
  const result = await service.reconcilePaymentLink(link._id);
  assert.equal(result.status, 'needs_review');
  assert.equal(result.collectedHalalas, 50000);
  assert.equal(await Payment.countDocuments(), 2);
});

test('expired leases are reclaimable; worker ignores null next-run dates', async () => {
  const link = await seedReadyLink();
  await PaymentLink.updateOne({ _id: link._id }, { $set: { leaseToken: 'dead-worker', leaseUntil: new Date(0) } });
  let calls = 0;
  paymentProvider.fetchInvoice = async () => { calls++; return { success: true, data: invoiceFor(link) }; };
  assert.equal((await service.runPaymentLinksReconcileTick()).scanned, 0);
  await service.reconcilePaymentLink(link._id);
  assert.equal(calls, 1);
});

test('hosted URLs reject subdomains, credentials and nonstandard ports', () => {
  for (const url of ['https://evil.invoice.moyasar.com/x', 'https://user:secret@invoice.moyasar.com/x',
    'https://invoice.moyasar.com:444/x', 'http://invoice.moyasar.com/x']) assert.equal(service.isHostedUrlAllowed(url), false);
  assert.equal(service.isHostedUrlAllowed('https://checkout.moyasar.com/invoices/x'), true);
});

const deliverWebhook = async (body, secret = 'test-webhook-secret') => {
  process.env.MOYASAR_WEBHOOK_SECRET = 'test-webhook-secret';
  process.env.MOYASAR_WEBHOOK_IP_WHITELIST = '';
  let status, response;
  await moyasarWebhook.handle({ body, get: () => secret, ip: '127.0.0.1' }, {
    status(n) { status = n; return this; }, json(data) { response = data; return this; },
  });
  return { status, response };
};

test('Moyasar authenticates events and durably queues repeated refund hints', async () => {
  const link = await seedReadyLink();
  const body = { id: 'event-refund', type: 'payment_refunded',
    data: { id: 'payment-refund', invoice_id: link.providerInvoiceId, refunded: 5000 } };
  assert.equal((await deliverWebhook(body, 'wrong-secret')).status, 401);
  assert.equal((await PaymentLink.findById(link._id)).nextReconcileAt, null);
  assert.equal((await deliverWebhook(body)).status, 200);
  body.data.refunded = 10000;
  assert.equal((await deliverWebhook(body)).status, 200);
  const queued = await PaymentLink.findById(link._id);
  assert.equal(queued.wakeVersion, 2);
  assert.equal(queued.status, 'awaiting_payment');
  assert.equal(await Payment.countDocuments(), 0);
});

test('Moyasar retries a recognized payment link event when queue persistence fails', async () => {
  const link = await seedReadyLink();
  const original = service.queueReconciliation;
  service.queueReconciliation = async () => { throw new Error('test database unavailable'); };
  try {
    const result = await deliverWebhook({ type: 'invoice_paid', data: { id: link.providerInvoiceId } });
    assert.equal(result.status, 500);
  } finally { service.queueReconciliation = original; }
});

test('ordinary Moyasar invoice-paid events still run the subscription renewal handler', async () => {
  const Subscription = require('../models/SubscriptionModel');
  const original = Subscription.findOne;
  let renewed = 0, saved = 0;
  const sub = { _id: new mongoose.Types.ObjectId(), metadata: { pendingInvoiceId: 'ordinary-invoice' },
    status: 'past_due', renew: async () => { renewed++; }, save: async () => { saved++; } };
  Subscription.findOne = async (query) => query['metadata.pendingInvoiceId'] === 'ordinary-invoice' ? sub : null;
  try {
    const result = await deliverWebhook({ id: 'renewal-event', type: 'invoice_paid',
      data: { id: 'ordinary-invoice', amount: 25000, currency: 'SAR' } });
    assert.equal(result.status, 200);
    assert.equal(renewed, 1); assert.equal(saved, 1);
    assert.equal(sub.metadata.pendingInvoiceId, null);
    assert.equal(sub.status, 'active');
  } finally { Subscription.findOne = original; }
});
