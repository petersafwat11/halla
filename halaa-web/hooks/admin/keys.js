// Admin namespace covers the cross-resource management surface:
// hosts, vendors, moderators, plans, payments, events, etc.
//
// Note: `adminEventsList` (uses the `useAdminEvents` hook) intentionally lives
// under the `events` namespace (`["events", "admin", filters]`), not under
// admin — this matches the legacy literal key and lets host/admin event lists
// share their parent invalidation prefix.
import { eventsKeys } from "@/hooks/events/keys";

export const adminKeys = {
  all: ["admin"],

  dashboard: (filters) => [...adminKeys.all, "dashboard", filters],

  hosts: (filters) => [...adminKeys.all, "hosts", filters],
  hostsAll: () => [...adminKeys.all, "hosts"],
  hostDetail: (hostId) => [...adminKeys.all, "hosts", hostId],
  hostVerifyPhone: (phoneNumber) => [
    ...adminKeys.all,
    "hosts",
    "verify-phone",
    phoneNumber,
  ],

  businesses: (filters) => [...adminKeys.all, "businesses", filters],
  businessesAll: () => [...adminKeys.all, "businesses"],
  businessDetail: (businessId) => [...adminKeys.all, "businesses", businessId],

  vendors: (filters) => [...adminKeys.all, "vendors", filters],
  vendorsAll: () => [...adminKeys.all, "vendors"],
  vendorDetail: (vendorId) => [...adminKeys.all, "vendors", vendorId],

  moderators: (filters) => [...adminKeys.all, "moderators", filters],
  moderatorsAll: () => [...adminKeys.all, "moderators"],

  plans: (filters) => [...adminKeys.all, "plans", filters],
  plansAll: () => [...adminKeys.all, "plans"],
  assignablePlans: (filters) => [...adminKeys.all, "assignable-plans", filters],

  payments: (filters) => [...adminKeys.all, "payments", filters],
  paymentsAll: () => [...adminKeys.all, "payments"],
  paymentDetail: (paymentId) => [
    ...adminKeys.all,
    "payments",
    "detail",
    paymentId,
  ],

  // Single-event admin view (admin namespace).
  eventDetail: (eventId) => [...adminKeys.all, "events", eventId],
  eventTargets: (type) => [...adminKeys.all, "event-targets", type],
  userSubscriptionInfo: (userId) => [
    ...adminKeys.all,
    "users",
    userId,
    "subscription-info",
  ],

  // Admin events list lives under the events namespace, not admin.
  adminEventsList: (filters) => [...eventsKeys.all, "admin", filters],
};
