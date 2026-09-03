import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const SHARED_ROOT = path.resolve(__dirname, "..", "..", "..", "shared");

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const MARKETPLACE_SOURCES = [
  "screens/common/Marketplace.js",
  "components/marketplace/SearchAndFilter.js",
  "components/marketplace/VendorCard.js",
  "components/marketplace/VendorCards.js",
  "components/marketplace/FilterPopup.js",
  "components/marketplace/_components/FilterDropdown.js",
  "components/marketplace/_components/FilterInputs.js",
];

describe("Marketplace iOS direction blueprint (§8 Marketplace row)", () => {
  describe("display token helpers (shared/src/utils/displayTokens.js)", async () => {
    const { countToken, priceToken, percentToken } = await import(
      pathToFileURL(path.join(SHARED_ROOT, "src", "utils", "displayTokens.js")).href
    );
    const { LRI, PDI } = await import(
      pathToFileURL(path.join(SHARED_ROOT, "src", "utils", "bidi.js")).href
    );

    it("countToken returns one LTR-isolated locale-formatted count", () => {
      const en = countToken(12, "en");
      assert.ok(en.startsWith(LRI) && en.endsWith(PDI), "count must be isolated");
      assert.ok(en.includes("12"), "en count uses Latin digits");

      const ar = countToken(12, "ar");
      assert.ok(ar.startsWith(LRI) && ar.endsWith(PDI), "count must be isolated");
      assert.ok(ar.includes("12"), "ar count uses Latin digits per F-15");
    });

    it("priceToken builds ONE atomic isolated number+currency token", () => {
      const token = priceToken(1500, "ر.س", { locale: "ar" });
      assert.ok(token.startsWith(LRI) && token.endsWith(PDI), "price must be isolated");
      // The number and currency live inside a single isolate — they cannot
      // BiDi-split or reorder against surrounding Arabic copy.
      const inner = token.slice(LRI.length, token.length - PDI.length);
      assert.ok(inner.includes("١٥٠٠") || inner.includes("1500"), "number is locale formatted");
      assert.ok(inner.includes("ر.س"), "currency label is part of the atomic token");
    });

    it("priceToken trusts and isolates store SDK price strings verbatim", () => {
      const token = priceToken(null, null, { priceString: "$3.99" });
      assert.equal(token, `${LRI}$3.99${PDI}`);
    });

    it("percentToken follows the locale script direction", () => {
      assert.ok(percentToken(15, "en").includes("15%"));
      assert.ok(percentToken(15, "ar").includes("٪"));
    });
  });

  it("Marketplace keeps the top bar counter-free and formats the result count", () => {
    const content = read(MARKETPLACE_SOURCES[0]);

    assert.ok(
      content.includes('title={t("title")}'),
      "TopBar title must not include the result counter"
    );
    assert.ok(
      !content.includes('t("titleWithCount", { count: totalToken })'),
      "TopBar must not render titleWithCount"
    );
    assert.ok(
      content.includes("countToken(total, currentLanguage)"),
      "the vendor total must pass through countToken (formatted + isolated)"
    );
    assert.ok(
      content.includes("{ count: totalToken }") &&
        content.includes('t("results.title", { count: totalToken })'),
      "results heading must interpolate the pre-isolated count token"
    );
    assert.ok(
      content.includes("join(isAr ? \"، \" : \", \")"),
      "vendor location join must keep the locale-aware separator"
    );
    assert.ok(
      content.includes("LocalizedText"),
      "category chips / results copy use the localized text role"
    );
  });

  it("marketplace search is adaptive: placeholder follows locale, value first-strong", () => {
    const content = read(MARKETPLACE_SOURCES[1]);

    assert.ok(
      content.includes('contentDirection="adaptive"'),
      "search input must declare adaptive content direction"
    );
    assert.ok(
      !content.includes("useInputDirection(\"localized\")"),
      "manual localized style merging is replaced by the primitive's contract"
    );
  });

  it("VendorCard renders backend content adaptively with atomic price/rating tokens", () => {
    const content = read(MARKETPLACE_SOURCES[2]);

    assert.ok(content.includes("AdaptiveText"), "brand/description/location need AdaptiveText");
    const adaptiveUses = content.match(/<AdaptiveText/g)?.length ?? 0;
    assert.ok(adaptiveUses >= 3, `brand, description and location must all be adaptive (${adaptiveUses})`);

    assert.ok(
      content.includes("priceToken(vendor.minPrice"),
      "price must render through the shared atomic price token"
    );
    assert.ok(
      content.includes("isolateLtr(") && content.includes("formatNumber("),
      "rating digits must be locale-formatted and LTR-isolated"
    );
    assert.ok(
      !/\{vendor\.minPrice\}/.test(content),
      "raw price values must not be interpolated directly into copy"
    );

    assert.ok(
      content.includes("+${countToken(extraTagsCount"),
      "+N extra-tag badge must be a locale count token"
    );
    assert.ok(
      /isolateLtr\(\s*`\+\$\{countToken\(extraTagsCount/.test(content),
      "the '+' sign must sit INSIDE the LTR isolate so it cannot BiDi-detach from the digits in Arabic"
    );

    // Rule 10: no direct Arabic UI literals in component source.
    const arabicLiterals = content.match(/[\u0600-\u06FF]{2,}/g) || [];
    assert.deepEqual(
      arabicLiterals,
      [],
      `VendorCard must not embed Arabic literals: ${arabicLiterals.join(", ")}`
    );
  });

  it("VendorCard name/location/rating cluster at the logical start with LTR-pinned numeric tokens", () => {
    const content = read(MARKETPLACE_SOURCES[2]);

    // Rating + location render as ONE leading cluster under the name —
    // never pinned to opposite edges by space-between.
    const metaStart = content.indexOf("<View style={styles.meta}>");
    const metaEnd = content.indexOf("</View>", content.indexOf("styles.locationRow", metaStart));
    assert.ok(metaStart !== -1 && metaEnd > metaStart, "meta block exists");
    const metaBlock = content.slice(metaStart, metaEnd);
    assert.ok(metaBlock.includes("styles.rating") && metaBlock.includes("styles.locationRow"),
      "rating and location live in the same meta cluster");

    assert.ok(
      /meta:\s*\{[\s\S]{0,200}?gap:\s*12,\s*\}/.test(content) &&
        !/meta:\s*\{[\s\S]{0,200}?space-between/.test(content),
      "meta row keeps the rating/location pair together at the logical start"
    );

    // The numeric rating token is pinned LTR so digits never reflow under RTL.
    assert.match(content, /styles\.ratingValue,\s*styles\.ltrValue/, "rating value uses the ltrValue pin");
    assert.match(content, /ltrValue:\s*\{[^}]*writingDirection:\s*"ltr"/, "ltrValue style pins writingDirection ltr");
    assert.match(content, /priceValue:\s*\{[\s\S]{0,400}?writingDirection:\s*"ltr"/, "price token run is pinned LTR inside localized label copy");

    assert.ok(!/flexDirection\s*:\s*["']row-reverse["']/.test(content), "no row-reverse in VendorCard");
  });

  it("filter sheet places close at the logical end and keeps metadata localized", () => {
    const content = read(MARKETPLACE_SOURCES[4]);
    const headerStart = content.indexOf("<View style={styles.header}>");
    const bodyEnd = content.indexOf("</ScrollView>", headerStart);
    assert.ok(headerStart !== -1, "header block exists");

    const headerBlock = content.slice(headerStart, content.indexOf("</View>", headerStart));
    const titleIdx = headerBlock.indexOf('t("filters.title")');
    const closeIdx = headerBlock.indexOf('name="close"');
    assert.ok(titleIdx !== -1 && closeIdx !== -1, "header has title and close");
    assert.ok(
      closeIdx > titleIdx,
      "close affordance must come AFTER the title in JSX order → logical end"
    );

    assert.ok(content.includes("LocalizedText role=\"label\""), "field labels use the localized text role");
    assert.ok(
      !content.includes('"Couldn\'t load locations"') && !content.includes('"Retry"'),
      "inline English default literals must not bypass translation keys"
    );
    assert.ok(!/flexDirection\s*:\s*["']row-reverse["']/.test(content), "no row-reverse");
  });

  it("filter dropdown mirrors the shared DropdownInput anatomy", () => {
    const content = read(MARKETPLACE_SOURCES[5]);

    const triggerStart = content.indexOf("<TouchableOpacity");
    const triggerEnd = content.indexOf("</TouchableOpacity>", triggerStart);
    const trigger = content.slice(triggerStart, triggerEnd);
    const textFirst = trigger.search(/AdaptiveText|LocalizedText/);
    const chevronIdx = trigger.indexOf('name="chevron-down"');
    assert.ok(textFirst !== -1 && chevronIdx !== -1);
    assert.ok(
      chevronIdx > textFirst,
      "trigger value sits at logical start, chevron affordance at logical end"
    );

    const modalHeaderStart = content.indexOf("<View style={styles.dropdownModalHeader}>");
    const modalHeader = content.slice(modalHeaderStart, content.indexOf("</View>", modalHeaderStart));
    const titleIdx = modalHeader.indexOf("dropdownModalTitle");
    const closeIdx = modalHeader.indexOf('name="close"');
    assert.ok(closeIdx > titleIdx, "modal close sits at the logical end");

    assert.ok(content.includes("AdaptiveText"), "backend option names are adaptive");
  });

  it("price range inputs use digit-entry contract (localized placeholder, LTR digits)", () => {
    const content = read(MARKETPLACE_SOURCES[6]);
    const phoneModeCount = (content.match(/contentDirection="phone"/g) || []).length;
    assert.equal(phoneModeCount, 2, "min and max price inputs both use the digit-entry mode");
    assert.ok(
      !content.includes("writingDirection: \"ltr\""),
      "direction is owned by the shared primitive, not hardcoded styles"
    );
  });

  it("no physical directional styles or row-reverse anywhere in the marketplace tree", () => {
    const violations = [];
    const physical =
      /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/;

    for (const rel of MARKETPLACE_SOURCES.concat(["screens/common/VendorPublicProfileScreen.js"])) {
      const lines = read(rel).split("\n");
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        if (/row-reverse/.test(trimmed)) violations.push(`${rel}:${idx + 1} row-reverse`);
        if (physical.test(line)) violations.push(`${rel}:${idx + 1} ${trimmed}`);
      });
    }
    assert.deepEqual(violations, [], `physical direction leaked back:\n${violations.join("\n")}`);
  });

  it("public profile keeps LTR contact tokens isolated and backend copy adaptive", () => {
    const content = read("screens/common/VendorPublicProfileScreen.js");

    assert.ok(content.includes("AdaptiveText"), "brand/about/service names are adaptive");
    assert.ok(content.includes("isolateLtr("), "contact tokens are LTR-isolated");
    assert.ok(content.includes("DirectionalIonicon name=\"arrow-back\""), "back glyph resolves with layout direction");
    assert.ok(content.includes("priceToken(service.price"), "service prices are atomic tokens");
    assert.ok(content.includes("isolateAuto(vendor.brandName"), "inline {{name}} interpolation is isolated");

    // Blueprint §7: icon-only actions need at least a 44×44 target.
    const roundButton = content.match(/roundButton:\s*\{([^}]*)\}/);
    assert.ok(roundButton, "roundButton style exists");
    assert.ok(/width:\s*44/.test(roundButton[1]) && /height:\s*44/.test(roundButton[1]),
      "hero round buttons must be at least 44×44");

    const arabicLiterals = content.match(/[\u0600-\u06FF]{2,}/g) || [];
    assert.deepEqual(
      arabicLiterals,
      [],
      `profile screen must not embed Arabic literals: ${arabicLiterals.join(", ")}`
    );
  });

  it("new marketplace keys exist in both locales with parity", () => {
    const en = JSON.parse(read("localization/locales/en/marketplace.json"));
    const ar = JSON.parse(read("localization/locales/ar/marketplace.json"));

    for (const key of ["titleWithCount"]) {
      assert.ok(en[key], `en missing ${key}`);
      assert.ok(ar[key], `ar missing ${key}`);
    }
    for (const key of ["close"]) {
      assert.ok(en.common.actions[key], `en missing common.actions.${key}`);
      assert.ok(ar.common.actions[key], `ar missing common.actions.${key}`);
    }
    assert.ok(en.errors.generic, "en missing errors.generic");
    assert.ok(ar.errors.generic, "ar missing errors.generic");
    assert.ok(ar.titleWithCount.includes("{{count}}") && en.titleWithCount.includes("{{count}}"));
  });
});
