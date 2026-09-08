/**
 * @halaa-checkin/api
 * Guest Mongoose Model.
 * One document represents one invitation.
 * Adheres to Technical Contract Section 3.
 */

import mongoose from 'mongoose';
import { LIMITS } from '@halaa-checkin/contracts';

const { Schema } = mongoose;

const checkInSchema = new Schema(
  {
    actualCompanions: {
      type: Number,
      required: true,
      min: LIMITS.MIN_COMPANIONS_PER_GUEST,
      max: LIMITS.MAX_COMPANIONS_PER_GUEST,
    },
    checkedInAt: {
      type: Date,
      required: true,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    operatorName: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ['camera', 'scanner', 'manual'],
      required: true,
    },
  },
  { _id: false }
);

const guestSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: LIMITS.MAX_GUEST_NAME_LENGTH,
    },
    nameSearch: {
      type: String,
      required: true,
      index: true,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: LIMITS.MAX_REFERENCE_LENGTH,
      default: undefined,
    },
    referenceKey: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: LIMITS.MAX_REFERENCE_LENGTH,
      default: undefined,
    },
    allowedCompanions: {
      type: Number,
      required: true,
      min: LIMITS.MIN_COMPANIONS_PER_GUEST,
      max: LIMITS.MAX_COMPANIONS_PER_GUEST,
      default: 0,
    },
    companionNames: {
      type: [String],
      default: [],
    },
    qrToken: {
      type: String,
      required: true,
      select: false, // Excluded from ordinary queries by default
    },
    shortCode: {
      type: String,
      required: true,
      length: LIMITS.SHORT_CODE_LENGTH,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    checkIn: {
      type: checkInSchema,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes matching Technical Contract Section 3:
// 1. unique qrToken
guestSchema.index({ qrToken: 1 }, { unique: true });

// 2. unique (eventId, shortCode)
guestSchema.index({ eventId: 1, shortCode: 1 }, { unique: true });

// 3. partial unique (eventId, referenceKey) for non-deleted records with a supplied key
guestSchema.index(
  { eventId: 1, referenceKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      referenceKey: { $type: 'string' },
    },
  }
);

// 4. (eventId, deletedAt, nameSearch, _id) for listing and searching
guestSchema.index({ eventId: 1, deletedAt: 1, nameSearch: 1, _id: 1 });

// 5. (eventId, deletedAt, checkIn.checkedInAt) for recent admissions
guestSchema.index({ eventId: 1, deletedAt: 1, 'checkIn.checkedInAt': -1 });

guestSchema.methods.toSafeDto = function () {
  return {
    id: this._id.toString(),
    eventId: this.eventId.toString(),
    name: this.name,
    reference: this.reference ?? null,
    shortCode: this.shortCode,
    allowedCompanions: this.allowedCompanions,
    companionNames: this.companionNames || [],
    totalAllowed: 1 + this.allowedCompanions,
    version: this.version,
    checkIn: this.checkIn
      ? {
          actualCompanions: this.checkIn.actualCompanions,
          actualPartySize: 1 + this.checkIn.actualCompanions,
          checkedInAt: this.checkIn.checkedInAt.toISOString(),
          checkedInBy: this.checkIn.checkedInBy.toString(),
          operatorName: this.checkIn.operatorName,
          method: this.checkIn.method,
        }
      : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const Guest = mongoose.models.Guest || mongoose.model('Guest', guestSchema);
