// Mobile scheduled extra reminders client.
// Mirrors `labbe/services/scheduledExtraRemindersService.js` — the backend
// is the same and enforces ownership scoping in
// scheduled-extra-reminders.service.js via getEventById's scoped query.

import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./http";

async function request(path, init = {}) {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const scheduledExtraRemindersService = {
  list: (eventId) =>
    request(ENDPOINTS.EVENTS.SCHEDULED_REMINDERS_LIST(eventId)),

  create: (eventId, body) =>
    request(ENDPOINTS.EVENTS.SCHEDULED_REMINDERS_CREATE(eventId), {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),

  cancel: (eventId, reminderId) =>
    request(ENDPOINTS.EVENTS.SCHEDULED_REMINDERS_CANCEL(eventId, reminderId), {
      method: "DELETE",
    }),
};

export default scheduledExtraRemindersService;
