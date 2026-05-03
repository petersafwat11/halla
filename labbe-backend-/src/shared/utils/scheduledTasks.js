/**
 * Scheduled Tasks
 * Cron jobs for automated notifications and reports
 */

const cron = require("node-cron");
const User = require("../../../models/UserModel");
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const notificationService = require("./notificationService");
const emailService = require("./emailService");
const messagingService = require("../../modules/messaging/messaging.service");
const taqnyat = require("../../infrastructure/taqnyat");
const { runBatched } = require("./runBatched");
const { withIdempotency } = require("./idempotency");
const {
  generateDailyReportPDF,
  generateWeeklyReportPDF,
} = require("./pdfGenerator");
const { ROLES } = require("../constants");
const { parseEventTime, isDue, nowUtc } = require("./timezone");
const { logAudit } = require("./auditLog");
const eventLock = require("./eventLock");

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get admin report data
 */
const getAdminReportData = async (periodDays = 1) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const [newUsers, newEvents, pendingVendors, activeSubscriptions] =
    await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Event.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({ role: ROLES.VENDOR, status: "pending" }),
      Subscription.countDocuments({ status: "active" }),
    ]);

  // Get user breakdown by role
  const usersByRole = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  return {
    period: periodDays === 1 ? "daily" : "weekly",
    date: new Date().toISOString().split("T")[0],
    newUsers,
    newEvents,
    pendingVendors,
    activeSubscriptions,
    usersByRole: usersByRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };
};

/**
 * Get events happening today for reminders
 */
const getTodayEvents = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return Event.find({
    "eventDetails.date": { $gte: today, $lt: tomorrow },
    status: { $ne: "cancelled" },
  }).populate("host", "email username phoneNumber");
};

/**
 * Get subscriptions expiring soon
 */
const getExpiringSubscriptions = async (daysAhead = 7) => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // FLOW-09-F03: Subscription schema field is `expiresAt`, not `endDate`.
  // The previous query never matched anything, so neither the warning
  // notifications nor the auto-expire transitions ran. Switching to the
  // correct field re-activates the cron.
  return Subscription.find({
    status: { $in: ["active", "trial"] },
    expiresAt: { $gte: now, $lte: futureDate },
  }).populate("userId", "email username phoneNumber");
};

// ============================================
// SCHEDULED TASKS
// ============================================

/**
 * Check for scheduled event launches - runs every minute.
 *
 * Phase 1b (PIPELINE-F05): the previous implementation compared
 * `now.getHours()/getMinutes()` (server local time) against the host's
 * scheduled wall-clock string. That broke whenever the server timezone
 * wasn't Asia/Riyadh — UTC servers would fire 3 hours late, etc. We now
 * fetch the day's scheduled events and use `timezone.isDue` to compare in
 * real UTC, deriving the Riyadh wall-clock from the host's chosen
 * `scheduledTime`.
 *
 * Phase 3a:
 *   - PIPELINE-F01 / FLOW-14-F01: send-then-mark-live ordering.
 *     `sendBulk` runs first; only on success do we flip the event to
 *     `live`. On failure the status stays `scheduled` (the retry cron
 *     handles re-attempts; after exhaustion it transitions to `failed`).
 *   - 3a.3 send lock: acquired via `eventLock.acquire` before any send,
 *     released in `finally`. Prevents a dual-tick race from double-firing.
 *   - 3a.5: the Taqnyat native-scheduling skip branch is removed. Every
 *     event launches via this cron regardless of channel.
 */
const scheduleEventLaunch = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // 24-hour window around `now` so we pick up events whose UTC date
      // straddles the Riyadh-local day boundary.
      const startOfDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endOfDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find candidate events for the day; the timezone-aware due check
      // runs in JS so we don't try to compute Riyadh-local minute matches
      // in MongoDB.
      const candidates = await Event.find({
        status: "scheduled",
        "launchSettings.scheduledDate": { $gte: startOfDay, $lte: endOfDay },
      });

      const eventsToLaunch = candidates.filter((evt) => isDue(evt, now, 60));

      if (eventsToLaunch.length > 0) {
        console.log(`[Cron] Found ${eventsToLaunch.length} events to launch at ${now.toISOString()}`);
      }

      for (const event of eventsToLaunch) {
        await runEventLaunch(event, "cron-launch");
      }
    } catch (error) {
      console.error("[Cron] Scheduled event launch failed:", error);
    }
  });
};

/**
 * Run one event's launch sequence end-to-end (lock → sendBulk → flip status).
 *
 * Shared by `scheduleEventLaunch` (cron tick), `scheduleEventRetry` (retry
 * cron), and the manual-retry endpoint. The caller-supplied `workerId`
 * shows up on the lock document and in audit logs to trace which path
 * fired the launch.
 *
 * Returns `{ launched: true | false, reason?: string }`.
 */
