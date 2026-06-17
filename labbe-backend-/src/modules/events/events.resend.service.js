/**
 * Events Service — Resend-invite sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.resend.service
 */

const { ROLES } = require("../../shared/constants/roles");
const {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} = require("../../shared/errors");

const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const taqnyat = require("../../infrastructure/taqnyat");
const config = require("../../config");
const { runBatched } = require("../../shared/utils/runBatched");
const { logAudit } = require("../../shared/utils/auditLog");
const logger = require("../../shared/utils/logger");
const {
  TAQNYAT_SENDER,
  formatDate,
  getEventBodyParams,
  getEventImageUrl,
  buildSmsBody,
} = require("../messaging/messaging.formatting");

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

module.exports = {
  /**
   * Resend invitation to guests who haven't responded or said "maybe".
   *
   * Gates:
   *   1. Event must be live (initial bulk send completed).
   *   2. At least 48h must have passed since bulkSendCompletedAt.
   *   3. resendInviteSentAt must be null (one-time use).
   *
   * @param {string} eventId
   * @param {object} body  — { channel?: 'sms' | 'whatsapp' }
   * @param {object} user  — req.user
   * @returns {object} { reminded, successful, failed }
   */
  async resendInvite(eventId, body = {}, user) {
    const channel = body.channel || "sms";

    const query = this._buildScopedEventQuery(eventId, user);
    const event = await Event.findOne(query)
      .populate({
        path: "taqnyatTemplate.templateRef",
        select: "templateName bodyText hasImageHeader language category varMapping",
      })
      .populate("host", "name username");

    if (!event) {
      throw new NotFoundError("Event");
    }

    // ---------- Gate 1: must be live ----------
    if (event.status !== "live") {
      throw new ValidationError(
        "Resend-invite is only available for live events"
      );
    }

    // ---------- Gate 2: 48h after bulk send completed ----------
    const completedAt = event.messagingStatus?.bulkSendCompletedAt;
    if (!completedAt) {
      throw new ValidationError(
        "Initial bulk send has not completed yet"
      );
    }

    const completedMs = new Date(completedAt).getTime();
    const nowMs = Date.now();
    if (nowMs - completedMs < FORTY_EIGHT_HOURS_MS) {
      const hoursLeft = Math.ceil(
        (FORTY_EIGHT_HOURS_MS - (nowMs - completedMs)) / (3600 * 1000)
      );
      throw new ValidationError(
        `Resend-invite is not available yet. Please wait ${hoursLeft} more hours.`
      );
    }

    // ---------- Gate 3: one-time use ----------
    if (event.resendInviteSentAt) {
      throw new ValidationError(
        "Resend-invite has already been used for this event"
      );
    }

    // ---------- Find target guests ----------
    // Guests who haven't responded (status = 'invited') OR said "maybe"
    const targetGuests = await Guest.find({
      event: eventId,
      "invitation.sent": true,
      status: { $in: ["invited", "maybe"] },
    });

    if (targetGuests.length === 0) {
      return {
        success: true,
        message: "No eligible guests to re-invite",
        reminded: 0,
        successful: 0,
        failed: 0,
      };
    }

    const template = event.taqnyatTemplate?.templateRef || null;
    const eventTitle = event.eventDetails?.title || "Event";
    const hostName = event.host?.name || event.host?.username || "Host";
    const rsvpBaseUrl = config.frontend?.url || "https://halaa.sa";

    const batched = await runBatched(
      targetGuests,
      async (guest) => {
        const rsvpLink = `${rsvpBaseUrl}/rsvp/${eventId}/${guest._id}`;

        if (channel === "whatsapp" && template) {
          const bodyParams = getEventBodyParams(event, guest.name, template);
          const imageUrl = getEventImageUrl(event, template);
          const smsFallback = {
            sender: TAQNYAT_SENDER,
            body: buildSmsBody(event, guest.name, rsvpLink),
          };

          const wa = imageUrl
            ? await taqnyat.sendWhatsAppTemplateWithImage(
                guest.phone,
                template.templateName,
                template.language || "ar",
                imageUrl,
                bodyParams,
                smsFallback
              )
            : await taqnyat.sendWhatsAppTemplate(
                guest.phone,
                template.templateName,
                template.language || "ar",
                [
                  {
                    type: "body",
                    parameters: bodyParams.map((p) => ({
                      type: "text",
                      text: p,
                    })),
                  },
                ],
                smsFallback
              );

          return { guestId: guest._id, ...wa };
        }

        // SMS path: rebuild the invitation message
        const smsBody = buildSmsBody(event, guest.name, rsvpLink);
        const result = await taqnyat.sendSMS(guest.phone, smsBody, {
          sender: TAQNYAT_SENDER,
        });

        return { guestId: guest._id, ...result };
      },
      { concurrency: 5, ratePerSecond: 5 }
    );

    const successful = batched.results.filter(
      (r) => r.ok && r.value?.success
    ).length;
    const failed = batched.total - successful;

    // Persist the one-time flag
    await Event.findByIdAndUpdate(eventId, {
      resendInviteSentAt: new Date(),
    });

    try {
      await logAudit({
        action: "events.resend_invite",
        actor: { _id: user?._id || null, role: user?.role || "unknown" },
        targetType: "event",
        targetId: eventId,
        metadata: {
          channel,
          total: targetGuests.length,
          successful,
          failed,
        },
        status:
          failed === 0
            ? "success"
            : successful === 0
              ? "failure"
              : "partial",
      });
    } catch (_) {
      /* audit must never break the operation */
    }

    logger.info("[resendInvite] done", {
      eventId: String(eventId),
      channel,
      total: targetGuests.length,
      successful,
      failed,
    });

    return {
      success: true,
      reminded: targetGuests.length,
      successful,
      failed,
    };
  },
};
