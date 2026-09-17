/**
 * Public base-URL resolution — single source of truth for every surface that
 * mints a customer-facing link out of a configured origin:
 *
 *   - payment-links: admin invoice provider-callback  (BACKEND origin)
 *   - business.assignment: checkout link + 3DS return  (FRONTEND origin)
 *
 * Both used to hand-roll this. The business one never validated anything and
 * read a config key that does not exist, so it shipped
 * `undefined/business/checkout/<token>` to admins and to Moyasar. Resolution
 * lives here so a missing or malformed origin fails loudly at the call site
 * instead of being interpolated into a link.
 *
 * NOTE: requires `../errors/errorTypes` directly rather than `../errors` —
 * the barrel pulls in globalErrorHandler, which requires config, and config
 * itself uses `normalizeOrigin` below.
 */

const { ValidationError } = require('../errors/errorTypes');

/**
 * Trim and drop trailing slashes. Pure and never throws, so config can call it
 * while building the config object.
 */
const normalizeOrigin = (raw) => String(raw || '').trim().replace(/\/+$/, '');

/**
 * Parse + validate a configured public base URL and return it normalized.
 *
 * @param {string} raw - configured origin (may carry a trailing slash).
 * @param {Object} [options]
 * @param {string} [options.label] - prefixes the thrown message so each caller
 *   keeps its own wording ("Payment link callback URL must be configured").
 * @param {boolean} [options.requireHttps] - defaults to "https only in production".
 */
function resolveBaseUrl(raw, { label = 'Base', requireHttps } = {}) {
  const base = normalizeOrigin(raw);
  const httpsOnly =
    requireHttps === undefined ? process.env.NODE_ENV === 'production' : requireHttps;

  let url;
  try {
    url = new URL(base);
  } catch {
    throw new ValidationError(`${label} URL must be configured`);
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['http:', 'https:'].includes(url.protocol) ||
    (httpsOnly && url.protocol !== 'https:')
  ) {
    throw new ValidationError(`${label} URL is invalid`);
  }
  return base;
}

/** Resolve the base then join `path` onto it (leading slashes are optional). */
function buildPublicUrl(raw, path, options = {}) {
  const base = resolveBaseUrl(raw, options);
  const suffix = String(path || '').replace(/^\/+/, '');
  return suffix ? `${base}/${suffix}` : base;
}

module.exports = {
  normalizeOrigin,
  resolveBaseUrl,
  buildPublicUrl,
};
