export const guestsKeys = {
  all: ["guests"],
  byToken: (token) => [...guestsKeys.all, "token", token],
  byInvitation: (invitationToken) => [
    ...guestsKeys.all,
    "invitation",
    invitationToken,
  ],
  forEvent: (eventId) => [...guestsKeys.all, "events", eventId],
};
