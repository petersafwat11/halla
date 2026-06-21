/**
 * Id-preserving migration from the two legacy template-card seed waves to
 * precisionTemplateSpecs.js.
 *
 * Default is strictly read-only. No DB or S3 write occurs without --apply.
 * Fresh source images are uploaded only with BOTH --apply --replace-images.
 *
 * Usage:
 *   node scripts/updateTemplateCardsPrecision.js
 *   node scripts/updateTemplateCardsPrecision.js --apply
 *   node scripts/updateTemplateCardsPrecision.js --apply --replace-images
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const mongoose = require("mongoose");
const Template = require("../models/TemplateModel");
const User = require("../models/UserModel");
const service = require("../src/modules/templates/templates.service");
const { TEMPLATES } = require("./precisionTemplateSpecs");

const APPLY = process.argv.includes("--apply");
const REPLACE_IMAGES = process.argv.includes("--replace-images");
const CARDS_DIR = path.resolve(__dirname, "..", "..", "template-cards");

if (REPLACE_IMAGES && !APPLY) {
  throw new Error("--replace-images requires --apply");
}

const LEGACY_NAME_BY_FILE = {
  "marriage.jpg": ["Royal Wedding", "Royal Groom"],
  "marriage2.jpg": ["Garden Wedding", "Floral Arch Wedding"],
  "engament.jpg": ["Pure Promise", "Candle Engagement"],
  "birthday.jpg": ["Sweet Celebration", "Birthday Party"],
  "blessed_births.jpg": ["Blessed Newborn", "Rose Garden Wedding"],
  "woman_invitation.jpg": ["Ladies' Gathering", "Burgundy Bloom Wedding"],
  "wedding_navy_frame.jpg": ["Royal Navy Wedding", "Navy Frame Wedding"],
  "wedding_white_frame.jpg": ["Pearl Frame Wedding", "White Frame Wedding"],
  "wedding_navy_dawah.jpg": ["Royal Da'wah Wedding"],
  "wedding_white_dawah.jpg": ["Pearl Da'wah Wedding"],
  "wedding_gulf_groom.jpg": ["Gulf Groom"],
  "marriage_contract_arch.jpg": ["Sacred Vows"],
  "marriage_contract_bronze.jpg": ["Bronze Bloom Vows", "Graduation Celebration"],
  "engagement_pearl.jpg": ["Pearl Promise"],
  "newborn_boy.jpg": ["Little Prince", "Newborn Boy"],
  "newborn_girl.jpg": ["Little Princess", "Newborn Girl"],
  "general_spring.jpg": ["Spring Meadow", "Eid Al-Adha"],
  "general_lantern.jpg": ["Lantern Night", "Ramadan Iftar"],
  "general_pilgrimage.jpg": ["Sacred Pilgrimage"],
  "conference.jpg": ["Visionary Conference"],
};

const WRITABLE = ["nameEn", "nameAr", "categories", "fields", "overlays", "decorations", "sortOrder", "active"];

const plain = (value) => JSON.parse(JSON.stringify(value ?? null));
const same = (a, b) => JSON.stringify(plain(a)) === JSON.stringify(plain(b));

async function connect() {
  let database = process.env.DATABASE;
  if (!database) throw new Error("DATABASE is not configured");
  if (process.env.DATABASE_PASSWORD && database.includes("<PASSWORD>")) {
    database = database.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
  }
  const options = {};
  if (process.env.DATABASE_CERT_PATH) {
    options.tls = true;
    options.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  await mongoose.connect(database, options);
}

function desiredPayload(spec) {
  return {
    nameEn: spec.nameEn,
    nameAr: spec.nameAr,
    categories: spec.categories,
    fields: spec.fields,
    overlays: spec.overlays,
    decorations: spec.decorations,
    sortOrder: spec.sortOrder,
    active: true,
  };
}

function diffDocument(doc, desired) {
  const changes = {};
  for (const key of WRITABLE) {
    if (!same(doc[key], desired[key])) {
      changes[key] = key === "fields" || key === "overlays" || key === "decorations"
        ? { from: doc[key]?.length || 0, to: desired[key]?.length || 0 }
        : { from: plain(doc[key]), to: plain(desired[key]) };
    }
  }
  return changes;
}

async function main() {
  console.log(`[precision] mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`[precision] replace images: ${REPLACE_IMAGES ? "YES" : "NO"}`);
  await connect();

  const actor = await User.findOne({ email: "test.superadmin@labbe.sa" });
  if (!actor) throw new Error("super-admin test.superadmin@labbe.sa not found");

  let changed = 0;
  let unchanged = 0;
  const missing = [];

  for (const spec of TEMPLATES) {
    const aliases = [...new Set([spec.nameEn, ...(LEGACY_NAME_BY_FILE[spec.file] || [])])];
    const matches = await Template.find({ nameEn: { $in: aliases }, deletedAt: null });
    if (matches.length === 0) {
      missing.push(`${spec.file}: ${aliases.join(" | ")}`);
      continue;
    }
    if (matches.length > 1) {
      throw new Error(`${spec.file}: multiple active template rows match aliases: ${matches.map((item) => `${item.nameEn}(${item._id})`).join(", ")}`);
    }

    const doc = matches[0];
    const desired = desiredPayload(spec);
    const changes = diffDocument(doc, desired);
    const needsMetadata = Object.keys(changes).length > 0;
    const needsWrite = needsMetadata || REPLACE_IMAGES;

    if (!needsWrite) {
      unchanged += 1;
      console.log(`[precision] unchanged ${spec.file} -> ${doc.nameEn} (${doc._id})`);
      continue;
    }

    changed += 1;
    console.log(`[precision] ${APPLY ? "update" : "would update"} ${spec.file} -> ${spec.nameEn} (${doc._id})`);
    if (needsMetadata) console.log(JSON.stringify(changes, null, 2));
    if (REPLACE_IMAGES) console.log(`  image: replace from ${path.join(CARDS_DIR, spec.file)}`);
    if (!APPLY) continue;

    let s3Key;
    if (REPLACE_IMAGES) {
      const filePath = path.join(CARDS_DIR, spec.file);
      if (!fs.existsSync(filePath)) throw new Error(`missing source image: ${filePath}`);
      const uploaded = await service.handleImageUpload({
        fileBuffer: fs.readFileSync(filePath),
        filename: spec.file,
        contentType: "image/jpeg",
        templateId: String(doc._id),
      });
      s3Key = uploaded.s3Key;
    }

    await service.updateTemplate(
      String(doc._id),
      {
        ...desired,
        ...(s3Key ? { s3Key } : {}),
        expectedVersion: doc.version || 0,
      },
      actor
    );
  }

  if (missing.length) {
    throw new Error(`missing active template rows:\n${missing.map((item) => `  - ${item}`).join("\n")}`);
  }

  console.log(`[precision] summary: ${changed} ${APPLY ? "updated" : "would update"}, ${unchanged} unchanged`);
}

main()
  .catch((error) => {
    console.error("[precision] FAILED:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });

