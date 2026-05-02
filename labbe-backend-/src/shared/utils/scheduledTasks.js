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
const {
  generateDailyReportPDF,
  generateWeeklyReportPDF,
} = require("./pdfGenerator");
const { ROLES, BILLING_CYCLES } = require("../constants");
const { parseEventTime, isDue } = require("./timezone");

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

  return Subscription.find({
    status: { $in: ["active", "trial"] },
    endDate: { $gte: now, $lte: futureDate },
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
        console.log(`[Cron] Launching event: ${event._id} (${event.eventDetails?.title})`);

        // Get guest IDs
        // guestList contains ObjectIds
        const guestIds = event.guestList ? event.guestList.map(id => id.toString()) : [];

        if (!guestIds || guestIds.length === 0) {
          // Don't launch with zero guests — keep current status
          console.warn(`[Cron] Event ${event._id} has no guests, skipping launch`);
          continue;
        }

        // Update event status to LIVE immediately to prevent re-processing
        // This prevents race conditions if sending invitations takes > 1 minute
        event.status = "live";
        await event.save();
        console.log(`[Cron] Event ${event._id} status updated to 'live'`);

        if (guestIds.length > 0) {
          try {
            const channel = event.messagingStatus?.preferredChannel || "sms";
            const canUseWhatsApp = !!(event.invitationSettings?.selectedTemplate?.name);
            const finalChannel = channel === "whatsapp" && canUseWhatsApp ? "whatsapp" : "sms";

            if (finalChannel === "sms" && event.launchSettings?.taqnyatDeleteId) {
              // SMS was already scheduled natively via Taqnyat's scheduledDatetime field.
              // Firing sendBulk here would send a duplicate SMS to every guest.
              // Taqnyat is handling delivery — no action needed.
              console.log(`[Cron] Event ${event._id} SMS managed by Taqnyat (deleteId: ${event.launchSettings.taqnyatDeleteId}), skipping duplicate send`);
            } else {
              await messagingService.sendBulk({ guestIds, eventId: event._id.toString(), channel: finalChannel });
              console.log(`[Cron] Invitations sent for event ${event._id} via ${finalChannel}`);
            }
          } catch (invitationError) {
            console.error(`[Cron] Failed to send invitations for event ${event._id}:`, invitationError);
            // Status remains 'live' but logged failure. Manual retry might be needed.
          }
        }
      }
    } catch (error) {
      console.error("[Cron] Scheduled event launch failed:", error);
    }
  });
};

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
          (new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
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
              expiryDate: subscription.endDate,
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
                expiryDate: subscription.endDate,
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
 * Helper: format a Date for Arabic reminders
 */
const _formatDateAr = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

        for (const guest of guests) {
          let msg;

          if (guest.status === "confirmed") {
            // Warm confirmation reminder for guests who already said they'll attend
            msg =
              `صديقي العزيز ${guest.name}،\n` +
              `نُذكِّركَ بفرحتنا التي لا تكتمل إلا بحضورك 🌹\n` +
              `غداً — ${dateAr} — ننتظرك بلهفة في ${location}.\n` +
              `نتمنى أن تصلنا بأحسن حال!`;
          } else if (guest.status === "declined") {
            // Soft re-invite for guests who declined
            msg =
              `أخي الكريم ${guest.name}،\n` +
              `قلوبنا معكم وإن تعذّر عليك الحضور.\n` +
              `ما زال الباب مفتوحاً، ويسعدنا كثيراً لو تشرّفتنا بحضورك في ${dateAr} 💛\n` +
              `نرجو لك السعادة دائماً.`;
          } else {
            // Friendly nudge for 'maybe' and guests who never responded
            const rsvpLink = `${process.env.FRONTEND_URL || "https://halaa.sa"}/rsvp/${event._id}/${guest._id}`;
            msg =
              `عزيزنا ${guest.name}،\n` +
              `اقترب موعد مناسبتنا — ${dateAr} — ونتمنى من القلب أن نرى اسمك بين الحضور.\n` +
              `هل بإمكانك تأكيد حضورك؟ 🤍\n${rsvpLink}`;
          }

          // Template name per segment — must be pre-approved by Meta via submitTemplateForApproval.
          // If the WA template is not yet approved the send will fail and SMS fallback fires.
          const waTemplateName =
            guest.status === "confirmed" ? "halaa_reminder_confirmed" :
            guest.status === "declined"  ? "halaa_reminder_declined"  :
                                           "halaa_reminder_nudge";

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
            } catch (smsErr) {
              console.error(`[Cron] Reminder failed for guest ${guest._id}:`, smsErr.message);
            }
          }

          // Small delay to stay within Taqnyat rate limits
          await new Promise((r) => setTimeout(r, 100));
        }

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
 * Subscription status auto-update - runs daily at 1:00 AM
 * Marks expired subscriptions as "expired" (Bug 11)
 */
const scheduleSubscriptionStatusUpdate = () => {
  cron.schedule("0 1 * * *", async () => {
    try {
      const result = await Subscription.updateMany(
        {
          status: { $in: ["active", "trial"] },
          endDate: { $lt: new Date() },
          billingCycle: { $ne: BILLING_CYCLES.ONCE },
        },
        { $set: { status: "expired" } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[Cron] Marked ${result.modifiedCount} subscriptions as expired`);
      }
    } catch (e) {
      console.error("[Cron] Subscription status update failed:", e);
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
  scheduleTemplateStatusPolling();
  scheduleEventCompletion();
  scheduleGuestReminders();

  console.log("[Cron] Scheduled tasks initialized:");
  console.log("  - Event reminders (host): Daily at 8:00 AM");
  console.log("  - Daily admin report: Daily at 9:00 AM");
  console.log("  - Weekly report: Monday at 9:00 AM");
  console.log("  - Subscription expiry check: Daily at 6:00 AM");
  console.log("  - Subscription status update: Daily at 1:00 AM");
  console.log("  - Event launches (WhatsApp bulk send): Every minute");
  console.log("  - Template status polling: Every 30 minutes");
  console.log("  - Event completion (live → completed): Every hour");
  console.log("  - 24h guest reminder SMS: Every 30 minutes");
};

module.exports = {
  initScheduledTasks,
  // Export individual functions for testing
  getAdminReportData,
  getTodayEvents,
  getExpiringSubscriptions,
  scheduleEventLaunch,
  scheduleEventCompletion,
  scheduleGuestReminders,
};
