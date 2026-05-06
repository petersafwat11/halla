/**
 * migrate-event-shape — Phase 4c W0-RENAME
 *
 * One-shot migration that copies legacy `Event.invitationSettings.*`
 * fields onto the new canonical sub-objects per PHASE_4C_PLAN §2
 * W0-RENAME (and Inventory 08 §Task 4):
 *
 *   invitationSettings.visualTemplate.id   → visualTemplate.templateRef
 *   invitationSettings.visualTemplate.src  → visualTemplate.bakedImagePath
 *   invitationSettings.visualTemplate.data → visualTemplate.fieldValues
 *   invitationSettings.templateImage       → visualTemplate.bakedImagePath
 *                                            (when no `.src` was set)
 *   invitationSettings.selectedTemplate.id → taqnyatTemplate.templateRef
 *   invitationSettings.attendanceAutoReply → guestReplies.onAttend
 *   invitationSettings.absenceAutoReply    → guestReplies.onAbsent
 *   invitationSettings.expectedAttendanceAutoReply
 *                                          → guestReplies.onExpected
 *
 * Also $unsets the deprecated fields:
 *   invitationMessage, hostNote, invitationSettings.note
 *
 * The legacy `invitationSettings` field is preserved (per D4c-2
 * dual-write window) — Phase 5 drops it after one release cycle.
 *
 * Usage:
 *   node scripts/migrate-event-shape.js --dry-run    # report only
 *   node scripts/migrate-event-shape.js --apply      # actually write
 *   node scripts/migrate-event-shape.js --apply --verbose
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Event = require("../models/EventModel");
// Phase 4c hardening — resolves legacy ids to canonical ObjectIds.
// Legacy `selectedTemplate.id` was a Meta taqnyatId string; legacy
// `visualTemplate.id` was a Number from the old hardcoded demo array.
// Without this resolver, `Event.updateOne` would throw CastError on
// any document that still carries those legacy values.
const {
  resolveTaqnyatTemplateRef,
  resolveVisualTemplateRef,
} = require("../src/modules/events/templateRefResolver");

const APPLY = process.argv.includes("--apply");
const DRY = process.argv.includes("--dry-run") || !APPLY;
const VERBOSE = process.argv.includes("--verbose");

async function projectLegacyToCanonical(doc) {
  const inv = doc.invitationSettings || {};
  const updates = {};

  // visualTemplate — only carry forward a ref if it's already a valid
  // ObjectId. The legacy Number id has no canonical equivalent (it
  // pointed into the deprecated hardcoded demo template array). Reads
  // fall back to the legacy 5-param shape via messaging.service when
  // templateRef is absent.
  const resolvedVisualRef =
    resolveVisualTemplateRef(doc.visualTemplate?.templateRef) ||
    resolveVisualTemplateRef(inv.visualTemplate?.id);
  const visual = {
    fieldValues: doc.visualTemplate?.fieldValues ?? inv.visualTemplate?.data ?? {},
    bakedImagePath:
      doc.visualTemplate?.bakedImagePath ??
      inv.visualTemplate?.src ??
      inv.templateImage ??
      null,
  };
  if (resolvedVisualRef) visual.templateRef = resolvedVisualRef;
  if (
    resolvedVisualRef ||
    visual.bakedImagePath ||
    (visual.fieldValues && Object.keys(visual.fieldValues).length)
  ) {
    updates.visualTemplate = visual;
  }

  // taqnyatTemplate — resolve via TaqnyatTemplate cache lookup.
  // Already-resolved canonical ObjectId on the doc takes precedence;
  // otherwise look up the legacy Meta taqnyatId.
  const resolvedTaqnyatRef =
    (doc.taqnyatTemplate?.templateRef &&
      (await resolveTaqnyatTemplateRef(doc.taqnyatTemplate.templateRef))) ||
    (inv.selectedTemplate?.id &&
      (await resolveTaqnyatTemplateRef(inv.selectedTemplate.id)));
  if (resolvedTaqnyatRef) updates.taqnyatTemplate = { templateRef: resolvedTaqnyatRef };

  // guestReplies
  const replies = {
    onAttend: doc.guestReplies?.onAttend ?? inv.attendanceAutoReply ?? null,
    onAbsent: doc.guestReplies?.onAbsent ?? inv.absenceAutoReply ?? null,
    onExpected: doc.guestReplies?.onExpected ?? inv.expectedAttendanceAutoReply ?? null,
  };
  if (replies.onAttend || replies.onAbsent || replies.onExpected) {
    updates.guestReplies = replies;
  }

  return updates;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("[migrate] MONGO_URI is required");
    process.exit(1);
  }
  console.log(`[migrate] Connecting to ${process.env.MONGO_URI.replace(/\/\/[^@]+@/, "//***@")}`);
  await mongoose.connect(process.env.MONGO_URI);

  const total = await Event.countDocuments({});
  console.log(`[migrate] ${total} event documents in scope`);

  const cursor = Event.find({}).cursor();
  let migrated = 0;
  let unchanged = 0;
  let errors = 0;

  for await (const doc of cursor) {
    try {
      const updates = await projectLegacyToCanonical(doc);
      if (!Object.keys(updates).length) {
        unchanged += 1;
        continue;
      }

      if (VERBOSE) {
        console.log(`[migrate] event ${doc._id}: keys=${Object.keys(updates).join(",")}`);
      }

      if (APPLY) {
        await Event.updateOne({ _id: doc._id }, { $set: updates });
      }
      migrated += 1;
    } catch (err) {
      errors += 1;
      console.error(`[migrate] event ${doc._id} FAILED:`, err.message);
    }
  }

  // Phase 5: $unset deprecated fields from all documents
  console.log("[migrate] Removing deprecated fields (invitationMessage, hostNote, invitationSettings.note)...");
  if (APPLY) {
    await Event.updateMany(
      {},
      { $unset: { invitationMessage: "", hostNote: "", "invitationSettings.note": "" } }
    );
  }

  console.log("[migrate] ────────────────────");
  console.log(`[migrate] mode:        ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`[migrate] migrated:    ${migrated}`);
  console.log(`[migrate] unchanged:   ${unchanged}`);
  console.log(`[migrate] errors:      ${errors}`);
  console.log(`[migrate] total:       ${total}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
