import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { scheduledExtraRemindersKeys } from "./keys";

const _request = async (path, init = {}) => {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

export { _request as scheduledRemindersRequest };

export function useScheduledExtraReminders(eventId, opts = {}) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: scheduledExtraRemindersKeys.list(eventId),
    queryFn: () => _request(ENDPOINTS.EVENTS.SCHEDULED_REMINDERS_LIST(eventId)),
    enabled: !!eventId && !!token,
    staleTime: 30 * 1000,
    ...opts,
  });
}
