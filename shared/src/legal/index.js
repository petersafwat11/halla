/**
 * @halla/shared/legal — canonical, versioned AR/EN legal content consumed by
 * both web (Next) and mobile (Metro). The backend (CJS) does not import this;
 * it reads the same `./documents/*.json` via `fs` to generate a hashed policy
 * manifest (see `labbe-backend-/scripts/generateLegalManifest.js`).
 *
 * NOTHING here is legally approved. Every document carries
 * `ownerApproval: "BLOCKED_NEEDS_OWNER"` and contact values live in `./contact`
 * as marked placeholders until owner/counsel signs off.
 */

export {
  LEGAL_DOCUMENTS,
  getLegalDocument,
  privacy,
  terms,
  communityRules,
  refund,
  deletion,
  support,
} from "./documents.js";

export {
  LEGAL_MANIFEST,
  LEGAL_ROUTES,
  LOCALES,
  UGC_REQUIRED_DOCUMENTS,
  SURFACE_DOCUMENTS,
  canonicalUrl,
} from "./manifest.js";

export { LEGAL_CONTACT } from "./contact.js";

import { LEGAL_DOCUMENTS as _docs } from "./documents.js";
export default _docs;
