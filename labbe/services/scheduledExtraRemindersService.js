// Scheduled extra reminders API client — host + admin (consume the
// event-owner's reminder quota; backend enforces ownership scoping).

import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

export const scheduledExtraRemindersService = {
  list: (eventId) =>
    apiRequest({
      method: "GET",
      path: API_PATHS.events.scheduledRemindersList(eventId),
    }),

  create: (eventId, body) =>
    apiRequest({
      method: "POST",
      path: API_PATHS.events.scheduledRemindersCreate(eventId),
      data: body,
    }),

  cancel: (eventId, reminderId) =>
    apiRequest({
      method: "DELETE",
      path: API_PATHS.events.scheduledRemindersCancel(eventId, reminderId),
    }),
};

export default scheduledExtraRemindersService;
