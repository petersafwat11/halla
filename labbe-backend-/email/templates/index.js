/**
 * Email Templates Index
 * Exports all email templates organized by category
 */

// Import all template modules
const authTemplates = require("./auth");
const eventsTemplates = require("./events");
const subscriptionsTemplates = require("./subscriptions");
const vendorsTemplates = require("./vendors");
const whitelabelsTemplates = require("./whitelabels");
const reportsTemplates = require("./reports");
const supportTemplates = require("./support");
const staffTemplates = require("./staff");

// ============================================
// TEMPLATE CATEGORIES
// ============================================

/**
 * Authentication Templates
 * - welcomeEmail
 * - passwordResetEmail
 * - passwordSetupEmail
 * - emailVerificationEmail
 * - passwordChangedEmail
 * - accountDeactivatedEmail
 * - loginAlertEmail
 */
const auth = authTemplates;

/**
 * Event Templates
 * - eventReminderEmail
 * - guestRsvpEmail
 * - guestCheckInEmail
 * - eventCreatedEmail
 * - eventUpdatedEmail
 * - eventCancelledEmail
 * - invitationsSentEmail
 * - eventScheduledEmail
 * - eventCompletedEmail
 */
const events = eventsTemplates;

/**
 * Subscription Templates
 * - subscriptionAlertEmail
 * - subscriptionCreatedEmail
 * - subscriptionUpgradedEmail
 * - subscriptionDowngradedEmail
 * - paymentConfirmationEmail
 * - paymentFailedEmail
 * - subscriptionCancelledEmail
 * - usageLimitWarningEmail
 */
const subscriptions = subscriptionsTemplates;

/**
 * Vendor Templates
 * - vendorApplicationPendingEmail
 * - vendorApprovalEmail
 * - vendorRejectionEmail
 * - vendorProfileUpdateEmail
 * - vendorNewInquiryEmail
 * - vendorNewReviewEmail
 * - vendorAccountSuspendedEmail
 * - vendorWeeklyStatsEmail
 */
const vendors = vendorsTemplates;

/**
 * Whitelabel Templates
 * - whitelabelApplicationPendingEmail
 * - whitelabelApprovalEmail
 * - whitelabelRejectionEmail
 * - whitelabelNewHostEmail
 * - hostSubscriptionAssignedEmail
 * - whitelabelWeeklyReportEmail
 * - whitelabelSubscriptionExpiringEmail
 * - moderatorAddedEmail
 */
const whitelabels = whitelabelsTemplates;

/**
 * Report Templates
 * - dailyReportEmail
 * - weeklyReportEmail
 * - invitationReportEmail
 * - monthlyAnalyticsEmail
 * - eventSummaryReportEmail
 */
const reports = reportsTemplates;

/**
 * Support Templates
 * - ticketCreatedEmail
 * - ticketAssignedEmail
 * - ticketResponseEmail
 * - ticketResolvedEmail
 * - ticketStatusUpdateEmail
 * - feedbackRequestEmail
 * - newTicketNotificationEmail
 */
const support = supportTemplates;

/**
 * Staff Templates
 * - staffAccessEmail
 * - postEventEmail
 * - guestInvitationEmail
 * - guestReminderEmail
 * - staffAssignmentNotificationEmail
 * - staffRemovedEmail
 * - staffBriefingEmail
 */
const staff = staffTemplates;

// ============================================
// FLAT EXPORTS (All templates in one object)
// ============================================

const allTemplates = {
  // Auth
  ...authTemplates,
  // Events
  ...eventsTemplates,
  // Subscriptions
  ...subscriptionsTemplates,
  // Vendors
  ...vendorsTemplates,
  // Whitelabels
  ...whitelabelsTemplates,
  // Reports
  ...reportsTemplates,
  // Support
  ...supportTemplates,
  // Staff
  ...staffTemplates,
};

// ============================================
// TEMPLATE REGISTRY (for dynamic lookup)
// ============================================

