export const messagingKeys = {
  all: ["messaging"],
  stats: (eventId) => [...messagingKeys.all, "stats", eventId],
};
