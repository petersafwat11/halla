/**
 * Report (SHIP §6)
 *
 * A durable moderation case raised against a piece of UGC or an actor. Captures
 * a content snapshot/hash at report time, the reporter, reason, status, SLA due
 * time, and an append-only status history — so a staffed queue can triage,
 * action, and audit reports.
 */

const mongoose = require("mongoose");
const crypto = require("crypto");

const REPORT_TARGET_TYPES = [
  "post_event_comment",
  "post_event_media",
  "vendor_profile",
  "service",
  "guest", // a guest actor (e.g. abusive commenter)
  "user", // a user actor (e.g. vendor/host)
];

const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "illegal",
  "nudity",
  "impersonation",
  "other",
];

const REPORT_STATUSES = ["open", "reviewing", "actioned", "dismissed"];

// Moderation actions a reviewer can record on a case.
const MODERATION_ACTIONS = [
  "approve", // content is fine — make/keep visible
  "hide", // hide content from everyone (reversible)
  "remove", // delete content
  "warn", // warn the author
  "suspend", // suspend the author account
  "dismiss", // no violation
];

const historyEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: REPORT_STATUSES },
    action: { type: String, enum: MODERATION_ACTIONS },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reporterType: { type: String, enum: ["user", "guest"], required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, required: true },

    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // The author/owner of the reported content (for grouping repeat offenders).
    reportedActorType: { type: String, enum: ["user", "guest"] },
    reportedActorId: { type: mongoose.Schema.Types.ObjectId },
    contextEventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },

    // Snapshot so the case survives content deletion. No restorable PII beyond
    // what was publicly posted; `hash` lets us dedupe/group identical content.
    contentSnapshot: {
      text: String,
      mediaUrl: String,
      hash: String,
    },

    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 2000 },

    status: { type: String, enum: REPORT_STATUSES, default: "open", index: true },
    resolution: {
      action: { type: String, enum: MODERATION_ACTIONS },
      note: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: Date,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    slaDueAt: { type: Date, index: true },
    history: [historyEntrySchema],
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, slaDueAt: 1 });
reportSchema.index({ reportedActorType: 1, reportedActorId: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });

reportSchema.statics.hashContent = (text = "", mediaUrl = "") =>
  crypto.createHash("sha256").update(`${text}\n${mediaUrl}`).digest("hex");

module.exports = mongoose.models.Report || mongoose.model("Report", reportSchema);
module.exports.REPORT_TARGET_TYPES = REPORT_TARGET_TYPES;
module.exports.REPORT_REASONS = REPORT_REASONS;
module.exports.REPORT_STATUSES = REPORT_STATUSES;
module.exports.MODERATION_ACTIONS = MODERATION_ACTIONS;
