// Event key factory.
//
// Keys must stay byte-identical to the literal arrays (`["events", eventId]`
// etc.) that some event hook files use directly, so the two interoperate
// against the same query cache.
export const eventsKeys = {
  all: ["events"],
  myEvents: () => [...eventsKeys.all, "my-events"],
  stats: () => [...eventsKeys.all, "stats"],
  subscriptionInfo: () => [...eventsKeys.all, "subscription-info"],
  detail: (eventId) => [...eventsKeys.all, eventId],
  singleStats: (eventId) => [...eventsKeys.all, eventId, "stats"],
  staffTokens: (eventId) => [...eventsKeys.all, eventId, "staff-tokens"],
  capabilities: (eventId) => [...eventsKeys.all, eventId, "capabilities"],
  entitlement: (eventId) => [...eventsKeys.all, eventId, "entitlement"],
};
