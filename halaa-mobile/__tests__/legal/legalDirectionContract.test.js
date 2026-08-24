const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

// The six host legal routes all render through one shared screen.
const LEGAL_SCREENS = {
  privacy: "screens/legal/PrivacyScreen.js",
  terms: "screens/legal/TermsScreen.js",
  "community-rules": "screens/legal/CommunityRulesScreen.js",
  refund: "screens/legal/RefundScreen.js",
  deletion: "screens/legal/DeletionScreen.js",
  support: "screens/legal/SupportScreen.js",
};

test("LegalScreen isolates LTR tokens through the canonical shared matcher", () => {
  const screen = read("screens/legal/LegalScreen.js");

  assert.match(
    screen,
    /isolateLegalLtrTokens\s*\}\s*from\s+"@halaa\/shared\/legal"/,
    "the token matcher must live in @halaa/shared/legal, not in the page"
  );
  assert.ok(
    !screen.includes("LTR_LEGAL_TOKEN_REGEX") && !screen.includes("isolateLegalParagraph"),
    "local matcher copies must be removed once the shared one exists"
  );
  // Isolation is only applied to RTL copy.
  assert.match(screen, /isolateLegalLtrTokens\(paragraph,\s*isRtl\)/);
});

test("section headers share the paragraph BiDi contract (refund §11 store names)", () => {
  // Proven content case: refund article-11 Arabic title embeds
  // "App Store" / "Google Play". Section label/title must flow through the
  // same canonical matcher as body paragraphs so the tokens stay atomic.
  const screen = read("screens/legal/LegalScreen.js");

  assert.match(
    screen,
    /\{isolateLegalLtrTokens\(section\.label,\s*isRtl\)\}/,
    "section labels must pass through the shared matcher"
  );
  assert.match(
    screen,
    /\{isolateLegalLtrTokens\(section\.title,\s*isRtl\)\}/,
    "section titles must pass through the shared matcher"
  );

  for (const locale of ["ar", "en"]) {
    const doc = JSON.parse(
      fs.readFileSync(
        path.join(MOBILE_ROOT, "..", "shared", "src", "legal", "documents", "refund.json"),
        "utf8"
      )
    );
    const heading = doc[locale].sections.find((s) => s.id === "article-11").title;
    if (locale === "ar") {
      assert.match(heading, /App Store/, "fixture expectation: AR title embeds store names");
    } else {
      assert.ok(!/[\u0600-\u06FF]/.test(heading), "EN title stays Latin");
    }
  }
});

test("LegalScreen renders localized copy through the shared LocalizedText role", () => {
  const screen = read("screens/legal/LegalScreen.js");

  assert.ok(screen.includes("LocalizedText"), "badge/title/subtitle/date/sections must use the localized role");
  // badge, title, subtitle, lastUpdated line, section label, section title, paragraphs
  const uses = screen.split("<LocalizedText").length - 1;
  assert.ok(uses >= 7, `expected every visible localized string on LocalizedText, found ${uses}`);
  assert.ok(
    !screen.includes("rtlText:") && !screen.includes("ltrText:"),
    "per-page writing-direction style duplicates are replaced by the shared role"
  );
});

test("section numbers stay pinned LTR digits; layout stays logical", () => {
  const screen = read("screens/legal/LegalScreen.js");

  // Intentionally physical glyph (documented in-file), not a locale patch.
  assert.match(screen, /numBadgeText[\s\S]{0,200}writingDirection:\s*"ltr"/);
  // Plain logical row for number → title; no double-flip and no physical
  // spacing/borders in this tree.
  assert.ok(!screen.includes("row-reverse"));
  assert.ok(
    !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|left|right)\s*:/.test(
      screen.slice(screen.indexOf("StyleSheet.create"))
    ),
    "only logical/neutral styles are allowed in the legal tree"
  );
});

test("all six legal routes stay thin wrappers over the shared screen + content", () => {
  for (const [documentType, rel] of Object.entries(LEGAL_SCREENS)) {
    const source = read(rel);
    assert.match(source, /getLegalDocument/, `${rel} must read the canonical shared document`);
    assert.match(source, new RegExp(`"${documentType}"`), `${rel} must request its own document type`);
    assert.match(source, /<LegalScreen data=\{data\} \/>/, `${rel} must delegate rendering to LegalScreen`);
    assert.ok(!source.includes("<Text"), `${rel} must not add local text chrome`);
  }
});

test("lastUpdated renders as one translated sentence with an interpolated date", () => {
  const screen = read("screens/legal/LegalScreen.js");
  assert.match(
    screen,
    /t\("legal\.lastUpdated",\s*\{\s*date:\s*data\.lastUpdated\s*\}\)/,
    "punctuation belongs inside the translation string, not JSX concatenation"
  );
  assert.ok(
    !screen.includes('}:{" "}'),
    "no JSX-assembled label + colon + value lines"
  );

  for (const locale of ["en", "ar"]) {
    const settings = JSON.parse(
      fs.readFileSync(path.join(MOBILE_ROOT, "localization/locales", locale, "settings.json"), "utf8")
    );
    assert.match(
      settings.legal.lastUpdated,
      /\{\{date\}\}/,
      `${locale} legal.lastUpdated must interpolate the document date`
    );
  }
});
