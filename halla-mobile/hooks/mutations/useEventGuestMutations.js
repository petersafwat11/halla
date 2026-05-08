import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { updateGuestList } from '../../services/eventsService2';

export function useUpdateGuestList() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, guestData }) => {
      const response = await updateGuestList(eventId, guestData, token);
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate event stats
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}
