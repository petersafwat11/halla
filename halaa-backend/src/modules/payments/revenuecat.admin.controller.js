/**
 * Staff dead-letter operations (BILL-09 · §3). Authorized via the current
 * permission architecture — routes gate every handler with
 * `requirePageAccess(ADMIN_PAGES.PAYMENTS, 'manage')`.
 *
 *  GET   /payments/revenuecat/dead-letters        — list dead-letter / manual-review / stuck events.
 *  GET   /payments/revenuecat/dead-letters/:id    — inspect one (REDACTED payload + resolution history).
 *  POST  /payments/revenuecat/dead-letters/:id/replay  — re-resolve mapping + reprocess.
 *  POST  /payments/revenuecat/dead-letters/:id/resolve — mark resolved (actor + reason), no grant.
 *
 * The stored payload is already redacted at ingest; these endpoints never expose
 * receipts, secrets, authorization headers, or unnecessary PII.
 */

const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const logger = require("../../shared/utils/logger");
const commerce = require("../../shared/commerce");
const { resolveProductMaps } = require("../../shared/commerce/catalog.resolver");
const { normalizeEvent } = require("./revenuecat.normalize");
const { validateEnvelope } = require("./revenuecat.envelope");
const revenuecatService = require("./revenuecat.service");

const RevenueCatEvent = require("../../../models/RevenueCatEventModel");

const REVIEW_STATUSES = ["dead_letter", "manual_review"];

const csv = (raw, fb) => (raw && String(raw).trim() ? String(raw).split(",").map((s) => s.trim()).filter(Boolean) : fb);
const envelopeConfig = () => ({
  apiVersions: csv(process.env.REVENUECAT_API_VERSION_ALLOWLIST, ["1.0"]),
  appId: process.env.REVENUECAT_APP_ID || null,
  environment: process.env.REVENUECAT_ENVIRONMENT || null,
  allowedStores: csv(process.env.REVENUECAT_ALLOWED_STORES, ["APP_STORE", "PLAY_STORE"]),
  recurringEntitlementId: process.env.REVENUECAT_RECURRING_ENTITLEMENT_ID || commerce.RECURRING_ENTITLEMENT_ID,
});

/** GET dead-letters (list). */
exports.listDeadLetters = catchAsync(async (req, res) => {
  const status = req.query.status && REVIEW_STATUSES.includes(req.query.status) ? [req.query.status] : REVIEW_STATUSES;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const q = { status: { $in: status } };
  const [items, total] = await Promise.all([
    RevenueCatEvent.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select("eventId type reason status appUserId productId catalogCode store environment transactionId attemptCount createdAt processedAt"),
    RevenueCatEvent.countDocuments(q),
  ]);
  sendSuccess(res, { items, total, page, limit });
});

/** GET dead-letters/:id (inspect, redacted). */
exports.inspectDeadLetter = catchAsync(async (req, res) => {
  const ev = await RevenueCatEvent.findById(req.params.id);
  if (!ev) return sendSuccess(res, { found: false });
  sendSuccess(res, {
    found: true,
    event: {
      eventId: ev.eventId, type: ev.type, status: ev.status, reason: ev.reason, error: ev.error,
      appUserId: ev.appUserId, productId: ev.productId, catalogCode: ev.catalogCode,
      catalogVersion: ev.catalogVersion, catalogHash: ev.catalogHash,
      transactionId: ev.transactionId, originalTransactionId: ev.originalTransactionId,
      store: ev.store, environment: ev.environment, attemptCount: ev.attemptCount,
      resolutionHistory: ev.resolutionHistory,
      redactedPayload: ev.rawPayload, // already redacted at ingest
      createdAt: ev.createdAt, processedAt: ev.processedAt,
    },
  });
});

