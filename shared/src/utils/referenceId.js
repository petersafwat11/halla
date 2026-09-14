/**
 * Reference-id helpers shared by the web and mobile event wizards.
 *
 * API responses may return a reference either as a plain id string or as a
 * populated document (e.g. GET /events/:id populates
 * `taqnyatTemplate.templateRef` and `visualTemplate.templateRef`).
 * @module @halaa/shared/utils/referenceId
 */

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Resolve an id string from a string id, a populated `{ _id | id }` object or
 * a BSON ObjectId-like value. Returns null when no id can be resolved.
 *
 * @param {unknown} ref
 * @returns {string|null}
 */
export const resolveReferenceId = (ref) => {
  if (ref === null || ref === undefined) return null;
  if (typeof ref === "string") return ref.trim() || null;
  if (typeof ref === "number") return String(ref);
  if (typeof ref !== "object") return null;
  if (typeof ref.toHexString === "function") return ref.toHexString();
  const nested = ref._id ?? ref.id;
  if (nested === null || nested === undefined || nested === ref) return null;
  return resolveReferenceId(nested);
};

/**
 * @param {unknown} value
 * @returns {boolean} true when value is a 24-char hex ObjectId string.
 */
export const isObjectIdString = (value) =>
  typeof value === "string" && OBJECT_ID_RE.test(value);
