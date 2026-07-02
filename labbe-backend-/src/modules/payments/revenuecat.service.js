/**
 * RevenueCat event processing (BILL-01..08 · SHIP §9.2/§9.4).
 *
 * Reducer-driven: the PURE reducer (`revenuecat.reducer.js`) interprets the
 * normalized event + resolved catalog item + lineage-located local state +
 * canonical recurring snapshot into an explicit ACTION; this service only
 * EXECUTES that action (idempotent, lineage-scoped, transaction-safe). All the
 * hard correctness lives in the reducer and is unit-tested without Mongo; this
 * layer is exercised by the integration tests against an ephemeral replica set.
 *
 * Reads the typed columns persisted on the RevenueCatEvent (never the redacted
 * blob), so replay is deterministic and PII-free.
 */

const logger = require("../../shared/utils/logger");
const mongoose = require("mongoose");
const { SUBSCRIPTION_STATUS } = require("../../shared/constants");
const subscriptionLifecycle = require("../subscriptions/subscriptionLifecycle.service");
const addonsService = require("../addons/addons.service");
const commerce = require("../../shared/commerce");
const rcApi = require("./revenuecat.api");
const { reduce, ACTIONS } = require("./revenuecat.reducer");
const { parseAddonCode } = require("./revenuecat.addonCode");
const { checkEligible } = require("./revenuecat.eligibility");
const lineage = require("./revenuecat.lineage");
const { withTransaction } = require("../../shared/utils/withTransaction");

const User = require("../../../models/UserModel");
const Subscription = require("../../../models/SubscriptionModel");
const Payment = require("../../../models/PaymentModel");
const EventEntitlement = require("../../../models/EventEntitlementModel");
const AccountDeletionRequest = require("../../../models/AccountDeletionRequestModel");

const ACTIVE_SUB = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL];
const STORE_PROVIDERS = lineage.STORE_PROVIDERS;

// Events whose correct handling can depend on the canonical recurring snapshot.
const SNAPSHOT_TYPES = new Set([
  "EXPIRATION", "CANCELLATION", "REFUND", "REFUND_REVERSED",
  "PRODUCT_CHANGE", "BILLING_ISSUE", "SUBSCRIPTION_EXTENDED",
  "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION",
]);
// Actions that GRANT access and therefore require an eligibility check.
const GRANT_ACTIONS = new Set([
  ACTIONS.GRANT_NEW, ACTIONS.RENEW_AND_REFILL, ACTIONS.CHANGE_EFFECTIVE_NOW, ACTIONS.RESTORE_REVERSED_REFUND,
]);

class RevenueCatProcessError extends Error {
  constructor(reason, deadLetter = false) {
    super(reason);
    this.reason = reason;
    this.deadLetter = deadLetter;
  }
}

const providerFor = (store) => (store === "PLAY_STORE" ? "playstore" : "appstore");

