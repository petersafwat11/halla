import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { eventsKeys } from "../events/keys";
import { guestsKeys } from "../guests/keys";
import { scheduledExtraRemindersKeys } from "./keys";
import { scheduledRemindersRequest } from "./queries";

export function useCreateScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      scheduledRemindersRequest(
        ENDPOINTS.EVENTS.SCHEDULED_REMINDERS_CREATE(eventId),
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        },
      ),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: scheduledExtraRemindersKeys.list(eventId) });
      qc.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: guestsKeys.forEvent(eventId) });
    },
  });
}

export function useCancelScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reminderId }) =>
      scheduledRemindersRequest(
        ENDPOINTS.EVENTS.SCHEDULED_REMINDERS_CANCEL(eventId, reminderId),
        { method: "DELETE" },
      ),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: scheduledExtraRemindersKeys.list(eventId) });
      qc.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: guestsKeys.forEvent(eventId) });
    },
  });
}
