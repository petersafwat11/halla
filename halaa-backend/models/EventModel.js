const mongoose = require("mongoose");
const { EVENT_CATEGORY_VALUES } = require("../src/shared/constants");
const { EVENT_STATUS, SUPERVISOR_STATUS, INVITATION_TYPE } = require("../src/shared/constants");
const { isPerEventPlan } = require("../src/shared/constants/plans");
const { mongoosePhoneValidator } = require("../src/shared/utils/phone");

// Statuses that FREE the per-event single-active-event slot (the event no
// longer counts as "active" for re-creation purposes).
const PER_EVENT_SLOT_FREEING_STATUSES = [
  EVENT_STATUS.CANCELLED,
  EVENT_STATUS.DELETED,
  EVENT_STATUS.COMPLETED,
];

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
      validate: {
        validator: mongoosePhoneValidator,
        message: "Invalid supervisor phone number format",
      },
    },
    status: {
      type: String,
      enum: Object.values(SUPERVISOR_STATUS),
      default: SUPERVISOR_STATUS.ACTIVE,
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
    placeId: {
      type: String,
      trim: true,
      maxlength: [300, "Place ID cannot exceed 300 characters"],
    },
    provider: {
      type: String,
      enum: ["google", "device", "manual"],
      default: "google",
    },
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
      enum: EVENT_CATEGORY_VALUES,
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

// Canonical visual template shape — the host's StepThree submission:
//   - templateRef:     ObjectId reference to TemplateModel
//   - fieldValues:     map of { [fieldKey]: value } — host's per-field
//                      input, validated server-side via templateDataValidator
//   - bakedImagePath:  S3 key/URL for the canvas-baked WhatsApp header.
//                      Web bakes via html2canvas; mobile via
//                      react-native-view-shot.
//   - isCustomUpload:  true when the host uploaded their own invitation
//                      image directly (no predefined template / no form
//                      fields). In that mode templateRef + fieldValues
//                      are unset and bakedImagePath stores the uploaded
//                      asset URL.
const canonicalVisualTemplateSchema = new mongoose.Schema(
  {
    templateRef: { type: mongoose.Schema.Types.ObjectId, ref: "Template" },
    fieldValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    bakedImagePath: String,
    isCustomUpload: { type: Boolean, default: false },
  },
  { _id: false }
);

// Taqnyat-side template selection (pre-approved WhatsApp template).
// Refs the TaqnyatTemplate cache.
const canonicalTaqnyatTemplateSchema = new mongoose.Schema(
  {
    templateRef: { type: mongoose.Schema.Types.ObjectId, ref: "TaqnyatTemplate" },
  },
  { _id: false }
);

// Auto-replies — names match the WhatsApp button → status mapping in
// `messaging.service.handleButtonResponse`:
//   onAttend  ⇄ confirmed (سأحضر)
//   onAbsent  ⇄ declined  (سأعتذر)
const guestRepliesSchema = new mongoose.Schema(
  {
    onAttend: String,
    onAbsent: String,
  },
  { _id: false }
);

// Launch Settings sub-schema
//
// There is no `taqnyatDeleteId` field — every event launches via the cron
// regardless of channel. If a legacy document still has `taqnyatDeleteId`
// in the database, Mongoose will quietly ignore it on read; no migration is
// needed.
const launchSettingsSchema = new mongoose.Schema(
  {
    scheduledDate: Date,
    scheduledTime: String,
  },
  { _id: false }
);

// Reminder Settings sub-schema
const reminderSettingsSchema = new mongoose.Schema(
  {
    customReminderTime: {
      type: Boolean,
      default: false,
    },
    scheduledDate: {
      type: Date,
    },
    scheduledTime: {
      type: String,
      trim: true,
    },
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
    // Staff SMS send failures (separate from guest failures)
    staffFailedCount: {
      type: Number,
      default: 0,
    },
    // Messages pending
    pendingCount: {
      type: Number,
      default: 0,
    },
    // True after the 48h reminder job has fired for this event (prevents double-send)
    reminderSent: {
      type: Boolean,
      default: false,
    },
    // Overall delivery status for batch sending
    deliveryStatus: {
      type: String,
      enum: ['pending', 'delivering', 'delivered', 'partial_delivery_failed', null],
      default: null,
    },
    // Timestamp when launch retries were exhausted
    deliveryExhaustedAt: Date,
    // Last delivery error description
    lastError: String,
    // Status of partial failure notifications to host/admin
    failureNotificationStatus: {
      type: String,
      enum: ['pending', 'failed', 'sent', null],
      default: null,
    },
    failureNotificationSentAt: Date,
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

    // Canonical invitation shape (Step 3 visual + Step 4 Taqnyat +
    // auto-replies).
    visualTemplate: canonicalVisualTemplateSchema,
    taqnyatTemplate: canonicalTaqnyatTemplateSchema,
    guestReplies: guestRepliesSchema,
    // Invitation type (Step 4) — controls whether guests can reply
    // (confirm/decline) and whether confirmation sends a QR entry code. Consumed by
    // the RSVP webhook, the web RSVP portal, and the entry-pass/QR delivery.
    // Default preserves the legacy behavior (reply buttons + QR on confirm).
    invitationType: {
      type: String,
      enum: Object.values(INVITATION_TYPE),
      default: INVITATION_TYPE.REPLY_AND_QR,
    },
    // Header image uploaded by host (S3/local URL). Optional fallback
    // when the canvas-bake on the client fails — backend reads
    // `visualTemplate.bakedImagePath` first.
    templateImage: String,

    // Launch Settings
    launchSettings: launchSettingsSchema,

    // Reminder Settings
    reminderSettings: {
      type: reminderSettingsSchema,
      default: () => ({ customReminderTime: false }),
    },

    // Event Host - Reference to User model
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Event must belong to a host"],
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

    // ─── Business-account branding + delivery SNAPSHOT
    // Server-owned, snapshotted at creation, NEVER read live and NEVER client-
    // submitted. For business hosts the logo is copied to an event-owned
    // immutable S3 key and the business NAME is snapshotted too, so a later
    // rename/logo-swap does not change already-issued invitations.
    branding: {
      logoKey: { type: String, default: null }, // event-owned S3 key (signed on read)
      businessName: { type: String, default: null },
    },
    // Deterministic delivery mode (no per-business choice v1):
    //   personal event → 'quick_reply'; business event → 'portal_link'.
    invitationDeliveryMode: {
      type: String,
      enum: ["quick_reply", "portal_link", null],
      default: null,
    },
    // Snapshot of the provider template id/version/capability used to send.
    invitationTemplate: {
      id: { type: String, default: null },
      version: { type: String, default: null },
      provider: { type: String, default: null },
    },

    // Per-event single-active-event guard. Set to `subscriptionId` ONLY while a
    // per-event plan's event occupies the slot (i.e. not cancelled/deleted/
    // completed); null otherwise and for all pool plans. A partial UNIQUE index
    // on this field makes "at most one active event per per-event subscription"
    // an atomic DB invariant, closing the create→create TOCTOU race that a
    // countDocuments pre-check cannot. Maintained by the pre-save hooks below
    // and cleared by the hook-bypassing soft-delete writes.
    perEventGuardKey: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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
      default: EVENT_STATUS.PENDING_SCHEDULING,
    },

    // Tracks the status before suspension so it can be restored on reactivation
    previousStatus: {
      type: String,
      enum: [...Object.values(EVENT_STATUS), null],
      default: null,
    },

    // Soft-delete timestamp. Set alongside `status = 'deleted'` by the host
    // and admin delete paths (events.crud.service / admin.events.service).
    // Events are soft-deleted (never hard-removed) so guests, QR codes, and
    // history are preserved; this field records when the deletion happened.
    deletedAt: {
      type: Date,
      default: null,
    },

    // Test Message Status
    testMessageSent: {
      type: Boolean,
      default: false,
    },
    // SHA-256 fingerprint of the message content tested
    testMessageFingerprint: {
      type: String,
      default: null,
    },
    // last test message timestamp for per-event throttle
    lastTestAt: { type: Date },

    // Messaging Status (for bulk sending tracking)
    messagingStatus: {
      type: messagingStatusSchema,
      default: () => ({}),
    },

    // ---------- launch lifecycle tracking ----------

    // Cron worker lock. Set when a cron tick begins a bulk
    // send for this event so a parallel tick can't start a second send.
    // Cleared when the send finishes (success or failure). A lock older
    // than 10 minutes is treated as stale and forcibly retaken.
    launchLock: {
      lockedAt: Date,
      lockedBy: String,
    },

    // Launch attempt tracking. Incremented on every retry
    // attempt; reset to 0 by the manual-retry endpoint.
    attemptCount: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: Date,
    failureReason: String,

    // Set on successful launch (status → 'live')
    launchedAt: Date,

    // Set when status transitions to 'completed'
    completedAt: {
      type: Date,
      default: null,
    },
    // Status of automatic completion notification to host
    completionNotificationStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', null],
      default: null,
    },
    completionNotifiedAt: {
      type: Date,
      default: null,
    },

    // Set when status transitions to 'failed'
    failedAt: Date,
  },
  {
    timestamps: true,
    collection: "events",
  }
);

