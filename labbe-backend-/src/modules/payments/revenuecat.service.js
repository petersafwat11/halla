/**
 * RevenueCat event processing (SHIP §9.2/§9.4).
 *
 * Idempotent, reconciled handling of store lifecycle events. The controller has
 * already deduped on `event.id` (RevenueCatEvent unique index) before calling
 * here. We resolve the user, classify the product (recurring subscription vs
 * one-time consumable), derive access from the CANONICAL subscriber snapshot
 * (not the event type alone), write a provider-neutral Payment ledger row, and
 * apply the event-behavior table. Unknown user/product → dead-letter (caller
 * marks status); the rare TRANSFER/TEMPORARY events are parked for manual review.
 */

const mongoose = require("mongoose");
const logger = require("../../shared/utils/logger");
const { SUBSCRIPTION_STATUS } = require("../../shared/constants");
const { isPerEventPlan, isPoolPlan, isUnlimited } = require("../../shared/constants/plans");
const subscriptionLifecycle = require("../subscriptions/subscriptionLifecycle.service");
const addonsService = require("../addons/addons.service");
const rcApi = require("./revenuecat.api");

const User = require("../../../models/UserModel");
const Plan = require("../../../models/PlanModel");
const Subscription = require("../../../models/SubscriptionModel");
const Payment = require("../../../models/PaymentModel");
const EventEntitlement = require("../../../models/EventEntitlementModel");

const ACTIVE_SUB = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL];

class RevenueCatProcessError extends Error {
  constructor(reason, deadLetter = false) {
    super(reason);
    this.reason = reason;
    this.deadLetter = deadLetter;
  }
}

const parsePlanMap = () => {
  try {
    return JSON.parse(process.env.REVENUECAT_PRODUCT_PLAN_MAP || "{}");
  } catch {
    return {};
  }
};

// Add-on product map: { "<store_product_id>": "<addon_code>" } where addon_code
// is one of: extra_invites_<qty>, design_template_<type>, business_customization.
const parseAddonMap = () => {
  try {
    return JSON.parse(process.env.REVENUECAT_ADDON_PRODUCT_MAP || "{}");
  } catch {
    return {};
  }
};

/** Parse an add-on code → { addonType, quantity?, templateType? } or null. */
const parseAddonCode = (code) => {
  if (!code) return null;
  if (code === "business_customization") {
    return { addonType: "business_customization" };
  }
  let m = code.match(/^extra_invites_(\d+)$/);
  if (m) return { addonType: "extra_invites", quantity: Number(m[1]) };
  m = code.match(/^design_template_(.+)$/);
  if (m) return { addonType: "design_template", templateType: m[1] };
  return null;
};

