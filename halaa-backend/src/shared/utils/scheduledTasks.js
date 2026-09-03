/**
 * Scheduled Tasks
 * Cron jobs for automated notifications and reports
 */

const cron = require("node-cron");
const User = require("../../../models/UserModel");
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Subscription = require("../../../models/SubscriptionModel");
const Notification = require("../../../models/NotificationModel");
// Use the active notifications service (with preference gating). The
// shared/utils notificationService still exists for the `notifyX` helpers
// that other code references, but those helpers do not gate on user
// preferences and we want cron-driven notifications to respect them.
const notificationService = require("../../modules/notifications/notifications.service");
const emailService = require("./emailService");
const messagingService = require("../../modules/messaging/messaging.service");
const messagingReminderService = require("../../modules/messaging/messaging.reminder.service");
const taqnyatTemplatesService = require("../../modules/taqnyat-templates/taqnyat-templates.service");
const taqnyat = require("../../infrastructure/taqnyat");
const { runBatched } = require("./runBatched");
const { withIdempotency, sha256 } = require("./idempotency");
const { runReconcileTick } = require("../../modules/payments/payments.reconcile");
const {
  generateDailyReportPDF,
  generateWeeklyReportPDF,
} = require("./pdfGenerator");
const { parseEventTime, isDue, nowUtc } = require("./timezone");
const { getActiveEventGuestsFilter } = require("./guestFilter");
const { eventInstantOf } = require("./schedulingWindow");
const {
  resolveTaqnyatTemplate,
  computeInvitationFingerprint,
} = require("../../modules/messaging/messaging.formatting");
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
  }).populate("host", "email name phoneNumber");
};

/**
 * Get subscriptions expiring soon
 */
const getExpiringSubscriptions = async (daysAhead = 7) => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Subscription schema field is `expiresAt`.
  return Subscription.find({
    status: { $in: ["active", "trial"] },
    expiresAt: { $gte: now, $lte: futureDate },
  }).populate("userId", "email name phoneNumber");
};

// ============================================
// SCHEDULED TASKS
// ============================================

