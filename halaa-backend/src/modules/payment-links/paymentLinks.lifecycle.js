/** Durable invoice lifecycle. Provider payloads are evidence only after a secret-key fetch.
 * All writers share a Mongo lease; payment projections are replayable after a crash.
 */
const crypto = require('crypto');
const PaymentLink = require('../../../models/PaymentLinkModel');
const Payment = require('../../../models/PaymentModel');
const provider = require('../../infrastructure/paymentProvider');
const { ValidationError, NotFoundError, ConflictError } = require('../../shared/errors');
const { logAudit } = require('../../shared/utils/auditLog');
const PURPOSE = 'admin_payment_link';
const SUCCESS = ['paid', 'captured', 'partially_refunded', 'refunded'];
const LEASE_MS = 120000;
const delay = (ms) => new Date(Date.now() + ms);
const audit = (link, action, actor) => logAudit({ action: `payment_link.${action}`,
  actor: actor || { _id: null, role: 'system' }, targetType: 'payment_link', targetId: link._id,
  metadata: { reference: link.reference, status: link.status } });
const environment = () => {
  const key = process.env.MOYASAR_API_KEY || '';
  if (/^sk_live_/.test(key)) return 'live';
  if (/^sk_test_/.test(key)) return 'test';
  throw new ValidationError('Payment provider environment cannot be verified');
};
const isInvoiceId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);

