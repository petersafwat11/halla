/**
 * seedTemplateCards.js — TEMPLATES_SEED_6_PLAN
 *
 * Idempotently:
 *   1. Soft-cleans junk DB rows (3 named templates + the `hhhh` category).
 *   2. Creates 5 visual-template categories.
 *   3. Uploads each of the 6 images in `D:/halla/template-cards/` to S3
 *      and creates a polished Template document with fields, overlays,
 *      and decorations from §6 of the plan.
 *
 * Idempotency: re-running skips templates whose `nameEn` already exists
 * (active or soft-deleted). No re-upload happens for those — we don't
 * want orphan S3 objects in staging.
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

const DRY = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

const CARDS_DIR = path.resolve(__dirname, "..", "..", "template-cards");

// ── junk targets (from §3 of the plan, verified against current DB) ─────────
const JUNK_TEMPLATE_NAMES = ["hi", "testing categories", "Playwright Test Template"];
const JUNK_CATEGORY_CODE = "hhhh";

// ── 5 categories ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { code: "wedding",      nameEn: "Wedding",        nameAr: "زفاف",            sortOrder: 10 },
  { code: "engagement",   nameEn: "Engagement",     nameAr: "خطوبة",           sortOrder: 20 },
  { code: "birthday",     nameEn: "Birthday",       nameAr: "عيد ميلاد",       sortOrder: 30 },
  { code: "baby_shower",  nameEn: "Baby Shower",    nameAr: "استقبال مولود",   sortOrder: 40 },
  { code: "ladies_event", nameEn: "Ladies' Event",  nameAr: "مناسبة نسائية",   sortOrder: 50 },
];

// ── helper: build overlays defaulting to colorBinding=primary, center align ─
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

// ── 6 template specs ────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    file: "marriage.jpg",
    nameEn: "Royal Wedding",
    nameAr: "زفاف ملكي",
    categories: ["wedding"],
    sortOrder: 10,
    fields: [
      { key: "groomFamilyName", type: "text",     labelEn: "Groom Family",       labelAr: "عائلة العريس",    placeholderEn: "e.g. Al-Saud",        placeholderAr: "مثل آل سعود",     required: true },
      { key: "brideFamilyName", type: "text",     labelEn: "Bride Family",       labelAr: "عائلة العروس",    placeholderEn: "e.g. Al-Qahtani",     placeholderAr: "مثل القحطاني",    required: true },
      { key: "eventDate",       type: "date",     labelEn: "Wedding Date",       labelAr: "تاريخ الزفاف",    required: true },
      { key: "eventTime",       type: "time",     labelEn: "Time",               labelAr: "الوقت",            required: true, defaultValue: "20:00" },
      { key: "venue",           type: "text",     labelEn: "Venue",              labelAr: "المكان",           placeholderEn: "Riyadh, Hilton Hall", placeholderAr: "الرياض، قاعة هيلتون", required: true },
      { key: "invitationMessage", type: "textarea", labelEn: "Invitation Message", labelAr: "رسالة الدعوة",  rows: 3, defaultValue: "يتشرف بدعوتكم لحضور حفل زفافهما" },
      { key: "primaryColor",    type: "color",    labelEn: "Accent Colour",      labelAr: "لون مميز",         defaultValue: "#e8d3a0" },
      { key: "fontFamily",      type: "font",     labelEn: "Font",               labelAr: "الخط",             defaultValue: "'Amiri', serif" },
    ],
    // Marriage.jpg has a dark background. Lock every overlay to a cream-gold
    // hex via colorBinding=custom so the host's primary colour can't make
    // the text disappear into the fabric.
    overlays: [
      ov("groomFamilyName",   52, 50, 70, 5.5, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("brideFamilyName",   62, 50, 70, 5.5, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventDate",         75, 50, 60, 3.2, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventTime",         80, 50, 60, 3.0, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("venue",             86, 50, 80, 2.8, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("invitationMessage", 92, 50, 80, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Sparkles", "#e8d3a0", 47, 50, 6, 3.2),
      dec("Crown",    "#e8d3a0", 41, 50, 8, 4.5),
    ],
  },
  {
    file: "marriage2.jpg",
    nameEn: "Garden Wedding",
    nameAr: "زفاف الحديقة",
    categories: ["wedding"],
    sortOrder: 11,
    fields: [
      { key: "brideName",     type: "text",     labelEn: "Bride",         labelAr: "العروس",         placeholderEn: "e.g. Sara",  placeholderAr: "مثل سارة", required: true },
      { key: "groomName",     type: "text",     labelEn: "Groom",         labelAr: "العريس",         placeholderEn: "e.g. Khalid", placeholderAr: "مثل خالد", required: true },
      { key: "weddingDate",   type: "date",     labelEn: "Wedding Date",  labelAr: "تاريخ الزفاف",   required: true },
      { key: "weddingTime",   type: "time",     labelEn: "Time",          labelAr: "الوقت",           required: true, defaultValue: "19:00" },
      { key: "venue",         type: "text",     labelEn: "Venue",         labelAr: "القاعة",          placeholderEn: "Riyadh, Four Seasons", placeholderAr: "الرياض، فور سيزونز", required: true },
      { key: "address",       type: "textarea", labelEn: "Address",       labelAr: "العنوان",         rows: 2 },
      { key: "rsvpDate",      type: "date",     labelEn: "RSVP By",       labelAr: "تأكيد الحضور قبل" },
      { key: "hashtag",       type: "text",     labelEn: "Hashtag",       labelAr: "وسم",            placeholderEn: "#SaraAndKhaled", placeholderAr: "#سارة_وخالد" },
      { key: "guestMessage",  type: "textarea", labelEn: "Message to Guests", labelAr: "رسالة للضيوف", rows: 3, defaultValue: "بكل حب ندعوكم لمشاركتنا فرحتنا" },
      { key: "primaryColor",  type: "color",    labelEn: "Primary Colour", labelAr: "اللون الأساسي",  defaultValue: "#b56576" },
      { key: "fontFamily",    type: "font",     labelEn: "Font",           labelAr: "الخط",           defaultValue: "'Cairo', sans-serif" },
    ],
    overlays: [
      ov("guestMessage", 22, 50, 70, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("brideName",    30, 50, 60, 5.0, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("groomName",    41, 50, 60, 5.0, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("weddingDate",  51, 50, 60, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("weddingTime",  56, 50, 60, 2.8, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",        61, 50, 75, 2.6, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("address",      65, 50, 75, 2.2, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("rsvpDate",     70, 50, 60, 2.2, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("hashtag",      73, 50, 60, 2.2, "600", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("HeartHandshake", "#b56576", 36, 50, 5, 3.5),
    ],
  },
  {
    file: "engament.jpg",
    nameEn: "Pure Promise",
    nameAr: "وعدٌ نقي",
    categories: ["engagement"],
    sortOrder: 20,
    fields: [
      { key: "hisName",            type: "text",     labelEn: "His Name",        labelAr: "اسمه",         required: true },
      { key: "herName",            type: "text",     labelEn: "Her Name",        labelAr: "اسمها",        required: true },
      { key: "engagementDate",     type: "date",     labelEn: "Engagement Date", labelAr: "تاريخ الخطوبة", required: true },
      { key: "engagementTime",     type: "time",     labelEn: "Time",            labelAr: "الوقت",         required: true, defaultValue: "19:00" },
      { key: "venue",              type: "text",     labelEn: "Venue",           labelAr: "المكان",        required: true },
      { key: "invitationMessage",  type: "textarea", labelEn: "Invitation Message", labelAr: "رسالة الدعوة", rows: 2, defaultValue: "يتشرفان بدعوتكم لحفل خطوبتهما" },
      { key: "primaryColor",       type: "color",    labelEn: "Accent",          labelAr: "اللون",         defaultValue: "#88775f" },
      { key: "fontFamily",         type: "font",     labelEn: "Font",            labelAr: "الخط",          defaultValue: "'Amiri', serif" },
    ],
    overlays: [
      ov("invitationMessage", 14, 50, 70, 2.4, "400", { fontFamily: "'Amiri', serif" }),
      ov("hisName",           25, 50, 60, 5.5, "700", { fontFamily: "'Amiri', serif" }),
      ov("herName",           38, 50, 60, 5.5, "700", { fontFamily: "'Amiri', serif" }),
      ov("engagementDate",    52, 50, 60, 3.0, "500", { fontFamily: "'Amiri', serif" }),
      ov("engagementTime",    58, 50, 60, 2.8, "400", { fontFamily: "'Amiri', serif" }),
      ov("venue",             64, 50, 75, 2.6, "500", { fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Diamond", "#c9a36b", 32, 50, 5, 3.0),
      dec("Sparkle", "#c9a36b", 32, 30, 4, 2.0),
      dec("Sparkle", "#c9a36b", 32, 70, 4, 2.0),
    ],
  },
  {
    file: "birthday.jpg",
    nameEn: "Sweet Celebration",
    nameAr: "احتفال حلو",
    categories: ["birthday"],
    sortOrder: 30,
    fields: [
      { key: "celebrantName", type: "text",     labelEn: "Celebrant",   labelAr: "صاحب المناسبة", required: true },
      { key: "age",           type: "number",   labelEn: "Age",         labelAr: "العمر",          min: 1, max: 120 },
      { key: "partyDate",     type: "date",     labelEn: "Party Date",  labelAr: "تاريخ الحفلة",   required: true },
      { key: "partyTime",     type: "time",     labelEn: "Time",        labelAr: "الوقت",          required: true, defaultValue: "17:00" },
      { key: "venue",         type: "text",     labelEn: "Venue",       labelAr: "المكان",         placeholderEn: "Home / Hall", placeholderAr: "البيت / القاعة", required: true },
      { key: "theme",         type: "text",     labelEn: "Theme",       labelAr: "الثيم",          placeholderEn: "e.g. Unicorn", placeholderAr: "مثل يونيكورن" },
      { key: "guestMessage",  type: "textarea", labelEn: "Message",     labelAr: "رسالة",          rows: 2, defaultValue: "يسعدنا حضوركم لمشاركتنا الفرح" },
      { key: "primaryColor",  type: "color",    labelEn: "Primary Colour", labelAr: "اللون",       defaultValue: "#e91e63" },
      { key: "fontFamily",    type: "font",     labelEn: "Font",        labelAr: "الخط",           defaultValue: "'Cairo', sans-serif" },
    ],
    overlays: [
      ov("guestMessage",  27, 50, 70, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("celebrantName", 36, 50, 70, 5.5, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("age",           47, 50, 30, 7.0, "800", { fontFamily: "'Cairo', sans-serif" }),
      ov("partyDate",     55, 50, 60, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("partyTime",     60, 50, 60, 2.8, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",         65, 50, 75, 2.8, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("theme",         70, 50, 60, 2.4, "600", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("PartyPopper", "#e91e63", 22, 25, 6, 3.5),
      dec("Cake",        "#e91e63", 22, 75, 6, 3.5),
      dec("Gift",        "#b56576", 32, 50, 5, 3.0),
    ],
  },
  {
    file: "blessed_births.jpg",
    nameEn: "Blessed Newborn",
    nameAr: "مولود مبارك",
    categories: ["baby_shower"],
    sortOrder: 40,
    fields: [
      { key: "babyName",     type: "text",     labelEn: "Baby Name",         labelAr: "اسم المولود" },
      { key: "parents",      type: "text",     labelEn: "Parents",           labelAr: "الوالدان",        placeholderEn: "e.g. Ahmad & Reem", placeholderAr: "مثل أحمد وريم", required: true },
      { key: "birthDate",    type: "date",     labelEn: "Birth Date",        labelAr: "تاريخ الولادة" },
      { key: "eventDate",    type: "date",     labelEn: "Celebration Date",  labelAr: "تاريخ الاستقبال", required: true },
      { key: "eventTime",    type: "time",     labelEn: "Time",              labelAr: "الوقت",           required: true, defaultValue: "18:00" },
      { key: "venue",        type: "text",     labelEn: "Venue",             labelAr: "المكان",           required: true },
      { key: "weight",       type: "number",   labelEn: "Weight (kg)",       labelAr: "الوزن (كجم)",     min: 0.5, max: 10, step: 0.01 },
      { key: "guestMessage", type: "textarea", labelEn: "Message",           labelAr: "رسالة",            rows: 2, defaultValue: "أهلاً وسهلاً بضيف الحياة الجديد" },
      { key: "primaryColor", type: "color",    labelEn: "Primary Colour",    labelAr: "اللون",            defaultValue: "#e0aaae" },
      { key: "fontFamily",   type: "font",     labelEn: "Font",              labelAr: "الخط",             defaultValue: "'Cairo', sans-serif" },
    ],
    overlays: [
      ov("guestMessage", 30, 50, 70, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("babyName",     38, 50, 70, 6.5, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("parents",      50, 50, 70, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("birthDate",    56, 50, 60, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("weight",       60, 50, 60, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventDate",    65, 50, 60, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventTime",    70, 50, 60, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",        75, 50, 75, 2.6, "500", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("HeartPulse", "#e0aaae", 33, 50, 5, 3.2),
      dec("Sparkles",   "#e0aaae", 46, 25, 4, 2.4),
      dec("Sparkles",   "#e0aaae", 46, 75, 4, 2.4),
    ],
  },
  {
    file: "woman_invitation.jpg",
    nameEn: "Ladies' Gathering",
    nameAr: "ملتقى السيدات",
    categories: ["ladies_event"],
    sortOrder: 50,
    fields: [
      { key: "hostessName",  type: "text",     labelEn: "Hostess",        labelAr: "المضيفة",          placeholderEn: "e.g. Um Sara",     placeholderAr: "مثل أم سارة",     required: true },
      { key: "eventTitle",   type: "text",     labelEn: "Event Title",    labelAr: "عنوان المناسبة",    placeholderEn: "e.g. Coffee Morning", placeholderAr: "مثل صباحية قهوة", required: true },
      { key: "eventDate",    type: "date",     labelEn: "Date",           labelAr: "التاريخ",           required: true },
      { key: "eventTime",    type: "time",     labelEn: "Time",           labelAr: "الوقت",             required: true, defaultValue: "10:00" },
      { key: "venue",        type: "text",     labelEn: "Venue",          labelAr: "المكان",            placeholderEn: "Home / Café", placeholderAr: "البيت / المقهى", required: true },
      { key: "address",      type: "text",     labelEn: "Address",        labelAr: "العنوان" },
      { key: "dressCode",    type: "text",     labelEn: "Dress Code",     labelAr: "قواعد اللباس" },
      { key: "guestMessage", type: "textarea", labelEn: "Message to Guests", labelAr: "رسالة للضيوف",  rows: 3, defaultValue: "يسرّني أن تكنّ بصحبتي" },
      { key: "primaryColor", type: "color",    labelEn: "Primary Colour", labelAr: "اللون",             defaultValue: "#8b2243" },
      { key: "fontFamily",   type: "font",     labelEn: "Font",           labelAr: "الخط",              defaultValue: "'Cairo', sans-serif" },
    ],
    overlays: [
      ov("guestMessage", 12, 50, 70, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventTitle",   22, 50, 70, 5.0, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("hostessName",  33, 50, 70, 3.4, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventDate",    43, 50, 60, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventTime",    48, 50, 60, 2.8, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",        54, 50, 75, 2.6, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("address",      59, 50, 75, 2.2, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("dressCode",    64, 50, 60, 2.2, "600", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      dec("Flower2", "#8b2243", 18, 18, 5, 3.0),
      dec("Flower2", "#8b2243", 18, 82, 5, 3.0),
      dec("Sparkle", "#8b2243", 28, 50, 4, 2.0),
    ],
  },
];

// ── DB connect (mirrors seedTestUsers.js) ───────────────────────────────────
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

// ── 1. Soft-clean junk ──────────────────────────────────────────────────────
async function cleanupJunk() {
  console.log("[seed] step 1 — junk cleanup");

  for (const name of JUNK_TEMPLATE_NAMES) {
    const t = await Template.findOne({ nameEn: name });
    if (!t) {
      if (VERBOSE) console.log(`  - template "${name}": not found, skipping`);
      continue;
    }
    if (t.deletedAt) {
      if (VERBOSE) console.log(`  - template "${name}" (${t._id}): already soft-deleted`);
      continue;
    }
    if (DRY) {
      console.log(`  [dry] would soft-delete template "${name}" (${t._id})`);
    } else {
      t.deletedAt = new Date();
      t.active = false;
      await t.save();
      console.log(`  - soft-deleted template "${name}" (${t._id})`);
    }
  }

  const cat = await TemplateCategory.findOne({ code: JUNK_CATEGORY_CODE });
  if (!cat) {
    if (VERBOSE) console.log(`  - category "${JUNK_CATEGORY_CODE}": not found, skipping`);
  } else if (cat.active === false) {
    if (VERBOSE) console.log(`  - category "${JUNK_CATEGORY_CODE}" (${cat._id}): already inactive`);
  } else if (DRY) {
    console.log(`  [dry] would deactivate category "${JUNK_CATEGORY_CODE}" (${cat._id})`);
  } else {
    cat.active = false;
    await cat.save();
    console.log(`  - deactivated category "${JUNK_CATEGORY_CODE}" (${cat._id})`);
  }
}

// ── 2. Categories ───────────────────────────────────────────────────────────
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

// ── 3. Templates ────────────────────────────────────────────────────────────
async function ensureTemplate(spec, actor) {
  // Treat any matching nameEn (active or soft-deleted) as "exists" so we
  // don't duplicate after a re-run, and don't burn S3 on uploads we'll
  // discard.
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

  if (DRY) {
    console.log(`  [dry] would upload ${spec.file} + create template "${spec.nameEn}"`);
    return { existing: false, doc: null };
  }

  // Upload original to S3 via the same service the editor uses.
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

  // createTemplate will processImage (sharp → naturalW/H + thumbnail) and
  // wire imageUrl/thumbnailUrl. On any throw it cleans up the S3 keys.
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
  console.log("[seed] step 3 — templates");
  let created = 0;
  let kept = 0;
  for (const spec of TEMPLATES) {
    const r = await ensureTemplate(spec, actor);
    if (r.existing) kept++; else created++;
  }
  console.log(`[seed]   templates: ${created} created, ${kept} kept`);
}

// ── verification ────────────────────────────────────────────────────────────
async function verify() {
  console.log("[seed] step 4 — verification");
  const active = await Template.find({
    deletedAt: null,
    active: true,
    nameEn: { $in: TEMPLATES.map((t) => t.nameEn) },
  })
    .sort({ sortOrder: 1 })
    .lean();
  console.log(`[seed]   active seeded templates: ${active.length}/6`);
  for (const t of active) {
    console.log(
      `    [${t.sortOrder}] ${t.nameEn} / ${t.nameAr} — cats=${JSON.stringify(t.categories)} ${t.naturalWidth}x${t.naturalHeight} fields=${t.fields.length} overlays=${t.overlays.length} deco=${t.decorations.length} url=${t.imageUrl ? "ok" : "MISSING"}`
    );
  }

  // Spot-check: all overlay fieldKeys must exist in fields[]
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
  console.log(`[seed]   active categories: ${categories.length}`);
  for (const c of categories) {
    console.log(`    [${c.sortOrder}] ${c.code} — ${c.nameEn} / ${c.nameAr}`);
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[seed] mode: ${DRY ? "DRY-RUN" : "APPLY"}`);
  if (!process.env.DATABASE) {
    console.error("[seed] DATABASE env is required (load via config.env)");
    process.exit(1);
  }
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.AWS_REGION ||
    !process.env.AWS_S3_BUCKET
  ) {
    console.error("[seed] AWS_* env required for S3 uploads");
    process.exit(1);
  }

  await connect();

  // Template.createdBy is required, so fail loudly if the seed super-admin
  // is missing rather than letting Mongoose throw a confusing validation
  // error halfway through.
  const actor = await User.findOne({ email: "test.superadmin@labbe.sa" }).lean();
  if (!actor) {
    console.error(
      "[seed] super-admin user 'test.superadmin@labbe.sa' not found — run scripts/seedTestUsers.js first"
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`[seed] actor: ${actor.email} (${actor._id})`);

  await cleanupJunk();
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
