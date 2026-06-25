/**
 * Audit Log Model
 * Audit Log Model
 * Audit Log Model
 * Immutable log of all important system actions for compliance and security
 */

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // Action identifier (e.g., "user.login", "event.created", "admin.user_deleted")
    action: {
      type: String,
      required: [true, "Action is required"],
      index: true,
    },

    // Who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Role of the user who performed the action
    performedByRole: {
      type: String,
      enum: [
        "super_admin",
        "admin",
        "moderator",
        "host",
        "vendor",
        "guest",
        "system",
      ],
    },

    // What type of resource was affected
    targetType: {
      type: String,
      enum: [
        "user",
        "event",
        "guest",
        "ticket",
        "subscription",
        "service",
        "notification",
        "system",
        "staff_access_token",
        "guest_access_token",
        "rsvp",
        // Visual templates + categories + Taqnyat-template
        // assignments. lowercase per existing convention.
        "template",
        "template_category",
        "taqnyat_template",
        "plan",
        "addon",
        // Payment system: refund / capture / void / webhook /
        // reconcile / pending_refund all target a Payment row.
        "payment",
        "discount",
      ],
      index: true,
    },

    // ID of the affected resource
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    // What changed (before/after values for updates)
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      fields: [String], // List of changed field names
    },

    // Additional context
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Request information
    request: {
      method: String,
      path: String,
      query: mongoose.Schema.Types.Mixed,
      requestId: String,
    },

    // Client information
    ipAddress: String,
    userAgent: String,

    // Result of the action
    status: {
      type: String,
      enum: ["success", "failure", "partial"],
      default: "success",
    },

    // Error information if action failed
    error: {
      message: String,
      code: String,
    },

    // Timestamp (not using timestamps option for immutability)
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Prevent modifications
    strict: true,
    timestamps: false,
    // Optimize for read-heavy workload
    read: "secondaryPreferred",
  }
);

// ============================================
// INDEXES
// ============================================

// Compound index for common queries
auditLogSchema.index({ timestamp: -1, action: 1 });
auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });

// TTL index - auto-delete logs older than 2 years (optional, comment out if you need permanent retention)
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// ============================================
// PREVENT MODIFICATIONS
// ============================================

// Block all update operations
auditLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "findByIdAndUpdate"],
  function () {
    throw new Error("Audit logs cannot be modified");
  }
);

// Block all delete operations
auditLogSchema.pre(
  [
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findByIdAndDelete",
    "remove",
  ],
  function () {
    throw new Error("Audit logs cannot be deleted");
  }
);

// ============================================
// STATIC METHODS
// ============================================

/**
 * Create an audit log entry
 */
auditLogSchema.statics.log = async function (data) {
  try {
    return await this.create(data);
  } catch (error) {
    // Log to console but don't throw - audit logging should not break the main flow
    console.error("Failed to create audit log:", error.message);
    return null;
  }
};

/**
 * Query audit logs with pagination
 */
auditLogSchema.statics.query = async function (filters, options = {}) {
  const {
    page = 1,
    limit = 50,
    sort = { timestamp: -1 },
    populate = false,
  } = options;

  const query = this.find(filters)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  if (populate) {
    query.populate("performedBy", "name email role");
  }

  const [logs, total] = await Promise.all([
    query,
    this.countDocuments(filters),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get activity for a specific user
 */
auditLogSchema.statics.getUserActivity = async function (userId, options = {}) {
  return this.query({ performedBy: userId }, options);
};

/**
 * Get all actions on a specific resource
 */
auditLogSchema.statics.getResourceHistory = async function (
  targetType,
  targetId,
  options = {}
) {
  return this.query({ targetType, targetId }, options);
};

/**
 * Get security-related events (login failures, permission changes, etc.)
 */
auditLogSchema.statics.getSecurityEvents = async function (options = {}) {
  const securityActions = [
    "user.login_failed",
    "user.login_blocked",
    "user.password_changed",
    "user.password_reset",
    "admin.permissions_changed",
    "admin.user_suspended",
    "admin.user_deleted",
    "system.rate_limit_exceeded",
  ];

  return this.query({ action: { $in: securityActions } }, options);
};

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
