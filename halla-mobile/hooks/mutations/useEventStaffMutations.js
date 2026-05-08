import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ENDPOINTS } from '../../config/api';
import { apiFetch } from '../../services/apiClient';

/**
 * Hook to notify all active staff via SMS
 * Calls POST /events/:eventId/notify-staff
 */
export function useNotifyStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId }) => {
      const response = await apiFetch(ENDPOINTS.EVENTS.NOTIFY_STAFF(eventId), {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to notify staff");
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}