const resolveUser = async (appUserId, aliases = []) => {
  const ids = [appUserId, ...(aliases || [])].filter(Boolean);
  const objectIds = ids.filter((i) => mongoose.isValidObjectId(i));
  return User.findOne({
    $or: [
      { billingUserId: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  }).select("role billingUserId");
};

/**
 * Upsert one ledger row per store transaction (idempotent on
 * providerTransactionId). Returns the Payment _id (for the event→payment trace
 * link) or null. Never blocks a grant on a ledger write.
 */
const writeLedger = async (userId, ev, extra = {}) => {
  const txnId = ev.transaction_id || ev.id;
  if (!txnId) return null;
  try {
    const doc = await Payment.findOneAndUpdate(
      { providerTransactionId: txnId },
      {
        $setOnInsert: {
          userId,
          provider: ev.store === "PLAY_STORE" ? "playstore" : "appstore",
          providerTransactionId: txnId,
          originalTransactionId: ev.original_transaction_id || txnId,
          store: ev.store || null,
          storeProductId: ev.product_id || null,
          environment: ev.environment || null,
          amount: Number(ev.price) || 0,
          currency: ev.currency || "USD",
          status: "paid",
          purchasedAt: ev.purchased_at_ms ? new Date(ev.purchased_at_ms) : new Date(),
          expiresAt: ev.expiration_at_ms ? new Date(ev.expiration_at_ms) : null,
          rcEventId: ev.id || null,
          paidAt: new Date(),
          ...extra,
        },
      },
      { upsert: true, new: true }
    );
    return doc?._id || null;
  } catch (err) {
    // Ledger is audit; never block a grant on a ledger write.
    logger.warn("[revenuecat] ledger write failed", {
      txnId,
      error: err.message,
    });
    return null;
  }
};

const classifyPlan = async (planCode) => {
  if (!planCode) return null;
  const plan = await Plan.findOne({ code: planCode });
  if (!plan) return null;
  return { plan, isConsumable: isPerEventPlan(plan.planType) };
};

/** Canonical expiry: prefer the live subscriber snapshot, fall back to the event. */
const resolveExpiry = async (appUserId, ev) => {
  const snapshot = await rcApi.getSubscriber(appUserId);
  if (snapshot) {
    const ent = rcApi.deriveActiveEntitlement(snapshot);
    if (ent.expiresAtMs) return { expiresAt: new Date(ent.expiresAtMs), active: ent.active, snapshot };
    return { expiresAt: null, active: ent.active, snapshot };
  }
  return {
    expiresAt: ev.expiration_at_ms ? new Date(ev.expiration_at_ms) : null,
    active: !ev.expiration_at_ms || ev.expiration_at_ms > Date.now(),
    snapshot: null,
  };
};

// ── Subscription (recurring) grant/extend ──────────────────────────────────
const grantSubscription = async (user, plan, ev, eventId, expiresAt) => {
  // Populate planId so renew() can read limits.durationDays/invitePool (H1).
  const existing = await Subscription.findOne({
    userId: user._id,
    provider: { $in: ["revenuecat", "appstore", "playstore"] },
    status: { $in: ACTIVE_SUB },
  }).populate("planId");

  let sub;
  if (existing && existing.planId?._id?.toString() === plan._id.toString()) {
    // Same plan still active → RENEWAL: reset the pool + extend expiry.
    if (typeof existing.renew === "function") existing.renew();
    sub = existing;
  } else {
    // New / upgraded plan → create (changePlan cancels prior active subs;
    // single-active is the design for recurring plans).
    const result = await subscriptionLifecycle.changePlan(user._id, plan.code, {
      actor: { _id: user._id, role: user.role, onBehalfOf: false },
      reason: "iap_purchase",
      pricePaid: Number(ev.price) || 0,
      currency: ev.currency || "SAR",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      createdBy: { user: user._id, role: user.role },
      metadata: { source: "revenuecat", productId: ev.product_id, store: ev.store, rcEventId: eventId },
      cancelReason: "Replaced by store subscription change",
    });
    sub = result.subscription;
  }

  // Patch canonical store fields + expiry.
  sub.provider = ev.store === "PLAY_STORE" ? "playstore" : "appstore";
  sub.storeProductId = ev.product_id || null;
  sub.storeOriginalTransactionId = ev.original_transaction_id || ev.transaction_id || null;
  sub.storeExpiresAt = expiresAt || sub.storeExpiresAt;
  if (expiresAt) sub.expiresAt = expiresAt;
  sub.cancelAtPeriodEnd = false;
  sub.metadata = { ...(sub.metadata || {}), rcEventId: eventId };
  await sub.save();
  return sub;
};

// ── Consumable (event package) grant ───────────────────────────────────────
// Grants access via the EXISTING per-event subscription flow (so capacity,
// canCreateEvent, and consume-on-first-send all work via the mature machinery)
// and records an idempotent EventEntitlement ledger row linked to it. A
// re-delivered store transaction is a no-op (unique providerTransactionId). The
// second-purchase guard lives at the paywall/reconcile, pre-purchase; a
// delivered purchase is always honored here.
const grantConsumable = async (user, plan, ev, eventId) => {
  const txnId = ev.transaction_id || ev.id;
  const existing = await EventEntitlement.findOne({ providerTransactionId: txnId });
  if (existing) return existing;

  const source = ev.store === "PLAY_STORE" ? "playstore" : "appstore";

  // CRITICAL (C2): never cancel an active recurring/pool/unlimited subscription
  // when an event package is delivered. changePlan() cancels ALL active subs, so
  // only use it when the user has NO recurring plan (the normal case — event
  // buyers don't have a subscription; the canBuyEvent guard blocks the mixed
  // case at the paywall). If a recurring plan IS active (race / store-side /
  // restore), record the purchase as an audit ledger only — they already have
  // event access; we never destroy their pool.
  const actives = await Subscription.find({
    userId: user._id,
    status: { $in: ACTIVE_SUB },
  }).populate("planId");
  const hasRecurring = actives.some(
    (s) =>
      isPoolPlan(s.planId?.planType) ||
      isUnlimited(s.planId?.limits?.maxEvents)
  );

  let subId = null;
  if (!hasRecurring) {
    // Create the per-event subscription via the existing access flow. This only
    // supersedes a prior (already-consumed) event sub — acceptable.
    const result = await subscriptionLifecycle.changePlan(user._id, plan.code, {
      actor: { _id: user._id, role: user.role, onBehalfOf: false },
      reason: "iap_event_purchase",
      pricePaid: Number(ev.price) || 0,
      currency: ev.currency || "SAR",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      createdBy: { user: user._id, role: user.role },
      metadata: {
        source: "revenuecat",
        productId: ev.product_id,
        store: ev.store,
        rcEventId: eventId,
      },
      cancelReason: "Replaced by store event package",
    });
    const sub = result.subscription;
    sub.provider = source;
    sub.storeProductId = ev.product_id || null;
    sub.storeOriginalTransactionId = ev.original_transaction_id || txnId || null;
    await sub.save();
    subId = sub._id;
  } else {
    logger.warn(
      "[revenuecat] event package delivered while a recurring plan is active — recorded as ledger only (recurring plan preserved)",
      { userId: String(user._id), planCode: plan.code, txnId }
    );
  }

  return EventEntitlement.create({
    userId: user._id,
    planCode: plan.code,
    planId: plan._id,
    subscriptionId: subId,
    source,
    providerTransactionId: txnId,
    originalTransactionId: ev.original_transaction_id || txnId,
    store: ev.store || null,
    environment: ev.environment || null,
    invitePool: plan.limits?.invitePool ?? plan.invitePool ?? 0,
    status: "unused",
    purchasedAt: ev.purchased_at_ms ? new Date(ev.purchased_at_ms) : new Date(),
    metadata: { rcEventId: eventId, productId: ev.product_id },
  });
};

const revokeStoreSubscription = async (userId, reason) => {
  await Subscription.updateMany(
    {
      userId,
      provider: { $in: ["revenuecat", "appstore", "playstore"] },
      status: { $in: ACTIVE_SUB },
    },
    { $set: { status: SUBSCRIPTION_STATUS.EXPIRED || "expired", cancelledAt: new Date(), cancelReason: reason } }
  );
};

const setSubFlag = async (userId, set) => {
  await Subscription.updateOne(
    {
      userId,
      provider: { $in: ["revenuecat", "appstore", "playstore"] },
      status: { $in: ACTIVE_SUB },
    },
    { $set: set }
  );
};

/**
 * Process one RevenueCat event. `rcEvent` is the stored RevenueCatEvent doc.
 * Returns { status, reason, links } — the caller persists it. Throws
 * RevenueCatProcessError({deadLetter}) for unknown user/product.
 */
const processEvent = async (rcEvent) => {
  const ev = rcEvent.rawPayload?.event || {};
  const type = rcEvent.type;
  const appUserId = rcEvent.appUserId;

  const user = await resolveUser(appUserId, rcEvent.aliases);
  if (!user) throw new RevenueCatProcessError("unknown_user", true);

  const links = { userId: user._id };

  // Events that don't require a product mapping.
  if (type === "TRANSFER" || type === "TEMPORARY_ENTITLEMENT_GRANT") {
    // Reconciling every source/destination id (TRANSFER) and temporary grants
    // safely requires manual review for v1 — park, don't guess.
    throw new RevenueCatProcessError(`manual_${type.toLowerCase()}`, true);
  }

  const productId = ev.new_product_id || ev.product_id || rcEvent.productId;
  const planCode = parsePlanMap()[productId];
  const classified = await classifyPlan(planCode);

  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "NON_RENEWING_PURCHASE":
    case "UNCANCELLATION": {
      // ADD-ON product? (extra invites / design template / business custom.)
      const addonCode = parseAddonMap()[productId];
      if (addonCode) {
        const spec = parseAddonCode(addonCode);
        if (!spec) throw new RevenueCatProcessError("unmapped_addon", true);
        const addon = await addonsService.grantAddonFromStore({
          userId: user._id,
          ...spec,
          providerTransactionId: ev.transaction_id || ev.id,
          rcEventId: rcEvent.eventId,
          store: ev.store,
        });
        links.addonId = addon?._id;
        links.paymentId = await writeLedger(user._id, ev, {});
        return { status: "processed", links };
      }

      if (!classified) throw new RevenueCatProcessError("unmapped_product", true);
      // Grant first so the ledger row can link to the subscription it created.
      if (classified.isConsumable) {
        const ent = await grantConsumable(user, classified.plan, ev, rcEvent.eventId);
        links.eventEntitlementId = ent?._id;
        links.subscriptionId = ent?.subscriptionId || undefined;
      } else {
        const { expiresAt, snapshot } = await resolveExpiry(appUserId, ev);
        // Canonical reconciliation: prefer the snapshot's ACTIVE product so a
        // deferred PRODUCT_CHANGE (downgrade effective next period) doesn't apply
        // early — the new plan only takes effect once the store reports it active.
        let effectivePlan = classified.plan;
        if (snapshot) {
          const active = rcApi.deriveActiveEntitlement(snapshot);
          if (active.productId) {
            const canonical = await classifyPlan(parsePlanMap()[active.productId]);
            if (canonical && !canonical.isConsumable) effectivePlan = canonical.plan;
          }
        }
        const sub = await grantSubscription(user, effectivePlan, ev, rcEvent.eventId, expiresAt);
        links.subscriptionId = sub?._id;
      }
      links.paymentId = await writeLedger(user._id, ev, {
        subscriptionId: links.subscriptionId,
      });
      return { status: "processed", links };
    }

    case "CANCELLATION":
      // Voluntary cancel — access remains until expiry. DO NOT revoke.
      await setSubFlag(user._id, { cancelAtPeriodEnd: true });
      return { status: "processed", reason: "cancel_at_period_end", links };

    case "BILLING_ISSUE":
      // Grace/billing issue — DO NOT revoke while entitlement is active.
      await setSubFlag(user._id, { "metadata.billingIssue": true });
      return { status: "processed", reason: "billing_issue_flagged", links };

    case "SUBSCRIPTION_PAUSED":
      await setSubFlag(user._id, { "metadata.paused": true });
      return { status: "processed", reason: "paused", links };

    case "SUBSCRIPTION_EXTENDED": {
      const { expiresAt } = await resolveExpiry(appUserId, ev);
      if (expiresAt) {
        await setSubFlag(user._id, { storeExpiresAt: expiresAt, expiresAt });
      }
      return { status: "processed", reason: "extended", links };
    }

    case "EXPIRATION": {
      // Revoke ONLY when the canonical entitlement is inactive.
      const { active } = await resolveExpiry(appUserId, ev);
      if (!active) {
        await revokeStoreSubscription(user._id, "Store subscription expired");
        return { status: "processed", reason: "revoked", links };
      }
      return { status: "processed", reason: "still_active", links };
    }

    case "REFUND": {
      const txnId = ev.transaction_id || ev.id;
      await Payment.updateOne(
        { providerTransactionId: txnId },
        { $set: { status: "refunded", refundedAt: new Date() } }
      );
      // Refund of an UNUSED event entitlement revokes it; consumed stays.
      await EventEntitlement.updateOne(
        { providerTransactionId: txnId, status: "unused" },
        { $set: { status: "refunded", refundedAt: new Date() } }
      );
      // Refund of a subscription revokes access.
      await revokeStoreSubscription(user._id, "Store refund");
      return { status: "processed", reason: "refunded", links };
    }

    case "REFUND_REVERSED": {
      const txnId = ev.transaction_id || ev.id;
      await Payment.updateOne(
        { providerTransactionId: txnId, status: "refunded" },
        { $set: { status: "paid", refundedAt: null } }
      );
      return { status: "processed", reason: "refund_reversed", links };
    }

    default:
      return { status: "ignored", reason: `event_${type}`, links };
  }
};

module.exports = { processEvent, resolveUser, RevenueCatProcessError };
