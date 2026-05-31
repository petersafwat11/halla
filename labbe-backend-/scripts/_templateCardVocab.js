/**
 * _templateCardVocab.js — single source of truth for every shared field
 * used across the polished template cards.
 *
 * Rules locked in TEMPLATE_CARDS_REFRESH_PLAN.md §7:
 *   - Every visible text element on a polished card maps to one key here.
 *   - Labels / placeholders / limits live in this file only.
 *   - No `defaultValue` on ANY field — hosts always type their own data.
 *     Placeholders show example values.
 *
 * Consumers (currently `seedTemplateCards.js`) reference these via
 * `f("groomName")`, `f("eventDate", { required: true })`, etc. — see
 * `field()` below.
 */

// ── shared content fields ──────────────────────────────────────────────────
//
// Each entry is the canonical definition. `field("key", { required: true })`
// at the call site adds the per-card flags (required, sortOrder-equivalent).

const VOCAB = {
  invitationHeader: {
    type: "text",
    labelEn: "Header",
    labelAr: "العنوان",
    placeholderEn: 'e.g. "دعوة"',
    placeholderAr: 'مثل "دعوة"',
    maxLength: 30,
  },

  invitationMessage: {
    type: "textarea",
    labelEn: "Invitation Message",
    labelAr: "رسالة الدعوة",
    placeholderEn: "e.g. We are honoured to invite you…",
    placeholderAr: "مثل: يتشرف بدعوتكم لحضور…",
    rows: 3,
    maxLength: 240,
  },

  openingVerse: {
    type: "text",
    labelEn: "Opening Verse",
    labelAr: "الآية",
    placeholderEn: "e.g. Quranic verse or short blessing",
    placeholderAr: "مثل: آية قرآنية أو دعاء قصير",
    maxLength: 160,
  },

  announcement: {
    type: "text",
    labelEn: "Announcement",
    labelAr: "البشارة",
    placeholderEn: 'e.g. "بشارة"',
    placeholderAr: 'مثل "بشارة"',
    maxLength: 30,
  },

  // ── people ────────────────────────────────────────────────────────────
  groomName: {
    type: "text",
    labelEn: "Groom",
    labelAr: "العريس",
    placeholderEn: "e.g. Khalid Al-Saud",
    placeholderAr: "مثل خالد آل سعود",
    maxLength: 60,
  },

  brideName: {
    type: "text",
    labelEn: "Bride",
    labelAr: "العروس",
    placeholderEn: "e.g. Sara Al-Qahtani",
    placeholderAr: "مثل سارة القحطاني",
    maxLength: 60,
  },

  brideFatherName: {
    type: "text",
    labelEn: "Bride's Father",
    labelAr: "والد العروسة",
    placeholderEn: "e.g. Mohammad bin Salman",
    placeholderAr: "مثل محمد بن سلمان",
    maxLength: 60,
  },

  hostName: {
    type: "text",
    labelEn: "Host",
    labelAr: "المضيف",
    placeholderEn: "e.g. Abu Mohammad",
    placeholderAr: "مثل أبو محمد",
    maxLength: 60,
  },

  hostessName: {
    type: "text",
    labelEn: "Hostess",
    labelAr: "المضيفة",
    placeholderEn: "e.g. Um Sara",
    placeholderAr: "مثل أم سارة",
    maxLength: 60,
  },

  celebrantName: {
    type: "text",
    labelEn: "Celebrant",
    labelAr: "صاحب المناسبة",
    placeholderEn: "e.g. Layan",
    placeholderAr: "مثل ليان",
    maxLength: 60,
  },

  babyName: {
    type: "text",
    labelEn: "Baby Name",
    labelAr: "اسم المولود",
    placeholderEn: "e.g. Hossam",
    placeholderAr: "مثل حسام",
    maxLength: 40,
  },

  parents: {
    type: "text",
    labelEn: "Parents",
    labelAr: "الوالدان",
    placeholderEn: "e.g. Ahmad & Reem",
    placeholderAr: "مثل أحمد وريم",
    maxLength: 80,
  },

  // ── event title (used by general_event / conference) ─────────────────
  eventTitle: {
    type: "text",
    labelEn: "Event Title",
    labelAr: "عنوان المناسبة",
    placeholderEn: "e.g. Eid Gathering",
    placeholderAr: "مثل تجمع العيد",
    maxLength: 80,
  },

  // ── time / place ──────────────────────────────────────────────────────
  eventDate: {
    type: "date",
    labelEn: "Date",
    labelAr: "التاريخ",
    placeholderEn: "",
    placeholderAr: "",
  },

  eventTime: {
    type: "time",
    labelEn: "Time",
    labelAr: "الوقت",
    placeholderEn: "",
    placeholderAr: "",
  },

  birthDate: {
    type: "date",
    labelEn: "Birth Date",
    labelAr: "تاريخ الولادة",
    placeholderEn: "",
    placeholderAr: "",
  },

  venue: {
    type: "text",
    labelEn: "Venue",
    labelAr: "المكان",
    placeholderEn: "e.g. Riyadh, Hilton Hall",
    placeholderAr: "مثل الرياض، قاعة هيلتون",
    maxLength: 80,
  },

  // ── numbers ──────────────────────────────────────────────────────────
  age: {
    type: "number",
    labelEn: "Age",
    labelAr: "العمر",
    placeholderEn: "e.g. 5",
    placeholderAr: "مثل 5",
    min: 1,
    max: 120,
  },

  weight: {
    type: "number",
    labelEn: "Weight (kg)",
    labelAr: "الوزن (كجم)",
    placeholderEn: "e.g. 3.4",
    placeholderAr: "مثل 3.4",
    min: 0.5,
    max: 10,
    step: 0.01,
  },

  // ── style (always last on every card, no overlay) ────────────────────
  primaryColor: {
    type: "color",
    labelEn: "Primary Colour",
    labelAr: "اللون الأساسي",
    placeholderEn: "",
    placeholderAr: "",
  },

  fontFamily: {
    type: "font",
    labelEn: "Font",
    labelAr: "الخط",
    placeholderEn: "",
    placeholderAr: "",
  },
};

