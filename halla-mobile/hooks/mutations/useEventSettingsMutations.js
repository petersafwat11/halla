import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import {
  updateInvitationSettings,
  updateLaunchSettings,
} from '../../services/eventsService2';
import { sendTestInvitation, sendBulkInvitations, retryFailedInvitations, sendReminder } from '../../services/messagingService';
import { ENDPOINTS } from '../../config/api';
import { apiFetch } from '../../services/apiClient';

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
      return await updateInvitationSettings(eventId, settings, token);
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
      return await updateLaunchSettings(eventId, launchSettings, token);
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
      return await updateInvitationSettings(eventId, settings, token);
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
      return await updateInvitationSettings(eventId, settings, token);
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
      return await updateInvitationSettings(eventId, settings, token);
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
