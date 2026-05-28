import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ENDPOINTS } from "../../../config/api";
import { apiFetch } from "../../../services/apiClient";
import {
  updateEventDetails as updateEventDetailsAPI,
  deleteEvent as deleteEventAPI,
  bulkDeleteEvents as bulkDeleteEventsAPI,
  updateEventStep2 as updateEventStep2API,
  updateGuestList as updateGuestListAPI,
  updateStaffList as updateStaffListAPI,
  addStaff as addStaffAPI,
  updateStaff as updateStaffAPI,
  deleteStaff as deleteStaffAPI,
  updateInvitationSettings as updateInvitationSettingsAPI,
  updateLaunchSettings as updateLaunchSettingsAPI,
  retryLaunch as retryLaunchAPI,
} from "../../../services/eventsService";

/**
 * Unified event mutation factory. Mirrors the web hook at
 * `labbe/hooks/events/mutations/useEventMutation.js`. Collapses the prior
 * six `useEvent*Mutations.js` files into a single config-map driven hook.
 *
 * Caller passes a stable `action` literal; the factory looks up the
 * `mutationFn` + invalidation keys in `ACTIONS` and returns a configured
 * `useMutation`. Each convenience hook below calls the factory with a
 * literal action so the action arg is stable across renders.
 *
 * Per-guest CRUD (`addGuest`, `updateGuest`, `deleteGuest`, `rotateGuestQr`,
 * `revokeGuestAccess`, `exportEventGuests`) lives in `useGuestMutations.js`
 * because its backend mount is `/guests/...` rather than `/events/.../guests`.
 * Messaging mutations (`useSendTestMessage`, `useScheduleSend`,
 * `useSendBulkInvitations`, `useRetryFailed`, `useSendReminder`) live in
 * `hooks/mutations/useMessagingMutations.js` and hit the `/messaging` mount.
 * Staff-access-token lifecycle (`useRevokeStaffAccess`) lives in
 * `hooks/mutations/useStaffMutations.js`.
 */

const invalidateEventList = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["events"] });
};

const invalidateSingleEvent = (queryClient, eventId) => {
  queryClient.invalidateQueries({ queryKey: ["events"] });
  if (eventId) {
    queryClient.invalidateQueries({
      queryKey: ["events", "single-stats", eventId],
    });
  }
};

