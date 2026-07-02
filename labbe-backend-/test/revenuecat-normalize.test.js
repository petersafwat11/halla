/**
 * Payload normalization + redaction tests (BILL-01/02 · §2 · §2.6). DB-free.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeEvent, redactPayload } = require("../src/modules/payments/revenuecat.normalize");

const sampleBody = () => ({
  api_version: "1.0",
  event: {
    id: "evt_1",
    type: "INITIAL_PURCHASE",
    app_id: "app1",
    app_user_id: "user-uuid",
    original_app_user_id: "user-uuid",
    aliases: ["user-uuid", "alias2"],
    product_id: "com.halla.premium_monthly_100",
    store: "APP_STORE",
    environment: "PRODUCTION",
    transaction_id: "txn_1",
    original_transaction_id: "otxn_1",
    price: 26.66, // USD
    price_in_purchased_currency: 100, // SAR
    currency: "SAR",
    entitlement_ids: ["recurring_access"],
    expiration_at_ms: 1893456000000,
    purchased_at_ms: 1690000000000,
    event_timestamp_ms: 1690000001000,
    cancel_reason: null,
    subscriber_attributes: { $email: { value: "a@b.com" }, $phoneNumber: { value: "+9665" } },
  },
});

test("normalizeEvent lifts every processing field into typed columns", () => {
  const n = normalizeEvent(sampleBody());
  assert.equal(n.eventId, "evt_1");
  assert.equal(n.type, "INITIAL_PURCHASE");
  assert.equal(n.appUserId, "user-uuid");
  assert.equal(n.productId, "com.halla.premium_monthly_100");
  assert.equal(n.transactionId, "txn_1");
  assert.equal(n.originalTransactionId, "otxn_1");
  assert.deepEqual(n.entitlementIds, ["recurring_access"]);
  assert.equal(n.expirationAtMs, 1893456000000);
  assert.equal(n.eventTimestampMs, 1690000001000);
});

test("normalizeEvent keeps purchased-currency money separate from USD (P0-05)", () => {
  const n = normalizeEvent(sampleBody());
  assert.equal(n.priceInPurchasedCurrency, 100);
  assert.equal(n.currency, "SAR");
  assert.equal(n.priceUsd, 26.66);
});

test("normalizeEvent prefers new_product_id for PRODUCT_CHANGE", () => {
  const b = sampleBody();
  b.event.type = "PRODUCT_CHANGE";
  b.event.new_product_id = "com.halla.basic_monthly_50";
  const n = normalizeEvent(b);
  assert.equal(n.productId, "com.halla.basic_monthly_50");
  assert.equal(n.newProductId, "com.halla.basic_monthly_50");
  assert.equal(n.productIdRaw, "com.halla.premium_monthly_100");
});

test("normalizeEvent coerces bad shapes to null / empty, never throws", () => {
  const n = normalizeEvent({ event: { id: 123, price: "x", aliases: "nope", entitlement_ids: [1, "ok"] } });
  assert.equal(n.eventId, null);
  assert.equal(n.priceUsd, null);
  assert.deepEqual(n.aliases, []);
  assert.deepEqual(n.entitlementIds, ["ok"]);
  assert.doesNotThrow(() => normalizeEvent(undefined));
  assert.doesNotThrow(() => normalizeEvent({}));
});

test("single entitlement_id is normalized to a one-element array", () => {
  const b = sampleBody();
  delete b.event.entitlement_ids;
  b.event.entitlement_id = "recurring_access";
  assert.deepEqual(normalizeEvent(b).entitlementIds, ["recurring_access"]);
});

// ── redaction ────────────────────────────────────────────────────────────────
test("redactPayload removes subscriber PII", () => {
  const r = redactPayload(sampleBody());
  assert.equal(r.event.subscriber_attributes, "[REDACTED_PII]");
  // non-sensitive fields survive for audit
  assert.equal(r.event.product_id, "com.halla.premium_monthly_100");
  assert.equal(r.event.transaction_id, "txn_1");
});

test("redactPayload redacts sensitive keys anywhere in the tree", () => {
  const r = redactPayload({ event: { fetch_token: "abc", nested: { api_key: "x", receipt: "long" } } });
  assert.equal(r.event.fetch_token, "[REDACTED]");
  assert.equal(r.event.nested.api_key, "[REDACTED]");
  assert.equal(r.event.nested.receipt, "[REDACTED]");
});

test("redactPayload truncates over-long strings and is depth-bounded", () => {
  const big = "x".repeat(2000);
  const r = redactPayload({ note: big });
  assert.ok(r.note.length < 600 && r.note.endsWith("…[truncated]"));
  // deep structure doesn't blow the stack
  let deep = {};
  let cur = deep;
  for (let i = 0; i < 40; i++) { cur.next = {}; cur = cur.next; }
  assert.doesNotThrow(() => redactPayload(deep));
});

test("redactPayload does not mutate the input", () => {
  const b = sampleBody();
  redactPayload(b);
  assert.equal(b.event.subscriber_attributes.$email.value, "a@b.com"); // original intact
});
