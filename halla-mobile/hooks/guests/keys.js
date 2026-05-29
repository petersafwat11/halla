export const guestsKeys = {
  all: ["guests"],
  forEvent: (eventId) => [...guestsKeys.all, "events", eventId],
  byInvitation: (code) => [...guestsKeys.all, "invitation", code],
};
