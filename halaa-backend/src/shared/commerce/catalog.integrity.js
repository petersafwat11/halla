/**
 * Catalog integrity — version + deterministic content hash (BILL-01 · §1).
 *
 * The generated manifest carries a `catalogVersion` (a hand-bumped semver that
 * signals an intentional commercial change) and a `catalogHash` (a SHA-256 over
 * the canonical entries). Billing readiness and every durable webhook event
 * record stamp both, so:
 *   - a corrupt / hand-edited / hash-mismatched production manifest makes
 *     billing readiness fail observably (it never silently accepts drift), and
 *   - every processed event is traceable to the exact catalog it was resolved
 *     against.
 *
 * Pure + dependency-light (crypto only). The hash is computed over a canonical
 * (recursively key-sorted) JSON encoding so it is stable regardless of property
 * insertion order, and it EXCLUDES any timestamp so the manifest stays
 * byte-reproducible for the drift gate.
 */

const crypto = require("crypto");

// Hand-bumped when the commercial catalog intentionally changes (new tier,
// price change, add-on policy change). NOT auto-derived — a version bump is a
// deliberate signal that store products / readiness baselines must be re-reviewed.
const CATALOG_VERSION = "1.0.0";

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

/**
 * Deterministic SHA-256 over the catalog entries. Version-prefixed so two
 * catalogs that happen to share entries but differ in version never collide.
 * @param {Array<object>} entries
 * @param {string} [version]
 * @returns {string} hex digest
 */
function hashEntries(entries, version = CATALOG_VERSION) {
  const canonical = stableStringify({ version, entries: entries || [] });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/** Build the manifest integrity block from freshly-built entries. */
function computeManifestMeta(entries) {
  return {
    catalogVersion: CATALOG_VERSION,
    catalogHash: hashEntries(entries, CATALOG_VERSION),
    entryCount: (entries || []).length,
  };
}

/**
 * Verify a loaded manifest's self-consistency: recompute the hash from the
 * manifest's OWN entries and compare to the stamped `catalogHash`. Detects a
 * hand-edited/corrupt manifest whose entries no longer match its hash.
 *
 * @param {object|null} manifest
 * @returns {{ ok:boolean, reason:string|null, catalogVersion:string|null, catalogHash:string|null, entryCount:number }}
 */
function verifyManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return { ok: false, reason: "manifest_missing", catalogVersion: null, catalogHash: null, entryCount: 0 };
  }
  const entries = Array.isArray(manifest.entries) ? manifest.entries : null;
  if (!entries) {
    return { ok: false, reason: "manifest_no_entries", catalogVersion: null, catalogHash: null, entryCount: 0 };
  }
  const version = manifest.catalogVersion || null;
  const stampedHash = manifest.catalogHash || null;
  if (!version || !stampedHash) {
    return { ok: false, reason: "manifest_missing_version_or_hash", catalogVersion: version, catalogHash: stampedHash, entryCount: entries.length };
  }
  const recomputed = hashEntries(entries, version);
  if (recomputed !== stampedHash) {
    return { ok: false, reason: "manifest_hash_mismatch", catalogVersion: version, catalogHash: stampedHash, entryCount: entries.length };
  }
  if (typeof manifest.entryCount === "number" && manifest.entryCount !== entries.length) {
    return { ok: false, reason: "manifest_entry_count_mismatch", catalogVersion: version, catalogHash: stampedHash, entryCount: entries.length };
  }
  return { ok: true, reason: null, catalogVersion: version, catalogHash: stampedHash, entryCount: entries.length };
}

module.exports = {
  CATALOG_VERSION,
  stableStringify,
  hashEntries,
  computeManifestMeta,
  verifyManifest,
};
