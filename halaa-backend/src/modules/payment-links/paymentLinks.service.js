/**
 * Admin payment-links service.
 *
 * Durable request lifecycle over Moyasar hosted invoices:
 *   create (persist intent → provider create → validate/persist) →
 *   reconcile (fetch invoice → verify → upsert guest Payments → project link) →
 *   refresh (coalesced) / cancel (provider confirm) / worker tick.
 *
 * Invariants:
 * - amountHalalas is the single source of truth; provider create uses the
 *   explicit minor-unit path so values are never converted twice.
 * - Same {createdBy, creationKey} + same payload returns the same request;
 *   same key + different payload is a 409.
 * - Unsigned callbacks never mark paid — they only queue reconciliation
 *   against the server secret key.
 * - A verified successful payment is never overwritten by stale
 *   failed/expired/cancel snapshots.
 */

const mongoose = require("mongoose");
const PaymentLink = require("../../../models/PaymentLinkModel");
const config = require("../../config");
const logger = require("../../shared/utils/logger");
const {
  ValidationError,
  NotFoundError,
} = require("../../shared/errors");
const { parseAmountSarToHalalas } = require("./paymentLinks.money");
const { createPaymentLinkSchema } = require("./paymentLinks.validation");

const PURPOSE = "admin_payment_link";
const LINK_STATUS = PaymentLink.LINK_STATUS;

const paymentLinksConfig = () => {
  const pl = config.paymentLinks || {};
  const expiryChoices =
    Array.isArray(pl.expiryChoicesDays) && pl.expiryChoicesDays.length > 0
      ? pl.expiryChoicesDays
      : [1, 7, 30];
  return {
    enabled: pl.enabled === true,
    minAmountSar: Number(pl.minAmountSar || 1),
    maxAmountSar: pl.maxAmountSar == null ? null : Number(pl.maxAmountSar),
    expiryChoicesDays: expiryChoices,
    defaultExpiryDays: Number(pl.defaultExpiryDays || 7),
    callbackBaseUrl: pl.callbackBaseUrl || config.backend?.url || "",
    hostedUrlAllowlist: pl.hostedUrlAllowlist || [],
    reconcileBatch: Number(pl.reconcileBatch || 50),
    reconcileConcurrency: Number(pl.reconcileConcurrency || 2),
  };
};

const buildCallbackUrl = () => {
  const base = String(paymentLinksConfig().callbackBaseUrl || "").replace(/\/$/, "");
  let url;
  try { url = new URL(base); } catch { throw new ValidationError("Payment link callback URL must be configured"); }
  if (url.username || url.password || url.search || url.hash ||
      !["http:", "https:"].includes(url.protocol) || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new ValidationError("Payment link callback URL is invalid");
  }
  return `${base}/api/v2/payment-links/provider-callback`;
};

const isHostedUrlAllowed = (url) => {
  if (!url || typeof url !== "string") return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) return false;
  const allowlist = paymentLinksConfig().hostedUrlAllowlist;
  if (!allowlist || allowlist.length === 0) {
    // Fail-closed default: only Moyasar invoice hosts.
    return ["checkout.moyasar.com", "invoice.moyasar.com"].includes(parsed.hostname);
  }
  return allowlist.some((entry) => {
    try {
      const a = new URL(entry);
      return a.protocol === "https:" && parsed.hostname === a.hostname;
    } catch {
      return parsed.hostname === entry;
    }
  });
};

