/**
 * templateRefResolver.
 *
 * Resolves legacy `Event.invitationSettings.{selectedTemplate.id, visualTemplate.id}`
 * values to canonical ObjectId refs without throwing CastError when the
 * legacy value is incompatible with the canonical schema:
 *
 *   - `inv.selectedTemplate.id` was the Meta `taqnyatId` (string) on
 *     legacy events. Canonical `taqnyatTemplate.templateRef` is an
 *     ObjectId pointing at `TaqnyatTemplateModel`. We resolve via
 *     `TaqnyatTemplate.findOne({ taqnyatId })` and return its `_id`,
 *     or null when the cache has not yet been synced.
 *
 *   - `inv.visualTemplate.id` was a Number (the index from the old
 *     hardcoded 3-template array in StepThree). It does NOT map onto
 *     the new `TemplateModel` (whose `_id` is an ObjectId). We return
 *     null and let the messaging path fall back to the legacy 5-param
 *     shape via `_resolveTaqnyatTemplate` / `bakedImagePath`.
 *
 * Without this resolver the dual-write code paths in
 * `events.service.createEvent`, `events.service.updateInvitationSettings`,
 * `admin.service.adminUpdateEvent`, and `scripts/migrate-event-shape.js`
 * would write a String/Number into an ObjectId-typed field, causing
 * Mongoose to throw `CastError` on save.
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

/**
 * Resolve a visual-template selection. Legacy events used a Number id
 * pointing into a hardcoded array; that has no equivalent in the new
 * TemplateModel. Returns the value when it's already a valid ObjectId,
 * null otherwise.
 */
function resolveVisualTemplateRef(value) {
  if (isCastableObjectId(value)) return value;
  return null;
}

module.exports = {
  isCastableObjectId,
  resolveTaqnyatTemplateRef,
  resolveVisualTemplateRef,
};