async function runEventLaunch(event, workerId) {
  const eventId = event._id.toString();
  const allGuestIds = event.guestList ? event.guestList.map((id) => id.toString()) : [];

  if (allGuestIds.length === 0) {
    console.warn(`[Cron] Event ${eventId} has no guests, skipping launch`);
    return { launched: false, reason: "no_guests" };
  }

  // B-5: filter out guests whose invitation has already been delivered.
  // Previously every retry called sendBulk over the FULL guestList. The
  // per-attempt idempotency fingerprint (`event.lastAttemptAt.getTime()`)
  // changes on each attempt, so the idempotency cache does NOT deduplicate
  // across attempts — a successfully-delivered guest would receive a fresh
  // SMS on every retry, up to 5 duplicates after the maximum attempt count.
  // The atomic delivered-state lives in `Guest.invitation.sent`; only
  // guests where that flag is not true (failed / never sent) need a new
  // dispatch.
  const Guest = require("../../../models/GuestModel");
  const undelivered = await Guest.find({
    _id: { $in: allGuestIds },
    "invitation.sent": { $ne: true },
  })
    .select("_id")
    .lean();
  const guestIds = undelivered.map((g) => g._id.toString());

  if (guestIds.length === 0) {
    // Every guest has already received an invitation. Treat this as a
    // successful launch (e.g. all attempts succeeded incrementally). Flip
    // straight to `live` without dispatching.
    //
    // HIGH-5 review: if attemptCount is 0, this means we're being asked
    // to launch an event whose guests ALREADY all show invitation.sent
    // — without any cron attempt having fired. That can only happen if
    // an admin / seed / support tool flipped the flag manually. Audit
    // it loudly so ops can investigate (rather than silently flipping
    // status to `live`).
    const att = event.attemptCount || 0;
    if (att === 0) {
      console.warn(
        `[Cron] SUSPICIOUS: event ${eventId} has all guests marked invitation.sent` +
          ` but attemptCount=0 — launching anyway. Investigate seed/admin overrides.`
      );
      try {
        await logAudit({
          action: "event.launched_no_dispatch",
          actor: { _id: null, role: "system" },
          targetType: "event",
          targetId: event._id,
          whitelabelId: event.whitelabelId || null,
          metadata: {
            reason: "all_guests_already_marked_sent",
            attemptCount: att,
            workerId,
          },
          status: "anomaly",
        });
      } catch (_) { /* swallow audit failure */ }
    } else {
      console.log(
        `[Cron] Event ${eventId} has no undelivered guests — finalising as launched`
      );
    }
    const lockEarly = await eventLock.acquire(eventId, workerId);
    if (!lockEarly.acquired) {
      return { launched: false, reason: "locked" };
    }
    try {
      const ev = await Event.findById(eventId);
      if (
        ev &&
        ev.status !== "live" &&
        ev.status !== "completed" &&
        ev.status !== "failed" &&
        ev.status !== "cancelled"
      ) {
        ev.status = "live";
        ev.launchedAt = new Date();
        ev.failureReason = null;
        await ev.save();
      }
      return { launched: true, reason: "all_already_delivered" };
    } finally {
      await _safeReleaseLock(eventId, workerId);
    }
  }

  // H-17: dynamically size the lock TTL based on the worst-case sendBulk
  // duration for this guestlist. With ratePerSecond=10 the previous fixed
  // 10-min TTL was too small for >6000 guests; a second cron tick would
  // reacquire the stale lock mid-send and double-fire the entire batch.
  const dynamicTtl = eventLock.estimateLockTtl(guestIds.length);
  const lock = await eventLock.acquire(eventId, workerId, { ttlMs: dynamicTtl });
  if (!lock.acquired) {
    console.log(`[Cron] Event ${eventId} is already locked by another worker — skipping`);
    return { launched: false, reason: "locked" };
  }

  // H-17: heartbeat refreshes lockedAt every minute so even if our TTL
  // estimate was wrong the lock stays alive while we're actively running.
  const beat = eventLock.heartbeat(eventId, workerId);

  // Re-read inside the lock in case another worker ran first.
  const fresh = await Event.findById(eventId);
  // Bail on any terminal state — defense in depth against a race between
  // the cron filter (which excludes these) and our re-read.
  if (
    !fresh ||
    fresh.status === "live" ||
    fresh.status === "completed" ||
    fresh.status === "failed" ||
    fresh.status === "cancelled"
  ) {
    await _safeReleaseLock(eventId, workerId);
    return { launched: false, reason: "stale" };
  }

  console.log(`[Cron] Launching event: ${eventId} (${fresh.eventDetails?.title}) attempt ${(fresh.attemptCount || 0) + 1}`);

  try {
    fresh.attemptCount = (fresh.attemptCount || 0) + 1;
    fresh.lastAttemptAt = new Date();
    await fresh.save();

    const channel = fresh.messagingStatus?.preferredChannel || "sms";
    // Phase 4c W0-RENAME — accept both canonical
    // `taqnyatTemplate.templateRef` (new wizard) and legacy
    // `invitationSettings.selectedTemplate.name` (pre-migration). The
    // launch cron must NOT skip WhatsApp on canonical-only events that
    // would otherwise have a Taqnyat template available.
    const canUseWhatsApp =
      !!fresh.taqnyatTemplate?.templateRef ||
      !!fresh.invitationSettings?.selectedTemplate?.name;
    const finalChannel = channel === "whatsapp" && canUseWhatsApp ? "whatsapp" : "sms";

    const sendResult = await messagingService.sendBulk({
      guestIds,
      eventId,
      channel: finalChannel,
    });

    if (!sendResult || sendResult.success === false) {
      const errMsg = sendResult?.error || sendResult?.message || "send_failed";
      fresh.failureReason = errMsg;
      await fresh.save();
      await logAudit({
        action: "event.launch_failed",
        actor: { _id: null, role: "system" },
        targetType: "event",
        targetId: fresh._id,
        whitelabelId: fresh.whitelabelId || null,
        metadata: {
          attemptCount: fresh.attemptCount,
          reason: errMsg,
          workerId,
        },
        status: "failure",
      });
      console.warn(`[Cron] Event ${eventId} send returned failure (attempt ${fresh.attemptCount}): ${errMsg}`);
      return { launched: false, reason: errMsg };
    }

    // Send succeeded (possibly with partial per-guest failures handled
    // by the retry-failed flow downstream). Flip to live now.
    fresh.status = "live";
    fresh.launchedAt = new Date();
    // Clear via `null`. Mongoose treats `undefined` as "leave field as-is"
    // on subdocuments / cast paths, so we explicitly null these out.
    fresh.failureReason = null;
    await fresh.save();

    await logAudit({
      action: "event.launched",
      actor: { _id: null, role: "system" },
      targetType: "event",
      targetId: fresh._id,
      whitelabelId: fresh.whitelabelId || null,
      changes: { after: { status: "live", launchedAt: fresh.launchedAt } },
      metadata: {
        sentTo: sendResult.successful ?? guestIds.length,
        failedSends: sendResult.failed ?? 0,
        attemptCount: fresh.attemptCount,
        workerId,
      },
    });

    console.log(`[Cron] Event ${eventId} launched (sent ${sendResult.successful || 0}/${guestIds.length})`);
    return { launched: true };
  } catch (err) {
    console.error(`[Cron] Event ${eventId} launch threw:`, err);
    try {
      // Only overwrite `failureReason` if the inner save didn't already set
      // a more specific one — `$set` here would otherwise clobber e.g. the
      // detailed `sendBulk` error string with the generic exception
      // message.
      await Event.updateOne(
        { _id: eventId, $or: [{ failureReason: null }, { failureReason: { $exists: false } }] },
        { $set: { failureReason: err.message || "exception" } }
      );
      await logAudit({
        action: "event.launch_failed",
        actor: { _id: null, role: "system" },
        targetType: "event",
        targetId: event._id,
        whitelabelId: event.whitelabelId || null,
        metadata: { reason: err.message, workerId },
        status: "failure",
      });
    } catch (_) {
      /* swallow audit failures */
    }
    return { launched: false, reason: err.message || "exception" };
  } finally {
    // The lock release MUST NOT throw out of `finally` — that would mask
    // the original error from the try/catch. _safeReleaseLock swallows.
    try { beat?.stop?.(); } catch (_) { /* heartbeat may be unset on early-out */ }
    await _safeReleaseLock(eventId, workerId);
  }
}

