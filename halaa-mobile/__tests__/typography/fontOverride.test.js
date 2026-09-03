const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  LOADED_CAIRO_FONTS,
  getCairoFontFamily,
  normalizeCairoFamily,
  resolveTemplateFont,
  isIconFontFamily,
  resolveFontPatch,
} = require("../../utils/cairoFont");

test("Cairo font variants: exactly six weights loaded", () => {
  assert.deepEqual(LOADED_CAIRO_FONTS, [
    "Cairo_300Light",
    "Cairo_400Regular",
    "Cairo_500Medium",
    "Cairo_600SemiBold",
    "Cairo_700Bold",
    "Cairo_900Black",
  ]);
});

test("getCairoFontFamily resolves weights correctly", () => {
  assert.equal(getCairoFontFamily(undefined), "Cairo_400Regular");
  assert.equal(getCairoFontFamily(null), "Cairo_400Regular");
  assert.equal(getCairoFontFamily("300"), "Cairo_300Light");
  assert.equal(getCairoFontFamily("light"), "Cairo_300Light");
  assert.equal(getCairoFontFamily("400"), "Cairo_400Regular");
  assert.equal(getCairoFontFamily("500"), "Cairo_600SemiBold");
  assert.equal(getCairoFontFamily("medium"), "Cairo_600SemiBold");
  assert.equal(getCairoFontFamily("600"), "Cairo_600SemiBold");
  assert.equal(getCairoFontFamily("semibold"), "Cairo_600SemiBold");
  assert.equal(getCairoFontFamily("700"), "Cairo_700Bold");
  assert.equal(getCairoFontFamily("bold"), "Cairo_700Bold");
  assert.equal(getCairoFontFamily("900"), "Cairo_900Black");
});

test("normalizeCairoFamily preserves loaded variants and maps unloaded ones", () => {
  // Loaded variants pass through untouched
  assert.equal(normalizeCairoFamily("Cairo_500Medium"), "Cairo_500Medium");
  assert.equal(normalizeCairoFamily("Cairo_700Bold"), "Cairo_700Bold");
  assert.equal(normalizeCairoFamily("Cairo_300Light"), "Cairo_300Light");

  // Unloaded Cairo family extracts weight from name
  assert.equal(normalizeCairoFamily("Cairo_800ExtraBold"), "Cairo_700Bold");
  assert.equal(normalizeCairoFamily("Cairo_200ExtraLight"), "Cairo_300Light");

  // Non-Cairo family falls back to fontWeight mapping
  assert.equal(normalizeCairoFamily("Inter", "bold"), "Cairo_700Bold");
  assert.equal(normalizeCairoFamily("System", "300"), "Cairo_300Light");
});

test("isIconFontFamily correctly identifies icon fonts and exempts them", () => {
  assert.equal(isIconFontFamily("ionicons"), true);
  assert.equal(isIconFontFamily("material"), true);
  assert.equal(isIconFontFamily("FontAwesome"), true);
  assert.equal(isIconFontFamily("FontAwesome5Free-Solid"), true);
  assert.equal(isIconFontFamily("feather"), true);

  assert.equal(isIconFontFamily("Cairo_700Bold"), false);
  assert.equal(isIconFontFamily("Inter"), false);
  assert.equal(isIconFontFamily(undefined), false);
});

test("resolveFontPatch: exempts icon fonts completely", () => {
  const iconStyle = { fontFamily: "ionicons", fontSize: 24 };
  assert.equal(resolveFontPatch(iconStyle), null);
});

test("resolveFontPatch: neutralizes redundant fontWeight to prevent iOS faux-bold dot erosion (F-14)", () => {
  // Bold weight style -> maps to Cairo_700Bold and neutralizes fontWeight to "normal"
  const boldStyle = { fontWeight: "bold", fontSize: 16 };
  assert.deepEqual(resolveFontPatch(boldStyle), {
    fontFamily: "Cairo_700Bold",
    fontWeight: "normal",
  });

  // Numeric 700 style
  const weight700Style = { fontWeight: "700", color: "#2C2C2C" };
  assert.deepEqual(resolveFontPatch(weight700Style), {
    fontFamily: "Cairo_700Bold",
    fontWeight: "normal",
  });

  // Light 300 style
  const lightStyle = { fontWeight: "300" };
  assert.deepEqual(resolveFontPatch(lightStyle), {
    fontFamily: "Cairo_300Light",
    fontWeight: "normal",
  });

  // Black 900 style
  const blackStyle = { fontWeight: "900" };
  assert.deepEqual(resolveFontPatch(blackStyle), {
    fontFamily: "Cairo_900Black",
    fontWeight: "normal",
  });

  // Redundant fontWeight on an already named Cairo variant is neutralized
  const redundantStyle = { fontFamily: "Cairo_700Bold", fontWeight: "bold" };
  assert.deepEqual(resolveFontPatch(redundantStyle), {
    fontFamily: "Cairo_700Bold",
    fontWeight: "normal",
  });

  // Pure Cairo variant without redundant fontWeight needs no patch
  const pureCairoStyle = { fontFamily: "Cairo_700Bold", fontSize: 18 };
  assert.equal(resolveFontPatch(pureCairoStyle), null);

  // Default unstyled element maps to Cairo_400Regular
  assert.deepEqual(resolveFontPatch({}), {
    fontFamily: "Cairo_400Regular",
    fontWeight: "normal",
  });
});
