/**
 * Email Service - Main Entry Point
 *
 * A comprehensive email service for the Labbe platform.
 * Provides organized email templates, sending capabilities, and utilities.
 *
 * @module email
 * @example
 * // Import the email service
 * const emailService = require('./email');
 *
 * // Send a welcome email
 * await emailService.send.welcome('user@example.com', { name: 'John' }, 'en');
 *
 * // Or use templates directly
 * const { subject, html } = emailService.templates.auth.welcomeEmail({ name: 'John' }, 'en');
 * await emailService.sender.sendEmail('user@example.com', subject, html);
 */

// Core modules
const config = require("./config");
const layout = require("./layout");
const sender = require("./sender");

// Templates
const templates = require("./templates");

// ============================================
// CONVENIENCE SEND METHODS
// ============================================

/**
 * Convenience methods for sending emails with templates
 * Each method handles template generation and sending in one call
 */
const send = {
  // ==========================================
  // AUTH EMAILS
  // ==========================================

  /**
   * Send welcome email
   * @param {string} to - Recipient email
   * @param {Object} data - { name, email, dashboardUrl, role }
   * @param {string} lang - Language (ar/en)
   */
  welcome: async (to, data, lang = "ar") => {
    const { subject, html } = templates.auth.welcomeEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {Object} data - { name, resetUrl, expiresIn }
   * @param {string} lang - Language (ar/en)
   */
  passwordReset: async (to, data, lang = "ar") => {
    const { subject, html } = templates.auth.passwordResetEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send password setup email (post-approval)
   * @param {string} to - Recipient email
   * @param {Object} data - { name, setupUrl, email, planName, expiresIn }
   * @param {string} lang - Language (ar/en)
   */
  passwordSetup: async (to, data, lang = "ar") => {
    const { subject, html } = templates.auth.passwordSetupEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send email verification email
   * @param {string} to - Recipient email
   * @param {Object} data - { name, verificationUrl, expiresIn }
   * @param {string} lang - Language (ar/en)
   */
  emailVerification: async (to, data, lang = "ar") => {
    const { subject, html } = templates.auth.emailVerificationEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send password changed notification
   * @param {string} to - Recipient email
   * @param {Object} data - { name, changedAt, ipAddress, deviceInfo }
   * @param {string} lang - Language (ar/en)
   */
  passwordChanged: async (to, data, lang = "ar") => {
    const { subject, html } = templates.auth.passwordChangedEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send login alert email
   * @param {string} to - Recipient email
   * @param {Object} data - { name, loginAt, ipAddress, deviceInfo, location }
   * @param {string} lang - Language (ar/en)
   */
  loginAlert: async (to, data, lang = "ar") => {
    const { subject, html } = templates.auth.loginAlertEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // EVENT EMAILS
  // ==========================================

  /**
   * Send event reminder email
   * @param {string} to - Recipient email
   * @param {Object} data - { hostName, eventTitle, eventDate, eventTime, venue, timeUntil, eventUrl, guestCount }
   * @param {string} lang - Language (ar/en)
   */
  eventReminder: async (to, data, lang = "ar") => {
    const { subject, html } = templates.events.eventReminderEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send guest RSVP notification
   * @param {string} to - Recipient email
   * @param {Object} data - { hostName, guestName, response, eventTitle, eventUrl, totalConfirmed, totalDeclined }
   * @param {string} lang - Language (ar/en)
   */
  guestRsvp: async (to, data, lang = "ar") => {
    const { subject, html } = templates.events.guestRsvpEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send guest check-in notification
   * @param {string} to - Recipient email
   * @param {Object} data - { hostName, guestName, eventTitle, checkedInBy, checkedInAt, totalCheckedIn, totalGuests }
   * @param {string} lang - Language (ar/en)
   */
  guestCheckIn: async (to, data, lang = "ar") => {
    const { subject, html } = templates.events.guestCheckInEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send event created confirmation
   * @param {string} to - Recipient email
   * @param {Object} data - { hostName, eventTitle, eventDate, eventTime, venue, guestCount, eventUrl }
   * @param {string} lang - Language (ar/en)
   */
  eventCreated: async (to, data, lang = "ar") => {
    const { subject, html } = templates.events.eventCreatedEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send invitations sent confirmation
   * @param {string} to - Recipient email
   * @param {Object} data - { hostName, eventTitle, sentCount, totalGuests, eventUrl }
   * @param {string} lang - Language (ar/en)
   */
  invitationsSent: async (to, data, lang = "ar") => {
    const { subject, html } = templates.events.invitationsSentEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send event-launch-failed email (B-6 / FLOW-15-F05).
   * @param {string} to
   * @param {Object} data - { hostName, eventTitle, attemptCount, reason, eventUrl, supportEmail }
   * @param {string} lang
   */
  eventLaunchFailed: async (to, data, lang = "ar") => {
    const { subject, html } = templates.events.eventLaunchFailedEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Generic notification email — fallback for notification types that have
   * no dedicated template. The notifications service calls this whenever
   * `sendToUser(..., true)` runs and no type-specific helper matches.
   *
   * Previously the service called `send.notification` but the method did
   * not exist, so all notification emails silently failed. (B-6 root cause.)
   *
   * @param {string} to
   * @param {Object} data - { title, message, actionUrl }
   * @param {string} lang
   */
  notification: async (to, data, lang = "ar") => {
    const { subject, html } = templates.events.genericNotificationEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // SUBSCRIPTION EMAILS
  // ==========================================

  /**
   * Send subscription alert email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, alertType, planName, daysLeft, expiryDate, subscriptionUrl }
   * @param {string} lang - Language (ar/en)
   */
  subscriptionAlert: async (to, data, lang = "ar") => {
    const { subject, html } = templates.subscriptions.subscriptionAlertEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send subscription created email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, planName, features, price, billingCycle, startDate, endDate, dashboardUrl }
   * @param {string} lang - Language (ar/en)
   */
  subscriptionCreated: async (to, data, lang = "ar") => {
    const { subject, html } = templates.subscriptions.subscriptionCreatedEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send payment confirmation email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, amount, currency, planName, paymentDate, invoiceNumber, paymentMethod, invoiceUrl }
   * @param {string} lang - Language (ar/en)
   */
  paymentConfirmation: async (to, data, lang = "ar") => {
    const { subject, html } = templates.subscriptions.paymentConfirmationEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send payment failed email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, amount, currency, planName, reason, retryUrl }
   * @param {string} lang - Language (ar/en)
   */
  paymentFailed: async (to, data, lang = "ar") => {
    const { subject, html } = templates.subscriptions.paymentFailedEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // VENDOR EMAILS
  // ==========================================

  /**
   * Send vendor application pending email
   * @param {string} to - Recipient email
   * @param {Object} data - { vendorName, brandName, email, category }
   * @param {string} lang - Language (ar/en)
   */
  vendorApplicationPending: async (to, data, lang = "ar") => {
    const { subject, html } = templates.vendors.vendorApplicationPendingEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send vendor approval email
   * @param {string} to - Recipient email
   * @param {Object} data - { vendorName, brandName, dashboardUrl, setupPasswordUrl }
   * @param {string} lang - Language (ar/en)
   */
  vendorApproval: async (to, data, lang = "ar") => {
    const { subject, html } = templates.vendors.vendorApprovalEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send vendor rejection email
   * @param {string} to - Recipient email
   * @param {Object} data - { vendorName, brandName, reason, supportEmail, reapplyUrl }
   * @param {string} lang - Language (ar/en)
   */
  vendorRejection: async (to, data, lang = "ar") => {
    const { subject, html } = templates.vendors.vendorRejectionEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // WHITELABEL EMAILS
  // ==========================================

  /**
   * Send whitelabel application pending email
   * @param {string} to - Recipient email
   * @param {Object} data - { platformName, email, planName, contactPerson }
   * @param {string} lang - Language (ar/en)
   */
  whitelabelApplicationPending: async (to, data, lang = "ar") => {
    const { subject, html } =
      templates.whitelabels.whitelabelApplicationPendingEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send whitelabel approval email
   * @param {string} to - Recipient email
   * @param {Object} data - { platformName, email, planName, setupPasswordUrl, dashboardUrl, features }
   * @param {string} lang - Language (ar/en)
   */
  whitelabelApproval: async (to, data, lang = "ar") => {
    const { subject, html } = templates.whitelabels.whitelabelApprovalEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send whitelabel rejection email
   * @param {string} to - Recipient email
   * @param {Object} data - { platformName, reason, supportEmail, reapplyUrl }
   * @param {string} lang - Language (ar/en)
   */
  whitelabelRejection: async (to, data, lang = "ar") => {
    const { subject, html } = templates.whitelabels.whitelabelRejectionEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send moderator added email
   * @param {string} to - Recipient email
   * @param {Object} data - { moderatorName, platformName, addedBy, permissions, setupPasswordUrl, dashboardUrl }
   * @param {string} lang - Language (ar/en)
   */
  moderatorAdded: async (to, data, lang = "ar") => {
    const { subject, html } = templates.whitelabels.moderatorAddedEmail(
      data,
      lang
    );
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // REPORT EMAILS
  // ==========================================

  /**
   * Send daily report email
   * @param {string} to - Recipient email
   * @param {Object} data - { adminName, date, stats, alerts, dashboardUrl, attachmentNote }
   * @param {string} lang - Language (ar/en)
   * @param {Buffer} pdfBuffer - Optional PDF attachment
   */
  dailyReport: async (to, data, lang = "ar", pdfBuffer = null) => {
    const { subject, html } = templates.reports.dailyReportEmail(data, lang);
    if (pdfBuffer) {
      data.attachmentNote = true;
      return sender.sendEmailWithPdf(
        to,
        subject,
        html,
        pdfBuffer,
        `daily-report-${data.date}.pdf`
      );
    }
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send weekly report email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, role, weekRange, stats, upcomingEvents, dashboardUrl, attachmentNote }
   * @param {string} lang - Language (ar/en)
   * @param {Buffer} pdfBuffer - Optional PDF attachment
   */
  weeklyReport: async (to, data, lang = "ar", pdfBuffer = null) => {
    const { subject, html } = templates.reports.weeklyReportEmail(data, lang);
    if (pdfBuffer) {
      data.attachmentNote = true;
      return sender.sendEmailWithPdf(
        to,
        subject,
        html,
        pdfBuffer,
        `weekly-report-${data.weekRange.replace(/\s/g, "-")}.pdf`
      );
    }
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send invitation report email
   * @param {string} to - Recipient email
   * @param {Object} data - { hostName, eventTitle, eventDate, stats, guestBreakdown, eventUrl, attachmentNote }
   * @param {string} lang - Language (ar/en)
   * @param {Buffer} pdfBuffer - Optional PDF attachment
   */
  invitationReport: async (to, data, lang = "ar", pdfBuffer = null) => {
    const { subject, html } = templates.reports.invitationReportEmail(
      data,
      lang
    );
    if (pdfBuffer) {
      data.attachmentNote = true;
      return sender.sendEmailWithPdf(
        to,
        subject,
        html,
        pdfBuffer,
        `invitation-report-${data.eventTitle.replace(/\s/g, "-")}.pdf`
      );
    }
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // SUPPORT EMAILS
  // ==========================================

  /**
   * Send ticket created email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, ticketId, subject, category, priority, message, ticketUrl }
   * @param {string} lang - Language (ar/en)
   */
  ticketCreated: async (to, data, lang = "ar") => {
    const { subject, html } = templates.support.ticketCreatedEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send ticket response email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, ticketId, subject, agentName, response, ticketUrl }
   * @param {string} lang - Language (ar/en)
   */
  ticketResponse: async (to, data, lang = "ar") => {
    const { subject, html } = templates.support.ticketResponseEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send ticket resolved email
   * @param {string} to - Recipient email
   * @param {Object} data - { userName, ticketId, subject, resolution, feedbackUrl, ticketUrl }
   * @param {string} lang - Language (ar/en)
   */
  ticketResolved: async (to, data, lang = "ar") => {
    const { subject, html } = templates.support.ticketResolvedEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // STAFF EMAILS
  // ==========================================

  /**
   * Send staff portal access email
   * @param {string} to - Recipient email
   * @param {Object} data - { staffName, eventTitle, eventDate, eventTime, venue, hostName, link, expiresIn }
   * @param {string} lang - Language (ar/en)
   */
  staffAccess: async (to, data, lang = "ar") => {
    const { subject, html } = templates.staff.staffAccessEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send post-event content email
   * @param {string} to - Recipient email
   * @param {Object} data - { guestName, eventTitle, hostName, eventDate, link, mediaCount, expiresIn }
   * @param {string} lang - Language (ar/en)
   */
  postEvent: async (to, data, lang = "ar") => {
    const { subject, html } = templates.staff.postEventEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send guest invitation email
   * @param {string} to - Recipient email
   * @param {Object} data - { guestName, eventTitle, hostName, eventDate, eventTime, venue, message, rsvpUrl, mapUrl }
   * @param {string} lang - Language (ar/en)
   */
  guestInvitation: async (to, data, lang = "ar") => {
    const { subject, html } = templates.staff.guestInvitationEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  /**
   * Send guest reminder email
   * @param {string} to - Recipient email
   * @param {Object} data - { guestName, eventTitle, hostName, eventDate, eventTime, venue, timeUntil, rsvpUrl, mapUrl }
   * @param {string} lang - Language (ar/en)
   */
  guestReminder: async (to, data, lang = "ar") => {
    const { subject, html } = templates.staff.guestReminderEmail(data, lang);
    return sender.sendEmail(to, subject, html);
  },

  // ==========================================
  // GENERIC TEMPLATE SEND
  // ==========================================

  /**
   * Send email using template name from registry
   * @param {string} templateName - Template name from TEMPLATE_REGISTRY
   * @param {string} to - Recipient email
   * @param {Object} data - Template data
   * @param {string} lang - Language (ar/en)
   * @param {Object} options - Additional send options
   */
  template: async (templateName, to, data, lang = "ar", options = {}) => {
    const templateFn = templates.getTemplate(templateName);
    if (!templateFn) {
      throw new Error(`Email template "${templateName}" not found`);
    }
    const { subject, html } = templateFn(data, lang);
    return sender.sendEmail(to, options.subject || subject, html, options);
  },
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core modules
  config,
  layout,
  sender,
  templates,

  // Convenience send methods
  send,

  // Direct access to sender instance
  sendEmail: sender.sendEmail.bind(sender),
  sendEmailWithPdf: sender.sendEmailWithPdf.bind(sender),
  sendEmailWithAttachments: sender.sendEmailWithAttachments.bind(sender),
  sendBulkEmails: sender.sendBulkEmails.bind(sender),

  // Configuration utilities
  getConfig: config.getConfig,
  createTransporter: config.createTransporter,

  // Layout utilities
  getBaseLayout: layout.getBaseLayout,
  COLORS: layout.COLORS,

  // Template utilities
  getTemplate: templates.getTemplate,
  getTemplateNames: templates.getTemplateNames,
  hasTemplate: templates.hasTemplate,
  TEMPLATE_REGISTRY: templates.TEMPLATE_REGISTRY,

  // Service management
  initialize: () => sender.initialize(),
  verifyConnection: () => sender.verifyConnection(),
  close: () => sender.close(),
};
