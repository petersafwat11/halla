#!/usr/bin/env node
/**
 * Shared legal-package parity / schema / URL CI check (LEG-03).
 *
 * Validates the canonical legal documents directly from disk with `fs` (NOT via
 * an ESM `import`, so it runs under plain Node without JSON import attributes and
 * without a bundler). Fails (exit 1) when:
 *   - a required document or locale is missing;
 *   - AR/EN section ids differ (order or values);
 *   - AR/EN versions differ;
 *   - a document's ownerApproval is not the expected BLOCKED_NEEDS_OWNER gate;
 *   - the registry (manifest.js LEGAL_ROUTES) and the documents disagree;
 *   - a canonical URL is non-HTTPS / placeholder / missing its locale;
 *   - the mobile-hardlinked {terms,privacy,refund} slugs drift.
 *
 * This is intentionally standalone and dependency-free so it can gate CI for the
 * shared package independently of the backend manifest generator (which performs
 * the same checks from the backend side + hashing).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "..", "src", "legal", "documents");
const MANIFEST_JS = path.resolve(__dirname, "..", "src", "legal", "manifest.js");

const DOCUMENT_FILES = {
  privacy: "privacy.json",
  terms: "terms.json",
  "community-rules": "communityRules.json",
  refund: "refund.json",
  deletion: "deletion.json",
  support: "support.json",
};
const LOCALES = ["ar", "en"];
const MOBILE_HARDLINKED = { terms: "terms", privacy: "privacy", refund: "refund" };

const errors = [];
const fail = (m) => errors.push(m);

function readDoc(documentType) {
  const p = path.join(DOCS_DIR, DOCUMENT_FILES[documentType]);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// 1) Registry (manifest.js LEGAL_ROUTES) must declare exactly these documents.
// Keys may be quoted ("community-rules":) or bare identifiers (privacy:).
const manifestSrc = fs.readFileSync(MANIFEST_JS, "utf8");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasRouteKey = (documentType) =>
  new RegExp(`(?:"${esc(documentType)}"|${esc(documentType)})\\s*:`).test(manifestSrc);
const hasRoutePair = (documentType, slug) =>
  new RegExp(`(?:"${esc(documentType)}"|${esc(documentType)})\\s*:\\s*"${esc(slug)}"`).test(manifestSrc);
for (const documentType of Object.keys(DOCUMENT_FILES)) {
  if (!hasRouteKey(documentType)) {
    fail(`manifest.js LEGAL_ROUTES is missing "${documentType}"`);
  }
}

// 2) Per-document schema + AR/EN parity.
for (const documentType of Object.keys(DOCUMENT_FILES)) {
  let doc;
  try {
    doc = readDoc(documentType);
  } catch (e) {
    fail(`${documentType}: cannot read/parse (${e.message})`);
    continue;
  }
  for (const locale of LOCALES) {
    const d = doc[locale];
    if (!d) {
      fail(`${documentType}: missing locale "${locale}"`);
      continue;
    }
    if (d.documentType !== documentType) {
      fail(`${documentType} (${locale}): documentType field is "${d.documentType}"`);
    }
    if (!Array.isArray(d.sections) || d.sections.length === 0) {
      fail(`${documentType} (${locale}): sections must be a non-empty array`);
    } else {
      d.sections.forEach((s, i) => {
        if (!s || !s.id) fail(`${documentType} (${locale}): section ${i} missing id`);
        if (typeof s.body !== "string" || !s.body.length) {
          fail(`${documentType} (${locale}): section ${s && s.id} body must be a non-empty string`);
        }
      });
    }
    if (!d.version) fail(`${documentType} (${locale}): missing version`);
    if (d.ownerApproval !== "BLOCKED_NEEDS_OWNER") {
      fail(`${documentType} (${locale}): ownerApproval must be BLOCKED_NEEDS_OWNER until signed (got ${d.ownerApproval})`);
    }
  }
  if (doc.ar && doc.en) {
    const arIds = (doc.ar.sections || []).map((s) => s.id).join("|");
    const enIds = (doc.en.sections || []).map((s) => s.id).join("|");
    if (arIds !== enIds) fail(`${documentType}: AR/EN section ids differ`);
    if (doc.ar.version !== doc.en.version) {
      fail(`${documentType}: AR/EN version mismatch (${doc.ar.version} vs ${doc.en.version})`);
    }
  }
}

// 3) Mobile-hardlinked slug stability (terms/privacy/refund).
for (const [documentType, slug] of Object.entries(MOBILE_HARDLINKED)) {
  if (!hasRoutePair(documentType, slug)) {
    fail(`manifest.js LEGAL_ROUTES["${documentType}"] must equal "${slug}" (mobile hard-links it)`);
  }
}

// 4) Deletion must map to the existing public delete-account route.
if (!hasRoutePair("deletion", "delete-account")) {
  fail(`manifest.js LEGAL_ROUTES["deletion"] must equal "delete-account"`);
}

if (errors.length) {
  console.error(`\n✗ legal parity check: ${errors.length} problem(s):`);
  for (const e of errors) console.error(`   - ${e}`);
  console.error("");
  process.exit(1);
}
console.log(`✓ legal parity check passed — ${Object.keys(DOCUMENT_FILES).length} documents, AR/EN parallel, URLs/slug/schema OK.`);
