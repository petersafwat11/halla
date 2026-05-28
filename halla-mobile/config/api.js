/**
 * API Configuration
 *
 * Phase 1 unification: the endpoint registry is now shared with web via
 * `@halla/shared/api/paths` (`API_PATHS`, camelCase). This file is a thin
 * UPPER_SNAKE_CASE wrapper that preserves the legacy `ENDPOINTS.X.Y`
 * call sites used across mobile services. Phase 5/8 will migrate
 * services to import `API_PATHS` directly and this wrapper will be deleted.
 *
 * `API_BASE_URL` stays here — it's platform-specific (mobile points
 * straight at production over HTTPS; web routes via Next rewrites).
 */

import { API_PATHS } from "@halla/shared/api/paths";

// Backend base URL. Production VPS (Contabo, nginx → labbe-backend on :8000)
// — see DEPLOYMENT_RECORD_2026-05-14.md
export const API_BASE_URL = "https://halaa.com.sa/api/v2";

export const ENDPOINTS = {
  AUTH: {
    LOGIN: API_PATHS.auth.login,
    SIGNUP_HOST: API_PATHS.auth.hostSignup,
    SIGNUP_VENDOR: API_PATHS.auth.vendorSignup,
    SIGNUP_WHITELABEL: API_PATHS.auth.whitelabelSignup,
    OTP_SEND_LOGIN: API_PATHS.auth.sendLoginOTP,
    OTP_SEND_SIGNUP: API_PATHS.auth.sendSignupOTP,
    OTP_VERIFY_LOGIN: API_PATHS.auth.verifyLoginOTP,
    OTP_VERIFY_SIGNUP: API_PATHS.auth.verifySignupOTP,
    COMPLETE_PROFILE: API_PATHS.auth.completeHostProfile,
    FORGOT_PASSWORD: API_PATHS.auth.forgotPassword,
    RESET_PASSWORD: API_PATHS.auth.resetPassword,
    LOGOUT: API_PATHS.auth.logout,
    REFRESH: API_PATHS.auth.refresh,
    OTP_RESEND: API_PATHS.auth.resendOTP,
    ME: API_PATHS.auth.getMe,
    UPDATE_ME: API_PATHS.auth.updateMe,
    UPDATE_PASSWORD: API_PATHS.auth.updatePassword,
    SEND_VERIFICATION_CODE: API_PATHS.auth.sendVerificationCode,
    VERIFY_EMAIL: API_PATHS.auth.verifyEmail,
    UPDATE_PUSH_TOKEN: API_PATHS.auth.updatePushToken,
    SETUP_PASSWORD: API_PATHS.auth.setupPassword,
    RESEND_SETUP_EMAIL: API_PATHS.auth.resendSetupEmail,
  },

  DASHBOARD: {
    HOST: API_PATHS.dashboard.getHostDashboard,
    ADMIN: API_PATHS.dashboard.getAdminDashboard,
  },

  PLANS: {
    ALL: API_PATHS.plans.getPlans,
    HOST_PLANS: API_PATHS.plans.getHostPlans,
    BUSINESS: API_PATHS.plans.getBusinessPlans,
    BY_CODE: API_PATHS.plans.getPlanByCode,
    BY_ID: API_PATHS.plans.getPlanById,
  },

  SUBSCRIPTIONS: {
    MY_SUBSCRIPTION: API_PATHS.subscriptions.getMySubscription,
    MY_PAYMENTS: API_PATHS.subscriptions.getMyPayments,
  },

  ADDONS: {
    BASE: "/addons",
    CATALOG: API_PATHS.addons.getCatalog,
    PURCHASE: API_PATHS.addons.purchase,
    MY: API_PATHS.addons.listMine,
    ADMIN_ACTIVATE: API_PATHS.addons.adminActivate,
  },

  PAYMENTS: {
    CHECKOUT: API_PATHS.hostPayments.checkout,
    BY_ID: API_PATHS.hostPayments.getById,
    POLL_3DS: API_PATHS.hostPayments.poll3ds,
    REFUND: API_PATHS.payments.refund,
    CAPTURE: API_PATHS.payments.capture,
    VOID: API_PATHS.payments.void,
  },

  EVENTS: {
    BASE: "/events",
    MY_EVENTS: API_PATHS.events.getMyEvents,
    STATS: API_PATHS.events.getEventStats,
    SINGLE_STATS: API_PATHS.events.getSingleEventStats,
    SUBSCRIPTION_INFO: API_PATHS.events.getSubscriptionInfo,
    CREATE: API_PATHS.events.createEvent,
    BY_ID: API_PATHS.events.getEventById,
    UPDATE_DETAILS: API_PATHS.events.updateEventDetails,
    UPDATE_GUEST_LIST: API_PATHS.events.updateGuestList,
    UPDATE_STAFF_LIST: API_PATHS.events.updateStaffList,
    UPDATE_STEP2: API_PATHS.events.updateEventStep2,
    UPDATE_INVITATION: API_PATHS.events.updateInvitationSettings,
    UPDATE_LAUNCH: API_PATHS.events.updateLaunchSettings,
    TEST_MESSAGE: API_PATHS.events.sendTestMessage,
    DELETE: API_PATHS.events.deleteEvent,
    BULK_DELETE: API_PATHS.events.bulkDeleteEvents,
    ADD_STAFF: API_PATHS.events.addStaff,
    UPDATE_STAFF: API_PATHS.events.updateStaff,
    DELETE_STAFF: API_PATHS.events.deleteStaff,
    EXPORT_EVENTS: API_PATHS.events.exportEventsAsExcel,
    NOTIFY_STAFF: API_PATHS.events.notifyStaff,
    RETRY_LAUNCH: API_PATHS.events.retryLaunch,
    SCHEDULED_REMINDERS_LIST: API_PATHS.events.scheduledRemindersList,
    SCHEDULED_REMINDERS_CREATE: API_PATHS.events.scheduledRemindersCreate,
    SCHEDULED_REMINDERS_CANCEL: API_PATHS.events.scheduledRemindersCancel,
    LIST_STAFF_TOKENS: API_PATHS.events.listStaffTokens,
    REVOKE_STAFF: API_PATHS.events.revokeStaffAccess,
  },

  GUESTS: {
    INVITATION: API_PATHS.guests.getByInvitationCode,
    RSVP: API_PATHS.guests.submitRSVP,
    EVENT_GUESTS: API_PATHS.guests.getEventGuests,
    EXPORT: API_PATHS.guests.exportGuests,
    ROTATE_QR: API_PATHS.guests.rotateQR,
    REVOKE_ACCESS: API_PATHS.guests.revokeAccess,
  },

  NOTIFICATIONS: {
    BASE: "/notifications",
    UNREAD_COUNT: API_PATHS.notifications.getUnreadCount,
    MARK_ALL_READ: API_PATHS.notifications.markAllAsRead,
    CLEAR_ALL: API_PATHS.notifications.clearAllNotifications,
    SEND: API_PATHS.notifications.sendNotification,
    BROADCAST: API_PATHS.notifications.broadcastNotification,
  },

  USERS: {
    PROFILE: API_PATHS.users.getMyProfile,
    UPDATE_PROFILE: API_PATHS.users.updateMyProfile,
    UPDATE_PASSWORD: API_PATHS.users.updateMyPassword,
    UPDATE_PROFILE_SECTION: API_PATHS.users.updateMyProfileSection,
    NOTIFICATION_SETTINGS: API_PATHS.users.getNotificationPreferences,
    SEND_PHONE_CHANGE_OTP: API_PATHS.users.sendPhoneChangeOtp,
    UPDATE_PHONE: API_PATHS.users.updatePhone,
    DELETE_VENDOR_IMAGE: API_PATHS.users.deleteVendorImage,
  },

  VENDORS: {
    CATEGORIES: API_PATHS.vendors.getCategories,
  },

  SERVICES: {
    BASE: "/services",
    PUBLIC: API_PATHS.vendorServices.getPublicServices,
    STATS: API_PATHS.vendorServices.getMyStats,
    BY_ID: API_PATHS.vendorServices.getService,
    TOGGLE_STATUS: API_PATHS.vendorServices.toggleServiceStatus,
  },

  TICKETS: {
    BASE: "/tickets",
    BY_ID: API_PATHS.tickets.getTicketById,
    RATE: API_PATHS.tickets.rateTicket,
    RATING_INFO: API_PATHS.tickets.getTicketForRating,
    ASSIGN: API_PATHS.tickets.assignTicket,
    STATUS: API_PATHS.tickets.updateTicketStatus,
    EXPORT: API_PATHS.tickets.exportTickets,
  },

  STAFF: {
    VERIFY: API_PATHS.staff.verifyStaffAccess,
    EVENT_GUESTS: API_PATHS.staff.getEventGuests,
    CHECK_IN: API_PATHS.staff.checkInGuest,
  },

  LOCATIONS: {
    REGIONS: API_PATHS.locations.getRegions,
    CITIES_BY_REGION: API_PATHS.locations.getCitiesByRegion,
    DISTRICTS_BY_CITY: API_PATHS.locations.getDistrictsByCity,
    ALL: API_PATHS.locations.getAllLocations,
    SEARCH: API_PATHS.locations.searchLocations,
  },

  POST_EVENT: {
    VALIDATE_TOKEN: API_PATHS.postEvent.validateToken,
    CONTENT: API_PATHS.postEvent.getContent,
    TOGGLE_LIKE: API_PATHS.postEvent.toggleLike,
    ADD_COMMENT: API_PATHS.postEvent.addComment,
    GET_COMMENTS: API_PATHS.postEvent.getComments,
    HOST_CONTENT: API_PATHS.postEvent.getHostContent,
    UPLOAD_MEDIA: API_PATHS.postEvent.uploadMedia,
    DELETE_MEDIA: API_PATHS.postEvent.deleteMedia,
    UPDATE_THANK_YOU: API_PATHS.postEvent.updateThankYouMessage,
    UPDATE_MESSAGING_TEMPLATE: API_PATHS.postEvent.updateMessagingTemplate,
    PUBLISH: API_PATHS.postEvent.publishContent,
    UNPUBLISH: API_PATHS.postEvent.unpublishContent,
    GENERATE_TOKENS: API_PATHS.postEvent.generateBulkTokens,
    SEND_ACCESS_LINKS: API_PATHS.postEvent.sendBulkAccessLinks,
  },

  MESSAGING: {
    SEND: API_PATHS.invitations.send,
    SEND_BULK: API_PATHS.invitations.sendBulk,
    RETRY: API_PATHS.invitations.retry,
    SEND_REMINDER: API_PATHS.invitations.sendReminder,
    SCHEDULE: API_PATHS.invitations.schedule,
  },

  TEMPLATES: {
    LIST: API_PATHS.templates.list,
    CATEGORIES: API_PATHS.templates.categories,
  },

  TAQNYAT_TEMPLATES: {
    LIST: API_PATHS.taqnyatTemplates.list,
  },

  FONTS: {
    LIST: API_PATHS.templates.fonts,
  },

  ADMIN: {
    HOSTS: {
      BASE: API_PATHS.admin.hosts.getAll,
      BY_ID: API_PATHS.admin.hosts.getById,
      STATUS: API_PATHS.admin.hosts.updateStatus,
      SUBSCRIPTION: API_PATHS.admin.hosts.updateSubscription,
      BULK_DELETE: API_PATHS.admin.hosts.bulkDelete,
      EXPORT: API_PATHS.admin.hosts.export,
      VERIFY_PHONE: API_PATHS.admin.hosts.verifyPhone,
      FIND_OR_CREATE: API_PATHS.admin.hosts.findOrCreate,
    },
    MODERATORS: {
      BASE: API_PATHS.admin.moderators.getAll,
      BY_ID: API_PATHS.admin.moderators.update,
      STATUS: API_PATHS.admin.moderators.updateStatus,
      BULK_DELETE: API_PATHS.admin.moderators.bulkDelete,
      BULK_STATUS: API_PATHS.admin.moderators.bulkStatus,
      EXPORT: API_PATHS.admin.moderators.export,
    },
    VENDORS: {
      BASE: API_PATHS.admin.vendors.getAll,
      BY_ID: API_PATHS.admin.vendors.getById,
      STATUS: API_PATHS.admin.vendors.updateStatus,
      RATING: API_PATHS.admin.vendors.updateRating,
      BULK_DELETE: API_PATHS.admin.vendors.bulkDelete,
      BULK_STATUS: API_PATHS.admin.vendors.bulkStatus,
      EXPORT: API_PATHS.admin.vendors.export,
    },
    EVENTS: {
      ADMIN_ALL: API_PATHS.admin.events.getAll,
      BY_ID: API_PATHS.admin.events.getById,
      CREATE_FOR_HOST: API_PATHS.admin.events.createForHost,
      STATUS: API_PATHS.admin.events.updateStatus,
      BULK_DELETE: API_PATHS.admin.events.bulkDelete,
      BULK_STATUS: API_PATHS.admin.events.bulkStatus,
      EXPORT: API_PATHS.admin.events.export,
    },
    PAYMENTS: {
      BASE: API_PATHS.payments.getAll,
      BY_ID: API_PATHS.payments.getById,
      EXPORT: API_PATHS.payments.export,
    },
    PLANS: {
      ALL: API_PATHS.plans.adminGetAll,
      BY_CODE: API_PATHS.plans.adminUpdate,
      CREATE: API_PATHS.plans.adminCreate,
    },
    SUBSCRIPTIONS: {
      ASSIGN: API_PATHS.subscriptions.adminAssign,
    },
    WHITELABELS: {
      BASE: API_PATHS.admin.whitelabels.getAll,
      BY_ID: API_PATHS.admin.whitelabels.getById,
      STATUS: API_PATHS.admin.whitelabels.updateStatus,
      SUBSCRIPTION: API_PATHS.admin.whitelabels.updateSubscription,
      FEATURES: API_PATHS.admin.whitelabels.features,
      BULK_DELETE: API_PATHS.admin.whitelabels.bulkDelete,
      BULK_STATUS: API_PATHS.admin.whitelabels.bulkStatus,
      EXPORT: API_PATHS.admin.whitelabels.export,
    },
    DISCOUNTS: {
      BASE: API_PATHS.discounts.list,
      BY_ID: API_PATHS.discounts.byId,
      TOGGLE: API_PATHS.discounts.toggle,
      VALIDATE: API_PATHS.discounts.validate,
    },
    EVENT_TARGETS: API_PATHS.admin.events.eventTargets,
    USER_SUBSCRIPTION_INFO: API_PATHS.admin.events.userSubscriptionInfo,
  },
};

export default {
  API_BASE_URL,
  ENDPOINTS,
};