/**
 * Check for scheduled event launches - runs every minute.
 *
 * Fetches the day's scheduled events and uses `timezone.isDue` to compare in
 * real UTC, deriving the Riyadh wall-clock from the host's chosen
 * `scheduledTime`. Comparing `now.getHours()/getMinutes()` (server local
 * time) against the host's scheduled wall-clock string would break whenever
 * the server timezone wasn't Asia/Riyadh — UTC servers would fire 3 hours
 * late, etc.
 *
 *   - Send-then-mark-live ordering: `sendBulk` runs first; only on success
 *     do we flip the event to `live`. On failure the status stays
 *     `scheduled` (the retry cron handles re-attempts; after exhaustion it
 *     transitions to `failed`).
 *   - Send lock: acquired via `eventLock.acquire` before any send,
 *     released in `finally`. Prevents a dual-tick race from double-firing.
 *   - Every event launches via this cron regardless of channel.
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

  // Centralized dispatch-policy gate
  const dispatchPolicy = require("../../modules/messaging/messaging.dispatchPolicy.service");
  const decision = await dispatchPolicy.assertCanDispatch(
    event,
    { workerId, path: "cron-launch" },
    { requireInvites: true }
  );
  if (!decision.allowed) {
    return { launched: false, reason: `dispatch_blocked:${decision.reason}` };
  }

  const dynamicTtl = eventLock.estimateLockTtl(allGuestIds.length);
  const lock = await eventLock.acquire(eventId, workerId, { ttlMs: dynamicTtl });
  if (!lock.acquired) {
    console.log(`[Cron] Event ${eventId} is already locked by another worker — skipping`);
    return { launched: false, reason: "locked" };
  }

  const beat = eventLock.heartbeat(eventId, workerId);

  try {
    // Re-read inside the lock in case another worker ran first.
    const fresh = await Event.findById(eventId).populate('host', 'name email preferredLanguage');
    if (!fresh || fresh.status !== 'scheduled') {
      return { launched: false, reason: "stale" };
    }

    // Pre-launch fingerprint validation: test message must match current event content
    const cachedTemplate = await resolveTaqnyatTemplate(fresh);
    const currentFingerprint = computeInvitationFingerprint(fresh, cachedTemplate);

    if (!fresh.testMessageSent || fresh.testMessageFingerprint !== currentFingerprint) {
      console.warn(
        `[Cron] Event ${eventId} launch aborted: test message missing or outdated fingerprint`
      );
      await Event.updateOne(
        { _id: eventId, status: "scheduled" },
        {
          $set: {
            status: "pending_scheduling",
            testMessageSent: false,
            testMessageFingerprint: null,
            failureReason: "untested_changes",
          },
          $unset: {
            "launchSettings.scheduledDate": 1,
            "launchSettings.scheduledTime": 1,
          },
        }
      );

      if (fresh.host) {
        notificationService
          .sendToUser(fresh.host, {
            type: "event_unscheduled",
            title: "تم إلغاء جدولة الإرسال",
            titleAr: "تم إلغاء جدولة الإرسال",
            message: "تم تعديل تفاصيل الفعالية بعد الاختبار، يرجى إرسال رسالة تجريبية وإعادة الجدولة.",
            messageAr: "تم تعديل تفاصيل الفعالية بعد الاختبار، يرجى إرسال رسالة تجريبية وإعادة الجدولة.",
            data: { entityType: "event", entityId: fresh._id },
          })
          .catch(() => {});
      }

      try {
        await logAudit({
          action: "event.launch_aborted_untested",
          actor: { _id: null, role: "system" },
          targetType: "event",
          targetId: fresh._id,
          metadata: { reason: "untested_changes", workerId },
          status: "failure",
        });
      } catch (_) {}

      return { launched: false, reason: "untested_changes" };
    }

    if (fresh.subscriptionId) {
      const sub = await Subscription.findById(fresh.subscriptionId).select(
        "status expiresAt"
      );
      const valid =
        sub &&
        ["active", "trial"].includes(sub.status) &&
        (!sub.expiresAt || new Date(sub.expiresAt).getTime() > Date.now());
      if (!valid) {
        const reason = !sub
          ? "subscription_missing"
          : sub.status !== "active" && sub.status !== "trial"
          ? `subscription_${sub.status}`
          : "subscription_expired";
        console.warn(
          `[Cron] Event ${eventId} NOT launched — ${reason}; skipping scheduled send.`
        );
        await Event.updateOne(
          { _id: eventId, $or: [{ failureReason: null }, { failureReason: { $exists: false } }] },
          { $set: { failureReason: reason } }
        ).catch(() => {});
        try {
          await logAudit({
            action: "event.launch_blocked",
            actor: { _id: null, role: "system" },
            targetType: "event",
            targetId: fresh._id,
            metadata: { reason, subscriptionId: String(fresh.subscriptionId), workerId },
            status: "failure",
          });
        } catch (_) { /* swallow audit failure */ }
        return { launched: false, reason };
      }
    }

    // Resolve the authoritative current-list subset only after the lock and
    // fingerprint gate. This prevents stale pre-lock recipient snapshots from
    // being dispatched after a concurrent guest-list edit.
    const Guest = require("../../../models/GuestModel");
    const undelivered = await Guest.find({
      ...getActiveEventGuestsFilter(eventId, fresh.guestList),
      "invitation.sent": { $ne: true },
    })
      .select("_id")
      .lean();
    const guestIds = undelivered.map((guest) => guest._id.toString());

    if (guestIds.length === 0) {
      fresh.status = 'live';
      fresh.launchedAt = new Date();
      fresh.failureReason = null;
      fresh.messagingStatus = fresh.messagingStatus || {};
      fresh.messagingStatus.deliveryStatus = 'delivered';
      fresh.messagingStatus.failedCount = 0;
      fresh.messagingStatus.pendingCount = 0;
      await fresh.save();
      await logAudit({
        action: 'event.launched_no_dispatch',
        actor: { _id: null, role: 'system' },
        targetType: 'event',
        targetId: fresh._id,
        metadata: { reason: 'all_guests_already_marked_sent', workerId },
        status: 'success',
      }).catch(() => {});
      return { launched: true, reason: 'all_already_delivered' };
    }

    console.log(`[Cron] Launching event: ${eventId} (${fresh.eventDetails?.title}) attempt ${(fresh.attemptCount || 0) + 1}`);

    try {
      fresh.attemptCount = (fresh.attemptCount || 0) + 1;
      fresh.lastAttemptAt = new Date();
      await fresh.save();

      const channel = fresh.messagingStatus?.preferredChannel || "sms";
      const canUseWhatsApp = !!fresh.taqnyatTemplate?.templateRef;
      const finalChannel = channel === "whatsapp" && canUseWhatsApp ? "whatsapp" : "sms";

      const sendResult = await messagingService.sendInitialLaunchBatch({
        guestIds,
        eventId,
        channel: finalChannel,
        attemptId: fresh.lastAttemptAt.getTime(),
      });

      fresh.status = "live";
      fresh.launchedAt = new Date();
      fresh.failureReason = null;
      if (sendResult.failed === 0) {
        fresh.messagingStatus = fresh.messagingStatus || {};
        fresh.messagingStatus.deliveryStatus = "delivered";
        fresh.messagingStatus.deliveryExhaustedAt = null;
        fresh.messagingStatus.lastError = null;
      }
      await fresh.save();

      await logAudit({
        action: "event.launched",
        actor: { _id: null, role: "system" },
        targetType: "event",
        targetId: fresh._id,
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
      const reason = err.code || err.message || "exception";
      try {
        await Event.updateOne(
          { _id: eventId, $or: [{ failureReason: null }, { failureReason: { $exists: false } }] },
          { $set: { failureReason: reason } }
        );
        await logAudit({
          action: "event.launch_failed",
          actor: { _id: null, role: "system" },
          targetType: "event",
          targetId: event._id,
          metadata: { reason, message: err.message, workerId },
          status: "failure",
        });
      } catch (_) {
        /* swallow audit failures */
      }
      return { launched: false, reason };
    }
  } finally {
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
                hostName: event.host.name || "Host",
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
      }).select("email name");

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
      }).select("email name");

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
                recipientName: subscription.userId?.name || "User",
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

