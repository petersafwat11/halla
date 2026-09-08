/**
 * @halaa-checkin/api
 * Idempotency Mongoose Model.
 * Provides durable request deduplication and response playback.
 * Adheres to Technical Contract Sections 3–5.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const idempotencySchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    operation: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    requestHash: {
      type: String,
      required: true,
    },
    response: {
      status: {
        type: Number,
        required: true,
      },
      body: {
        type: Schema.Types.Mixed,
        required: true,
      },
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring an operation cannot be duplicated
idempotencySchema.index(
  { actorId: 1, operation: 1, eventId: 1, key: 1 },
  { unique: true }
);

export const Idempotency =
  mongoose.models.Idempotency || mongoose.model('Idempotency', idempotencySchema);
