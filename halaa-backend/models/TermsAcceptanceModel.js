/**
 * TermsAcceptance (SHIP §6)
 *
 * Durable record that a user OR guest accepted a versioned policy (Terms /
 * Community Rules) before creating UGC. Stores actor id, document type +
 * version, locale, time, and IP — the evidence stores require for UGC apps.
 */

const mongoose = require("mongoose");

const termsAcceptanceSchema = new mongoose.Schema(
  {
    actorType: { type: String, enum: ["user", "guest"], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    documentType: {
      type: String,
      enum: ["terms", "community", "privacy"],
      required: true,
    },
    version: { type: String, required: true },
    locale: { type: String, default: "ar" },
    ip: { type: String },
    acceptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One acceptance row per (actor, document, version). Re-accepting the same
// version is a no-op upsert; a new version creates a new row.
termsAcceptanceSchema.index(
  { actorType: 1, actorId: 1, documentType: 1, version: 1 },
  { unique: true }
);
termsAcceptanceSchema.index({ actorType: 1, actorId: 1, documentType: 1 });

module.exports =
  mongoose.models.TermsAcceptance ||
  mongoose.model("TermsAcceptance", termsAcceptanceSchema);
