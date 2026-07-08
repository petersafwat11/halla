/**
 * Exact-reconcile state → UI semantics (MOB-01 · §2/§8). PURE — node-testable.
 *
 * Maps the 9 deterministic backend states onto: keep-polling vs terminal,
 * success vs not, a category (for i18n) and a status-badge tone. Success is
 * granted ONLY for the exact expected purchase (active | fulfilled | consumed)
 * — never from generic access (P0-02).
 */

"use strict";

// `tone` values are the canonical statusColors tone keys
// (success|warning|danger|info|neutral) so the UI can index STATUS_TONES directly.
const STATE_MAP = Object.freeze({
  pending: { terminal: false, success: false, category: "pending", tone: "warning" },
  active: { terminal: true, success: true, category: "active", tone: "success" },
  fulfilled: { terminal: true, success: true, category: "fulfilled", tone: "success" },
  consumed: { terminal: true, success: true, category: "consumed", tone: "info" },
  superseded: { terminal: true, success: false, category: "superseded", tone: "neutral" },
  refund_required: { terminal: true, success: false, category: "refund_required", tone: "warning" },
  refunded: { terminal: true, success: false, category: "refunded", tone: "info" },
  manual_review: { terminal: true, success: false, category: "manual_review", tone: "info" },
  failed: { terminal: true, success: false, category: "failed", tone: "danger" },
});

/** Semantics for a reconcile state (unknown → treated as still-pending). */
function mapReconcileState(state) {
  return STATE_MAP[state] || { terminal: false, success: false, category: "pending", tone: "warning" };
}

/** i18n key (namespace 'plans') for the user-facing message of a state. */
function stateMessageKey(state) {
  return `iapStates.${mapReconcileState(state).category}`;
}

/**
 * Terminal-but-unresolved states that should point the user to support / a
 * refresh rather than reporting success or a hard failure.
 */
function needsSupportAttention(state) {
  return state === "manual_review" || state === "refund_required";
}

/** A RevenueCat purchase cancellation is NOT an error (§2 — respect cancellation). */
function isPurchaseCancelled(error) {
  if (!error) return false;
  return (
    error.userCancelled === true ||
    error.code === "PURCHASE_CANCELLED" ||
    error.code === "PurchaseCancelledError"
  );
}

module.exports = {
  mapReconcileState,
  stateMessageKey,
  needsSupportAttention,
  isPurchaseCancelled,
  STATE_MAP,
};