const runEventCompletion = async (now = new Date()) => {
  // Step 1: Candidate search: live events where date has passed + 24h
  const candidates = await Event.find({
    status: "live",
    "eventDetails.date": { $lte: now },
  }).select("_id host eventDetails status completionNotificationStatus");

  for (const event of candidates) {
    try {
      const eventInstant = eventInstantOf(event);
      const completionDueAt = new Date(eventInstant.getTime() + 24 * 60 * 60 * 1000);

      if (now.getTime() < completionDueAt.getTime()) {
        continue;
      }

      // Atomically claim the completion transition
      await Event.findOneAndUpdate(
        { _id: event._id, status: "live" },
        {
          $set: {
            status: "completed",
            completedAt: now,
            completionNotificationStatus: "pending",
          },
        }
      );
    } catch (eventErr) {
      console.error(`[Cron] Event ${event._id} completion processing failed:`, eventErr.message);
    }
  }

  // Step 2: Query completed events with pending/failed notifications for durable outbox delivery
  const pendingNotificationEvents = await Event.find({
    status: "completed",
    completionNotificationStatus: { $in: ["pending", "failed"] },
  }).populate("host", "name email preferredLanguage");

  for (const completedDoc of pendingNotificationEvents) {
    if (completedDoc.host) {
      try {
        const title = completedDoc.eventDetails?.title || "Untitled";
        const notifyKey = `event_completion_notify:${completedDoc._id}`;
        const notifyRequestHash = sha256({ eventId: String(completedDoc._id), type: 'event_completed' });
        await withIdempotency(
          notifyKey,
          () => notificationService.sendToUser(completedDoc.host, {
            type: "event_completed",
            title: "Event Completed",
            titleAr: "اكتملت المناسبة",
            message: `Your event "${title}" is now marked as completed.`,
            messageAr: `تم تحديث حالة مناسبتك "${title}" إلى مكتملة.`,
            data: { entityType: "event", entityId: completedDoc._id },
          }),
          { scope: 'event_completion_notify', requestHash: notifyRequestHash }
        );

        await Event.updateOne(
          { _id: completedDoc._id },
          {
            $set: {
              completionNotificationStatus: "sent",
              completionNotifiedAt: new Date(),
            },
          }
        );
      } catch (err) {
        console.error(`[Cron] Event ${completedDoc._id} completion notification failed:`, err?.message);
        await Event.updateOne(
          { _id: completedDoc._id },
          { $set: { completionNotificationStatus: "failed" } }
        ).catch(() => {});
      }
    }
  }
};

const scheduleEventCompletion = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      await runEventCompletion(new Date());
    } catch (error) {
      console.error("[Cron] Event completion job failed:", error);
    }
  });
};

/**
 * Helper: format a Date for Arabic reminders.
 *
 * Explicit Asia/Riyadh time zone — without it, a UTC server formats
 * Riyadh-evening events as the previous calendar day in the reminder SMS.
 */
const { formatRiyadh, parseReminderTime } = require("./timezone");
const _formatDateAr = (date) => {
  if (!date) return "";
  return formatRiyadh(date, { style: "date", locale: "ar-SA" });
};

/**
 * Send auto reminders to guests — runs every 15 minutes and fires on events
 * whose scheduled reminder time is due, or legacy events falling in the 48h window.
 *
 * The free auto-reminder targets CONFIRMED guests only, using the
 * `(event.eventDetails.type, reminder_confirmed)` template. Non-responders /
 * Declined guests get nothing from the automatic reminder — re-engaging
 * them is a pool-charged action (resend invite / extra reminder). Templates
 * are looked up by `(category, reminder_confirmed)`.
 * A missing template audits and skips — it does not crash the tick.
 */
