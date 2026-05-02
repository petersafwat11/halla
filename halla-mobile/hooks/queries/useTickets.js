import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { getTicketsAPI, getTicketAPI } from '../../services/ticketsService';

/**
 * Hook to fetch user tickets
 */
export function useTickets(filters = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const response = await getTicketsAPI(token, filters);
      return response;
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single ticket by ID
 */
export function useTicket(ticketId) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: async () => {
      const response = await getTicketAPI(ticketId, token);
      return response;
    },
    enabled: !!token && !!ticketId,
    staleTime: 3 * 60 * 1000,
  });
}