/**
 * Safely release the lock for `eventId`. Pass `workerId` so the release
 * is scoped to the lock WE acquired — without it a stale lock taken
 * over by another worker could be cleared out from under them. Errors
 * are swallowed so a release-time failure doesn't mask the original
 * error inside the caller's `finally`.
 */
async function _safeReleaseLock(eventId, workerId) {
  try {
    await eventLock.release(eventId, workerId);
  } catch (err) {
    console.error(`[Cron] eventLock.release(${eventId}) failed:`, err.message);
  }
}

/**
 * Daily event reminders - runs at 8:00 AM
 */
const scheduleEventReminders = () => {
  cron.schedule("0 8 * * *", async () => {
    console.log("[Cron] Running daily event reminders...");
    try {
      const todayEvents = await getTodayEvents();

      for (const event of todayEvents) {
        if (!event.host) continue;

        // Send in-app notification
        await notificationService.sendToUser(event.host._id, {
          type: "event_reminder",
          title: "Event Today!",
          titleAr: "مناسبتك اليوم!",
          message: `Your event "${event.eventDetails?.title || "Untitled"}" is scheduled for today.`,
          messageAr: `مناسبتك "${event.eventDetails?.title || "بدون عنوان"}" مجدولة لليوم.`,
          data: { eventId: event._id },
        });

        // Send email if host has email
        if (event.host.email) {
          try {
            await emailService.sendEventReminderEmail(
              event.host.email,
              {
                hostName: event.host.username || "Host",
                eventTitle: event.eventDetails?.title || "Your Event",
                eventDate: event.eventDetails?.date,
                eventTime: event.eventDetails?.time,
              },
              "ar" // Default to Arabic
            );
          } catch (emailError) {
            console.error(
              `Failed to send event reminder email to ${event.host.email}:`,
              emailError
            );
          }
        }
      }

      console.log(`[Cron] Sent reminders for ${todayEvents.length} events`);
    } catch (error) {
      console.error("[Cron] Event reminders failed:", error);
    }
  });
};