const scheduleGuestReminders = () => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();
      
      // Load events that have custom reminder settings scheduled for the next 60 minutes or in the past
      const dateLimit = new Date(now.getTime() + 60 * 60 * 1000);
      const eventsWithSettings = await Event.find({
        status: { $in: ["scheduled", "live"] },
        "reminderSettings.scheduledDate": { $lte: dateLimit },
        "messagingStatus.reminderSent": { $ne: true },
      }).populate("host", "name");

      // Load legacy events without custom settings that fall into the 48h window
      const windowStart = new Date(now.getTime() + 47.5 * 3600 * 1000);
      const windowEnd = new Date(now.getTime() + 48.5 * 3600 * 1000);
      const legacyEvents = await Event.find({
        status: { $in: ["scheduled", "live"] },
        "eventDetails.date": { $gte: windowStart, $lte: windowEnd },
        "reminderSettings.scheduledDate": { $exists: false },
        "messagingStatus.reminderSent": { $ne: true },
      }).populate("host", "name");

      // Combine arrays
      const allEvents = [...eventsWithSettings];
      const legacyIds = new Set(eventsWithSettings.map(e => String(e._id)));
      for (const event of legacyEvents) {
        if (!legacyIds.has(String(event._id))) {
          allEvents.push(event);
        }
      }

      if (allEvents.length === 0) return;

      for (const event of allEvents) {
        let shouldSend = false;

        if (event.reminderSettings && event.reminderSettings.scheduledDate) {
          const scheduledTime = parseReminderTime(event);
          if (scheduledTime) {
            const diffMs = now.getTime() - scheduledTime.getTime();
            const diffSec = diffMs / 1000;
            // Send if scheduled time is in the past, and within a 60 minutes grace window
            shouldSend = diffSec >= 0 && diffSec < 3600;
          }
        } else {
          // Legacy event (already matches the 48h query window)
          shouldSend = true;
        }

        if (shouldSend) {
          console.log(`[Cron] Sending reminders for event ${event._id} (custom: ${!!event.reminderSettings?.customReminderTime})`);
          await _runAutoReminderForEvent(event);
        }
      }
    } catch (error) {
      console.error("[Cron] Guest reminder job failed:", error);
    }
  });
};

/**
 * Process one event's 48h auto reminder. Targets CONFIRMED guests only, looks
 * up the `(category, reminder_confirmed)` template, dispatches via the
 * messaging helper, and records per-guest tracking. The auto-reminder is FREE
 * (no invite consumption). Marks the event's `messagingStatus.reminderSent`
 * after sending so the next tick is a no-op.
 */
async function _runAutoReminderForEvent(event) {
  const category = event.eventDetails?.type || null;
  const eventId = event._id;

  // Centralized dispatch-policy gate — reminders are a
  // guest-facing send path, so a suspended owner / lapsed-or-refunding
  // subscription / terminal event must NOT trigger reminder dispatch.
  const dispatchPolicy = require("../../modules/messaging/messaging.dispatchPolicy.service");
  const decision = await dispatchPolicy.assertCanDispatch(event, { path: "cron-reminder" });
  if (!decision.allowed) {
    return { reminded: false, reason: `dispatch_blocked:${decision.reason}` };
  }

  const allGuests = await Guest.find({
    event: eventId,
    "invitation.sent": true,
    deleted: { $ne: true },
  });

  // Confirmed-only audience. Non-responders and declined guests get nothing
  // from the free auto-reminder — re-engaging them is a pool-charged action.
  const confirmedGuests = allGuests.filter(
    (guest) => guest.rsvp?.response === "confirmed"
  );

  let totalSuccess = 0;
  let totalFailed = 0;

  if (confirmedGuests.length > 0) {
    const template = await taqnyatTemplatesService
      .findActiveByCategoryAndType(category, "reminder_confirmed")
      .catch(() => null);

    if (!template) {
      await logAudit({
        action: "reminder.template_missing",
        actor: { _id: null, role: "system" },
        targetType: "event",
        targetId: eventId,
        metadata: {
          category,
          type: "reminder_confirmed",
          skippedGuestCount: confirmedGuests.length,
        },
        status: "failure",
      }).catch(() => {});
    } else {
      const result = await messagingReminderService.sendAutoReminderBatch({
        event,
        guests: confirmedGuests,
        reminderType: "reminder_confirmed",
        template,
      });

      totalSuccess += result.successful;
      totalFailed += result.failed;

      // Per-guest tracking writes for successful sends. Failures intentionally
      // do not flip autoReminderSent so the next tick (if still in the
      // detection window AND event hasn't been marked yet) could retry —
      // though in practice the per-event flag below normally locks future
      // ticks out.
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
    }
  }

  await Event.findByIdAndUpdate(eventId, {
    $set: {
      "messagingStatus.reminderSent": true,
      "messagingStatus.reminderSentAt": new Date(),
    },
  });

  await logAudit({
    action: totalFailed === 0 ? "reminder.auto_dispatched" : "reminder.auto_failed",
    actor: { _id: null, role: "system" },
    targetType: "event",
    targetId: eventId,
    metadata: {
      category,
      confirmedCount: confirmedGuests.length,
      successful: totalSuccess,
      failed: totalFailed,
    },
    status: totalFailed === 0 ? "success" : totalSuccess === 0 ? "failure" : "partial",
  }).catch(() => {});

  console.log(
    `[Cron] Reminders sent for event ${eventId} — confirmed:${confirmedGuests.length} ok:${totalSuccess} fail:${totalFailed}`
  );
}

