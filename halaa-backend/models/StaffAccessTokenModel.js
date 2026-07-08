/**
 * Staff Access Token Model
 * Manages temporary access tokens for event staff members
 * Staff receive WhatsApp links with tokens to access the staff portal
 */

const mongoose = require("mongoose");
const crypto = require("crypto");

const staffAccessTokenSchema = new mongoose.Schema(
  {
    // Event this token is for
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event reference is required"],
      index: true,
    },

    // Staff phone number (matches staffList entry)
    phone: {
      type: String,
      required: [true, "Staff phone number is required"],
      trim: true,
    },

    // Staff name (from staffList)
    staffName: {
      type: String,
      required: true,
      trim: true,
    },

    // Unique access token
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Token expiration (TTL index defined below)
    expiresAt: {
      type: Date,
      required: true,
    },

    // Usage tracking
    lastUsedAt: Date,
    useCount: {
      type: Number,
      default: 0,
    },

    // Token status
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Device info for security
    lastDeviceInfo: {
      userAgent: String,
      ip: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
staffAccessTokenSchema.index({ event: 1, phone: 1 });
staffAccessTokenSchema.index({ token: 1, isRevoked: 1 });
staffAccessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to generate a secure token
staffAccessTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

// Static method to create token for staff
staffAccessTokenSchema.statics.createForStaff = async function (
  eventId,
  phone,
  staffName,
  expiryHours = 48
) {
  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // Revoke any existing tokens for this staff member on this event
  await this.updateMany(
    { event: eventId, phone, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );

  return this.create({
    event: eventId,
    phone,
    staffName,
    token,
    expiresAt,
  });
};

// Static method to validate token.
//
// Structured reason codes let the scanner / staff frontend render distinct UX
// (revoked → "your access was revoked", expired → "your shift access expired",
// invalid → "this code is not recognised").
staffAccessTokenSchema.statics.validateToken = async function (token) {
  if (!token || typeof token !== "string") {
    return {
      valid: false,
      reason: "staff_invalid",
      message: "Token is missing or malformed",
    };
  }

  const tokenDoc = await this.findOne({ token }).populate(
    "event",
    "eventDetails host status"
  );

  if (!tokenDoc) {
    return {
      valid: false,
      reason: "staff_invalid",
      message: "Token not recognised",
    };
  }

  if (tokenDoc.isRevoked) {
    return {
      valid: false,
      reason: "staff_revoked",
      message: "Staff access has been revoked",
      revokedAt: tokenDoc.revokedAt || null,
    };
  }

  if (tokenDoc.expiresAt && tokenDoc.expiresAt.getTime() <= Date.now()) {
    return {
      valid: false,
      reason: "staff_expired",
      message: "Staff access has expired",
      expiresAt: tokenDoc.expiresAt,
    };
  }

  // Update usage stats. Save errors are non-fatal — log + proceed.
  tokenDoc.lastUsedAt = new Date();
  tokenDoc.useCount += 1;
  try {
    await tokenDoc.save();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[StaffAccessToken] usage-stat save failed:",
      err?.message || err
    );
  }

  return {
    valid: true,
    staffToken: tokenDoc,
    event: tokenDoc.event,
  };
};

// Instance method to revoke token
staffAccessTokenSchema.methods.revoke = async function (revokedBy = null) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  if (revokedBy) this.revokedBy = revokedBy;
  return this.save();
};

// Static method to revoke all tokens for an event
staffAccessTokenSchema.statics.revokeAllForEvent = async function (
  eventId,
  revokedBy = null
) {
  return this.updateMany(
    { event: eventId, isRevoked: false },
    {
      isRevoked: true,
      revokedAt: new Date(),
      ...(revokedBy && { revokedBy }),
    }
  );
};

const StaffAccessToken = mongoose.model(
  "StaffAccessToken",
  staffAccessTokenSchema
);

module.exports = StaffAccessToken;
