import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { API_BASE_URL, ENDPOINTS } from '../../config/api';

const ticketRequest = async (method, path, token, data) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(data && { body: JSON.stringify(data) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Request failed');
  return result;
};

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (data) => ticketRequest('POST', ENDPOINTS.TICKETS.BASE, token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: ({ ticketId, data }) => ticketRequest('PATCH', `${ENDPOINTS.TICKETS.BASE}/${ticketId}`, token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: (ticketId) => ticketRequest('DELETE', `${ENDPOINTS.TICKETS.BASE}/${ticketId}`, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useRateTicket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: ({ ticketId, rating, feedback }) =>
      ticketRequest('PATCH', ENDPOINTS.TICKETS.RATE(ticketId), token, { rating, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