/**
 * Subscription status auto-update — runs daily at 1:00 AM.
 *
 * Queries `expiresAt` and emits a `subscription.expired` audit row per
 * transitioned record so admins can trace the lifecycle event.
 *
 * Wrapped in `cronLease.withLease` so multi-instance deploys
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
      }).select("_id userId planId status expiresAt");

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

        // Notify the user when their subscription transitions to
        // expired. Without this hosts are silently downgraded, with no
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
 * Launch retry cron — runs every 5 minutes.
 *
 * For events that are still `scheduled` after their launch tick failed
 * (or never matched the 60s isDue window), this cron re-attempts the
 * bulk send within a 24h pre-launch retry window.
 *
 * Backoff:
 *   attempt 1 → already happened in scheduleEventLaunch
 *   attempt 2 → 5 min after lastAttemptAt
 *   attempt 3 → 30 min
 *   attempt 4 → 2 h
 *   attempt 5 → 6 h
 *   attempt 6 → 12 h
 * After `MAX_ATTEMPTS = 5` retries (so attemptCount === 5), or if now is
 * more than `RETRY_WINDOW_MS = 24h` past the scheduled launch time, the
 * event flips to `failed` and notifications fire.
 *
 * Manual retry resets `attemptCount = 0` and pushes the event back to
 * `scheduled`; the next minute-tick of `scheduleEventLaunch` picks it up.
 */
const MAX_LAUNCH_ATTEMPTS = 5;
const LAUNCH_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
// Backoff array length must be MAX_LAUNCH_ATTEMPTS - 1 (the gaps
// between attempts). A 5th value (`12h`) would be unreachable —
// `_isRetryDue` returns false once attempt >= MAX_LAUNCH_ATTEMPTS so
// index 4 is never consulted. Four entries keep the contract explicit
// and prevent doc/code drift.
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
  // (a) call the dedicated `email.send.eventLaunchFailed` template directly,
  // AND (b) keep the sendToUser call so the in-app notification still lands.
  // Either path failing logs but does not throw.
  const notifyKey = `event_failed_notify:${eventId}`;
  const notifyRequestHash = sha256({ eventId: String(eventId) });
  await withIdempotency(notifyKey, async () => {
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
  }, { scope: "event_launch_failed_notify", requestHash: notifyRequestHash });
};

async function _deliverPartialFailureNotification(event) {
  const reason = event.messagingStatus?.lastError || 'delivery_retries_exhausted';
  const notifyKey = `partial_delivery_failed:${event._id}:${event.attemptCount || 0}:${reason}`;
  const notifyRequestHash = sha256({
    eventId: String(event._id),
    attemptCount: event.attemptCount || 0,
    reason,
  });

  try {
    await withIdempotency(
      notifyKey,
      async () => {
        if (event.host) {
          await notificationService.sendToUser(
            event.host,
            {
              type: 'event_partial_delivery_failed',
              title: 'تعذر تسليم بعض الدعوات',
              titleAr: 'تعذر تسليم بعض الدعوات',
              message: `تعذر تسليم بعض الدعوات لمناسبتك "${event.eventDetails?.title || ''}". يمكنك إعادة المحاولة يدوياً من لوحة التحكم.`,
              messageAr: `تعذر تسليم بعض الدعوات لمناسبتك "${event.eventDetails?.title || ''}". يمكنك إعادة المحاولة يدوياً من لوحة التحكم.`,
              actionUrl: `${process.env.FRONTEND_URL || 'https://halaa.sa'}/ar/host/events/${event._id}`,
              data: { entityType: 'event', entityId: event._id, metadata: { reason } },
              priority: 'high',
            },
            false
          );
        }
        return { notified: true };
      },
      { scope: 'partial_delivery_failed_notify', requestHash: notifyRequestHash }
    );

    await Event.updateOne(
      {
        _id: event._id,
        'messagingStatus.failureNotificationStatus': { $in: ['pending', 'failed'] },
      },
      {
        $set: {
          'messagingStatus.failureNotificationStatus': 'sent',
          'messagingStatus.failureNotificationSentAt': new Date(),
        },
      }
    );
  } catch (error) {
    await Event.updateOne(
      { _id: event._id },
      { $set: { 'messagingStatus.failureNotificationStatus': 'failed' } }
    ).catch(() => {});
    throw error;
  }
}

