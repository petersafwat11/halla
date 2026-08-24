import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LRI,
  PDI,
  resolveStrongDirection,
  isolateLtrTokens,
} from "../src/utils/bidi.js";
import {
  countToken,
  countRatioToken,
  priceToken,
  percentToken,
} from "../src/utils/displayTokens.js";

test("resolveStrongDirection: first strong Arabic/Latin character wins", () => {
  assert.equal(resolveStrongDirection("Ali", true), "ltr");
  assert.equal(resolveStrongDirection("علي", true), "rtl");
  assert.equal(resolveStrongDirection("Halaa 2026", true), "ltr");
  assert.equal(resolveStrongDirection("حفل Halaa 2026", false), "rtl");
  assert.equal(resolveStrongDirection("🎉 party", true), "ltr");
  assert.equal(resolveStrongDirection("🥳 عرس 🎉", false), "rtl");
  // Neutral-only content falls back to the locale direction.
  assert.equal(resolveStrongDirection("", true), "rtl");
  assert.equal(resolveStrongDirection("", false), "ltr");
  assert.equal(resolveStrongDirection("123456", true), "rtl");
  assert.equal(resolveStrongDirection("!!?? 🎉", false), "ltr");
});

test("isolateLtrTokens: wraps only matching tokens, only in RTL copy", () => {
  const ar = 'أدر اشتراكك من حساب App Store أو Google Play.';
  const out = isolateLtrTokens(ar, /App Store|Google Play/g, true);
  assert.ok(out.includes(`${LRI}App Store${PDI}`));
  assert.ok(out.includes(`${LRI}Google Play${PDI}`));

  // Latin UI copy is returned untouched.
  assert.equal(
    isolateLtrTokens("Manage via App Store.", /App Store/g, false),
    "Manage via App Store."
  );
  // No match → unchanged.
  assert.equal(isolateLtrTokens("نص عربي فقط", /App Store/g, true), "نص عربي فقط");
});

test("countToken: locale digits inside an LTR isolate", () => {
  const en = countToken(5, "en");
  assert.ok(en.includes("5"));
  assert.ok(en.startsWith(LRI) && en.endsWith(PDI));

  const ar = countToken(12, "ar");
  assert.ok(ar.includes("١٢"), `arabic digits expected: ${JSON.stringify(ar)}`);
});

test("countRatioToken: used/limit is ONE stable token (blueprint screenshot 8)", () => {
  const ratio = countRatioToken(1, 1, "en");
  assert.equal(ratio, `${LRI}1 / 1${PDI}`);

  const arUnlimited = countRatioToken(3, null, "ar");
  assert.ok(arUnlimited.includes("∞"));
  assert.ok(arUnlimited.startsWith(LRI) && arUnlimited.endsWith(PDI));
});

test("priceToken: atomic amount + currency, store strings isolated verbatim", () => {
  assert.equal(priceToken(120, "SAR"), `${LRI}120 SAR${PDI}`);
  assert.equal(priceToken(0, "ر.س"), `${LRI}0 ر.س${PDI}`);
  // Native IAP store price string passes through untouched but isolated.
  assert.equal(priceToken(null, "ر.س", { priceString: "$9.99" }), `${LRI}$9.99${PDI}`);
});

test("percentToken: Arabic percent is RTL-isolated, Latin stays LTR", () => {
  const RLI = "\u2067";
  assert.equal(percentToken(15, "en"), `${LRI}15%${PDI}`);
  const ar = percentToken(15, "ar");
  assert.ok(ar.startsWith(RLI), "Arabic percent token must be RTL-isolated");
  assert.ok(ar.includes("٪"));
});
