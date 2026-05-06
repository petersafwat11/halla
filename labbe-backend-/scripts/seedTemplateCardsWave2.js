/**
 * seedTemplateCardsWave2.js — TEMPLATES_SEED_14_PLAN
 *
 * Sibling to seedTemplateCards.js. Idempotently:
 *   1. Ensures 2 new categories (`general_event`, `conference`) on top of
 *      the 5 created by wave 1.
 *   2. Uploads each of the 14 ASCII-renamed images in
 *      `D:/halla/template-cards/new/` to S3 and creates a polished
 *      Template document with fields, overlays, and decorations from
 *      §6 of TEMPLATES_SEED_14_PLAN.md.
 *
 * Idempotency: re-running skips templates whose `nameEn` already exists
 * (active or soft-deleted). No re-upload happens for those — we don't
 * want orphan S3 objects in staging.
 *
 * Usage:
 *   node scripts/seedTemplateCardsWave2.js              # apply
 *   node scripts/seedTemplateCardsWave2.js --dry-run    # report only
 *   node scripts/seedTemplateCardsWave2.js --verbose
 */

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const mongoose = require("mongoose");
const Template = require("../models/TemplateModel");
const TemplateCategory = require("../models/TemplateCategoryModel");
const User = require("../models/UserModel");
const service = require("../src/modules/templates/templates.service");

const DRY = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

const CARDS_DIR = path.resolve(__dirname, "..", "..", "template-cards", "new");

// ── 2 new categories ────────────────────────────────────────────────────────
const NEW_CATEGORIES = [
  { code: "general_event", nameEn: "General Event", nameAr: "مناسبات عامة", sortOrder: 60 },
  { code: "conference",    nameEn: "Conference",    nameAr: "مؤتمر",       sortOrder: 70 },
];

// ── helpers ─────────────────────────────────────────────────────────────────
const ov = (fieldKey, topPct, leftPct, widthPct, fontSizeVh, fontWeight, opts = {}) => ({
  fieldKey,
  topPct,
  leftPct,
  widthPct,
  fontSizeVh,
  fontWeight,
  textAlign: "center",
  colorBinding: opts.colorBinding || "primary",
  ...(opts.color !== undefined ? { color: opts.color } : {}),
  ...(opts.fontFamily !== undefined ? { fontFamily: opts.fontFamily } : {}),
  zIndex: opts.zIndex ?? 1,
});

const dec = (source, color, topPct, leftPct, widthPct, iconSizeVh, zIndex = 1) => ({
  type: "icon",
  source,
  color,
  topPct,
  leftPct,
  widthPct,
  iconSizeVh,
  zIndex,
});

// ── 14 template specs (per §6 of the plan) ─────────────────────────────────

// Field-set helpers — every content field listed below has a matching overlay.
// Form-only fields are forbidden by user decision (TEMPLATES_SEED_14_PLAN §4 #7).

// Wedding navy/white frame skeleton — used by #1, #2, #3, #4 (with header
// dropped on the dawah variants).
const WEDDING_FRAME_FIELDS_FULL = (defaultColor, primary = false) => [
  { key: "invitationHeader",  type: "text",     labelEn: "Header",             labelAr: "العنوان",         placeholderEn: 'e.g. "دعوة"', placeholderAr: 'مثل "دعوة"', defaultValue: "دعوة" },
  { key: "groomFamilyName",   type: "text",     labelEn: "Groom Family",       labelAr: "عائلة العريس",    placeholderEn: "e.g. Al-Saud", placeholderAr: "مثل آل سعود", required: true },
  { key: "groomName",         type: "text",     labelEn: "Groom Name",         labelAr: "اسم العريس",      placeholderEn: "optional",     placeholderAr: "اختياري" },
  { key: "eventDate",         type: "date",     labelEn: "Wedding Date",       labelAr: "تاريخ الزفاف",    required: true },
  { key: "eventTime",         type: "time",     labelEn: "Time",               labelAr: "الوقت",            required: true, defaultValue: "20:30" },
  { key: "venue",             type: "text",     labelEn: "Venue",              labelAr: "المكان",           placeholderEn: "Riyadh, Hilton Hall", placeholderAr: "الرياض، قاعة هيلتون", required: true },
  { key: "invitationMessage", type: "textarea", labelEn: "Invitation Message", labelAr: "رسالة الدعوة",    rows: 3, defaultValue: "يتشرف بدعوتكم لحضور حفل زفافه" },
  { key: "primaryColor",      type: "color",    labelEn: "Accent",             labelAr: "لون مميز",         defaultValue: defaultColor },
  { key: "fontFamily",        type: "font",     labelEn: "Font",               labelAr: "الخط",             defaultValue: "'Amiri', serif" },
];