/** Resolve the account by billingUserId / original id / aliases (+ ObjectId). */
const resolveUser = async (appUserId, aliases = [], originalAppUserId = null) => {
  const ids = [appUserId, originalAppUserId, ...(aliases || [])].filter(Boolean);
  if (!ids.length) return null;
  const objectIds = ids.filter((i) => mongoose.isValidObjectId(i));
  return User.findOne({
    $or: [
      { billingUserId: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  }).select("role accountType billingUserId");
};

/**
 * Find a deletion tombstone for a store App User ID. When an account is deleted
 * its `billingUserId` is retained on the AccountDeletionRequest (a pseudonymous,
 * non-PII key) so a post-deletion webhook can be recognized as belonging to a
 * deleted account rather than an unknown user. Matches by billingUserId /
 * original id / aliases (the same identity set the store may present).
 */
const findDeletionTombstone = async (appUserId, originalAppUserId = null, aliases = []) => {
  const ids = [appUserId, originalAppUserId, ...(aliases || [])].filter(Boolean);
  if (!ids.length) return null;
  return AccountDeletionRequest.findOne({ billingUserId: { $in: ids } })
    .select("requestId status")
    .lean();
};

/**
 * Idempotent ledger row per store transaction. Uses the PURCHASED-currency
 * amount + currency (P0-05); the USD estimate is kept separately in metadata.
 * Never blocks a grant on a ledger write.
 */
const writeLedger = async (userId, rc, extra = {}, session = null) => {
  const txnId = rc.transactionId || rc.eventId;
  if (!txnId) return null;
  try {
    const opts = { upsert: true, new: true };
    if (session) opts.session = session;
    const doc = await Payment.findOneAndUpdate(
      { providerTransactionId: txnId },
      {
        $setOnInsert: {
          userId,
          provider: providerFor(rc.store),
          providerTransactionId: txnId,
          originalTransactionId: rc.originalTransactionId || txnId,
          store: rc.store || null,
          storeProductId: rc.productId || null,
          environment: rc.environment || null,
          amount: rc.priceInPurchasedCurrency ?? 0, // PURCHASED currency amount
          currency: rc.currency || null,
          status: "paid",
          purchasedAt: rc.purchasedAtMs ? new Date(rc.purchasedAtMs) : new Date(),
          expiresAt: rc.expirationAtMs ? new Date(rc.expirationAtMs) : null,
          rcEventId: rc.eventId || null,
          paidAt: new Date(),
          metadata: { priceUsd: rc.priceUsd ?? null, catalogHash: rc.catalogHash || null },
          ...extra,
        },
      },
      opts
    );
    return doc?._id || null;
  } catch (err) {
    logger.warn("[revenuecat] ledger write failed", { txnId, error: err.message });
    return null;
  }
};

// ── grant: recurring subscription ───────────────────────────────────────────
const grantSubscription = async (user, plan, rc, expiresAtMs) => {
  // Locate the exact store subscription by lineage, not "first active".
  const existing = await lineage.findSubscriptionByLineage(user._id, {
    originalTransactionId: rc.originalTransactionId,
    transactionId: rc.transactionId,
    productId: rc.productId,
  });

  let sub;
  if (existing && existing.status && ACTIVE_SUB.includes(existing.status) &&
      (await plansMatch(existing, plan))) {
    if (typeof existing.renew === "function") existing.renew();
    sub = existing;
  } else {
    const result = await subscriptionLifecycle.changePlan(user._id, plan.code, {
      actor: { _id: user._id, role: user.role, onBehalfOf: false },
      reason: "iap_purchase",
      pricePaid: rc.priceInPurchasedCurrency ?? 0,
      currency: rc.currency || "SAR",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      createdBy: { user: user._id, role: user.role },
      metadata: { source: "revenuecat", productId: rc.productId, store: rc.store, rcEventId: rc.eventId },
      cancelReason: "Replaced by store subscription change",
    });
    sub = result.subscription;
  }

  sub.provider = providerFor(rc.store);
  sub.storeProductId = rc.productId || null;
  sub.storeOriginalTransactionId = rc.originalTransactionId || rc.transactionId || null;
  const expiresAt = typeof expiresAtMs === "number" ? new Date(expiresAtMs) : null;
  if (expiresAt) {
    sub.storeExpiresAt = expiresAt;
    sub.expiresAt = expiresAt;
  }
  sub.cancelAtPeriodEnd = false;
  sub.metadata = { ...(sub.metadata || {}), rcEventId: rc.eventId, catalogHash: rc.catalogHash || null };
  await sub.save();
  return sub;
};

const plansMatch = async (sub, plan) => {
  if (!sub) return false;
  if (sub.planId && sub.planId.toString) {
    // planId may be populated or an ObjectId.
    const id = sub.planId._id ? sub.planId._id.toString() : sub.planId.toString();
    return id === plan._id.toString();
  }
  return false;
};

// ── grant: event consumable (with deterministic race routing, §7) ───────────
const grantConsumable = async (user, plan, rc) => {
  const txnId = rc.transactionId || rc.eventId;
  const existing = await EventEntitlement.findOne({ providerTransactionId: txnId });
  if (existing) return existing; // idempotent on the unique provider txn id

  const source = providerFor(rc.store);

  // Never destroy an active recurring/pool/unlimited plan when an event package
  // is delivered (C2). If one is active this is a store-sheet race: record the
  // transaction (always) but route it to manual review instead of creating a
  // per-event sub — it must not falsely grant and must NOT block future buys.
  const actives = await Subscription.find({ userId: user._id, status: { $in: ACTIVE_SUB } }).populate("planId");
  const { isPoolPlan, isUnlimited } = require("../../shared/constants/plans");
  const hasRecurring = actives.some(
    (s) => isPoolPlan(s.planId?.planType) || isUnlimited(s.planId?.limits?.maxEvents)
  );

  let subId = null;
  let resolution = "fulfilled";
  if (!hasRecurring) {
    const result = await subscriptionLifecycle.changePlan(user._id, plan.code, {
      actor: { _id: user._id, role: user.role, onBehalfOf: false },
      reason: "iap_event_purchase",
      pricePaid: rc.priceInPurchasedCurrency ?? 0,
      currency: rc.currency || "SAR",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      createdBy: { user: user._id, role: user.role },
      metadata: { source: "revenuecat", productId: rc.productId, store: rc.store, rcEventId: rc.eventId },
      cancelReason: "Replaced by store event package",
    });
    const sub = result.subscription;
    sub.provider = source;
    sub.storeProductId = rc.productId || null;
    sub.storeOriginalTransactionId = rc.originalTransactionId || txnId || null;
    await sub.save();
    subId = sub._id;
  } else {
    resolution = "manual_review";
    logger.warn("[revenuecat] event package delivered while a recurring plan is active — routed to manual_review", {
      userId: String(user._id), planCode: plan.code, txnId,
    });
  }

  try {
    return await EventEntitlement.create({
      userId: user._id,
      planCode: plan.code,
      planId: plan._id,
      subscriptionId: subId,
      source,
      providerTransactionId: txnId,
      originalTransactionId: rc.originalTransactionId || txnId,
      store: rc.store || null,
      environment: rc.environment || null,
      invitePool: plan.limits?.invitePool ?? plan.invitePool ?? 0,
      status: "unused",
      resolution,
      catalogVersion: rc.catalogVersion || null,
      catalogHash: rc.catalogHash || null,
      revenueCatEventId: rc.eventId || null,
      purchasedAt: rc.purchasedAtMs ? new Date(rc.purchasedAtMs) : new Date(),
      metadata: { rcEventId: rc.eventId, productId: rc.productId },
    });
  } catch (err) {
    if (err.code === 11000) return EventEntitlement.findOne({ providerTransactionId: txnId });
    throw err;
  }
};

// ── revoke: EXACTLY the lineage subscription (never "all active") ───────────
const revokeExactSubscription = async (user, rc, reason) => {
  const sub = await lineage.findSubscriptionByLineage(user._id, {
    originalTransactionId: rc.originalTransactionId,
    transactionId: rc.transactionId,
    productId: rc.productId,
  });
  if (!sub) return null;
  if (!ACTIVE_SUB.includes(sub.status)) return sub; // already inactive
  sub.status = SUBSCRIPTION_STATUS.EXPIRED || "expired";
  sub.cancelledAt = new Date();
  sub.cancelReason = reason;
  await sub.save();
  return sub;
};

const setLineageSubFlag = async (user, rc, set) => {
  const sub = await lineage.findSubscriptionByLineage(user._id, {
    originalTransactionId: rc.originalTransactionId,
    transactionId: rc.transactionId,
    productId: rc.productId,
  });
  if (!sub) return null;
  Object.assign(sub, {});
  for (const [k, v] of Object.entries(set)) {
    if (k.startsWith("metadata.")) {
      sub.metadata = { ...(sub.metadata || {}), [k.slice("metadata.".length)]: v };
    } else {
      sub[k] = v;
    }
  }
  await sub.save();
  return sub;
};

// ── refund an event package (revoke if unused; keep audit if consumed) ──────
const refundEventEntitlement = async (rc) => {
  const txnId = rc.transactionId;
  const ent = await EventEntitlement.findOne({ providerTransactionId: txnId });
  await Payment.updateOne({ providerTransactionId: txnId }, { $set: { status: "refunded", refundedAt: new Date() } });
  if (!ent) return null;
  if (ent.status === "unused") {
    // Refund before use → revoke the linked per-event subscription too.
    if (ent.subscriptionId) {
      await Subscription.updateOne(
        { _id: ent.subscriptionId, status: { $in: ACTIVE_SUB } },
        { $set: { status: SUBSCRIPTION_STATUS.EXPIRED || "expired", cancelledAt: new Date(), cancelReason: "Store refund (unused event package)" } }
      );
    }
    ent.status = "refunded";
    ent.refundedAt = new Date();
    ent.refundReason = "refund_before_use";
    await ent.save();
  } else if (ent.status === "consumed") {
    // Refund after use → record the refund WITHOUT deleting audit history.
    ent.refundedAt = new Date();
    ent.refundReason = "refund_after_use";
    ent.resolution = "refund_required"; // ops follow the used-item policy
    await ent.save();
  }
  return ent;
};

const restoreReversedRefund = async (user, rc, decision) => {
  const txnId = rc.transactionId;
  const target = decision.target;
  await Payment.updateOne(
    { providerTransactionId: txnId, status: "refunded" },
    { $set: { status: "paid", refundedAt: null } }
  );
  if (target === "subscription") {
    // Canonical proof already required by the reducer (snapshot active) — restore
    // the EXACT revoked lineage subscription, not "some" subscription.
    const sub = await lineage.findSubscriptionByLineage(user._id, {
      originalTransactionId: rc.originalTransactionId,
      transactionId: rc.transactionId,
      productId: rc.productId,
    });
    if (sub && !ACTIVE_SUB.includes(sub.status)) {
      sub.status = SUBSCRIPTION_STATUS.ACTIVE;
      sub.cancelledAt = null;
      sub.cancelReason = null;
      if (typeof decision.expiresAtMs === "number") {
        sub.expiresAt = new Date(decision.expiresAtMs);
        sub.storeExpiresAt = new Date(decision.expiresAtMs);
      }
      await sub.save();
    }
    return sub?._id || null;
  }
  if (target === "event") {
    const ent = await EventEntitlement.findOne({ providerTransactionId: txnId });
    if (ent && ent.status === "refunded" && ent.refundReason === "refund_before_use") {
      ent.status = "unused";
      ent.refundedAt = null;
      ent.refundReason = null;
      await ent.save();
      // Re-activate the linked per-event subscription that the refund revoked.
      if (ent.subscriptionId) {
        await Subscription.updateOne(
          { _id: ent.subscriptionId, status: { $in: ["expired", "cancelled"] } },
          { $set: { status: SUBSCRIPTION_STATUS.ACTIVE, cancelledAt: null, cancelReason: null } }
        );
      }
    }
    return ent?._id || null;
  }
  if (target === "addon") {
    const a = await addonsService.reverseAddonRefund({ providerTransactionId: txnId, rcEventId: rc.eventId });
    return a?._id || null;
  }
  return null;
};

/**
 * Process one stored RevenueCatEvent. Returns a disposition the controller
 * persists: { status, reason, links, retryable, action }.
 *   status: processed | ignored | manual_review | dead_letter
 *   retryable:true → controller returns 500 so RevenueCat retries.
 */
const processEvent = async (rcEvent) => {
  const rc = rcEvent; // typed columns live directly on the doc
  const user = await resolveUser(rc.appUserId, rc.aliases, rc.originalAppUserId);
  if (!user) {
    // The user may not be "unknown" — they may have DELETED their account. The
    // UserModel pre-find hook excludes soft-deleted users, so resolveUser
    // returns null for a deleted account. A trailing post-deletion webhook (a
    // final EXPIRATION/CANCELLATION for the now-gone user) must be classified
    // DETERMINISTICALLY as `account_deleted` — a terminal, NON-retryable
    // disposition — rather than dead-lettering forever (LEGAL §7). Purchases
    // stay with the original App User ID by signed decision DEC-04, so there is
    // nothing to transfer or grant; we simply acknowledge and stop.
    const tomb = await findDeletionTombstone(rc.appUserId, rc.originalAppUserId, rc.aliases);
    if (tomb) {
      return { status: "ignored", reason: "account_deleted", links: {}, action: "account_deleted" };
    }
    return { status: "dead_letter", reason: "unknown_user", links: {} };
  }

  const links = { userId: user._id };
  const catalogItem = rc.catalogCode ? commerce.getEntryByCode(rc.catalogCode) : null;

  // Canonical recurring snapshot (only when the event may need it).
  let snapshot = { available: false };
  if (SNAPSHOT_TYPES.has(rc.type)) {
    snapshot = await rcApi.getRecurringSnapshot(rc.appUserId);
  }

  // Locate local state by lineage (for out-of-order / renewal decisions).
  const lin = { originalTransactionId: rc.originalTransactionId, transactionId: rc.transactionId, productId: rc.productId };
  const local = { subscription: null, eventEntitlement: null, addon: null };
  if (catalogItem?.kind === "subscription") {
    local.subscription = await lineage.findSubscriptionByLineage(user._id, lin);
  }

  const decision = reduce({
    type: rc.type,
    cancelReason: rc.cancelReason,
    catalogItem,
    local,
    snapshot,
    expiresAtMs: rc.expirationAtMs,
    productId: rc.productId,
  });

  // ── terminal / non-executing dispositions ─────────────────────────────────
  if (decision.action === ACTIONS.RETRY) {
    return { status: "retry", reason: decision.reason, links, retryable: true };
  }
  if (decision.action === ACTIONS.MANUAL_REVIEW) {
    return { status: "manual_review", reason: decision.reason, links, action: decision.action };
  }
  if (decision.action === ACTIONS.IGNORE) {
    return { status: "ignored", reason: decision.reason, links, action: decision.action };
  }
  if (decision.action === ACTIONS.CHANGE_DEFERRED_NOOP) {
    return { status: "processed", reason: decision.reason, links, action: decision.action };
  }

  // ── eligibility gate for granting actions (fail closed) ───────────────────
  if (GRANT_ACTIONS.has(decision.action) && catalogItem) {
    const elig = checkEligible(user, catalogItem);
    if (!elig.ok) {
      return { status: "dead_letter", reason: `ineligible_${elig.reason}`, links, action: decision.action };
    }
  }

  // ── execute the action ────────────────────────────────────────────────────
  try {
    await executeAction(decision, { user, rc, catalogItem, links });
  } catch (err) {
    // Unexpected execution failure → retryable (event stays claimable).
    logger.error("[revenuecat] action execution failed", { eventId: rc.eventId, action: decision.action, error: err.message });
    return { status: "retry", reason: `exec_failed_${decision.action}`, links, retryable: true, error: err.message };
  }

  return { status: "processed", reason: decision.reason, links, action: decision.action };
};

async function executeAction(decision, ctx) {
  const { user, rc, catalogItem, links } = ctx;
  const { action } = decision;

  switch (action) {
    case ACTIONS.GRANT_NEW:
    case ACTIONS.RENEW_AND_REFILL:
    case ACTIONS.CHANGE_EFFECTIVE_NOW: {
      if (decision.target === "addon" || catalogItem?.catalogType === "addon") {
        const spec = parseAddonCode(catalogItem.internalCode);
        if (!spec) throw new RevenueCatProcessError("unmapped_addon", true);
        const addon = await addonsService.grantAddonFromStore({
          userId: user._id,
          ...spec,
          catalogCode: catalogItem.internalCode,
          providerTransactionId: rc.transactionId || rc.eventId,
          originalTransactionId: rc.originalTransactionId,
          rcEventId: rc.eventId,
          store: rc.store,
          environment: rc.environment,
          catalogVersion: rc.catalogVersion,
          catalogHash: rc.catalogHash,
        });
        links.addonId = addon?._id;
        links.paymentId = await writeLedger(user._id, rc, {});
        return;
      }
      const plan = await resolvePlan(catalogItem);
      if (!plan) throw new RevenueCatProcessError("plan_not_found", true);
      if (catalogItem.kind === "event_consumable") {
        const ent = await grantConsumable(user, plan, rc);
        links.eventEntitlementId = ent?._id;
        links.subscriptionId = ent?.subscriptionId || undefined;
      } else {
        const sub = await grantSubscription(user, plan, rc, decision.expiresAtMs);
        links.subscriptionId = sub?._id;
      }
      links.paymentId = await writeLedger(user._id, rc, { subscriptionId: links.subscriptionId });
      return;
    }

    case ACTIONS.SET_CANCEL_AT_PERIOD_END:
      await setLineageSubFlag(user, rc, { cancelAtPeriodEnd: true });
      return;
    case ACTIONS.CLEAR_CANCEL_FLAG:
      // Un-cancellation: clear the flag ONLY — never refill (P0-06).
      await setLineageSubFlag(user, rc, { cancelAtPeriodEnd: false, "metadata.billingIssue": false });
      return;
    case ACTIONS.SET_BILLING_ISSUE:
      await setLineageSubFlag(user, rc, {
        "metadata.billingIssue": true,
        "metadata.graceUntil": decision.expiresAtMs ? new Date(decision.expiresAtMs) : null,
      });
      return;
    case ACTIONS.SET_PAUSED:
      await setLineageSubFlag(user, rc, { "metadata.paused": true });
      return;
    case ACTIONS.EXTEND_EXPIRY:
      if (typeof decision.expiresAtMs === "number") {
        await setLineageSubFlag(user, rc, { storeExpiresAt: new Date(decision.expiresAtMs), expiresAt: new Date(decision.expiresAtMs) });
      }
      return;

    case ACTIONS.REVOKE_EXACT_TRANSACTION: {
      await withTransaction(async () => {
        const sub = await revokeExactSubscription(user, rc, decision.reason === "refund_subscription" ? "Store refund" : "Store subscription expired");
        links.subscriptionId = sub?._id;
        if (decision.reason === "refund_subscription") {
          await Payment.updateOne({ providerTransactionId: rc.transactionId }, { $set: { status: "refunded", refundedAt: new Date() } });
        }
      }, { label: "rc.revoke" });
      return;
    }

    case ACTIONS.REFUND_EVENT_IF_UNUSED: {
      const ent = await refundEventEntitlement(rc);
      links.eventEntitlementId = ent?._id;
      return;
    }

    case ACTIONS.REFUND_ADDON: {
      const res = await addonsService.refundAddonFromStore({
        providerTransactionId: rc.transactionId,
        rcEventId: rc.eventId,
        catalogItem,
      });
      links.addonId = res?._id;
      return;
    }

    case ACTIONS.RESTORE_REVERSED_REFUND: {
      const restoredId = await restoreReversedRefund(user, rc, decision);
      if (decision.target === "subscription") links.subscriptionId = restoredId;
      else if (decision.target === "addon") links.addonId = restoredId;
      return;
    }

    default:
      throw new RevenueCatProcessError(`unhandled_action_${action}`, false);
  }
}

const resolvePlan = async (catalogItem) => {
  const Plan = require("../../../models/PlanModel");
  // getOrCreateByCode self-seeds from PLAN_DEFAULTS (same path changePlan uses),
  // so a first store purchase of a not-yet-seeded plan still resolves.
  return Plan.getOrCreateByCode(catalogItem.internalCode);
};

/**
 * Defense-in-depth stuck-lease sweep (BILL-02). A crashed worker leaves an event
 * `processing` with a past `leaseUntil`; RevenueCat's own retry reclaims it after
 * the lease expires, but this sweep (safe to run from the existing reconcile
 * tick) reprocesses stuck events proactively without waiting for the next
 * delivery. Idempotent and lease-guarded — concurrent sweeps can't double-run.
 */
const RevenueCatEvent = require("../../../models/RevenueCatEventModel");
const reclaimStuckLeases = async (limit = 20) => {
  const now = new Date();
  const stuck = await RevenueCatEvent.find({ processing: true, leaseUntil: { $lt: now } }).limit(limit).select("_id");
  const out = [];
  for (const s of stuck) {
    // Atomically re-claim (only if still stuck) so concurrent sweeps don't collide.
    // eslint-disable-next-line no-await-in-loop
    const ev = await RevenueCatEvent.findOneAndUpdate(
      { _id: s._id, processing: true, leaseUntil: { $lt: now } },
      { $set: { leaseOwner: "reclaim", leaseUntil: new Date(now.getTime() + 120000), lastAttemptAt: now }, $inc: { attemptCount: 1 } },
      { new: true }
    );
    if (!ev) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await processEvent(ev);
      if (result.retryable) {
        ev.processing = false; ev.leaseUntil = null; ev.status = "received"; ev.error = result.reason;
      } else {
        const links = result.links || {};
        Object.assign(ev, { status: result.status, reason: result.reason || null, processing: false, leaseUntil: null, processedAt: new Date(), userId: links.userId, subscriptionId: links.subscriptionId, eventEntitlementId: links.eventEntitlementId, addonId: links.addonId, paymentId: links.paymentId });
        ev.resolutionHistory.push({ action: `reclaim_${result.action || result.status}`, status: result.status, reason: result.reason, actor: "system" });
      }
      // eslint-disable-next-line no-await-in-loop
      await ev.save();
      out.push({ eventId: ev.eventId, status: ev.status });
    } catch (err) {
      ev.processing = false; ev.leaseUntil = null; ev.status = "received"; ev.error = err.message;
      // eslint-disable-next-line no-await-in-loop
      await ev.save().catch(() => {});
    }
  }
  return out;
};

module.exports = { processEvent, resolveUser, RevenueCatProcessError, writeLedger, grantConsumable, revokeExactSubscription, reclaimStuckLeases };
