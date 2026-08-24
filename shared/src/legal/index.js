/**
 * @halaa/shared/legal — canonical, versioned AR/EN legal content consumed by
 * both web (Next) and mobile (Metro). The backend (CJS) does not import this;
 * it reads the same `./documents/*.json` via `fs` to generate a hashed policy
 * manifest (see `halaa-backend/scripts/generateLegalManifest.js`).
 *
 * Owner-approved identity, contact facts, copy, and effective dates live here.
 * Any separate counsel or publication gate must be tracked without changing
 * the exact owner-approval record.
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

export { LEGAL_LTR_TOKEN_REGEX, isolateLegalLtrTokens } from "./tokens.js";

import { LEGAL_DOCUMENTS as _docs } from "./documents.js";
export default _docs;
