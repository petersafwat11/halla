"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scheduledExtraRemindersService } from "@/services/scheduledExtraRemindersService";

const QK = {
  list: (eventId) => ["scheduled-extra-reminders", eventId],
};

export function useScheduledExtraReminders(eventId, opts = {}) {
  return useQuery({
    queryKey: QK.list(eventId),
    queryFn: () => scheduledExtraRemindersService.list(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...opts,
  });
}

export function useCreateScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }) =>
      scheduledExtraRemindersService.create(eventId, body),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: QK.list(eventId) });
      // Subscription quota + guest reminder fields live on the event read
      // and on the per-event guest list — invalidate both so the UI
      // reflects the new reservation immediately.
      qc.invalidateQueries({ queryKey: ["events", eventId] });
      qc.invalidateQueries({ queryKey: ["events", eventId, "stats"] });
      qc.invalidateQueries({ queryKey: ["guests", eventId] });
    },
  });
}

export function useCancelScheduledExtraReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reminderId }) =>
      scheduledExtraRemindersService.cancel(eventId, reminderId),
    onSuccess: (_data, { eventId }) => {
      qc.invalidateQueries({ queryKey: QK.list(eventId) });
      qc.invalidateQueries({ queryKey: ["events", eventId] });
      qc.invalidateQueries({ queryKey: ["guests", eventId] });
    },
  });
}

export const SCHEDULED_EXTRA_REMINDERS_QK = QK;
