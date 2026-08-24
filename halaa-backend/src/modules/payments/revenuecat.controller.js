/**
 * RevenueCat webhook + reconcile (BILL-01/02 · SHIP §9.2/§9.3).
 *
 * Webhook pipeline:
 *   authenticate (constant-time) → normalize + redact → STRICT envelope
 *   validation → durably persist the AUTHENTICATED event (redacted payload +
 *   typed columns + catalog stamp) with its disposition → for accepted events,
 *   ATOMICALLY CLAIM a processing lease → process idempotently via the reducer →
 *   record resolution → 2xx.
 *
 * Concurrency + replay: a duplicate delivery hits the unique `eventId` index; a
 * terminal prior attempt is acked without reprocessing; a live lease held by
 * another worker returns 500 so RevenueCat retries after the lease expires
 * (never a double-grant, never a stuck-ack). Authenticated-but-invalid / ignored
 * / dead-letter events are all persisted durably with a reason — never dropped.
 */

const crypto = require("crypto");
const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const logger = require("../../shared/utils/logger");
const revenuecatService = require("./revenuecat.service");
const rcApi = require("./revenuecat.api");
const commerce = require("../../shared/commerce");
const { resolveProductMaps } = require("../../shared/commerce/catalog.resolver");
const { stableStringify } = require("../../shared/commerce/catalog.integrity");
const { normalizeEvent, redactPayload } = require("./revenuecat.normalize");
const { validateEnvelope } = require("./revenuecat.envelope");

const RevenueCatEvent = require("../../../models/RevenueCatEventModel");
const Subscription = require("../../../models/SubscriptionModel");
const EventEntitlement = require("../../../models/EventEntitlementModel");

const { isPoolPlan, isPerEventPlan, isUnlimited } = require("../../shared/constants/plans");

const csv = (raw, fb) => (raw && String(raw).trim() ? String(raw).split(",").map((s) => s.trim()).filter(Boolean) : fb);
const leaseMs = () => {
  const v = Number(process.env.REVENUECAT_LEASE_MS || 120000);
  return Number.isFinite(v) && v >= 1000 ? v : 120000;
};

/** Envelope config derived directly from env (works even when the readiness gate is off). */
const envelopeConfig = () => ({
  apiVersions: csv(process.env.REVENUECAT_API_VERSION_ALLOWLIST, ["1.0"]),
  appId: process.env.REVENUECAT_APP_ID || null,
  appIds: csv(
    process.env.REVENUECAT_APP_IDS,
    process.env.REVENUECAT_APP_ID ? [process.env.REVENUECAT_APP_ID] : []
  ),
  environment: process.env.REVENUECAT_ENVIRONMENT || null,
  environments: csv(
    process.env.REVENUECAT_ENVIRONMENTS,
    process.env.REVENUECAT_ENVIRONMENT ? [process.env.REVENUECAT_ENVIRONMENT] : []
  ),
  allowedStores: csv(process.env.REVENUECAT_ALLOWED_STORES, ["APP_STORE", "PLAY_STORE"]),
  recurringEntitlementId: process.env.REVENUECAT_RECURRING_ENTITLEMENT_ID || commerce.RECURRING_ENTITLEMENT_ID,
});

const authOk = (req) => {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) {
    logger.error("[revenuecat] REVENUECAT_WEBHOOK_AUTH not set — rejecting webhook.");
    return false;
  }
  const got = req.get("authorization") || "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

