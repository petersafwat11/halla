/**
 * Events Service — Resend-invite + Extra-reminder sub-module
 * Composed onto EventsService via prototype mixin in events.service.js
 * @module modules/events/events.resend.service
 */

const {
  AppError,
  NotFoundError,
} = require("../../shared/errors");

const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const taqnyat = require("../../infrastructure/taqnyat");
const config = require("../../config");
const { runBatched } = require("../../shared/utils/runBatched");
const { logAudit } = require("../../shared/utils/auditLog");
const logger = require("../../shared/utils/logger");
const taqnyatTemplatesService = require("../taqnyat-templates/taqnyat-templates.service");
const messagingReminderService = require("../messaging/messaging.reminder.service");
const dispatchPolicy = require("../messaging/messaging.dispatchPolicy.service");
const {
  TAQNYAT_SENDER,
  getEventBodyParams,
  getEventImageUrl,
  buildSmsBody,
} = require("../messaging/messaging.formatting");

/**
 * Centralized dispatch-policy gate for HTTP send paths (resend / extra-reminder).
 * `requireSubscription` middleware only checks the caller has *a* subscription;
 * it does NOT block sends on terminal events, owner-mismatched subscriptions, or
 * assignments under refund. assertCanDispatch covers all of those — wire it into
 * every send path, not just the cron. Throws 403 when a send is not allowed.
 * @private
 */
async function _assertDispatchAllowed(event, path) {
  const decision = await dispatchPolicy.assertCanDispatch(event, { path });
  if (!decision.allowed) {
    throw new AppError(
      `Invitations can no longer be sent for this event (${decision.reason}).`,
      403
    );
  }
}

/**
 * Budget pre-check: throws 402 INSUFFICIENT_INVITES when `selectedCount`
 * exceeds the subscription's remaining invites. Unlimited plans
 * (invitePool null/undefined) are never gated. Mirrors messaging.send.service.
 *
 * @param {string} subscriptionId
 * @param {number} selectedCount
 * @private
 */
async function _assertInviteBudget(subscriptionId, selectedCount) {
  if (!subscriptionId) return;
  const sub = await Subscription.findById(subscriptionId).select(
    "invitePool compensationPool invitesConsumed"
  );
  if (!sub) return;
  // Unlimited plan — no ceiling to enforce.
  if (sub.invitePool === null || sub.invitePool === undefined) return;
  const remaining =
    (sub.invitePool || 0) + (sub.compensationPool || 0) - (sub.invitesConsumed || 0);
  if (selectedCount > remaining) {
    throw new AppError(
      `Insufficient invites: ${selectedCount} to send but ${Math.max(0, remaining)} remaining in your plan.`,
      402,
      "INSUFFICIENT_INVITES"
    );
  }
}

/**
 * Charge the pool for `count` successful sends. Best-effort — the
 * per-success debit must never break the response. The `invitePool: { $ne: null }`
 * filter skips unlimited plans automatically.
 *
 * @param {string} subscriptionId
 * @param {number} count
 * @private
 */
async function _chargeInvites(subscriptionId, count) {
  if (!subscriptionId || !count) return;

  // Stamp `firstSendAt` once — these messages went out, so sending has started
  // on this subscription (authoritative signal for the per-event gate).
  await Subscription.updateOne(
    { _id: subscriptionId, firstSendAt: null },
    { $set: { firstSendAt: new Date() } }
  ).catch((err) =>
    logger.error("[resend/extra-reminder] firstSendAt stamp failed", {
      subscriptionId: String(subscriptionId),
      err: err?.message,
    })
  );

  // Clamp invitesConsumed at capacity (invitePool + compensation). The budget
  // pre-check is not atomic across simultaneous batches, so clamp here to keep
  // the pool from going negative if two sends race on the same subscription.
  // A failure here means messages went out UNCHARGED — log at error level so
  // the sent/charged gap is observable and reconcilable, not silently lost.
  await Subscription.updateOne(
    { _id: subscriptionId, invitePool: { $ne: null } },
    [
      {
        $set: {
          invitesConsumed: {
            $min: [
              { $add: [{ $ifNull: ["$invitesConsumed", 0] }, count] },
              {
                $add: [
                  { $ifNull: ["$invitePool", 0] },
                  { $ifNull: ["$compensationPool", 0] },
                ],
              },
            ],
          },
        },
      },
    ]
  ).catch((err) =>
    logger.error("[resend/extra-reminder] invite consume failed — messages sent but UNCHARGED", {
      subscriptionId: String(subscriptionId),
      count,
      err: err?.message,
    })
  );
}

