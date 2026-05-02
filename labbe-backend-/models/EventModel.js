const mongoose = require("mongoose");
const { EVENT_STATUS } = require("../src/shared/constants");

// Staff sub-schema (specific to events, not a separate model)
const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supervisor name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Supervisor phone number is required"],
      trim: true,
      length: [9, "Phone number must be 9 digits"],
    },
  },

  {
    _id: true,
    timestamps: true,
  }
);

// Location sub-schema (specific to events)
const locationSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, "Latitude is required"],
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    longitude: {
      type: Number,
      required: [true, "Longitude is required"],
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Template sub-schema — aligned with Taqnyat template format
const templateSchema = new mongoose.Schema(
  {
    id: { type: String },              // Taqnyat template ID
    name: { type: String },            // Taqnyat template name — used as templateName when sending
    image: { type: String },           // Preview/header image URL
    bodyText: { type: String },        // Template body preview text
    hasImageHeader: { type: Boolean, default: false }, // true if template has an IMAGE header component
  },
  { _id: false }
);

// Event Details sub-schema
const eventDetailsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      // required: [true, "Event title is required"],
      trim: true,
      maxlength: [200, "Event title cannot exceed 200 characters"],
    },
    type: {
      type: String,
      enum: [
        "wedding",
        "birthday",
        "graduation",
        "engagement",
        "meeting",
        "conference",
        "other",
      ],
      required: [true, "Event type is required"],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    time: {
      type: String,
      required: [true, "Event time is required"],
      trim: true,
    },
    location: {
      type: locationSchema,
      required: [true, "Event location is required"],
    },
    // description: {
    //   type: String,
    //   trim: true,
    //   maxlength: [1000, "Event description cannot exceed 1000 characters"],
    // },
  },
  { _id: false }
);

// Visual template customization data sub-schema (TemplateForm fields)
const visualTemplateDataSchema = new mongoose.Schema(
  {
    messageText: String,
    brideName: String,
    groomName: String,
    guestMessage: String,
    entryDate: String,
    entryTime: String,
    address: String,
    endMessage: String,
    fontType: String,
    primaryColor: String,
  },
  { _id: false }
);

// Visual template sub-schema — the card design chosen and customized in Step 3
const visualTemplateSchema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    src: String,
    data: visualTemplateDataSchema,
  },
  { _id: false }
);

// Invitation Settings sub-schema
const invitationSettingsSchema = new mongoose.Schema(
  {
    // Taqnyat template chosen by host — name is used as templateName when sending
    selectedTemplate: templateSchema,
    // Visual invitation card template customized in Step 3
    visualTemplate: visualTemplateSchema,
    // RSVP auto-reply messages (sent back to guest after button press)
    attendanceAutoReply: String,
    absenceAutoReply: String,
    expectedAttendanceAutoReply: String,
    // Header image uploaded by host (S3/local URL)
    templateImage: String,
    note: String,
  },
  { _id: false }
);

// Launch Settings sub-schema
const launchSettingsSchema = new mongoose.Schema(
  {
    scheduledDate: Date,
    scheduledTime: String,
    // deleteId returned by Taqnyat when SMS is natively scheduled — used to cancel before delivery
    taqnyatDeleteId: Number,
  },
  { _id: false }
);


// Messaging Status sub-schema (for tracking invitation sending)
const messagingStatusSchema = new mongoose.Schema(
  {
    // Preferred channel for sending
    preferredChannel: {
      type: String,
      enum: ['sms', 'whatsapp'],
      default: 'sms',
    },
    // Has bulk send started
    bulkSendStarted: {
      type: Boolean,
      default: false,
    },
    // Bulk send started at
    bulkSendStartedAt: Date,
    // Bulk send completed at
    bulkSendCompletedAt: Date,
    // Total messages to send
    totalMessages: {
      type: Number,
      default: 0,
    },
    // Messages sent successfully
    sentCount: {
      type: Number,
      default: 0,
    },
    // Messages failed
    failedCount: {
      type: Number,
      default: 0,
    },
    // Messages pending
    pendingCount: {
      type: Number,
      default: 0,
    },
    // True after the 24h reminder job has fired for this event (prevents double-send)
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Main Event Schema
const eventSchema = new mongoose.Schema(
  {
    // Event Details
    eventDetails: {
      type: eventDetailsSchema,
      required: [true, "Event details are required"],
    },

    // Guest List - Reference to existing Guest model
    guestList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Guest",
      },
    ],

    // Staff List (event-specific, not a separate model)
    staffList: [staffSchema],

    // Invitation Settings
    invitationSettings: invitationSettingsSchema,

    // Launch Settings
    launchSettings: launchSettingsSchema,

    // Event Host - Reference to User model
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Event must belong to a host"],
    },

    // Multi-tenant support
    whitelabelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhiteLabel",
      default: null,
    },

    // Subscription that created this event (for usage tracking)
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    // Plan reference (for quick access to limits without populating subscription)
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },

    // Package type: event (single event), subscription (monthly)
    packageType: {
      type: String,
      enum: ["event", "subscription"],
      default: "subscription",
    },

    // Max guests allowed for this event (frozen from subscription at creation time)
    // null = legacy event (use current subscription limit as fallback)
    guestLimit: {
      type: Number,
      default: null,
    },

    // Track who created the event
    createdBy: {
      // The user who actually created the event (could be admin creating on behalf of host)
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      // Role of the creator at time of creation
      role: {
        type: String,
        enum: [
          "host",
          "whitelabel_admin",
          "whitelabel_moderator",
          "admin",
          "super_admin",
          "moderator",
        ],
        default: "host",
      },
      // Was this event created on behalf of another user?
      onBehalfOf: {
        type: Boolean,
        default: false,
      },
      // Timestamp when created
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },

    // Track who the event was created FOR (target user)
    createdFor: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      // Role of the target user at time of creation
      role: {
        type: String,
        enum: [
          "host",
          "whitelabel_admin",
          "whitelabel_moderator",
          "admin",
          "super_admin",
          "moderator",
        ],
      },
      // Is this event created for self or another user?
      isSelf: {
        type: Boolean,
        default: true,
      },
    },

    // Event Status
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
    },

    // Tracks the status before suspension so it can be restored on reactivation
    previousStatus: {
      type: String,
      enum: [...Object.values(EVENT_STATUS), null],
      default: null,
    },

    // Test Message Status
    testMessageSent: {
      type: Boolean,
      default: false,
    },


    // Messaging Status (for bulk sending tracking)
    messagingStatus: {
      type: messagingStatusSchema,
      default: () => ({}),
    },
    // Note: Guest statistics are calculated dynamically from populated guestList
    // No need to store redundant guestStats - use guestList.length and filter by status
  },
  {
    timestamps: true,
    collection: "events",
  }
);

