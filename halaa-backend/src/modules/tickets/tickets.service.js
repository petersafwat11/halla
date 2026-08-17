/**
 * Tickets Service
 * Business logic for support ticket management - NO HTTP concerns
 * @module modules/tickets/tickets.service
 */

const config = require("../../config");
const {
  ROLES,
  TICKET_STATUS,
  TICKET_PRIORITY,
  PERMISSIONS,
  USER_STATUS,
} = require("../../shared/constants");
const {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} = require("../../shared/errors");

// Import existing models during migration
const Ticket = require("../../../models/TicketModel");
const User = require("../../../models/UserModel");

// Import existing services
const notificationService = require('../notifications/notifications.service');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { extractStoredRef, signStoredImage } = require('../../shared/utils/s3Upload');

// Ticket source constants
const TICKET_SOURCE = {
  ADMIN: "admin",
  HOST: "host",
  VENDOR: "vendor",
  GUEST: "guest",
  OTHER: "other",
};

// Valid status transitions matrix
const VALID_TRANSITIONS = {
  [TICKET_STATUS.OPEN]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.WAITING_RESPONSE, TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.WAITING_RESPONSE]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED, TICKET_STATUS.IN_PROGRESS],
  [TICKET_STATUS.CLOSED]: [],
};

class TicketsService {
  /**
   * Determine ticket source and priority from user role
   * @param {Object} user
   * @returns {{source: string, priority: string}}
   */
  getTicketSourceAndPriority(user) {
    const role = user?.role;

    if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MODERATOR].includes(role)) {
      return { source: TICKET_SOURCE.ADMIN, priority: TICKET_PRIORITY.MEDIUM };
    }

    if (role === ROLES.HOST) {
      return { source: TICKET_SOURCE.HOST, priority: TICKET_PRIORITY.MEDIUM };
    }

    if (role === ROLES.VENDOR) {
      return { source: TICKET_SOURCE.VENDOR, priority: TICKET_PRIORITY.MEDIUM };
    }

    return { source: TICKET_SOURCE.OTHER, priority: TICKET_PRIORITY.MEDIUM };
  }

  /**
   * Get available ticket assignees (admins with ticket access)
   * @returns {Promise<Array>}
   */
  async getTicketAssignees() {
    const assignees = await User.find({
      $or: [
        { role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } },
        { role: ROLES.MODERATOR, permissions: PERMISSIONS.MANAGE_TICKETS },
      ],
      status: { $ne: USER_STATUS.SUSPENDED },
    })
      .select("_id username name email role")
      .sort({ role: 1, username: 1 });

    return assignees;
  }

  /**
   * Get tickets for user or all (admin)
   * @param {string} userId
   * @param {boolean} isAdmin
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async getTickets(userId, isAdmin, filters = {}, options = {}, requestingUser = null) {
    const { status, priority, source, search } = filters;
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    let query = {};

    if (!isAdmin) {
      query.user = userId;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (source) query.source = source;

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { subject: { $regex: escaped, $options: "i" } },
        { message: { $regex: escaped, $options: "i" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username phoneNumber email")
        .populate("assignedTo", "username email")
        .lean(),
      Ticket.countDocuments(query),
    ]);

    return {
      data: await Promise.all(tickets.map((t) => this._formatTicket(t))),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get ticket by ID
   * @param {string} ticketId
   * @param {string} userId
   * @param {boolean} isAdmin
   * @returns {Promise<Object>}
   */
  async getTicketById(ticketId, userId, isAdmin) {
    const ticket = await Ticket.findById(ticketId)
      .populate("user", "username phoneNumber email")
      .populate("assignedTo", "username email")
      .lean();

    if (!ticket) {
      throw new NotFoundError("Ticket");
    }

    if (!isAdmin && ticket.user._id.toString() !== userId.toString()) {
      throw new ForbiddenError("You do not have access to this ticket");
    }

    return { ticket: await this._formatTicket(ticket) };
  }

  /**
   * Create ticket
   * @param {Object} ticketData
   * @param {Object} user
   * @returns {Promise<Object>}
   */
  async createTicket(ticketData, user, file = null) {
    const { source, priority } = this.getTicketSourceAndPriority(user);

    const ticketPayload = {
      ...ticketData,
      user: user._id,
      source,
      priority: ticketData.priority || priority,
    };

    // Optional attachment (image or video) uploaded via multipart. Persist the
    // S3 key (extractStoredRef); it is signed to a public URL on read.
    if (file) {
      const isVideo = (file.mimetype || "").startsWith("video/");
      ticketPayload.attachment = {
        url: extractStoredRef(file),
        type: isVideo ? "video" : "image",
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const ticket = await Ticket.create(ticketPayload);

    // Notify user
    this._notifyTicketCreated(ticket, user).catch((err) => logger.error('ticket creation notification failed', err));

    // Notify admins
    this._notifyAdminsNewTicket(ticket, user).catch((err) => logger.error('ticket creation admin notification failed', err));

    // Audit: ticket created
    logAudit({ action: 'ticket.created', actor: { _id: user._id, role: user.role }, targetType: 'ticket', targetId: ticket._id, metadata: { source, priority: ticket.priority } }).catch((err) => logger.error('ticket creation audit log failed', err));

    return { ticket: await this._formatTicket(ticket) };
  }

  /**
   * Update ticket status
   * @param {string} ticketId
   * @param {string} status
   * @param {string} [resolution]
   * @returns {Promise<Object>}
   */
  async updateTicketStatus(ticketId, status, resolution = null, resolvedById = null) {
    if (!Object.values(TICKET_STATUS).includes(status)) {
      throw new ValidationError("Invalid status");
    }

    // Enforce state machine — fetch current status first
    const existing = await Ticket.findById(ticketId).select("status");
    if (existing) {
      const allowed = VALID_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(status)) {
        throw new ValidationError(
          `Cannot transition ticket from '${existing.status}' to '${status}'`
        );
      }
    }

    const updateData = { status };
    if (status === TICKET_STATUS.RESOLVED) {
      updateData.resolvedAt = new Date();
      if (resolvedById) updateData.resolvedBy = resolvedById;
      if (resolution) {
        updateData.resolutionResponse = {
          message: resolution,
          resolvedBy: resolvedById || null,
          resolvedAt: new Date(),
        };
      }
    }
    if (status === TICKET_STATUS.CLOSED) {
      updateData.closedAt = new Date();
    }

    const ticket = await Ticket.findByIdAndUpdate(ticketId, updateData, {
      new: true,
    }).populate("user", "username phoneNumber email");

    if (!ticket) {
      throw new NotFoundError("Ticket");
    }

    // Audit: ticket status changed
    logAudit({ action: 'ticket.status_updated', actor: { _id: resolvedById }, targetType: 'ticket', targetId: ticket._id, metadata: { previousStatus: existing?.status, newStatus: status, resolution } }).catch((err) => logger.error('ticket status audit log failed', err));

    // Notify user of status change
    this._notifyTicketStatusChange(ticket, status).catch((err) => logger.error('ticket status notification failed', err));

    return { ticket: await this._formatTicket(ticket) };
  }

  /**
   * Assign ticket to admin
   * @param {string} ticketId
   * @param {string} assigneeId
   * @returns {Promise<Object>}
   */
  async assignTicket(ticketId, assigneeId) {
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { assignedTo: assigneeId, status: TICKET_STATUS.IN_PROGRESS },
      { new: true }
    ).populate("assignedTo", "username email");

    if (!ticket) {
      throw new NotFoundError("Ticket");
    }

    // Notify assigned admin (non-blocking)
    this._notifyTicketAssigned(ticket, assigneeId).catch((err) => logger.error('ticket assignment notification failed', err));

    return { ticket: await this._formatTicket(ticket) };
  }

  /**
   * Delete ticket
   * @param {string} ticketId
   * @returns {Promise<void>}
   */
  async deleteTicket(ticketId, userId, isAdmin) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket");
    }
    if (!isAdmin && ticket.user.toString() !== userId.toString()) {
      throw new ForbiddenError("You can only delete your own tickets");
    }
    await ticket.deleteOne();
  }

  /**
   * Update ticket
   * @param {string} ticketId
   * @param {Object} updateData
   * @param {string} userId
   * @param {boolean} isAdmin
   * @returns {Promise<Object>}
   */
  async updateTicket(ticketId, updateData, userId, isAdmin) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new NotFoundError("Ticket");

    if (!isAdmin && ticket.user.toString() !== userId.toString()) {
      throw new ForbiddenError("You do not have access to this ticket");
    }

    const allowedFields = isAdmin
      ? ["subject", "message", "type", "priority", "status"]
      : ["subject", "message", "type"];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) ticket[field] = updateData[field];
    });

    await ticket.save();
    return { ticket: await this._formatTicket(ticket) };
  }

  /**
   * Rate ticket
   * @param {string} ticketId
   * @param {number} rating
   * @param {string} feedback
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async rateTicket(ticketId, rating, feedback, userId) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new NotFoundError("Ticket");

    if (ticket.user.toString() !== userId.toString()) {
      throw new ForbiddenError("You can only rate your own tickets");
    }

    if (
      ticket.status !== TICKET_STATUS.RESOLVED &&
      ticket.status !== TICKET_STATUS.CLOSED
    ) {
      throw new ValidationError("You can only rate resolved or closed tickets");
    }

    ticket.userRating = {
      rating: rating,
      feedback: feedback || "",
      ratedAt: new Date(),
    };

    await ticket.save();
    return { ticket: await this._formatTicket(ticket) };
  }

  /**
   * Get ticket for rating (minimal data)
   * @param {string} ticketId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getTicketForRating(ticketId, userId) {
    const ticket = await Ticket.findById(ticketId).select(
      "_id subject status userRating user resolvedAt closedAt"
    );

    if (!ticket) throw new NotFoundError("Ticket");

    if (ticket.user.toString() !== userId.toString()) {
      throw new ForbiddenError("You can only access your own tickets");
    }

    return {
      id: ticket._id,
      ticketNumber: ticket._id.toString().slice(-6),
      subject: ticket.subject,
      status: ticket.status,
      canRate: [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(
        ticket.status
      ),
      hasRated: !!ticket.userRating?.rating,
      currentRating: ticket.userRating || null,
    };
  }

  /**
   * Export all tickets with filters (admin only)
   */
  async exportTickets({ search, status, priority, from, to } = {}) {
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { subject: { $regex: escaped, $options: 'i' } },
        { message: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const tickets = await Ticket.find(query)
      .populate('user', 'username email phoneNumber')
      .populate('assignedTo', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    return tickets.map(t => ({
      Subject: t.subject || '-',
      Type: t.type || '-',
      User: t.user?.username || t.user?.email || '-',
      Priority: t.priority || '-',
      Status: t.status || '-',
      'Assigned To': t.assignedTo?.username || '-',
      'Created At': t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '-',
    }));
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  async _formatTicket(ticket) {
    const formatted = {
      id: ticket._id,
      ticketNumber: ticket._id.toString().slice(-6),
      type: ticket.type,
      subject: ticket.subject,
      message: ticket.message,
      attachment: ticket.attachment?.url
        ? {
          url: await signStoredImage(ticket.attachment.url),
          type: ticket.attachment.type || null,
          mimeType: ticket.attachment.mimeType || null,
          size: ticket.attachment.size || null,
        }
        : null,
      status: ticket.status,
      priority: ticket.priority,
      source: ticket.source,
      user: ticket.user
        ? {
          id: ticket.user._id,
          username: ticket.user.username,
          email: ticket.user.email,
          phoneNumber: ticket.user.phoneNumber,
        }
        : null,
      assignedTo: ticket.assignedTo
        ? {
          id: ticket.assignedTo._id,
          username: ticket.assignedTo.username,
          email: ticket.assignedTo.email,
        }
        : null,
      resolution: ticket.resolutionResponse
        ? {
          message: ticket.resolutionResponse.message,
          by: ticket.resolutionResponse.resolvedBy,
          at: ticket.resolutionResponse.resolvedAt,
        }
        : null,
      rating: ticket.userRating
        ? {
          score: ticket.userRating.rating,
          feedback: ticket.userRating.feedback,
          ratedAt: ticket.userRating.ratedAt,
        }
        : null,
      createdAt: ticket.createdAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
    };

    return formatted;
  }

  async _notifyTicketCreated(ticket, user) {
    await notificationService.sendToUser(user._id, {
      type: "ticket_created",
      title: "Ticket Received",
      titleAr: "تم استلام الشكوى",
      message: `Your support ticket #${ticket._id.toString().slice(-6)} has been received.`,
      messageAr: `تم استلام شكواك رقم #${ticket._id.toString().slice(-6)}.`,
      data: { entityType: "ticket", entityId: ticket._id },
    });
  }

  async _notifyAdminsNewTicket(ticket, user) {
    const frontendUrl = config.frontend.url;
    await notificationService.sendToAdmins({
      type: "ticket_created",
      title: "New Support Ticket",
      titleAr: "شكوى دعم جديدة",
      message: `New ticket #${ticket._id.toString().slice(-6)} from ${user.username || user.phoneNumber}`,
      messageAr: `شكوى جديدة #${ticket._id.toString().slice(-6)}`,
      actionUrl: `${frontendUrl}/ar/admin-dash/tickets`,
      data: { entityType: "ticket", entityId: ticket._id },
    });
  }

  async _notifyTicketAssigned(ticket, assigneeId) {
    await notificationService.sendToUser(assigneeId, {
      type: 'ticket_assigned',
      title: 'Ticket Assigned to You',
      titleAr: 'تم تعيين شكوى لك',
      message: `Ticket #${ticket._id.toString().slice(-6)} has been assigned to you.`,
      messageAr: `تم تعيين الشكوى #${ticket._id.toString().slice(-6)} لك.`,
      data: { entityType: 'ticket', entityId: ticket._id },
      priority: 'high',
    });
  }

  async _notifyTicketStatusChange(ticket, status) {
    const statusMessages = {
      [TICKET_STATUS.IN_PROGRESS]: {
        en: "is now being processed",
        ar: "قيد المعالجة الآن",
      },
      [TICKET_STATUS.RESOLVED]: { en: "has been resolved", ar: "تم حلها" },
      [TICKET_STATUS.CLOSED]: { en: "has been closed", ar: "تم إغلاقها" },
    };

    const msg = statusMessages[status];
    if (msg) {
      await notificationService.sendToUser(ticket.user._id || ticket.user, {
        type: "ticket_status",
        title: "Ticket Status Update",
        titleAr: "تحديث حالة الشكوى",
        message: `Your ticket #${ticket._id.toString().slice(-6)} ${msg.en}`,
        messageAr: `شكواك #${ticket._id.toString().slice(-6)} ${msg.ar}`,
        data: { entityType: "ticket", entityId: ticket._id },
      });
    }
  }
}

module.exports = new TicketsService();
