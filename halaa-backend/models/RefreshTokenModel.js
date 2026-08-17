/**
 * RefreshToken Model
 *
 * Server-side store for the refresh half of the access/refresh token pair.
 *
 * Design notes:
 * - The token value itself is never stored. We only persist `tokenHash` so a
 *   database leak does not expose live credentials.
 * - Rotation is mandatory: every successful `/auth/refresh` revokes the
 *   incoming token and issues a new one. The old document keeps `replacedBy`
 *   pointing to the new one for audit / replay-detection.
 * - Re-use of an already-revoked token implies a leak. Callers are expected
 *   to revoke the entire family (`revokeAllForUser`) when this happens.
 * - Mongo TTL index on `expiresAt` cleans up expired rows automatically.
 */

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: { type: Date, default: null },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null,
    },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index to make user-scoped active-token lookups O(log n).
// `revokeAllForUser` and the replay-detection follow-up both filter by
// `{ userId, revokedAt: null }`; without this index they fall back to a
// userId-only scan that walks revoked rows too.
refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

refreshTokenSchema.methods.isActive = function () {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