/**
 * Daily admin report - runs at 9:00 AM
 */
const scheduleDailyAdminReport = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("[Cron] Running daily admin report...");
    try {
      const reportData = await getAdminReportData(1);

      // Get all admins
      const admins = await User.find({
        role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        status: "active",
      }).select("email username");

      for (const admin of admins) {
        if (!admin.email) continue;

        try {
          // Generate PDF
          const pdfBuffer = await generateDailyReportPDF(reportData, "ar");

          // Send email with PDF attachment
          await emailService.sendDailyReportEmail(
            admin.email,
            reportData,
            "ar",
            pdfBuffer
          );
        } catch (emailError) {
          console.error(
            `Failed to send daily report to ${admin.email}:`,
            emailError
          );
        }
      }

      console.log(`[Cron] Sent daily report to ${admins.length} admins`);
    } catch (error) {
      console.error("[Cron] Daily admin report failed:", error);
    }
  });
};

/**
 * Weekly report - runs every Monday at 9:00 AM
 */
const scheduleWeeklyReport = () => {
  cron.schedule("0 9 * * 1", async () => {
    console.log("[Cron] Running weekly report...");
    try {
      const reportData = await getAdminReportData(7);

      // Get all admins
      const admins = await User.find({
        role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        status: "active",
      }).select("email username");

      for (const admin of admins) {
        if (!admin.email) continue;

        try {
          // Generate PDF
          const pdfBuffer = await generateWeeklyReportPDF(reportData, "ar");

          // Send email with PDF attachment
          await emailService.sendWeeklyReportEmail(
            admin.email,
            reportData,
            "ar",
            pdfBuffer
          );
        } catch (emailError) {
          console.error(
            `Failed to send weekly report to ${admin.email}:`,
            emailError
          );
        }
      }

      console.log(`[Cron] Sent weekly report to ${admins.length} admins`);
    } catch (error) {
      console.error("[Cron] Weekly report failed:", error);
    }
  });
};

/**
 * Subscription expiry check - runs daily at 6:00 AM
 */
