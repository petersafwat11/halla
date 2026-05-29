// Event key factory.
//
// The existing event hook files in hooks/events/{queries,mutations}/ still
// reference their keys as literal arrays (`["events", eventId]` etc.) — the
// factory is byte-identical to those literals, so it interoperates without
// any cache migration. The individual files can adopt the factory
// incrementally; cross-domain callers (checkout, scheduledExtraReminders,
// post-event, etc.) use the factory exclusively per the Phase 5 convention.
export const eventsKeys = {
  all: ["events"],
  myEvents: () => [...eventsKeys.all, "my-events"],
  stats: () => [...eventsKeys.all, "stats"],
  subscriptionInfo: () => [...eventsKeys.all, "subscription-info"],
  detail: (eventId) => [...eventsKeys.all, eventId],
  singleStats: (eventId) => [...eventsKeys.all, eventId, "stats"],
  staffTokens: (eventId) => [...eventsKeys.all, eventId, "staff-tokens"],
};
