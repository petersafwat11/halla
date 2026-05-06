/**
 * pruneOrphanFields.js
 *
 * Drops every field that has no matching overlay (i.e. fields the host
 * is asked for but that never paint on the card). Also drops the
 * `weight` field + overlay from Blessed Newborn per host request — keeping
 * birth weight off the canvas keeps it baby-photo style.
 *
 * Idempotent: re-running is a no-op once orphans are gone.
 *
 * Usage:
 *   node scripts/pruneOrphanFields.js              # apply
 *   node scripts/pruneOrphanFields.js --dry-run    # report only
 */

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const mongoose = require("mongoose");
const Template = require("../models/TemplateModel");
const User = require("../models/UserModel");
const service = require("../src/modules/templates/templates.service");

const DRY = process.argv.includes("--dry-run");

// Per-template explicit field-key removals (the field AND any overlay
// referencing it both go). Used when the rule "drop fields without
// overlays" isn't enough — e.g. Blessed Newborn's `weight` currently
// has an overlay but the host wants it gone entirely.
const EXPLICIT_REMOVALS = {
  "Blessed Newborn": ["weight"],
};

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
}

async function main() {
  console.log(`[prune] mode: ${DRY ? "DRY-RUN" : "APPLY"}`);
  await connect();

  const actor = await User.findOne({ email: "test.superadmin@labbe.sa" }).lean();
  if (!actor) {
    console.error("[prune] super-admin not found");
    process.exit(1);
  }

  const docs = await Template.find({ active: true, deletedAt: null }).sort({ sortOrder: 1 });

  for (const doc of docs) {
    const explicit = new Set(EXPLICIT_REMOVALS[doc.nameEn] || []);

    // Step 1 — drop overlays for any explicit-removal key.
    const overlaysAfterExplicit = doc.overlays.filter((o) => !explicit.has(o.fieldKey));

    // Step 2 — collect overlay keys after that drop.
    const overlayKeys = new Set(overlaysAfterExplicit.map((o) => o.fieldKey));

    // Step 3 — keep only fields whose key has a surviving overlay.
    //          (This naturally drops orphan fields like primaryColor /
    //          fontFamily AND the explicit-removal fields.)
    const newFields = doc.fields.filter((f) => overlayKeys.has(f.key));

    const droppedFieldKeys = doc.fields.map((f) => f.key).filter((k) => !overlayKeys.has(k));
    const droppedOverlayKeys = doc.overlays.map((o) => o.fieldKey).filter((k) => explicit.has(k));

    if (droppedFieldKeys.length === 0 && droppedOverlayKeys.length === 0) {
      console.log(`[prune] ${doc.nameEn}: already clean (${doc.fields.length} fields)`);
      continue;
    }

    console.log(
      `[prune] ${doc.nameEn}: drop fields=[${droppedFieldKeys.join(", ")}] overlays=[${droppedOverlayKeys.join(", ")}]`
    );

    if (DRY) continue;

    await service.updateTemplate(
      String(doc._id),
      { fields: newFields, overlays: overlaysAfterExplicit },
      actor
    );
    console.log(
      `         → kept ${newFields.length} fields, ${overlaysAfterExplicit.length} overlays`
    );
  }

  await mongoose.disconnect();
  console.log("[prune] done.");
}

main().catch((err) => {
  console.error("[prune] FAILED:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
