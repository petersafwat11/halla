/**
 * @halaa-checkin/api
 * Audit Mongoose Model.
 * Append-only audit record store adhering to Technical Contract Section 3.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      default: null,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: null,
    },
    changes: {
      fieldNames: [{ type: String }],
      before: { type: Schema.Types.Mixed, default: null },
      after: { type: Schema.Types.Mixed, default: null },
    },
    requestId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

auditSchema.index({ eventId: 1, timestamp: -1 });
auditSchema.index({ guestId: 1, timestamp: -1 });
auditSchema.index({ actorId: 1, timestamp: -1 });

export const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);
