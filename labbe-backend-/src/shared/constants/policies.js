/**
 * Versioned policy documents (SHIP §6 / §7.1).
 *
 * Acceptance of the CURRENT version of Terms + Community Rules is required
 * before a user/guest creates UGC. Bump the version string whenever the policy
 * text materially changes — users are then re-prompted to accept.
 *
 * The public AR/EN policy pages live on the web app; the URLs below are
 * surfaced in the in-app acceptance UI and review notes.
 */

const POLICY_TYPES = {
  TERMS: "terms",
  COMMUNITY: "community",
  PRIVACY: "privacy",
};

// Current live versions. Keep in lockstep with the published policy pages.
const POLICY_VERSIONS = {
  [POLICY_TYPES.TERMS]: "2026-06-27",
  [POLICY_TYPES.COMMUNITY]: "2026-06-27",
  [POLICY_TYPES.PRIVACY]: "2026-06-27",
};

const POLICY_URLS = {
  [POLICY_TYPES.TERMS]: {
    ar: "https://halaa.com.sa/ar/terms",
    en: "https://halaa.com.sa/en/terms",
  },
  [POLICY_TYPES.COMMUNITY]: {
    ar: "https://halaa.com.sa/ar/community-rules",
    en: "https://halaa.com.sa/en/community-rules",
  },
  [POLICY_TYPES.PRIVACY]: {
    ar: "https://halaa.com.sa/ar/privacy",
    en: "https://halaa.com.sa/en/privacy",
  },
};

// UGC creation requires acceptance of these document types' current versions.
const UGC_REQUIRED_POLICIES = [POLICY_TYPES.TERMS, POLICY_TYPES.COMMUNITY];

module.exports = {
  POLICY_TYPES,
  POLICY_VERSIONS,
  POLICY_URLS,
  UGC_REQUIRED_POLICIES,
};
