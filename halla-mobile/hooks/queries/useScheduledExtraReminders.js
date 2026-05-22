import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { scheduledExtraRemindersService } from "../../services/scheduledExtraRemindersService";

const QK = {
  list: (eventId) => ["scheduled-extra-reminders", eventId],
};

export function useScheduledExtraReminders(eventId, opts = {}) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: QK.list(eventId),
    queryFn: () => scheduledExtraRemindersService.list(eventId),
    enabled: !!eventId && !!token,
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
      qc.invalidateQueries({ queryKey: ["events", eventId] });
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
