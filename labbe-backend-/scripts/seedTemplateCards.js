/**
 * seedTemplateCards.js — TEMPLATE_CARDS_REFRESH_PLAN
 *
 * Single source of truth for 20 polished template cards:
 *   - 16 mapped from `labbe/public/template-cards/{1..16}.png` to source
 *     backgrounds in `template-cards/*.jpg`.
 *   - 4 borrowed-layout cards for backgrounds with no polished mockup
 *     (wedding_navy_frame, wedding_white_frame, general_pilgrimage,
 *     conference) — reuse field set + overlay placements from a
 *     same-category polished sibling.
 *
 * Field labels / placeholders / limits come from `_templateCardVocab.js`
 * so every card uses the same vocabulary. No `defaultValue` on any
 * field — hosts always type their own data.
 *
 * The script:
 *   1. Aspect-ratio guard: every source JPG must share W/H ratio
 *      (within 1%) with its polished PNG reference. Hard-fail if not.
 *   2. Soft-deletes every legacy template by `nameEn` (old Wave-1
 *      and Wave-2 specs).
 *   3. Ensures the 7 categories from vocab.
 *   4. Uploads each source image to S3 and creates the polished
 *      Template document.
 *
 * Idempotent: re-running skips templates whose `nameEn` already
 * exists. To re-seed with new positions, soft-delete the existing
 * row in the admin UI (or via Mongo) first.
 *
 * Usage:
 *   node scripts/seedTemplateCards.js              # apply
 *   node scripts/seedTemplateCards.js --dry-run    # report only
 *   node scripts/seedTemplateCards.js --verbose
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

const { CATEGORIES, META_KEYS, field, styleTail } = require("./_templateCardVocab");

let sharp = null;
try {
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

const DRY = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

const CARDS_DIR = path.resolve(__dirname, "..", "..", "template-cards");
const POLISHED_DIR = path.resolve(__dirname, "..", "..", "labbe", "public", "template-cards");

// ── helpers ────────────────────────────────────────────────────────────────
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

// Clock + MapPin + CalendarDays trio — appears on most cards under the
// big name(s). topPct is the row centre; left percentages match the
// usual three-icon spacing on the polished mockups.
const metaRow = (color, topPct, opts = {}) => {
  const sz = opts.iconSize ?? 2.4;
  const w = opts.iconWidth ?? 3.5;
  return [
    dec("Clock",        color, topPct, 28, w, sz),
    dec("MapPin",       color, topPct, 50, w, sz),
    dec("CalendarDays", color, topPct, 72, w, sz),
  ];
};

// ── 20 template specs ──────────────────────────────────────────────────────
//
// Spec shape:
//   { file, polished, nameEn, nameAr, categories, sortOrder,
//     fields: [...], overlays: [...], decorations: [...] }
//
// `polished` is the PNG used for the aspect-ratio guard. It does NOT
// get uploaded — only `file` (the source JPG) goes to S3.
//
// On dark-background cards, overlays use colorBinding="custom" with a
// hardcoded readable hex so a host's chosen primaryColor can't render
// invisibly on the bg. On light-background cards, colorBinding stays
// "primary" so the host's accent colour drives the text.
//
// Overlay percentages were measured from the polished PNGs. Expect to
// nudge them in the admin editor after the first seed pass.

const AMIRI = "'Amiri', serif";
const CAIRO = "'Cairo', sans-serif";
const REEM = "'Reem Kufi', sans-serif";

// Shared field sets ────────────────────────────────────────────────────────

// Da'wah-style wedding (cards #2, #3, navy_frame, white_frame): groom-side
// father invites guests to his son's wedding. Header badge + verse +
// invitation message + host (father) + groom + date/time/venue.
const DAWAH_FIELDS = () => [
  field("invitationHeader"),
  field("openingVerse"),
  field("invitationMessage"),
  field("hostName"),
  field("groomName", { required: true }),
  field("eventDate", { required: true }),
  field("eventTime", { required: true }),
  field("venue", { required: true }),
  ...styleTail(),
];

// Couple-name wedding card (#5, #6, #7, #8): both names side by side.
const COUPLE_WEDDING_FIELDS = () => [
  field("invitationHeader"),
  field("openingVerse"),
  field("invitationMessage"),
  field("groomName", { required: true }),
  field("brideName", { required: true }),
  field("eventDate", { required: true }),
  field("eventTime", { required: true }),
  field("venue", { required: true }),
  ...styleTail(),
];

const TEMPLATES = [
  // ── #1 Royal Groom (Dark) ──────────────────────────────────────────────
  {
    file: "marriage.jpg",
    polished: "1.png",
    nameEn: "Royal Groom",
    nameAr: "زفاف ملكي",
    categories: ["wedding"],
    sortOrder: 10,
    fields: [
      field("invitationHeader"),
      field("invitationMessage"),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      field("eventDate", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationHeader",  34, 50, 40, 6.0, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("invitationMessage", 50, 50, 70, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("eventTime",         70, 28, 18, 2.4, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("venue",             70, 50, 22, 2.4, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("eventDate",         70, 72, 18, 2.4, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
    ],
    decorations: metaRow("#e8d3a0", 66),
  },

  // ── #2 Pearl Da'wah Wedding ────────────────────────────────────────────
  {
    file: "wedding_white_dawah.jpg",
    polished: "2.png",
    nameEn: "Pearl Da'wah Wedding",
    nameAr: "دعوة زفاف لؤلؤية",
    categories: ["wedding"],
    sortOrder: 20,
    fields: DAWAH_FIELDS(),
    overlays: [
      ov("openingVerse",      22, 50, 75, 3.2, "700", { fontFamily: AMIRI }),
      ov("invitationMessage", 32, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("hostName",          44, 50, 60, 3.2, "600", { fontFamily: AMIRI }),
      ov("invitationHeader",  50, 50, 60, 2.2, "400", { fontFamily: AMIRI }),
      ov("groomName",         60, 50, 70, 6.5, "700", { fontFamily: AMIRI }),
      ov("eventTime",         84, 28, 18, 2.0, "500", { fontFamily: AMIRI }),
      ov("venue",             84, 50, 22, 2.0, "500", { fontFamily: AMIRI }),
      ov("eventDate",         84, 72, 18, 2.0, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#1f3b5e", 80),
  },

  // ── #3 Royal Da'wah Wedding ────────────────────────────────────────────
  {
    file: "wedding_navy_dawah.jpg",
    polished: "3.png",
    nameEn: "Royal Da'wah Wedding",
    nameAr: "دعوة الفرح الملكي",
    categories: ["wedding"],
    sortOrder: 21,
    fields: DAWAH_FIELDS(),
    overlays: [
      ov("openingVerse",      22, 50, 75, 3.2, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("invitationMessage", 32, 50, 70, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("hostName",          44, 50, 60, 3.2, "600", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("invitationHeader",  50, 50, 60, 2.2, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("groomName",         60, 50, 70, 6.5, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("eventTime",         84, 28, 18, 2.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("venue",             84, 50, 22, 2.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("eventDate",         84, 72, 18, 2.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
    ],
    decorations: metaRow("#e8d3a0", 80),
  },

  // ── #4 Gulf Groom ──────────────────────────────────────────────────────
  {
    file: "wedding_gulf_groom.jpg",
    polished: "4.png",
    nameEn: "Gulf Groom",
    nameAr: "زفاف الخليج",
    categories: ["wedding"],
    sortOrder: 22,
    fields: [
      field("invitationHeader"),
      field("invitationMessage"),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      field("hostName", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationHeader",  44, 50, 40, 5.5, "700", { fontFamily: AMIRI }),
      ov("invitationMessage", 56, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("eventTime",         70, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             70, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         70, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("hostName",          84, 50, 70, 3.0, "600", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#a47148", 66),
  },

  // ── #5 Rose Garden Wedding ─────────────────────────────────────────────
  {
    file: "blessed_births.jpg",
    polished: "5.png",
    nameEn: "Rose Garden Wedding",
    nameAr: "زفاف الورد",
    categories: ["wedding"],
    sortOrder: 23,
    fields: COUPLE_WEDDING_FIELDS(),
    overlays: [
      ov("openingVerse",      14, 50, 70, 2.6, "500", { fontFamily: AMIRI }),
      ov("invitationMessage", 24, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("invitationHeader",  32, 50, 50, 2.2, "400", { fontFamily: AMIRI }),
      ov("groomName",         42, 35, 28, 6.5, "700", { fontFamily: AMIRI }),
      ov("brideName",         42, 65, 28, 6.5, "700", { fontFamily: AMIRI }),
      ov("eventTime",         62, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             62, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         62, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#c97a86", 58),
  },

  // ── #6 Burgundy Bloom Wedding (DUAL CATEGORY: wedding + ladies_event) ──
  {
    file: "woman_invitation.jpg",
    polished: "6.png",
    nameEn: "Burgundy Bloom Wedding",
    nameAr: "زفاف الورد الأرجواني",
    categories: ["wedding", "ladies_event"],
    sortOrder: 24,
    fields: COUPLE_WEDDING_FIELDS(),
    overlays: [
      ov("invitationHeader",  8,  50, 40, 3.4, "700", { fontFamily: AMIRI }),
      ov("openingVerse",      16, 50, 75, 2.6, "500", { fontFamily: AMIRI }),
      ov("invitationMessage", 26, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("groomName",         42, 35, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("brideName",         42, 65, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("eventTime",         58, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             58, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         58, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#8b2243", 54),
  },

  // ── #7 Floral Arch Wedding ─────────────────────────────────────────────
  {
    file: "marriage2.jpg",
    polished: "7.png",
    nameEn: "Floral Arch Wedding",
    nameAr: "قوس الزهور",
    categories: ["wedding"],
    sortOrder: 25,
    fields: COUPLE_WEDDING_FIELDS(),
    overlays: [
      ov("invitationHeader",  10, 50, 40, 3.4, "700", { fontFamily: AMIRI }),
      ov("openingVerse",      18, 50, 70, 2.4, "500", { fontFamily: AMIRI }),
      ov("invitationMessage", 26, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("groomName",         38, 35, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("brideName",         38, 65, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("eventTime",         62, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             62, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         62, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#b8a48a", 58),
  },

  // ── #8 Candle Engagement ───────────────────────────────────────────────
  {
    file: "engament.jpg",
    polished: "8.png",
    nameEn: "Candle Engagement",
    nameAr: "خطوبة الشموع",
    categories: ["wedding", "engagement"],
    sortOrder: 30,
    fields: COUPLE_WEDDING_FIELDS(),
    overlays: [
      ov("invitationHeader",  8,  50, 40, 3.0, "700", { fontFamily: AMIRI }),
      ov("openingVerse",      15, 50, 75, 2.4, "500", { fontFamily: AMIRI }),
      ov("invitationMessage", 24, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("groomName",         34, 35, 28, 5.5, "700", { fontFamily: AMIRI }),
      ov("brideName",         34, 65, 28, 5.5, "700", { fontFamily: AMIRI }),
      ov("eventTime",         50, 28, 18, 2.0, "500", { fontFamily: AMIRI }),
      ov("venue",             50, 50, 22, 2.0, "500", { fontFamily: AMIRI }),
      ov("eventDate",         50, 72, 18, 2.0, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#c97a86", 46),
  },

  // ── #9 Sacred Vows (marriage contract) ─────────────────────────────────
  {
    file: "marriage_contract_arch.jpg",
    polished: "9.png",
    nameEn: "Sacred Vows",
    nameAr: "عقد قران مبارك",
    categories: ["wedding"],
    sortOrder: 26,
    fields: [
      field("invitationHeader"),
      field("openingVerse"),
      field("invitationMessage"),
      field("groomName", { required: true }),
      field("brideName", { required: true }),
      field("brideFatherName"),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationHeader",  8,  50, 40, 3.4, "700", { fontFamily: AMIRI }),
      ov("openingVerse",      18, 50, 75, 2.4, "500", { fontFamily: AMIRI }),
      ov("invitationMessage", 26, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("groomName",         36, 35, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("brideName",         36, 65, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("brideFatherName",   46, 50, 60, 2.4, "500", { fontFamily: AMIRI }),
      ov("eventTime",         58, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             58, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         58, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#9c7d4d", 54),
  },

  // ── #10 Eid Al-Adha ────────────────────────────────────────────────────
  {
    file: "general_spring.jpg",
    polished: "10.png",
    nameEn: "Eid Al-Adha",
    nameAr: "عيد الأضحى",
    categories: ["general_event"],
    sortOrder: 40,
    fields: [
      field("invitationMessage"),
      field("eventTitle", { required: true }),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationMessage", 14, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("eventTitle",        30, 50, 60, 5.5, "700", { fontFamily: AMIRI }),
      ov("eventTime",         44, 28, 18, 2.0, "500", { fontFamily: AMIRI }),
      ov("venue",             44, 50, 22, 2.0, "500", { fontFamily: AMIRI }),
      ov("eventDate",         44, 72, 18, 2.0, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#7a8b6b", 40),
  },

  // ── #11 Ramadan Iftar ──────────────────────────────────────────────────
  {
    file: "general_lantern.jpg",
    polished: "11.png",
    nameEn: "Ramadan Iftar",
    nameAr: "سفرة إفطار رمضان",
    categories: ["general_event"],
    sortOrder: 41,
    fields: [
      field("invitationMessage"),
      field("eventTitle", { required: true }),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationMessage", 24, 50, 70, 2.6, "400", { fontFamily: AMIRI }),
      ov("eventTitle",        40, 50, 70, 5.5, "700", { fontFamily: AMIRI }),
      ov("eventTime",         56, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             56, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         56, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#a47148", 52),
  },

  // ── #12 Birthday Party ─────────────────────────────────────────────────
  {
    file: "birthday.jpg",
    polished: "12.png",
    nameEn: "Birthday Party",
    nameAr: "حفلة عيد ميلاد",
    categories: ["birthday"],
    sortOrder: 50,
    fields: [
      field("invitationMessage"),
      field("celebrantName", { required: true }),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationMessage", 14, 50, 70, 2.4, "400", { fontFamily: CAIRO }),
      ov("celebrantName",     30, 50, 70, 6.0, "700", { fontFamily: CAIRO }),
      ov("eventTime",         48, 28, 18, 2.2, "500", { fontFamily: CAIRO }),
      ov("venue",             48, 50, 22, 2.2, "500", { fontFamily: CAIRO }),
      ov("eventDate",         48, 72, 18, 2.2, "500", { fontFamily: CAIRO }),
    ],
    decorations: metaRow("#e0588a", 44),
  },

  // ── #13 Newborn Boy ────────────────────────────────────────────────────
  {
    file: "newborn_boy.jpg",
    polished: "13.png",
    nameEn: "Newborn Boy",
    nameAr: "بشارة المولود",
    categories: ["baby_shower"],
    sortOrder: 60,
    fields: [
      field("announcement"),
      field("invitationMessage"),
      field("babyName", { required: true }),
      field("parents"),
      field("birthDate"),
      ...styleTail(),
    ],
    overlays: [
      ov("announcement",      22, 50, 40, 3.6, "700", { fontFamily: AMIRI }),
      ov("invitationMessage", 14, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("babyName",          32, 50, 70, 7.0, "700", { fontFamily: AMIRI }),
      ov("parents",           48, 50, 60, 2.6, "500", { fontFamily: AMIRI }),
      ov("birthDate",         54, 50, 50, 2.2, "400", { fontFamily: AMIRI }),
    ],
    decorations: [],
  },

  // ── #14 Newborn Girl ───────────────────────────────────────────────────
  {
    file: "newborn_girl.jpg",
    polished: "14.jpg",
    nameEn: "Newborn Girl",
    nameAr: "بشارة الأميرة",
    categories: ["baby_shower"],
    sortOrder: 61,
    fields: [
      field("invitationMessage"),
      field("babyName", { required: true }),
      field("parents"),
      field("birthDate"),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationMessage", 22, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("babyName",          36, 50, 70, 6.5, "700", { fontFamily: AMIRI }),
      ov("parents",           48, 50, 60, 2.6, "500", { fontFamily: AMIRI }),
      ov("birthDate",         54, 50, 50, 2.2, "400", { fontFamily: AMIRI }),
    ],
    decorations: [],
  },

  // ── #15 Graduation Celebration ─────────────────────────────────────────
  {
    file: "marriage_contract_bronze.jpg",
    polished: "15.png",
    nameEn: "Graduation Celebration",
    nameAr: "حفل تخرج",
    categories: ["general_event"],
    sortOrder: 42,
    fields: [
      field("invitationMessage"),
      field("celebrantName", { required: true }),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationMessage", 22, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("celebrantName",     34, 50, 70, 6.0, "700", { fontFamily: AMIRI }),
      ov("eventTime",         50, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             50, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         50, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#a02828", 46),
  },

  // ── #16 Pearl Promise (engagement) ─────────────────────────────────────
  {
    file: "engagement_pearl.jpg",
    polished: "16.png",
    nameEn: "Pearl Promise",
    nameAr: "وعد لؤلؤي",
    categories: ["engagement"],
    sortOrder: 31,
    fields: [
      field("invitationHeader"),
      field("invitationMessage"),
      field("groomName", { required: true }),
      field("brideName", { required: true }),
      field("openingVerse"),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationHeader",  10, 50, 30, 4.0, "700", { fontFamily: AMIRI }),
      ov("invitationMessage", 22, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("groomName",         38, 35, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("brideName",         38, 65, 28, 6.0, "700", { fontFamily: AMIRI }),
      ov("openingVerse",      52, 50, 75, 2.4, "500", { fontFamily: AMIRI }),
    ],
    decorations: [],
  },

  // ── BORROWED-LAYOUT CARDS (no polished mockup; layout reused) ─────────
  // ── B1 Navy Frame Wedding (borrows #3 Royal Da'wah) ────────────────────
  {
    file: "wedding_navy_frame.jpg",
    polished: null, // no polished mockup
    nameEn: "Navy Frame Wedding",
    nameAr: "فرح الإطار الكحلي",
    categories: ["wedding"],
    sortOrder: 27,
    fields: DAWAH_FIELDS(),
    overlays: [
      ov("openingVerse",      22, 50, 75, 3.2, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("invitationMessage", 32, 50, 70, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("hostName",          44, 50, 60, 3.2, "600", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("invitationHeader",  50, 50, 60, 2.2, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("groomName",         60, 50, 70, 6.5, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("eventTime",         84, 28, 18, 2.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("venue",             84, 50, 22, 2.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
      ov("eventDate",         84, 72, 18, 2.0, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: AMIRI }),
    ],
    decorations: metaRow("#e8d3a0", 80),
  },

  // ── B2 White Frame Wedding (borrows #2 Pearl Da'wah) ───────────────────
  {
    file: "wedding_white_frame.jpg",
    polished: null,
    nameEn: "White Frame Wedding",
    nameAr: "فرح الإطار اللؤلؤي",
    categories: ["wedding"],
    sortOrder: 28,
    fields: DAWAH_FIELDS(),
    overlays: [
      ov("openingVerse",      22, 50, 75, 3.2, "700", { fontFamily: AMIRI }),
      ov("invitationMessage", 32, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("hostName",          44, 50, 60, 3.2, "600", { fontFamily: AMIRI }),
      ov("invitationHeader",  50, 50, 60, 2.2, "400", { fontFamily: AMIRI }),
      ov("groomName",         60, 50, 70, 6.5, "700", { fontFamily: AMIRI }),
      ov("eventTime",         84, 28, 18, 2.0, "500", { fontFamily: AMIRI }),
      ov("venue",             84, 50, 22, 2.0, "500", { fontFamily: AMIRI }),
      ov("eventDate",         84, 72, 18, 2.0, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#1f3b5e", 80),
  },

  // ── B3 Sacred Pilgrimage (borrows #11 Ramadan Iftar) ───────────────────
  {
    file: "general_pilgrimage.jpg",
    polished: null,
    nameEn: "Sacred Pilgrimage",
    nameAr: "بشارة الحج",
    categories: ["general_event"],
    sortOrder: 43,
    fields: [
      field("announcement"),
      field("invitationMessage"),
      field("eventTitle"),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("announcement",      14, 50, 50, 4.4, "700", { fontFamily: AMIRI }),
      ov("invitationMessage", 24, 50, 70, 2.4, "400", { fontFamily: AMIRI }),
      ov("eventTitle",        38, 50, 70, 5.0, "700", { fontFamily: AMIRI }),
      ov("eventTime",         56, 28, 18, 2.2, "500", { fontFamily: AMIRI }),
      ov("venue",             56, 50, 22, 2.2, "500", { fontFamily: AMIRI }),
      ov("eventDate",         56, 72, 18, 2.2, "500", { fontFamily: AMIRI }),
    ],
    decorations: metaRow("#0d3a2d", 52),
  },

  // ── B4 Visionary Conference (borrows #1 Royal Groom dark layout) ───────
  {
    file: "conference.jpg",
    polished: null,
    nameEn: "Visionary Conference",
    nameAr: "مؤتمر القادة",
    categories: ["conference"],
    sortOrder: 70,
    fields: [
      field("invitationHeader"),
      field("eventTitle", { required: true }),
      field("invitationMessage"),
      field("hostName"),
      field("eventDate", { required: true }),
      field("eventTime", { required: true }),
      field("venue", { required: true }),
      ...styleTail(),
    ],
    overlays: [
      ov("invitationHeader",  18, 28, 40, 3.6, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: CAIRO }),
      ov("eventTitle",        28, 28, 56, 5.0, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: CAIRO }),
      ov("invitationMessage", 42, 28, 50, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: CAIRO }),
      ov("hostName",          52, 28, 50, 2.8, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: CAIRO }),
      ov("eventTime",         70, 14, 16, 2.2, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: CAIRO }),
      ov("venue",             70, 34, 22, 2.2, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: CAIRO }),
      ov("eventDate",         70, 56, 16, 2.2, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: CAIRO }),
    ],
    decorations: [
      dec("Clock",        "#e8d3a0", 66, 14, 3.5, 2.2),
      dec("MapPin",       "#e8d3a0", 66, 34, 3.5, 2.2),
      dec("CalendarDays", "#e8d3a0", 66, 56, 3.5, 2.2),
    ],
  },
];

// ── Legacy template names to soft-delete on every run ──────────────────────
//
// Old Wave-1 + Wave-2 + the original junk row names. Anything still in
// the DB by these names gets soft-deleted before new templates land.
const LEGACY_TEMPLATE_NAMES = [
  // wave 1 (pre-refresh)
  "Royal Wedding",
  "Garden Wedding",
  "Pure Promise",
  "Sweet Celebration",
  "Blessed Newborn",
  "Ladies' Gathering",
  // wave 2 (pre-refresh)
  "Royal Navy Wedding",
  "Pearl Frame Wedding",
  "Royal Da'wah Wedding",
  "Pearl Da'wah Wedding",
  "Gulf Groom",
  "Sacred Vows",
  "Bronze Bloom Vows",
  "Pearl Promise",
  "Little Prince",
  "Little Princess",
  "Spring Meadow",
  "Lantern Night",
  "Sacred Pilgrimage",
  "Visionary Conference",
  // junk
  "hi",
  "testing categories",
  "Playwright Test Template",
];

const JUNK_CATEGORY_CODE = "hhhh";

// ── parity check: every overlay's fieldKey exists, every content field has overlay
function parityCheck(spec) {
  const fieldKeys = new Set(spec.fields.map((f) => f.key));
  const overlayKeys = new Set(spec.overlays.map((o) => o.fieldKey));

  const orphanOverlays = [...overlayKeys].filter((k) => !fieldKeys.has(k));
  const formOnly = [...fieldKeys].filter(
    (k) => !overlayKeys.has(k) && !META_KEYS.has(k)
  );
  if (orphanOverlays.length || formOnly.length) {
    throw new Error(
      `[seed] "${spec.nameEn}" parity check failed — orphanOverlays=${JSON.stringify(orphanOverlays)} formOnly=${JSON.stringify(formOnly)}`
    );
  }
}

// ── aspect-ratio guard ─────────────────────────────────────────────────────
//
// Polished PNG and source JPG must share W/H ratio so overlays measured
// from the polished design land at the same percentages on the source.
// Tolerance: 1%. Skip cards whose `polished` is null (borrowed layouts).
async function assertAspectRatios() {
  if (!sharp) {
    console.warn("[seed] sharp not installed — skipping aspect-ratio guard");
    return;
  }
  console.log("[seed] step 0 — aspect-ratio guard");
  const mismatches = [];
  for (const spec of TEMPLATES) {
    if (!spec.polished) {
      if (VERBOSE) console.log(`  - ${spec.nameEn}: borrowed layout, no polished ref`);
      continue;
    }
    const srcPath = path.join(CARDS_DIR, spec.file);
    const polPath = path.join(POLISHED_DIR, spec.polished);
    if (!fs.existsSync(srcPath)) {
      mismatches.push(`${spec.nameEn}: source missing — ${srcPath}`);
      continue;
    }
    if (!fs.existsSync(polPath)) {
      mismatches.push(`${spec.nameEn}: polished missing — ${polPath}`);
      continue;
    }
    const [src, pol] = await Promise.all([
      sharp(srcPath).metadata(),
      sharp(polPath).metadata(),
    ]);
    const srcRatio = src.width / src.height;
    const polRatio = pol.width / pol.height;
    const diff = Math.abs(srcRatio - polRatio) / polRatio;
    if (diff > 0.01) {
      mismatches.push(
        `${spec.nameEn}: ratio mismatch — src ${src.width}x${src.height} (${srcRatio.toFixed(3)}) vs polished ${pol.width}x${pol.height} (${polRatio.toFixed(3)}), diff=${(diff * 100).toFixed(1)}%`
      );
    } else if (VERBOSE) {
      console.log(
        `  - ${spec.nameEn}: ratio OK (${srcRatio.toFixed(3)} vs ${polRatio.toFixed(3)})`
      );
    }
  }
  if (mismatches.length) {
    console.error("[seed] aspect-ratio mismatches:");
    mismatches.forEach((m) => console.error(`  !! ${m}`));
    console.error(
      "[seed] overlays measured on the polished PNG will not land in the right spot on the source JPG."
    );
    console.error("[seed] options: re-export the polished PNG at the source ratio, or re-crop the source.");
    throw new Error("aspect-ratio guard failed");
  }
  console.log(`[seed]   ratios OK for ${TEMPLATES.filter((t) => t.polished).length} polished cards`);
}

// ── DB connect (mirrors seedTestUsers.js) ──────────────────────────────────
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
  console.log(`[seed] mongo connected: ${mongoose.connection.host}`);
}

// ── 1. Soft-clean legacy templates and junk category ───────────────────────
//
// Every legacy row gets soft-deleted unconditionally — even names that
// match a current spec (e.g. "Royal Da'wah Wedding"). The new row is
// then created from scratch with the polished field set and overlay
// positions. `nameEn` has no unique constraint, so a soft-deleted +
// live pair coexists fine.
async function cleanupLegacy() {
  console.log("[seed] step 1 — legacy cleanup");

  for (const name of LEGACY_TEMPLATE_NAMES) {
    const t = await Template.findOne({ nameEn: name, deletedAt: null });
    if (!t) {
      if (VERBOSE) console.log(`  - "${name}": not found`);
      continue;
    }
    if (t.deletedAt) {
      if (VERBOSE) console.log(`  - "${name}" (${t._id}): already soft-deleted`);
      continue;
    }
    if (DRY) {
      console.log(`  [dry] would soft-delete "${name}" (${t._id})`);
    } else {
      t.deletedAt = new Date();
      t.active = false;
      await t.save();
      console.log(`  - soft-deleted "${name}" (${t._id})`);
    }
  }

  const cat = await TemplateCategory.findOne({ code: JUNK_CATEGORY_CODE });
  if (cat && cat.active !== false) {
    if (DRY) {
      console.log(`  [dry] would deactivate junk category "${JUNK_CATEGORY_CODE}"`);
    } else {
      cat.active = false;
      await cat.save();
      console.log(`  - deactivated junk category "${JUNK_CATEGORY_CODE}"`);
    }
  }
}

// ── 2. Categories ──────────────────────────────────────────────────────────
async function ensureCategories(actor) {
  console.log("[seed] step 2 — categories");
  let created = 0;
  let kept = 0;
  for (const def of CATEGORIES) {
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
  console.log(`[seed]   categories: ${created} created, ${kept} kept`);
}

// ── 3. Templates ───────────────────────────────────────────────────────────
async function ensureTemplate(spec, actor) {
  parityCheck(spec);

  const existing = await Template.findOne({ nameEn: spec.nameEn });
  if (existing && !existing.deletedAt) {
    if (VERBOSE) {
      console.log(`  - "${spec.nameEn}" exists (${existing._id}, active=${existing.active}) — skipping`);
    } else {
      console.log(`  - "${spec.nameEn}": kept`);
    }
    return { existing: true, doc: existing };
  }

  const filePath = path.join(CARDS_DIR, spec.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`source image not found: ${filePath}`);
  }

  if (DRY) {
    console.log(
      `  [dry] would create "${spec.nameEn}" — file=${spec.file}, cats=${JSON.stringify(spec.categories)}, fields=${spec.fields.length}, overlays=${spec.overlays.length}, deco=${spec.decorations.length}`
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
    templateId: "seed",
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
    `  - created "${spec.nameEn}" (${doc._id}) — ${doc.naturalWidth}x${doc.naturalHeight}, fields=${doc.fields.length}, overlays=${doc.overlays.length}, deco=${doc.decorations.length}`
  );
  return { existing: false, doc };
}

async function ensureAllTemplates(actor) {
  console.log(`[seed] step 3 — templates (${TEMPLATES.length})`);
  let created = 0;
  let kept = 0;
  for (const spec of TEMPLATES) {
    const r = await ensureTemplate(spec, actor);
    if (r.existing) kept++; else created++;
  }
  console.log(`[seed]   templates: ${created} created, ${kept} kept`);
}

// ── verification ───────────────────────────────────────────────────────────
async function verify() {
  console.log("[seed] step 4 — verification");
  const active = await Template.find({
    deletedAt: null,
    active: true,
    nameEn: { $in: TEMPLATES.map((t) => t.nameEn) },
  })
    .sort({ sortOrder: 1 })
    .lean();
  console.log(`[seed]   active seeded templates: ${active.length}/${TEMPLATES.length}`);

  for (const t of active) {
    console.log(
      `    [${t.sortOrder}] ${t.nameEn} / ${t.nameAr} — cats=${JSON.stringify(t.categories)} ${t.naturalWidth}x${t.naturalHeight} fields=${t.fields.length} overlays=${t.overlays.length} deco=${t.decorations.length}`
    );
    const fieldKeys = new Set(t.fields.map((f) => f.key));
    const orphans = t.overlays.filter((o) => !fieldKeys.has(o.fieldKey));
    if (orphans.length) {
      console.error(`    !! orphan overlays: ${orphans.map((o) => o.fieldKey).join(", ")}`);
    }
  }

  const categories = await TemplateCategory.find({ active: true }).sort({ sortOrder: 1 }).lean();
  console.log(`[seed]   active categories: ${categories.length}`);
  for (const c of categories) {
    console.log(`    [${c.sortOrder}] ${c.code} — ${c.nameEn} / ${c.nameAr}`);
  }
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[seed] mode: ${DRY ? "DRY-RUN" : "APPLY"}`);
  if (!process.env.DATABASE) {
    console.error("[seed] DATABASE env is required (load via config.env)");
    process.exit(1);
  }
  if (
    !DRY &&
    (!process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.AWS_REGION ||
      !process.env.AWS_S3_BUCKET)
  ) {
    console.error("[seed] AWS_* env required for S3 uploads");
    process.exit(1);
  }

  // Sanity: source dir + every spec's file must exist on disk.
  if (!fs.existsSync(CARDS_DIR)) {
    console.error(`[seed] CARDS_DIR not found: ${CARDS_DIR}`);
    process.exit(1);
  }
  const missing = TEMPLATES.filter((t) => !fs.existsSync(path.join(CARDS_DIR, t.file)));
  if (missing.length) {
    console.error(`[seed] missing source images: ${missing.map((t) => t.file).join(", ")}`);
    process.exit(1);
  }

  // Step 0 — aspect-ratio guard. Skipped under --skip-ratio for emergencies.
  if (!process.argv.includes("--skip-ratio")) {
    try {
      await assertAspectRatios();
    } catch (err) {
      console.error("[seed] aborting before any DB or S3 writes.");
      process.exit(1);
    }
  }

  await connect();

  const actor = await User.findOne({ email: "test.superadmin@labbe.sa" }).lean();
  if (!actor) {
    console.error(
      "[seed] super-admin user 'test.superadmin@labbe.sa' not found — run scripts/seedTestUsers.js first"
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`[seed] actor: ${actor.email} (${actor._id})`);

  await cleanupLegacy();
  await ensureCategories(actor);
  await ensureAllTemplates(actor);
  await verify();

  await mongoose.disconnect();
  console.log("[seed] done.");
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
