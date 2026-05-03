import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import eventsService2 from '../../services/eventsService2';
import { sendTestInvitation, sendBulkInvitations, retryFailedInvitations, sendReminder } from '../../services/messagingService';
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
      // Phase 4 W0-AUTH: route through apiFetch (multipart, 60 s timeout).
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
      const response = await eventsService2.updateEventDetails(eventId, eventData, token);
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
      const response = await eventsService2.deleteEvent(eventId, token);
      return response;
    },
    onSuccess: () => {
      // Invalidate all events queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to submit WhatsApp template for approval
 */
export function useSubmitTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId) => {
      const response = await apiFetch(ENDPOINTS.MESSAGING.TEMPLATE_SUBMIT, {
        method: "POST",
        body: { eventId },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to submit template");
      return data;
    },
    onSuccess: (data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'host'] });
    },
  });
}

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

export function useUpdateGuestList() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, guestData }) => {
      const response = await eventsService2.updateGuestList(eventId, guestData, token);
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate event stats
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}

/**
 * Hook to send a test message for an event
 * Calls POST /messaging/test
 */
export function useSendTestMessage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, phoneNumber, channel }) => {
      return await sendTestInvitation(phoneNumber, eventId, channel, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'host'] });
    },
  });
}

/**
 * Hook to schedule message sending for an event
 * Calls POST /messaging/schedule
 */
export function useScheduleSend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, scheduledDate, scheduledTime, channel }) => {
      const response = await apiFetch(ENDPOINTS.MESSAGING.SCHEDULE, {
        method: "POST",
        body: { eventId, scheduledDate, scheduledTime, channel },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to schedule message");
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'host'] });
    },
  });
}

/**
 * Hook to send bulk invitations to selected guests
 * Calls POST /messaging/send-bulk
 */
export function useSendBulkInvitations() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ guestIds, eventId, channel }) => {
      return await sendBulkInvitations(guestIds, eventId, channel, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'host'] });
    },
  });
}

/**
 * Hook to retry failed invitations for an event
 * Calls POST /messaging/retry
 */
export function useRetryFailed() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, channel }) => {
      return await retryFailedInvitations(eventId, channel, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'host'] });
    },
  });
}

/**
 * Hook to send a reminder to pending guests
 * Calls POST /messaging/send-reminder
 */
export function useSendReminder() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, channel, customMessage }) => {
      return await sendReminder(eventId, channel, customMessage, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'host'] });
    },
  });
}
