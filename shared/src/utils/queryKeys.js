/**
 * Canonical Query Key Factories
 * Resolves ADM-09 and establishes unified cache identity across SSR prefetch, client queries, and invalidations.
 */

export const eventKeys = {
  all: Object.freeze(["events"]),
  list: (filters) => [...eventKeys.all, "list", filters || {}],
  myEvents: (filters) => [...eventKeys.all, "my-events", filters || {}],
  adminList: (filters) => [...eventKeys.all, "admin", filters || {}],
  detail: (eventId) => [...eventKeys.all, eventId],
  adminDetail: (eventId) => ["admin", "events", eventId],
  stats: () => [...eventKeys.all, "stats"],
  userStats: () => [...eventKeys.all, "user-stats"],
  singleStats: (eventId) => [...eventKeys.all, eventId, "stats"],
  staffTokens: (eventId) => [...eventKeys.all, eventId, "staff-tokens"],
  subscriptionInfo: () => [...eventKeys.all, "subscription-info"],
  capabilities: (eventId) => [...eventKeys.all, eventId, "capabilities"],
  entitlement: (eventId) => [...eventKeys.all, eventId, "entitlement"],
};

export const guestKeys = {
  all: Object.freeze(["guests"]),
  forEvent: (eventId, params) =>
    params
      ? [...guestKeys.all, "events", eventId, params]
      : [...guestKeys.all, "events", eventId],
  detail: (guestId) => [...guestKeys.all, "detail", guestId],
  byToken: (token) => [...guestKeys.all, "token", token],
  byInvitation: (code) => [...guestKeys.all, "invitation", code],
  myContacts: (params) => [...guestKeys.all, "my-contacts", params || {}],
};

export const ticketKeys = {
  all: Object.freeze(["tickets"]),
  list: (filters) => [...ticketKeys.all, "list", filters || {}],
  adminList: (filters) => [...ticketKeys.all, "all", filters || {}],
  myTickets: (params) => [...ticketKeys.all, "my-tickets", params || {}],
  myTicketsPrefix: () => [...ticketKeys.all, "my-tickets"],
  detail: (ticketId) => [...ticketKeys.all, ticketId],
  assignees: () => [...ticketKeys.all, "assignees"],
  forRating: (ticketId) => [...ticketKeys.all, ticketId, "rating-info"],
};

export const planKeys = {
  all: Object.freeze(["plans"]),
  list: () => [...planKeys.all, "all"],
  host: () => [...planKeys.all, "host"],
  business: () => [...planKeys.all, "business"],
  landing: () => [...planKeys.all, "landing"],
  detail: (id) => [...planKeys.all, id],
  byCode: (code) => [...planKeys.all, "code", code],
  adminAll: () => ["admin", "plans"],
  adminList: (filters) => ["admin", "plans", filters || {}],
  assignablePlans: (filters) => ["admin", "assignable-plans", filters || {}],
};

export const vendorServiceKeys = {
  all: Object.freeze(["vendor-services"]),
  publicList: (params) => [...vendorServiceKeys.all, "public", params || {}],
  myList: () => [...vendorServiceKeys.all, "my-services"],
  stats: () => [...vendorServiceKeys.all, "stats"],
  detail: (serviceId) => [...vendorServiceKeys.all, serviceId],
};

export const subscriptionKeys = {
  all: Object.freeze(["subscriptions"]),
  mySubscription: () => [...subscriptionKeys.all, "my-subscription"],
  info: () => [...subscriptionKeys.all, "info"],
};

export const hostKeys = {
  all: Object.freeze(["admin", "hosts"]),
  list: (filters) => ["admin", "hosts", filters || {}],
  detail: (hostId) => ["admin", "hosts", hostId],
  verifyPhone: (phoneNumber) => ["admin", "hosts", "verify-phone", phoneNumber],
};

export const businessKeys = {
  all: Object.freeze(["admin", "businesses"]),
  list: (filters) => ["admin", "businesses", filters || {}],
  detail: (businessId) => ["admin", "businesses", businessId],
};

export const vendorKeys = {
  all: Object.freeze(["admin", "vendors"]),
  list: (filters) => ["admin", "vendors", filters || {}],
  detail: (vendorId) => ["admin", "vendors", vendorId],
};

export const moderatorKeys = {
  all: Object.freeze(["admin", "moderators"]),
  list: (filters) => ["admin", "moderators", filters || {}],
};

export const adminQueryKeys = {
  all: Object.freeze(["admin"]),
  dashboard: (filters) => ["admin", "dashboard", filters || {}],
  hosts: hostKeys,
  businesses: businessKeys,
  vendors: vendorKeys,
  moderators: moderatorKeys,
  plans: planKeys,
};

export const publicVendorKeys = {
  all: Object.freeze(["vendors"]),
  categories: () => [...publicVendorKeys.all, "categories"],
  publicList: (filters) => [...publicVendorKeys.all, "public", filters || {}],
  publicDetail: (vendorId) => [...publicVendorKeys.all, "public", "detail", vendorId],
};

export const marketplaceKeys = {
  all: Object.freeze(["marketplace"]),
  vendors: (filters) => [...marketplaceKeys.all, "vendors", filters || {}],
  categories: () => [...marketplaceKeys.all, "categories"],
  vendor: (vendorId) => [...marketplaceKeys.all, "vendor", vendorId],
};


