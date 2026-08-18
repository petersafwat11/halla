const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    ruleId: String,
    targetCollection: String,
    cutoff: Date,
    scanned: { type: Number, default: 0 },
    eligible: { type: Number, default: 0 },
    held: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    hasMore: { type: Boolean, default: false },
    skippedReason: { type: String, default: null },
    error: { type: String, default: null },
  },
  { _id: false }
);

const retentionRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true, index: true },
    mode: { type: String, enum: ["dry_run", "execute"], required: true },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running", index: true },
    policyHash: { type: String, required: true, index: true },
    batchSize: { type: Number, required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    results: { type: [resultSchema], default: [] },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

retentionRunSchema.index({ startedAt: -1, status: 1 });

module.exports = mongoose.models.RetentionRun || mongoose.model("RetentionRun", retentionRunSchema);