// Indexes for better performance
eventSchema.index({ host: 1 }); // For finding events by host
eventSchema.index({ whitelabelId: 1 }); // For multi-tenant filtering
eventSchema.index({ whitelabelId: 1, host: 1 });
eventSchema.index({ whitelabelId: 1, status: 1 });
eventSchema.index({ "eventDetails.date": 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ "eventDetails.type": 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ "createdBy.user": 1 }); // For permission checks
eventSchema.index({ "createdFor.user": 1 }); // For finding events created for a user
eventSchema.index({ subscriptionId: 1 }); // For subscription usage tracking
eventSchema.index({ planId: 1 }); // For plan-based queries
eventSchema.index({ packageType: 1 }); // For package type filtering

// Virtual for checking if event is upcoming
eventSchema.virtual("isUpcoming").get(function () {
  return this.eventDetails.date > new Date();
});

// Virtual for checking if event is past
eventSchema.virtual("isPast").get(function () {
  return this.eventDetails.date < new Date();
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Validate package limits before saving event
 */
eventSchema.pre("save", async function (next) {
  // Only validate on new events
  if (!this.isNew) {
    return next();
  }

  try {
    // If subscription is provided, validate limits
    if (this.subscriptionId) {
      const Subscription = mongoose.model("Subscription");
      const subscription = await Subscription.findById(
        this.subscriptionId
      ).populate("planId");

      if (!subscription) {
        return next(new Error("Subscription not found"));
      }

      // Check if subscription is active
      if (!subscription.isActive) {
        return next(new Error("Subscription is not active"));
      }

      // Check if can create event
      const canCreate = subscription.canCreateEvent();
      if (!canCreate.allowed) {
        return next(new Error(canCreate.reason || "Cannot create event"));
      }

      // Set planId from subscription if not already set
      if (!this.planId && subscription.planId) {
        this.planId = subscription.planId._id || subscription.planId;
      }

      // Set packageType from subscription if not already set
      if (!this.packageType && subscription.packageType) {
        this.packageType = subscription.packageType;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Validate package limits for this event
 * @returns {Promise<Object>} { valid: boolean, errors: string[] }
 */
eventSchema.methods.validatePackageLimits = async function () {
  const errors = [];

  // If no subscription, skip validation
  if (!this.subscriptionId) {
    return { valid: true, errors: [] };
  }

  try {
    const Subscription = mongoose.model("Subscription");
    const subscription = await Subscription.findById(
      this.subscriptionId
    ).populate("planId");

    if (!subscription) {
      errors.push("Subscription not found");
      return { valid: false, errors };
    }

    // Check if subscription is active
    if (!subscription.isActive) {
      errors.push("Subscription is not active");
    }

    // Check guest count limits
    const guestCount = this.guestList?.length || 0;
    const canAddGuests = subscription.canAddGuests(guestCount);
    if (!canAddGuests.allowed) {
      errors.push(
        canAddGuests.reason ||
        `Guest limit exceeded. Maximum ${canAddGuests.maxAllowed} guests allowed.`
      );
    }

    // Check moderator limits (staff)
    const moderatorCount = this.staffList?.length || 0;
    const maxModerators = subscription.limits?.maxModerators || 0;
    if (maxModerators > 0 && moderatorCount > maxModerators) {
      errors.push(
        `Moderator limit exceeded. Maximum ${maxModerators} moderators allowed.`
      );
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(error.message);
    return { valid: false, errors };
  }
};

// Static method to find events by host
eventSchema.statics.findByHost = function (hostId) {
  return this.find({ host: hostId })
    .populate("host", "username email phoneNumber")
    .populate("guestList", "name email phone status")
    .sort({ "eventDetails.date": -1 });
};

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function (hostId = null) {
  const query = { "eventDetails.date": { $gt: new Date() } };
  if (hostId) query.host = hostId;
  return this.find(query)
    .populate("host", "username email phoneNumber")
    .populate("guestList", "name email phone status")
    .sort({ "eventDetails.date": 1 });
};

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
