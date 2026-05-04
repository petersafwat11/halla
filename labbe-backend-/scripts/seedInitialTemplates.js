/**
 * seedInitialTemplates — Phase 4c hardening (post-review).
 *
 * Idempotently seeds the canonical visual-template categories and a
 * placeholder Template document per `INITIAL_TEMPLATE_NAMES` (v4.1
 * §B-17).
 *
 * The seeded Templates use placeholder image references that an admin
 * replaces via `/admin-dash/templates/[id]` once real artwork is
 * available. The script DOES NOT upload anything to S3 — it only
 * writes the database row so the editor surfaces the placeholders.
 *
 * Re-running is safe: lookups are by `nameEn` for templates and `code`
 * for categories; existing docs are left untouched (no overwrite of
 * admin edits).
 *
 * Usage:
 *   node scripts/seedInitialTemplates.js                # apply
 *   node scripts/seedInitialTemplates.js --dry-run      # report only
 *   node scripts/seedInitialTemplates.js --verbose
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Template = require("../models/TemplateModel");
const TemplateCategory = require("../models/TemplateCategoryModel");
const { INITIAL_TEMPLATE_NAMES } = require("../src/shared/constants/initialTemplateNames");

const DRY = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// Placeholder dimensions match the WhatsApp header recommended ratio
// (4:5 portrait) at a sensible pixel size. Admins replace via the
// editor; the values here only matter until then.
const PLACEHOLDER_NATURAL_WIDTH = 1080;
const PLACEHOLDER_NATURAL_HEIGHT = 1350;

const CATEGORY_DEFS = {
  wedding:     { nameEn: "Wedding",     nameAr: "زفاف",     sortOrder: 10 },
  engagement:  { nameEn: "Engagement",  nameAr: "خطوبة",    sortOrder: 20 },
  birthday:    { nameEn: "Birthday",    nameAr: "عيد ميلاد", sortOrder: 30 },
  baby_shower: { nameEn: "Baby Shower", nameAr: "استقبال مولود", sortOrder: 40 },
  general:     { nameEn: "General",     nameAr: "عام",       sortOrder: 99 },
};

async function ensureCategory(code) {
  const existing = await TemplateCategory.findOne({ code }).lean();
  if (existing) return { existing: true, doc: existing };

  const def = CATEGORY_DEFS[code];
  if (!def) {
    throw new Error(`Unknown category code "${code}" — add it to CATEGORY_DEFS`);
  }
  if (DRY) {
    return { existing: false, doc: { code, ...def, _dryRun: true } };
  }
  const doc = await TemplateCategory.create({ code, ...def, active: true });
  return { existing: false, doc };
}

async function ensureTemplate({ key, names }) {
  const existing = await Template.findOne({ nameEn: names.en }).lean();
  if (existing) {
    return { existing: true, doc: existing };
  }

  const placeholder = {
    nameEn: names.en,
    nameAr: names.ar,
    categories: [names.category],
    // Placeholder image refs — admins replace via the editor.
    // Using a sentinel S3 key avoids any chance of overwriting a real
    // asset; the URL points at a known-empty placeholder so consumers
    // get a graceful broken-image rather than a 404 to a real key.
    imageS3Key: `templates/placeholders/${key.toLowerCase()}.png`,
    imageUrl: `https://placeholder.invalid/${key.toLowerCase()}.png`,
    naturalWidth: PLACEHOLDER_NATURAL_WIDTH,
    naturalHeight: PLACEHOLDER_NATURAL_HEIGHT,
    fields: [],
    overlays: [],
    decorations: [],
    sortOrder: 100,
    active: false, // INACTIVE until admin replaces the placeholder image
    createdBy: null, // seeded — no actor
    version: 0,
  };

  if (DRY) return { existing: false, doc: { ...placeholder, _dryRun: true } };
  const doc = await Template.create(placeholder);
  return { existing: false, doc };
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("[seed] MONGO_URI is required");
    process.exit(1);
  }
  console.log(`[seed] mode: ${DRY ? "DRY-RUN" : "APPLY"}`);
  console.log(`[seed] Connecting to ${process.env.MONGO_URI.replace(/\/\/[^@]+@/, "//***@")}`);
  await mongoose.connect(process.env.MONGO_URI);

  // Step 1 — categories. We need them before templates because the
  // Template schema validates `categories` is non-empty (but does NOT
  // require they exist as TemplateCategory rows — admins can curate
  // category metadata afterwards).
  const categoryCodes = Array.from(
    new Set(Object.values(INITIAL_TEMPLATE_NAMES).map((t) => t.category))
  );

  let categoriesCreated = 0;
  let categoriesExisting = 0;
  for (const code of categoryCodes) {
    const { existing } = await ensureCategory(code);
    if (existing) categoriesExisting += 1;
    else categoriesCreated += 1;
    if (VERBOSE) console.log(`[seed] category ${code}: ${existing ? "kept" : "created"}`);
  }

  // Step 2 — templates.
  let templatesCreated = 0;
  let templatesExisting = 0;
  for (const [key, names] of Object.entries(INITIAL_TEMPLATE_NAMES)) {
    const { existing } = await ensureTemplate({ key, names });
    if (existing) templatesExisting += 1;
    else templatesCreated += 1;
    if (VERBOSE) console.log(`[seed] template ${key} (${names.en}): ${existing ? "kept" : "created"}`);
  }

  console.log("[seed] ────────────────────");
  console.log(`[seed] categories created:  ${categoriesCreated}`);
  console.log(`[seed] categories existing: ${categoriesExisting}`);
  console.log(`[seed] templates created:   ${templatesCreated}`);
  console.log(`[seed] templates existing:  ${templatesExisting}`);
  console.log(`[seed] mode:                ${DRY ? "DRY-RUN" : "APPLY"}`);

  if (templatesCreated > 0) {
    console.log("");
    console.log("[seed] Newly-created templates are INACTIVE.");
    console.log("[seed] Replace the placeholder image at /admin-dash/templates/[id]");
    console.log("[seed] then flip `active: true` to surface them to hosts.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
