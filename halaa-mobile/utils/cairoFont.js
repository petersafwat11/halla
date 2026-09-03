/**
 * Single source of truth for Cairo font resolution.
 *
 * The mobile app renders in Cairo only. App.js loads exactly the six
 * variants listed below; any other fontFamily (raw "Cairo", a non-Cairo
 * family, or an unloaded Cairo_* weight) must be normalized to one of them
 * or it silently falls back to the system font.
 *
 * Pure module — no side effects. Safe to import anywhere, including the
 * template-rendering components. The global RN Text/TextInput patch lives
 * in fontOverride.js, which imports from here.
 */

// The Cairo variants actually loaded in App.js#loadAssets. Keep in sync.
export const LOADED_CAIRO_FONTS = [
  "Cairo_300Light",
  "Cairo_400Regular",
  "Cairo_500Medium",
  "Cairo_600SemiBold",
  "Cairo_700Bold",
  "Cairo_900Black",
];

const LOADED_SET = new Set(LOADED_CAIRO_FONTS);

/**
 * Map a fontWeight (numeric string, number, or keyword) to a loaded Cairo
 * variant. By design weight 500/"medium" derives to SemiBold — the design
 * tokens use weight "500" for all title/label presets and we keep those
 * rendering at SemiBold. An explicit `fontFamily: "Cairo_500Medium"` is
 * honored separately (it passes straight through normalizeCairoFamily).
 */
export const getCairoFontFamily = (fontWeight) => {
  if (fontWeight === undefined || fontWeight === null) return "Cairo_400Regular";
  const weightStr = String(fontWeight);
  if (weightStr === "bold" || weightStr === "700") return "Cairo_700Bold";
  if (weightStr === "900") return "Cairo_900Black";
  if (
    weightStr === "600" ||
    weightStr === "500" ||
    weightStr === "semibold" ||
    weightStr === "medium"
  ) {
    return "Cairo_600SemiBold";
  }
  if (weightStr === "300" || weightStr === "light") return "Cairo_300Light";
  // Unusual numeric weights (e.g. 200, 800) — pick the closest loaded variant.
  const n = parseInt(weightStr, 10);
  if (!Number.isNaN(n)) {
    if (n >= 850) return "Cairo_900Black";
    if (n >= 650) return "Cairo_700Bold";
    if (n >= 450) return "Cairo_600SemiBold";
    if (n >= 350) return "Cairo_400Regular";
    return "Cairo_300Light";
  }
  return "Cairo_400Regular";
};

/**
 * Normalize any fontFamily to a loaded Cairo variant.
 *  - A loaded Cairo_* variant passes through untouched.
 *  - An unloaded Cairo_* variant (e.g. Cairo_800ExtraBold) maps to the
 *    closest loaded variant by the weight encoded in its name.
 *  - Anything else (raw "Cairo", "Inter", "Courier", undefined, …) derives
 *    from the supplied fontWeight.
 */
export const normalizeCairoFamily = (fontFamily, fontWeight) => {
  if (typeof fontFamily === "string" && LOADED_SET.has(fontFamily)) {
    return fontFamily;
  }
  if (typeof fontFamily === "string") {
    const m = fontFamily.match(/^Cairo_(\d{3,4})/);
    if (m) return getCairoFontFamily(m[1]);
  }
  return getCairoFontFamily(fontWeight);
};

/**
 * Resolve a template overlay's font to a loaded Cairo variant. Every
 * template font id renders in Cairo now; legacy ids (inter/lato/amiri/…)
 * are forced to Cairo so old templates keep rendering. Never returns
 * undefined.
 */
export const resolveTemplateFont = (name, fontWeight) => {
  if (name === "cairo_bold") return "Cairo_700Bold";
  return getCairoFontFamily(fontWeight);
};

export const ICON_FONT_FAMILIES = new Set([
  "anticon",
  "entypo",
  "evilicons",
  "feather",
  "FontAwesome",
  "Fontisto",
  "foundation",
  "ionicons",
  "material",
  "material-community",
  "octicons",
  "simple-line-icons",
  "zocial",
]);

export const isIconFontFamily = (fontFamily) =>
  typeof fontFamily === "string" &&
  (ICON_FONT_FAMILIES.has(fontFamily) || fontFamily.startsWith("FontAwesome"));

/**
 * Resolves font style overrides for a flattened style object.
 * F-14: The named Cairo font file is authoritative. Redundant native fontWeight is
 * neutralized to "normal" so iOS CoreText does not trigger faux-bold synthesis
 * that merges counters and erodes dots on Arabic letters.
 *
 * @param {object} flatStyle - Flattened style object
 * @returns {object|null} - Style overrides to apply, or null if style should be untouched
 */
export const resolveFontPatch = (flatStyle = {}) => {
  if (!flatStyle || isIconFontFamily(flatStyle.fontFamily)) {
    return null;
  }

  const fontFamily = normalizeCairoFamily(flatStyle.fontFamily, flatStyle.fontWeight);

  const hasRedundantWeight =
    flatStyle.fontWeight !== undefined &&
    flatStyle.fontWeight !== null &&
    flatStyle.fontWeight !== "normal";

  if (flatStyle.fontFamily === fontFamily && !hasRedundantWeight) {
    return null;
  }

  return { fontFamily, fontWeight: "normal" };
};
