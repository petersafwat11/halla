/**
 * Account-deletion asset + reference collector (DEL-01/DEL-02 · P1-02).
 *
 * PURE, DB-reading helpers that build the exhaustive set of S3 object keys owned
 * by a user across EVERY model in the deletion matrix
 * (docs/evidence/store-readiness/DELETION-MATRIX.md). Separated from the
 * mutation pipeline so the key-collection logic — the part that previously
 * missed post-event cover/thumbnail/comment images and full-URL media
 * (REVIEW-FINDINGS P1-02) — is independently unit-testable.
 *
 * `collectS3Keys` NEVER calls S3 and NEVER mutates; it only reads the owning
 * user's documents and normalizes every stored image reference (bare key OR
 * full bucket URL, in any of our three URL shapes) into a deletable key via
 * `resolveDeletableS3Key`. Local-disk dev paths and external URLs are dropped.
 */

const Event = require("../../../models/EventModel");
const PostEventContent = require("../../../models/PostEventContentModel");
const Service = require("../../../models/ServiceModel");
const { resolveDeletableS3Key } = require("../../shared/utils/s3Upload");

/**
 * Push every deletable key from an arbitrary stored-ref list into the set.
 * @param {Set<string>} set
 * @param {Array<string|undefined>} refs
 */
function addRefs(set, refs) {
  for (const ref of refs) {
    const key = resolveDeletableS3Key(ref);
    if (key) set.add(key);
  }
}

/**
 * Collect the user's own profile/avatar/vendor-document S3 keys from a loaded
 * user document. Pure (no I/O).
 * @param {object} user mongoose user doc or plain object
 * @returns {string[]}
 */
function collectUserKeys(user) {
  const set = new Set();
  if (!user) return [];
  const vd = user.profile?.vendorData || {};
  addRefs(set, [
    user.avatar,
    vd.businessLogo,
    vd.nationalIdImage,
    vd.commercialRecordImage,
    vd.profileFile,
    vd.cv,
    ...(Array.isArray(vd.portfolioImages) ? vd.portfolioImages : []),
    ...(Array.isArray(vd.pricePackages) ? vd.pricePackages : []),
  ]);
  return [...set];
}

/**
 * Collect S3 keys for a user's owned events (branding logo, baked visual
 * template image, fallback template header). Reads events by host.
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @returns {Promise<{keys:string[], eventIds:any[]}>}
 */
async function collectEventKeys(userId) {
  const events = await Event.find({ host: userId })
    .select("_id templateImage branding visualTemplate")
    .lean();
  const set = new Set();
  for (const e of events) {
    addRefs(set, [
      e.templateImage,
      e.branding?.logoKey,
      // Baked invitation canvas OR host-uploaded card photo — previously NOT
      // collected (P1-02).
      e.visualTemplate?.bakedImagePath,
    ]);
  }
  return { keys: [...set], eventIds: events.map((e) => e._id) };
}

/**
 * Collect EVERY S3 key referenced by a user's post-event content, including the
 * nested paths the old deletion code missed (P1-02): cover image, per-media
 * thumbnail, media-comment images (+ their thumbnails), and post-level comment
 * images (+ thumbnails). Handles both bare keys and full bucket URLs.
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @returns {Promise<string[]>}
 */
async function collectPostEventKeys(userId) {
  const contents = await PostEventContent.find({ host: userId }).lean();
  const set = new Set();
  for (const c of contents) {
    addRefs(set, [c.coverImage]);
    for (const m of c.media || []) {
      addRefs(set, [m.url, m.thumbnailUrl]);
      for (const cm of m.comments || []) {
        for (const img of cm.images || []) addRefs(set, [img.url, img.thumbnail]);
      }
    }
    for (const cm of c.comments || []) {
      for (const img of cm.images || []) addRefs(set, [img.url, img.thumbnail]);
    }
  }
  return [...set];
}

/**
 * Collect a vendor's service image keys.
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @returns {Promise<string[]>}
 */
async function collectServiceKeys(userId) {
  const services = await Service.find({ vendorId: userId }).select("image").lean();
  const set = new Set();
  for (const s of services) addRefs(set, [s.image]);
  return [...set];
}

/**
 * Aggregate ALL deletable S3 keys owned by the user across every collection.
 * `user` must be the loaded user doc (so profile keys can be read pre-anonymize).
 * @param {object} user
 * @returns {Promise<{keys:string[], eventIds:any[]}>}
 */
async function collectS3Keys(user) {
  const userId = user._id;
  const [{ keys: eventKeys, eventIds }, postEventKeys, serviceKeys] =
    await Promise.all([
      collectEventKeys(userId),
      collectPostEventKeys(userId),
      collectServiceKeys(userId),
    ]);
  const all = new Set([
    ...collectUserKeys(user),
    ...eventKeys,
    ...postEventKeys,
    ...serviceKeys,
  ]);
  return { keys: [...all], eventIds };
}

module.exports = {
  addRefs,
  collectUserKeys,
  collectEventKeys,
  collectPostEventKeys,
  collectServiceKeys,
  collectS3Keys,
};
