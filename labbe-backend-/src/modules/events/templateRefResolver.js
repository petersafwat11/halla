/**
 * templateRefResolver.
 *
 * Defensive helper that accepts either a canonical ObjectId or a Meta
 * `taqnyatId` string and returns the canonical TaqnyatTemplate `_id`.
 * Used by the post-event flow where a client may submit either form;
 * the main events flow passes ObjectIds directly.
 */

const mongoose = require("mongoose");
const logger = require("../../shared/utils/logger");

/**
 * Returns true when `value` can be cast to a Mongoose ObjectId without
 * Mongoose throwing. Avoids the false-positive on numeric or short
 * strings that `mongoose.Types.ObjectId.isValid` accepts.
 */
function isCastableObjectId(value) {
  if (!value) return false;
  if (value instanceof mongoose.Types.ObjectId) return true;
  if (typeof value === "string") {
    return /^[a-fA-F0-9]{24}$/.test(value);
  }
  return false;
}

/**
 * Resolve a Taqnyat-template selection from any of:
 *   - canonical ObjectId (string or ObjectId instance) — returned as-is
 *   - legacy Meta taqnyatId (any non-ObjectId string) — looked up in the
 *     TaqnyatTemplate cache
 *
 * Returns the canonical `TaqnyatTemplate._id` or null when the cache has
 * no matching entry. Never throws.
 */
async function resolveTaqnyatTemplateRef(value) {
  if (!value) return null;
  if (isCastableObjectId(value)) return value;
  try {
    const TaqnyatTemplate = require("../../../models/TaqnyatTemplateModel");
    const doc = await TaqnyatTemplate.findOne({ taqnyatId: String(value) })
      .select("_id")
      .lean();
    return doc?._id || null;
  } catch (err) {
    // Connection errors etc. — log and degrade to "no canonical ref".
    // The caller will keep the legacy field populated so messaging still
    // works via the legacy fallback.
    logger.warn('[templateRefResolver] resolveTaqnyatTemplateRef failed', { err: err.message });
    return null;
  }
}

module.exports = {
  isCastableObjectId,
  resolveTaqnyatTemplateRef,
};