const TEMPLATE_REGISTRY = {
  // Auth templates
  welcome: authTemplates.welcomeEmail,
  passwordReset: authTemplates.passwordResetEmail,
  passwordSetup: authTemplates.passwordSetupEmail,
  emailVerification: authTemplates.emailVerificationEmail,
  passwordChanged: authTemplates.passwordChangedEmail,
  accountDeactivated: authTemplates.accountDeactivatedEmail,
  loginAlert: authTemplates.loginAlertEmail,

  // Event templates
  eventReminder: eventsTemplates.eventReminderEmail,
  guestRsvp: eventsTemplates.guestRsvpEmail,
  guestCheckIn: eventsTemplates.guestCheckInEmail,
  eventCreated: eventsTemplates.eventCreatedEmail,
  eventUpdated: eventsTemplates.eventUpdatedEmail,
  eventCancelled: eventsTemplates.eventCancelledEmail,
  invitationsSent: eventsTemplates.invitationsSentEmail,
  eventScheduled: eventsTemplates.eventScheduledEmail,
  eventCompleted: eventsTemplates.eventCompletedEmail,

  // Subscription templates
  subscriptionAlert: subscriptionsTemplates.subscriptionAlertEmail,
  subscriptionCreated: subscriptionsTemplates.subscriptionCreatedEmail,
  subscriptionUpgraded: subscriptionsTemplates.subscriptionUpgradedEmail,
  subscriptionDowngraded: subscriptionsTemplates.subscriptionDowngradedEmail,
  paymentConfirmation: subscriptionsTemplates.paymentConfirmationEmail,
  paymentFailed: subscriptionsTemplates.paymentFailedEmail,
  subscriptionCancelled: subscriptionsTemplates.subscriptionCancelledEmail,
  usageLimitWarning: subscriptionsTemplates.usageLimitWarningEmail,

  // Vendor templates
  vendorApplicationPending: vendorsTemplates.vendorApplicationPendingEmail,
  vendorApproval: vendorsTemplates.vendorApprovalEmail,
  vendorRejection: vendorsTemplates.vendorRejectionEmail,
  vendorProfileUpdate: vendorsTemplates.vendorProfileUpdateEmail,
  vendorNewInquiry: vendorsTemplates.vendorNewInquiryEmail,
  vendorNewReview: vendorsTemplates.vendorNewReviewEmail,
  vendorAccountSuspended: vendorsTemplates.vendorAccountSuspendedEmail,
  vendorWeeklyStats: vendorsTemplates.vendorWeeklyStatsEmail,

  // Whitelabel templates
  whitelabelApplicationPending:
    whitelabelsTemplates.whitelabelApplicationPendingEmail,
  whitelabelApproval: whitelabelsTemplates.whitelabelApprovalEmail,
  whitelabelRejection: whitelabelsTemplates.whitelabelRejectionEmail,
  whitelabelNewHost: whitelabelsTemplates.whitelabelNewHostEmail,
  hostSubscriptionAssigned: whitelabelsTemplates.hostSubscriptionAssignedEmail,
  whitelabelWeeklyReport: whitelabelsTemplates.whitelabelWeeklyReportEmail,
  whitelabelSubscriptionExpiring:
    whitelabelsTemplates.whitelabelSubscriptionExpiringEmail,
  moderatorAdded: whitelabelsTemplates.moderatorAddedEmail,

  // Report templates
  dailyReport: reportsTemplates.dailyReportEmail,
  weeklyReport: reportsTemplates.weeklyReportEmail,
  invitationReport: reportsTemplates.invitationReportEmail,
  monthlyAnalytics: reportsTemplates.monthlyAnalyticsEmail,
  eventSummaryReport: reportsTemplates.eventSummaryReportEmail,

  // Support templates
  ticketCreated: supportTemplates.ticketCreatedEmail,
  ticketAssigned: supportTemplates.ticketAssignedEmail,
  ticketResponse: supportTemplates.ticketResponseEmail,
  ticketResolved: supportTemplates.ticketResolvedEmail,
  ticketStatusUpdate: supportTemplates.ticketStatusUpdateEmail,
  feedbackRequest: supportTemplates.feedbackRequestEmail,
  newTicketNotification: supportTemplates.newTicketNotificationEmail,

  // Staff templates
  staffAccess: staffTemplates.staffAccessEmail,
  postEvent: staffTemplates.postEventEmail,
  guestInvitation: staffTemplates.guestInvitationEmail,
  guestReminder: staffTemplates.guestReminderEmail,
  staffAssignmentNotification: staffTemplates.staffAssignmentNotificationEmail,
  staffRemoved: staffTemplates.staffRemovedEmail,
  staffBriefing: staffTemplates.staffBriefingEmail,
};

/**
 * Get template by name
 * @param {string} templateName - Template name from registry
 * @returns {Function|null} Template function or null if not found
 */
const getTemplate = (templateName) => {
  return TEMPLATE_REGISTRY[templateName] || null;
};

/**
 * Get all template names
 * @returns {string[]} Array of template names
 */
const getTemplateNames = () => {
  return Object.keys(TEMPLATE_REGISTRY);
};

/**
 * Check if template exists
 * @param {string} templateName - Template name to check
 * @returns {boolean} True if template exists
 */
const hasTemplate = (templateName) => {
  return templateName in TEMPLATE_REGISTRY;
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Categorized exports
  auth,
  events,
  subscriptions,
  vendors,
  whitelabels,
  reports,
  support,
  staff,

  // Flat exports
  ...allTemplates,

  // Registry utilities
  TEMPLATE_REGISTRY,
  getTemplate,
  getTemplateNames,
  hasTemplate,
};
