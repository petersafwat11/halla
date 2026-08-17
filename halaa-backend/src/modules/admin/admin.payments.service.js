/**
 * Admin Payments Service
 * Payment management operations for the admin module.
 */

const { NotFoundError } = require('../../shared/errors');
const { buildDateRangeQuery, buildSearchQuery } = require('./admin.shared.service');

/**
 * Resolve a free-text search into a Mongo `$or` clause that matches Payment
 * docs whose host (populated `userId`) matches the term, OR whose direct
 * `moyasarPaymentId` regex-matches. Returns null when nothing should match.
 */
async function buildPaymentSearchClause(search) {
  if (!search || !String(search).trim()) return null;
  const term = String(search).trim();
  const User = require('../../../models/UserModel');

  // Step 1: pre-resolve user IDs whose name/email/phone match the term.
  const userQuery = buildSearchQuery(term, ['name', 'email', 'phoneNumber']);
  const matchedUsers = userQuery.$or
    ? await User.find(userQuery).select('_id').lean()
    : [];
  const userIds = matchedUsers.map((u) => u._id);

  // Step 2: regex on direct Payment fields.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directRegex = { $regex: escaped, $options: 'i' };

  const or = [{ moyasarPaymentId: directRegex }];
  if (userIds.length > 0) or.push({ userId: { $in: userIds } });
  return { $or: or };
}

/**
 * Get all payments.
 *
 * Historical subscriptions with a `metadata.paymentTransactionId` were
 * backfilled into the Payment collection (status: paid, backfilledFrom:
 * 'subscription'), so all data is queryable via Payment directly.
 */
async function getPayments({ page = 1, limit = 10, status, search, from, to } = {}) {
  const Payment = require('../../../models/PaymentModel');
  const skip = (page - 1) * limit;

  const match = {};

  if (status && status !== 'all') {
    const map = {
      completed: { $in: ['paid', 'captured', 'partially_refunded'] },
      pending: { $in: ['pending', 'pending_3ds', 'authorized'] },
      failed: { $in: ['failed', 'voided', 'refunded'] },
      refunded: { $in: ['refunded', 'partially_refunded'] },
    };
    if (map[status]) match.status = map[status];
  }
  const searchClause = await buildPaymentSearchClause(search);
  if (searchClause) Object.assign(match, searchClause);
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) match.createdAt = dateRange;

  const baseMatch = {};
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
async function getPaymentSummary() {
  const Payment = require('../../../models/PaymentModel');
  const baseMatch = {};
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

/** Single payment detail. */
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
async function exportPayments({ status, search, from, to } = {}) {
  const Payment = require('../../../models/PaymentModel');
  const match = {};
  if (status && status !== 'all') {
    const map = {
      completed: { $in: ['paid', 'captured', 'partially_refunded'] },
      pending: { $in: ['pending', 'pending_3ds', 'authorized'] },
      failed: { $in: ['failed', 'voided', 'refunded'] },
      refunded: { $in: ['refunded', 'partially_refunded'] },
    };
    if (map[status]) match.status = map[status];
  }
  const searchClause = await buildPaymentSearchClause(search);
  if (searchClause) Object.assign(match, searchClause);
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
