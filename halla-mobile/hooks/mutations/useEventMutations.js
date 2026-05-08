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
      return await eventsService2.updateEventStep2(
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

/**
 * Invitation settings update wrapper.
 *
 * Wraps `eventsService2.updateInvitationSettings` (multipart) so the
 * unified update wizard step 3+4+5 can dispatch through React Query for
 * cache invalidation parity with the rest of the wizard.
 */
export function useUpdateInvitationSettings() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, settings }) => {
      return await eventsService2.updateInvitationSettings(eventId, settings, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}

/**
 * Launch settings update wrapper.
 */
export function useUpdateLaunchSettings() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, launchSettings }) => {
      return await eventsService2.updateLaunchSettings(eventId, launchSettings, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}

/**
 * Visual-template update wrapper.
 *
 * Backend has no dedicated `/visual-template` endpoint; the canonical
 * shape is persisted via `updateInvitationSettings` (multipart). This
 * hook narrows the payload to the visual-template-only fields so the
 * dynamic `StepThree` form can save independently of the messaging
 * step.
 */
export function useUpdateVisualTemplate() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, visualTemplate, fieldValues, templateImage }) => {
      const settings = {};
      if (visualTemplate !== undefined) settings.visualTemplate = visualTemplate;
      if (fieldValues !== undefined) settings.fieldValues = fieldValues;
      // Backend canonical-key alias: `visualTemplateRef` writes through
      // to `event.visualTemplate.templateRef` per the dual-write
      // contract.
      if (visualTemplate?.templateRef || visualTemplate?._id || visualTemplate?.id) {
        settings.visualTemplateRef =
          visualTemplate.templateRef || visualTemplate._id || visualTemplate.id;
      }
      if (templateImage !== undefined) settings.templateImage = templateImage;
      return await eventsService2.updateInvitationSettings(eventId, settings, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}

/**
 * Taqnyat-template selection update.
 *
 * Same backing endpoint as visual-template; this narrowed payload
 * isolates the Taqnyat picker step's save action.
 */
export function useUpdateTaqnyatTemplate() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, taqnyatTemplate, selectedTemplate }) => {
      const ref =
        taqnyatTemplate?.templateRef ||
        taqnyatTemplate?._id ||
        taqnyatTemplate?.id ||
        selectedTemplate?._id ||
        selectedTemplate?.id;
      const settings = {};
      if (selectedTemplate !== undefined) settings.selectedTemplate = selectedTemplate;
      if (ref) settings.taqnyatTemplateRef = ref;
      return await eventsService2.updateInvitationSettings(eventId, settings, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
    },
  });
}

/**
 * Messaging + auto-replies + host note update wrapper for the unified
 * wizard's StepFive.
 *
 * Dual-writes legacy `attendanceAutoReply` / `absenceAutoReply` /
 * `expectedAttendanceAutoReply` / `note` alongside canonical
 * `guestReplies.*` / `invitationMessage` / `hostNote` so the read paths
 * resolve under either shape until the legacy field is dropped.
 */
export function useUpdateMessagingContent() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async ({ eventId, invitationMessage, guestReplies, hostNote }) => {
      const settings = {};
      if (invitationMessage !== undefined) settings.invitationMessage = invitationMessage;
      if (hostNote !== undefined) {
        settings.hostNote = hostNote;
        settings.note = hostNote;
      }
      if (guestReplies && typeof guestReplies === "object") {
        settings.guestReplies = guestReplies;
        if (guestReplies.onAttend !== undefined) settings.attendanceAutoReply = guestReplies.onAttend;
        if (guestReplies.onAbsent !== undefined) settings.absenceAutoReply = guestReplies.onAbsent;
        if (guestReplies.onExpected !== undefined) settings.expectedAttendanceAutoReply = guestReplies.onExpected;
      }
      return await eventsService2.updateInvitationSettings(eventId, settings, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', 'single-stats', variables.eventId] });
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
