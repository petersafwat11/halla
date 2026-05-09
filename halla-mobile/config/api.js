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
    SETUP_PASSWORD: "/auth/setup-password",
    RESEND_SETUP_EMAIL: "/auth/resend-setup-email",
  },

  // Dashboard endpoints
  DASHBOARD: {
    HOST: "/dashboard/host",
    ADMIN: "/dashboard/admin",
  },

  // Plans endpoints
  PLANS: {
    ALL: "/plans",
    HOST_PLANS: "/plans/host",
    BUSINESS: "/plans/business",
    BY_CODE: (code) => `/plans/code/${code}`,
    BY_ID: (id) => `/plans/${id}`,
  },

  // Subscriptions endpoints (reads only; self-subscribe via PAYMENTS.CHECKOUT)
  SUBSCRIPTIONS: {
    MY_SUBSCRIPTION: "/subscriptions/my-subscription",
    MY_PAYMENTS: "/subscriptions/payments",
  },

  // Addons endpoints
  ADDONS: {
    BASE: "/addons",
    CATALOG: "/addons",
    PURCHASE: "/addons/purchase",
    MY: "/addons/my",
    ADMIN_ACTIVATE: (id) => `/addons/admin/${id}/activate`,
  },

  // Payments endpoints. Host-self lock + manage RBAC verb live on
  // `/payments/:id/{refund|capture|void}` so admin surfaces hit the
  // same canonical paths rather than admin-prefixed mirrors.
  PAYMENTS: {
    CHECKOUT: "/payments/checkout",
    BY_ID: (id) => `/payments/${id}`,
    POLL_3DS: (id) => `/payments/${id}/poll`,
    REFUND: (id) => `/payments/${id}/refund`,
    CAPTURE: (id) => `/payments/${id}/capture`,
    VOID: (id) => `/payments/${id}/void`,
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
    // Single endpoint that updates guests + staff in one transaction.
    // Old endpoints stay as compat for one cycle.
    UPDATE_STEP2: (id) => `/events/${id}/step2`,
    UPDATE_INVITATION: (id) => `/events/${id}/invitation-settings`,
    UPDATE_LAUNCH: (id) => `/events/${id}/launch-settings`,
    TEST_MESSAGE: (id) => `/events/${id}/test-message`,
    DELETE: (id) => `/events/${id}`,
    BULK_DELETE: "/events/bulk-delete",
    // Staff management
    ADD_STAFF: (eventId) => `/events/${eventId}/staff`,
    UPDATE_STAFF: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    DELETE_STAFF: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    // Export
    EXPORT_EVENTS: "/events/export/events",
    // Staff notification
    NOTIFY_STAFF: (eventId) => `/events/${eventId}/notify-staff`,
    // Manual launch retry
    RETRY_LAUNCH: (id) => `/events/${id}/retry-launch`,
    // Staff access tokens (active + revoked) for an event
    LIST_STAFF_TOKENS: (eventId) => `/events/${eventId}/staff-tokens`,
    // Revoke a single staff access token (resolved by staffList sub-doc id)
    REVOKE_STAFF: (eventId, staffId) => `/events/${eventId}/staff/${staffId}/revoke`,
  },

  // Guests endpoints
  GUESTS: {
    INVITATION: (code) => `/guests/invitation/${code}`,
    RSVP: (id) => `/guests/${id}/rsvp`,
    EVENT_GUESTS: (eventId) => `/guests/events/${eventId}`,
    EXPORT: (eventId) => `/guests/events/${eventId}/export`,
    ROTATE_QR: (eventId, guestId) =>
      `/guests/events/${eventId}/guests/${guestId}/rotate-qr`,
    REVOKE_ACCESS: (eventId, guestId) =>
      `/guests/events/${eventId}/guests/${guestId}/revoke-access`,
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
    UPDATE_PASSWORD: "/users/password",
    UPDATE_PROFILE_SECTION: (section) => `/users/profile/${section}`,
    NOTIFICATION_SETTINGS: "/users/notification-preferences",
  },

  // Vendors endpoints
  VENDORS: {
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
    ASSIGN: (id) => `/tickets/${id}/assign`,
    STATUS: (id) => `/tickets/${id}/status`,
    EXPORT: "/tickets/export",
  },

  // Staff endpoints
  STAFF: {
    VERIFY: "/staff/verify",
    EVENT_GUESTS: (eventId) => `/staff/events/${eventId}/guests`,
    CHECK_IN: (eventId) => `/staff/events/${eventId}/check-in`,
    MANUAL_CHECK_IN: (eventId) => `/staff/events/${eventId}/manual-check-in`,
    EVENT_STATS: (eventId) => `/staff/events/${eventId}/stats`,
  },

  // Locations endpoints — mounted at /api/v2/locations/*
  LOCATIONS: {
    REGIONS: "/locations/regions",
    CITIES_BY_REGION: (regionId) => `/locations/cities/${regionId}`,
    DISTRICTS_BY_CITY: (cityId) => `/locations/districts/${cityId}`,
    ALL: "/locations/all",
    SEARCH: "/locations/search",
  },

  // Post-Event endpoints (guest access + host management)
  POST_EVENT: {
    VALIDATE_TOKEN: "/post-event/validate",
    // Guest routes
    CONTENT: (eventId) => `/post-event/${eventId}/content`,
    TOGGLE_LIKE: (eventId, postId) =>
      `/post-event/${eventId}/posts/${postId}/like`,
    ADD_COMMENT: (eventId, postId) =>
      `/post-event/${eventId}/posts/${postId}/comments`,
    GET_COMMENTS: (eventId, postId) =>
      `/post-event/${eventId}/posts/${postId}/comments`,
    // Host routes
    HOST_CONTENT: (eventId) => `/post-event/${eventId}`,
    UPLOAD_MEDIA: (eventId) => `/post-event/${eventId}/media`,
    DELETE_MEDIA: (eventId, mediaId) =>
      `/post-event/${eventId}/media/${mediaId}`,
    UPDATE_THANK_YOU: (eventId) => `/post-event/${eventId}/thank-you`,
    UPDATE_MESSAGING_TEMPLATE: (eventId) =>
      `/post-event/${eventId}/messaging`,
    PUBLISH: (eventId) => `/post-event/${eventId}/publish`,
    UNPUBLISH: (eventId) => `/post-event/${eventId}/unpublish`,
    GENERATE_TOKENS: (eventId) => `/post-event/${eventId}/generate-tokens`,
    SEND_ACCESS_LINKS: (eventId) =>
      `/post-event/${eventId}/send-access-links`,
  },

  // Messaging endpoints
  MESSAGING: {
    SEND: "/messaging/send",
    SEND_BULK: "/messaging/send-bulk",
    RETRY: "/messaging/retry",
    SEND_REMINDER: "/messaging/send-reminder",
    SCHEDULE: "/messaging/schedule",
  },

  // Templates endpoints — backed by the cached templates table; categories
  // are served from /template-categories.
  TEMPLATES: {
    LIST: "/templates",
    CATEGORIES: "/template-categories",
  },

  // Taqnyat-template cache that powers the wizard picker.
  TAQNYAT_TEMPLATES: {
    LIST: "/taqnyat-templates",
  },

  // Fonts endpoints
  FONTS: {
    LIST: "/fonts",
  },

  // Admin endpoints
  ADMIN: {
    HOSTS: {
      BASE: "/admin/hosts",
      BY_ID: (id) => `/admin/hosts/${id}`,
      STATUS: (id) => `/admin/hosts/${id}/status`,
      SUBSCRIPTION: (id) => `/admin/hosts/${id}/subscription`,
      BULK_DELETE: "/admin/hosts/bulk-delete",
      EXPORT: "/admin/hosts/export",
      VERIFY_PHONE: "/admin/hosts/verify-phone",
      FIND_OR_CREATE: "/admin/hosts/find-or-create",
    },
    MODERATORS: {
      BASE: "/admin/moderators",
      BY_ID: (id) => `/admin/moderators/${id}`,
      STATUS: (id) => `/admin/moderators/${id}/status`,
      BULK_DELETE: "/admin/moderators/bulk-delete",
      BULK_STATUS: "/admin/moderators/bulk-status",
      EXPORT: "/admin/moderators/export",
    },
    VENDORS: {
      BASE: "/admin/vendors",
      BY_ID: (id) => `/admin/vendors/${id}`,
      STATUS: (id) => `/admin/vendors/${id}/status`,
      RATING: (id) => `/admin/vendors/${id}/rating`,
      BULK_DELETE: "/admin/vendors/bulk-delete",
      BULK_STATUS: "/admin/vendors/bulk-status",
      EXPORT: "/admin/vendors/export",
    },
    EVENTS: {
      ADMIN_ALL: "/events/admin/all",
      BY_ID: (id) => `/admin/events/${id}`,
      CREATE_FOR_HOST: "/admin/events/create-for-host",
      STATUS: (id) => `/admin/events/${id}/status`,
      BULK_DELETE: "/admin/events/bulk-delete",
      BULK_STATUS: "/admin/events/bulk-status",
      EXPORT: "/admin/events/export",
    },
    PAYMENTS: {
      BASE: "/admin/payments",
      BY_ID: (id) => `/admin/payments/${id}`,
      EXPORT: "/admin/payments/export",
    },
    PLANS: {
      ALL: "/plans/admin/all",
      BY_CODE: (code) => `/plans/admin/${code}`,
      CREATE: "/plans/admin",
    },
    SUBSCRIPTIONS: {
      ASSIGN: "/subscriptions/admin/assign",
    },
    WHITELABELS: {
      BASE: "/admin/whitelabels",
      BY_ID: (id) => `/admin/whitelabels/${id}`,
      STATUS: (id) => `/admin/whitelabels/${id}/status`,
      SUBSCRIPTION: (id) => `/admin/whitelabels/${id}/subscription`,
      FEATURES: (id) => `/admin/whitelabels/${id}/features`,
      BULK_DELETE: "/admin/whitelabels/bulk-delete",
      BULK_STATUS: "/admin/whitelabels/bulk-status",
      EXPORT: "/admin/whitelabels/export",
    },
    DISCOUNTS: {
      BASE: "/discounts/admin",
      BY_ID: (id) => `/discounts/admin/${id}`,
      TOGGLE: (id) => `/discounts/admin/${id}/toggle`,
      VALIDATE: "/discounts/validate",
    },
    EVENT_TARGETS: "/admin/event-targets",
    USER_SUBSCRIPTION_INFO: (id) => `/admin/users/${id}/subscription-info`,
  },
};

export default {
  API_BASE_URL,
  ENDPOINTS,
};