const ACTIONS = {
  // --------------------------------------------------------------- CRUD
  createEvent: {
    mutationFn: async (formData) => {
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
    onSuccess: (_data, _vars, _ctx, queryClient) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "host"] });
    },
  },

  updateEventDetails: {
    mutationFn: ({ eventId, eventData }) =>
      updateEventDetailsAPI(eventId, eventData),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  deleteEvent: {
    mutationFn: (eventId) => deleteEventAPI(eventId),
    onSuccess: (_data, _vars, _ctx, queryClient) =>
      invalidateEventList(queryClient),
  },

  bulkDeleteEvents: {
    mutationFn: (eventIds) => bulkDeleteEventsAPI(eventIds),
    onSuccess: (_data, _vars, _ctx, queryClient) =>
      invalidateEventList(queryClient),
  },

  updateEventStep2: {
    mutationFn: ({ eventId, guestList, staffList }) =>
      updateEventStep2API(eventId, { guestList, staffList }),
    onSuccess: (_data, vars, _ctx, queryClient) => {
      invalidateSingleEvent(queryClient, vars?.eventId);
      // Mirror web's `["guests", "events", eventId]` invalidation so any
      // guest-list query under that key refetches.
      if (vars?.eventId) {
        queryClient.invalidateQueries({
          queryKey: ["guests", "events", vars.eventId],
        });
      }
    },
  },

  // -------------------------------------------------------------- Guest
  updateGuestList: {
    mutationFn: ({ eventId, guestData }) =>
      updateGuestListAPI(eventId, guestData),
    onSuccess: (_data, vars, _ctx, queryClient) => {
      if (vars?.eventId) {
        queryClient.invalidateQueries({
          queryKey: ["events", "single-stats", vars.eventId],
        });
      }
    },
  },

  // -------------------------------------------------------------- Staff
  updateStaffList: {
    mutationFn: ({ eventId, staffList }) =>
      updateStaffListAPI(eventId, staffList),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  addStaff: {
    mutationFn: ({ eventId, data }) => addStaffAPI(eventId, data),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  updateStaff: {
    mutationFn: ({ eventId, staffId, data }) =>
      updateStaffAPI(eventId, staffId, data),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  deleteStaff: {
    mutationFn: ({ eventId, staffId }) => deleteStaffAPI(eventId, staffId),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  notifyStaff: {
    mutationFn: async ({ eventId }) => {
      const response = await apiFetch(ENDPOINTS.EVENTS.NOTIFY_STAFF(eventId), {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to notify staff");
      }
      return data;
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  // ----------------------------------------------------------- Settings
  updateInvitationSettings: {
    mutationFn: ({ eventId, settings }) =>
      updateInvitationSettingsAPI(eventId, settings),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  updateLaunchSettings: {
    mutationFn: ({ eventId, launchSettings }) =>
      updateLaunchSettingsAPI(eventId, launchSettings),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  /**
   * Visual-template update wrapper.
   *
   * Backend has no dedicated `/visual-template` endpoint; canonical writes go
   * through `updateInvitationSettings` (multipart). This action narrows the
   * payload to the visual-template-only fields so StepThree can save
   * independently of the messaging step. Backend accepts a `visualTemplateRef`
   * alias that writes through to `event.visualTemplate.templateRef` per the
   * dual-write contract.
   */
  updateVisualTemplate: {
    mutationFn: ({ eventId, visualTemplate, fieldValues, templateImage }) => {
      const settings = {};
      if (visualTemplate !== undefined) settings.visualTemplate = visualTemplate;
      if (fieldValues !== undefined) settings.fieldValues = fieldValues;
      if (
        visualTemplate?.templateRef ||
        visualTemplate?._id ||
        visualTemplate?.id
      ) {
        settings.visualTemplateRef =
          visualTemplate.templateRef ||
          visualTemplate._id ||
          visualTemplate.id;
      }
      if (templateImage !== undefined) settings.templateImage = templateImage;
      return updateInvitationSettingsAPI(eventId, settings);
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  updateTaqnyatTemplate: {
    mutationFn: ({ eventId, taqnyatTemplate, selectedTemplate }) => {
      const ref =
        taqnyatTemplate?.templateRef ||
        taqnyatTemplate?._id ||
        taqnyatTemplate?.id ||
        selectedTemplate?._id ||
        selectedTemplate?.id;
      const settings = {};
      if (selectedTemplate !== undefined) settings.selectedTemplate = selectedTemplate;
      if (ref) settings.taqnyatTemplateRef = ref;
      return updateInvitationSettingsAPI(eventId, settings);
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  /**
   * Messaging + auto-replies + host note update for the unified wizard's
   * StepFive. Dual-writes legacy `attendanceAutoReply` / `absenceAutoReply` /
   * `expectedAttendanceAutoReply` / `note` alongside canonical
   * `guestReplies.*` / `invitationMessage` / `hostNote` so the read paths
   * resolve under either shape until the legacy field is dropped.
   */
  updateMessagingContent: {
    mutationFn: ({ eventId, invitationMessage, guestReplies, hostNote }) => {
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
      return updateInvitationSettingsAPI(eventId, settings);
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  retryLaunch: {
    mutationFn: ({ eventId }) => retryLaunchAPI(eventId),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },
};

export const useEventMutation = (action) => {
  const queryClient = useQueryClient();
  const config = ACTIONS[action];
  if (!config) {
    throw new Error(`Unknown event action: ${action}`);
  }

  return useMutation({
    mutationFn: config.mutationFn,
    onSuccess: (data, vars, ctx) =>
      config.onSuccess?.(data, vars, ctx, queryClient),
  });
};

// =====================================================================
// CONVENIENCE HOOKS
// =====================================================================
// Each calls the factory with a literal action so the action arg is stable
// across renders. Existing imports across the codebase keep working under
// the new path.

// CRUD
export const useCreateEvent = () => useEventMutation("createEvent");
export const useUpdateEvent = () => useEventMutation("updateEventDetails");
export const useDeleteEvent = () => useEventMutation("deleteEvent");
export const useBulkDeleteEvents = () => useEventMutation("bulkDeleteEvents");
export const useUpdateEventStep2 = () => useEventMutation("updateEventStep2");

// Guest (bulk)
export const useUpdateGuestList = () => useEventMutation("updateGuestList");

// Staff
export const useUpdateStaffList = () => useEventMutation("updateStaffList");
export const useAddEventStaff = () => useEventMutation("addStaff");
export const useUpdateEventStaff = () => useEventMutation("updateStaff");
export const useDeleteEventStaff = () => useEventMutation("deleteStaff");
export const useNotifyStaff = () => useEventMutation("notifyStaff");

// Settings / launch
export const useUpdateInvitationSettings = () =>
  useEventMutation("updateInvitationSettings");
export const useUpdateLaunchSettings = () =>
  useEventMutation("updateLaunchSettings");
export const useUpdateVisualTemplate = () =>
  useEventMutation("updateVisualTemplate");
export const useUpdateTaqnyatTemplate = () =>
  useEventMutation("updateTaqnyatTemplate");
export const useUpdateMessagingContent = () =>
  useEventMutation("updateMessagingContent");
export const useRetryLaunch = () => useEventMutation("retryLaunch");

export default useEventMutation;
