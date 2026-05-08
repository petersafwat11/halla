/**
 * Picks the localized variant of a bilingual field on a backend object.
 *
 * Backend bilingual fields follow the convention `<base>Ar` / `<base>En`
 * (e.g. `nameAr` / `nameEn`, `descriptionAr` / `descriptionEn`,
 * `labelAr` / `labelEn`). Use this helper at every render site so the
 * locale comparison lives in exactly one place.
 *
 * @param {object} obj — source object (plan, feature, badge, etc.)
 * @param {string} baseKey — field root, e.g. "name", "description", "label"
 * @param {string} locale — i18n language code; "ar" picks Arabic, anything else picks English
 * @param {string} [fallback=""] — returned when both variants are missing
 */
export const getLocalized = (obj, baseKey, locale, fallback = "") => {
  if (!obj || typeof obj !== "object") return fallback;
  const suffix = locale === "ar" ? "Ar" : "En";
  return obj[`${baseKey}${suffix}`] ?? fallback;
};
