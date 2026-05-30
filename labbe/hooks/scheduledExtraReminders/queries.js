"use client";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { scheduledExtraRemindersKeys } from "./keys";

export function useScheduledExtraReminders(eventId, opts = {}) {
  return useQuery({
    queryKey: scheduledExtraRemindersKeys.list(eventId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.scheduledRemindersList(eventId),
      }),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...opts,
  });
}
