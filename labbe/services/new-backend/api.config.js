/**
 * API Configuration
 * Central registry of all API paths
 * Update paths here when backend changes
 */

export const API_PATHS = {
  // ============================================
  // AUTH MODULE
  // ============================================
  auth: {
    // Signup
    hostSignup: '/auth/signup/host',
    vendorSignup: '/auth/signup/vendor',
    whitelabelSignup: '/auth/signup/whitelabel',

    // Login
    login: '/auth/login',

    // OTP
    sendSignupOTP: '/auth/otp/send-signup',
    verifySignupOTP: '/auth/otp/verify-signup',
    sendLoginOTP: '/auth/otp/send-login',
    verifyLoginOTP: '/auth/otp/verify-login',
    resendOTP: '/auth/otp/resend',

    // Password
    forgotPassword: '/auth/forgot-password',
    resetPassword: (token) => `/auth/reset-password/${token}`,

    // Password Setup (Whitelabel)
    validateSetupToken: (token) => `/auth/validate-setup-token/${token}`,
    setupPassword: '/auth/setup-password',
    resendSetupEmail: '/auth/resend-setup-email',

    // Logout
    logout: '/auth/logout',

    // Protected Routes
    getMe: '/auth/me',
    updatePassword: '/auth/update-password',
    updateMe: '/auth/update-me',
    completeHostProfile: '/auth/complete-profile',

    // Email Verification
    sendVerificationCode: '/auth/send-verification-code',
    verifyEmail: '/auth/verify-email',
  },

  // ============================================
  // EVENTS MODULE
  // ============================================
  events: {
    // List & Stats
    getMyEvents: '/events/my-events',
    getEventStats: '/events/stats',
    getSingleEventStats: (id) => `/events/stats/${id}`,
    getSubscriptionInfo: '/events/subscription-info',

    // Export
    exportEventsAsExcel: '/events/export/events',

    // CRUD
    createEvent: '/events',
    getEventById: (id) => `/events/${id}`,

    // Partial Updates
    updateEventDetails: (id) => `/events/${id}/event-details`,
    updateGuestList: (id) => `/events/${id}/guest-list`,
    updateStaffList: (id) => `/events/${id}/staff-list`,
    // Phase 4d W0-ATOMIC: single transactional endpoint that updates
    // guests + staff atomically. Old endpoints stay as compat for one
    // release cycle.
    updateEventStep2: (id) => `/events/${id}/step2`,
    updateInvitationSettings: (id) => `/events/${id}/invitation-settings`,
    updateLaunchSettings: (id) => `/events/${id}/launch-settings`,

    // Messaging
    sendTestMessage: (id) => `/events/${id}/test-message`,

    // Delete
    deleteEvent: (id) => `/events/${id}`,
    bulkDeleteEvents: '/events/bulk-delete',

    // Staff Management
    addStaff: (eventId) => `/events/${eventId}/staff`,
    updateStaff: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,
    updateStaffStatus: (eventId, staffId) => `/events/${eventId}/staff/${staffId}/status`,
    deleteStaff: (eventId, staffId) => `/events/${eventId}/staff/${staffId}`,

    // Staff Notification
    notifyStaff: (eventId) => `/events/${eventId}/notify-staff`,

    // Admin Routes
    getAllEvents: '/events/admin/all',
    adminUpdateEventStatus: (id) => `/events/admin/${id}/status`,
    adminDeleteEvent: (id) => `/events/admin/${id}`,

    // Phase 3c.1 — manual launch retry
    retryLaunch: (id) => `/events/${id}/retry-launch`,
  },

  // ============================================
  // USERS MODULE
  // ============================================
  users: {
    // Profile
    getMyProfile: '/users/profile',
    updateMyProfile: '/users/profile',
    updateMyPassword: '/users/password',
    updateMyProfileSection: (section) => `/users/profile/${section}`,

    // Notification Preferences
    getNotificationPreferences: '/users/notification-preferences',
    updateNotificationPreferences: '/users/notification-preferences',

    // Host Routes (Admin)
    getHosts: '/users/hosts',
    createHost: '/users/hosts',
    getHostById: (id) => `/users/hosts/${id}`,
    deleteHost: (id) => `/users/hosts/${id}`,
    updateHostStatus: (id) => `/users/hosts/${id}/status`,

    // Vendor Routes (Admin)
    getVendors: '/users/vendors',
    getVendorById: (id) => `/users/vendors/${id}`,
    updateVendorStatus: (id) => `/users/vendors/${id}/status`,

    // Moderator Routes (Admin)
    getModerators: '/users/moderators',
    createModerator: '/users/moderators',
  },

  // ============================================
  // GUESTS MODULE
  // ============================================
  guests: {
    // Public Routes
    getByInvitationCode: (code) => `/guests/invitation/${code}`,
    submitRSVP: (id) => `/guests/${id}/rsvp`,

    // Protected Routes
    getEventGuests: (eventId) => `/guests/events/${eventId}`,
    addGuest: (eventId) => `/guests/events/${eventId}`,
    updateGuest: (eventId, guestId) => `/guests/events/${eventId}/guests/${guestId}`,
    deleteGuest: (eventId, guestId) => `/guests/events/${eventId}/guests/${guestId}`,

    // Export
    exportGuests: (eventId) => `/guests/events/${eventId}/export`,
  },

  // ============================================
  // SUBSCRIPTIONS MODULE
  // ============================================
  subscriptions: {
    getMySubscription: '/subscriptions/my-subscription',
    adminAssign: '/subscriptions/admin/assign',
    getMyPayments: '/subscriptions/payments',
  },

  // ============================================
  // PAYMENTS MODULE (host-facing single payment + 3DS)
  // ============================================
  hostPayments: {
    getById: (id) => `/payments/${id}`,
    poll3ds: (id) => `/payments/${id}/poll`,
    checkout: '/payments/checkout',
    export: '/subscriptions/payments/export',
  },

  // ============================================
  // DISCOUNTS MODULE
  // ============================================
  discounts: {
    validate: '/discounts/validate',
    list: '/discounts/admin',
    create: '/discounts/admin',
    byId: (id) => `/discounts/admin/${id}`,
    update: (id) => `/discounts/admin/${id}`,
    toggle: (id) => `/discounts/admin/${id}/toggle`,
    delete: (id) => `/discounts/admin/${id}`,
  },

  // ============================================
  // ADDONS MODULE
  // ============================================
  addons: {
    getCatalog: '/addons',
    purchase: '/addons/purchase',
    listMine: '/addons/my',
    adminActivate: (id) => `/addons/admin/${id}/activate`,
  },

  // ============================================
  // TICKETS MODULE
  // ============================================
  tickets: {
    getAssignees: '/tickets/assignees',
    getMyTickets: '/tickets',
    createTicket: '/tickets',
    getTicketById: (id) => `/tickets/${id}`,
    updateTicket: (id) => `/tickets/${id}`,
    deleteTicket: (id) => `/tickets/${id}`,

    // Admin Actions
    assignTicket: (id) => `/tickets/${id}/assign`,
    updateTicketStatus: (id) => `/tickets/${id}/status`,

    // Rating
    rateTicket: (id) => `/tickets/${id}/rate`,
    getTicketForRating: (id) => `/tickets/${id}/rating-info`,
  },

  // ============================================
  // NOTIFICATIONS MODULE
  // ============================================
  notifications: {
    getUnreadCount: '/notifications/unread-count',
    markAllAsRead: '/notifications/read-all',
    clearAllNotifications: '/notifications/clear-all',
    getNotifications: '/notifications',

    // Single Operations
    getNotification: (id) => `/notifications/${id}`,
    deleteNotification: (id) => `/notifications/${id}`,
    markAsRead: (id) => `/notifications/${id}/read`,

    // Admin
    sendNotification: '/notifications/send',
    broadcastNotification: '/notifications/broadcast',
  },

  // ============================================
  // STAFF MODULE
  // ============================================
  staff: {
    verifyStaffAccess: '/staff/verify',
    getEventGuests: (eventId) => `/staff/events/${eventId}/guests`,
    checkInGuest: (eventId) => `/staff/events/${eventId}/check-in`,
    manualCheckIn: (eventId) => `/staff/events/${eventId}/manual-check-in`,
    getEventStats: (eventId) => `/staff/events/${eventId}/stats`,
  },

  // ============================================
  // LOCATIONS MODULE
  // ============================================
  locations: {
    getRegions: '/locations/regions',
    getCitiesByRegion: (regionId) => `/locations/cities/${regionId}`,
    getDistrictsByCity: (cityId) => `/locations/districts/${cityId}`,
    getAllLocations: '/locations/all',
    searchLocations: '/locations/search',
    resolveLocationNames: '/locations/resolve',
  },

  // ============================================
  // VENDORS MODULE (Public)
  // ============================================
  vendors: {
    getCategories: '/vendors/categories',
    getVendors: '/vendors',
    getVendorById: (id) => `/vendors/${id}`,
  },

  // ============================================
  // DASHBOARD MODULE
  // ============================================
  dashboard: {
    getAdminDashboard: '/dashboard/admin',
    getHostDashboard: '/dashboard/host',
  },

  // ============================================
  // INVITATIONS MODULE
  // ============================================
  invitations: {
    send: '/messaging/send',
    sendBulk: '/messaging/send-bulk',
    retry: '/messaging/retry',
    sendReminder: '/messaging/send-reminder',

    // Schedule
    schedule: '/messaging/schedule',
  },

  // ============================================
  // PHASE 4C — TEMPLATES (Visual + Taqnyat) + FONTS
  // ============================================
  templates: {
    // Host-facing
    list: '/templates',
    getById: (id) => `/templates/${id}`,
    categories: '/template-categories',
    fonts: '/fonts',
    // Admin
    adminList: '/admin/templates',
    adminGetById: (id) => `/admin/templates/${id}`,
    adminCreate: '/admin/templates',
    adminUpdate: (id) => `/admin/templates/${id}`,
    adminDelete: (id) => `/admin/templates/${id}`,
    adminDuplicate: (id) => `/admin/templates/${id}/duplicate`,
    adminUploadUrl: '/admin/templates/upload-url',
    adminUploadImage: '/admin/templates/upload-image',
    // Categories admin
    adminCategories: '/admin/template-categories',
    adminCreateCategory: '/admin/template-categories',
    adminUpdateCategory: (id) => `/admin/template-categories/${id}`,
    adminDeleteCategory: (id) => `/admin/template-categories/${id}`,
  },
  taqnyatTemplates: {
    // Host-facing list (replaces direct passthrough)
    list: '/taqnyat-templates',
    // Admin
    adminList: '/admin/taqnyat-templates',
    adminSync: '/admin/taqnyat-templates/sync',
    adminCreate: '/admin/taqnyat-templates',
    adminAssign: (id) => `/admin/taqnyat-templates/${id}`,
    adminDelete: (id) => `/admin/taqnyat-templates/${id}`,
  },

  // ============================================
  // PLANS MODULE
  // ============================================
  plans: {
    getPlans: '/plans',
    getHostPlans: '/plans/host',
    getBusinessPlans: '/plans/business',
    getPlanById: (id) => `/plans/${id}`,
    getPlanByCode: (code) => `/plans/code/${code}`,
    // Admin-only plan management
    adminGetAll: '/plans/admin/all',
    adminCreate: '/plans/admin',
    adminUpdate: (code) => `/plans/admin/${code}`,
    adminDelete: (code) => `/plans/admin/${code}`,
  },

  // ============================================
  // PAYMENTS MODULE (Admin)
  // ============================================
  payments: {
    getAll: '/admin/payments',
    getById: (id) => `/admin/payments/${id}`,
    export: '/admin/payments/export',
    refund: (id) => `/payments/${id}/refund`,
    capture: (id) => `/payments/${id}/capture`,
    void: (id) => `/payments/${id}/void`,
  },

  // ============================================
  // POST-EVENT MODULE
  // ============================================
  postEvent: {
    validateToken: '/post-event/validate',

    // Guest Routes
    getContent: (eventId) => `/post-event/${eventId}/content`,
    toggleLike: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/like`,
    addComment: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/comments`,
    getComments: (eventId, postId) => `/post-event/${eventId}/posts/${postId}/comments`,

    // Host Routes
    getHostContent: (eventId) => `/post-event/${eventId}`,
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
  // VENDOR SERVICES MODULE
  // ============================================
  vendorServices: {
    getPublicServices: '/services/public',
    getMyServices: '/services',
    getMyStats: '/services/stats',
    getService: (id) => `/services/${id}`,
    createService: '/services',
    updateService: (id) => `/services/${id}`,
    toggleServiceStatus: (id) => `/services/${id}/toggle-status`,
    deleteService: (id) => `/services/${id}`,
  },

  // ============================================
  // ADMIN MODULE
  // ============================================
  admin: {
    // Host Management
    hosts: {
      getAll: '/admin/hosts',
      getById: (id) => `/admin/hosts/${id}`,
      create: '/admin/hosts',
      updateStatus: (id) => `/admin/hosts/${id}/status`,
      updateSubscription: (id) => `/admin/hosts/${id}/subscription`,
      delete: (id) => `/admin/hosts/${id}`,
      bulkDelete: '/admin/hosts/bulk-delete',
      verifyPhone: '/admin/hosts/verify-phone',
      findOrCreate: '/admin/hosts/find-or-create',
      export: '/admin/hosts/export',
    },

    // Vendor Management
    vendors: {
      getAll: '/admin/vendors',
      getById: (id) => `/admin/vendors/${id}`,
      updateStatus: (id) => `/admin/vendors/${id}/status`,
      updateRating: (id) => `/admin/vendors/${id}/rating`,
      delete: (id) => `/admin/vendors/${id}`,
      bulkDelete: '/admin/vendors/bulk-delete',
      bulkStatus: '/admin/vendors/bulk-status',
      export: '/admin/vendors/export',
    },

    // Moderator Management
    moderators: {
      getAll: '/admin/moderators',
      create: '/admin/moderators',
      update: (id) => `/admin/moderators/${id}`,
      updateStatus: (id) => `/admin/moderators/${id}/status`,
      delete: (id) => `/admin/moderators/${id}`,
      bulkDelete: '/admin/moderators/bulk-delete',
      bulkStatus: '/admin/moderators/bulk-status',
      export: '/admin/moderators/export',
    },

    // Whitelabel Management
    whitelabels: {
      getAll: '/admin/whitelabels',
      getById: (id) => `/admin/whitelabels/${id}`,
      updateStatus: (id) => `/admin/whitelabels/${id}/status`,
      updateSubscription: (id) => `/admin/whitelabels/${id}/subscription`,
      features: (id) => `/admin/whitelabels/${id}/features`,
      delete: (id) => `/admin/whitelabels/${id}`,
      bulkDelete: '/admin/whitelabels/bulk-delete',
      bulkStatus: '/admin/whitelabels/bulk-status',
      export: '/admin/whitelabels/export',
    },

    // Event Management (Admin)
    events: {
      getAll: '/events/admin/all',
      getById: (id) => `/admin/events/${id}`,
      createForHost: '/admin/events/create-for-host',
      update: (id) => `/admin/events/${id}`,
      updateStatus: (id) => `/admin/events/${id}/status`,
      delete: (id) => `/admin/events/${id}`,
      bulkDelete: '/admin/events/bulk-delete',
      bulkStatus: '/admin/events/bulk-status',
      export: '/admin/events/export',
      eventTargets: '/admin/event-targets',
      userSubscriptionInfo: (id) => `/admin/users/${id}/subscription-info`,
    },
  },
};

// ============================================
// EXPORTS
// ============================================

export default API_PATHS;

// Named exports for direct import
export const {
  auth,
  events,
  users,
  guests,
  subscriptions,
  tickets,
  notifications,
  staff,
  locations,
  vendors,
  dashboard,
  invitations,
  plans,
  postEvent,
  vendorServices,
  admin,
  payments,
  hostPayments,
  addons,
  discounts,
} = API_PATHS;
