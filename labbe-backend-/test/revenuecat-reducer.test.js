/**
 * Exhaustive unit tests for the pure RevenueCat lifecycle reducer (BILL-03).
 * DB-free, provider-free, credential-free — every provider-interpretation path.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reduce,
  ACTIONS,
  isRefundReason,
} = require("../src/modules/payments/revenuecat.reducer");

// ── catalog-item fixtures ────────────────────────────────────────────────────
const SUB = {
  catalogType: "plan",
  kind: "subscription",
  internalCode: "premium_monthly_100",
  revenueCatEntitlementId: "recurring_access",
  refundPolicy: "standard_store",
};
const EVENT = {
  catalogType: "plan",
  kind: "event_consumable",
  internalCode: "basic_event_50",
  revenueCatEntitlementId: null,
  refundPolicy: "unused_only",
};
const ADDON = {
  catalogType: "addon",
  kind: "addon_consumable",
  internalCode: "extra_invites_50",
  revenueCatEntitlementId: null,
  refundPolicy: "clawback_unused",
};

const snapAvailableActive = (productId, expiresAtMs = Date.now() + 86_400_000) => ({
  available: true,
  entitlementActive: true,
  effectiveProductId: productId,
  expiresAtMs,
});
const snapAvailableInactive = () => ({
  available: true,
  entitlementActive: false,
  effectiveProductId: null,
  expiresAtMs: Date.now() - 1000,
});
const snapUnavailable = () => ({ available: false });

// ── INITIAL_PURCHASE ─────────────────────────────────────────────────────────
test("INITIAL_PURCHASE subscription → GRANT_NEW (subscription)", () => {
  const d = reduce({ type: "INITIAL_PURCHASE", catalogItem: SUB, snapshot: snapUnavailable(), expiresAtMs: 111 });
  assert.equal(d.action, ACTIONS.GRANT_NEW);
  assert.equal(d.target, "subscription");
  assert.equal(d.expiresAtMs, 111);
});

test("INITIAL_PURCHASE event package → GRANT_NEW (event), no expiry invented", () => {
  const d = reduce({ type: "INITIAL_PURCHASE", catalogItem: EVENT, expiresAtMs: 999 });
  assert.equal(d.action, ACTIONS.GRANT_NEW);
  assert.equal(d.target, "event");
  assert.equal(d.expiresAtMs, null); // one-time products get no invented expiry
});

test("INITIAL_PURCHASE add-on → GRANT_NEW (addon)", () => {
  const d = reduce({ type: "INITIAL_PURCHASE", catalogItem: ADDON });
  assert.equal(d.action, ACTIONS.GRANT_NEW);
  assert.equal(d.target, "addon");
});

test("INITIAL_PURCHASE prefers snapshot expiry over event expiry for subscriptions", () => {
  const exp = Date.now() + 5_000;
  const d = reduce({ type: "INITIAL_PURCHASE", catalogItem: SUB, snapshot: snapAvailableActive(SUB.internalCode, exp), expiresAtMs: 111 });
  assert.equal(d.expiresAtMs, exp);
});

// ── RENEWAL ──────────────────────────────────────────────────────────────────
test("RENEWAL with existing local sub → RENEW_AND_REFILL", () => {
  const d = reduce({ type: "RENEWAL", catalogItem: SUB, local: { subscription: { _id: "x" } }, snapshot: snapUnavailable(), expiresAtMs: 222 });
  assert.equal(d.action, ACTIONS.RENEW_AND_REFILL);
  assert.equal(d.expiresAtMs, 222);
});

test("RENEWAL out-of-order (no local sub yet) → GRANT_NEW", () => {
  const d = reduce({ type: "RENEWAL", catalogItem: SUB, local: { subscription: null } });
  assert.equal(d.action, ACTIONS.GRANT_NEW);
  assert.equal(d.reason, "renewal_without_local_grant");
});

test("RENEWAL of a non-subscription is ignored", () => {
  const d = reduce({ type: "RENEWAL", catalogItem: EVENT });
  assert.equal(d.action, ACTIONS.IGNORE);
  assert.equal(d.reason, "renewal_non_subscription");
});

// ── PRODUCT_CHANGE ───────────────────────────────────────────────────────────
test("PRODUCT_CHANGE not-yet-effective → deferred no-op (does NOT grant early)", () => {
  const d = reduce({
    type: "PRODUCT_CHANGE",
    catalogItem: SUB,
    productId: "com.halla.premium_monthly_100",
    snapshot: snapAvailableActive("com.halla.basic_monthly_50"), // still on old product
  });
  assert.equal(d.action, ACTIONS.CHANGE_DEFERRED_NOOP);
});

test("PRODUCT_CHANGE canonical-effective now → CHANGE_EFFECTIVE_NOW", () => {
  const d = reduce({
    type: "PRODUCT_CHANGE",
    catalogItem: SUB,
    productId: "com.halla.premium_monthly_100",
    snapshot: snapAvailableActive("com.halla.premium_monthly_100"),
  });
  assert.equal(d.action, ACTIONS.CHANGE_EFFECTIVE_NOW);
});

test("PRODUCT_CHANGE with no snapshot defers (never grants early)", () => {
  const d = reduce({ type: "PRODUCT_CHANGE", catalogItem: SUB, productId: "p", snapshot: snapUnavailable() });
  assert.equal(d.action, ACTIONS.CHANGE_DEFERRED_NOOP);
});

// ── UNCANCELLATION ───────────────────────────────────────────────────────────
test("UNCANCELLATION → CLEAR_CANCEL_FLAG, never refills (P0-06)", () => {
  const d = reduce({ type: "UNCANCELLATION", catalogItem: SUB, local: { subscription: { _id: "x" } } });
  assert.equal(d.action, ACTIONS.CLEAR_CANCEL_FLAG);
  assert.notEqual(d.action, ACTIONS.RENEW_AND_REFILL);
});

// ── CANCELLATION (by reason) ─────────────────────────────────────────────────
test("CANCELLATION voluntary (UNSUBSCRIBE) → cancel-at-period-end, keeps access", () => {
  const d = reduce({ type: "CANCELLATION", cancelReason: "UNSUBSCRIBE", catalogItem: SUB });
  assert.equal(d.action, ACTIONS.SET_CANCEL_AT_PERIOD_END);
});

test("CANCELLATION voluntary (PRICE_INCREASE/BILLING_ERROR) → cancel-at-period-end", () => {
  for (const r of ["PRICE_INCREASE", "BILLING_ERROR", "DEVELOPER_INITIATED", "UNKNOWN"]) {
    const d = reduce({ type: "CANCELLATION", cancelReason: r, catalogItem: SUB });
    assert.equal(d.action, ACTIONS.SET_CANCEL_AT_PERIOD_END, `reason ${r}`);
  }
});

test("CANCELLATION refund (CUSTOMER_SUPPORT) on subscription → REVOKE_EXACT with snapshot", () => {
  const d = reduce({ type: "CANCELLATION", cancelReason: "CUSTOMER_SUPPORT", catalogItem: SUB, snapshot: snapAvailableInactive() });
  assert.equal(d.action, ACTIONS.REVOKE_EXACT_TRANSACTION);
  assert.equal(d.target, "subscription");
});

test("CANCELLATION refund on subscription with NO snapshot → RETRY (never fallback revoke, P0-08)", () => {
  const d = reduce({ type: "CANCELLATION", cancelReason: "CUSTOMER_SUPPORT", catalogItem: SUB, snapshot: snapUnavailable() });
  assert.equal(d.action, ACTIONS.RETRY);
  assert.equal(d.retryable, true);
});

test("CANCELLATION refund on event package → REFUND_EVENT_IF_UNUSED (no snapshot needed)", () => {
  const d = reduce({ type: "CANCELLATION", cancelReason: "CUSTOMER_SUPPORT", catalogItem: EVENT, snapshot: snapUnavailable() });
  assert.equal(d.action, ACTIONS.REFUND_EVENT_IF_UNUSED);
});

test("CANCELLATION refund on add-on → REFUND_ADDON", () => {
  const d = reduce({ type: "CANCELLATION", cancelReason: "CUSTOMER_SUPPORT", catalogItem: ADDON });
  assert.equal(d.action, ACTIONS.REFUND_ADDON);
});

test("CANCELLATION voluntary on consumable → no-op", () => {
  const d = reduce({ type: "CANCELLATION", cancelReason: "UNSUBSCRIBE", catalogItem: EVENT });
  assert.equal(d.action, ACTIONS.IGNORE);
  assert.equal(d.reason, "noop_consumable_cancellation");
});

// ── EXPIRATION ───────────────────────────────────────────────────────────────
test("EXPIRATION with snapshot inactive → REVOKE_EXACT_TRANSACTION", () => {
  const d = reduce({ type: "EXPIRATION", catalogItem: SUB, snapshot: snapAvailableInactive() });
  assert.equal(d.action, ACTIONS.REVOKE_EXACT_TRANSACTION);
});

test("EXPIRATION with snapshot STILL ACTIVE → ignore (never revoke a newer replacement)", () => {
  const d = reduce({ type: "EXPIRATION", catalogItem: SUB, snapshot: snapAvailableActive(SUB.internalCode) });
  assert.equal(d.action, ACTIONS.IGNORE);
  assert.equal(d.reason, "still_active_newer_replacement");
});

test("EXPIRATION with NO snapshot → RETRY (fail closed, P0-08)", () => {
  const d = reduce({ type: "EXPIRATION", catalogItem: SUB, snapshot: snapUnavailable() });
  assert.equal(d.action, ACTIONS.RETRY);
  assert.equal(d.retryable, true);
});

test("EXPIRATION on a consumable is ignored", () => {
  const d = reduce({ type: "EXPIRATION", catalogItem: EVENT, snapshot: snapUnavailable() });
  assert.equal(d.action, ACTIONS.IGNORE);
  assert.equal(d.reason, "expiration_non_subscription");
});

// ── BILLING_ISSUE / PAUSE / EXTEND ───────────────────────────────────────────
test("BILLING_ISSUE → SET_BILLING_ISSUE, keeps access", () => {
  const d = reduce({ type: "BILLING_ISSUE", catalogItem: SUB, snapshot: snapUnavailable(), expiresAtMs: 42 });
  assert.equal(d.action, ACTIONS.SET_BILLING_ISSUE);
  assert.equal(d.expiresAtMs, 42);
});

test("SUBSCRIPTION_PAUSED → SET_PAUSED, no immediate revoke", () => {
  const d = reduce({ type: "SUBSCRIPTION_PAUSED", catalogItem: SUB });
  assert.equal(d.action, ACTIONS.SET_PAUSED);
});

test("SUBSCRIPTION_EXTENDED → EXTEND_EXPIRY (exact subscription)", () => {
  const exp = Date.now() + 10_000;
  const d = reduce({ type: "SUBSCRIPTION_EXTENDED", catalogItem: SUB, snapshot: snapAvailableActive(SUB.internalCode, exp) });
  assert.equal(d.action, ACTIONS.EXTEND_EXPIRY);
  assert.equal(d.expiresAtMs, exp);
});

// ── NON_RENEWING_PURCHASE ────────────────────────────────────────────────────
test("NON_RENEWING_PURCHASE event → GRANT_NEW (event)", () => {
  const d = reduce({ type: "NON_RENEWING_PURCHASE", catalogItem: EVENT });
  assert.equal(d.action, ACTIONS.GRANT_NEW);
  assert.equal(d.target, "event");
});

test("NON_RENEWING_PURCHASE mapped to a subscription is contradictory → MANUAL_REVIEW", () => {
  const d = reduce({ type: "NON_RENEWING_PURCHASE", catalogItem: SUB });
  assert.equal(d.action, ACTIONS.MANUAL_REVIEW);
  assert.equal(d.reason, "non_renewing_on_subscription");
});

// ── REFUND / REFUND_REVERSED ─────────────────────────────────────────────────
test("explicit REFUND type on subscription requires snapshot", () => {
  assert.equal(reduce({ type: "REFUND", catalogItem: SUB, snapshot: snapUnavailable() }).action, ACTIONS.RETRY);
  assert.equal(reduce({ type: "REFUND", catalogItem: SUB, snapshot: snapAvailableInactive() }).action, ACTIONS.REVOKE_EXACT_TRANSACTION);
});

test("REFUND_REVERSED subscription restores only when canonical says active", () => {
  assert.equal(reduce({ type: "REFUND_REVERSED", catalogItem: SUB, snapshot: snapUnavailable() }).action, ACTIONS.RETRY);
  assert.equal(reduce({ type: "REFUND_REVERSED", catalogItem: SUB, snapshot: snapAvailableInactive() }).action, ACTIONS.MANUAL_REVIEW);
  assert.equal(reduce({ type: "REFUND_REVERSED", catalogItem: SUB, snapshot: snapAvailableActive(SUB.internalCode) }).action, ACTIONS.RESTORE_REVERSED_REFUND);
});

test("REFUND_REVERSED event/add-on restores exact item without a snapshot", () => {
  assert.equal(reduce({ type: "REFUND_REVERSED", catalogItem: EVENT }).action, ACTIONS.RESTORE_REVERSED_REFUND);
  assert.equal(reduce({ type: "REFUND_REVERSED", catalogItem: ADDON }).action, ACTIONS.RESTORE_REVERSED_REFUND);
});

// ── TRANSFER / TEMPORARY / TEST / unknown ────────────────────────────────────
test("TRANSFER → MANUAL_REVIEW (keep with original user, DEC-04)", () => {
  const d = reduce({ type: "TRANSFER", catalogItem: null });
  assert.equal(d.action, ACTIONS.MANUAL_REVIEW);
  assert.equal(d.reason, "transfer_keep_original_user");
});

test("TEMPORARY_ENTITLEMENT_GRANT → MANUAL_REVIEW (not auto-honored)", () => {
  const d = reduce({ type: "TEMPORARY_ENTITLEMENT_GRANT", catalogItem: null });
  assert.equal(d.action, ACTIONS.MANUAL_REVIEW);
});

test("TEST → IGNORE (no grant)", () => {
  assert.equal(reduce({ type: "TEST" }).action, ACTIONS.IGNORE);
});

test("unknown event type → IGNORE, never a grant", () => {
  const d = reduce({ type: "SOMETHING_NEW", catalogItem: SUB });
  assert.equal(d.action, ACTIONS.IGNORE);
  assert.equal(d.reason, "unknown_type");
});

test("missing type → IGNORE", () => {
  assert.equal(reduce({}).action, ACTIONS.IGNORE);
});

test("product event with missing catalog item → MANUAL_REVIEW (never silent grant)", () => {
  const d = reduce({ type: "INITIAL_PURCHASE", catalogItem: null });
  assert.equal(d.action, ACTIONS.MANUAL_REVIEW);
  assert.equal(d.reason, "missing_catalog_item");
});

// ── purity / determinism ─────────────────────────────────────────────────────
test("reducer is pure: same input → same output, no mutation", () => {
  const input = Object.freeze({ type: "INITIAL_PURCHASE", catalogItem: SUB, snapshot: snapUnavailable(), expiresAtMs: 7 });
  const a = reduce(input);
  const b = reduce(input);
  assert.deepEqual(a, b);
});

test("isRefundReason helper is case-insensitive and specific", () => {
  assert.equal(isRefundReason("CUSTOMER_SUPPORT"), true);
  assert.equal(isRefundReason("customer_support"), true);
  assert.equal(isRefundReason("UNSUBSCRIBE"), false);
  assert.equal(isRefundReason(null), false);
});
