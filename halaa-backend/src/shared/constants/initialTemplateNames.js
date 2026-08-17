/**
 * INITIAL_TEMPLATE_NAMES
 *
 * The set of canonical visual-template names that ship with a fresh
 * Halaa deployment. The seed script (`scripts/seedInitialTemplates.js`)
 * upserts a Template record per entry; admins replace the placeholder
 * artwork via the editor afterwards.
 *
 * Add entries here when a new "always-on" template should appear in
 * every environment by default.
 */

const INITIAL_TEMPLATE_NAMES = {
  CLASSIC_WEDDING: { en: "Classic Wedding", ar: "زفاف كلاسيكي", category: "wedding" },
  WEDDING_PARTY:   { en: "Wedding Party",   ar: "حفل زفاف",     category: "wedding" },
  ENGAGEMENT:      { en: "Engagement",      ar: "خطوبة",        category: "special_event" },
  GOLDEN_BIRTHDAY: { en: "Golden Birthday", ar: "عيد ميلاد ذهبي", category: "birthday" },
  BABY_SHOWER:     { en: "Baby Shower",     ar: "استقبال مولود", category: "baby_shower" },
  GENERAL:         { en: "General",         ar: "عام",           category: "special_event" },
};

module.exports = { INITIAL_TEMPLATE_NAMES };
