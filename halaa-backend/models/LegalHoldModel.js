const mongoose = require("mongoose");
const operations = require("../src/shared/legal/privacyOperations.generated.json");

const COLLECTIONS = operations.retentionRules.map((rule) => rule.collection);

const legalHoldSchema = new mongoose.Schema(
  {
    targetCollection: { type: String, enum: COLLECTIONS, required: true, index: true },
    scopeType: { type: String, enum: ["collection", "document", "subject"], required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
    reason: { type: String, required: true, maxlength: 500 },
    reference: { type: String, default: null, maxlength: 200 },
    active: { type: Boolean, default: true, index: true },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    releasedAt: { type: Date, default: null },
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

legalHoldSchema.pre("validate", function validateScope(next) {
  if (this.scopeType === "document" && !this.documentId) return next(new Error("document legal hold requires documentId"));
  if (this.scopeType === "subject" && !this.subjectId) return next(new Error("subject legal hold requires subjectId"));
  next();
});

legalHoldSchema.index({ targetCollection: 1, active: 1, startsAt: 1, endsAt: 1 });
legalHoldSchema.index({ targetCollection: 1, scopeType: 1, documentId: 1, active: 1 });
legalHoldSchema.index({ targetCollection: 1, scopeType: 1, subjectId: 1, active: 1 });

module.exports = mongoose.models.LegalHold || mongoose.model("LegalHold", legalHoldSchema);
