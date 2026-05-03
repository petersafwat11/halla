/**
 * Font Registry — Phase 4c W0-VISUAL-BACKEND
 *
 * Per v4.1 §A-6. Display names are NOT stored here — frontend resolves
 * them via `t('fonts.<id>.displayName')`.
 *
 * Exposed via the public `GET /api/v2/fonts` endpoint, no auth required.
 */

const FONTS = [
  {
    id: "cairo",
    webFamily: "'Cairo', sans-serif",
    mobileFamily: "Cairo",
    supportsArabic: true,
    weights: ["400", "600", "700"],
  },
  {
    id: "inter",
    webFamily: "'Inter', sans-serif",
    mobileFamily: "Inter",
    supportsArabic: false,
    weights: ["400", "500", "700"],
  },
  {
    id: "lato",
    webFamily: "'Lato', sans-serif",
    mobileFamily: "Lato",
    supportsArabic: false,
    weights: ["400", "700"],
  },
  {
    id: "amiri",
    webFamily: "'Amiri', serif",
    mobileFamily: "Amiri",
    supportsArabic: true,
    weights: ["400", "700"],
  },
  {
    id: "ibm_plex_arabic",
    webFamily: "'IBM Plex Sans Arabic', sans-serif",
    mobileFamily: "IBMPlexSansArabic",
    supportsArabic: true,
    weights: ["400", "500", "700"],
  },
  {
    id: "noto_sans_arabic",
    webFamily: "'Noto Sans Arabic', sans-serif",
    mobileFamily: "NotoSansArabic",
    supportsArabic: true,
    weights: ["400", "700"],
  },
];

const FONT_IDS = FONTS.map((f) => f.id);

module.exports = { FONTS, FONT_IDS };
