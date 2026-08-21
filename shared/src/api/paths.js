/**
 * API path registry — single source of truth for both labbe (web) and
 * halaa-mobile (mobile). Mirrors backend routes mounted at /api/v2/*.
 *
 * Update paths here when the backend changes. All call sites resolve
 * paths through this object so a route rename is one diff, not 200.
 *
 * Field names follow camelCase.
 */

const deepFreeze = (obj) => {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return Object.freeze(obj);
};

const PATHS = {
  // ============================================
  // AUTH
  // ============================================
  auth: {
    // Signup
    hostSignup: "/auth/signup/host",
    vendorSignup: "/auth/signup/vendor",

    // Login
    login: "/auth/login",

    // OTP
    sendSignupOTP: "/auth/otp/send-signup",
    verifySignupOTP: "/auth/otp/verify-signup",
    sendLoginOTP: "/auth/otp/send-login",
    verifyLoginOTP: "/auth/otp/verify-login",
    resendOTP: "/auth/otp/resend",

    // Password
    forgotPassword: "/auth/forgot-password",
    resetPassword: (token) => `/auth/reset-password/${token}`,

    // Session
    refresh: "/auth/refresh",
    logout: "/auth/logout",

    // Protected
    getMe: "/auth/me",
    updateMe: "/auth/update-me",
    updatePassword: "/auth/update-password",
    completeHostProfile: "/auth/complete-profile",

    // Email Verification
    sendVerificationCode: "/auth/send-verification-code",
    verifyEmail: "/auth/verify-email",
    verifyEmailLink: "/auth/verify-email-link",
    resendEmailVerification: "/auth/resend-verification-email",

    // Mobile-only
    updatePushToken: "/auth/update-push-token",
    removePushToken: "/auth/remove-push-token",
  },

  // ============================================
  // EVENTS
  // ============================================
  events: {
    getMyEvents: "/events/my-events",
    getEventStats: "/events/stats",
    getSingleEventStats: (id) => `/events/stats/${id}`,
    getSubscriptionInfo: "/events/subscription-info",

    exportEventsAsExcel: "/events/export/events",

    createEvent: "/events",
    getEventById: (id) => `/events/${id}`,

    // Partial Updates
    updateEventDetails: (id) => `/events/${id}/event-details`,
    updateGuestList: (id) => `/events/${id}/guest-list`,
    updateStaffList: (id) => `/events/${id}/staff-list`,
    updateEventStep2: (id) => `/events/${id}/step2`,
    updateInvitationSettings: (id) => `/events/${id}/invitation-settings`,
    updateLaunchSettings: (id) => `/events/${id}/launch-settings`,
    updateReminderSettings: (id) => `/events/${id}/reminder-settings`,

    // Messaging
    sendTestMessage: (id) => `/events/${id}/test-message`,

    deleteEvent: (id) => `/events/${id}`,
    bulkDeleteEvents: "/events/bulk-delete",

    // Staff Management
    addStaff: (eventId) => `/events/${eventId}/staff`,
    updateStaff: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    updateStaffStatus: (eventId, staffId) => `/events/${eventId}/staff/${staffId}/status`,
    deleteStaff: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    listStaffTokens: (eventId) => `/events/${eventId}/staff-tokens`,
    revokeStaffAccess: (eventId, staffId) => `/events/${eventId}/staff/${staffId}/revoke`,
    notifyStaff: (eventId) => `/events/${eventId}/notify-staff`,

    // Admin
    getAllEvents: "/events/admin/all",
    adminUpdateEventStatus: (id) => `/events/admin/${id}/status`,
    adminDeleteEvent: (id) => `/events/admin/${id}`,

    // Manual launch retry
    retryLaunch: (id) => `/events/${id}/retry-launch`,

    // Resend invite — pool-charged, repeatable, no gates. Optional guestIds
    // (else defaults to guests who have not responded). Uses the invite template.
    resendInvite: (id) => `/events/${id}/resend-invite`,

    // Extra reminder — pool-charged, immediate, CONFIRMED guests only, using the
    // approved reminder_confirmed template. Optional guestIds.
    extraReminder: (id) => `/events/${id}/extra-reminder`,

    // Send to new guests — initial pool-charged send to guests added after
    // launch (invitation.sent != true). Optional guestIds narrows the set.
    sendNewGuests: (id) => `/events/${id}/send-new-guests`,

    // Capabilities & Entitlements (EVT-10)
    capabilities: (id) => `/events/${id}/capabilities`,
    entitlement: (id) => `/events/${id}/entitlement`,
  },

  // ============================================
  // USERS
  // ============================================
  users: {
    getMyProfile: "/users/profile",
    updateMyProfile: "/users/profile",
    updateMyPassword: "/users/password",
    updateMyProfileSection: (section) => `/users/profile/${section}`,

    sendPhoneChangeOtp: "/users/profile/phone/send-otp",
    updatePhone: "/users/profile/phone",

    deleteVendorImage: "/users/profile/vendorData/image",

    getNotificationPreferences: "/users/notification-preferences",
    updateNotificationPreferences: "/users/notification-preferences",
  },

  // ============================================
  // GUESTS
  // ============================================
  guests: {
    getByInvitationCode: (code) => `/guests/invitation/${code}`,
    submitRSVP: (id) => `/guests/${id}/rsvp`,

    // Guest book — the host's reusable past guests across all their events.
    getMyContacts: () => `/guests/my-contacts`,

    getEventGuests: (eventId) => `/guests/events/${eventId}`,
    addGuest: (eventId) => `/guests/events/${eventId}`,
    updateGuest: (eventId, guestId) => `/guests/events/${eventId}/guests/${guestId}`,
    deleteGuest: (eventId, guestId) => `/guests/events/${eventId}/guests/${guestId}`,
    rotateQR: (eventId, guestId) => `/guests/events/${eventId}/guests/${guestId}/rotate-qr`,
    revokeAccess: (eventId, guestId) => `/guests/events/${eventId}/guests/${guestId}/revoke-access`,
    exportGuests: (eventId) => `/guests/events/${eventId}/export`,
  },

  // ============================================
  // SUBSCRIPTIONS
  // ============================================
  subscriptions: {
    getMySubscription: "/subscriptions/my-subscription",
    adminAssign: "/subscriptions/admin/assign",
    getMyPayments: "/subscriptions/payments",
  },

  // ============================================
  // PAYMENTS (host-facing)
  // ============================================
  hostPayments: {
    getById: (id) => `/payments/${id}`,
    poll3ds: (id) => `/payments/${id}/poll`,
    quote: "/payments/quote",
    checkout: "/payments/checkout",
    export: "/subscriptions/payments/export",
  },

  // ============================================
  // REVENUECAT (native IAP — mobile; all authenticated under /payments)
  // ============================================
  // Mobile-only store-billing surface. Web uses Moyasar (`hostPayments`) and
  // never these. `storeCatalog` returns store-safe catalog metadata only —
  // never RevenueCat server keys / webhook auth / private config.
  revenuecat: {
    reconcile: "/payments/revenuecat/reconcile",
    reconcileExact: "/payments/revenuecat/reconcile-exact",
    eventPreflight: "/payments/revenuecat/event-preflight",
    addonPreflight: "/payments/revenuecat/addon-preflight",
    fulfillment: "/payments/revenuecat/fulfillment",
    storeCatalog: "/payments/revenuecat/catalog",
  },

  // ============================================
  // DISCOUNTS
  // ============================================
  discounts: {
    validate: "/discounts/validate",
    list: "/discounts/admin",
    create: "/discounts/admin",
    byId: (id) => `/discounts/admin/${id}`,
    update: (id) => `/discounts/admin/${id}`,
    toggle: (id) => `/discounts/admin/${id}/toggle`,
    delete: (id) => `/discounts/admin/${id}`,
  },

  // ============================================
  // ADDONS
  // ============================================
  addons: {
    getCatalog: "/addons",
    purchase: "/addons/purchase",
    listMine: "/addons/my",
    adminActivate: (id) => `/addons/admin/${id}/activate`,
  },

  // ============================================
  // TICKETS
  // ============================================
  tickets: {
    getAssignees: "/tickets/assignees",
    getMyTickets: "/tickets",
    createTicket: "/tickets",
    getTicketById: (id) => `/tickets/${id}`,
    updateTicket: (id) => `/tickets/${id}`,
    deleteTicket: (id) => `/tickets/${id}`,
    bulkDelete: "/tickets/bulk-delete",
    assignTicket: (id) => `/tickets/${id}/assign`,
    updateTicketStatus: (id) => `/tickets/${id}/status`,
    bulkStatus: "/tickets/bulk-status",
    exportTickets: "/tickets/export",
    rateTicket: (id) => `/tickets/${id}/rate`,
    getTicketForRating: (id) => `/tickets/${id}/rating-info`,
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  notifications: {
    getUnreadCount: "/notifications/unread-count",
    markAllAsRead: "/notifications/read-all",
    clearAllNotifications: "/notifications/clear-all",
    getNotifications: "/notifications",
    getNotification: (id) => `/notifications/${id}`,
    deleteNotification: (id) => `/notifications/${id}`,
    markAsRead: (id) => `/notifications/${id}/read`,
    sendNotification: "/notifications/send",
    broadcastNotification: "/notifications/broadcast",
  },

  // ============================================
  // STAFF
  // ============================================
  staff: {
    verifyStaffAccess: "/staff/verify",
    getEventGuests: (eventId) => `/staff/events/${eventId}/guests`,
    checkInGuest: (eventId) => `/staff/events/${eventId}/check-in`,
  },

  // ============================================
  // LOCATIONS
  // ============================================
  locations: {
    getRegions: "/locations/regions",
    getCitiesByRegion: (regionId) => `/locations/cities/${regionId}`,
    getDistrictsByCity: (cityId) => `/locations/districts/${cityId}`,
    getAllLocations: "/locations/all",
    searchLocations: "/locations/search",
  },

  // ============================================
  // VENDORS (Public)
  // ============================================
  vendors: {
    getCategories: "/vendors/categories",
    getPublicVendors: "/vendors/public",
    getPublicVendor: (id) => `/vendors/public/${id}`,
  },

  // ============================================
  // DASHBOARD
  // ============================================
  dashboard: {
    getAdminDashboard: "/dashboard/admin",
    getHostDashboard: "/dashboard/host",
  },

  // ============================================
  // INVITATIONS / MESSAGING
  // ============================================
  invitations: {
    send: "/messaging/send",
    sendBulk: "/messaging/send-bulk",
    retry: "/messaging/retry",
    sendReminder: "/messaging/send-reminder",
    schedule: "/messaging/schedule",
  },

  // ============================================
  // TEMPLATES + FONTS
  // ============================================
  templates: {
    list: "/templates",
    getById: (id) => `/templates/${id}`,
    asset: (id) => `/templates/${id}/asset`,
    categories: "/template-categories",
    fonts: "/fonts",
    adminList: "/admin/templates",
    adminGetById: (id) => `/admin/templates/${id}`,
    adminCreate: "/admin/templates",
    adminUpdate: (id) => `/admin/templates/${id}`,
    adminDelete: (id) => `/admin/templates/${id}`,
    adminDuplicate: (id) => `/admin/templates/${id}/duplicate`,
    adminUploadImage: "/admin/templates/upload-image",
    adminCategories: "/admin/template-categories",
    adminCreateCategory: "/admin/template-categories",
    adminUpdateCategory: (id) => `/admin/template-categories/${id}`,
    adminDeleteCategory: (id) => `/admin/template-categories/${id}`,
  },

  taqnyatTemplates: {
    list: "/taqnyat-templates",
    adminList: "/admin/taqnyat-templates",
    adminSync: "/admin/taqnyat-templates/sync",
    adminCreate: "/admin/taqnyat-templates",
    adminAssign: (id) => `/admin/taqnyat-templates/${id}`,
    adminDelete: (id) => `/admin/taqnyat-templates/${id}`,
  },

  // ============================================
  // PLANS
  // ============================================
  plans: {
    getPlans: "/plans",
    getLandingPlans: "/plans/landing",
    getHostPlans: "/plans/host",
    getBusinessPlans: "/plans/business",
    getPlanById: (id) => `/plans/${id}`,
    getPlanByCode: (code) => `/plans/code/${code}`,
    adminGetAll: "/plans/admin/all",
    assignable: "/plans/assignable",
    adminCreate: "/plans/admin",
    adminUpdate: (code) => `/plans/admin/${code}`,
    adminDelete: (code) => `/plans/admin/${code}`,
  },

  // ============================================
  // BUSINESS (public hosted checkout — token based)
  // ============================================
  business: {
    checkoutSummary: (token) => `/business/checkout/${token}`,
    checkoutSubmit: (token) => `/business/checkout/${token}/submit`,
  },

  // ============================================
  // PAYMENTS (admin)
  // ============================================
  payments: {
    getAll: "/admin/payments",
    getById: (id) => `/admin/payments/${id}`,
    export: "/admin/payments/export",
    refund: (id) => `/payments/${id}/refund`,
    capture: (id) => `/payments/${id}/capture`,
    void: (id) => `/payments/${id}/void`,
  },

  // ============================================
  // POST-EVENT
  // ============================================
  postEvent: {
    validateToken: "/post-event/validate",
    getContent: (eventId) => `/post-event/${eventId}/content`,
    // Post-level interactions (one post per event) — used by the web guest page.
    togglePostLike: (eventId) => `/post-event/${eventId}/like`,
    addPostComment: (eventId) => `/post-event/${eventId}/comments`,
    getPostComments: (eventId) => `/post-event/${eventId}/comments`,
    // Per-media interactions (legacy) — still used by the mobile app.
    toggleLike: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/like`,
    addComment: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/comments`,
    getComments: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/comments`,
    getHostContent: (eventId) => `/post-event/${eventId}`,
    publishAndNotify: (eventId) => `/post-event/${eventId}/publish-and-notify`,
    uploadMedia: (eventId) => `/post-event/${eventId}/media`,
    deleteMedia: (eventId, mediaId) => `/post-event/${eventId}/media/${mediaId}`,
    updateThankYouMessage: (eventId) => `/post-event/${eventId}/thank-you`,
    updateMessagingTemplate: (eventId) => `/post-event/${eventId}/messaging`,
    publishContent: (eventId) => `/post-event/${eventId}/publish`,
    unpublishContent: (eventId) => `/post-event/${eventId}/unpublish`,
    generateBulkTokens: (eventId) => `/post-event/${eventId}/generate-tokens`,
    sendBulkAccessLinks: (eventId) => `/post-event/${eventId}/send-access-links`,
  },

  // ============================================
  // VENDOR SERVICES
  // ============================================
  vendorServices: {
    getPublicServices: "/services/public",
    getMyServices: "/services",
    getMyStats: "/services/stats",
    getService: (id) => `/services/${id}`,
    createService: "/services",
    updateService: (id) => `/services/${id}`,
    toggleServiceStatus: (id) => `/services/${id}/toggle-status`,
    deleteService: (id) => `/services/${id}`,
  },

  // ============================================
  // ADMIN
  // ============================================
  admin: {
    hosts: {
      getAll: "/admin/hosts",
      getById: (id) => `/admin/hosts/${id}`,
      create: "/admin/hosts",
      updateStatus: (id) => `/admin/hosts/${id}/status`,
      updateSubscription: (id) => `/admin/hosts/${id}/subscription`,
      grantExtraInvites: (id) => `/admin/hosts/${id}/subscription/extra-invites`,
      delete: (id) => `/admin/hosts/${id}`,
      bulkDelete: "/admin/hosts/bulk-delete",
      verifyPhone: "/admin/hosts/verify-phone",
      findOrCreate: "/admin/hosts/find-or-create",
      export: "/admin/hosts/export",
    },
    businesses: {
      getAll: "/admin/businesses",
      getById: (id) => `/admin/businesses/${id}`,
      create: "/admin/businesses",
      update: (id) => `/admin/businesses/${id}`,
      updateLogo: (id) => `/admin/businesses/${id}/logo`,
      assignPlan: (id) => `/admin/businesses/${id}/assign-plan`,
      grantExtraInvites: (id) => `/admin/businesses/${id}/subscription/extra-invites`,
      revokeAssignment: (assignmentId) =>
        `/admin/businesses/assignments/${assignmentId}/revoke`,
      regenerateAssignment: (assignmentId) =>
        `/admin/businesses/assignments/${assignmentId}/regenerate`,
      suspend: (id) => `/admin/businesses/${id}/suspend`,
      activate: (id) => `/admin/businesses/${id}/activate`,
      delete: (id) => `/admin/businesses/${id}`,
    },
    vendors: {
      getAll: "/admin/vendors",
      getById: (id) => `/admin/vendors/${id}`,
      updateStatus: (id) => `/admin/vendors/${id}/status`,
      updateRating: (id) => `/admin/vendors/${id}/rating`,
      delete: (id) => `/admin/vendors/${id}`,
      bulkDelete: "/admin/vendors/bulk-delete",
      bulkStatus: "/admin/vendors/bulk-status",
      export: "/admin/vendors/export",
    },
    moderators: {
      getAll: "/admin/moderators",
      create: "/admin/moderators",
      update: (id) => `/admin/moderators/${id}`,
      updateStatus: (id) => `/admin/moderators/${id}/status`,
      delete: (id) => `/admin/moderators/${id}`,
      bulkDelete: "/admin/moderators/bulk-delete",
      bulkStatus: "/admin/moderators/bulk-status",
      export: "/admin/moderators/export",
    },
    events: {
      getAll: "/events/admin/all",
      getById: (id) => `/admin/events/${id}`,
      createForHost: "/admin/events/create-for-host",
      update: (id) => `/admin/events/${id}`,
      updateStatus: (id) => `/admin/events/${id}/status`,
      delete: (id) => `/admin/events/${id}`,
      bulkDelete: "/admin/events/bulk-delete",
      bulkStatus: "/admin/events/bulk-status",
      export: "/admin/events/export",
      eventTargets: "/admin/event-targets",
      userSubscriptionInfo: (id) => `/admin/users/${id}/subscription-info`,
    },
  },
};

export const API_PATHS = deepFreeze(PATHS);

export default API_PATHS;

// Named exports for direct destructuring import.
export const {
  auth,
  events,
  users,
  guests,
  subscriptions,
  hostPayments,
  revenuecat,
  discounts,
  addons,
  tickets,
  notifications,
  staff,
  locations,
  vendors,
  dashboard,
  invitations,
  templates,
  taqnyatTemplates,
  plans,
  payments,
  postEvent,
  vendorServices,
  admin,
} = API_PATHS;
