/**
 * RevenueCat lifecycle reducer (BILL-03 · billing-plan §2.3/§2.4).
 *
 * PURE and database-independent: given a normalized event, the resolved
 * canonical catalog item, the current local state located by transaction
 * lineage, and the canonical RevenueCat subscriber snapshot, it returns an
 * explicit ACTION describing what the persistence layer must do. It performs no
 * I/O and reads no globals, so the entire provider-interpretation surface is
 * exhaustively unit-testable without Mongo (see test/revenuecat-reducer.test.js).
 *
 * Design rules encoded here (from the review findings + signed decisions):
 *  - Voluntary cancellation RETAINS access until canonical expiration (P0-04).
 *  - Refund / support cancellation affects ONLY the exact transaction/product
 *    (P0-04) and, for subscriptions, requires a trustworthy canonical snapshot;
 *    a missing snapshot on a DESTRUCTIVE event is a retryable failure, never a
 *    fallback revoke (P0-08).
 *  - Recurring state is read only from the ONE configured entitlement, never
 *    "the last active entitlement" (P0-09) — the caller passes a snapshot that
 *    was already scoped to that entitlement.
 *  - PRODUCT_CHANGE never grants the requested product before the canonical
 *    provider state reports it effective (billing-plan §2.4).
 *  - UNCANCELLATION only clears flags; it never refills usage (P0-06).
 *  - TRANSFER keeps entitlement with the original App User ID — no automatic
 *    cross-account transfer, no dual access (signed DEC-04) → manual review.
 *  - EXPIRATION revokes only the inactive lineage-matched item and never a newer
 *    replacement (billing-plan §2.4).
 */

// ── explicit action vocabulary ──────────────────────────────────────────────
const ACTIONS = Object.freeze({
  GRANT_NEW: "GRANT_NEW", // create the exact item (subscription/event/add-on)
  RENEW_AND_REFILL: "RENEW_AND_REFILL", // recurring: refill pool for the new period
  CHANGE_EFFECTIVE_NOW: "CHANGE_EFFECTIVE_NOW", // product change canonical-effective now
  CHANGE_DEFERRED_NOOP: "CHANGE_DEFERRED_NOOP", // product change not yet effective
  SET_CANCEL_AT_PERIOD_END: "SET_CANCEL_AT_PERIOD_END", // voluntary cancel, keep access
  CLEAR_CANCEL_FLAG: "CLEAR_CANCEL_FLAG", // un-cancellation, NO refill
  SET_BILLING_ISSUE: "SET_BILLING_ISSUE", // grace, keep access to canonical expiry
  SET_PAUSED: "SET_PAUSED", // pause, revoke later on matching expiration
  EXTEND_EXPIRY: "EXTEND_EXPIRY", // extension of the exact subscription
  REVOKE_EXACT_TRANSACTION: "REVOKE_EXACT_TRANSACTION", // revoke exactly the lineage item
  REFUND_EVENT_IF_UNUSED: "REFUND_EVENT_IF_UNUSED", // event package: revoke if unused
  REFUND_ADDON: "REFUND_ADDON", // add-on refund/clawback
  RESTORE_REVERSED_REFUND: "RESTORE_REVERSED_REFUND", // reversal of a prior refund
  MANUAL_REVIEW: "MANUAL_REVIEW", // transfer / temporary / contradictory
  RETRY: "RETRY", // canonical snapshot unavailable on a destructive event
  IGNORE: "IGNORE", // test / unknown / no-op
});

// Event types RevenueCat can deliver that this reducer understands.
const KNOWN_TYPES = Object.freeze([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "CANCELLATION",
  "UNCANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "SUBSCRIPTION_PAUSED",
  "SUBSCRIPTION_EXTENDED",
  "NON_RENEWING_PURCHASE",
  "REFUND",
  "REFUND_REVERSED",
  "TRANSFER",
  "TEMPORARY_ENTITLEMENT_GRANT",
  "TEST",
]);

// A CANCELLATION whose cancel_reason marks a support/refund action (as opposed
// to a voluntary "won't renew"). Only these are destructive to access.
const REFUND_CANCEL_REASONS = Object.freeze(["CUSTOMER_SUPPORT"]);

const decision = (action, reason, extra = {}) => ({ action, reason, ...extra });

const isSubscriptionItem = (item) => item && item.kind === "subscription";
const isEventConsumable = (item) => item && item.kind === "event_consumable";
const isAddonItem = (item) =>
  item && (item.catalogType === "addon" || item.kind === "addon_consumable");

/** Is this CANCELLATION/REFUND a support-driven refund (destructive)? */
const isRefundReason = (cancelReason) =>
  REFUND_CANCEL_REASONS.includes(String(cancelReason || "").toUpperCase());

