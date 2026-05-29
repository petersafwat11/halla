"use client";
import { useQuery } from "@tanstack/react-query";
import { scheduledExtraRemindersService } from "@/services/scheduledExtraRemindersService";
import { scheduledExtraRemindersKeys } from "./keys";

export function useScheduledExtraReminders(eventId, opts = {}) {
  return useQuery({
    queryKey: scheduledExtraRemindersKeys.list(eventId),
    queryFn: () => scheduledExtraRemindersService.list(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000,
    ...opts,
  });
}