// Indexes for better performance
eventSchema.index({ host: 1 }); // For finding events by host
eventSchema.index({ "eventDetails.date": 1 });
eventSchema.index({ "reminderSettings.scheduledDate": 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ "eventDetails.type": 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ "createdBy.user": 1 }); // For permission checks
eventSchema.index({ "createdFor.user": 1 }); // For finding events created for a user
eventSchema.index({ subscriptionId: 1 }); // For subscription usage tracking
eventSchema.index({ planId: 1 }); // For plan-based queries
eventSchema.index({ packageType: 1 }); // For package type filtering

// Atomic "one active event per per-event subscription" guard. Partial so it
// only applies to rows where the guard key is actually set (active per-event
// events) — pool plans and freed/cancelled/deleted events keep it null and are
// unaffected. Two concurrent per-event creates resolve to a single winner; the
// loser gets an E11000 the create path translates into a typed 409 conflict.
eventSchema.index(
  { perEventGuardKey: 1 },
  {
    unique: true,
    partialFilterExpression: { perEventGuardKey: { $type: "objectId" } },
    name: "perEventGuardKey_unique_active",
  }
);

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
        const error = new Error("Subscription not found");
        error.statusCode = 409;
        error.status = "fail";
        error.code = "EVENT_SUBSCRIPTION_NOT_FOUND";
        error.isOperational = true;
        return next(error);
      }

      // Check if subscription is active
      if (!subscription.isActive) {
        const error = new Error("Subscription is not active");
        error.statusCode = 409;
        error.status = "fail";
        error.code = "EVENT_SUBSCRIPTION_INACTIVE";
        error.isOperational = true;
        return next(error);
      }

      // Check if can create event
      const canCreate = subscription.canCreateEvent();
      if (!canCreate.allowed) {
        const error = new Error(canCreate.reason || "Cannot create event");
        error.statusCode = 409;
        error.status = "fail";
        error.code = "EVENT_SUBSCRIPTION_LIMIT";
        error.isOperational = true;
        return next(error);
      }

      // Set planId from subscription if not already set
      if (!this.planId && subscription.planId) {
        this.planId = subscription.planId._id || subscription.planId;
      }

      // Set packageType from subscription if not already set
      if (!this.packageType && subscription.packageType) {
        this.packageType = subscription.packageType;
      }

      // Claim the per-event single-active-event slot atomically via the unique
      // partial index. Only per-event plans participate; pool plans leave the
      // key null. A freshly-created event always occupies the slot (its initial
      // status is never one of the freeing statuses).
      if (
        isPerEventPlan(subscription.planId?.planType) &&
        !PER_EVENT_SLOT_FREEING_STATUSES.includes(this.status)
      ) {
        this.perEventGuardKey = this.subscriptionId;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Free the per-event slot whenever the event moves to a slot-freeing status on
// a save()-based path (host/admin cancel + single-delete go through save()).
// Hook-bypassing bulk update writes clear the key inline at their call sites.
eventSchema.pre("save", function (next) {
  if (
    !this.isNew &&
    this.isModified("status") &&
    PER_EVENT_SLOT_FREEING_STATUSES.includes(this.status)
  ) {
    this.perEventGuardKey = null;
  }
  next();
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

// Pre-save middleware to populate default reminderSettings
eventSchema.pre("save", function (next) {
  // Only process if the event has eventDetails
  if (!this.eventDetails || !this.eventDetails.date || !this.eventDetails.time) {
    return next();
  }

  // If reminderSettings is not initialized, initialize it
  if (!this.reminderSettings) {
    this.reminderSettings = {
      customReminderTime: false
    };
  }

  // If customReminderTime is false, automatically compute/update reminderSettings to be 48h before the event
  if (!this.reminderSettings.customReminderTime) {
    try {
      const { parseDateTime, toRiyadhComponents } = require("../src/shared/utils/timezone");
      const eventTimeUtc = parseDateTime(this.eventDetails.date, this.eventDetails.time);
      if (eventTimeUtc) {
        const reminderTimeUtc = new Date(eventTimeUtc.getTime() - 48 * 3600 * 1000);
        const comps = toRiyadhComponents(reminderTimeUtc);
        this.reminderSettings.scheduledDate = comps.date;
        this.reminderSettings.scheduledTime = comps.time;
      }
    } catch (err) {
      // Log or handle error, but don't block save
      console.error("Error setting default reminder settings:", err);
    }
  }

  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
