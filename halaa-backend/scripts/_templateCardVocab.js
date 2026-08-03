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
  invitationTitle: {
    type: "text",
    labelEn: "Invitation Title",
    labelAr: "عنوان الدعوة",
    placeholderEn: 'e.g. "Invitation"',
    placeholderAr: 'مثل: "دعوة"',
    maxLength: 30,
    dir: "rtl",
  },
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
    maxLength: 180,
    dir: "rtl",
  },

  eventNote: {
    type: "text",
    labelEn: "Event Note",
    labelAr: "عبارة المناسبة",
    placeholderEn: "e.g. We would be delighted by your presence",
    placeholderAr: "مثل: يسعدنا ويشرفنا حضوركم",
    maxLength: 90,
    dir: "rtl",
  },

  mealNote: {
    type: "text",
    labelEn: "Meal Note",
    labelAr: "عبارة الضيافة",
    placeholderEn: "e.g. Dinner will be served",
    placeholderAr: "مثل: يتبع الحفل تناول طعام العشاء",
    maxLength: 80,
    dir: "rtl",
  },

  attendanceNote: {
    type: "text",
    labelEn: "Attendance Note",
    labelAr: "ملاحظة الحضور",
    placeholderEn: "e.g. This invitation is personal",
    placeholderAr: "مثل: الدعوة شخصية",
    maxLength: 60,
    dir: "rtl",
  },

  closingMessage: {
    type: "text",
    labelEn: "Closing Message",
    labelAr: "العبارة الختامية",
    placeholderEn: "e.g. Your presence completes our joy",
    placeholderAr: "مثل: بحضوركم تكتمل فرحتنا",
    maxLength: 100,
    dir: "rtl",
  },

  openingVerse: {
    type: "text",
    labelEn: "Opening Verse",
    labelAr: "الآية",
    placeholderEn: "e.g. Quranic verse or short blessing",
    placeholderAr: "مثل: آية قرآنية أو دعاء قصير",
    maxLength: 160,
    dir: "rtl",
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
    placeholderEn: "e.g. Khalid",
    placeholderAr: "مثل: خالد",
    maxLength: 40,
    dir: "rtl",
  },

  brideName: {
    type: "text",
    labelEn: "Bride",
    labelAr: "العروس",
    placeholderEn: "e.g. Sara Al-Qahtani",
    placeholderAr: "مثل سارة القحطاني",
    maxLength: 60,
    dir: "rtl",
  },

  groomNameLatin: {
    type: "text",
    labelEn: "Groom Name (Latin)",
    labelAr: "اسم العريس بالإنجليزية",
    placeholderEn: "e.g. Khalid",
    placeholderAr: "مثال: Khalid",
    maxLength: 40,
    dir: "ltr",
  },

  brideNameLatin: {
    type: "text",
    labelEn: "Bride Name (Latin)",
    labelAr: "اسم العروس بالإنجليزية",
    placeholderEn: "e.g. Sara",
    placeholderAr: "مثال: Sara",
    maxLength: 40,
    dir: "ltr",
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

  babyInitial: {
    type: "text",
    labelEn: "Baby Initial",
    labelAr: "الحرف الأول من اسم المولود",
    placeholderEn: "e.g. H",
    placeholderAr: "مثال: H",
    minLength: 1,
    maxLength: 1,
    dir: "ltr",
    autoCapitalize: "characters",
  },

  babyNameLatin: {
    type: "text",
    labelEn: "Baby Name (Latin)",
    labelAr: "اسم المولود بالإنجليزية",
    placeholderEn: "e.g. Yara",
    placeholderAr: "مثال: Yara",
    maxLength: 40,
    dir: "ltr",
  },

  parents: {
    type: "text",
    labelEn: "Parents",
    labelAr: "الوالدان",
    placeholderEn: "e.g. Ahmad & Reem",
    placeholderAr: "مثل أحمد وريم",
    maxLength: 80,
  },

  parentsNames: {
    type: "text",
    labelEn: "Parents",
    labelAr: "اسما الوالدين",
    placeholderEn: "e.g. Ahmad & Reem",
    placeholderAr: "مثل: أحمد وريم",
    maxLength: 60,
    dir: "rtl",
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
  { code: "birthday",      nameEn: "Birthday Invitation",   nameAr: "دعوة عيد ميلاد", sortOrder: 10 },
  { code: "wedding",       nameEn: "Wedding Invitation",    nameAr: "دعوة زفاف",      sortOrder: 20 },
  { code: "baby_shower",   nameEn: "Newborn Invitation",    nameAr: "دعوة مولود",     sortOrder: 30 },
  { code: "special_event", nameEn: "Special Occasion",      nameAr: "مناسبة خاصة",     sortOrder: 40 },
  { code: "ramadan",       nameEn: "Ramadan Invitation",    nameAr: "دعوة رمضان",     sortOrder: 50 },
  { code: "graduation",    nameEn: "Graduation Invitation", nameAr: "دعوة تخرج",      sortOrder: 60 },
];

module.exports = {
  VOCAB,
  META_KEYS,
  CATEGORIES,
  field,
  styleTail,
};