module.exports = {
  /**
   * Resend invitation to non-responders / "maybe" guests (default audience),
   * or to an explicit `guestIds` set. POOL-CHARGED and REPEATABLE — there are
   * no live/cooldown/once-only gates anymore.
   *
   * Template stays the event's invitation template (same as the initial
   * invite). Each successful send consumes one invite from the pool.
   *
   * @param {string} eventId
   * @param {object} body  — { channel?: 'sms' | 'whatsapp', guestIds?: string[] }
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

    // Dispatch-policy gate: terminal event / suspended-deleted owner / no active
    // subscription / owner mismatch / under-refund all block the send here, not
    // just on the cron path.
    await _assertDispatchAllowed(event, "resend-invite");

    // ---------- Find target guests ----------
    // Resend is ONLY for the permitted audience: guests already sent an
    // invitation who haven't responded or said "maybe". This audience is
    // enforced on the backend regardless of what the client sends — explicit
    // `guestIds` may only NARROW the audience, never bypass the status gate
    // (UI filtering is not authorization). A crafted request can therefore
    // not resend to confirmed/declined guests.
    const guestQuery = {
      event: eventId,
      deleted: { $ne: true },
      "invitation.sent": true,
      status: { $in: ["invited", "pending", "maybe"] },
    };
    if (Array.isArray(body.guestIds) && body.guestIds.length > 0) {
      guestQuery._id = { $in: body.guestIds };
    }

    const targetGuests = await Guest.find(guestQuery);

    if (targetGuests.length === 0) {
      return {
        success: true,
        message: "No eligible guests to re-invite",
        reminded: 0,
        successful: 0,
        failed: 0,
      };
    }

    // ---------- Budget pre-check (402 if over plan) ----------
    await _assertInviteBudget(event.subscriptionId, targetGuests.length);

    const template = event.taqnyatTemplate?.templateRef || null;
    const rsvpBaseUrl = config.frontend?.url || "https://halaa.sa";

    const batched = await runBatched(
      targetGuests,
      async (guest) => {
        // Match the initial-send link shape (the old /rsvp/:eventId/:guestId
        // path 404s — the live guest portal is /invitation/:qrcode).
        const rsvpLink = `${rsvpBaseUrl.replace(/\/$/, "")}/invitation/${guest.qrcode}`;

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

    // Charge one invite per successful send (excludes failures / rate-limited).
    await _chargeInvites(event.subscriptionId, successful);

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
          explicitGuestIds: Array.isArray(body.guestIds) && body.guestIds.length > 0,
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

  /**
   * Send an immediate pool-charged "extra reminder" to CONFIRMED guests using
   * the approved `reminder_confirmed` Taqnyat template. Repeatable — each call
   * genuinely re-sends (unique idempotency token per invocation).
   *
   * @param {string} eventId
   * @param {object} body  — { guestIds?: string[] }
   * @param {object} user  — req.user
   * @returns {object} { reminded, successful, failed }
   */
  async extraReminder(eventId, body = {}, user) {
    const query = this._buildScopedEventQuery(eventId, user);
    const event = await Event.findOne(query).populate(
      "host",
      "name username"
    );

    if (!event) {
      throw new NotFoundError("Event");
    }

    await _assertDispatchAllowed(event, "extra-reminder");

    // ---------- Confirmed audience ----------
    // A guest is "confirmed" via either the guest status (confirmed/checked_in)
    // or the RSVP response. Optional guestIds narrows to that subset.
    const confirmedClause = {
      $or: [
        { status: { $in: ["confirmed", "checked_in"] } },
        { "rsvp.response": "confirmed" },
      ],
    };
    const guestQuery = {
      event: eventId,
      deleted: { $ne: true },
      ...confirmedClause,
    };
    if (Array.isArray(body.guestIds) && body.guestIds.length > 0) {
      guestQuery._id = { $in: body.guestIds };
    }

    const targetGuests = await Guest.find(guestQuery);

    if (targetGuests.length === 0) {
      return {
        success: true,
        message: "No confirmed guests to remind",
        reminded: 0,
        successful: 0,
        failed: 0,
      };
    }

    // ---------- Resolve the approved reminder_confirmed template ----------
    const category = event.eventDetails?.type || null;
    const template = await taqnyatTemplatesService
      .findActiveByCategoryAndType(category, "reminder_confirmed")
      .catch(() => null);

    if (!template) {
      throw new AppError(
        "No approved reminder template is configured for this event category.",
        400,
        "NO_REMINDER_TEMPLATE"
      );
    }

    // ---------- Budget pre-check (402 if over plan) ----------
    await _assertInviteBudget(event.subscriptionId, targetGuests.length);

    // Unique attempt token so repeated calls genuinely re-send (the batch
    // wraps each send in withIdempotency; a static key would replay a cached
    // success and charge the pool without sending).
    const result = await messagingReminderService.sendAutoReminderBatch({
      event,
      guests: targetGuests,
      reminderType: "reminder_confirmed",
      template,
      scope: "extra_reminder",
      idempotencyPrefix: "extra_reminder",
      attemptKey: `extra_reminder:${Date.now()}`,
    });

    const successful = result.successful;
    const failed = result.failed;

    // Per-guest tracking writes for successful sends.
    const bulkOps = [];
    for (const detail of result.details) {
      if (!detail?.success) continue;
      bulkOps.push({
        updateOne: {
          filter: { _id: detail.guestId },
          update: {
            $set: {
              "invitation.autoReminderSent": true,
              "invitation.autoReminderSentAt": new Date(),
              "invitation.autoReminderType": "reminder_confirmed",
              "invitation.autoReminderMessageId": detail.messageId || null,
            },
          },
        },
      });
    }
    if (bulkOps.length) await Guest.bulkWrite(bulkOps);

    // Charge one invite per successful send (excludes failures / rate-limited).
    await _chargeInvites(event.subscriptionId, successful);

    try {
      await logAudit({
        action: "events.extra_reminder",
        actor: { _id: user?._id || null, role: user?.role || "unknown" },
        targetType: "event",
        targetId: eventId,
        metadata: {
          category,
          total: targetGuests.length,
          successful,
          failed,
          explicitGuestIds: Array.isArray(body.guestIds) && body.guestIds.length > 0,
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

    logger.info("[extraReminder] done", {
      eventId: String(eventId),
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
