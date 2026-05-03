const mongoose = require("mongoose");
const { GUEST_STATUS, RSVP_STATUS } = require("../src/shared/constants");

const guestSchema = new mongoose.Schema(
  {
    // Who added this guest (unified User model)
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Guest Basic Information
    name: {
      type: String,
      required: [true, "Guest name is required"],
      trim: true,
      maxlength: [100, "Guest name cannot exceed 100 characters"],
    },

    // Contact Information - At least one of phone or email must be provided
    phone: {
      type: String,
      trim: true,
      length: [9, "Phone number must be 9 digits"],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (value) {
          // If email is provided, validate format
          if (value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          }
          return true; // Allow empty if phone is provided
        },
        message: "Please provide a valid email address",
      },
    },

    // Event Reference
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Guest must be associated with an event"],
    },

    // QR Code (optional)
    qrcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null values
    },

    // Guest Status
    status: {
      type: String,
      enum: Object.values(GUEST_STATUS),
      required: [true, "Guest status is required"],
      default: GUEST_STATUS.INVITED,
    },

    // Who invited this guest
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // RSVP Information
    rsvp: {
      responded: {
        type: Boolean,
        default: false,
      },
      respondedAt: {
        type: Date,
      },
    },

    // Check-in Information
    checkIn: {
      checkedIn: {
        type: Boolean,
        default: false,
      },
      checkedInAt: {
        type: Date,
      },
      // H-21: record who performed the check-in. Could be a Host (event
      // owner self-checkin), a Staff token (no User ref — `checkedInByStaff`
      // captures the StaffAccessToken `_id` and staff name in that case),
      // or an admin. The User ref handles the first and third; staff is
      // captured separately because the staff scanner authenticates with a
      // StaffAccessToken, not a User.
      checkedInBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      checkedInByStaff: {
        token: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "StaffAccessToken",
          default: null,
        },
        name: {
          type: String,
          default: null,
        },
        phone: {
          type: String,
          default: null,
        },
      },
    },

    // Invitation Information
    invitation: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: {
        type: Date,
      },
      // Attempted channel (what we tried to send via)
      method: {
        type: String,
        enum: ["email", "sms", "whatsapp"],
      },
      // Actual delivery channel — may differ from method when WhatsApp falls back to SMS.
      // Updated to 'sms' by the webhook when Taqnyat reports no_capability for the WA leg.
      effectiveChannel: {
        type: String,
        enum: ["email", "sms", "whatsapp"],
      },
      // True when WhatsApp was attempted but SMS was used as fallback
      smsFallback: {
        type: Boolean,
        default: false,
      },
      messageId: {
        type: String,
      },
      status: {
        type: String,
        enum: ["pending", "sent", "delivered", "read", "failed"],
        default: "pending",
      },
      statusUpdatedAt: {
        type: Date,
      },
      deliveredAt: {
        type: Date,
      },
      readAt: {
        type: Date,
      },
      failedAttempts: {
        type: Number,
        default: 0,
      },
      lastAttemptAt: {
        type: Date,
      },
      lastError: {
        type: String,
      },
      reminderSentAt: {
        type: Date,
      },
      reminderCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    collection: "guests",
  }
);

// Custom validation to ensure at least one of phone or email is provided
guestSchema.pre("validate", function (next) {
  if (!this.phone && !this.email) {
    const error = new Error("Either phone number or email address is required");
    error.path = "contact";
    return next(error);
  }
  next();
});

// Generate QR code before saving if not provided
guestSchema.pre("save", function (next) {
  if (!this.qrcode && this.isNew) {
    // Generate a unique QR code value
    this.qrcode = `guest_${this._id}_${Date.now()}`;
  }
  next();
});

// Update RSVP information when status changes
guestSchema.pre("save", function (next) {
  if (this.isModified("status") && !this.rsvp.responded) {
    if (["confirmed", "declined"].includes(this.status)) {
      this.rsvp.responded = true;
      this.rsvp.respondedAt = new Date();
    }
  }
  next();
});

// Indexes for better performance
guestSchema.index({ event: 1 });
guestSchema.index({ status: 1 });
guestSchema.index({ email: 1 });
guestSchema.index({ phone: 1 });
// Note: qrcode has unique: true in schema, no separate index needed
guestSchema.index({ "checkIn.checkedIn": 1 });
guestSchema.index({ createdAt: -1 });

// Compound indexes
guestSchema.index({ event: 1, status: 1 });
guestSchema.index({ event: 1, "checkIn.checkedIn": 1 });

// Virtual for full contact info
guestSchema.virtual("contactInfo").get(function () {
  const contact = [];
  if (this.email) contact.push(`Email: ${this.email}`);
  if (this.phone) contact.push(`Phone: ${this.phone}`);
  return contact.join(" | ");
});

// Virtual for checking if guest has responded
guestSchema.virtual("hasResponded").get(function () {
  return this.rsvp.responded;
});

// Static method to find guests by event
guestSchema.statics.findByEvent = function (eventId) {
  return this.find({ event: eventId }).populate("event", "title startDate");
};

// Static method to find guests by status
guestSchema.statics.findByStatus = function (status, eventId = null) {
  const query = { status };
  if (eventId) query.event = eventId;
  return this.find(query).populate("event", "title startDate");
};

// Static method to get guest statistics for an event
guestSchema.statics.getEventStats = async function (eventId) {
  const stats = await this.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    invited: 0,
    confirmed: 0,
    declined: 0,
    attended: 0,
    "no-show": 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// M-25: removed dead `performCheckIn` instance method. It set
// `status = 'attended'` which is NOT a value in GUEST_STATUS — any caller
// would have thrown on save. Check-in now goes exclusively through
// `staffService._performIdempotentCheckIn` which uses the atomic CAS on
// `status` and records the actor in `checkIn.checkedInBy` /
// `checkIn.checkedInByStaff` (H-21).

// Instance method to send invitation
guestSchema.methods.sendInvitation = function (method = "email") {
  this.invitation.sent = true;
  this.invitation.sentAt = new Date();
  this.invitation.method = method;
  return this.save();
};

// Instance method to respond to RSVP
guestSchema.methods.respondToRSVP = function (status, message = "") {
  const validStatuses = Object.values(GUEST_STATUS);
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid guest status: ${status}`);
  }
  this.status = status;
  this.rsvp.responded = true;
  this.rsvp.respondedAt = new Date();
  return this.save();
};

const Guest = mongoose.model("Guest", guestSchema);

module.exports = Guest;