const META_KEYS = new Set(["primaryColor", "fontFamily"]);

/**
 * Build a field-definition object for a template spec.
 *
 *   field("groomName", { required: true })
 *   field("invitationMessage")
 *
 * Per-card overrides allowed: required, maxLength, rows. Everything
 * else is locked to the vocab so cross-template consistency holds.
 */
function field(key, overrides = {}) {
  const base = VOCAB[key];
  if (!base) {
    throw new Error(`[vocab] unknown field key: ${key}`);
  }
  const out = { key, ...base, ...overrides };
  return out;
}

/**
 * Convenience: build the `[primaryColor, fontFamily]` tail every card
 * needs. Pass the per-card defaults explicitly — these are visual
 * defaults (not data), so they live in the spec, not the vocab.
 */
function styleTail() {
  return [field("primaryColor"), field("fontFamily")];
}

const CATEGORIES = [
  { code: "wedding",       nameEn: "Wedding",       nameAr: "زفاف",          sortOrder: 10 },
  { code: "engagement",    nameEn: "Engagement",    nameAr: "خطوبة",         sortOrder: 20 },
  { code: "birthday",      nameEn: "Birthday",      nameAr: "عيد ميلاد",     sortOrder: 30 },
  { code: "baby_shower",   nameEn: "Baby Shower",   nameAr: "استقبال مولود", sortOrder: 40 },
  { code: "ladies_event",  nameEn: "Ladies' Event", nameAr: "مناسبة نسائية", sortOrder: 50 },
  { code: "general_event", nameEn: "General Event", nameAr: "مناسبات عامة",  sortOrder: 60 },
  { code: "conference",    nameEn: "Conference",    nameAr: "مؤتمر",         sortOrder: 70 },
];

module.exports = {
  VOCAB,
  META_KEYS,
  CATEGORIES,
  field,
  styleTail,
};
