/**
 * Authenticated exact reconciliation + preflight (MOB-01 · EVT-01 · ADD-01 · §6/§7/§8).
 *
 *  POST /payments/revenuecat/reconcile-exact  — deterministic state of the EXACT
 *        attempted { catalogCode, transactionId } (never "some access" = success).
 *  POST /payments/revenuecat/event-preflight  — event-package eligibility + the
 *        current active/unused item + the allowed replacement action.
 *  POST /payments/revenuecat/addon-preflight  — add-on eligibility.
 *  GET  /payments/revenuecat/fulfillment      — fulfillment status/history for a
 *        transaction (add-on / event entitlement).
 */

const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const commerce = require("../../shared/commerce");
const lineage = require("./revenuecat.lineage");
const { deriveExactState } = require("./revenuecat.reconcileExact");
const { checkEligible } = require("./revenuecat.eligibility");

const RevenueCatEvent = require("../../../models/RevenueCatEventModel");
const EventEntitlement = require("../../../models/EventEntitlementModel");
const Addon = require("../../../models/AddonModel");
const Subscription = require("../../../models/SubscriptionModel");
const { isPoolPlan, isUnlimited } = require("../../shared/constants/plans");

/** POST reconcile-exact — the exact expected-purchase contract. */
exports.reconcileExact = catchAsync(async (req, res) => {
  const user = req.user;
  const { catalogCode, transactionId = null } = req.body || {};
  const catalogItem = commerce.getEntryByCode(catalogCode);
  if (!catalogItem) {
    return sendSuccess(res, { state: "failed", reason: "unknown_catalog_code", catalogCode, transactionId });
  }

  const lin = { originalTransactionId: transactionId, transactionId, productId: catalogItem.iosProductId };
  let [subscription, eventEntitlement, addon, event] = await Promise.all([
    catalogItem.kind === "subscription" ? lineage.findSubscriptionByLineage(user._id, lin) : null,
    catalogItem.kind === "event_consumable" ? lineage.findEventEntitlementByTxn(transactionId) : null,
    catalogItem.catalogType === "addon" ? lineage.findAddonByTxn(transactionId) : null,
    transactionId ? RevenueCatEvent.findOne({ transactionId }).sort({ createdAt: -1 }) : null,
  ]);

  // Event fallback: the store txn id the SDK returned may not equal the webhook's
  // (Android). If the exact-txn lookup missed, the exact product's newest UNUSED
  // entitlement owned by the caller IS the just-made purchase (preflight
  // guarantees no pre-existing unused one for this code). Never a different product.
  if (!eventEntitlement && catalogItem.kind === "event_consumable") {
    eventEntitlement = await lineage.findNewestUnusedEventForCode(user._id, catalogCode);
  }

  // Ownership guard: never leak another account's record.
  const owns = (doc) => !doc || String(doc.userId) === String(user._id);
  if (!owns(subscription) || !owns(eventEntitlement) || !owns(addon)) {
    return sendSuccess(res, { state: "failed", reason: "not_owner", catalogCode, transactionId });
  }

  const { state, reason } = deriveExactState(catalogItem, { subscription, eventEntitlement, addon, event });
  return sendSuccess(res, {
    state,
    reason,
    catalogCode,
    transactionId,
    kind: catalogItem.kind,
    ids: {
      subscriptionId: subscription?._id || null,
      eventEntitlementId: eventEntitlement?._id || null,
      addonId: addon?._id || null,
      eventId: event?.eventId || null,
    },
    effectiveProductId: subscription?.storeProductId || null,
    expiresAt: subscription?.storeExpiresAt || subscription?.expiresAt || null,
  });
});