const scheduleEventRetry = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      // Durable partial-delivery notification outbox. These events are no
      // longer retry candidates for message delivery, so notification retries
      // must be processed independently on every cron run.
      const pendingFailureNotifications = await Event.find({
        status: 'live',
        'messagingStatus.deliveryStatus': 'partial_delivery_failed',
        'messagingStatus.failureNotificationStatus': { $in: ['pending', 'failed'] },
      });
      for (const failedEvent of pendingFailureNotifications) {
        await _deliverPartialFailureNotification(failedEvent).catch((error) => {
          console.error(`[Cron] Partial delivery notification retry failed for event ${failedEvent._id}:`, error.message);
        });
      }

      const candidates = await Event.find({
        $or: [
          {
            status: "scheduled",
            attemptCount: { $gt: 0 },
            "launchSettings.scheduledDate": {
              $gte: new Date(now.getTime() - 48 * 60 * 60 * 1000),
              $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000),
            },
          },
          {
            status: "live",
            "messagingStatus.failedCount": { $gt: 0 },
            "messagingStatus.deliveryStatus": { $ne: "partial_delivery_failed" },
            attemptCount: { $gt: 0 },
          },
        ],
      });

      for (const event of candidates) {
        const scheduledUtc = parseEventTime(event);
        if (!scheduledUtc) continue;

        // Branch 1: Scheduled event (initial launch never succeeded)
        if (event.status === "scheduled") {
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
          continue;
        }

        // Branch 2: Live event with partial delivery failures
        if (event.status === "live") {
          const isExhausted =
            (event.attemptCount || 0) >= MAX_LAUNCH_ATTEMPTS ||
            now.getTime() > scheduledUtc.getTime() + LAUNCH_RETRY_WINDOW_MS;

          if (isExhausted) {
            const reason = (event.attemptCount || 0) >= MAX_LAUNCH_ATTEMPTS ? "max_attempts_exceeded" : "retry_window_expired";
            event.messagingStatus = event.messagingStatus || {};
            event.messagingStatus.deliveryStatus = "partial_delivery_failed";
            event.messagingStatus.deliveryExhaustedAt = new Date();
            event.messagingStatus.lastError = reason;
            event.messagingStatus.failureNotificationStatus = "pending";
            await event.save();

            await _deliverPartialFailureNotification(event).catch((notifErr) => {
              console.error(`[Cron] Partial delivery failure notification failed for event ${event._id}:`, notifErr?.message);
            });

            continue;
          }

          if (!_isRetryDue(event, now)) continue;

          const lock = await eventLock.acquire(event._id.toString(), "cron-live-retry", { ttlMs: 60000 });
          if (!lock.acquired) continue;

          try {
            const Guest = require("../../../models/GuestModel");
            const failedGuests = await Guest.find({
              ...getActiveEventGuestsFilter(event._id, event.guestList),
              "invitation.status": "failed",
              $or: [
                { "invitation.failedAttempts": { $exists: false } },
                { "invitation.failedAttempts": { $lt: 3 } },
              ],
            }).select("_id");

            if (failedGuests.length > 0) {
              event.attemptCount = (event.attemptCount || 0) + 1;
              event.lastAttemptAt = new Date();
              await event.save();

              await Guest.updateMany(
                { _id: { $in: failedGuests.map((g) => g._id) } },
                { $inc: { "invitation.failedAttempts": 1 } }
              );

              const channel = event.messagingStatus?.preferredChannel || "sms";
              await messagingService.sendInitialLaunchBatch({
                guestIds: failedGuests.map((g) => g._id.toString()),
                eventId: event._id,
                channel,
                attemptId: `retry_${Date.now()}`,
              });
            }
          } catch (err) {
            console.error(`[Cron] Live retry failed for event ${event._id}:`, err.message);
          } finally {
            await _safeReleaseLock(event._id.toString(), "cron-live-retry");
          }
        }
      }
    } catch (error) {
      console.error("[Cron] Event retry failed:", error);
    }
  });
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Deliver scheduled notifications that have passed their scheduledFor time.
 *
 * Runs every 5 minutes. Finds notifications where:
 *   isScheduled === true
 *   scheduledFor <= now
 *
 * Uses runBatched for bulk delivery (concurrency 10, 50/sec — purely
 * in-process Mongo writes, no external rate cap applies).
 *
 * Status lifecycle:
 *   pending  (isScheduled=true, deliveryStatus.app.sent=false)
 *     → delivered  (isScheduled=false, deliveryStatus.app.sent=true/sentAt=now)
 *     → failed     (isScheduled=false, deliveryStatus.app.error=<message>)
 *
 * Audit: emits notification.broadcast for admin-triggered batches (any batch
 * dispatched by this cron is treated as a system-level broadcast).
 */