/**
 * Reduce one normalized RevenueCat event to an explicit action.
 *
 * @param {object} input
 * @param {string} input.type            RevenueCat event type.
 * @param {string|null} [input.cancelReason]  cancel_reason for CANCELLATION.
 * @param {object|null} input.catalogItem     resolved canonical catalog entry
 *   ({ catalogType, kind, internalCode, revenueCatEntitlementId, refundPolicy,
 *   family, planType }) or null when the event carries no product.
 * @param {object} [input.local]         local state located by lineage:
 *   { subscription, eventEntitlement, addon } — each may be null.
 * @param {object} [input.snapshot]      canonical recurring snapshot, already
 *   scoped to the configured entitlement:
 *   { available:boolean, entitlementActive:boolean, effectiveProductId, expiresAtMs }.
 * @param {number|null} [input.expiresAtMs]  event expiration fallback (ms).
 * @param {string|null} [input.productId]     lineage product id.
 * @returns {{action:string, reason:string, retryable?:boolean, target?:string, expiresAtMs?:number|null}}
 */
function reduce(input = {}) {
  const {
    type,
    cancelReason = null,
    catalogItem = null,
    local = {},
    snapshot = { available: false },
    expiresAtMs = null,
  } = input;

  if (!type || typeof type !== "string") {
    return decision(ACTIONS.IGNORE, "missing_type");
  }
  if (!KNOWN_TYPES.includes(type)) {
    // Unknown types are observable + ignored — NEVER an accidental grant.
    return decision(ACTIONS.IGNORE, "unknown_type");
  }

  const snap = snapshot || { available: false };
  const target = isSubscriptionItem(catalogItem)
    ? "subscription"
    : isEventConsumable(catalogItem)
      ? "event"
      : isAddonItem(catalogItem)
        ? "addon"
        : "unknown";

  switch (type) {
    // ── product-less events (no catalog mapping required) ──────────────────
    case "TRANSFER":
      // Signed DEC-04: keep with the original App User ID; no automatic
      // cross-account transfer, no dual access. Legitimate migration is manual.
      return decision(ACTIONS.MANUAL_REVIEW, "transfer_keep_original_user");

    case "TEMPORARY_ENTITLEMENT_GRANT":
      // Halaa does NOT auto-honor temporary recurring grants (no signed policy
      // to). Park for manual review; reconcile the later real purchase/expiry.
      return decision(ACTIONS.MANUAL_REVIEW, "temporary_grant_not_auto_honored");

    case "TEST":
      return decision(ACTIONS.IGNORE, "test_event");

    default:
      break;
  }

  // Product events past this point should have a resolved catalog item; the
  // controller dead-letters unmapped/catalog-unavailable products before here,
  // but stay defensive so the reducer never throws.
  if (!catalogItem) {
    return decision(ACTIONS.MANUAL_REVIEW, "missing_catalog_item");
  }

  switch (type) {
    case "INITIAL_PURCHASE":
    case "NON_RENEWING_PURCHASE": {
      // NON_RENEWING_PURCHASE must be event/add-on only, never a subscription.
      if (type === "NON_RENEWING_PURCHASE" && isSubscriptionItem(catalogItem)) {
        return decision(ACTIONS.MANUAL_REVIEW, "non_renewing_on_subscription");
      }
      return decision(ACTIONS.GRANT_NEW, "initial_purchase", {
        target,
        expiresAtMs: pickExpiry(snap, expiresAtMs, isSubscriptionItem(catalogItem)),
      });
    }

    case "RENEWAL": {
      if (!isSubscriptionItem(catalogItem)) {
        return decision(ACTIONS.IGNORE, "renewal_non_subscription");
      }
      // Out-of-order safety: a RENEWAL that arrives before the INITIAL_PURCHASE
      // has no local subscription to refill → create it (executor is idempotent
      // on the transaction lineage).
      if (!local.subscription) {
        return decision(ACTIONS.GRANT_NEW, "renewal_without_local_grant", {
          target: "subscription",
          expiresAtMs: pickExpiry(snap, expiresAtMs, true),
        });
      }
      return decision(ACTIONS.RENEW_AND_REFILL, "renewal", {
        target: "subscription",
        expiresAtMs: pickExpiry(snap, expiresAtMs, true),
      });
    }

    case "PRODUCT_CHANGE": {
      if (!isSubscriptionItem(catalogItem)) {
        return decision(ACTIONS.IGNORE, "product_change_non_subscription");
      }
      // Only apply when the canonical snapshot confirms this product is the
      // effective active one. No snapshot / not-yet-effective → defer (never
      // grant the requested product early). Deferral is safe (not destructive).
      if (snap.available && snap.effectiveProductId && input.productId &&
          snap.effectiveProductId === input.productId && snap.entitlementActive) {
        return decision(ACTIONS.CHANGE_EFFECTIVE_NOW, "product_change_effective", {
          target: "subscription",
          expiresAtMs: pickExpiry(snap, expiresAtMs, true),
        });
      }
      return decision(ACTIONS.CHANGE_DEFERRED_NOOP, "product_change_deferred", {
        target: "subscription",
      });
    }

    case "UNCANCELLATION":
      // Clear cancellation flags ONLY — never refill usage (P0-06).
      return decision(ACTIONS.CLEAR_CANCEL_FLAG, "uncancellation", {
        target: "subscription",
      });

    case "CANCELLATION": {
      if (!isRefundReason(cancelReason)) {
        // Voluntary "won't renew": retain access until canonical expiry.
        if (isSubscriptionItem(catalogItem)) {
          return decision(ACTIONS.SET_CANCEL_AT_PERIOD_END, "voluntary_cancellation", {
            target: "subscription",
          });
        }
        // Consumables/add-ons don't auto-renew — nothing to flag.
        return decision(ACTIONS.IGNORE, "noop_consumable_cancellation");
      }
      // Support/refund cancellation → refund the EXACT item only.
      return refundExactItem(catalogItem, snap, target);
    }

    case "REFUND":
      // Defensive: some integrations emit an explicit REFUND type. Treat it as a
      // support refund of the exact item.
      return refundExactItem(catalogItem, snap, target);

    case "EXPIRATION": {
      if (!isSubscriptionItem(catalogItem)) {
        // Consumable/add-on access is not revoked by an expiration webhook.
        return decision(ACTIONS.IGNORE, "expiration_non_subscription");
      }
      // Destructive: MUST have a trustworthy canonical snapshot (P0-08).
      if (!snap.available) {
        return decision(ACTIONS.RETRY, "snapshot_unavailable", { retryable: true });
      }
      // Never revoke a still-active entitlement (a newer replacement).
      if (snap.entitlementActive) {
        return decision(ACTIONS.IGNORE, "still_active_newer_replacement", {
          target: "subscription",
        });
      }
      return decision(ACTIONS.REVOKE_EXACT_TRANSACTION, "expired", {
        target: "subscription",
      });
    }

    case "BILLING_ISSUE":
      // Grace: keep access until canonical expiry; record the grace deadline.
      return decision(ACTIONS.SET_BILLING_ISSUE, "billing_issue", {
        target: "subscription",
        expiresAtMs: snap.available ? snap.expiresAtMs ?? null : expiresAtMs,
      });

    case "SUBSCRIPTION_PAUSED":
      // No immediate revoke; the matching EXPIRATION will revoke later.
      return decision(ACTIONS.SET_PAUSED, "paused", { target: "subscription" });

    case "SUBSCRIPTION_EXTENDED":
      return decision(ACTIONS.EXTEND_EXPIRY, "extended", {
        target: "subscription",
        expiresAtMs: pickExpiry(snap, expiresAtMs, true),
      });

    case "REFUND_REVERSED": {
      // Restore the exact item ONLY when canonical proof permits.
      if (isSubscriptionItem(catalogItem)) {
        if (!snap.available) {
          return decision(ACTIONS.RETRY, "snapshot_unavailable", { retryable: true });
        }
        if (!snap.entitlementActive) {
          // Reversal claims access is restored, but canonical says inactive →
          // do not blindly grant; escalate.
          return decision(ACTIONS.MANUAL_REVIEW, "reversal_contradicts_snapshot", {
            target: "subscription",
          });
        }
        return decision(ACTIONS.RESTORE_REVERSED_REFUND, "refund_reversed", {
          target: "subscription",
          expiresAtMs: pickExpiry(snap, expiresAtMs, true),
        });
      }
      // Event/add-on reversal is transaction-scoped (local refunded row is the
      // proof) — restore exactly that item, idempotently.
      return decision(ACTIONS.RESTORE_REVERSED_REFUND, "refund_reversed", { target });
    }

    default:
      return decision(ACTIONS.IGNORE, `unhandled_${type}`);
  }
}

