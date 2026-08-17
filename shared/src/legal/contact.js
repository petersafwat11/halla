/**
 * Single source of truth for legal/brand contact identity (P1-06 / P1-07).
 *
 * There is currently a REAL conflict across the codebase that only the
 * owner/counsel can resolve; until then every value here is a marked placeholder
 * (`BLOCKED_NEEDS_OWNER`). Consumers should render these via the approved-source
 * path and must NOT reintroduce hardcoded contact strings.
 *
 * Known conflicts to resolve (do not guess):
 *   - Support email: `support@halaa.net` (web LegalPage + Footer) vs
 *     `support@halaa.com.sa` (web delete-account page).
 *   - Legal entity name: "Halaa Digital Technology Establishment /
 *     مؤسسة هلا الرقمية للتقنية" (privacy + terms docs) vs
 *     "Afaq hala Company For Communications and Information" (web footer).
 *
 * `PROVISIONAL` values below are the DEFENSIBLE current placeholders (domain-
 * consistent with all infra and POLICY_URLS = halaa.com.sa) but are NOT approved.
 */

const BLOCKED = "BLOCKED_NEEDS_OWNER";

export const LEGAL_CONTACT = Object.freeze({
  approved: false,
  // Approved legal entity name — NOT confirmed (two conflicting names exist).
  legalEntityName: {
    approved: false,
    status: BLOCKED,
    ar: BLOCKED,
    en: BLOCKED,
    conflicts: [
      "مؤسسة هلا الرقمية للتقنية / Halaa Digital Technology Establishment (privacy + terms)",
      "Afaq hala Company For Communications and Information (web footer)",
    ],
  },
  brandName: Object.freeze({ ar: "هلا", en: "Halaa" }),
  supportEmail: {
    approved: false,
    status: BLOCKED,
    conflicts: ["support@halaa.net (LegalPage + Footer)", "support@halaa.com.sa (delete-account)"],
    // Domain-consistent provisional (matches POLICY_URLS host); owner must confirm.
    provisional: "support@halaa.com.sa",
  },
  whatsapp: {
    approved: false,
    status: BLOCKED,
    provisional: "+966552619282",
  },
  phone: {
    approved: false,
    status: BLOCKED,
    provisional: "+966552619282",
  },
  postalAddress: {
    approved: false,
    status: BLOCKED,
    provisional: {
      ar: "شارع المتحف - جدة - الرمز البريدي 23326",
      en: "Museum Street, Jeddah, Postal Code 23326",
    },
  },
  responseSla: { approved: false, status: BLOCKED },
  // Canonical public domain (infra-confirmed; used to build policy URLs).
  domain: "halaa.com.sa",
});

export default LEGAL_CONTACT;