/** POST event-preflight — call immediately before the store sheet (EVT-01). */
exports.eventPreflight = catchAsync(async (req, res) => {
  const user = req.user;
  const catalogItem = commerce.getEntryByCode(req.body?.catalogCode);
  if (!catalogItem || catalogItem.kind !== "event_consumable") {
    return sendSuccess(res, { eligible: false, reason: "not_an_event_product" });
  }
  const elig = checkEligible(user, catalogItem);
  if (!elig.ok) return sendSuccess(res, { eligible: false, reason: elig.reason });

  const subscriptions = (await Subscription.findActiveForUser(user._id)) || [];
  for (const s of subscriptions) {
    if (isPoolPlan(s.planType) || isUnlimited(s.planId?.limits?.maxEvents)) {
      return sendSuccess(res, { eligible: false, reason: "recurring_plan_active", currentActiveItem: { subscriptionId: s._id, planCode: s.planCode }, replacementAction: "use_existing_plan" });
    }
  }
  const unused = await EventEntitlement.findOne({ userId: user._id, status: "unused", resolution: { $in: ["fulfilled", "none"] }, subscriptionId: { $ne: null } });
  if (unused) {
    return sendSuccess(res, { eligible: false, reason: "unused_event_held", currentActiveItem: { eventEntitlementId: unused._id, planCode: unused.planCode }, replacementAction: "consume_or_refund_existing" });
  }
  return sendSuccess(res, { eligible: true, reason: null, currentActiveItem: null, replacementAction: null });
});

/** POST addon-preflight (ADD-01). */
exports.addonPreflight = catchAsync(async (req, res) => {
  const user = req.user;
  const catalogItem = commerce.getEntryByCode(req.body?.catalogCode);
  if (!catalogItem || catalogItem.catalogType !== "addon") {
    return sendSuccess(res, { eligible: false, reason: "not_an_addon_product" });
  }
  const elig = checkEligible(user, catalogItem);
  if (!elig.ok) return sendSuccess(res, { eligible: false, reason: elig.reason });

  // Extra invites need an active subscription to receive the pool top-up.
  if (catalogItem.family === "extra_invites") {
    const subscriptions = (await Subscription.findActiveForUser(user._id)) || [];
    if (!subscriptions.length) {
      return sendSuccess(res, { eligible: false, reason: "no_active_subscription", replacementAction: "purchase_plan_first" });
    }
  }
  return sendSuccess(res, { eligible: true, reason: null });
});

/** GET fulfillment?transactionId= — exact-item fulfillment status/history. */
exports.fulfillmentStatus = catchAsync(async (req, res) => {
  const user = req.user;
  const transactionId = req.query?.transactionId;
  if (!transactionId) return sendSuccess(res, { found: false, reason: "missing_transaction_id" });

  const [addon, ent, event] = await Promise.all([
    Addon.findOne({ providerTransactionId: transactionId, userId: user._id }),
    EventEntitlement.findOne({ providerTransactionId: transactionId, userId: user._id }),
    RevenueCatEvent.findOne({ transactionId }).sort({ createdAt: -1 }),
  ]);

  return sendSuccess(res, {
    found: Boolean(addon || ent),
    addon: addon ? { id: addon._id, addonType: addon.addonType, status: addon.status, refundState: addon.refundState, clawedBackDelta: addon.clawedBackDelta } : null,
    eventEntitlement: ent ? { id: ent._id, status: ent.status, resolution: ent.resolution } : null,
    webhook: event ? { status: event.status, reason: event.reason, at: event.processedAt } : null,
  });
});

/**
 * GET /payments/revenuecat/catalog (authenticated) — store-safe catalog for the
 * mobile client (MOB-03). Returns ONLY store-eligible entries (so trial/unlimited
 * never appear) projected to the store-safe allowlist (no price/currency, no
 * server config/secret/keys), plus a per-caller `eligibleForCaller` flag derived
 * from the signed audience mapping. The client maps its internal plan/add-on
 * codes to RevenueCat products/packages/offerings from this, and takes display
 * prices/periods from the store package — never from here.
 */
exports.storeCatalog = catchAsync(async (req, res) => {
  const user = req.user;
  const integrity = commerce.getCatalogIntegrity();
  const entries = commerce.getStoreSafeCatalog().map((e) => ({
    ...e,
    eligibleForCaller: checkEligible(user, e).ok,
  }));

  return sendSuccess(res, {
    catalogVersion: integrity.catalogVersion || null,
    catalogHash: integrity.catalogHash || null,
    recurringEntitlementId: commerce.RECURRING_ENTITLEMENT_ID,
    offerings: ["host_plans", "business_plans", "host_addons", "business_addons"],
    count: entries.length,
    entries,
  });
});