module.exports = ({ paymentLinksConfig, isHostedUrlAllowed, validateCreateInput, defaultDescription, buildCallbackUrl }) => {
  // Notifications only schedule work; no unsigned data can bind an invoice or move money.
  const queueReconciliation = async (id) => {
    const result = await PaymentLink.updateOne({ _id: id }, {
      $set: { nextReconcileAt: new Date() }, $inc: { wakeVersion: 1 },
    });
    if (!result.matchedCount) throw new NotFoundError('PaymentLink');
  };

  const claim = async (id) => {
    const token = crypto.randomUUID();
    const link = await PaymentLink.findOneAndUpdate({ _id: id,
      $or: [{ leaseUntil: null }, { leaseUntil: { $lte: new Date() } }],
    }, { $set: { leaseToken: token, leaseUntil: delay(LEASE_MS) }, $inc: { reconcileVersion: 1 } },
    { new: true }).select('+leaseToken');
    return link;
  };
  const persist = async (link, fields) => {
    // A notification received during provider I/O must survive this projection.
    const updated = await PaymentLink.findOneAndUpdate({ _id: link._id,
      leaseToken: link.leaseToken, leaseUntil: { $gt: new Date() },
    }, [{ $set: { ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { $literal: v }])),
      nextReconcileAt: { $cond: [{ $gt: [{ $ifNull: ['$wakeVersion', 0] }, link.wakeVersion || 0] },
        new Date(), { $literal: fields.nextReconcileAt ?? null }] },
    } }], { new: true }).select('+leaseToken');
    if (!updated) throw new ConflictError('Payment link is being checked; please refresh');
    return updated;
  };
  const withLease = async (id, work, { busyIsConflict = false } = {}) => {
    const link = await claim(id);
    if (!link) {
      const current = await PaymentLink.findById(id);
      if (!current) throw new NotFoundError('PaymentLink');
      await queueReconciliation(id);
      if (busyIsConflict) throw new ConflictError('Payment link is being checked; please retry');
      current.$locals.reconcileQueued = true;
      return current;
    }
    try { return await work(link); }
    catch (error) {
      await PaymentLink.updateOne({ _id: id, leaseToken: link.leaseToken }, {
        $set: { nextReconcileAt: delay(60000), syncError: 'Check incomplete; retry scheduled' },
      });
      throw error;
    } finally {
      await PaymentLink.updateOne({ _id: id, leaseToken: link.leaseToken }, {
        $set: { leaseToken: null, leaseUntil: null },
      });
    }
  };
  const invoiceMatches = (link, inv, expectedId = link.providerInvoiceId) =>
    isInvoiceId(inv?.id) && (!expectedId || inv.id === expectedId) &&
    environment() === link.environment && (inv.live === undefined || inv.live === (link.environment === 'live')) &&
    inv.currency === 'SAR' && Number.isSafeInteger(inv.amount) && inv.amount === link.amountHalalas &&
    Number.isFinite(Date.parse(inv.expired_at)) && Math.abs(Date.parse(inv.expired_at) - new Date(link.expiresAt).getTime()) < 1000 &&
    inv.metadata?.reference === link.reference && inv.metadata?.purpose === PURPOSE &&
    inv.metadata?.payment_link_id === String(link._id);
  const review = (link, reason) => persist(link, { status: 'needs_review', syncError: reason,
    nextReconcileAt: delay(600000) });

  const project = async (link) => {
    if (environment() !== link.environment) return review(link, 'Provider environment differs from this request');
    const fetched = await provider.fetchInvoice(link.providerInvoiceId);
    if (!fetched.success) return persist(link, { syncError: 'Provider check unavailable; retry scheduled',
      nextReconcileAt: delay(120000) });
    const inv = fetched.data;
    if (!invoiceMatches(link, inv)) return review(link, 'Provider invoice identity could not be verified');
    if (!Array.isArray(inv.payments)) return review(link, 'Provider payment evidence is incomplete');
    const evidence = inv.payments;
    const ids = new Set();
    const priorPayments = new Map();
    // Validate every attempt before mutating the financial ledger.
    for (const p of evidence) {
      if (!isInvoiceId(p?.id) || ids.has(p.id) || p.invoice_id !== inv.id || p.currency !== 'SAR' ||
          !Number.isSafeInteger(p.amount) || p.amount !== link.amountHalalas ||
          (p.live !== undefined && p.live !== (link.environment === 'live')) ||
          !['initiated', 'authorized', 'paid', 'captured', 'failed', 'refunded', 'voided', 'verified'].includes(p.status) ||
          !Number.isSafeInteger(p.refunded ?? 0) || (p.refunded ?? 0) < 0 || (p.refunded ?? 0) > p.amount ||
          (p.captured !== undefined && (!Number.isSafeInteger(p.captured) || p.captured < 0 || p.captured > p.amount))) {
        return review(link, 'Provider payment amount, currency or membership could not be verified');
      }
      ids.add(p.id);
      const existing = await Payment.findOne({ moyasarPaymentId: p.id }).lean();
      priorPayments.set(p.id, existing);
      if (existing && (String(existing.paymentLinkId) !== String(link._id) || existing.metadata?.purpose !== PURPOSE ||
          existing.userId || existing.subscriptionId || existing.addonId || existing.currency !== 'SAR' ||
          Math.round(existing.amount * 100) !== p.amount)) {
        return review(link, 'Provider payment already belongs to another transaction');
      }
    }
    // Renew the lease before ledger writes. A stale worker cannot publish its link projection.
    const renewed = await PaymentLink.updateOne({ _id: link._id, leaseToken: link.leaseToken,
      leaseUntil: { $gt: new Date() } }, { $set: { leaseUntil: delay(LEASE_MS) } });
    if (!renewed.matchedCount) throw new ConflictError('Payment check lease expired');
    for (const p of evidence) {
      // Verification-only authorizations are not collected funds.
      if (p.status === 'verified') continue;
      const owner = { moyasarPaymentId: p.id, paymentLinkId: link._id, 'metadata.purpose': PURPOSE };
      const success = ['paid', 'captured', 'refunded'].includes(p.status);
      const captured = p.status === 'captured' ? p.captured : p.amount;
      if (success && captured !== p.amount) return review(link, 'Partial capture requires review');
      const prior = priorPayments.get(p.id);
      if (prior && ((SUCCESS.includes(prior.status) && (p.refunded || 0) <= Math.round(prior.refundedAmount * 100)) ||
          (!success && prior.providerStatus === p.status))) continue;
      const at = new Date(p.paid_at || p.created_at);
      const validAt = Number.isNaN(at.getTime()) ? null : at;
      // $max makes refunds monotonic even if a stale invoice races an admin refund.
      // Ownership in the unique-key upsert rejects collisions instead of reassigning another payment.
      await Payment.updateOne(owner, {
        $setOnInsert: { userId: null, paymentLinkId: link._id, moyasarPaymentId: p.id,
          moyasarInvoiceId: inv.id, amount: p.amount / 100, currency: 'SAR', provider: 'moyasar',
          metadata: { purpose: PURPOSE, reference: link.reference }, description: link.description,
          status: 'pending', paidAt: success ? validAt : null, environment: link.environment,
          paymentMethod: { type: p.source?.type, company: p.source?.company,
            last4: typeof p.source?.number === 'string' ? p.source.number.slice(-4) : undefined },
        },
        $max: { refundedAmount: (p.refunded || 0) / 100, capturedAmount: success ? p.amount / 100 : 0 },
      }, { upsert: true });
      // Preserve prior collected states against delayed failed/initiated snapshots.
      await Payment.updateOne(owner, [{ $set: {
        paidAt: { $ifNull: ['$paidAt', { $literal: success ? validAt : null }] },
        status: { $cond: [{ $gt: ['$capturedAmount', 0] },
          { $cond: [{ $gte: ['$refundedAmount', '$amount'] }, 'refunded',
            { $cond: [{ $gt: ['$refundedAmount', 0] }, 'partially_refunded', 'paid'] }] },
          { $literal: ({ initiated: 'pending_3ds', authorized: 'authorized', failed: 'failed', voided: 'voided' })[p.status] || 'pending' }] },
        providerStatus: { $literal: p.status },
      } }]);
    }
    // This sequence is recoverable: if any ledger write fails, no Paid link is published;
    // the retry uses the unique payment IDs and monotonic amounts to finish the projection.
    const rows = await Payment.find({ paymentLinkId: link._id, 'metadata.purpose': PURPOSE }).lean();
    const collectedRows = rows.filter((p) => SUCCESS.includes(p.status));
    const collected = collectedRows.reduce((s, p) => s + Math.round(p.amount * 100), 0);
    const refunded = collectedRows.reduce((s, p) => s + Math.round(p.refundedAmount * 100), 0);
    let status;
    if (collected > link.amountHalalas || (collected > 0 && collected < link.amountHalalas)) status = 'needs_review';
    else if (collected === link.amountHalalas) status = refunded >= collected ? 'refunded' : refunded > 0 ? 'partially_refunded' : 'paid';
    else if (['paid', 'refunded'].includes(inv.status)) status = 'needs_review';
    else if (inv.status === 'expired') status = 'expired';
    else if (inv.status === 'canceled') status = 'canceled';
    else if (inv.status === 'initiated') status = evidence.some((p) => ['initiated', 'authorized'].includes(p.status)) ? 'processing' : 'awaiting_payment';
    else status = 'unavailable';
    const ready = !!inv.url && isHostedUrlAllowed(inv.url);
    const failure = [...evidence].reverse().find((p) => p.status === 'failed');
    const successfulDates = collectedRows.map((p) => p.paidAt).filter(Boolean);
    const updated = await persist(link, {
      status, invoiceStatus: inv.status, creationState: ready ? 'ready' : link.creationState,
      financialActivityAt: collected !== link.collectedHalalas || refunded !== link.refundedHalalas ||
        (!link.financialActivityAt && ['paid', 'partially_refunded', 'refunded', 'expired', 'canceled'].includes(status)) ? new Date() : link.financialActivityAt || null,
      hostedUrl: ready ? inv.url : null, collectedHalalas: collected, refundedHalalas: refunded,
      linkedPaymentIds: rows.map((p) => p._id), paidAt: link.paidAt || successfulDates[0] || null,
      canceledAt: status === 'canceled' ? (link.canceledAt || new Date()) : link.canceledAt,
      cancelPending: link.cancelPending && !['canceled', 'expired', 'paid', 'partially_refunded', 'refunded'].includes(status),
      lastFailureSummary: failure ? 'Payment attempt declined' : null,
      lastSyncedAt: new Date(), reconcileAttempts: 0,
      syncError: status === 'needs_review' ? 'Collection requires review' : ready ? null : 'Hosted URL could not be verified',
      nextReconcileAt: delay(['paid', 'refunded', 'partially_refunded', 'expired', 'canceled'].includes(status) ? 86400000 : 60000),
    });
    if (updated.status !== link.status) await audit(updated, 'status_changed');
    return updated;
  };

  const recover = async (link) => {
    if (environment() !== link.environment) return review(link, 'Provider environment differs from this request');
    const matches = new Map();
    let complete = false;
    for (let page = 1; page <= 4; page++) {
      const result = await provider.listInvoices({ metadata: { reference: link.reference }, page });
      if (!result.success) return persist(link, { syncError: 'Creation check unavailable', nextReconcileAt: delay(120000) });
      for (const inv of result.invoices || []) {
        if (inv.metadata?.reference === link.reference) matches.set(inv.id, inv);
      }
      const totalPages = result.totalPages ?? result.raw?.total_pages;
      if (Number.isInteger(totalPages) && page >= totalPages) { complete = true; break; }
      if (!Number.isInteger(totalPages) && !(result.invoices || []).length) { complete = true; break; }
    }
    if (!complete || matches.size > 1) return review(link, 'Invoice recovery needs operator review');
    if (matches.size === 1) {
      const inv = [...matches.values()][0];
      if (!invoiceMatches(link, inv, null)) return review(link, 'Recovered invoice identity could not be verified');
      const adopted = await persist(link, { providerInvoiceId: inv.id, nextReconcileAt: new Date() });
      await audit(adopted, 'recovered');
      return project(adopted);
    }
    const attempts = (link.reconcileAttempts || 0) + 1;
    return persist(link, { creationState: 'creation_unknown', reconcileAttempts: attempts,
      status: attempts >= 6 ? 'needs_review' : link.status,
      syncError: 'Creation is still uncertain; no invoice found',
      nextReconcileAt: delay(Math.min(2 ** Math.min(attempts, 6), 60) * 60000) });
  };
  const reconcilePaymentLink = (id) => withLease(id, (link) => link.providerInvoiceId ? project(link) :
    ['creating', 'creation_unknown'].includes(link.creationState) ? recover(link) : link);

  const createPaymentLink = async ({ actor, body = {}, creationKey }) => {
    if (!creationKey || !/^[\x21-\x7e]{1,128}$/.test(creationKey)) throw new ValidationError('A valid Idempotency-Key is required');
    const cfg = paymentLinksConfig();
    if (!cfg.enabled) throw new ValidationError('Payment links are currently disabled');
    const input = validateCreateInput(body);
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const replay = (existing) => {
      if (existing.requestHash !== requestHash) throw new ConflictError('Idempotency-Key reused with different input');
      return { link: existing, httpStatus: existing.creationState === 'ready' ? 201 : 202, deduped: true };
    };
    const existing = await PaymentLink.findOne({ createdBy: actor._id, creationKey });
    if (existing) return replay(existing);
    const reference = `HPL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const token = crypto.randomUUID();
    let link;
    try {
      link = await PaymentLink.create({ reference, createdBy: actor._id,
        creatorSnapshot: { name: actor.name, role: actor.role }, amountHalalas: input.amountHalalas,
        currency: 'SAR', description: input.description || defaultDescription(reference, input.locale),
        clientLabel: input.clientLabel, locale: input.locale, environment: environment(),
        expiresAt: delay(input.expiresInDays * 86400000), creationKey, requestHash,
        leaseToken: token, leaseUntil: delay(LEASE_MS), nextReconcileAt: delay(LEASE_MS),
      });
    } catch (error) {
      if (error.code === 11000) {
        const raced = await PaymentLink.findOne({ createdBy: actor._id, creationKey });
        if (raced) return replay(raced);
      }
      throw error;
    }
    try {
      await audit(link, 'create_intent', actor);
      const result = await provider.createInvoiceMinor({ amountHalalas: link.amountHalalas, currency: 'SAR',
        description: link.description, expireAt: link.expiresAt.toISOString(), callbackUrl: buildCallbackUrl(),
        metadata: { purpose: PURPOSE, payment_link_id: String(link._id), reference },
      });
      if (!result.success) {
        const definite = [400, 401, 403, 404, 422].includes(Number(result.statusCode));
        link = await persist(link, { creationState: definite ? 'creation_failed' : 'creation_unknown',
          status: definite ? 'unavailable' : 'awaiting_payment',
          financialActivityAt: definite ? new Date() : null,
          syncError: definite ? 'Provider rejected creation' : 'Creation is still uncertain',
          nextReconcileAt: definite ? null : delay(60000) });
      } else {
        const inv = result.raw;
        if (!invoiceMatches(link, inv, null)) {
          link = await persist(link, { creationState: 'creation_unknown', status: 'needs_review',
            syncError: 'Created invoice identity could not be verified', nextReconcileAt: delay(60000) });
        } else {
          link = await persist(link, { providerInvoiceId: inv.id, creationState: 'creation_unknown', nextReconcileAt: new Date() });
          link = await project(link);
        }
      }
    } catch (error) {
      // Only classify the operation as uncertain; never repeat remote creation automatically.
      link = await persist(link, { creationState: 'creation_unknown', syncError: 'Creation check incomplete', nextReconcileAt: delay(60000) });
    } finally {
      await PaymentLink.updateOne({ _id: link._id, leaseToken: token }, { $set: { leaseToken: null, leaseUntil: null } });
    }
    return { link, httpStatus: link.creationState === 'ready' ? 201 : 202 };
  };
  const refreshPaymentLink = async (id) => {
    const claimed = await PaymentLink.findOneAndUpdate({ _id: id, $or: [
      { lastRefreshRequestedAt: null }, { lastRefreshRequestedAt: { $lte: new Date(Date.now() - 15000) } },
    ] }, { $set: { lastRefreshRequestedAt: new Date() } }, { new: true });
    if (!claimed) {
      const current = await PaymentLink.findById(id);
      if (!current) throw new NotFoundError('PaymentLink');
      return { link: current, queued: true };
    }
    await queueReconciliation(id);
    const link = await reconcilePaymentLink(id);
    return { link, queued: !!link.syncError || !!link.$locals.reconcileQueued };
  };
  const cancelPaymentLink = ({ linkId, actor }) => withLease(linkId, async (link) => {
    if (!link.providerInvoiceId) throw new ConflictError('Invoice creation is not complete');
    let fresh = await project(link);
    if (fresh.collectedHalalas > 0) throw new ConflictError('Link is already paid; use refund instead of cancel');
    if (fresh.status === 'canceled') return fresh;
    if (fresh.syncError || !['awaiting_payment', 'processing'].includes(fresh.status)) throw new ConflictError('Current provider state does not permit cancellation');
    fresh = await persist(fresh, { cancelPending: true, nextReconcileAt: delay(60000) });
    try { await provider.cancelInvoice(fresh.providerInvoiceId); }
    catch { /* The authoritative fetch below resolves success or uncertainty. */ }
    // A successful HTTP response alone is never cancellation confirmation.
    const reconciled = await project(fresh);
    if (reconciled.collectedHalalas > 0) throw new ConflictError('Payment arrived concurrently; link is paid');
    if (reconciled.status !== 'canceled') {
      await persist(reconciled, { cancelPending: true, syncError: 'Cancellation not confirmed; check scheduled', nextReconcileAt: delay(60000) });
      throw new ConflictError('Cancellation not confirmed; refresh status before retrying');
    }
    await audit(reconciled, 'canceled', actor);
    return reconciled;
  }, { busyIsConflict: true });
  const handleProviderCallbackHint = async (payload = {}) => {
    const inv = payload.data || payload.invoice || payload;
    if (!isInvoiceId(inv?.id)) return { handled: false };
    const known = await PaymentLink.findOne({ providerInvoiceId: inv.id }).select('_id');
    if (known) { await queueReconciliation(known._id); return { handled: true }; }
    // A reference may wake recovery, but the supplied invoice ID is never adopted.
    if (typeof inv.metadata?.reference === 'string' && inv.metadata.reference.length <= 64) {
      const pending = await PaymentLink.findOne({ reference: inv.metadata.reference, providerInvoiceId: null,
        creationState: { $in: ['creating', 'creation_unknown'] } }).select('_id');
      if (pending) await queueReconciliation(pending._id);
    }
    return { handled: false };
  };
  return { createPaymentLink, reconcilePaymentLink, refreshPaymentLink, cancelPaymentLink,
    getProviderEnvironment: environment,
    recoverUncertainCreation: (link) => reconcilePaymentLink(link._id), handleProviderCallbackHint, queueReconciliation };
};
