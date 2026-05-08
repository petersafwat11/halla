import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  updateEventDetails,
  deleteEvent,
  updateEventStep2,
} from '../../services/eventsService2';
import { ENDPOINTS } from '../../config/api';
import { apiFetch } from '../../services/apiClient';

/**
 * Hook to create a new event
 * @returns {Object} Mutation object
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      // Route through apiFetch (multipart, 60 s timeout).
      const response = await apiFetch(ENDPOINTS.EVENTS.CREATE, {
        method: "POST",
        body: formData,
        timeoutMs: 60 * 1000,
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to create event");
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'host'] });
    },
  });
}

/**
 * Hook to update an existing event
 * @returns {Object} Mutation object
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, eventData }) => {
      const response = await updateEventDetails(eventId, eventData, token);
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific event and all events queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}

/**
 * Hook to delete an event
 * @returns {Object} Mutation object
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (eventId) => {
      const response = await deleteEvent(eventId, token);
      return response;
    },
    onSuccess: () => {
      // Invalidate all events queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Atomic guest+staff update for the unified update wizard's step 2.
 *
 * Hits `PATCH /events/:id/step2` so a capacity-guard rejection on
 * either side leaves both fields at their pre-call values. Falls back
 * to compensation on standalone Mongo topologies — the controller
 * handles that, the client just sees a 200 or a thrown AppError.
 */
export function useUpdateEventStep2() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, guestList, staffList }) => {
      return await updateEventStep2(
        eventId,
        { guestList, staffList },
        token
      );
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
      // Mirror the web mutation's `["guests", "events", eventId]`
      // invalidation so any guest-list query under that key refetches.
      queryClient.invalidateQueries({ queryKey: ['guests', 'events', variables.eventId] });
    },
  });
}
