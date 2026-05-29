// Mobile event key factory. Codifies the literal keys already used by
// existing event mutation files in hooks/events/mutations/ and by
// cross-domain callers (messaging, guests, staff, scheduledExtraReminders).
//
// Existing event-mutation files still use literal arrays; they're byte-
// identical to the factory output so the cache is consistent. New code
// (cross-domain) uses the factory exclusively.
export const eventsKeys = {
  all: ["events"],
  userStats: () => [...eventsKeys.all, "user-stats"],
  stats: () => [...eventsKeys.all, "stats"],
  subscriptionInfo: () => [...eventsKeys.all, "subscription-info"],
  detail: (eventId) => [...eventsKeys.all, eventId],
  singleStats: (eventId) => [...eventsKeys.all, "single-stats", eventId],
  staffTokens: (eventId) => [...eventsKeys.all, eventId, "staff-tokens"],
};
