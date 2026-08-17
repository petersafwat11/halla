/**
 * Versioned policy documents (SHIP §6 / §7.1) — now DERIVED from the shared
 * canonical legal package (P1-07), not hardcoded.
 *
 * Acceptance of the CURRENT version of Terms + Community Rules is required before
 * a user/guest creates UGC. The versions/URLs below come from the generated legal
 * policy manifest (`src/shared/legal/legalPolicies.generated.json`, built from
 * `shared/src/legal/documents/*.json`). When a document's text materially changes,
 * bump its version in the shared JSON and run `npm run legal:generate`; users are
 * then re-prompted to accept — the backend no longer carries an independent,
 * drift-prone version string.
 *
 * ACCEPTANCE KEYS ARE STABLE. The `documentType` recorded in `TermsAcceptance`
 * rows uses the historical keys `terms` / `community` / `privacy`. The manifest
 * uses the canonical slug `community-rules` for the community document, so we map
 * the acceptance key `community` → manifest doc `community-rules` here. Existing
 * acceptance records and the acceptance API shape are unchanged.
 */

const manifest = require("../legal/legalPolicies.generated.json");

const POLICY_TYPES = {
  TERMS: "terms",
  COMMUNITY: "community",
  PRIVACY: "privacy",
};

// Acceptance key -> canonical manifest documentType.
const ACCEPTANCE_KEY_TO_DOC = {
  [POLICY_TYPES.TERMS]: "terms",
  [POLICY_TYPES.COMMUNITY]: "community-rules",
  [POLICY_TYPES.PRIVACY]: "privacy",
};

function docEntry(documentType) {
  const entry = (manifest.documents || []).find((d) => d.documentType === documentType);
  if (!entry) {
    // Fail closed: a missing document in the manifest is a build/config error.
    throw new Error(`policies.js: legal manifest is missing document "${documentType}"`);
  }
  return entry;
}

// Current live versions, DERIVED from document content (keyed by acceptance key).
const POLICY_VERSIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(ACCEPTANCE_KEY_TO_DOC).map(([key, doc]) => [key, docEntry(doc).version])
  )
);

// Canonical public URLs, DERIVED from the manifest (keyed by acceptance key).
const POLICY_URLS = Object.freeze(
  Object.fromEntries(
    Object.entries(ACCEPTANCE_KEY_TO_DOC).map(([key, doc]) => [key, Object.freeze({ ...docEntry(doc).urls })])
  )
);

// UGC creation requires acceptance of these document types' current versions.
const UGC_REQUIRED_POLICIES = [POLICY_TYPES.TERMS, POLICY_TYPES.COMMUNITY];

module.exports = {
  POLICY_TYPES,
  POLICY_VERSIONS,
  POLICY_URLS,
  UGC_REQUIRED_POLICIES,
  ACCEPTANCE_KEY_TO_DOC,
};
