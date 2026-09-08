'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Hook for event creation, settings updates, and lifecycle transitions.
 */
export function useEventSettings() {
  const queryClient = useQueryClient();

  const invalidateEvent = (eventId) => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['stats', eventId] });
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/events', payload),
    onSuccess: (data) => {
      invalidateEvent(data?.data?.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, payload }) => api.patch(`/events/${eventId}`, payload),
    onSuccess: (_, variables) => {
      invalidateEvent(variables.eventId);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ eventId, payload }) => api.post(`/events/${eventId}/status`, payload),
    onSuccess: (_, variables) => {
      invalidateEvent(variables.eventId);
    },
  });

  return {
    createEvent: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateEvent: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    updateEventStatus: statusMutation.mutateAsync,
    isUpdatingStatus: statusMutation.isPending,
    statusError: statusMutation.error,
  };
}
