export const staffKeys = {
  all: ["staff"],
  guests: (eventId, filters) => [...staffKeys.all, "guests", eventId, filters],
  // Prefix-only key for invalidating all filter combinations of a given event.
  guestsForEvent: (eventId) => [...staffKeys.all, "guests", eventId],
};
