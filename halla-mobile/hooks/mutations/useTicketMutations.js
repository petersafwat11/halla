import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ENDPOINTS } from '../../config/api';
import { apiFetch } from '../../services/apiClient';

/**
 * Phase 4 W0-AUTH: routed through `apiFetch` so ticket mutations get
 * 401 → refresh + 30 s timeout. Token args dropped — apiFetch reads the
 * in-memory token directly.
 */
const ticketRequest = async (method, path, _legacyToken, data) => {
  const response = await apiFetch(path, {
    method,
    body: data,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Request failed');
  return result;
};

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => ticketRequest('POST', ENDPOINTS.TICKETS.BASE, null, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, data }) =>
      ticketRequest('PATCH', `${ENDPOINTS.TICKETS.BASE}/${ticketId}`, null, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId) =>
      ticketRequest('DELETE', `${ENDPOINTS.TICKETS.BASE}/${ticketId}`, null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useRateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, rating, feedback }) =>
      ticketRequest('PATCH', ENDPOINTS.TICKETS.RATE(ticketId), null, { rating, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