const toDTO = (link, { includeUrl = true } = {}) => {
  if (!link) return null;
  const o = typeof link.toObject === "function" ? link.toObject() : link;
  const amountSar = ((o.amountHalalas || 0) / 100).toFixed(2);
  const dto = {
    id: String(o._id),
    reference: o.reference,
    amountHalalas: o.amountHalalas,
    amountSar,
    currency: o.currency || "SAR",
    description: o.description || "",
    clientLabel: o.clientLabel || null,
    locale: o.locale || "ar",
    creationState: o.creationState,
    status: o.status,
    invoiceStatus: o.invoiceStatus || null,
    hostedUrl: includeUrl ? o.hostedUrl || null : undefined,
    url: includeUrl ? o.hostedUrl || null : undefined,
    environment: o.environment || "test",
    expiresAt: o.expiresAt,
    paidAt: o.paidAt || null,
    canceledAt: o.canceledAt || null,
    collectedSar: ((o.collectedHalalas || 0) / 100).toFixed(2),
    refundedSar: ((o.refundedHalalas || 0) / 100).toFixed(2),
    collectedHalalas: o.collectedHalalas || 0,
    refundedHalalas: o.refundedHalalas || 0,
    linkedPaymentIds: (o.linkedPaymentIds || []).map((p) => String(p._id || p)),
    syncPending: !!o.syncError,
    syncStale: ['awaiting_payment', 'processing'].includes(o.status) &&
      (!o.lastSyncedAt || Date.now() - new Date(o.lastSyncedAt).getTime() > 180000),
    cancelPending: !!o.cancelPending,
    creator: o.creatorSnapshot || null,
    createdBy: o.createdBy ? String(o.createdBy?._id || o.createdBy) : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    lastSyncedAt: o.lastSyncedAt || null,
    lastFailureSummary: o.lastFailureSummary || null,
  };
  if (!includeUrl) {
    delete dto.hostedUrl;
    delete dto.url;
  }
  return dto;
};

const validateCreateInput = (body = {}) => {
  const parsed = createPaymentLinkSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
  body = parsed.data;
  const cfg = paymentLinksConfig();
  if (!Number.isFinite(cfg.maxAmountSar) || cfg.maxAmountSar < cfg.minAmountSar) throw new ValidationError("Payment link amount limits must be configured");
  if (!cfg.expiryChoicesDays.every((d) => Number.isInteger(d) && d > 0 && d <= 365) || !cfg.expiryChoicesDays.includes(cfg.defaultExpiryDays)) throw new ValidationError("Payment link expiry choices must be configured");
  buildCallbackUrl();
  const amountHalalas = parseAmountSarToHalalas(body.amountSar, {
    minSar: cfg.minAmountSar,
    maxSar: cfg.maxAmountSar,
  });
  const description = body.description !== undefined && body.description !== null
    ? String(body.description).trim()
    : "";
  const clientLabel =
    body.clientLabel !== undefined && body.clientLabel !== null && String(body.clientLabel).trim() !== ""
      ? String(body.clientLabel).trim()
      : null;
  const expiresInDays = body.expiresInDays !== undefined ? Number(body.expiresInDays) : cfg.defaultExpiryDays;
  if (!cfg.expiryChoicesDays.includes(expiresInDays)) {
    throw new ValidationError(
      `expiresInDays must be one of: ${cfg.expiryChoicesDays.join(", ")}`
    );
  }
  const locale = body.locale || "ar";
  return { amountHalalas, description, clientLabel, expiresInDays, locale };
};

const defaultDescription = (reference, locale) =>
  locale === "ar" ? `طلب دفع ${reference}` : `Payment request ${reference}`;

const { createPaymentLink, reconcilePaymentLink, recoverUncertainCreation, refreshPaymentLink,
  cancelPaymentLink, handleProviderCallbackHint, queueReconciliation, getProviderEnvironment } = require('./paymentLinks.lifecycle')({
  paymentLinksConfig, isHostedUrlAllowed, validateCreateInput, defaultDescription, buildCallbackUrl,
});

const STATUS_FILTER_MAP = {
  awaiting_payment: [LINK_STATUS.AWAITING_PAYMENT, LINK_STATUS.PROCESSING],
  paid: [LINK_STATUS.PAID],
  expired: [LINK_STATUS.EXPIRED],
  canceled: [LINK_STATUS.CANCELED],
  refunded: [LINK_STATUS.REFUNDED, LINK_STATUS.PARTIALLY_REFUNDED],
  needs_review: [LINK_STATUS.NEEDS_REVIEW, LINK_STATUS.UNAVAILABLE],
};

