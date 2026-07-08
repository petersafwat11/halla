/**
 * Legal content reader (backend, CJS).
 *
 * The canonical legal documents live in the ESM `@halaa/shared` workspace as
 * inert JSON (`shared/src/legal/documents/*.json`). The backend is CommonJS and
 * does NOT import `@halaa/shared` (see `commerce/index.js` for the same rule) —
 * but JSON is language-agnostic, so we read the SAME files via `fs`. This is the
 * single source shared with web + mobile; there is no duplicate copy in the
 * backend.
 *
 * Used only at legal-manifest generation / verification time and by the derived
 * `policies.js` constants — never to render content (that is a web/mobile
 * concern).
 */

const fs = require("fs");
const path = require("path");

// halaa-backend/src/shared/legal -> repo root shared/src/legal/documents
const DOCUMENTS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "shared",
  "src",
  "legal",
  "documents"
);

// documentType (canonical) -> source filename
const DOCUMENT_FILES = Object.freeze({
  privacy: "privacy.json",
  terms: "terms.json",
  "community-rules": "communityRules.json",
  refund: "refund.json",
  deletion: "deletion.json",
  support: "support.json",
});

const LOCALES = Object.freeze(["ar", "en"]);

function readDocument(documentType) {
  const file = DOCUMENT_FILES[documentType];
  if (!file) throw new Error(`Unknown legal documentType: ${documentType}`);
  const full = path.join(DOCUMENTS_DIR, file);
  const raw = fs.readFileSync(full, "utf8");
  return JSON.parse(raw);
}

/** Read every canonical document as { documentType: { ar, en } }. */
function readAllDocuments() {
  const out = {};
  for (const documentType of Object.keys(DOCUMENT_FILES)) {
    out[documentType] = readDocument(documentType);
  }
  return out;
}

module.exports = {
  DOCUMENTS_DIR,
  DOCUMENT_FILES,
  LOCALES,
  readDocument,
  readAllDocuments,
};
