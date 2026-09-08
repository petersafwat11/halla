/**
 * @halaa-checkin/api
 * Event Mongoose Model.
 * Foundation for event lifecycle, versioning, and transaction serialization fence.
 */

import mongoose from 'mongoose';
import { EVENT_STATUSES, EVENT_STATUS_VALUES, EVENT_TIMEZONE } from '@halaa-checkin/contracts';

const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: EVENT_TIMEZONE,
      required: true,
    },
    status: {
      type: String,
      enum: EVENT_STATUS_VALUES,
      default: EVENT_STATUSES.DRAFT,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    activitySeq: {
      type: Number,
      default: 0,
      min: 0,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for listing events in chronological order (most recent first)
eventSchema.index({ startsAt: -1, createdAt: -1 });

eventSchema.methods.toSafeDto = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    venue: this.venue,
    startsAt: this.startsAt.toISOString(),
    timezone: this.timezone,
    status: this.status,
    version: this.version,
    activitySeq: this.activitySeq,
    closedAt: this.closedAt ? this.closedAt.toISOString() : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
