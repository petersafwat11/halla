/**
 * Native-billing shared constants (PURE — no react-native import so this is
 * node-testable). The RN layer (services/purchases.js) maps REPLACEMENT_MODE
 * keys onto `Purchases.STORE_REPLACEMENT_MODE`.
 */

"use strict";

// react-native-purchases STORE_REPLACEMENT_MODE keys (values === keys in the
// SDK enum, so passing the string is safe across versions).
const REPLACEMENT_MODE = Object.freeze({
  WITHOUT_PRORATION: "WITHOUT_PRORATION",
  WITH_TIME_PRORATION: "WITH_TIME_PRORATION",
  CHARGE_FULL_PRICE: "CHARGE_FULL_PRICE",
  CHARGE_PRORATED_PRICE: "CHARGE_PRORATED_PRICE",
  DEFERRED: "DEFERRED",
});

// Deterministic states from POST /payments/revenuecat/reconcile-exact.
const RECONCILE_STATE = Object.freeze({
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

// reconcile-exact `operation` values (audit/telemetry on the backend).
const PURCHASE_OPERATION = Object.freeze({
  PURCHASE: "purchase",
  RESTORE: "restore",
  CHANGE: "change",
  ADDON: "addon",
});

const STORE_OFFERINGS = Object.freeze([
  "host_plans",
  "business_plans",
  "host_addons",
  "business_addons",
]);

module.exports = {
  REPLACEMENT_MODE,
  RECONCILE_STATE,
  PURCHASE_OPERATION,
  STORE_OFFERINGS,
};
