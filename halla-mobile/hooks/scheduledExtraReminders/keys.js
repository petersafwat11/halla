export const scheduledExtraRemindersKeys = {
  all: ["scheduled-extra-reminders"],
  list: (eventId) => [...scheduledExtraRemindersKeys.all, eventId],
};
