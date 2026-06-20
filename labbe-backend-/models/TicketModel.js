// models/TicketModel.js
const mongoose = require("mongoose");
const {
  TICKET_STATUS,
  TICKET_PRIORITY,
  TICKET_SOURCE,
  ROLES,
} = require("../src/shared/constants");

const TicketSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
      index: true,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      minlength: 5,
      maxlength: 200,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: [
        "technical",
        "payment",
        "event",
        "user",
        "other",
        "inquiry",
        "issue",
        "request",
        "suggestion",
      ],
      default: "other",
      index: true,
      required: true,
      trim: true,
    },
    // Reference to unified User model
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Ticket source - who created the ticket
    source: {
      type: String,
      enum: Object.values(TICKET_SOURCE),
      default: TICKET_SOURCE.HOST,
      index: true,
    },

    // Assigned admin/moderator
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Resolution response (required when resolving ticket)
    resolutionResponse: {
      message: String,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      resolvedAt: Date,
    },

    priority: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.MEDIUM,
    },

    // User rating after ticket resolution
    userRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: {
        type: String,
        maxlength: 1000,
      },
      ratedAt: Date,
    },

    // Closure tracking
    closedAt: Date,

    // Resolution tracking
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Helpful compound indexes
TicketSchema.index({ status: 1, type: 1, createdAt: -1 });
TicketSchema.index({ user: 1, status: 1 });
TicketSchema.index({ assignedTo: 1, status: 1 });
TicketSchema.index({ source: 1, priority: 1, status: 1 });

// Static method to get tickets sorted by priority
TicketSchema.statics.getTicketsByPriority = async function (filters = {}) {
  const query = { ...filters };

  return this.find(query)
    .sort({
      // Sort by priority (urgent first, then high, medium, low)
      priority: -1,
      // Then by source
      source: -1,
      // Then by creation date (newest first)
      createdAt: -1,
    })
    .populate("user", "name email phoneNumber role")
    .populate("assignedTo", "name email");
};

module.exports = mongoose.model("Ticket", TicketSchema);
