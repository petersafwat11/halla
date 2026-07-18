/**
 * Events Service — Staff sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.staff.service
 */

const config = require("../../config");
const { SUPERVISOR_STATUS } = require("../../shared/constants");
const {
  NotFoundError,
  ValidationError,
} = require("../../shared/errors");
// Every export/notification helper uses formatRiyadh so we don't
// re-render UTC server-locale dates as the previous local day.
const { formatRiyadh } = require("../../shared/utils/timezone");

// Import existing models during migration
const Event = require("../../../models/EventModel");

const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const StaffAccessToken = require('../../../models/StaffAccessTokenModel');
const taqnyat = require('../../infrastructure/taqnyat');
const taqnyatTemplatesService = require('../taqnyat-templates/taqnyat-templates.service');
const {
  getEventBodyParams,
  getEventImageUrl,
} = require('../messaging/messaging.formatting');

module.exports = {
  /**
   * Replace the entire staff list for an event
   * @param {string} eventId
   * @param {Array} staffList - Array of {name, phone}
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateStaffList(eventId, staffList, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError("Event");

    if (['completed', 'cancelled'].includes(event.status)) {
      throw new ValidationError('Cannot modify a completed or cancelled event');
    }

    const userId =
      typeof userContext === 'object' && userContext !== null
        ? userContext._id?.toString?.() || userContext._id
        : userContext;

    const preImagePhones = (event.staffList || []).map((s) => s.phone);
    event.staffList = (staffList || []).map((s) => ({
      name: s.name,
      phone: s.phone,
    }));
    await event.save();

    // Revoke StaffAccessToken records for any phone dropped from the list
    // so removed staff lose portal access immediately.
    await this._revokeRemovedStaffTokens(eventId, preImagePhones, event.staffList);

    logAudit({
      action: 'event.staff_list_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        previousCount: preImagePhones.length,
        newCount: event.staffList.length,
      },
    }).catch(() => {});

    return { event };
  },

  /**
   * Invalidate StaffAccessToken records for staff removed from an event's
   * staffList.
   *
   * Phone strings on `staffList` and on the token records are stored
   * in raw form (the entry the host typed). We normalise both sides
   * by stripping spaces / dashes / parentheses (matches
   * `staff.service` cleanPhone) so a phone like "+966 55 123 4567"
   * still matches "+966551234567" when revoking.
   *
   * @private
   */
  async _revokeRemovedStaffTokens(eventId, preImagePhones, newStaffList) {
    try {
      const cleanPhone = (p) => (typeof p === 'string' ? p.replace(/[\s\-\(\)]/g, '') : '');
      const newPhones = new Set(
        (newStaffList || []).map((s) => cleanPhone(s?.phone)).filter(Boolean)
      );
      const removedPhones = (preImagePhones || [])
        .map(cleanPhone)
        .filter((p) => p && !newPhones.has(p));
      if (removedPhones.length === 0) return;

      // Query the active tokens for this event and filter in-memory by
      // the cleaned phone — done in JS rather than via a complex regex
      // $in so phone-format drift between record and list (raw vs
      // formatted) doesn't leak access. The active-token set per event
      // is small (one per staff member, plus historical revoked ones),
      // so this is fine.
      const activeTokens = await StaffAccessToken.find({
        event: eventId,
        isRevoked: false,
      })
        .select('_id phone')
        .lean();

      const tokenIdsToRevoke = activeTokens
        .filter((t) => removedPhones.includes(cleanPhone(t.phone)))
        .map((t) => t._id);
      if (tokenIdsToRevoke.length === 0) return;

      await StaffAccessToken.updateMany(
        { _id: { $in: tokenIdsToRevoke } },
        { $set: { isRevoked: true, revokedAt: new Date() } }
      );
    } catch (err) {
      // Non-fatal — the staffList update already committed. Log so an
      // operator can re-revoke manually if needed.
      logger.warn('_revokeRemovedStaffTokens failed', { err: err?.message });
    }
  },

  /**
   * Add staff to event
   * @param {string} eventId
   * @param {Object} staffData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async addStaffToEvent(eventId, staffData, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError("Event");
    const userId = typeof userContext === 'object' ? userContext._id : userContext;

    if (!event.staffList) event.staffList = [];

    const staffMember = {
      name: staffData.name,
      phone: staffData.phone,
      status: SUPERVISOR_STATUS.ACTIVE,
      addedAt: new Date(),
    };

    event.staffList.push(staffMember);
    await event.save();

    const added = event.staffList[event.staffList.length - 1];

    logAudit({
      action: 'event.staff_added',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { staffId: added._id, staffName: added.name, staffPhone: added.phone },
    }).catch(() => {});

    return { staff: added };
  },

  /**
   * Update staff
   * @param {string} eventId
   * @param {string} staffId
   * @param {Object} updateData
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateStaff(eventId, staffId, updateData, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError("Event");
    const userId = typeof userContext === 'object' ? userContext._id : userContext;

    const staffIndex = event.staffList?.findIndex(
      (s) => s._id?.toString() === staffId
    );
    if (staffIndex === -1 || staffIndex === undefined)
      throw new NotFoundError("Staff");

    const allowedFields = ["name", "phone", "status"];
    const changes = {};
    allowedFields.forEach((f) => {
      if (updateData[f] !== undefined) {
        event.staffList[staffIndex][f] = updateData[f];
        changes[f] = updateData[f];
      }
    });

    await event.save();

    logAudit({
      action: 'event.staff_updated',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { staffId, changes },
    }).catch(() => {});

    return { staff: event.staffList[staffIndex] };
  },

  /**
   * Update staff status
   * @param {string} eventId
   * @param {string} staffId
   * @param {string} status
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async updateStaffStatus(eventId, staffId, status, userContext) {
    return this.updateStaff(eventId, staffId, { status }, userContext);
  },

  /**
   * Delete staff
   * @param {string} eventId
   * @param {string} staffId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteStaff(eventId, staffId, userContext) {
    const event = await Event.findOne(this._buildScopedEventQuery(eventId, userContext));
    if (!event) throw new NotFoundError("Event");
    const userId = typeof userContext === 'object' ? userContext._id : userContext;

    const removed = (event.staffList || []).find(
      (s) => s._id?.toString() === staffId
    );
    if (!removed) throw new NotFoundError("Staff");

    const removedPhone = removed.phone;
    event.staffList = (event.staffList || []).filter(
      (s) => s._id?.toString() !== staffId
    );

    await event.save();

    // Revoke any active StaffAccessToken so the removed staff loses
    // portal access immediately rather than at natural 48h TTL.
    if (removedPhone) {
      await this._revokeRemovedStaffTokens(eventId, [removedPhone], event.staffList);
    }

    logAudit({
      action: 'event.staff_deleted',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: { staffId, staffName: removed.name, staffPhone: removedPhone },
    }).catch(() => {});

    return { staffId };
  },

  /**
   * Send WhatsApp/SMS notification to all active staff
   * Generates access tokens and sends staff portal link
   * @param {string} eventId
   * @param {string} userId
   * @param {boolean} isAdmin
   * @returns {Promise<Object>} { sent, failed, total }
   */
  async notifyStaff(eventId, userId, isAdmin = false) {
    const query = isAdmin ? { _id: eventId } : { _id: eventId, host: userId };
    const event = await Event.findOne(query);
    if (!event) throw new NotFoundError("Event");

    const activeStaff = (event.staffList || []).filter(
      (s) => s.status === SUPERVISOR_STATUS.ACTIVE
    );

    if (activeStaff.length === 0) {
      throw new ValidationError("No active staff found for this event");
    }

    const frontendUrl = config.frontend.url;
    const eventTitle = event.eventDetails?.title || "Untitled";
    // Asia/Riyadh wall-clock with explicit timeZone option.
    const eventDate = event.eventDetails?.date
      ? formatRiyadh(event.eventDetails.date, { style: "date", locale: "ar-SA" })
      : "";
    const eventLocation =
      event.eventDetails?.location?.address ||
      event.eventDetails?.location?.city ||
      "";

    let sent = 0;
    let failed = 0;
    const results = [];

    // Single global staff_access template (or null if admin hasn't tagged
    // one yet — we degrade to the plain SMS body in that case).
    const template = await taqnyatTemplatesService
      .findActiveByCategoryAndType(null, 'staff_access')
      .catch(() => null);

    for (const staffMember of activeStaff) {
      try {
        const tokenDoc = await StaffAccessToken.createForStaff(
          eventId,
          staffMember.phone,
          staffMember.name
        );

        const staffUrl = `${frontendUrl}/ar/staff?token=${tokenDoc.token}`;

        // SMS body kept as the fallback that Taqnyat falls through to when
        // the recipient has no WhatsApp capability or the template send
        // errors out.
        const smsBody =
          `مرحبا ${staffMember.name}!\n\n` +
          `تم تعيينك كمشرف في فعالية "${eventTitle}"\n` +
          (eventDate ? `📅 التاريخ: ${eventDate}\n` : "") +
          (eventLocation ? `📍 المكان: ${eventLocation}\n` : "") +
          `\nللدخول لصفحة المشرفين:\n${staffUrl}`;
        const smsFallback = { sender: 'HalaaApp', body: smsBody };
        const logOptions = {
          logContext: {
            eventId: event._id,
            userId,
            purpose: 'staff_access',
            metadata: { staffName: staffMember.name, staffPhone: staffMember.phone },
          },
        };

        let sendResult;

        if (template) {
          // Per-iteration local — never mutates the shared event doc.
          const staffCtx = {
            staff: { name: staffMember.name, accessUrl: staffUrl },
          };
          const bodyParams = getEventBodyParams(event, staffMember.name, template, staffCtx);
          const imageUrl = getEventImageUrl(event, template);
          sendResult = imageUrl
            ? await taqnyat.sendWhatsAppTemplateWithImage(
                staffMember.phone,
                template.templateName,
                template.language,
                imageUrl,
                bodyParams,
                smsFallback,
                logOptions
              )
            : await taqnyat.sendWhatsAppTemplate(
                staffMember.phone,
                template.templateName,
                template.language,
                [
                  {
                    type: 'body',
                    parameters: bodyParams.map((text) => ({ type: 'text', text })),
                  },
                ],
                smsFallback,
                logOptions
              );
        } else {
          sendResult = await taqnyat.sendSMS(staffMember.phone, smsBody, {
            sender: 'HalaaApp',
            ...logOptions,
          });
        }
        if (!sendResult?.success || !sendResult?.messageId) {
          throw new Error(sendResult?.error || 'provider_send_failed');
        }
        sent++;
        results.push({
          name: staffMember.name,
          phone: staffMember.phone,
          status: "sent",
          messageId: sendResult.messageId,
          outboundMessageId: sendResult.outboundMessageId || null,
        });
      } catch (error) {
        failed++;
        logger.warn('[notifyStaff] send failed', {
          eventId,
          staffName: staffMember.name,
          staffPhone: staffMember.phone,
          usedTemplate: Boolean(template),
          templateName: template?.templateName,
          error: error.message,
          response: error.response?.data,
          stack: error.stack,
        });
        // Track staff SMS failures for host dashboard visibility
        event.messagingStatus = event.messagingStatus || {};
        event.messagingStatus.staffFailedCount = (event.messagingStatus.staffFailedCount || 0) + 1;
        await event.save().catch(() => {});
        results.push({
          name: staffMember.name,
          phone: staffMember.phone,
          status: "failed",
          error: error.message,
        });
      }
    }

    logAudit({
      action: 'event.notify_staff',
      actor: { _id: userId },
      targetType: 'event',
      targetId: eventId,
      metadata: {
        sent,
        failed,
        total: activeStaff.length,
        messages: results.map((result) => ({
          staffName: result.name,
          phone: result.phone,
          status: result.status,
          messageId: result.messageId || null,
          outboundMessageId: result.outboundMessageId || null,
          error: result.error || null,
        })),
      },
    }).catch(() => {});

    return { sent, failed, total: activeStaff.length, results };
  },
};