exports.webhook = catchAsync(async (req, res) => {
  if (!authOk(req)) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const n = normalizeEvent(req.body);
  const redacted = redactPayload(req.body);
  const payloadHash = sha256(stableStringify(redacted));
  const integrity = commerce.getCatalogIntegrity();
  const maps = resolveProductMaps(process.env);

  const verdict = validateEnvelope(n, {
    config: envelopeConfig(),
    planMap: maps.planMap,
    addonMap: maps.addonMap,
    getEntryByCode: commerce.getEntryByCode,
    integrity,
  });

  // Every authenticated event is persisted — including invalid/ignored ones —
  // keyed on eventId (synthesized when absent so retries still dedupe).
  const eventId = n.eventId || `noid_${payloadHash}`;

  const setOnInsert = {
    eventId,
    type: n.type || "UNKNOWN",
    apiVersion: n.apiVersion,
    appUserId: n.appUserId,
    originalAppUserId: n.originalAppUserId,
    aliases: n.aliases,
    appId: n.appId,
    productId: n.productId,
    store: n.store,
    environment: n.environment,
    transactionId: n.transactionId,
    originalTransactionId: n.originalTransactionId,
    cancelReason: n.cancelReason,
    entitlementIds: n.entitlementIds,
    priceInPurchasedCurrency: n.priceInPurchasedCurrency,
    currency: n.currency,
    priceUsd: n.priceUsd,
    eventTimestampMs: n.eventTimestampMs,
    purchasedAtMs: n.purchasedAtMs,
    expirationAtMs: n.expirationAtMs,
    payloadSchemaVersion: n.apiVersion,
    payloadHash,
    catalogCode: verdict.catalogCode,
    catalogVersion: integrity.catalogVersion,
    catalogHash: integrity.catalogHash,
    rawPayload: redacted,
  };

  // Idempotent durable insert.
  let rcEvent;
  try {
    rcEvent = await RevenueCatEvent.create({ ...setOnInsert, status: "received" });
  } catch (err) {
    if (err.code === 11000) {
      rcEvent = await RevenueCatEvent.findOne({ eventId });
      if (rcEvent && ["processed", "ignored", "dead_letter", "resolved"].includes(rcEvent.status)) {
        return res.status(200).json({ status: "duplicate", eventId });
      }
      // else: non-terminal duplicate → fall through to (re)claim.
    } else {
      throw err;
    }
  }

  // ── non-accept dispositions: persist terminal status + 200 ────────────────
  if (verdict.disposition === "ignore") {
    await finalize(rcEvent, "ignored", verdict.code);
    return res.status(200).json({ status: "ignored", reason: verdict.code });
  }
  if (verdict.disposition === "dead_letter") {
    await finalize(rcEvent, "dead_letter", verdict.code);
    logger.error("[revenuecat] DEAD-LETTER (envelope)", { eventId, type: n.type, reason: verdict.code });
    return res.status(200).json({ status: "dead_letter", reason: verdict.code });
  }

  // ── accepted: atomically claim a processing lease ─────────────────────────
  const now = new Date();
  const claimed = await RevenueCatEvent.findOneAndUpdate(
    {
      eventId,
      $or: [{ status: "received" }, { status: "processing", leaseUntil: { $lt: now } }],
    },
    {
      $set: { status: "processing", processing: true, leaseOwner: `${process.pid}@${process.env.HOSTNAME || "node"}`, leaseUntil: new Date(now.getTime() + leaseMs()), lastAttemptAt: now },
      $inc: { attemptCount: 1 },
    },
    { new: true }
  );
  if (!claimed) {
    // A live lease is held elsewhere (or it already reached terminal). Re-read.
    const fresh = await RevenueCatEvent.findOne({ eventId });
    if (fresh && ["processed", "ignored", "dead_letter", "resolved", "manual_review"].includes(fresh.status)) {
      return res.status(200).json({ status: fresh.status, reason: fresh.reason });
    }
    // Held by a live worker → ask RevenueCat to retry after the lease expires.
    return res.status(500).json({ status: "error", message: "processing_in_progress" });
  }

  // ── process ────────────────────────────────────────────────────────────────
  try {
    const result = await revenuecatService.processEvent(claimed);
    if (result.retryable) {
      // Release the lease so a retry (RC or sweep) can re-claim; stay non-terminal.
      claimed.processing = false;
      claimed.leaseUntil = null;
      claimed.error = result.error || result.reason;
      claimed.resolutionHistory.push({ action: "retry", status: "received", reason: result.reason, actor: "system" });
      claimed.status = "received";
      await claimed.save();
      logger.warn("[revenuecat] retryable — released for retry", { eventId, reason: result.reason });
      return res.status(500).json({ status: "error", message: result.reason });
    }
    const links = result.links || {};
    Object.assign(claimed, {
      status: result.status,
      reason: result.reason || null,
      processing: false,
      leaseUntil: null,
      processedAt: new Date(),
      userId: links.userId,
      subscriptionId: links.subscriptionId,
      eventEntitlementId: links.eventEntitlementId,
      addonId: links.addonId,
      paymentId: links.paymentId,
    });
    claimed.resolutionHistory.push({ action: result.action || result.status, status: result.status, reason: result.reason, actor: "system" });
    await claimed.save();

    if (result.status === "dead_letter") {
      logger.error("[revenuecat] DEAD-LETTER (process)", { eventId, type: n.type, reason: result.reason });
    } else if (result.status === "manual_review") {
      logger.warn("[revenuecat] MANUAL-REVIEW", { eventId, type: n.type, reason: result.reason });
    }
    return res.status(200).json({ status: result.status, reason: result.reason });
  } catch (err) {
    // Unexpected throw → release lease, stay retryable.
    claimed.processing = false;
    claimed.leaseUntil = null;
    claimed.error = err.message;
    claimed.status = "received";
    await claimed.save().catch(() => {});
    logger.error("[revenuecat] process threw (will retry)", { eventId, error: err.message });
    return res.status(500).json({ status: "error", message: "process_failed" });
  }
});

/** Persist a terminal disposition + resolution entry. */
async function finalize(rcEvent, status, reason) {
  if (!rcEvent) return;
  rcEvent.status = status;
  rcEvent.reason = reason;
  rcEvent.processing = false;
  rcEvent.leaseUntil = null;
  rcEvent.processedAt = new Date();
  rcEvent.resolutionHistory.push({ action: status, status, reason, actor: "system" });
  await rcEvent.save().catch(() => {});
}

/**
 * GET /payments/revenuecat/reconcile (authenticated) — UNCHANGED contract.
 * Returns the general canonical backend state (mobile depends on this shape).
 * The EXACT expected-purchase contract is the POST endpoint below.
 */
exports.reconcile = catchAsync(async (req, res) => {
  const user = req.user;

  let store = null;
  const snap = await rcApi.getRecurringSnapshot(user.billingUserId);
  if (snap.available) {
    store = { active: snap.entitlementActive, productId: snap.effectiveProductId, expiresAt: snap.expiresAtMs ? new Date(snap.expiresAtMs) : null };
  }

  const subscriptions = (await Subscription.findActiveForUser(user._id)) || [];
  const subscription = subscriptions[0] || null;
  const eventEntitlement = await EventEntitlement.findOne({ userId: user._id, status: "unused", resolution: { $in: ["fulfilled", "none"] }, subscriptionId: { $ne: null } }).lean();

  let canBuyEvent = true;
  for (const s of subscriptions) {
    const maxEvents = s.planId?.limits?.maxEvents;
    if (isPoolPlan(s.planType) || isUnlimited(maxEvents)) { canBuyEvent = false; break; }
    if (isPerEventPlan(s.planType) && typeof s.canCreateEvent === "function" && s.canCreateEvent().allowed) { canBuyEvent = false; break; }
  }

  sendSuccess(res, {
    subscription,
    eventEntitlement,
    store,
    canBuyEvent,
    hasBackendAccess: Boolean(subscription || eventEntitlement),
  });
});
