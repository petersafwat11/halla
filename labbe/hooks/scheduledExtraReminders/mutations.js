"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { scheduledExtraRemindersKeys } from "./keys";
import { eventsKeys } from "@/hooks/events/keys";
import { guestsKeys } from "@/hooks/guests/keys";

export function useCreateScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.events.scheduledRemindersCreate(eventId),
        data: body,
      }),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: scheduledExtraRemindersKeys.list(eventId) });
      qc.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: eventsKeys.singleStats(eventId) });
      qc.invalidateQueries({ queryKey: guestsKeys.forEvent(eventId) });
    },
  });
}

export function useCancelScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reminderId }) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.events.scheduledRemindersCancel(eventId, reminderId),
      }),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: scheduledExtraRemindersKeys.list(eventId) });
      qc.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: guestsKeys.forEvent(eventId) });
    },
  });
}
