/**
 * Exact purchase reconciliation — deterministic state derivation (MOB-01 · §6).
 * PURE. Given the EXACT attempted item (catalog code / kind) and the local
 * records located by that item's transaction lineage, derive one deterministic
 * state. It must NOT report success merely because the user has SOME backend
 * access (P0-02) — only the exact expected item counts.
 *
 * States (safe for the mobile Session-3 contract):
 *   pending | fulfilled | active | consumed | superseded |
 *   refund_required | refunded | manual_review | failed
 */

const STATES = Object.freeze({
  PENDING: "pending",
  FULFILLED: "fulfilled",
  ACTIVE: "active",
  CONSUMED: "consumed",
  SUPERSEDED: "superseded",
  REFUND_REQUIRED: "refund_required",
  REFUNDED: "refunded",
  MANUAL_REVIEW: "manual_review",
  FAILED: "failed",
});

const ACTIVE_SUB = new Set(["active", "trial"]);

/**
 * @param {object|null} catalogItem
 * @param {object} records { subscription, eventEntitlement, addon, event }
 * @returns {{ state:string, reason:string }}
 */
function deriveExactState(catalogItem, records = {}) {
  if (!catalogItem) return { state: STATES.FAILED, reason: "unknown_catalog_code" };
  const { subscription, eventEntitlement, addon, event } = records;

  // A dead-lettered or manual-review webhook for this exact transaction is
  // authoritative over an absent local grant.
  const eventStatus = event?.status || null;

  if (catalogItem.kind === "subscription") {
    if (subscription) {
      if (ACTIVE_SUB.has(subscription.status)) return { state: STATES.ACTIVE, reason: "active" };
      if (subscription.cancelReason && /refund/i.test(subscription.cancelReason)) return { state: STATES.REFUNDED, reason: "refunded" };
      return { state: STATES.SUPERSEDED, reason: "no_longer_active" };
    }
    if (eventStatus === "dead_letter") return { state: STATES.FAILED, reason: event.reason || "dead_letter" };
    if (eventStatus === "manual_review") return { state: STATES.MANUAL_REVIEW, reason: event.reason || "manual_review" };
    return { state: STATES.PENDING, reason: "awaiting_webhook" };
  }

  if (catalogItem.kind === "event_consumable") {
    if (eventEntitlement) {
      if (eventEntitlement.resolution === "manual_review") return { state: STATES.MANUAL_REVIEW, reason: "eligibility_race" };
      if (eventEntitlement.resolution === "refund_required") return { state: STATES.REFUND_REQUIRED, reason: "refund_required" };
      if (eventEntitlement.status === "unused") return { state: STATES.FULFILLED, reason: "unused" };
      if (eventEntitlement.status === "consumed") return { state: STATES.CONSUMED, reason: "consumed" };
      if (eventEntitlement.status === "refunded") return { state: STATES.REFUNDED, reason: "refunded" };
    }
    if (eventStatus === "dead_letter") return { state: STATES.FAILED, reason: event.reason || "dead_letter" };
    if (eventStatus === "manual_review") return { state: STATES.MANUAL_REVIEW, reason: event.reason || "manual_review" };
    return { state: STATES.PENDING, reason: "awaiting_webhook" };
  }

  // add-on
  if (addon) {
    if (addon.refundState === "refunded") return { state: STATES.REFUNDED, reason: "refunded" };
    if (addon.refundState === "refund_required" || addon.status === "failed_quota") return { state: STATES.REFUND_REQUIRED, reason: "fulfillment_failed" };
    if (addon.refundState === "manual_review") return { state: STATES.MANUAL_REVIEW, reason: "managed_service_review" };
    if (addon.status === "active" || addon.status === "fulfilled") return { state: STATES.FULFILLED, reason: addon.status };
    if (["pending", "pending_3ds", "pending_provisioning", "paid", "queued", "in_progress"].includes(addon.status)) return { state: STATES.PENDING, reason: addon.status };
    if (addon.status === "cancelled") return { state: STATES.REFUNDED, reason: "cancelled" };
  }
  if (eventStatus === "dead_letter") return { state: STATES.FAILED, reason: event.reason || "dead_letter" };
  if (eventStatus === "manual_review") return { state: STATES.MANUAL_REVIEW, reason: event.reason || "manual_review" };
  return { state: STATES.PENDING, reason: "awaiting_webhook" };
}

module.exports = { deriveExactState, STATES };
