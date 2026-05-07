/**
 * Admin Payments Service
 * Payment management operations for the admin module.
 */

const { NotFoundError } = require('../../shared/errors');
const { buildDateRangeQuery } = require('./admin.shared.service');

/**
 * Get all payments.
 *
 * Historical subscriptions with a `metadata.paymentTransactionId` were
 * backfilled into the Payment collection (status: paid, backfilledFrom:
 * 'subscription'), so all data is queryable via Payment directly.
 */
async function getPayments({ page = 1, limit = 10, status, from, to, whitelabelId } = {}) {
  const Payment = require('../../../models/PaymentModel');
  const skip = (page - 1) * limit;

  const match = {};
  if (whitelabelId !== undefined) match.whitelabelId = whitelabelId;

  if (status && status !== 'all') {
    const map = {
      completed: { $in: ['paid', 'captured', 'partially_refunded'] },
      pending: { $in: ['pending', 'pending_3ds', 'authorized'] },
      failed: { $in: ['failed', 'voided', 'refunded'] },
      refunded: { $in: ['refunded', 'partially_refunded'] },
    };
    if (map[status]) match.status = map[status];
  }
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) match.createdAt = dateRange;

  const baseMatch = whitelabelId !== undefined ? { whitelabelId } : {};
  const [rows, total, statsAgg] = await Promise.all([
    Payment.find(match)
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(match),
    Payment.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
    ]),
  ]);

  const byStatus = {};
  let totalRevenue = 0;
  let pending = 0;
  let completed = 0;
  let failed = 0;
  for (const s of statsAgg) {
    byStatus[s._id] = { count: s.count, revenue: s.revenue || 0 };
    if (['paid', 'captured', 'partially_refunded'].includes(s._id)) {
      completed += s.count;
      totalRevenue += s.revenue || 0;
    } else if (['pending', 'pending_3ds', 'authorized'].includes(s._id)) {
      pending += s.count;
    } else if (['failed', 'voided', 'refunded'].includes(s._id)) {
      failed += s.count;
    }
  }

  return {
    payments: rows.map((p) => ({
      _id: p._id,
      amount: p.amount,
      currency: p.currency,
      status: ['paid', 'captured'].includes(p.status)
        ? 'completed'
        : ['pending', 'pending_3ds', 'authorized'].includes(p.status)
        ? 'pending'
        : ['failed', 'voided'].includes(p.status)
        ? 'failed'
        : ['refunded', 'partially_refunded'].includes(p.status)
        ? 'refunded'
        : p.status,
      providerStatus: p.status,
      hostName: p.userId?.name || p.userId?.email || null,
      description: p.description,
      paymentMethod: p.paymentMethod?.type || null,
      paymentMethodLast4: p.paymentMethod?.last4 || null,
      moyasarPaymentId: p.moyasarPaymentId,
      refundedAmount: p.refundedAmount || 0,
      createdAt: p.createdAt,
    })),
    stats: { totalRevenue, pending, completed, failed },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/** Payment summary widget — same stats block as getPayments without paginating rows. */
async function getPaymentSummary({ whitelabelId } = {}) {
  const Payment = require('../../../models/PaymentModel');
  const baseMatch = whitelabelId !== undefined ? { whitelabelId } : {};
  const statsAgg = await Payment.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
  ]);
  let totalRevenue = 0;
  let pending = 0;
  let completed = 0;
  let failed = 0;
  for (const s of statsAgg) {
    if (['paid', 'captured', 'partially_refunded'].includes(s._id)) {
      completed += s.count;
      totalRevenue += s.revenue || 0;
    } else if (['pending', 'pending_3ds', 'authorized'].includes(s._id)) {
      pending += s.count;
    } else if (['failed', 'voided', 'refunded'].includes(s._id)) {
      failed += s.count;
    }
  }
  return { totalRevenue, pending, completed, failed };
}

/** Single payment detail. Whitelabel scope is enforced by the controller. */
async function getPaymentDetail(paymentId) {
  const Payment = require('../../../models/PaymentModel');
  const detail = await Payment.findById(paymentId)
    .populate('userId', 'name email phoneNumber')
    .populate({ path: 'subscriptionId', populate: { path: 'planId', select: 'code name nameEn nameAr' } })
    .populate('addonId')
    .lean();
  if (!detail) {
    throw new NotFoundError('Payment');
  }
  return detail;
}

/**
 * Export payments
 */
async function exportPayments(whitelabelId, { status, from, to } = {}) {
  const Payment = require('../../../models/PaymentModel');
  const match = {};
  if (whitelabelId !== undefined) match.whitelabelId = whitelabelId;
  if (status && status !== 'all') {
    const map = {
      completed: { $in: ['paid', 'captured', 'partially_refunded'] },
      pending: { $in: ['pending', 'pending_3ds', 'authorized'] },
      failed: { $in: ['failed', 'voided', 'refunded'] },
      refunded: { $in: ['refunded', 'partially_refunded'] },
    };
    if (map[status]) match.status = map[status];
  }
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) match.createdAt = dateRange;

  const rows = await Payment.find(match)
    .populate('userId', 'name email phoneNumber')
    .sort({ createdAt: -1 })
    .lean();

  return rows.map((p) => ({
    Host: p.userId?.name || p.userId?.email || '-',
    'Host Email': p.userId?.email || '-',
    Description: p.description || '-',
    Amount: `${p.amount || 0} ${p.currency || 'SAR'}`,
    'Refunded Amount': `${p.refundedAmount || 0} ${p.currency || 'SAR'}`,
    Status: p.status,
    'Payment Method': p.paymentMethod?.type || '-',
    Last4: p.paymentMethod?.last4 || '-',
    'Transaction ID': p.moyasarPaymentId || '-',
    'Created At': p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '-',
  }));
}

module.exports = {
  getPayments,
  getPaymentSummary,
  getPaymentDetail,
  exportPayments,
};