/** POST dead-letters/:id/replay — re-resolve mapping + reprocess. */
exports.replayDeadLetter = catchAsync(async (req, res) => {
  const ev = await RevenueCatEvent.findById(req.params.id);
  if (!ev) return sendSuccess(res, { replayed: false, reason: "not_found" });
  if (!REVIEW_STATUSES.includes(ev.status)) {
    return sendSuccess(res, { replayed: false, reason: `not_replayable_from_${ev.status}` });
  }

  // Re-validate the envelope against CURRENT config/maps (mapping may have been
  // corrected) so a previously unmapped product now resolves.
  const n = normalizeEvent(ev.rawPayload);
  const maps = resolveProductMaps(process.env);
  const integrity = commerce.getCatalogIntegrity();
  const verdict = validateEnvelope(n, {
    config: envelopeConfig(), planMap: maps.planMap, addonMap: maps.addonMap,
    getEntryByCode: commerce.getEntryByCode, integrity,
  });

  const actor = String(req.user?._id || "staff");
  if (verdict.disposition !== "accept") {
    ev.reason = verdict.code;
    ev.resolutionHistory.push({ action: "replay", status: ev.status, reason: `still_${verdict.disposition}_${verdict.code}`, actor });
    await ev.save();
    return sendSuccess(res, { replayed: true, outcome: verdict.disposition, reason: verdict.code });
  }

  ev.catalogCode = verdict.catalogCode;
  ev.status = "processing";
  ev.processing = true;
  ev.leaseUntil = new Date(Date.now() + 120000);
  ev.lastAttemptAt = new Date();
  ev.attemptCount += 1;
  await ev.save();

  try {
    const result = await revenuecatService.processEvent(ev);
    if (result.retryable) {
      // Snapshot still unavailable etc. — park back as dead-letter for a later replay.
      ev.status = "dead_letter";
      ev.reason = result.reason;
      ev.processing = false;
      ev.leaseUntil = null;
      ev.resolutionHistory.push({ action: "replay", status: "dead_letter", reason: `retryable_${result.reason}`, actor });
      await ev.save();
      return sendSuccess(res, { replayed: true, outcome: "retry", reason: result.reason });
    }
    const links = result.links || {};
    Object.assign(ev, {
      status: result.status, reason: result.reason || null, processing: false, leaseUntil: null, processedAt: new Date(),
      userId: links.userId, subscriptionId: links.subscriptionId, eventEntitlementId: links.eventEntitlementId, addonId: links.addonId, paymentId: links.paymentId,
    });
    ev.resolutionHistory.push({ action: "replay", status: result.status, reason: result.reason, actor });
    await ev.save();
    return sendSuccess(res, { replayed: true, outcome: result.status, reason: result.reason });
  } catch (err) {
    ev.status = "dead_letter";
    ev.processing = false;
    ev.leaseUntil = null;
    ev.error = err.message;
    ev.resolutionHistory.push({ action: "replay", status: "dead_letter", reason: "replay_threw", actor });
    await ev.save();
    logger.error("[revenuecat] replay threw", { id: String(ev._id), error: err.message });
    return sendSuccess(res, { replayed: true, outcome: "error", reason: err.message });
  }
});

/** POST dead-letters/:id/resolve — mark resolved (actor + reason), no grant. */
exports.resolveDeadLetter = catchAsync(async (req, res) => {
  const ev = await RevenueCatEvent.findById(req.params.id);
  if (!ev) return sendSuccess(res, { resolved: false, reason: "not_found" });
  const actor = String(req.user?._id || "staff");
  const note = String(req.body?.note || "").slice(0, 500);
  ev.status = "resolved";
  ev.resolvedBy = req.user?._id || null;
  ev.resolvedAt = new Date();
  ev.reason = req.body?.reason ? String(req.body.reason).slice(0, 200) : ev.reason;
  ev.resolutionHistory.push({ action: "resolve", status: "resolved", reason: ev.reason, actor, note });
  await ev.save();
  sendSuccess(res, { resolved: true, status: ev.status });
});
