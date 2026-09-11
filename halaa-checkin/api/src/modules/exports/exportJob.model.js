/**
 * @halaa-checkin/api
 * ExportJob Mongoose Model.
 * Manages asynchronous PDF export jobs, leases, and private immutable snapshots.
 * Adheres to Technical Contract Sections 3 & 7.
 */

import mongoose from 'mongoose';
import {
  EXPORT_KIND_VALUES,
  EXPORT_SCOPE_VALUES,
  EXPORT_STATE_VALUES,
  LOCALE_VALUES,
} from '@halaa-checkin/contracts';

const { Schema } = mongoose;

const exportJobSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: EXPORT_KIND_VALUES,
      required: true,
    },
    locale: {
      type: String,
      enum: LOCALE_VALUES,
      required: true,
    },
    scope: {
      type: String,
      enum: EXPORT_SCOPE_VALUES,
      default: null,
    },
    guestIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Guest',
      default: undefined,
    },
    state: {
      type: String,
      enum: EXPORT_STATE_VALUES,
      default: 'queued',
      index: true,
    },
    snapshotAt: {
      type: Date,
      required: true,
    },
    snapshot: {
      type: Schema.Types.Mixed,
      required: false, // F21: explicitly unset on expiry for privacy
      select: false, // Private snapshot, omitted from ordinary queries
      default: undefined,
    },
    artifactBasename: {
      type: String,
      default: null,
    },
    artifactSize: {
      type: Number,
      default: null,
    },
    downloadFilename: {
      type: String,
      default: null,
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    leaseOwner: {
      type: String,
      default: null,
    },
    leaseUntil: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // F21: retention deletion — TTL removes the job after this time, while
    // 410 behavior is preserved until then.
    deleteAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes matching Technical Contract Section 3 & 7:
// 1. (eventId, createdAt) for listing export jobs
exportJobSchema.index({ eventId: 1, createdAt: -1 });

// 2. (createdBy, state) for queue bounds per admin
exportJobSchema.index({ createdBy: 1, state: 1 });

// 3. (state, createdAt) for worker queue processing
exportJobSchema.index({ state: 1, createdAt: 1 });

// 4. (expiresAt) for cleanup queries
exportJobSchema.index({ expiresAt: 1 });

// 5. Retention TTL: delete jobs after deleteAt (F21). Expired jobs keep 410
// until this retention deletion runs.
exportJobSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

exportJobSchema.methods.toSafeDto = function () {
  return {
    id: this._id.toString(),
    eventId: this.eventId.toString(),
    kind: this.kind,
    locale: this.locale,
    state: this.state,
    createdAt: this.createdAt.toISOString(),
    snapshotAt: this.snapshotAt.toISOString(),
    expiresAt: this.expiresAt.toISOString(),
    errorCode: this.errorCode || null,
    attempts: this.attempts,
  };
};

export const ExportJob =
  mongoose.models.ExportJob || mongoose.model('ExportJob', exportJobSchema);
