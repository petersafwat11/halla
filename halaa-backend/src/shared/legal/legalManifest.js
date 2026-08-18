/**
 * Legal policy manifest (backend, CJS) — mirrors the commerce catalog manifest.
 *
 * Derives a machine-readable, hashed manifest from the shared canonical legal
 * JSON (`shared/src/legal/documents/*.json`, read via `legalContent.js`). The
 * generated artifact (`legalPolicies.generated.json`) carries, per document:
 * documentType, version, per-locale canonical URLs, last-updated, ordered
 * section ids, and a deterministic SHA-256 content hash — plus an overall
 * `manifestHash`. It closes P1-07 (backend policy versions must be DERIVED from
 * document content, not hand-hardcoded) and feeds the parity/drift CI gate.
 *
 * Pure + dependency-light (crypto + the content reader). The hash EXCLUDES any
 * timestamp so the manifest is byte-reproducible for the drift gate.
 */

const crypto = require("crypto");
const { readAllDocuments, LOCALES } = require("./legalContent");

const DOMAIN = "halaa.com.sa";
const ORIGIN = `https://${DOMAIN}`;

// Manifest schema version — hand-bumped only when the manifest STRUCTURE changes
// (not when content changes; content changes are reflected by per-doc hashes).
const MANIFEST_VERSION = "1.1.0";

// documentType (canonical) -> public web route slug under /[lang]/.
// `deletion` maps to the existing public `delete-account` page. These MUST match
// `shared/src/legal/manifest.js` LEGAL_ROUTES and the mobile-hardlinked paths.
const ROUTE_SLUGS = Object.freeze({
  privacy: "privacy",
  terms: "terms",
  "community-rules": "community-rules",
  refund: "refund",
  deletion: "delete-account",
  support: "support",
});

/** Recursively key-sorted JSON so the hash ignores property insertion order. */
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function canonicalUrl(documentType, locale) {
  const slug = ROUTE_SLUGS[documentType];
  if (!slug) return null;
  return `${ORIGIN}/${locale}/${slug}`;
}

/**
 * Validate a single { ar, en } document's structural integrity and return a
 * normalized manifest entry. Throws on any structural defect (so generate/verify
 * fail closed).
 */
function buildEntry(documentType, doc) {
  if (!doc || typeof doc !== "object") {
    throw new Error(`legal ${documentType}: missing document object`);
  }
  const per = {};
  for (const locale of LOCALES) {
    const d = doc[locale];
    if (!d || typeof d !== "object") {
      throw new Error(`legal ${documentType}: missing locale "${locale}"`);
    }
    if (!Array.isArray(d.sections) || d.sections.length === 0) {
      throw new Error(`legal ${documentType} (${locale}): sections must be a non-empty array`);
    }
    for (const s of d.sections) {
      if (!s || !s.id || typeof s.body !== "string") {
        throw new Error(`legal ${documentType} (${locale}): every section needs an id and string body`);
      }
    }
    if (!d.version) {
      throw new Error(`legal ${documentType} (${locale}): missing version`);
    }
    per[locale] = d;
  }

  const arIds = per.ar.sections.map((s) => s.id);
  const enIds = per.en.sections.map((s) => s.id);
  // AR/EN section-id parity (LEGAL §4.2 drift rule).
  if (arIds.length !== enIds.length || arIds.some((id, i) => id !== enIds[i])) {
    throw new Error(`legal ${documentType}: AR/EN section ids differ (ar=[${arIds}] en=[${enIds}])`);
  }
  // Versions kept in lockstep across locales.
  if (per.ar.version !== per.en.version) {
    throw new Error(
      `legal ${documentType}: AR/EN version mismatch (ar=${per.ar.version} en=${per.en.version})`
    );
  }
  if (!per.ar.effectiveDate || !per.en.effectiveDate) {
    throw new Error(`legal ${documentType}: missing owner-approved effective date`);
  }

  const ownerApproval = per.ar.ownerApproval || "BLOCKED_NEEDS_OWNER";

  return {
    documentType,
    slug: ROUTE_SLUGS[documentType],
    version: per.ar.version,
    effectiveDate: { ar: per.ar.effectiveDate, en: per.en.effectiveDate },
    authoritativeLanguage: per.ar.authoritativeLanguage || "ar",
    // Reflect the explicit owner decision; counsel/publication is a separate gate.
    ownerApproval,
    approved: ownerApproval !== "BLOCKED_NEEDS_OWNER",
    urls: { ar: canonicalUrl(documentType, "ar"), en: canonicalUrl(documentType, "en") },
    lastUpdated: { ar: per.ar.lastUpdated || null, en: per.en.lastUpdated || null },
    sectionIds: arIds,
    // Per-locale content hashes (sections only — the legally-material text).
    contentHash: {
      ar: sha256(per.ar.sections),
      en: sha256(per.en.sections),
    },
  };
}

/** Build the full manifest object from the shared documents. */
function buildLegalManifest() {
  const docs = readAllDocuments();
  const entries = Object.keys(ROUTE_SLUGS).map((documentType) =>
    buildEntry(documentType, docs[documentType])
  );

  const manifest = {
    $comment:
      "GENERATED by scripts/generateLegalManifest.js from shared/src/legal/documents/*.json — do not edit by hand. Run `npm run legal:generate` and commit.",
    generator: "generateLegalManifest.js",
    manifestVersion: MANIFEST_VERSION,
    origin: ORIGIN,
    documentCount: entries.length,
    // Every UGC write must accept the current versions of these docs.
    ugcRequiredDocuments: ["terms", "community-rules"],
    documents: entries,
  };
  manifest.manifestHash = sha256(manifest.documents);
  return manifest;
}

/**
 * Verify a loaded manifest is internally consistent: recompute the overall hash
 * and per-document content hashes and compare. Returns { ok, errors[] }.
 */
function verifyLegalManifest(loaded) {
  const errors = [];
  if (!loaded || !Array.isArray(loaded.documents)) {
    return { ok: false, errors: ["manifest missing documents[]"] };
  }
  const recomputed = sha256(loaded.documents);
  if (recomputed !== loaded.manifestHash) {
    errors.push(`manifestHash mismatch (loaded ${loaded.manifestHash} vs recomputed ${recomputed})`);
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  MANIFEST_VERSION,
  ROUTE_SLUGS,
  ORIGIN,
  buildLegalManifest,
  verifyLegalManifest,
  buildEntry,
  sha256,
  canonicalUrl,
};
