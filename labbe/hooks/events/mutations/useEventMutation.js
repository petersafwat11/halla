"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { parseError, ErrorTypes } from "@/services/errorHandlingService";

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
};

// Determine if error should trigger retry
const shouldRetry = (failureCount, error) => {
  if (failureCount >= 3) return false;
  const parsed = parseError(error);
  // Retry on network errors, timeouts, and 5xx server errors
  return (
    parsed.type === ErrorTypes.NETWORK ||
    parsed.type === ErrorTypes.TIMEOUT ||
    (parsed.status && parsed.status >= 500)
  );
};

/**
 * Unified Events Mutation Hook with Optimistic Updates
 * @param {string} action - The event action to perform
 * @returns {UseMutationResult}
 */
export const useEventMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    // Create Event
    createEvent: {
      mutationFn: (eventData) => {
        const formData = new FormData();
        if (eventData.eventDetails) formData.append("eventDetails", JSON.stringify(eventData.eventDetails));
        if (eventData.guestList) formData.append("guestList", JSON.stringify(eventData.guestList));
        if (eventData.staffList) formData.append("staffList", JSON.stringify(eventData.staffList));
        if (eventData.launchSettings) formData.append("launchSettings", JSON.stringify(eventData.launchSettings));
        const { templateImage, ...restInvitation } = eventData.invitationSettings || {};
        if (Object.keys(restInvitation).length) formData.append("invitationSettings", JSON.stringify(restInvitation));
        if (templateImage instanceof File) formData.append("templateImage", templateImage);

        return apiRequest({
          method: "POST",
          path: API_PATHS.events.createEvent,
          data: formData,
          config: { headers: { "Content-Type": "multipart/form-data" } },
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      },
    },

    // Update Event Details
    updateEventDetails: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.events.updateEventDetails(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Update Guest List
    updateGuestList: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.events.updateGuestList(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
      },
    },

    // Replace Staff List
    updateStaffList: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.events.updateStaffList(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Phase 4d W1-WEB-ATOMIC — atomic guest+staff update.
    //
    // Replaces the parallel `Promise.all([updateGuestList, updateStaffList])`
    // dispatch with a single PATCH so a capacity-guard rejection on
    // either side leaves both fields at their pre-call values. Server
    // accepts either `supervisorsList` (web naming, what we send) or
    // `staffList` (mobile naming) per D4d-2.
    updateEventStep2: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.events.updateEventStep2(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
      },
    },

    // Update Invitation Settings — backend expects multipart/form-data (multer middleware)
    // Controller passes req.body fields directly (no JSON.parse), so append each field individually
    updateInvitationSettings: {
      mutationFn: ({ eventId, data }) => {
        const formData = new FormData();
        const { templateImage, ...restSettings } = data || {};
        Object.entries(restSettings).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
          }
        });
        if (templateImage instanceof File) {
          formData.append("templateImage", templateImage);
        }
        return apiRequest({
          method: "PATCH",
          path: API_PATHS.events.updateInvitationSettings(eventId),
          data: formData,
          config: { headers: { "Content-Type": "multipart/form-data" } },
        });
      },
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Update Launch Settings
    updateLaunchSettings: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.events.updateLaunchSettings(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Send Test Message (via messaging module)
    sendTestMessage: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.invitations.sendTest,
          data: { eventId, ...data },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "host"] });
      },
    },

    // Schedule bulk send (via messaging module)
    scheduleSend: {
      mutationFn: ({ eventId, scheduledDate, scheduledTime, channel }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.invitations.schedule,
          data: { eventId, scheduledDate, scheduledTime, channel },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "host"] });
      },
    },

    // Delete Event
    deleteEvent: {
      mutationFn: (eventId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.events.deleteEvent(eventId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      },
    },

    // Bulk Delete Events
    bulkDeleteEvents: {
      mutationFn: (eventIds) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.events.bulkDeleteEvents,
          data: { eventIds },
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      },
    },

    // Add Guest to Event
    addGuest: {
      mutationFn: ({ eventId, guestData }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.events.addGuestToEvent(eventId),
          data: guestData,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
      },
    },

    // Update Event Guest
    updateGuest: {
      mutationFn: ({ eventId, guestId, data }) =>
        apiRequest({
          method: "PUT",
          path: API_PATHS.events.updateEventGuest(eventId, guestId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
      },
    },

    // Delete Event Guest
    deleteGuest: {
      mutationFn: ({ eventId, guestId }) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.events.deleteEventGuest(eventId, guestId),
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["guests", "events", eventId] });
      },
    },

    // Add Staff
    addStaff: {
      mutationFn: ({ eventId, data }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.events.addStaff(eventId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Update Staff
    updateStaff: {
      mutationFn: ({ eventId, staffId, data }) =>
        apiRequest({
          method: "PUT",
          path: API_PATHS.events.updateStaff(eventId, staffId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Update Staff Status
    updateStaffStatus: {
      mutationFn: ({ eventId, staffId, data }) =>
        apiRequest({
          method: "PUT",
          path: API_PATHS.events.updateStaffStatus(eventId, staffId),
          data,
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Delete Staff
    deleteStaff: {
      mutationFn: ({ eventId, staffId }) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.events.deleteStaff(eventId, staffId),
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Notify all active staff via SMS
    notifyStaff: {
      mutationFn: ({ eventId }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.events.notifyStaff(eventId),
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
      },
    },

    // Manual launch retry (Phase 3c.1) — for failed events.
    //
    // M-19: send a per-click Idempotency-Key so a fast double-click is
    // deduped at the middleware layer instead of relying solely on the
    // server-side eventLock. The middleware caches the response for the
    // first call and replays it for the second; this is correct for
    // retry-launch because the operation is naturally idempotent (the
    // event lock + state machine ensure no double-send).
    retryLaunch: {
      mutationFn: ({ eventId }) => {
        const idempotencyKey =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? `retry-${eventId}-${crypto.randomUUID()}`
            : `retry-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return apiRequest({
          method: "POST",
          path: API_PATHS.events.retryLaunch(eventId),
          headers: { "Idempotency-Key": idempotencyKey },
        });
      },
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["events"] });
      },
    },

    // Submit WhatsApp template for approval
    submitTemplate: {
      mutationFn: ({ eventId }) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.invitations.submitTemplate,
          data: { eventId },
        }),
      onSuccess: (_, { eventId }) => {
        queryClient.invalidateQueries({ queryKey: ["events", eventId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "host"] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown event action: ${action}`);
  }

  return useMutation({
    ...mutationConfig,
    ...DEFAULT_RETRY_CONFIG,
    retry: shouldRetry,
    onError: (error) => {
      console.error(`Event mutation error (${action}):`, error);
    },
  });
};

// ============================================
// CONVENIENCE HOOKS
// ============================================

/**
 * Hook for creating events
 */
export const useCreateEvent = () => useEventMutation("createEvent");

/**
 * Hook for updating event details
 */
export const useUpdateEventDetails = () => useEventMutation("updateEventDetails");

/**
 * Hook for updating guest list
 */
export const useUpdateGuestList = () => useEventMutation("updateGuestList");

/**
 * Hook for updating invitation settings
 */
export const useUpdateStaffList = () => useEventMutation("updateStaffList");

/**
 * Phase 4d W1-WEB-ATOMIC — single mutation hook for the unified update
 * wizard's step 2 atomic dispatch.
 */
export const useUpdateEventStep2 = () => useEventMutation("updateEventStep2");

export const useUpdateInvitationSettings = () => useEventMutation("updateInvitationSettings");

/**
 * Hook for updating launch settings
 */
export const useUpdateLaunchSettings = () => useEventMutation("updateLaunchSettings");

/**
 * Hook for sending test messages
 */
export const useSendTestMessage = () => useEventMutation("sendTestMessage");

/**
 * Hook for deleting events
 */
export const useDeleteEvent = () => useEventMutation("deleteEvent");

/**
 * Hook for bulk deleting events
 */
export const useBulkDeleteEvents = () => useEventMutation("bulkDeleteEvents");

/**
 * Hook for guest operations
 */
export const useAddGuest = () => useEventMutation("addGuest");
export const useUpdateGuest = () => useEventMutation("updateGuest");
export const useDeleteGuest = () => useEventMutation("deleteGuest");

/**
 * Hook for staff operations
 */
export const useAddStaff = () => useEventMutation("addStaff");
export const useUpdateStaff = () => useEventMutation("updateStaff");
export const useUpdateStaffStatus = () => useEventMutation("updateStaffStatus");
export const useDeleteStaff = () => useEventMutation("deleteStaff");

/**
 * Hook for notifying staff
 */
export const useNotifyStaff = () => useEventMutation("notifyStaff");

/**
 * Hook for template submission
 */
export const useSubmitTemplate = () => useEventMutation("submitTemplate");

/**
 * Hook for scheduling bulk send
 */
export const useScheduleSend = () => useEventMutation("scheduleSend");

/**
 * Hook for manually retrying a failed event launch (Phase 3c.1)
 */
export const useRetryLaunch = () => useEventMutation("retryLaunch");

export default useEventMutation;