/**
 * Refund the exact item indicated by the catalog kind. Subscriptions are
 * destructive and require a canonical snapshot; consumables/add-ons are
 * transaction-scoped (the exact local row) and do not.
 */
function refundExactItem(catalogItem, snap, target) {
  if (isSubscriptionItem(catalogItem)) {
    if (!snap.available) {
      return decision(ACTIONS.RETRY, "snapshot_unavailable", { retryable: true });
    }
    // Revoke exactly this transaction's subscription; snapshot guards against
    // revoking a newer active replacement under a different original txn.
    return decision(ACTIONS.REVOKE_EXACT_TRANSACTION, "refund_subscription", {
      target: "subscription",
    });
  }
  if (isEventConsumable(catalogItem)) {
    return decision(ACTIONS.REFUND_EVENT_IF_UNUSED, "refund_event", { target: "event" });
  }
  if (isAddonItem(catalogItem)) {
    return decision(ACTIONS.REFUND_ADDON, "refund_addon", { target: "addon" });
  }
  return decision(ACTIONS.MANUAL_REVIEW, "refund_unknown_kind");
}

/**
 * Canonical expiry preference: the live snapshot's entitlement expiry wins; the
 * event's expiration_at_ms is the fallback. Only subscriptions carry an expiry.
 */
function pickExpiry(snap, eventExpiryMs, isSubscription) {
  if (!isSubscription) return null;
  if (snap && snap.available && typeof snap.expiresAtMs === "number") {
    return snap.expiresAtMs;
  }
  return typeof eventExpiryMs === "number" ? eventExpiryMs : null;
}

module.exports = {
  reduce,
  ACTIONS,
  KNOWN_TYPES,
  REFUND_CANCEL_REASONS,
  isRefundReason,
};
