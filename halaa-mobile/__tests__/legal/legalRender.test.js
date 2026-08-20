const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DOCS_DIR = path.resolve(__dirname, "..", "..", "..", "shared", "src", "legal", "documents");

const FILES = {
  privacy: "privacy.json",
  terms: "terms.json",
  "community-rules": "communityRules.json",
  refund: "refund.json",
  deletion: "deletion.json",
  support: "support.json",
};

const LOCALES = ["ar", "en"];

function readDoc(documentType) {
  return JSON.parse(fs.readFileSync(path.join(DOCS_DIR, FILES[documentType]), "utf8"));
}

test("all six legal documents exist in AR and EN with valid render shape", () => {
  for (const docType of Object.keys(FILES)) {
    const raw = readDoc(docType);
    for (const locale of LOCALES) {
      const doc = raw[locale];
      assert.ok(doc, `${docType} missing locale ${locale}`);
      assert.ok(doc.title, `${docType} [${locale}] missing title`);
      assert.ok(Array.isArray(doc.sections), `${docType} [${locale}] sections must be an array`);

      for (let i = 0; i < doc.sections.length; i++) {
        const s = doc.sections[i];
        assert.ok(s.id, `${docType} [${locale}] section ${i} missing id`);
        assert.ok(s.num, `${docType} [${locale}] section ${i} missing num`);
        assert.ok(s.title, `${docType} [${locale}] section ${i} missing title`);
        assert.ok(s.body, `${docType} [${locale}] section ${i} missing body`);
      }
    }
  }
});

test("badge suppression logic prevents redundant top pills", () => {
  const shouldShowBadge = (badge, title) => {
    if (!badge) return false;
    return String(badge).trim().toLowerCase() !== String(title || "").trim().toLowerCase();
  };

  assert.equal(shouldShowBadge("Privacy Policy", "Privacy Policy"), false);
  assert.equal(shouldShowBadge("سياسة الخصوصية", "سياسة الخصوصية"), false);
  assert.equal(shouldShowBadge("Terms of Service", "Terms of Service"), false);
  assert.equal(shouldShowBadge("شروط الخدمة", "شروط الخدمة"), false);
  assert.equal(shouldShowBadge("Support", "Support"), false);
  assert.equal(shouldShowBadge("الدعم الفني", "الدعم الفني"), false);
  assert.equal(shouldShowBadge("Official", "Terms of Service"), true);
  assert.equal(shouldShowBadge("رسمي", "شروط الخدمة"), true);
});