const listPaymentLinks = async ({ page = 1, limit = 20, search, status, creator, from, to } = {}) => {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const match = { environment: getProviderEnvironment() };
  if (status && status !== "all" && STATUS_FILTER_MAP[status]) {
    match.status = { $in: STATUS_FILTER_MAP[status] };
  }
  if (creator && mongoose.Types.ObjectId.isValid(creator)) {
    match.createdBy = new mongoose.Types.ObjectId(creator);
  }
  if (from || to) {
    match.createdAt = {};
    if (from) {
      const f = new Date(from);
      if (!Number.isNaN(f.getTime())) match.createdAt.$gte = f;
    }
    if (to) {
      const t = new Date(to);
      if (!Number.isNaN(t.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { t.setUTCDate(t.getUTCDate() + 1); match.createdAt.$lt = t; }
        else match.createdAt.$lte = t;
      }
    }
    if (Object.keys(match.createdAt).length === 0) delete match.createdAt;
  }
  if (search && String(search).trim()) {
    const term = String(search).trim().slice(0, 100);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = [
      { reference: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
      { clientLabel: { $regex: escaped, $options: "i" } },
    ];
  }
  const skip = (page - 1) * limit;
  const [rows, total, summaryAgg] = await Promise.all([
    PaymentLink.find(match)
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentLink.countDocuments(match),
    PaymentLink.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          collected: { $sum: "$collectedHalalas" },
          refunded: { $sum: "$refundedHalalas" },
        },
      },
    ]),
  ]);
  let awaiting = 0;
  let paid = 0;
  let collectedHalalas = 0;
  let refundedHalalas = 0;
  for (const s of summaryAgg) {
    if ([LINK_STATUS.AWAITING_PAYMENT, LINK_STATUS.PROCESSING].includes(s._id)) awaiting += s.count;
    if (s._id === LINK_STATUS.PAID) paid += s.count;
    collectedHalalas += s.collected || 0;
    refundedHalalas += s.refunded || 0;
  }
  const netCollectedSar = ((collectedHalalas - refundedHalalas) / 100).toFixed(2);
  return {
    links: rows.map((r) =>
      toDTO({ ...r, createdBy: r.createdBy, toObject: undefined })
    ),
    summary: { awaiting, paid, netCollectedSar },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

const getPaymentLinkDetail = async (linkId) => {
  const link = await PaymentLink.findById(linkId)
    .populate("createdBy", "name email role")
    .populate({ path: "linkedPaymentIds", select: "amount currency status providerStatus moyasarPaymentId refundedAmount paidAt createdAt" })
    .lean();
  if (!link) throw new NotFoundError("PaymentLink");
  const dto = toDTO(link);
  const transactions = (link.linkedPaymentIds || []).map((p) => ({
    id: String(p._id),
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    providerStatus: p.providerStatus,
    moyasarPaymentId: p.moyasarPaymentId,
    refundedAmount: p.refundedAmount || 0,
    paidAt: p.paidAt || null,
    createdAt: p.createdAt,
  }));
  return { ...dto, transactions };
};

/** Worker tick: fair nextReconcileAt scheduling, batch 50, concurrency 2. */
const runPaymentLinksReconcileTick = async ({ batchSize, concurrency } = {}) => {
  const cfg = paymentLinksConfig();
  const limit = Math.min(batchSize || cfg.reconcileBatch || 50, 100);
  const conc = Math.max(1, Math.min(concurrency || cfg.reconcileConcurrency || 2, 5));
  const due = await PaymentLink.find({
    environment: getProviderEnvironment(),
    nextReconcileAt: { $ne: null, $lte: new Date() },
  })
    .sort({ nextReconcileAt: 1 })
    .limit(limit)
    .select("_id");
  let reconciled = 0;
  let queued = 0;
  const deadline = Date.now() + 45000;
  for (let i = 0; i < due.length; i += conc) {
    if (Date.now() >= deadline) break;
    const chunk = due.slice(i, i + conc);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(chunk.map((d) => reconcilePaymentLink(d._id)));
    for (const r of results) {
      if (r.status === "fulfilled") reconciled += 1;
      else {
        queued += 1;
        logger.error("[payment-links] worker reconcile failed", { error: r.reason?.message });
      }
    }
  }
  return { scanned: due.length, reconciled, errors: queued };
};

module.exports = {
  PURPOSE,
  getProviderEnvironment,
  queueReconciliation,
  paymentLinksConfig,
  toDTO,
  createPaymentLink,
  listPaymentLinks,
  getPaymentLinkDetail,
  refreshPaymentLink,
  cancelPaymentLink,
  reconcilePaymentLink,
  recoverUncertainCreation,
  runPaymentLinksReconcileTick,
  handleProviderCallbackHint,
  isHostedUrlAllowed,
  STATUS_FILTER_MAP,
};
