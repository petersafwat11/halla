/**
 * Legal policy manifest + parity contract tests (LEG-01/03 · P1-03/06/07).
 *
 * Proves the shared canonical legal package and the backend-generated manifest
 * are internally consistent, AR/EN-parallel, versioned, and drift-free — with no
 * DB, credentials, or network. Also asserts the manifest URLs match the paths the
 * mobile purchase UI hard-links and that every document is owner-gated (nothing
 * is silently "approved").
 *
 * Run:  node --test test/legal-manifest.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildLegalManifest,
  verifyLegalManifest,
  ROUTE_SLUGS,
  sha256,
} = require("../src/shared/legal/legalManifest");
const { readAllDocuments, LOCALES, DOCUMENT_FILES } = require("../src/shared/legal/legalContent");
const generator = require("../scripts/generateLegalManifest");
const committed = require("../src/shared/legal/legalPolicies.generated.json");
const policies = require("../src/shared/constants/policies");

const manifest = buildLegalManifest();
const docs = readAllDocuments();

const EXPECTED_DOCS = ["privacy", "terms", "community-rules", "refund", "deletion", "support"];
// The exact paths the mobile purchase UI hard-links (PurchaseLegalLinks/manifest).
const MOBILE_HARDLINKED = { terms: "terms", privacy: "privacy", refund: "refund" };

test("manifest contains exactly the six canonical documents", () => {
  assert.equal(manifest.documentCount, 6);
  const types = manifest.documents.map((d) => d.documentType).sort();
  assert.deepEqual(types, [...EXPECTED_DOCS].sort());
});

test("every document has AR + EN with non-empty sections", () => {
  for (const documentType of EXPECTED_DOCS) {
    const doc = docs[documentType];
    for (const locale of LOCALES) {
      assert.ok(doc[locale], `${documentType} missing ${locale}`);
      assert.ok(Array.isArray(doc[locale].sections) && doc[locale].sections.length > 0);
    }
  }
});

test("AR and EN section ids are identical (order + values) per document", () => {
  for (const documentType of EXPECTED_DOCS) {
    const ar = docs[documentType].ar.sections.map((s) => s.id);
    const en = docs[documentType].en.sections.map((s) => s.id);
    assert.deepEqual(ar, en, `${documentType} AR/EN section id parity`);
  }
});

test("AR and EN versions are in lockstep per document", () => {
  for (const documentType of EXPECTED_DOCS) {
    assert.equal(
      docs[documentType].ar.version,
      docs[documentType].en.version,
      `${documentType} AR/EN version lockstep`
    );
  }
});

test("canonical URLs are HTTPS, non-placeholder, and locale-correct", () => {
  for (const d of manifest.documents) {
    for (const locale of LOCALES) {
      const url = d.urls[locale];
      assert.match(url, /^https:\/\/halaa\.com\.sa\//, `${d.documentType} ${locale} must be https halaa.com.sa`);
      assert.ok(url.includes(`/${locale}/`), `${d.documentType} URL must carry its locale`);
      assert.ok(!/placeholder|example|TODO/i.test(url), `${d.documentType} URL must not be a placeholder`);
    }
  }
});

test("manifest URLs match the mobile-hardlinked {terms,privacy,refund} paths", () => {
  for (const [documentType, slug] of Object.entries(MOBILE_HARDLINKED)) {
    assert.equal(ROUTE_SLUGS[documentType], slug, `${documentType} slug must stay ${slug}`);
    const entry = manifest.documents.find((d) => d.documentType === documentType);
    assert.equal(entry.urls.en, `https://halaa.com.sa/en/${slug}`);
    assert.equal(entry.urls.ar, `https://halaa.com.sa/ar/${slug}`);
  }
});

test("deletion document maps to the existing public delete-account route", () => {
  const del = manifest.documents.find((d) => d.documentType === "deletion");
  assert.equal(del.slug, "delete-account");
  assert.equal(del.urls.en, "https://halaa.com.sa/en/delete-account");
});

test("EVERY document records the explicit owner approval", () => {
  for (const d of manifest.documents) {
    assert.equal(d.approved, true, `${d.documentType} must reflect the recorded owner signoff`);
    assert.equal(d.ownerApproval, "OWNER_APPROVED");
  }
});

test("manifest self-hash verifies and is deterministic", () => {
  const v = verifyLegalManifest(manifest);
  assert.ok(v.ok, `verify errors: ${v.errors.join("; ")}`);
  // Rebuild → identical hash (byte-reproducible, timestamp-free).
  assert.equal(buildLegalManifest().manifestHash, manifest.manifestHash);
});

test("committed generated manifest matches a fresh build (no drift)", () => {
  const drifted = generator.findDrift();
  assert.deepEqual(drifted, [], `drift: ${drifted.join(", ")}`);
  assert.equal(committed.manifestHash, manifest.manifestHash);
});

test("per-document content hashes track the section text", () => {
  for (const documentType of EXPECTED_DOCS) {
    const entry = manifest.documents.find((d) => d.documentType === documentType);
    assert.equal(entry.contentHash.ar, sha256(docs[documentType].ar.sections));
    assert.equal(entry.contentHash.en, sha256(docs[documentType].en.sections));
  }
});

test("refund document carries the store-billing sections (signed substance)", () => {
  // Event-cancellation (9) + store-billing (6) = 15 sections.
  const refund = docs.refund;
  assert.equal(refund.ar.sections.length, 15);
  assert.equal(refund.en.sections.length, 15);
  const enText = refund.en.sections.map((s) => s.body).join("\n");
  assert.match(enText, /auto-renew/i);
  assert.match(enText, /work already performed.*not refundable/i); // managed-service fulfillment boundary
  assert.match(enText, /not automatically transferred/i); // DEC-04 keep-with-original
  assert.match(enText, /15%/); // Saudi VAT
});

test("deletion document reflects the actual implemented behavior (factual)", () => {
  const enText = docs.deletion.en.sections.map((s) => s.body).join("\n");
  assert.match(enText, /failed file deletion is retried/i); // truthful pending_retry
  assert.match(enText, /RevenueCat/); // retained_by_policy
  assert.match(enText, /does NOT cancel/i); // store subscription warning
});

test("policies.js derives versions + URLs from the manifest (P1-07)", () => {
  const termsEntry = manifest.documents.find((d) => d.documentType === "terms");
  const communityEntry = manifest.documents.find((d) => d.documentType === "community-rules");
  assert.equal(policies.POLICY_VERSIONS.terms, termsEntry.version);
  // Acceptance key "community" -> canonical doc "community-rules".
  assert.equal(policies.POLICY_VERSIONS.community, communityEntry.version);
  assert.deepEqual(policies.POLICY_URLS.community, communityEntry.urls);
  assert.deepEqual(policies.UGC_REQUIRED_POLICIES, ["terms", "community"]);
});

test("document reader file map covers exactly the manifest documents", () => {
  assert.deepEqual(Object.keys(DOCUMENT_FILES).sort(), [...EXPECTED_DOCS].sort());
});

test("generated markdown inventory exists and lists all documents", () => {
  const md = fs.readFileSync(generator.MD_PATH, "utf8");
  for (const documentType of EXPECTED_DOCS) {
    assert.ok(md.includes(documentType), `inventory must mention ${documentType}`);
  }
  assert.match(md, /OWNER_APPROVED/);
});
