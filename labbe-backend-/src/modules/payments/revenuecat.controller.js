/**
 * RevenueCat webhook + reconcile (SHIP §9.2/§9.3).
 *
 * Webhook: authenticate → validate envelope → durably insert a UNIQUE event
 * (dedupe on event.id) → process idempotently → return 2xx. Retries hit the
 * unique index and ack without reprocessing. Unknown user/product is parked in
 * `dead_letter` (200, so RevenueCat stops retrying an unprocessable event);
 * transient failures return 500 so RevenueCat retries.
 *
 * Reconcile: authenticated endpoint the client calls after purchase/restore to
 * read the canonical backend state (subscription + unused event entitlement +
 * live store snapshot) and WAIT for the webhook-driven grant before showing
 * success.
 *
 * Auth: fixed `Authorization` header compared in constant time against
 * `REVENUECAT_WEBHOOK_AUTH` (same value set in the RevenueCat dashboard).
 * Mapping: `REVENUECAT_PRODUCT_PLAN_MAP` (JSON product_id → plan_code).
 * App User ID = User.billingUserId (§9.1).
 *
 * @module modules/payments/revenuecat.controller
 */

const crypto = require("crypto");
const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const logger = require("../../shared/utils/logger");
const revenuecatService = require("./revenuecat.service");
const rcApi = require("./revenuecat.api");
const {
  isPerEventPlan,
  isPoolPlan,
  isUnlimited,
} = require("../../shared/constants/plans");

const RevenueCatEvent = require("../../../models/RevenueCatEventModel");
const Subscription = require("../../../models/SubscriptionModel");
const EventEntitlement = require("../../../models/EventEntitlementModel");

const authOk = (req) => {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) {
    logger.error(
      "[revenuecat] REVENUECAT_WEBHOOK_AUTH not set — rejecting webhook. Set it (and the same value in the RevenueCat dashboard)."
    );
    return false;
  }
  const got = req.get("authorization") || "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

exports.webhook = catchAsync(async (req, res) => {
  if (!authOk(req)) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const event = req.body?.event || {};
  const eventId = event.id;
  const type = event.type;
  const appUserId = event.app_user_id;

  if (!eventId || !type || !appUserId) {
    return res.status(200).json({ status: "ignored", reason: "missing_fields" });
  }

  // Environment isolation: never let a sandbox event affect the configured
  // production environment (or vice versa). Optional — only enforced when set.
  const expectedEnv = process.env.REVENUECAT_ENVIRONMENT;
  if (expectedEnv && event.environment && event.environment !== expectedEnv) {
    return res
      .status(200)
      .json({ status: "ignored", reason: "environment_mismatch" });
  }
  // Optional app_id pinning.
  if (
    process.env.REVENUECAT_APP_ID &&
    event.app_id &&
    event.app_id !== process.env.REVENUECAT_APP_ID
  ) {
    return res.status(200).json({ status: "ignored", reason: "app_id_mismatch" });
  }

  // Durable, idempotent insert. A duplicate delivery hits the unique index.
  let rcEvent;
  try {
    rcEvent = await RevenueCatEvent.create({
      eventId,
      type,
      appUserId,
      aliases: event.aliases || [],
      productId: event.product_id || event.new_product_id || null,
      store: event.store || null,
      environment: event.environment || null,
      apiVersion: req.body?.api_version || null,
      rawPayload: req.body,
      status: "received",
    });
  } catch (err) {
    if (err.code === 11000) {
      // Already ingested. Only ack-without-work when a prior attempt reached a
      // TERMINAL status; if a prior attempt left it non-terminal (transient
      // failure → 500 → RevenueCat retried), reprocess — every downstream grant
      // is idempotent (unique providerTransactionId / metadata.rcEventId).
      rcEvent = await RevenueCatEvent.findOne({ eventId });
      if (
        !rcEvent ||
        ["processed", "dead_letter", "ignored"].includes(rcEvent.status)
      ) {
        return res.status(200).json({ status: "duplicate", eventId });
      }
    } else {
      throw err;
    }
  }

  // Process idempotently.
  try {
    const result = await revenuecatService.processEvent(rcEvent);
    rcEvent.status = result.status;
    rcEvent.reason = result.reason || null;
    if (result.links) {
      rcEvent.userId = result.links.userId;
      rcEvent.subscriptionId = result.links.subscriptionId;
      rcEvent.eventEntitlementId = result.links.eventEntitlementId;
      rcEvent.addonId = result.links.addonId;
      rcEvent.paymentId = result.links.paymentId;
    }
    rcEvent.processedAt = new Date();
    await rcEvent.save();
    return res.status(200).json({ status: result.status, reason: result.reason });
  } catch (err) {
    if (err instanceof revenuecatService.RevenueCatProcessError && err.deadLetter) {
      rcEvent.status = "dead_letter";
      rcEvent.reason = err.reason;
      await rcEvent.save();
      // ALERT: a dead-lettered event needs human review — never silently dropped.
      logger.error("[revenuecat] DEAD-LETTER event", {
        eventId,
        type,
        appUserId,
        reason: err.reason,
      });
      return res.status(200).json({ status: "dead_letter", reason: err.reason });
    }
    // Transient failure → 500 so RevenueCat retries; event stays `received`.
    rcEvent.error = err.message;
    await rcEvent.save();
    logger.error("[revenuecat] process failed (will retry)", {
      eventId,
      type,
      error: err.message,
    });
    return res.status(500).json({ status: "error", message: "process_failed" });
  }
});

/**
 * GET /payments/revenuecat/reconcile (authenticated).
 * Returns the canonical backend state for the signed-in user so the client can
 * wait for the webhook-driven grant before showing success (§9.3).
 */
exports.reconcile = catchAsync(async (req, res) => {
  const user = req.user;

  let store = null;
  const snapshot = await rcApi.getSubscriber(user.billingUserId);
  if (snapshot) {
    const ent = rcApi.deriveActiveEntitlement(snapshot);
    store = {
      active: ent.active,
      productId: ent.productId,
      expiresAt: ent.expiresAtMs ? new Date(ent.expiresAtMs) : null,
    };
  }

  const subscriptions = (await Subscription.findActiveForUser(user._id)) || [];
  const subscription = subscriptions[0] || null;
  const eventEntitlement = await EventEntitlement.findOne({
    userId: user._id,
    status: "unused",
  }).lean();

  // Second-purchase guard (§9.4): an event package can't be bought while a
  // pool/recurring plan is active (unlimited events) or an unconsumed per-event
  // package is still in hand. The paywall hides event products when false.
  let canBuyEvent = true;
  for (const s of subscriptions) {
    const maxEvents = s.planId?.limits?.maxEvents;
    if (isPoolPlan(s.planType) || isUnlimited(maxEvents)) {
      canBuyEvent = false;
      break;
    }
    if (
      isPerEventPlan(s.planType) &&
      typeof s.canCreateEvent === "function" &&
      s.canCreateEvent().allowed
    ) {
      canBuyEvent = false; // unconsumed event package already held
      break;
    }
  }

  sendSuccess(res, {
    subscription,
    eventEntitlement,
    store,
    canBuyEvent,
    hasBackendAccess: Boolean(subscription || eventEntitlement),
  });
});
