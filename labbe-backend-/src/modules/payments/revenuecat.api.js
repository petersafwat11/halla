/**
 * RevenueCat REST client (SHIP §9.2).
 *
 * Used for CANONICAL reconciliation: after a lifecycle webhook we fetch the
 * subscriber snapshot and derive local access from the active entitlement +
 * expiry, rather than trusting the event type alone. Requires a server-side
 * secret `REVENUECAT_API_KEY` (NEVER the public SDK key). Degrades gracefully:
 * when the key is absent, callers fall back to the event payload fields.
 */

const axios = require("axios");
const logger = require("../../shared/utils/logger");

const BASE = process.env.REVENUECAT_API_BASE || "https://api.revenuecat.com/v1";

const isConfigured = () => Boolean(process.env.REVENUECAT_API_KEY);

/**
 * Fetch the subscriber snapshot. Returns the `subscriber` object or null.
 */
const getSubscriber = async (appUserId) => {
  if (!isConfigured() || !appUserId) return null;
  try {
    const res = await axios.get(
      `${BASE}/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: { Authorization: `Bearer ${process.env.REVENUECAT_API_KEY}` },
        timeout: 10000,
      }
    );
    return res.data?.subscriber || null;
  } catch (err) {
    logger.warn("[revenuecat.api] getSubscriber failed", {
      appUserId,
      status: err.response?.status,
      error: err.message,
    });
    return null;
  }
};

/**
 * Derive the canonical active entitlement from a subscriber snapshot.
 * @returns {{ active: boolean, productId: string|null, expiresAtMs: number|null }}
 */
const deriveActiveEntitlement = (subscriber) => {
  const ents = subscriber?.entitlements || {};
  const now = Date.now();
  let best = { active: false, productId: null, expiresAtMs: null };
  for (const key of Object.keys(ents)) {
    const e = ents[key];
    const expMs = e?.expires_date ? Date.parse(e.expires_date) : null;
    // A consumable/non-expiring grant has no expires_date → treat as active.
    const active = expMs === null || expMs > now;
    if (active) {
      best = {
        active: true,
        productId: e?.product_identifier || null,
        expiresAtMs: expMs,
      };
    }
  }
  return best;
};

module.exports = { isConfigured, getSubscriber, deriveActiveEntitlement };
