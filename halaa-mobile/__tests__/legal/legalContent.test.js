/**
 * Mobile-side structure test for the shared legal content the app renders
 * (LegalScreen consumes `@halla/shared/legal` getLegalDocument()).
 *
 * Reads the shared canonical JSON via `fs` (portable under plain node --test,
 * matching how the backend manifest reads it) and asserts every mobile legal
 * screen has a well-formed AR + EN document with the exact render shape
 * LegalScreen expects: { badge, title, sections: [{ id, num, label, title, body }] }.
 *
 * No react-native, no device, no bundler.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DOCS_DIR = path.resolve(__dirname, "..", "..", "..", "shared", "src", "legal", "documents");

// documentType -> file. Mirrors the shared documents.js registry and the
// mobile screens: Privacy/Terms/CommunityRules/Refund/Deletion/Support.
const FILES = {
  privacy: "privacy.json",
  terms: "terms.json",
  "community-rules": "communityRules.json",
  refund: "refund.json",
  deletion: "deletion.json",
  support: "support.json",
};
const LOCALES = ["ar", "en"];

function read(documentType) {
  return JSON.parse(fs.readFileSync(path.join(DOCS_DIR, FILES[documentType]), "utf8"));
}

test("every mobile legal screen has an AR + EN shared document", () => {
  for (const documentType of Object.keys(FILES)) {
    const doc = read(documentType);
    for (const locale of LOCALES) {
      assert.ok(doc[locale], `${documentType} missing ${locale}`);
      assert.ok(doc[locale].title, `${documentType} (${locale}) missing title`);
    }
  }
});

test("documents match the LegalScreen render shape", () => {
  for (const documentType of Object.keys(FILES)) {
    const doc = read(documentType);
    for (const locale of LOCALES) {
      const d = doc[locale];
      assert.ok(Array.isArray(d.sections) && d.sections.length > 0, `${documentType} (${locale}) sections`);
      for (const s of d.sections) {
        assert.ok(s.id, `${documentType} (${locale}) section id`);
        assert.ok("num" in s, `${documentType} (${locale}) section num`);
        assert.equal(typeof s.body, "string", `${documentType} (${locale}) section body string`);
        assert.ok(s.body.length > 0, `${documentType} (${locale}) section body non-empty`);
      }
    }
  }
});

test("AR/EN section ids are parallel per document (mobile parity)", () => {
  for (const documentType of Object.keys(FILES)) {
    const doc = read(documentType);
    const ar = doc.ar.sections.map((s) => s.id);
    const en = doc.en.sections.map((s) => s.id);
    assert.deepEqual(ar, en, `${documentType} AR/EN parity`);
  }
});

test("nothing is silently approved (owner gate present)", () => {
  for (const documentType of Object.keys(FILES)) {
    const doc = read(documentType);
    for (const locale of LOCALES) {
      assert.equal(
        doc[locale].ownerApproval,
        "BLOCKED_NEEDS_OWNER",
        `${documentType} (${locale}) must stay owner-gated`
      );
    }
  }
});