const scheduleSubscriptionExpiryCheck = () => {
  cron.schedule("0 6 * * *", async () => {
    console.log("[Cron] Checking subscription expiry...");
    try {
      // Check subscriptions expiring in 7 days
      const expiringSoon = await getExpiringSubscriptions(7);

      for (const subscription of expiringSoon) {
        if (!subscription.userId) continue;

        const daysLeft = Math.ceil(
          (new Date(subscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
        );

        // Only notify at specific intervals (7 days, 3 days, 1 day)
        if (![7, 3, 1].includes(daysLeft)) continue;

        await notificationService.sendToUser(
          subscription.userId._id,
          {
            type: "subscription_expiring",
            title: "Subscription Expiring Soon",
            titleAr: "اشتراكك ينتهي قريباً",
            message: `Your subscription expires in ${daysLeft} day(s). Renew now to continue enjoying our services.`,
            messageAr: `ينتهي اشتراكك خلال ${daysLeft} يوم. جدد الآن للاستمرار في الاستفادة من خدماتنا.`,
            data: {
              subscriptionId: subscription._id,
              daysLeft,
              expiryDate: subscription.expiresAt,
            },
          }
        );

        // Send email for 3 days and 1 day warnings
        if ([3, 1].includes(daysLeft) && subscription.userId.email) {
          try {
            await emailService.sendSubscriptionAlertEmail(
              subscription.userId.email,
              {
                userName: subscription.userId.username || "User",
                planName: subscription.planId?.name || "Your Plan",
                daysLeft,
                expiryDate: subscription.expiresAt,
              },
              "ar"
            );
          } catch (emailError) {
            console.error(
              `Failed to send subscription alert email:`,
              emailError
            );
          }
        }
      }

      console.log(
        `[Cron] Processed ${expiringSoon.length} expiring subscriptions`
      );
    } catch (error) {
      console.error("[Cron] Subscription expiry check failed:", error);
    }
  });
};

/**
 * Mark live events as completed 24 hours after their event date — runs every hour.
 * A live event is one whose invitations have already been sent (status = 'live').
 */
const scheduleEventCompletion = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Event.updateMany(
        {
          status: "live",
          "eventDetails.date": { $lte: cutoff },
        },
        { $set: { status: "completed" } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[Cron] Marked ${result.modifiedCount} events as completed`);
      }
    } catch (error) {
      console.error("[Cron] Event completion job failed:", error);
    }
  });
};

/**
 * Helper: format a Date for Arabic reminders.
 *
 * M-5: explicit Asia/Riyadh time zone — without it, a UTC server formats
 * Riyadh-evening events as the previous calendar day in the reminder SMS.
 */
const { formatRiyadh } = require("./timezone");
const _formatDateAr = (date) => {
  if (!date) return "";
  return formatRiyadh(date, { style: "date", locale: "ar-SA" });
};

/**
 * Send 24-hour segmented Arabic reminder messages to all guests — runs every 30 minutes.
 * Targets events whose date falls within the next 23.5–24.5 hours (1-hour detection window).
 * Guests are segmented by RSVP status and each group receives a culturally appropriate message.
 * Sets messagingStatus.reminderSent = true after processing to prevent duplicate sends.
 */
const scheduleGuestReminders = () => {
  cron.schedule("*/30 * * * *", async () => {
    try {
      const now = Date.now();
      const windowStart = new Date(now + 23.5 * 3600 * 1000);
      const windowEnd = new Date(now + 24.5 * 3600 * 1000);

      const events = await Event.find({
        status: { $in: ["scheduled", "live"] },
        "eventDetails.date": { $gte: windowStart, $lte: windowEnd },
        "messagingStatus.reminderSent": { $ne: true },
      });

      if (events.length === 0) return;
      console.log(`[Cron] Sending 24h reminders for ${events.length} event(s)`);

      for (const event of events) {
        const dateAr = _formatDateAr(event.eventDetails?.date);
        const location = event.eventDetails?.location?.address || "";

        const guests = await Guest.find({
          event: event._id,
          "invitation.sent": true,
        });

        // Phase 3b.1: replace serial 100ms loop with runBatched
        // (concurrency 5, 10/sec). Same idempotency contract as the
        // launch send so a duplicated reminder cron tick within the same
        // 30-min window is a no-op.
        const buildMessage = (guest) => {
          if (guest.status === "confirmed") {
            return (
              `صديقي العزيز ${guest.name}،\n` +
              `نُذكِّركَ بفرحتنا التي لا تكتمل إلا بحضورك 🌹\n` +
              `غداً — ${dateAr} — ننتظرك بلهفة في ${location}.\n` +
              `نتمنى أن تصلنا بأحسن حال!`
            );
          }
          if (guest.status === "declined") {
            return (
              `أخي الكريم ${guest.name}،\n` +
              `قلوبنا معكم وإن تعذّر عليك الحضور.\n` +
              `ما زال الباب مفتوحاً، ويسعدنا كثيراً لو تشرّفتنا بحضورك في ${dateAr} 💛\n` +
              `نرجو لك السعادة دائماً.`
            );
          }
          const rsvpLink = `${process.env.FRONTEND_URL || "https://halaa.sa"}/rsvp/${event._id}/${guest._id}`;
          return (
            `عزيزنا ${guest.name}،\n` +
            `اقترب موعد مناسبتنا — ${dateAr} — ونتمنى من القلب أن نرى اسمك بين الحضور.\n` +
            `هل بإمكانك تأكيد حضورك؟ 🤍\n${rsvpLink}`
          );
        };

        await runBatched(
          guests,
          (guest) => {
            const reminderType = guest.status === "confirmed"
              ? "confirmed"
              : guest.status === "declined" ? "declined" : "nudge";
            const key = `reminder:${event._id}:${guest._id}:${reminderType}:24h`;
            return withIdempotency(key, async () => {
              const msg = buildMessage(guest);
              const waTemplateName =
                reminderType === "confirmed" ? "halaa_reminder_confirmed"
                : reminderType === "declined" ? "halaa_reminder_declined"
                : "halaa_reminder_nudge";

              let delivered = false;
              try {
                const waResult = await taqnyat.sendWhatsAppTemplate(
                  guest.phone,
                  waTemplateName,
                  "ar",
                  [{ type: "body", parameters: [{ type: "text", text: msg }] }]
                );
                if (waResult.success) delivered = true;
              } catch (_waErr) { /* fall through to SMS */ }

              if (!delivered) {
                try {
                  await taqnyat.sendSMS(guest.phone, msg, { sender: process.env.TAQNYAT_SENDER_NAME || "HalaaApp" });
                  delivered = true;
                } catch (smsErr) {
                  console.error(`[Cron] Reminder failed for guest ${guest._id}:`, smsErr.message);
                }
              }
              return { delivered };
            }, { scope: "guest_reminder" });
          },
          { concurrency: 5, ratePerSecond: 10 }
        );

        // Mark reminder as sent for this event to prevent re-processing
        await Event.findByIdAndUpdate(event._id, {
          $set: { "messagingStatus.reminderSent": true },
        });

        console.log(`[Cron] Reminders sent for event ${event._id} (${guests.length} guests)`);
      }
    } catch (error) {
      console.error("[Cron] Guest reminder job failed:", error);
    }
  });
};

/**
 * Poll Taqnyat for WhatsApp template approval status - runs every 30 minutes
 */
const scheduleTemplateStatusPolling = () => {
  cron.schedule("*/30 * * * *", async () => {
    try {
      const result = await messagingService.checkPendingTemplateStatuses();
      if (result.updated > 0) {
        console.log(`[Cron] Template status polling: checked ${result.checked}, updated ${result.updated}`);
      }
    } catch (error) {
      console.error("[Cron] Template status polling failed:", error);
    }
  });
};

/**
 * Subscription status auto-update — runs daily at 1:00 AM (FLOW-09-F03).
 *
 * Phase 2: the previous implementation queried the non-existent `endDate`
 * field and the non-existent `BILLING_CYCLES.ONCE` constant, so it has
 * been a no-op since the constants reorg. We now query `expiresAt` (the
 * real field) and emit a `subscription.expired` audit row per
 * transitioned record so admins can trace the lifecycle event.
 *
 * M-17: wrapped in `cronLease.withLease` so multi-instance deploys
 * don't fire the cron N times on the same minute and produce duplicate
 * audit + notification rows.
 */
const cronLease = require("./cronLease");
const scheduleSubscriptionStatusUpdate = () => {
  cron.schedule("0 1 * * *", async () => {
    const result = await cronLease.withLease(
      "subscription_status_update",
      async () => {
    try {
      const now = new Date(nowUtc());
      const expired = await Subscription.find({
        status: { $in: ["active", "trial"] },
        expiresAt: { $ne: null, $lt: now },
      }).select("_id userId planId status expiresAt whitelabelId");

      if (expired.length === 0) {
        return;
      }

      const ids = expired.map((s) => s._id);
      await Subscription.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "expired" } }
      );

      for (const sub of expired) {
        await logAudit({
          action: "subscription.expired",
          actor: { _id: null, role: "system" },
          targetType: "subscription",
          targetId: sub._id,
          whitelabelId: sub.whitelabelId || null,
          changes: {
            before: { status: sub.status },
            after: { status: "expired" },
          },
          metadata: {
            userId: sub.userId,
            planId: sub.planId,
            expiredAt: now.toISOString(),
          },
        });

        // H-12: notify the user when their subscription transitions to
        // expired. Previously hosts were silently downgraded, with no
        // in-app or email signal — they would only realise when they
        // tried to create an event and hit the quota wall. We send an
        // in-app notification + a renewal email (best-effort, gated on
        // `_shouldSendEmail`).
        if (sub.userId) {
          try {
            await notificationService.sendToUser(
              sub.userId,
              {
                type: "subscription_expired",
                title: "Your subscription has expired",
                titleAr: "انتهت صلاحية اشتراكك",
                message:
                  "Your plan has expired. Renew to keep creating events without interruption.",
                messageAr:
                  "انتهت صلاحية باقتك. جدّد الاشتراك للاستمرار في إنشاء الفعاليات.",
                actionUrl: `${process.env.FRONTEND_URL || "https://halaa.sa"}/ar/host/plans`,
                data: {
                  entityType: "subscription",
                  entityId: sub._id,
                  metadata: { planId: sub.planId },
                },
                priority: "high",
              },
              true /* sendEmail — uses generic notification template */
            );
          } catch (notifyErr) {
            // Non-fatal — the cron must keep running for the next sub.
            // eslint-disable-next-line no-console
            console.warn(
              "[Cron] subscription expiry notify failed for user %s: %s",
              sub.userId,
              notifyErr?.message
            );
          }
        }
      }

      console.log(`[Cron] Marked ${expired.length} subscriptions as expired`);
    } catch (e) {
      console.error("[Cron] Subscription status update failed:", e);
    }
      },
      { ttlMs: 10 * 60 * 1000 } // 10 minutes — comfortably > expected runtime
    );
    if (!result.ran) {
      console.log("[Cron] subscription_status_update — skipped (lease held by another node)");
    }
  });
};

/**
 * Launch retry cron — runs every 5 minutes (Phase 3c.1, FLOW-15-F02).
 *
 * For events that are still `scheduled` after their launch tick failed
 * (or never matched the 60s isDue window), this cron re-attempts the
 * bulk send within a 24h pre-launch retry window.
 *
 * Backoff (PHASE_3abc_PLAN.md, decision D5):
 *   attempt 1 → already happened in scheduleEventLaunch
 *   attempt 2 → 5 min after lastAttemptAt
 *   attempt 3 → 30 min
 *   attempt 4 → 2 h
 *   attempt 5 → 6 h
 *   attempt 6 → 12 h
 * After `MAX_ATTEMPTS = 5` retries (so attemptCount === 5), or if now is
 * more than `RETRY_WINDOW_MS = 24h` past the scheduled launch time, the
 * event flips to `failed` and notifications fire (FLOW-15-F05).
 *
 * Manual retry resets `attemptCount = 0` and pushes the event back to
 * `scheduled`; the next minute-tick of `scheduleEventLaunch` picks it up.
 */
const MAX_LAUNCH_ATTEMPTS = 5;
const LAUNCH_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
// L-7: backoff array length must be MAX_LAUNCH_ATTEMPTS - 1 (the gaps
// between attempts). The previous 5-entry array left the 5th value
// (`12h`) unreachable — `_isRetryDue` returns false once attempt >=
// MAX_LAUNCH_ATTEMPTS so index 4 is never consulted. We trim to four
// entries to make the contract explicit and prevent doc/code drift.
//   attempt 1 → wait LAUNCH_BACKOFF_MS[0] = 5 min  → attempt 2
//   attempt 2 → wait LAUNCH_BACKOFF_MS[1] = 30 min → attempt 3
//   attempt 3 → wait LAUNCH_BACKOFF_MS[2] = 2 h    → attempt 4
//   attempt 4 → wait LAUNCH_BACKOFF_MS[3] = 6 h    → attempt 5 (terminal)
const LAUNCH_BACKOFF_MS = [
  5 * 60 * 1000,        // 5 min
  30 * 60 * 1000,       // 30 min
  2 * 60 * 60 * 1000,   // 2 h
  6 * 60 * 60 * 1000,   // 6 h
];

/**
 * `attemptCount` is the number of attempts that have *already finished*.
 * After attempt 1 fails (attemptCount === 1) we want the wait BEFORE
 * attempt 2, which is `LAUNCH_BACKOFF_MS[0]` (5 min). So the index is
 * `attempt - 1`, clamped to the array bounds.
 *
 *   attempt 1 finished → wait LAUNCH_BACKOFF_MS[0] = 5 min  → attempt 2
 *   attempt 2 finished → wait LAUNCH_BACKOFF_MS[1] = 30 min → attempt 3
 *   attempt 3 finished → wait LAUNCH_BACKOFF_MS[2] = 2 h    → attempt 4
 *   attempt 4 finished → wait LAUNCH_BACKOFF_MS[3] = 6 h    → attempt 5
 */
const _isRetryDue = (event, now) => {
  const last = event.lastAttemptAt ? new Date(event.lastAttemptAt).getTime() : 0;
  const attempt = event.attemptCount || 0;
  if (attempt <= 0) return false;
  if (attempt >= MAX_LAUNCH_ATTEMPTS) return false;
  const backoffIdx = Math.min(attempt - 1, LAUNCH_BACKOFF_MS.length - 1);
  const wait = LAUNCH_BACKOFF_MS[backoffIdx];
  return now.getTime() - last >= wait;
};

const _markFailedAndNotify = async (event, reason) => {
  event.status = "failed";
  event.failedAt = new Date();
  event.failureReason = reason || event.failureReason || "max_attempts_exceeded";
  await event.save();

  const eventTitle = event.eventDetails?.title || "Untitled";
  const eventId = event._id;

  await logAudit({
    action: "event.launch_failed_terminal",
    actor: { _id: null, role: "system" },
    targetType: "event",
    targetId: eventId,
    whitelabelId: event.whitelabelId || null,
    changes: { after: { status: "failed", failedAt: event.failedAt } },
    metadata: {
      attemptCount: event.attemptCount,
      reason: event.failureReason,
    },
    status: "failure",
  });

  // Idempotent notification dispatch — even if this terminal-fail handler
  // somehow fires twice, the host/admin/super-admin only see one.
  //
  // B-6: previously this relied on `notificationService.sendToUser(..., true)`
  // to dispatch the email, which silently swallowed a TypeError because
  // `email.send.notification` didn't exist. We now (a) call the dedicated
  // `email.send.eventLaunchFailed` template directly, AND (b) keep the
  // sendToUser call so the in-app notification still lands. Either path
  // failing logs but does not throw.
  const notifyKey = `event_failed_notify:${eventId}`;
  await require("./idempotency").withIdempotency(notifyKey, async () => {
    if (event.host) {
      // (a) in-app notification (sendEmail=false because we send the
      //     dedicated template explicitly below).
      await notificationService.sendToUser(
        event.host,
        {
          type: "event_launch_failed",
          title: "Event launch failed",
          titleAr: "تعذّر إطلاق مناسبتك",
          message: `Your event "${eventTitle}" couldn't be launched after ${event.attemptCount} attempts. We're sorry.`,
          messageAr: `لم نتمكن من إطلاق مناسبتك "${eventTitle}" بعد ${event.attemptCount} محاولات. نعتذر عن ذلك.`,
          actionUrl: `${process.env.FRONTEND_URL || "https://halaa.sa"}/ar/host/events/${eventId}`,
          data: { entityType: "event", entityId: eventId, metadata: { reason: event.failureReason } },
          priority: "high",
        },
        false
      ).catch((err) => console.error("[retry-cron] notify host failed:", err.message));

      // (b) email — best-effort. Failure logs but doesn't throw because
      //     the in-app notification already landed and the cron must
      //     stay alive for the next event.
      try {
        const User = require("../../../models/UserModel");
        const host = await User.findById(event.host).select("email name preferredLanguage");
        if (host?.email) {
          const emailModule = require("../../infrastructure/email");
          await emailModule.send.eventLaunchFailed(
            host.email,
            {
              hostName: host.name || "",
              eventTitle,
              attemptCount: event.attemptCount,
              reason: event.failureReason,
              eventUrl: `${process.env.FRONTEND_URL || "https://halaa.sa"}/ar/host/events/${eventId}`,
              supportEmail: process.env.SUPPORT_EMAIL || null,
            },
            host.preferredLanguage === "en" ? "en" : "ar"
          );
        }
      } catch (emailErr) {
        console.error(
          "[retry-cron] launch-failed email send failed:",
          emailErr?.message
        );
      }
    }

    await notificationService.sendToAdmins({
      type: "event_launch_failed",
      title: "Event launch failed",
      titleAr: "فشل إطلاق مناسبة",
      message: `Event "${eventTitle}" failed to launch (host ${event.host}).`,
      messageAr: `فشل إطلاق مناسبة "${eventTitle}".`,
      data: { entityType: "event", entityId: eventId },
    }).catch((err) => console.error("[retry-cron] notify admins failed:", err.message));

    return { notified: true };
  }, { scope: "event_launch_failed_notify" });
};

const scheduleEventRetry = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      const candidates = await Event.find({
        status: "scheduled",
        attemptCount: { $gt: 0 },
        "launchSettings.scheduledDate": {
          $gte: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        },
      });

      for (const event of candidates) {
        const scheduledUtc = parseEventTime(event);
        if (!scheduledUtc) continue;

        // Beyond the 24h grace window? Terminal fail.
        if (now.getTime() > scheduledUtc.getTime() + LAUNCH_RETRY_WINDOW_MS) {
          await _markFailedAndNotify(event, "retry_window_expired");
          continue;
        }

        // Hit max attempts? Terminal fail.
        if ((event.attemptCount || 0) >= MAX_LAUNCH_ATTEMPTS) {
          await _markFailedAndNotify(event, "max_attempts_exceeded");
          continue;
        }

        if (!_isRetryDue(event, now)) continue;

        console.log(`[Cron] Retry attempt ${(event.attemptCount || 0) + 1}/${MAX_LAUNCH_ATTEMPTS} for event ${event._id}`);
        await runEventLaunch(event, "cron-retry");
      }
    } catch (error) {
      console.error("[Cron] Event retry failed:", error);
    }
  });
};

// ============================================
// INITIALIZATION
// ============================================

const initScheduledTasks = () => {
  console.log("[Cron] Initializing scheduled tasks...");

  scheduleEventReminders();
  scheduleDailyAdminReport();
  scheduleWeeklyReport();
  scheduleSubscriptionExpiryCheck();
  scheduleSubscriptionStatusUpdate();
  scheduleEventLaunch();
  scheduleEventRetry();
  scheduleTemplateStatusPolling();
  scheduleEventCompletion();
  scheduleGuestReminders();

  // Phase 4c W0-MODEL: daily Taqnyat-template upstream sync.
  try {
    const { scheduleTaqnyatTemplateSync } = require("../../jobs/syncTaqnyatTemplates");
    scheduleTaqnyatTemplateSync();
  } catch (err) {
    console.error("[Cron] Failed to register taqnyat-template sync:", err.message);
  }

  console.log("[Cron] Scheduled tasks initialized:");
  console.log("  - Event reminders (host): Daily at 8:00 AM");
  console.log("  - Daily admin report: Daily at 9:00 AM");
  console.log("  - Weekly report: Monday at 9:00 AM");
  console.log("  - Subscription expiry check: Daily at 6:00 AM");
  console.log("  - Subscription status update: Daily at 1:00 AM");
  console.log("  - Event launches (WhatsApp bulk send): Every minute");
  console.log("  - Event launch retry: Every 5 minutes");
  console.log("  - Template status polling: Every 30 minutes");
  console.log("  - Event completion (live → completed): Every hour");
  console.log("  - 24h guest reminder SMS: Every 30 minutes");
  console.log("  - Taqnyat-template upstream sync: Daily at 3:30 AM");
};

module.exports = {
  initScheduledTasks,
  // Export individual functions for testing
  getAdminReportData,
  getTodayEvents,
  getExpiringSubscriptions,
  scheduleEventLaunch,
  scheduleEventRetry,
  scheduleEventCompletion,
  scheduleGuestReminders,
  runEventLaunch,
  MAX_LAUNCH_ATTEMPTS,
  LAUNCH_RETRY_WINDOW_MS,
};
