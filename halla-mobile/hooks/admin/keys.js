// Mobile admin key factory. Codifies the existing literal key shapes used
// across `useAdmin`, `useAdminInfinite`, and `useAdminMutations`.
//
// All shapes are byte-identical to prior literals so the cache survives the
// migration without an explicit invalidation entry in _cacheMigrations.
export const adminKeys = {
  all: ["admin"],

  stats: (period) => [...adminKeys.all, "stats", period],

  hosts: (params) => [...adminKeys.all, "hosts", params],
  hostsAll: () => [...adminKeys.all, "hosts"],
  hostDetail: (hostId) => [...adminKeys.all, "hosts", hostId],
  hostsInfinite: (cleanFilters) => [...adminKeys.all, "hosts", "infinite", cleanFilters],

  vendors: (params) => [...adminKeys.all, "vendors", params],
  vendorsAll: () => [...adminKeys.all, "vendors"],
  vendorDetail: (vendorId) => [...adminKeys.all, "vendors", vendorId],
  vendorsInfinite: (cleanFilters) => [...adminKeys.all, "vendors", "infinite", cleanFilters],

  moderators: (params) => [...adminKeys.all, "moderators", params],
  moderatorsAll: () => [...adminKeys.all, "moderators"],
  moderatorsInfinite: (cleanFilters) => [...adminKeys.all, "moderators", "infinite", cleanFilters],

  events: (params) => [...adminKeys.all, "events", params],
  eventsAll: () => [...adminKeys.all, "events"],
  eventDetail: (eventId) => [...adminKeys.all, "events", eventId],
  eventsInfinite: (cleanFilters) => [...adminKeys.all, "events", "infinite", cleanFilters],

  tickets: (params) => [...adminKeys.all, "tickets", params],
  ticketsAll: () => [...adminKeys.all, "tickets"],
  ticketDetail: (ticketId) => [...adminKeys.all, "tickets", ticketId],
  ticketsInfinite: (cleanFilters) => [...adminKeys.all, "tickets", "infinite", cleanFilters],

  businesses: (params) => [...adminKeys.all, "businesses", params],
  businessesAll: () => [...adminKeys.all, "businesses"],
  businessDetail: (businessId) => [...adminKeys.all, "businesses", businessId],
  businessesInfinite: (cleanFilters) => [...adminKeys.all, "businesses", "infinite", cleanFilters],

  plans: (filters) => [...adminKeys.all, "plans", filters],
  plansAll: () => [...adminKeys.all, "plans"],
  hostPlans: () => [...adminKeys.all, "plans", "host"],
  assignablePlans: (filters) => [...adminKeys.all, "plans", "assignable", filters],

  payments: (params) => [...adminKeys.all, "payments", params],
  paymentsAll: () => [...adminKeys.all, "payments"],
  paymentDetail: (paymentId) => [...adminKeys.all, "payments", paymentId],
  paymentsInfinite: (cleanFilters) => [...adminKeys.all, "payments", "infinite", cleanFilters],
};