const WEDDING_FRAME_FIELDS_NOHEADER = (defaultColor) =>
  WEDDING_FRAME_FIELDS_FULL(defaultColor).filter((f) => f.key !== "invitationHeader");

// Marriage-contract skeleton — used by #6, #7
const MARRIAGE_CONTRACT_FIELDS = (defaultColor) => [
  { key: "openingVerse",    type: "text",     labelEn: "Opening Verse",   labelAr: "الآية",              defaultValue: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا" },
  { key: "groomName",       type: "text",     labelEn: "Groom Name",      labelAr: "اسم العريس",         required: true },
  { key: "brideName",       type: "text",     labelEn: "Bride Name",      labelAr: "اسم العروسة",        required: true },
  { key: "brideFatherName", type: "text",     labelEn: "Bride's Father",  labelAr: "والد العروسة",       placeholderEn: "optional", placeholderAr: "اختياري" },
  { key: "eventDate",       type: "date",     labelEn: "Contract Date",   labelAr: "تاريخ العقد",        required: true },
  { key: "eventTime",       type: "time",     labelEn: "Time",            labelAr: "الوقت",               required: true, defaultValue: "19:30" },
  { key: "venue",           type: "text",     labelEn: "Venue",           labelAr: "المكان",              placeholderEn: "e.g. Mosque, family home", placeholderAr: "مثل: مسجد، بيت العائلة", required: true },
  { key: "primaryColor",    type: "color",    labelEn: "Accent",          labelAr: "لون مميز",            defaultValue: defaultColor },
  { key: "fontFamily",      type: "font",     labelEn: "Font",            labelAr: "الخط",                defaultValue: "'Amiri', serif" },
];

// Newborn announcement skeleton — used by #9, #10
const NEWBORN_FIELDS = (defaultColor, defaultMessage) => [
  { key: "announcement",  type: "text",     labelEn: "Announcement", labelAr: "البشارة",        defaultValue: "بشارة" },
  { key: "babyName",      type: "text",     labelEn: "Baby Name",    labelAr: "اسم المولود" },
  { key: "parents",       type: "text",     labelEn: "Parents",      labelAr: "الوالدان",       placeholderEn: "e.g. Ahmad & Reem", placeholderAr: "مثل أحمد وريم", required: true },
  { key: "birthDate",     type: "date",     labelEn: "Birth Date",   labelAr: "تاريخ الولادة" },
  { key: "weight",        type: "number",   labelEn: "Weight (kg)",  labelAr: "الوزن (كجم)",    min: 0.5, max: 10, step: 0.01 },
  { key: "guestMessage",  type: "textarea", labelEn: "Message",      labelAr: "رسالة",          rows: 2, defaultValue: defaultMessage },
  { key: "primaryColor",  type: "color",    labelEn: "Primary Colour", labelAr: "اللون",       defaultValue: defaultColor },
  { key: "fontFamily",    type: "font",     labelEn: "Font",          labelAr: "الخط",          defaultValue: "'Cairo', sans-serif" },
];

// General-event skeleton — used by #11, #12
const GENERAL_EVENT_FIELDS = (defaultColor, defaultMessage, defaultTime, defaultFont = "'Cairo', sans-serif") => [
  { key: "eventTitle",   type: "text",     labelEn: "Event Title",   labelAr: "عنوان المناسبة", placeholderEn: "e.g. Eid Gathering", placeholderAr: "مثل تجمع العيد", required: true },
  { key: "hostName",     type: "text",     labelEn: "Host",          labelAr: "المضيف",          placeholderEn: "optional", placeholderAr: "اختياري" },
  { key: "eventDate",    type: "date",     labelEn: "Date",          labelAr: "التاريخ",          required: true },
  { key: "eventTime",    type: "time",     labelEn: "Time",          labelAr: "الوقت",            required: true, defaultValue: defaultTime },
  { key: "venue",        type: "text",     labelEn: "Venue",         labelAr: "المكان",           required: true },
  { key: "guestMessage", type: "textarea", labelEn: "Message",       labelAr: "رسالة",            rows: 3, defaultValue: defaultMessage },
  { key: "primaryColor", type: "color",    labelEn: "Primary Colour", labelAr: "اللون",           defaultValue: defaultColor },
  { key: "fontFamily",   type: "font",     labelEn: "Font",          labelAr: "الخط",             defaultValue: defaultFont },
];

const TEMPLATES = [
  // ── #1 Royal Navy Wedding ──────────────────────────────────────────────
  {
    file: "wedding_navy_frame.jpg",
    nameEn: "Royal Navy Wedding",
    nameAr: "الفرح الملكي",
    categories: ["wedding"],
    sortOrder: 12,
    fields: WEDDING_FRAME_FIELDS_FULL("#e8d3a0"),
    overlays: [
      ov("invitationHeader",  14, 50, 50, 4.0, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("invitationMessage", 28, 50, 70, 2.6, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("groomFamilyName",   42, 50, 70, 6.0, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("groomName",         54, 50, 60, 4.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventDate",         66, 50, 60, 3.2, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventTime",         72, 50, 60, 2.8, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("venue",             80, 50, 80, 2.6, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkle",  "#e8d3a0", 36, 30, 4, 2.2),
      dec("Sparkle",  "#e8d3a0", 36, 70, 4, 2.2),
      dec("MoonStar", "#e8d3a0", 88, 50, 5, 3.0),
    ],
  },

  // ── #2 Pearl Frame Wedding ─────────────────────────────────────────────
  {
    file: "wedding_white_frame.jpg",
    nameEn: "Pearl Frame Wedding",
    nameAr: "فرح اللآلئ",
    categories: ["wedding"],
    sortOrder: 13,
    fields: WEDDING_FRAME_FIELDS_FULL("#1f3b5e"),
    overlays: [
      ov("invitationHeader",  14, 50, 50, 4.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("invitationMessage", 28, 50, 70, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("groomFamilyName",   42, 50, 70, 6.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("groomName",         54, 50, 60, 4.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventDate",         66, 50, 60, 3.2, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventTime",         72, 50, 60, 2.8, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",             80, 50, 80, 2.6, "400", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkle",  "#1f3b5e", 36, 30, 4, 2.2),
      dec("Sparkle",  "#1f3b5e", 36, 70, 4, 2.2),
      dec("MoonStar", "#1f3b5e", 88, 50, 5, 3.0),
    ],
  },

  // ── #3 Royal Da'wah Wedding ────────────────────────────────────────────
  {
    file: "wedding_navy_dawah.jpg",
    nameEn: "Royal Da'wah Wedding",
    nameAr: "دعوة الفرح الملكي",
    categories: ["wedding"],
    sortOrder: 14,
    fields: WEDDING_FRAME_FIELDS_NOHEADER("#e8d3a0"),
    overlays: [
      ov("invitationMessage", 26, 50, 70, 2.6, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("groomFamilyName",   40, 50, 70, 6.0, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("groomName",         52, 50, 60, 4.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventDate",         64, 50, 60, 3.2, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventTime",         70, 50, 60, 2.8, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("venue",             78, 50, 80, 2.6, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkle",  "#e8d3a0", 34, 30, 4, 2.2),
      dec("Sparkle",  "#e8d3a0", 34, 70, 4, 2.2),
      dec("MoonStar", "#e8d3a0", 86, 50, 5, 3.0),
    ],
  },

  // ── #4 Pearl Da'wah Wedding ────────────────────────────────────────────
  {
    file: "wedding_white_dawah.jpg",
    nameEn: "Pearl Da'wah Wedding",
    nameAr: "دعوة الفرح اللؤلؤية",
    categories: ["wedding"],
    sortOrder: 15,
    fields: WEDDING_FRAME_FIELDS_NOHEADER("#1f3b5e"),
    overlays: [
      ov("invitationMessage", 26, 50, 70, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("groomFamilyName",   40, 50, 70, 6.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("groomName",         52, 50, 60, 4.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventDate",         64, 50, 60, 3.2, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventTime",         70, 50, 60, 2.8, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",             78, 50, 80, 2.6, "400", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkle",  "#1f3b5e", 34, 30, 4, 2.2),
      dec("Sparkle",  "#1f3b5e", 34, 70, 4, 2.2),
      dec("MoonStar", "#1f3b5e", 86, 50, 5, 3.0),
    ],
  },

  // ── #5 Gulf Groom ──────────────────────────────────────────────────────
  {
    file: "wedding_gulf_groom.jpg",
    nameEn: "Gulf Groom",
    nameAr: "زفاف الخليج",
    categories: ["wedding"],
    sortOrder: 16,
    fields: [
      { key: "groomFamilyName",   type: "text",     labelEn: "Groom Family",       labelAr: "عائلة العريس",  placeholderEn: "e.g. Al-Zahrani", placeholderAr: "مثل الزهراني", required: true },
      { key: "groomName",         type: "text",     labelEn: "Groom Name",         labelAr: "اسم العريس",    required: true },
      { key: "eventDate",         type: "date",     labelEn: "Wedding Date",       labelAr: "تاريخ الزفاف",  required: true },
      { key: "eventTime",         type: "time",     labelEn: "Time",               labelAr: "الوقت",          required: true, defaultValue: "20:30" },
      { key: "venue",             type: "text",     labelEn: "Venue",              labelAr: "المكان",         required: true },
      { key: "invitationMessage", type: "textarea", labelEn: "Invitation Message", labelAr: "رسالة الدعوة",  rows: 2, defaultValue: "يتشرف بدعوتكم لحضور حفل زفافه" },
      { key: "primaryColor",      type: "color",    labelEn: "Accent",             labelAr: "لون مميز",       defaultValue: "#a47148" },
      { key: "fontFamily",        type: "font",     labelEn: "Font",               labelAr: "الخط",           defaultValue: "'Amiri', serif" },
    ],
    overlays: [
      ov("invitationMessage", 56, 50, 70, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("groomFamilyName",   64, 50, 70, 5.5, "700", { fontFamily: "'Amiri', serif" }),
      ov("groomName",         73, 50, 60, 4.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventDate",         80, 50, 60, 3.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventTime",         84, 50, 60, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",             88, 50, 80, 2.4, "400", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkle", "#a47148", 53, 30, 4, 2.2),
      dec("Sparkle", "#a47148", 53, 70, 4, 2.2),
    ],
  },

  // ── #6 Sacred Vows ─────────────────────────────────────────────────────
  {
    file: "marriage_contract_arch.jpg",
    nameEn: "Sacred Vows",
    nameAr: "عقد قران مبارك",
    categories: ["wedding"],
    sortOrder: 17,
    fields: MARRIAGE_CONTRACT_FIELDS("#7e6c45"),
    overlays: [
      ov("openingVerse",    14, 50, 78, 2.4, "500", { fontFamily: "'Amiri', serif" }),
      ov("groomName",       28, 50, 70, 5.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("brideName",       40, 50, 70, 5.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("brideFatherName", 50, 50, 70, 2.6, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventDate",       58, 50, 60, 3.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventTime",       64, 50, 60, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",           70, 50, 75, 2.6, "500", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("MoonStar", "#7e6c45", 22, 50, 4, 2.6),
      dec("Sparkle",  "#7e6c45", 35, 25, 3, 1.8),
      dec("Sparkle",  "#7e6c45", 35, 75, 3, 1.8),
    ],
  },

  // ── #7 Bronze Bloom Vows ───────────────────────────────────────────────
  {
    file: "marriage_contract_bronze.jpg",
    nameEn: "Bronze Bloom Vows",
    nameAr: "عقد قران الورد",
    categories: ["wedding"],
    sortOrder: 18,
    fields: MARRIAGE_CONTRACT_FIELDS("#6b4423"),
    overlays: [
      ov("openingVerse",    24, 50, 70, 2.4, "500", { fontFamily: "'Amiri', serif" }),
      ov("groomName",       36, 50, 70, 5.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("brideName",       47, 50, 70, 5.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("brideFatherName", 56, 50, 70, 2.6, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventDate",       63, 50, 60, 3.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventTime",       68, 50, 60, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",           74, 50, 75, 2.6, "500", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkle",  "#6b4423", 32, 50, 3, 2.0),
      dec("MoonStar", "#6b4423", 79, 50, 4, 2.6),
    ],
  },

  // ── #8 Pearl Promise ───────────────────────────────────────────────────
  {
    file: "engagement_pearl.jpg",
    nameEn: "Pearl Promise",
    nameAr: "خطوبة لؤلؤية",
    categories: ["engagement"],
    sortOrder: 60,
    fields: [
      { key: "brideName",         type: "text",     labelEn: "Bride Name",      labelAr: "اسم العروس",     required: true },
      { key: "brideFamilyName",   type: "text",     labelEn: "Bride Family",    labelAr: "عائلة العروس",   placeholderEn: "optional", placeholderAr: "اختياري" },
      { key: "hostessName",       type: "text",     labelEn: "Hostess",         labelAr: "المضيفة",         placeholderEn: "e.g. Um Sara", placeholderAr: "مثل أم سارة" },
      { key: "engagementDate",    type: "date",     labelEn: "Engagement Date", labelAr: "تاريخ الخطوبة",  required: true },
      { key: "engagementTime",    type: "time",     labelEn: "Time",            labelAr: "الوقت",           required: true, defaultValue: "18:30" },
      { key: "venue",             type: "text",     labelEn: "Venue",           labelAr: "المكان",          required: true },
      { key: "invitationMessage", type: "textarea", labelEn: "Invitation Message", labelAr: "رسالة الدعوة", rows: 2, defaultValue: "يسرّها مشاركتكنّ فرحة خطبتها" },
      { key: "primaryColor",      type: "color",    labelEn: "Accent",          labelAr: "لون مميز",        defaultValue: "#a08a6f" },
      { key: "fontFamily",        type: "font",     labelEn: "Font",            labelAr: "الخط",            defaultValue: "'Amiri', serif" },
    ],
    overlays: [
      ov("invitationMessage", 10, 50, 70, 2.4, "400", { fontFamily: "'Amiri', serif" }),
      ov("brideName",         20, 50, 70, 5.5, "700", { fontFamily: "'Amiri', serif" }),
      ov("brideFamilyName",   31, 50, 60, 3.2, "500", { fontFamily: "'Amiri', serif" }),
      ov("hostessName",       38, 50, 60, 2.8, "400", { fontFamily: "'Amiri', serif" }),
      ov("engagementDate",    46, 50, 60, 3.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("engagementTime",    51, 50, 60, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",             56, 50, 75, 2.4, "500", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Diamond", "#a08a6f", 16, 50, 4, 2.6),
      dec("Sparkle", "#a08a6f", 25, 28, 3, 1.8),
      dec("Sparkle", "#a08a6f", 25, 72, 3, 1.8),
    ],
  },

  // ── #9 Little Prince ───────────────────────────────────────────────────
  {
    file: "newborn_boy.jpg",
    nameEn: "Little Prince",
    nameAr: "بشارة المولود",
    categories: ["baby_shower"],
    sortOrder: 60,
    fields: NEWBORN_FIELDS("#5a7ca8", "أهلاً وسهلاً بأمير العائلة الجديد"),
    overlays: [
      ov("announcement", 18, 50, 50, 3.6, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("guestMessage", 24, 50, 70, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("babyName",     32, 50, 70, 6.0, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("parents",      42, 50, 70, 2.8, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("birthDate",    50, 50, 60, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("weight",       56, 50, 60, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("HeartPulse", "#5a7ca8", 28, 50, 4, 2.6),
      dec("Sparkle",    "#5a7ca8", 38, 28, 3, 1.8),
      dec("Sparkle",    "#5a7ca8", 38, 72, 3, 1.8),
    ],
  },

  // ── #10 Little Princess ────────────────────────────────────────────────
  {
    file: "newborn_girl.jpg",
    nameEn: "Little Princess",
    nameAr: "بشارة الأميرة",
    categories: ["baby_shower"],
    sortOrder: 61,
    fields: NEWBORN_FIELDS("#d9a4b8", "أهلاً وسهلاً بأميرة العائلة الجديدة"),
    overlays: [
      ov("announcement", 28, 50, 50, 3.4, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("guestMessage", 34, 50, 70, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("babyName",     42, 50, 70, 5.5, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("parents",      50, 50, 70, 2.6, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("birthDate",    56, 50, 60, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("weight",       60, 50, 60, 2.2, "400", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("Crown",   "#d9a4b8", 32, 50, 5, 3.0),
      dec("Sparkle", "#d9a4b8", 47, 22, 3, 1.8),
      dec("Sparkle", "#d9a4b8", 47, 78, 3, 1.8),
    ],
  },

  // ── #11 Spring Meadow ──────────────────────────────────────────────────
  {
    file: "general_spring.jpg",
    nameEn: "Spring Meadow",
    nameAr: "ربيع المناسبات",
    categories: ["general_event"],
    sortOrder: 10,
    fields: GENERAL_EVENT_FIELDS("#7c8eaa", "كل عام وأنتم بخير", "17:00"),
    overlays: [
      ov("guestMessage", 24, 50, 70, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventTitle",   32, 50, 70, 4.6, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("hostName",     41, 50, 60, 2.6, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventDate",    47, 50, 60, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventTime",    52, 50, 60, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",        56, 50, 75, 2.4, "500", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("Sparkle", "#7c8eaa", 28, 50, 4, 2.4),
    ],
  },

  // ── #12 Lantern Night ──────────────────────────────────────────────────
  {
    file: "general_lantern.jpg",
    nameEn: "Lantern Night",
    nameAr: "ليلة الفوانيس",
    categories: ["general_event"],
    sortOrder: 11,
    fields: GENERAL_EVENT_FIELDS("#a47148", "رمضان كريم — يسعدنا حضوركم", "20:00", "'Amiri', serif"),
    overlays: [
      ov("guestMessage", 30, 50, 70, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("eventTitle",   40, 50, 70, 5.0, "700", { fontFamily: "'Amiri', serif" }),
      ov("hostName",     50, 50, 60, 2.8, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventDate",    58, 50, 60, 3.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventTime",    63, 50, 60, 2.6, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",        68, 50, 75, 2.4, "500", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Stars",   "#a47148", 34, 50, 4, 2.4),
      dec("Sparkle", "#a47148", 73, 28, 3, 1.8),
      dec("Sparkle", "#a47148", 73, 72, 3, 1.8),
    ],
  },

  // ── #13 Sacred Pilgrimage ──────────────────────────────────────────────
  {
    file: "general_pilgrimage.jpg",
    nameEn: "Sacred Pilgrimage",
    nameAr: "بشارة الحج",
    categories: ["general_event"],
    sortOrder: 12,
    fields: [
      { key: "announcement", type: "text", labelEn: "Announcement", labelAr: "البشارة",         defaultValue: "بشارة الحج" },
      { key: "pilgrimName",  type: "text", labelEn: "Pilgrim",      labelAr: "الحاج",           placeholderEn: "e.g. Abu Mohammad", placeholderAr: "مثل أبو محمد", required: true },
      { key: "eventDate",    type: "date", labelEn: "Reception Date", labelAr: "تاريخ الاستقبال" },
      { key: "eventTime",    type: "time", labelEn: "Time",         labelAr: "الوقت",           defaultValue: "19:00" },
      { key: "primaryColor", type: "color", labelEn: "Primary Colour", labelAr: "اللون",        defaultValue: "#0d3a2d" },
      { key: "fontFamily",   type: "font",  labelEn: "Font",         labelAr: "الخط",            defaultValue: "'Amiri', serif" },
    ],
    overlays: [
      ov("announcement", 14, 50, 60, 4.4, "700", { fontFamily: "'Amiri', serif" }),
      ov("pilgrimName",  22, 50, 70, 4.0, "600", { fontFamily: "'Amiri', serif" }),
      ov("eventDate",    28, 50, 60, 2.4, "500", { fontFamily: "'Amiri', serif" }),
      ov("eventTime",    32, 50, 60, 2.2, "400", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkle", "#0d3a2d", 11, 30, 3, 1.6),
      dec("Sparkle", "#0d3a2d", 11, 70, 3, 1.6),
    ],
  },

  // ── #14 Visionary Conference ───────────────────────────────────────────
  {
    file: "conference.jpg",
    nameEn: "Visionary Conference",
    nameAr: "مؤتمر القادة",
    categories: ["conference"],
    sortOrder: 10,
    fields: [
      { key: "conferenceTitle", type: "text",     labelEn: "Conference Title", labelAr: "عنوان المؤتمر",   placeholderEn: "e.g. Leadership Summit", placeholderAr: "مثل مؤتمر القيادة", required: true },
      { key: "organizerName",   type: "text",     labelEn: "Organizer",        labelAr: "الجهة المنظمة",    placeholderEn: "optional", placeholderAr: "اختياري" },
      { key: "keynoteSpeaker",  type: "text",     labelEn: "Keynote Speaker",  labelAr: "المتحدث الرئيسي",  placeholderEn: "optional", placeholderAr: "اختياري" },
      { key: "eventDate",       type: "date",     labelEn: "Date",             labelAr: "التاريخ",            required: true },
      { key: "eventTime",       type: "time",     labelEn: "Time",             labelAr: "الوقت",              required: true, defaultValue: "09:00" },
      { key: "venue",           type: "text",     labelEn: "Venue",            labelAr: "المكان",             placeholderEn: "e.g. Riyadh, Faisaliah Hotel", placeholderAr: "مثل الرياض، فندق الفيصلية", required: true },
      { key: "registrationUrl", type: "text",     labelEn: "Registration URL", labelAr: "رابط التسجيل",       placeholderEn: "optional", placeholderAr: "اختياري" },
      { key: "guestMessage",    type: "textarea", labelEn: "Welcome Message",  labelAr: "رسالة الترحيب",     rows: 2, defaultValue: "نتشرف بدعوتكم لحضور المؤتمر" },
      { key: "primaryColor",    type: "color",    labelEn: "Accent",           labelAr: "لون مميز",           defaultValue: "#e8d3a0" },
      { key: "fontFamily",      type: "font",     labelEn: "Font",             labelAr: "الخط",               defaultValue: "'Cairo', sans-serif" },
    ],
    overlays: [
      ov("guestMessage",     18, 28, 50, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
      ov("conferenceTitle",  28, 28, 56, 4.6, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
      ov("keynoteSpeaker",   42, 28, 50, 2.8, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
      ov("organizerName",    48, 28, 50, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
      ov("eventDate",        58, 28, 50, 3.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
      ov("eventTime",        64, 28, 50, 2.6, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
      ov("venue",            70, 28, 56, 2.4, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
      ov("registrationUrl",  78, 28, 56, 2.0, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("Sparkle", "#e8d3a0", 22, 16, 3, 1.8),
      dec("Sparkle", "#e8d3a0", 22, 40, 3, 1.8),
      dec("Mic2",    "#e8d3a0", 38, 28, 4, 2.6),
    ],
  },
];

// ── DB connect (mirrors seedTemplateCards.js) ───────────────────────────────
async function connect() {
  let DB = process.env.DATABASE;
  if (process.env.DATABASE_PASSWORD && DB.includes("<PASSWORD>")) {
    DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
  }
  const opts = {};
  if (process.env.DATABASE_CERT_PATH) {
    opts.tls = true;
    opts.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  await mongoose.connect(DB, opts);
  console.log(`[seed-w2] mongo connected: ${mongoose.connection.host}`);
}

// ── Categories ──────────────────────────────────────────────────────────────
async function ensureCategories(actor) {
  console.log("[seed-w2] step 1 — categories");
  let created = 0;
  let kept = 0;
  for (const def of NEW_CATEGORIES) {
    const existing = await TemplateCategory.findOne({ code: def.code });
    if (existing) {
      kept++;
      if (existing.active === false) {
        if (DRY) {
          console.log(`  [dry] would re-activate category ${def.code}`);
        } else {
          existing.active = true;
          await existing.save();
          console.log(`  - re-activated category ${def.code}`);
        }
      } else if (VERBOSE) {
        console.log(`  - kept category ${def.code} (${existing._id})`);
      }
      continue;
    }
    if (DRY) {
      console.log(`  [dry] would create category ${def.code}`);
      created++;
      continue;
    }
    const doc = await TemplateCategory.create({
      ...def,
      active: true,
      createdBy: actor?._id || null,
    });
    created++;
    console.log(`  - created category ${def.code} (${doc._id})`);
  }
  console.log(`[seed-w2]   categories: ${created} created, ${kept} kept`);
}

// ── Templates ───────────────────────────────────────────────────────────────
async function ensureTemplate(spec, actor) {
  const existing = await Template.findOne({ nameEn: spec.nameEn });
  if (existing) {
    if (VERBOSE) {
      console.log(
        `  - template "${spec.nameEn}" exists (${existing._id}, active=${existing.active}, deleted=${!!existing.deletedAt}) — skipping`
      );
    } else {
      console.log(`  - template "${spec.nameEn}": kept`);
    }
    return { existing: true, doc: existing };
  }

  const filePath = path.join(CARDS_DIR, spec.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`source image not found: ${filePath}`);
  }

  // Sanity: every overlay's fieldKey must exist in fields[]; every content
  // field (i.e. not primaryColor / fontFamily) must have an overlay.
  const fieldKeys = new Set(spec.fields.map((f) => f.key));
  const overlayKeys = new Set(spec.overlays.map((o) => o.fieldKey));
  const META_KEYS = new Set(["primaryColor", "fontFamily"]);

  const orphanOverlays = [...overlayKeys].filter((k) => !fieldKeys.has(k));
  const formOnlyFields = [...fieldKeys].filter(
    (k) => !overlayKeys.has(k) && !META_KEYS.has(k)
  );
  if (orphanOverlays.length || formOnlyFields.length) {
    throw new Error(
      `[seed-w2] "${spec.nameEn}" parity check failed — orphans=${JSON.stringify(orphanOverlays)} formOnly=${JSON.stringify(formOnlyFields)}`
    );
  }

  if (DRY) {
    console.log(
      `  [dry] would upload ${spec.file} + create template "${spec.nameEn}" — fields=${spec.fields.length} overlays=${spec.overlays.length} deco=${spec.decorations.length}`
    );
    return { existing: false, doc: null };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(spec.file).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const { s3Key } = await service.handleImageUpload({
    fileBuffer,
    filename: spec.file,
    contentType,
    templateId: "seed-w2",
  });
  if (VERBOSE) console.log(`    uploaded s3Key=${s3Key}`);

  const doc = await service.createTemplate(
    {
      s3Key,
      nameEn: spec.nameEn,
      nameAr: spec.nameAr,
      categories: spec.categories,
      fields: spec.fields,
      overlays: spec.overlays,
      decorations: spec.decorations,
      sortOrder: spec.sortOrder,
      active: true,
    },
    actor
  );

  console.log(
    `  - created "${spec.nameEn}" (${doc._id}) — ${doc.naturalWidth}x${doc.naturalHeight}, ${doc.fields.length} fields, ${doc.overlays.length} overlays, ${doc.decorations.length} deco`
  );
  return { existing: false, doc };
}

async function ensureAllTemplates(actor) {
  console.log("[seed-w2] step 2 — templates");
  let created = 0;
  let kept = 0;
  for (const spec of TEMPLATES) {
    const r = await ensureTemplate(spec, actor);
    if (r.existing) kept++; else created++;
  }
  console.log(`[seed-w2]   templates: ${created} created, ${kept} kept`);
}

// ── verification ────────────────────────────────────────────────────────────
async function verify() {
  console.log("[seed-w2] step 3 — verification");
  const active = await Template.find({
    deletedAt: null,
    active: true,
    nameEn: { $in: TEMPLATES.map((t) => t.nameEn) },
  })
    .sort({ sortOrder: 1 })
    .lean();
  console.log(`[seed-w2]   active wave-2 templates: ${active.length}/14`);
  for (const t of active) {
    console.log(
      `    [${t.sortOrder}] ${t.nameEn} / ${t.nameAr} — cats=${JSON.stringify(t.categories)} ${t.naturalWidth}x${t.naturalHeight} fields=${t.fields.length} overlays=${t.overlays.length} deco=${t.decorations.length} url=${t.imageUrl ? "ok" : "MISSING"}`
    );
  }

  // Cross-check: orphan overlays
  for (const t of active) {
    const fieldKeys = new Set(t.fields.map((f) => f.key));
    const orphans = t.overlays.filter((o) => !fieldKeys.has(o.fieldKey));
    if (orphans.length) {
      console.error(
        `    !! "${t.nameEn}" has ${orphans.length} orphan overlay(s): ${orphans.map((o) => o.fieldKey).join(", ")}`
      );
    }
  }

  const categories = await TemplateCategory.find({ active: true }).sort({ sortOrder: 1 }).lean();
  console.log(`[seed-w2]   active categories: ${categories.length}`);
  for (const c of categories) {
    console.log(`    [${c.sortOrder}] ${c.code} — ${c.nameEn} / ${c.nameAr}`);
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[seed-w2] mode: ${DRY ? "DRY-RUN" : "APPLY"}`);
  if (!process.env.DATABASE) {
    console.error("[seed-w2] DATABASE env is required (load via config.env)");
    process.exit(1);
  }
  if (
    !DRY &&
    (!process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.AWS_REGION ||
      !process.env.AWS_S3_BUCKET)
  ) {
    console.error("[seed-w2] AWS_* env required for S3 uploads");
    process.exit(1);
  }

  // Sanity: source dir + every spec's file must exist on disk before we
  // touch the DB. Catches typos at startup.
  if (!fs.existsSync(CARDS_DIR)) {
    console.error(`[seed-w2] CARDS_DIR not found: ${CARDS_DIR}`);
    process.exit(1);
  }
  const missing = TEMPLATES.filter((t) => !fs.existsSync(path.join(CARDS_DIR, t.file)));
  if (missing.length) {
    console.error(`[seed-w2] missing source images: ${missing.map((t) => t.file).join(", ")}`);
    process.exit(1);
  }

  await connect();

  const actor = await User.findOne({ email: "test.superadmin@labbe.sa" }).lean();
  if (!actor) {
    console.error(
      "[seed-w2] super-admin user 'test.superadmin@labbe.sa' not found — run scripts/seedTestUsers.js first"
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`[seed-w2] actor: ${actor.email} (${actor._id})`);

  await ensureCategories(actor);
  await ensureAllTemplates(actor);
  await verify();

  await mongoose.disconnect();
  console.log("[seed-w2] done.");
}

main().catch((err) => {
  console.error("[seed-w2] FAILED:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