const scheduleNotificationDelivery = () => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const due = await Notification.find({
        isScheduled: true,
        scheduledFor: { $lte: now },
      }).lean();

      if (due.length === 0) return;

      console.log(`[Cron] scheduleNotificationDelivery: ${due.length} due notification(s)`);

      const batchResult = await runBatched(
        due,
        async (notification) => {
          try {
            await Notification.findByIdAndUpdate(notification._id, {
              $set: {
                isScheduled: false,
                "deliveryStatus.app.sent": true,
                "deliveryStatus.app.sentAt": new Date(),
              },
            });
            return { delivered: true };
          } catch (err) {
            // Mark as failed so it does not re-process on the next tick.
            await Notification.findByIdAndUpdate(notification._id, {
              $set: {
                isScheduled: false,
                "deliveryStatus.app.sent": false,
                "deliveryStatus.app.error": err.message || "delivery_failed",
              },
            }).catch(() => {});
            throw err;
          }
        },
        { concurrency: 10, ratePerSecond: 50 }
      );

      console.log(
        `[Cron] scheduleNotificationDelivery: delivered=${batchResult.successful} failed=${batchResult.failed}`
      );

      // Audit: log a notification.broadcast row for this system-triggered batch.
      if (batchResult.total > 0) {
        logAudit({
          action: "notification.broadcast",
          actor: { _id: null, role: "system" },
          targetType: "notification",
          metadata: {
            trigger: "scheduled_delivery_cron",
            recipientCount: batchResult.total,
            delivered: batchResult.successful,
            failed: batchResult.failed,
            runAt: now.toISOString(),
          },
        }).catch((err) =>
          console.error("[Cron] scheduleNotificationDelivery audit failed:", err.message)
        );
      }
    } catch (err) {
      console.error("[Cron] scheduleNotificationDelivery error:", err.message);
    }
  });
};

