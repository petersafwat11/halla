/**
 * Normalize the host-facing visual-template library to the six public groups
 * approved for the guest web journey. Internal template names remain intact.
 *
 * Usage:
 *   node scripts/migratePublicTemplateCategories.js --dry-run
 *   node scripts/migratePublicTemplateCategories.js
 */

const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Template = require("../models/TemplateModel");
const TemplateCategory = require("../models/TemplateCategoryModel");

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const DRY_RUN = process.argv.includes("--dry-run");

const PUBLIC_CATEGORIES = [
  { code: "birthday", nameEn: "Birthday Invitation", nameAr: "دعوة عيد ميلاد", sortOrder: 10 },
  { code: "wedding", nameEn: "Wedding Invitation", nameAr: "دعوة زفاف", sortOrder: 20 },
  { code: "baby_shower", nameEn: "Newborn Invitation", nameAr: "دعوة مولود", sortOrder: 30 },
  { code: "special_event", nameEn: "Special Occasion", nameAr: "مناسبة خاصة", sortOrder: 40 },
  { code: "ramadan", nameEn: "Ramadan Invitation", nameAr: "دعوة رمضان", sortOrder: 50 },
  { code: "graduation", nameEn: "Graduation Invitation", nameAr: "دعوة تخرج", sortOrder: 60 },
];

const TEMPLATE_GROUPS = {
  wedding: [
    "Royal Groom",
    "Pearl Da'wah Wedding",
    "Royal Da'wah Wedding",
    "Gulf Groom",
    "Rose Garden Wedding",
    "Burgundy Bloom Wedding",
    "Floral Arch Wedding",
    "Candle Engagement",
    "Sacred Vows",
    "Navy Frame Wedding",
    "White Frame Wedding",
  ],
  birthday: ["Birthday Party"],
  baby_shower: ["Newborn Boy", "Newborn Girl"],
  special_event: ["Eid Al-Adha", "Pearl Promise", "Sacred Pilgrimage", "Visionary Conference"],
  ramadan: ["Ramadan Iftar"],
  graduation: ["Graduation Celebration"],
};

const LEGACY_CODES = ["engagement", "ladies_event", "general_event", "conference", "general"];

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);

  if (DRY_RUN) {
    const templates = await Template.find({
      nameEn: { $in: Object.values(TEMPLATE_GROUPS).flat() },
      deletedAt: null,
    })
      .select("nameEn categories")
      .lean();
    console.log(JSON.stringify({ publicCategories: PUBLIC_CATEGORIES, templates, legacyCodes: LEGACY_CODES }, null, 2));
    return;
  }

  for (const category of PUBLIC_CATEGORIES) {
    await TemplateCategory.updateOne(
      { code: category.code },
      { $set: { ...category, active: true } },
      { upsert: true }
    );
  }

  for (const [code, names] of Object.entries(TEMPLATE_GROUPS)) {
    await Template.updateMany(
      { nameEn: { $in: names }, deletedAt: null },
      { $set: { categories: [code] } }
    );
  }

  await TemplateCategory.updateMany(
    { code: { $in: LEGACY_CODES } },
    { $set: { active: false } }
  );

  console.log("Public template categories migrated successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
