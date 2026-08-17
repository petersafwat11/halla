/**
 * Guest Access Token Model
 * Manages access tokens for guests to view post-event content
 * Guests receive WhatsApp links with tokens to access post-event pages
 */

const mongoose = require("mongoose");
const crypto = require("crypto");

const guestAccessTokenSchema = new mongoose.Schema(
  {
    // Guest this token belongs to
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: [true, "Guest reference is required"],
      index: true,
    },

    // Event this token is for
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event reference is required"],
      index: true,
    },

    // Token type
    type: {
      type: String,
      enum: ["post_event", "invitation", "check_in"],
      default: "post_event",
    },

    // Unique access token
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Token expiration (30 days default for post-event, TTL index defined below)
    expiresAt: {
      type: Date,
      required: true,
    },

    // Usage tracking
    firstUsedAt: Date,
    lastUsedAt: Date,
    useCount: {
      type: Number,
      default: 0,
    },

    // Token status
    //
    // `revokedReason` distinguishes a rotation (host pressed "rotate QR")
    // from a manual revoke (host pressed "revoke QR"). The validation
    // middleware uses this to render `qr_rotated` vs `qr_revoked` in the
    // 410 Gone body.
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: Date,
    revokedReason: {
      type: String,
      enum: ['rotation', 'manual', 'admin', null],
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Device tracking for security
    devices: [
      {
        userAgent: String,
        ip: String,
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
guestAccessTokenSchema.index({ guest: 1, event: 1, type: 1 });
guestAccessTokenSchema.index({ token: 1, isRevoked: 1 });
guestAccessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// Static method to generate secure token
guestAccessTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

// Static method to create token for guest
guestAccessTokenSchema.statics.createForGuest = async function (
  guestId,
  eventId,
  type = "post_event",
  expiryDays = 30
) {
  const token = this.generateToken();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  // Check for existing valid token
  const existing = await this.findOne({
    guest: guestId,
    event: eventId,
    type,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (existing) {
    return existing;
  }

  return this.create({
    guest: guestId,
    event: eventId,
    type,
    token,
    expiresAt,
  });
};

// Static method to create tokens for all event guests
guestAccessTokenSchema.statics.createForAllGuests = async function (
  eventId,
  type = "post_event",
  expiryDays = 30
) {
  const Event = require("./EventModel");
  const event = await Event.findById(eventId).populate("guestList");

  if (!event || !event.guestList?.length) {
    return { created: 0, tokens: [] };
  }

  const tokens = [];
  for (const guest of event.guestList) {
    const tokenDoc = await this.createForGuest(
      guest._id,
      eventId,
      type,
      expiryDays
    );
    tokens.push({
      guestId: guest._id,
      guestName: guest.name,
      guestPhone: guest.phone,
      token: tokenDoc.token,
    });
  }

  return { created: tokens.length, tokens };
};

// Static method to validate token.
//
// The failure response carries a structured `reason` string (`qr_rotated`
// | `qr_revoked` | `qr_expired` | `qr_invalid`) so the controller can
// return 410 Gone with a precise body.
guestAccessTokenSchema.statics.validateToken = async function (
  token,
  deviceInfo = {}
) {
  // Look up by token alone first so we can tell the caller *why* a token
  // is invalid (revoked vs expired vs unknown).
  const candidate = await this.findOne({ token })
    .populate("guest", "name phone email status")
    .populate("event", "eventDetails host status");

  if (!candidate) {
    return { valid: false, reason: "qr_invalid", message: "Token not found" };
  }

  if (candidate.isRevoked) {
    const reason =
      candidate.revokedReason === "rotation" ? "qr_rotated" : "qr_revoked";
    return {
      valid: false,
      reason,
      message:
        reason === "qr_rotated"
          ? "This QR has been rotated; the guest has a newer one"
          : "This QR has been revoked",
    };
  }

  if (candidate.expiresAt && candidate.expiresAt <= new Date()) {
    return {
      valid: false,
      reason: "qr_expired",
      message: "This QR has expired",
    };
  }

  const tokenDoc = candidate;

  // Update usage stats
  const now = new Date();
  if (!tokenDoc.firstUsedAt) {
    tokenDoc.firstUsedAt = now;
  }
  tokenDoc.lastUsedAt = now;
  tokenDoc.useCount += 1;

  // Track device
  if (deviceInfo.userAgent || deviceInfo.ip) {
    tokenDoc.devices.push({
      userAgent: deviceInfo.userAgent,
      ip: deviceInfo.ip,
      usedAt: now,
    });
    // Keep only last 10 devices
    if (tokenDoc.devices.length > 10) {
      tokenDoc.devices = tokenDoc.devices.slice(-10);
    }
  }

  await tokenDoc.save();

  return {
    valid: true,
    tokenDoc,
    guest: tokenDoc.guest,
    event: tokenDoc.event,
  };
};

// Static method to get token link
guestAccessTokenSchema.statics.getTokenLink = function (
  token,
  type = "post_event",
  lang = "ar"
) {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const path = type === "post_event" ? "post-event" : "staff";
  return `${baseUrl}/${lang}/${path}?token=${token}`;
};

// Instance method to revoke
guestAccessTokenSchema.methods.revoke = async function (reason = null) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  if (reason) this.revokedReason = reason;
  return this.save();
};

// Static method to revoke all tokens for event
guestAccessTokenSchema.statics.revokeAllForEvent = async function (
  eventId,
  type = null,
  reason = null
) {
  const query = { event: eventId, isRevoked: false };
  if (type) query.type = type;

  return this.updateMany(query, {
    isRevoked: true,
    revokedAt: new Date(),
    ...(reason && { revokedReason: reason }),
  });
};

const GuestAccessToken = mongoose.model(
  "GuestAccessToken",
  guestAccessTokenSchema
);

module.exports = GuestAccessToken;
