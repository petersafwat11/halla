/**
 * Checkout-token helpers (business-account plan, B0 security contract).
 *
 *   - ≥256-bit random raw token (delivered in the WhatsApp/SMS link).
 *   - Only the SHA-256 hash is persisted (`tokenHash`, unique index).
 *   - Consumed on successful checkout submission, NOT on page view.
 *
 * @module shared/utils/checkoutToken
 */

const crypto = require('crypto');

/** @returns {{ raw: string, hash: string }} */
function generateCheckoutToken() {
  const raw = crypto.randomBytes(32).toString('hex'); // 256-bit
  return { raw, hash: hashCheckoutToken(raw) };
}

/** @param {string} raw @returns {string} sha256 hex */
function hashCheckoutToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

module.exports = { generateCheckoutToken, hashCheckoutToken };
