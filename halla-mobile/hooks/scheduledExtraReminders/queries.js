import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { scheduledExtraRemindersService } from "../../services/scheduledExtraRemindersService";
import { scheduledExtraRemindersKeys } from "./keys";

export function useScheduledExtraReminders(eventId, opts = {}) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: scheduledExtraRemindersKeys.list(eventId),
    queryFn: () => scheduledExtraRemindersService.list(eventId),
    enabled: !!eventId && !!token,
    staleTime: 30 * 1000,
    ...opts,
  });
}
