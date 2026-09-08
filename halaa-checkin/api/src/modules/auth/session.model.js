/**
 * @halaa-checkin/api
 * Session Mongoose Model.
 * Stores cryptographically secure SHA-256 digests of session tokens with TTL.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const sessionSchema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    csrfToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);


/**
 * Find active session by token hash, enforcing runtime expiry.
 *
 * @param {string} tokenHash
 * @returns {Promise<Document | null>}
 */
sessionSchema.statics.findActiveByTokenHash = function (tokenHash) {
  return this.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
};

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
