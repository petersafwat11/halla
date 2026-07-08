/**
 * Subscription change classification + Google replacement-mode selection
 * (P0-07 / MOB-02 · DECISION-RECORD §E). PURE — node-testable.
 *
 * Classification is by catalog ORDER (billing period + invite tier), NEVER by
 * store price strings (§5.3). The backend reconciles the EFFECTIVE product, so a
 * misclassified mode affects billing timing only, not the final entitlement.
 */

"use strict";

const { REPLACEMENT_MODE } = require("./constants");

// Ordinal weight per billing period; higher = a "bigger" recurring commitment.
const PERIOD_WEIGHT = Object.freeze({ monthly: 1, quarterly: 2, annual: 3 });

/** Comparable numeric rank for a subscription entry (period dominates, tier breaks ties). */
function planRank(entry) {
  if (!entry) return null;
  const period = PERIOD_WEIGHT[entry.billingPeriod] || 0;
  const tier = Number(entry.tier) || 0;
  return period * 100000 + tier;
}

/**
 * Classify current → target: 'new' | 'upgrade' | 'downgrade' | 'crossgrade'.
 * Only subscription→subscription changes classify; anything else is 'new'
 * (a fresh purchase, no replacement).
 */
function classifyChange(currentEntry, targetEntry) {
  if (!targetEntry || targetEntry.kind !== "subscription") return "new";
  if (!currentEntry || currentEntry.kind !== "subscription") return "new";
  if (currentEntry.internalCode === targetEntry.internalCode) return "crossgrade";
  const a = planRank(currentEntry);
  const b = planRank(targetEntry);
  if (a == null || b == null) return "crossgrade";
  if (b > a) return "upgrade";
  if (b < a) return "downgrade";
  return "crossgrade";
}

/**
 * Owner/technical default replacement modes (DECISION-RECORD §E):
 *   upgrade    → immediate, prorated       (CHARGE_PRORATED_PRICE)
 *   downgrade  → deferred to next renewal   (DEFERRED)
 *   crossgrade → immediate w/ time proration (WITH_TIME_PRORATION)
 *   new        → null (no replacement)
 */
function selectReplacementMode(changeType) {
  switch (changeType) {
    case "upgrade":
      return REPLACEMENT_MODE.CHARGE_PRORATED_PRICE;
    case "downgrade":
      return REPLACEMENT_MODE.DEFERRED;
    case "crossgrade":
      return REPLACEMENT_MODE.WITH_TIME_PRORATION;
    default:
      return null;
  }
}

/** True when the change takes effect at the next renewal (deferred), not now. */
function isDeferredChange(changeType) {
  return selectReplacementMode(changeType) === REPLACEMENT_MODE.DEFERRED;
}

module.exports = {
  PERIOD_WEIGHT,
  planRank,
  classifyChange,
  selectReplacementMode,
  isDeferredChange,
};
