/**
 * Email Service - Backward Compatibility Layer
 *
 * This file provides backward compatibility with the old email service API.
 * All functionality has been moved to the new organized email module at /email
 *
 * @deprecated Use require('../email') instead for new code
 * @see ../email/index.js
 */

const emailModule = require("../../../email");

// Re-export the sender instance as the default export
const emailService = emailModule.sender;

// Add convenience methods to match old API
emailService.sendTemplatedEmail = async (
  templateName,
  to,
  data,
  lang = "ar",
  options = {}
) => {
  return emailModule.send.template(templateName, to, data, lang, options);
};

// Legacy method mappings
emailService.sendWelcomeEmail = async (to, data, lang = "ar") => {
  return emailModule.send.welcome(to, data, lang);
};

emailService.sendPasswordResetEmail = async (to, data, lang = "ar") => {
  return emailModule.send.passwordReset(to, data, lang);
};

emailService.sendEventReminderEmail = async (to, data, lang = "ar") => {
  return emailModule.send.eventReminder(to, data, lang);
};

emailService.sendGuestRsvpEmail = async (to, data, lang = "ar") => {
  return emailModule.send.guestRsvp(to, data, lang);
};

emailService.sendSubscriptionAlertEmail = async (to, data, lang = "ar") => {
  return emailModule.send.subscriptionAlert(to, data, lang);
};

emailService.sendVendorApprovalEmail = async (to, data, lang = "ar") => {
  return emailModule.send.vendorApproval(to, data, lang);
};

emailService.sendDailyReportEmail = async (
  to,
  data,
  lang = "ar",
  pdfBuffer = null
) => {
  return emailModule.send.dailyReport(to, data, lang, pdfBuffer);
};

emailService.sendWeeklyReportEmail = async (
  to,
  data,
  lang = "ar",
  pdfBuffer = null
) => {
  return emailModule.send.weeklyReport(to, data, lang, pdfBuffer);
};

emailService.sendInvitationReportEmail = async (
  to,
  data,
  lang = "ar",
  pdfBuffer = null
) => {
  return emailModule.send.invitationReport(to, data, lang, pdfBuffer);
};

emailService.sendTicketNotificationEmail = async (to, data, lang = "ar") => {
  return emailModule.send.ticketCreated(to, data, lang);
};

emailService.sendVendorApplicationPendingEmail = async (
  to,
  data,
  lang = "ar"
) => {
  return emailModule.send.vendorApplicationPending(to, data, lang);
};

emailService.sendStaffAccessEmail = async (to, data, lang = "ar") => {
  return emailModule.send.staffAccess(to, data, lang);
};

emailService.sendPostEventEmail = async (to, data, lang = "ar") => {
  return emailModule.send.postEvent(to, data, lang);
};

emailService.sendGuestCheckInEmail = async (to, data, lang = "ar") => {
  return emailModule.send.guestCheckIn(to, data, lang);
};

// Export templates for backward compatibility
const EMAIL_TEMPLATES = emailModule.TEMPLATE_REGISTRY;

module.exports = emailService;
module.exports.EmailService = emailModule.sender.constructor;
module.exports.EMAIL_TEMPLATES = EMAIL_TEMPLATES;

// Also export the new email module for gradual migration
module.exports.emailModule = emailModule;
