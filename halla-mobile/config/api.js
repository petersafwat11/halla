/**
 * API Configuration
 * Central configuration for all API endpoints
 * Aligned with backend routes mounted at /api/v2/*
 */

// Base URL for the backend API
export const API_BASE_URL =
  "https://labbe-backend-production.up.railway.app/api/v2";

// API Endpoints (all relative to API_BASE_URL which already includes /api/v2)
export const ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP_HOST: "/auth/signup/host",
    SIGNUP_VENDOR: "/auth/signup/vendor",
    SIGNUP_WHITELABEL: "/auth/signup/whitelabel",
    OTP_SEND_LOGIN: "/auth/otp/send-login",
    OTP_SEND_SIGNUP: "/auth/otp/send-signup",
    OTP_VERIFY_LOGIN: "/auth/otp/verify-login",
    OTP_VERIFY_SIGNUP: "/auth/otp/verify-signup",
    COMPLETE_PROFILE: "/auth/complete-profile",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: (token) => `/auth/reset-password/${token}`,
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    OTP_RESEND: "/auth/otp/resend",
    ME: "/auth/me",
    UPDATE_ME: "/auth/update-me",
    UPDATE_PASSWORD: "/auth/update-password",
    SEND_VERIFICATION_CODE: "/auth/send-verification-code",
    VERIFY_EMAIL: "/auth/verify-email",
    UPDATE_PUSH_TOKEN: "/auth/update-push-token",
  },

  // Dashboard endpoints
  DASHBOARD: {
    HOST: "/dashboard/host",
    ADMIN: "/dashboard/admin",
    VENDOR: "/dashboard/vendor",
  },

  // Plans endpoints
  PLANS: {
    ALL: "/plans",
    HOST_PLANS: "/plans/host",
    ENTERPRISE: "/plans/enterprise",
    BY_CODE: (code) => `/plans/code/${code}`,
    BY_ID: (id) => `/plans/${id}`,
  },

  // Subscriptions endpoints
  SUBSCRIPTIONS: {
    MY_SUBSCRIPTION: "/subscriptions/my-subscription",
    SUBSCRIBE: "/subscriptions/subscribe",
    CHANGE_PLAN: "/subscriptions/change-plan",
    CANCEL: "/subscriptions/cancel",
    VALIDATE_LIMITS: "/subscriptions/validate-limits",
    LIMITS: "/subscriptions/limits",
    FEATURE_ACCESS: (featureName) => `/subscriptions/features/${featureName}`,
  },

  // Events endpoints
  EVENTS: {
    BASE: "/events",
    MY_EVENTS: "/events/my-events",
    STATS: "/events/stats",
    SINGLE_STATS: (id) => `/events/stats/${id}`,
    SUBSCRIPTION_INFO: "/events/subscription-info",
    CREATE: "/events",
    BY_ID: (id) => `/events/${id}`,
    UPDATE_DETAILS: (id) => `/events/${id}/event-details`,
    UPDATE_GUEST_LIST: (id) => `/events/${id}/guest-list`,
    UPDATE_STAFF_LIST: (id) => `/events/${id}/staff-list`,
    UPDATE_INVITATION: (id) => `/events/${id}/invitation-settings`,
    UPDATE_LAUNCH: (id) => `/events/${id}/launch-settings`,
    TEST_MESSAGE: (id) => `/events/${id}/test-message`,
    DELETE: (id) => `/events/${id}`,
    BULK_DELETE: "/events/bulk-delete",
    // Guest management
    ADD_GUEST: (eventId) => `/events/${eventId}/guests`,
    UPDATE_GUEST: (eventId, guestId) => `/events/${eventId}/guests/${guestId}`,
    DELETE_GUEST: (eventId, guestId) => `/events/${eventId}/guests/${guestId}`,
    // Staff management
    ADD_STAFF: (eventId) => `/events/${eventId}/staff`,
    UPDATE_STAFF: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    DELETE_STAFF: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    // Export
    EXPORT_EVENTS: "/events/export/events",
    EXPORT_GUESTS: (id) => `/events/export/${id}/guests`,
    // Staff notification
    NOTIFY_STAFF: (eventId) => `/events/${eventId}/notify-staff`,
  },

  // Guests endpoints
  GUESTS: {
    INVITATION: (code) => `/guests/invitation/${code}`,
    RSVP: (id) => `/guests/${id}/rsvp`,
    EVENT_GUESTS: (eventId) => `/guests/events/${eventId}`,
    EXPORT: (eventId) => `/guests/events/${eventId}/export`,
  },

  // Notifications endpoints
  NOTIFICATIONS: {
    BASE: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    MARK_ALL_READ: "/notifications/read-all",
    CLEAR_ALL: "/notifications/clear-all",
    SEND: "/notifications/send",
    BROADCAST: "/notifications/broadcast",
  },

  // Users endpoints
  USERS: {
    PROFILE: "/users/profile",
    UPDATE_PROFILE: "/users/profile",
    NOTIFICATION_SETTINGS: "/users/notification-preferences",
  },

  // Vendors endpoints
  VENDORS: {
    BASE: "/vendors",
    CATEGORIES: "/vendors/categories",
  },

  // Services endpoints
  SERVICES: {
    BASE: "/services",
    PUBLIC: "/services/public",
  },

  // Tickets endpoints
  TICKETS: {
    BASE: "/tickets",
    BY_ID: (id) => `/tickets/${id}`,
    RATE: (id) => `/tickets/${id}/rate`,
    RATING_INFO: (id) => `/tickets/${id}/rating-info`,
  },

  // Staff endpoints
  STAFF: {
    VERIFY: "/staff/verify",
    EVENT_GUESTS: (eventId) => `/staff/events/${eventId}/guests`,
    CHECK_IN: (eventId) => `/staff/events/${eventId}/check-in`,
    MANUAL_CHECK_IN: (eventId) => `/staff/events/${eventId}/manual-check-in`,
    EVENT_STATS: (eventId) => `/staff/events/${eventId}/stats`,
  },

  // Regions / Locations endpoints — mounted at /api/v2/locations/*
  REGIONS: {
    ALL: "/locations/regions",
    CITIES_BY_REGION: (regionId) => `/locations/cities/${regionId}`,
    DISTRICTS_BY_CITY: (cityId) => `/locations/districts/${cityId}`,
  },

  // Locations alias (same as REGIONS)
  LOCATIONS: {
    REGIONS: "/locations/regions",
    CITIES_BY_REGION: (regionId) => `/locations/cities/${regionId}`,
    DISTRICTS_BY_CITY: (cityId) => `/locations/districts/${cityId}`,
  },

  // Post-Event endpoints (guest access + host management)
  POST_EVENT: {
    VALIDATE_TOKEN: "/post-event/validate",
    // Guest routes (require sessionToken from validate)
    CONTENT: (eventId) => `/post-event/${eventId}/content`,
    TOGGLE_LIKE: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/like`,
    ADD_COMMENT: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/comments`,
    GET_COMMENTS: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/comments`,
    // Host routes (require auth token)
    HOST_CONTENT: (eventId) => `/post-event/${eventId}`,
    UPLOAD_PHOTOS: (eventId) => `/post-event/${eventId}/photos`,
    UPLOAD_VIDEO: (eventId) => `/post-event/${eventId}/videos`,
    UPDATE_THANK_YOU: (eventId) => `/post-event/${eventId}/thank-you`,
    DELETE_PHOTO: (eventId, photoId) => `/post-event/${eventId}/photos/${photoId}`,
    DELETE_VIDEO: (eventId, videoId) => `/post-event/${eventId}/videos/${videoId}`,
    PUBLISH: (eventId) => `/post-event/${eventId}/publish`,
    GENERATE_TOKENS: (eventId) => `/post-event/${eventId}/generate-tokens`,
    SEND_EMAILS: (eventId) => `/post-event/${eventId}/send-emails`,
  },

  // Messaging endpoints
  MESSAGING: {
    SEND: "/messaging/send",
    SEND_BULK: "/messaging/send-bulk",
    SEND_TEST: "/messaging/test",
    RETRY: "/messaging/retry",
    SEND_REMINDER: "/messaging/send-reminder",
    SCHEDULE: "/messaging/schedule",
    STATS: (eventId) => `/messaging/stats/${eventId}`,
    BALANCE: "/messaging/balance",
    TEMPLATE_SUBMIT: "/messaging/template/submit",
    TEMPLATE_STATUS: (eventId) => `/messaging/template/status/${eventId}`,
  },

  // Templates endpoints
  TEMPLATES: {
    LIST: "/templates",
    CATEGORIES: "/templates/categories",
  },

  // Fonts endpoints
  FONTS: {
    LIST: "/fonts",
  },
};

export default {
  API_BASE_URL,
  ENDPOINTS,
};
