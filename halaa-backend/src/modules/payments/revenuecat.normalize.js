/**
 * RevenueCat payload normalization + redaction (BILL-01/02 · §2 · §2.6).
 *
 * TWO jobs, both pure:
 *  1. normalizeEvent(body) — lift every field processing/replay needs out of the
 *     raw payload into explicit, typed values. The event model persists these as
 *     first-class columns and the processor/replay read THOSE, never the blob.
 *     This is what makes aggressive redaction safe (advisor guidance) and also
 *     satisfies §2.6 "transaction-scoped persistence with explicit fields".
 *  2. redactPayload(body) — produce an audit-only copy with secrets / receipts /
 *     subscriber PII removed, so the durable record never stores unredacted
 *     receipts, tokens, authorization headers, or unnecessary personal data.
 *
 * Money note (P0-05): RevenueCat sends `price` in USD and
 * `price_in_purchased_currency` in `currency`. We surface BOTH — the ledger uses
 * the purchased-currency amount + currency; the USD figure is a separate
 * normalized estimate.
 */

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v : null);

/**
 * Normalize the webhook body into typed fields.
 * @param {object} body full webhook body ({ api_version, event })
 * @returns {object} typed, explicit fields (all nullable)
 */
function normalizeEvent(body) {
  const b = body || {};
  const ev = b.event || {};
  const entitlementIds = Array.isArray(ev.entitlement_ids)
    ? ev.entitlement_ids.filter((x) => typeof x === "string")
    : ev.entitlement_id
      ? [ev.entitlement_id]
      : [];

  return {
    apiVersion: str(b.api_version),
    eventId: str(ev.id),
    type: str(ev.type),
    appId: str(ev.app_id),
    appUserId: str(ev.app_user_id),
    originalAppUserId: str(ev.original_app_user_id),
    aliases: Array.isArray(ev.aliases) ? ev.aliases.filter((x) => typeof x === "string") : [],
    // new_product_id wins for PRODUCT_CHANGE; else product_id.
    productId: str(ev.new_product_id) || str(ev.product_id),
    productIdRaw: str(ev.product_id),
    newProductId: str(ev.new_product_id),
    store: str(ev.store),
    environment: str(ev.environment),
    periodType: str(ev.period_type),
    transactionId: str(ev.transaction_id),
    originalTransactionId: str(ev.original_transaction_id),
    entitlementIds,
    cancelReason: str(ev.cancel_reason),
    expirationAtMs: num(ev.expiration_at_ms),
    purchasedAtMs: num(ev.purchased_at_ms),
    eventTimestampMs: num(ev.event_timestamp_ms),
    // MONEY (P0-05): purchased-currency amount + its currency are authoritative;
    // `price` (USD) is a separate normalized estimate.
    priceInPurchasedCurrency: num(ev.price_in_purchased_currency),
    currency: str(ev.currency),
    priceUsd: num(ev.price),
    isTrialConversion: ev.is_trial_conversion === true,
  };
}

// Keys whose VALUES must never be persisted (case-insensitive substring match).
const SENSITIVE_KEY_RE = /(receipt|token|secret|password|authorization|signature|api[_-]?key|jwt|private)/i;
// Subscriber attributes can carry $email / $phoneNumber / $displayName and
// arbitrary custom PII — drop wholesale from the audit copy.
const DROP_KEYS = new Set(["subscriber_attributes"]);
const MAX_STRING = 512;

/**
 * Deep-redact a payload for durable audit storage. Removes sensitive values and
 * PII-bearing blocks and truncates over-long strings. Never throws.
 * @param {*} value
 * @returns {*} redacted clone
 */
function redactPayload(value, depth = 0) {
  if (depth > 12) return "[TRUNCATED_DEPTH]";
  if (Array.isArray(value)) return value.map((v) => redactPayload(v, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (DROP_KEYS.has(k)) {
        out[k] = "[REDACTED_PII]";
        continue;
      }
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[REDACTED]";
        continue;
      }
      out[k] = redactPayload(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > MAX_STRING) {
    return value.slice(0, MAX_STRING) + "…[truncated]";
  }
  return value;
}

module.exports = { normalizeEvent, redactPayload, SENSITIVE_KEY_RE };