// ─────────────────────────────────────────────────────────────────
// Payment reconciliation cron (every 5 minutes).
// Catches Payment rows stuck in `pending` / `pending_3ds` for > 2 min,
// pulls fresh state from Moyasar, and finalizes any outstanding
// subscription / addon intent the way the webhook would.
// ─────────────────────────────────────────────────────────────────
const schedulePaymentReconcile = () => {
  cron.schedule("*/5 * * * *", async () => {
    const result = await cronLease.withLease(
      "payment_reconcile",
      async () => {
        try {
          const { scanned, reconciled } = await runReconcileTick();
          if (scanned > 0) {
            // eslint-disable-next-line no-console
            console.log(
              `[Cron] payment_reconcile: scanned=${scanned} reconciled=${reconciled}`
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[Cron] payment_reconcile error:", err.message);
        }
      },
      { ttlMs: 4 * 60 * 1000 }
    );
    if (!result.ran) {
      // eslint-disable-next-line no-console
      console.log("[Cron] payment_reconcile — skipped (lease held by another node)");
    }
  });
};

// ─────────────────────────────────────────────────────────────────
// Subscription renewal cron (daily at 02:00).
// For every active subscription expiring in <= 3 days that has no
// pending invoice yet, ask the subscription service to open a
// Moyasar invoice and email the host the payment link.
// ─────────────────────────────────────────────────────────────────
const scheduleSubscriptionRenewal = () => {
  cron.schedule("0 2 * * *", async () => {
    const result = await cronLease.withLease(
      "subscription_renewal",
      async () => {
        try {
          const subscriptionsService = require("../../modules/subscriptions/subscriptions.service");
          const cutoff = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          const candidates = await Subscription.find({
            status: { $in: ["active", "past_due"] },
            expiresAt: { $ne: null, $lte: cutoff },
            $or: [
              { "metadata.pendingInvoiceId": { $exists: false } },
              { "metadata.pendingInvoiceId": null },
            ],
          }).select("_id userId planId expiresAt status").limit(200);

          let opened = 0;
          for (const sub of candidates) {
            try {
              if (typeof subscriptionsService.renewSubscription === "function") {
                await subscriptionsService.renewSubscription(sub._id);
                opened += 1;
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(
                "[Cron] subscription_renewal sub %s: %s",
                sub._id,
                err?.message
              );
            }
          }
          if (candidates.length > 0) {
            // eslint-disable-next-line no-console
            console.log(
              `[Cron] subscription_renewal: candidates=${candidates.length} invoicesOpened=${opened}`
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[Cron] subscription_renewal error:", err.message);
        }
      },
      { ttlMs: 30 * 60 * 1000 }
    );
    if (!result.ran) {
      // eslint-disable-next-line no-console
      console.log("[Cron] subscription_renewal — skipped (lease held by another node)");
    }
  });
};

// ─────────────────────────────────────────────────────────────────
// Account-deletion cleanup retry cron (every 5 minutes).
// Converges deletion requests stuck in `pending_retry` (account closed but
// residual personal S3 objects not yet deleted) to `completed`. Leased so a
// multi-node deploy doesn't double-process. DEL-02 / P1-02.
// ─────────────────────────────────────────────────────────────────
const scheduleAccountDeletionRetry = () => {
  cron.schedule("*/5 * * * *", async () => {
    const result = await cronLease.withLease(
      "account_deletion_retry",
      async () => {
        try {
          const { runDeletionRetryTick } = require("../../modules/account-deletion/deletion.retry");
          const { scanned, completed } = await runDeletionRetryTick();
          if (scanned > 0) {
            // eslint-disable-next-line no-console
            console.log(
              `[Cron] account_deletion_retry: scanned=${scanned} completed=${completed}`
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[Cron] account_deletion_retry error:", err.message);
        }
      },
      { ttlMs: 4 * 60 * 1000 }
    );
    if (!result.ran) {
      // eslint-disable-next-line no-console
      console.log("[Cron] account_deletion_retry — skipped (lease held by another node)");
    }
  });
};

// Owner-approved retention policy. Disabled until deployment explicitly opts
// in. Dry-run is the default even when scheduled, so a production deploy cannot
// delete data merely because the cron code exists.
const schedulePrivacyRetention = () => {
  if (process.env.RETENTION_ENFORCEMENT_ENABLED !== "true") return;
  cron.schedule("0 3 * * *", async () => {
    const result = await cronLease.withLease(
      "privacy_retention",
      async () => {
        try {
          const { runRetention } = require("../../modules/privacy/retention.service");
          const dryRun = process.env.RETENTION_EXECUTION_CONFIRMED !== "true";
          const run = await runRetention({
            dryRun,
            batchSize: Number(process.env.RETENTION_BATCH_SIZE) || 250,
          });
          console.log(`[Cron] privacy_retention: run=${run.runId} mode=${run.mode} status=${run.status}`);
        } catch (err) {
          console.error("[Cron] privacy_retention error:", err.message);
        }
      },
      { ttlMs: 55 * 60 * 1000 }
    );
    if (!result.ran) console.log("[Cron] privacy_retention — skipped (lease held by another node)");
  });
};

// Expire stale business checkout links hourly. Retained
// records — `expireStale` only flips pending_payment → expired, never deletes.
const scheduleBusinessLinkExpiry = () => {
  cron.schedule("30 * * * *", async () => {
    try {
      const assignmentService = require("../../modules/business/business.assignment.service");
      await assignmentService.expireStale(new Date());
    } catch (err) {
      console.error("[Cron] business link expiry failed:", err?.message);
    }
  });
};

const initScheduledTasks = () => {
  console.log("[Cron] Initializing scheduled tasks...");

  scheduleEventReminders();
  scheduleDailyAdminReport();
  scheduleWeeklyReport();
  scheduleSubscriptionExpiryCheck();
  scheduleSubscriptionStatusUpdate();
  scheduleEventLaunch();
  scheduleEventRetry();
  scheduleEventCompletion();
  scheduleGuestReminders();
  scheduleNotificationDelivery();
  schedulePaymentReconcile();
  scheduleSubscriptionRenewal();
  scheduleBusinessLinkExpiry();
  scheduleAccountDeletionRetry();
  schedulePrivacyRetention();

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
  console.log("  - 48h guest reminder SMS: Every 30 minutes");
  console.log("  - Scheduled notification delivery: Every 5 minutes");
  console.log("  - Payment reconciliation: Every 5 minutes");
  console.log("  - Subscription renewal (Moyasar invoice): Daily at 2:00 AM");
  console.log("  - Privacy retention: Daily at 3:00 AM when explicitly enabled (dry-run unless execution confirmed)");
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
  schedulePaymentReconcile,
  scheduleSubscriptionRenewal,
  runEventLaunch,
  runEventCompletion,
  MAX_LAUNCH_ATTEMPTS,
  LAUNCH_RETRY_WINDOW_MS,
};
