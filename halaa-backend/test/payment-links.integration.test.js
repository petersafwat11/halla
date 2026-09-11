/**
 * Payment-links integration tests.
 * Real MongoMemoryReplSet: durable creation idempotency (same key/input →
 * same request; same key/different input → 409), guest Payment invariants,
 * and paid-sticky reconciliation.
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
const { canManagePaymentLinks } = require("../src/shared/constants/permissions");

const actor = (over = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
  ...over,
});

test.before(async () => {
  await db.start();
  process.env.MOYASAR_API_KEY = "sk_test_dummy";
  for (const name of ["PaymentLink", "Payment"]) {
    if (mongoose.models[name]) await mongoose.models[name].init().catch(() => {});
  }
});
test.after(async () => { await db.stop(); });
test.beforeEach(async () => { await db.clearAll(); });

test("same idempotency key + same input returns one durable intent", async () => {
  paymentProvider.createInvoiceMinor = async (input) => {
    const invoice = { id: "inv_created", url: "https://invoice.moyasar.com/a", status: "initiated",
      amount: input.amountHalalas, currency: "SAR", expired_at: input.expireAt, metadata: input.metadata, payments: [] };
    paymentProvider.fetchInvoice = async () => ({ success: true, data: invoice });
    return { success: true, invoiceId: invoice.id, url: invoice.url, raw: invoice };
  };
  const a = actor();
  const body = { amountSar: "250.50", expiresInDays: 7, locale: "en" };
  const r1 = await service.createPaymentLink({ actor: a, body, creationKey: "k-1" });
  const r2 = await service.createPaymentLink({ actor: a, body, creationKey: "k-1" });
  assert.equal(String(r1.link._id), String(r2.link._id));
  assert.equal(await PaymentLink.countDocuments(), 1);
});

test("same key + different input returns conflict", async () => {
  paymentProvider.createInvoiceMinor = async (input) => {
    const invoice = { id: "inv_created", url: "https://invoice.moyasar.com/a", status: "initiated",
      amount: input.amountHalalas, currency: "SAR", expired_at: input.expireAt, metadata: input.metadata, payments: [] };
    paymentProvider.fetchInvoice = async () => ({ success: true, data: invoice });
    return { success: true, invoiceId: invoice.id, url: invoice.url, raw: invoice };
  };
  const a = actor();
  await service.createPaymentLink({ actor: a, body: { amountSar: "250", expiresInDays: 7 }, creationKey: "k-2" });
  await assert.rejects(
    () => service.createPaymentLink({ actor: a, body: { amountSar: "300", expiresInDays: 7 }, creationKey: "k-2" }),
    /different input/
  );
});

test("timeout after dispatch becomes creation_unknown without second create", async () => {
  let calls = 0;
  paymentProvider.createInvoiceMinor = async () => {
    calls += 1;
    const err = new Error("timeout");
    err.code = "ETIMEDOUT";
    throw err;
  };
  paymentProvider.listInvoices = async () => ({ success: true, invoices: [], raw: {} });
  const a = actor();
  const { link, httpStatus } = await service.createPaymentLink({
    actor: a, body: { amountSar: "100", expiresInDays: 1 }, creationKey: "k-3",
  });
  assert.equal(httpStatus, 202);
  assert.equal(link.creationState, "creation_unknown");
  assert.equal(calls, 1);
  // Recovery poll with no matches keeps uncertainty, no extra create call.
  const recovered = await service.reconcilePaymentLink(link._id);
  assert.equal(recovered.creationState, "creation_unknown");
  assert.equal(calls, 1);
});

test("recovery adopts the original invoice by metadata without a second create", async () => {
  let calls = 0;
  paymentProvider.createInvoiceMinor = async () => {
    calls += 1;
    throw new Error("socket hang up");
  };
  const a = actor();
  const { link } = await service.createPaymentLink({
    actor: a, body: { amountSar: "250", expiresInDays: 7 }, creationKey: "k-4",
  });
  paymentProvider.listInvoices = async () => ({
    success: true,
    invoices: [
      { id: "inv_orig", url: "https://invoice.moyasar.com/orig", status: "initiated", amount: 25000, currency: "SAR", expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: link.reference } },
    ],
    totalPages: 1, raw: {},
  });
  paymentProvider.fetchInvoice = async () => ({
    success: true, data: { id: "inv_orig", url: "https://invoice.moyasar.com/orig", status: "initiated", amount: 25000, currency: "SAR", expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: link.reference }, payments: [] },
  });
  const recovered = await service.reconcilePaymentLink(link._id);
  assert.equal(recovered.providerInvoiceId, "inv_orig");
  assert.equal(recovered.creationState, "ready");
  assert.equal(calls, 1);
});

test("verified paid is sticky against stale failed snapshots", async () => {
  paymentProvider.createInvoiceMinor = async (input) => {
    const invoice = { id: "inv_created", url: "https://invoice.moyasar.com/a", status: "initiated",
      amount: input.amountHalalas, currency: "SAR", expired_at: input.expireAt, metadata: input.metadata, payments: [] };
    paymentProvider.fetchInvoice = async () => ({ success: true, data: invoice });
    return { success: true, invoiceId: invoice.id, url: invoice.url, raw: invoice };
  };
  const a = actor();
  const { link } = await service.createPaymentLink({
    actor: a, body: { amountSar: "250", expiresInDays: 7 }, creationKey: "k-5",
  });
  paymentProvider.fetchInvoice = async () => ({
    success: true,
    data: {
      id: "inv_created", status: "paid", amount: 25000, currency: "SAR",
      expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: link.reference },
      payments: [{ id: "pay_1", status: "paid", amount: 25000, refunded: 0, currency: "SAR", invoice_id: "inv_created" }],
    },
  });
  const paid = await service.reconcilePaymentLink(link._id);
  assert.equal(paid.status, "paid");
  assert.equal(await Payment.countDocuments({ moyasarPaymentId: "pay_1" }), 1);
  const guest = await Payment.findOne({ moyasarPaymentId: "pay_1" });
  assert.equal(guest.userId, null);
  assert.ok(guest.paymentLinkId);
  // Stale failed snapshot must not overwrite verified paid.
  paymentProvider.fetchInvoice = async () => ({
    success: true,
    data: {
      id: "inv_created", status: "failed", amount: 25000, currency: "SAR",
      expired_at: link.expiresAt.toISOString(), metadata: { purpose: "admin_payment_link", payment_link_id: String(link._id), reference: link.reference },
      payments: [{ id: "pay_1", status: "paid", amount: 25000, refunded: 0, currency: "SAR", invoice_id: "inv_created" }],
    },
  });
  const still = await service.reconcilePaymentLink(link._id);
  assert.equal(still.status, "paid");
});

test("authorization: moderator VIEW can manage links; NONE/host/unauth denied", () => {
  const mod = { role: "moderator", pageAccess: undefined };
  assert.equal(canManagePaymentLinks(mod), true);
  assert.equal(canManagePaymentLinks({ role: "moderator", pageAccess: { payments: "none" } }), false);
  assert.equal(canManagePaymentLinks({ role: "host" }), false);
  assert.equal(canManagePaymentLinks(null), false);
  assert.equal(canManagePaymentLinks({ role: "super_admin" }), true);
});

test('simultaneous creation requests publish one invoice and one intent', async () => {
  let calls = 0;
  paymentProvider.createInvoiceMinor = async (input) => {
    calls++;
    const invoice = { id: 'inv_concurrent', amount: input.amountHalalas, currency: 'SAR',
      status: 'initiated', expired_at: input.expireAt, metadata: input.metadata,
      url: 'https://checkout.moyasar.com/invoices/test', payments: [] };
    paymentProvider.fetchInvoice = async () => ({ success: true, data: invoice });
    return { success: true, raw: invoice };
  };
  const request = { actor: actor(), body: { amountSar: '250', expiresInDays: 7 }, creationKey: 'parallel-key' };
  const results = await Promise.all(Array.from({ length: 5 }, () => service.createPaymentLink(request)));
  assert.equal(calls, 1);
  assert.equal(new Set(results.map((r) => String(r.link._id))).size, 1);
  assert.equal(await PaymentLink.countDocuments(), 1);
});

test('guest link invariants reject missing links and entitlement targets', async () => {
  const base = { amount: 250, currency: 'SAR', metadata: { purpose: 'admin_payment_link' } };
  await assert.rejects(new Payment(base).validate(), /require/);
  await assert.rejects(new Payment({ ...base, paymentLinkId: new mongoose.Types.ObjectId(),
    subscriptionId: new mongoose.Types.ObjectId() }).validate(), /entitlements/);
  await assert.rejects(new Payment({ ...base, paymentLinkId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId() }).validate(), /payer/);
});
