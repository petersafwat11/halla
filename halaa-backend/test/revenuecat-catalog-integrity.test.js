/**
 * Catalog integrity + strict resolver tests (BILL-01 · §1). DB-free.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hashEntries,
  computeManifestMeta,
  verifyManifest,
  stableStringify,
} = require("../src/shared/commerce/catalog.integrity");
const commerce = require("../src/shared/commerce");
const { resolveProductMaps, parseStrict } = require("../src/shared/commerce/catalog.resolver");

// ── hash determinism ─────────────────────────────────────────────────────────
test("hashEntries is stable regardless of key order", () => {
  const a = [{ internalCode: "x", price: 10, kind: "subscription" }];
  const b = [{ kind: "subscription", price: 10, internalCode: "x" }];
  assert.equal(hashEntries(a), hashEntries(b));
});

test("hashEntries changes when an entry changes", () => {
  const a = [{ internalCode: "x", price: 10 }];
  const b = [{ internalCode: "x", price: 11 }];
  assert.notEqual(hashEntries(a), hashEntries(b));
});

test("hashEntries is version-scoped", () => {
  const e = [{ internalCode: "x" }];
  assert.notEqual(hashEntries(e, "1.0.0"), hashEntries(e, "2.0.0"));
});

test("stableStringify handles nested + null + undefined", () => {
  assert.equal(stableStringify({ b: 1, a: [null, undefined] }), '{"a":[null,null],"b":1}');
});

// ── verifyManifest ───────────────────────────────────────────────────────────
test("verifyManifest accepts a self-consistent manifest", () => {
  const entries = [{ internalCode: "x", price: 1 }];
  const meta = computeManifestMeta(entries);
  const manifest = { ...meta, entries };
  assert.equal(verifyManifest(manifest).ok, true);
});

test("verifyManifest rejects a tampered entry (hash mismatch)", () => {
  const entries = [{ internalCode: "x", price: 1 }];
  const meta = computeManifestMeta(entries);
  const manifest = { ...meta, entries: [{ internalCode: "x", price: 999 }] }; // tampered
  const r = verifyManifest(manifest);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "manifest_hash_mismatch");
});

test("verifyManifest rejects missing manifest / no entries / no hash", () => {
  assert.equal(verifyManifest(null).reason, "manifest_missing");
  assert.equal(verifyManifest({}).reason, "manifest_no_entries");
  assert.equal(verifyManifest({ entries: [] }).reason, "manifest_missing_version_or_hash");
});

test("verifyManifest rejects entry-count mismatch", () => {
  const entries = [{ internalCode: "x" }];
  const meta = computeManifestMeta(entries);
  const r = verifyManifest({ ...meta, entryCount: 999, entries });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "manifest_entry_count_mismatch");
});

// ── the REAL committed manifest is valid ─────────────────────────────────────
test("the committed manifest passes runtime integrity", () => {
  const r = commerce.getCatalogIntegrity();
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.catalogVersion, "1.0.0");
  assert.equal(r.entryCount, 56);
});

// ── strict resolver ──────────────────────────────────────────────────────────
test("resolver returns the canonical maps with no env overrides", () => {
  const r = resolveProductMaps({});
  assert.equal(r.ok, true);
  // every store-eligible plan/add-on resolves com.halla.<code> → <code>
  assert.equal(r.planMap["com.halla.premium_monthly_100"], "premium_monthly_100");
  assert.equal(r.addonMap["com.halla.extra_invites_50"], "extra_invites_50");
  assert.equal(r.errors.length, 0);
});

test("resolver applies a VALID override (real console id → existing code)", () => {
  const r = resolveProductMaps({
    REVENUECAT_PRODUCT_PLAN_MAP: JSON.stringify({ "123456": "premium_monthly_100" }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.planMap["123456"], "premium_monthly_100");
});

test("resolver rejects invalid JSON (does NOT silently become empty)", () => {
  const r = resolveProductMaps({ REVENUECAT_PRODUCT_PLAN_MAP: "{not json" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "env_parse"));
  // canonical maps still resolve — fail closed on the bad entry, not the world
  assert.equal(r.planMap["com.halla.premium_monthly_100"], "premium_monthly_100");
});

test("resolver rejects an unknown target code", () => {
  const r = resolveProductMaps({ REVENUECAT_PRODUCT_PLAN_MAP: JSON.stringify({ "999": "no_such_code" }) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "unknown_code"));
  assert.equal(r.planMap["999"], undefined);
});

test("resolver rejects a cross-type mapping (plan map → add-on code)", () => {
  const r = resolveProductMaps({ REVENUECAT_PRODUCT_PLAN_MAP: JSON.stringify({ "999": "extra_invites_50" }) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "cross_type_code"));
});

test("resolver rejects an override that conflicts with a canonical product id", () => {
  const r = resolveProductMaps({
    REVENUECAT_PRODUCT_PLAN_MAP: JSON.stringify({ "com.halla.basic_event_25": "premium_monthly_100" }),
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "conflicts_canonical"));
});

test("resolver rejects a product id claimed by BOTH plan and add-on maps", () => {
  const r = resolveProductMaps({
    REVENUECAT_PRODUCT_PLAN_MAP: JSON.stringify({ "dup": "premium_monthly_100" }),
    REVENUECAT_ADDON_PRODUCT_MAP: JSON.stringify({ "dup": "extra_invites_50" }),
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "duplicate_cross_map"));
});

test("resolver rejects non-string mapping values", () => {
  const r = resolveProductMaps({ REVENUECAT_ADDON_PRODUCT_MAP: JSON.stringify({ "x": 123 }) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.code === "env_parse"));
});

test("parseStrict treats empty/undefined as a valid empty override", () => {
  assert.deepEqual(parseStrict(undefined), { ok: true, obj: {} });
  assert.deepEqual(parseStrict("  "), { ok: true, obj: {} });
});
