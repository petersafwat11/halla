/**
 * Block (SHIP §6)
 *
 * A viewer (user or guest) blocking a content author (user or guest). Blocking
 * must immediately hide the blocked actor's content from the blocker, so the
 * UGC read paths filter against these rows.
 */

const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema(
  {
    blockerType: { type: String, enum: ["user", "guest"], required: true },
    blockerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    blockedActorType: { type: String, enum: ["user", "guest"], required: true },
    blockedActorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Optional context (e.g. the event the block originated from).
    contextEventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  },
  { timestamps: true }
);

blockSchema.index(
  { blockerType: 1, blockerId: 1, blockedActorType: 1, blockedActorId: 1 },
  { unique: true }
);
// Fast "who has this viewer blocked" lookups on the read path.
blockSchema.index({ blockerType: 1, blockerId: 1 });

module.exports =
  mongoose.models.Block || mongoose.model("Block", blockSchema);
