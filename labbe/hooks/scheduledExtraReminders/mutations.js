"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduledExtraRemindersService } from "@/services/scheduledExtraRemindersService";
import { scheduledExtraRemindersKeys } from "./keys";
import { eventsKeys } from "@/hooks/events/keys";
import { guestsKeys } from "@/hooks/guests/keys";

export function useCreateScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      scheduledExtraRemindersService.create(eventId, body),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: scheduledExtraRemindersKeys.list(eventId) });
      // Subscription quota + guest reminder fields live on the event read
      // and on the per-event guest list — invalidate both so the UI
      // reflects the new reservation immediately.
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
      scheduledExtraRemindersService.cancel(eventId, reminderId),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: scheduledExtraRemindersKeys.list(eventId) });
      qc.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: guestsKeys.forEvent(eventId) });
    },
  });
}
