/**
 * Fonts Config — Phase 4c W1-VISUAL
 *
 * Mirrors the backend `fontRegistry.js` constant (per v4.1 §A-6,
 * [PATCH 8]). Frontend resolves display names via
 * `t('fonts.<id>.displayName')` — names live in locale files, not here.
 *
 * The default value below is a reasonable boot-time fallback. The
 * `useFonts` query (`hooks/queries/useTemplates.js`) hydrates the live
 * list from `GET /api/v2/fonts` cached for the session, so the
 * authoritative source is always the backend.
 */

export const FONTS = [
  { id: "cairo", webFamily: "'Cairo', sans-serif", supportsArabic: true, weights: ["400", "600", "700"] },
  { id: "inter", webFamily: "'Inter', sans-serif", supportsArabic: false, weights: ["400", "500", "700"] },
  { id: "lato", webFamily: "'Lato', sans-serif", supportsArabic: false, weights: ["400", "700"] },
  { id: "amiri", webFamily: "'Amiri', serif", supportsArabic: true, weights: ["400", "700"] },
  { id: "ibm_plex_arabic", webFamily: "'IBM Plex Sans Arabic', sans-serif", supportsArabic: true, weights: ["400", "500", "700"] },
  { id: "noto_sans_arabic", webFamily: "'Noto Sans Arabic', sans-serif", supportsArabic: true, weights: ["400", "700"] },
];

export const FONT_IDS = FONTS.map((f) => f.id);

export default FONTS;
