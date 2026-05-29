export const staffKeys = {
  all: ["staff"],
  guests: (eventId, filters) => [...staffKeys.all, "guests", eventId, filters],
  guestsForEvent: (eventId) => [...staffKeys.all, "guests", eventId],
};
