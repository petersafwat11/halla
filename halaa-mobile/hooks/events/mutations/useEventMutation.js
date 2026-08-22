import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ENDPOINTS } from "../../../config/api";
import { apiFetch } from "../../../services/http";
import { eventsKeys } from "../keys";
import { dashboardKeys } from "../../dashboard/keys";
import { subscriptionInfoKeys } from "../../users/keys";

/**
 * Unified event mutation factory. Config-map driven hook.
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
 * `hooks/messaging/` and hit the `/messaging` mount. Staff-access-token
 * lifecycle (`useRevokeStaffAccess`) lives in `hooks/staff/`.
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

// Same as `invalidateSingleEvent` but also refreshes the per-event guest list
// (`["guests","events",eventId]`, what `useEventGuests` renders). Pool-charged
// sends (resend invite / extra reminder) mutate per-guest invitation state, so
// the guest list must refetch — invalidating only `["events"]` leaves it stale.
const invalidateSingleEventAndGuests = (queryClient, eventId) => {
  invalidateSingleEvent(queryClient, eventId);
  if (eventId) {
    queryClient.invalidateQueries({
      queryKey: ["guests", "events", eventId],
    });
  }
};

const jsonRequest = async (path, options = {}) => {
  const fetchOpts = {
    method: options.method || "GET",
    headers: options.headers || {},
  };
  if (options.body !== undefined && options.body !== null) {
    fetchOpts.body =
      typeof options.body === "string" ? JSON.parse(options.body) : options.body;
  }
  const res = await apiFetch(path, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Preserve the backend error `code` + HTTP `status` on the thrown Error so
    // callers can map specific codes (INSUFFICIENT_INVITES, NO_REMINDER_TEMPLATE,
    // SCHEDULE_TOO_SOON, …) instead of falling through to a generic message.
    const err = new Error(data.message || "API request failed");
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
};

const newIdempotencyKey = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const _updateEventDetails = (eventId, eventDetails) => {
  if (!eventId) throw new Error("Event ID is required");
  return jsonRequest(ENDPOINTS.EVENTS.UPDATE_DETAILS(eventId), {
    method: "PATCH",
    body: eventDetails,
  });
};

const _deleteEvent = async (eventId) => {
  await jsonRequest(ENDPOINTS.EVENTS.DELETE(eventId), { method: "DELETE" });
};

const _bulkDeleteEvents = (eventIds) => {
  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new Error("Event IDs array is required");
  }
  if (eventIds.length > 100) {
    throw new Error("Cannot delete more than 100 events at once");
  }
  return jsonRequest(ENDPOINTS.EVENTS.BULK_DELETE, {
    method: "POST",
    body: { eventIds },
  });
};

const _updateEventStep2 = async (eventId, payload) => {
  const data = await jsonRequest(ENDPOINTS.EVENTS.UPDATE_STEP2(eventId), {
    method: "PATCH",
    body: {
      guestList: Array.isArray(payload?.guestList) ? payload.guestList : [],
      staffList: Array.isArray(payload?.staffList) ? payload.staffList : [],
    },
  });
  return data?.data?.event;
};

const _updateGuestList = async (eventId, guestList, staffList = null) => {
  const body = { guestList };
  if (staffList) body.staffList = staffList;
  const data = await jsonRequest(ENDPOINTS.EVENTS.UPDATE_GUEST_LIST(eventId), {
    method: "PATCH",
    body,
  });
  return data?.data?.event;
};

const _updateStaffList = async (eventId, staffList) => {
  const data = await jsonRequest(ENDPOINTS.EVENTS.UPDATE_STAFF_LIST(eventId), {
    method: "PATCH",
    body: { staffList },
  });
  return data?.data?.event;
};

const _addStaff = async (eventId, staffData) => {
  const data = await jsonRequest(ENDPOINTS.EVENTS.ADD_STAFF(eventId), {
    method: "POST",
    body: staffData,
  });
  return data?.data?.staff;
};

const _updateStaff = async (eventId, staffId, staffData) => {
  const data = await jsonRequest(ENDPOINTS.EVENTS.UPDATE_STAFF(eventId, staffId), {
    method: "PUT",
    body: staffData,
  });
  return data?.data?.staff;
};

const _deleteStaff = async (eventId, staffId) => {
  await jsonRequest(ENDPOINTS.EVENTS.DELETE_STAFF(eventId, staffId), {
    method: "DELETE",
  });
};

/**
 * Update invitation settings. Backend expects multipart/form-data
 * (uploadTemplateImage middleware); apiFetch detects FormData and skips JSON
 * serialization (Content-Type set by fetch boundary).
 */
const _updateInvitationSettings = async (eventId, invitationSettings) => {
  const formData = new FormData();
  const { templateImage, ...restSettings } = invitationSettings;

  Object.entries(restSettings).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    }
  });

  if (templateImage && typeof templateImage === "object" && templateImage.uri) {
    formData.append("templateImage", {
      uri: templateImage.uri,
      type: templateImage.type || "image/jpeg",
      name: templateImage.fileName || "template.jpg",
    });
  }

  const response = await apiFetch(ENDPOINTS.EVENTS.UPDATE_INVITATION(eventId), {
    method: "PATCH",
    body: formData,
    timeoutMs: 60 * 1000,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to update invitation settings");
  }
  return data?.data?.event;
};

const _updateLaunchSettings = (eventId, launchSettings) => {
  if (!eventId) throw new Error("Event ID is required");
  return jsonRequest(ENDPOINTS.EVENTS.UPDATE_LAUNCH(eventId), {
    method: "PATCH",
    body: launchSettings,
  });
};

/**
 * Manually retry a failed event launch. RBAC enforced server-side. Per-click
 * idempotency key protects against double-tap.
 */
const _retryLaunch = async (eventId) => {
  const idempotencyKey = newIdempotencyKey(`retry-${eventId}`);
  const data = await jsonRequest(ENDPOINTS.EVENTS.RETRY_LAUNCH(eventId), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data?.data || data;
};

const _updateReminderSettings = (eventId, reminderSettings) => {
  if (!eventId) throw new Error("Event ID is required");
  return jsonRequest(ENDPOINTS.EVENTS.UPDATE_REMINDER_SETTINGS(eventId), {
    method: "PATCH",
    body: reminderSettings,
  });
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
      queryClient.invalidateQueries({ queryKey: eventsKeys.userStats() });
      queryClient.invalidateQueries({ queryKey: eventsKeys.stats() });
      queryClient.invalidateQueries({ queryKey: subscriptionInfoKeys.eventInfo() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.host() });
    },
  },

  updateEventDetails: {
    mutationFn: ({ eventId, eventData }) => _updateEventDetails(eventId, eventData),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  deleteEvent: {
    mutationFn: (eventId) => _deleteEvent(eventId),
    onSuccess: (_data, _vars, _ctx, queryClient) =>
      invalidateEventList(queryClient),
  },

  bulkDeleteEvents: {
    mutationFn: (eventIds) => _bulkDeleteEvents(eventIds),
    onSuccess: (_data, _vars, _ctx, queryClient) =>
      invalidateEventList(queryClient),
  },

  updateEventStep2: {
    mutationFn: ({ eventId, guestList, staffList }) =>
      _updateEventStep2(eventId, { guestList, staffList }),
    onSuccess: (_data, vars, _ctx, queryClient) => {
      invalidateSingleEvent(queryClient, vars?.eventId);
      // Invalidate `["guests", "events", eventId]` so any guest-list query
      // under that key refetches.
      if (vars?.eventId) {
        queryClient.invalidateQueries({
          queryKey: ["guests", "events", vars.eventId],
        });
      }
    },
  },

  // -------------------------------------------------------------- Guest
  updateGuestList: {
    mutationFn: ({ eventId, guestData }) => _updateGuestList(eventId, guestData),
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
    mutationFn: ({ eventId, staffList }) => _updateStaffList(eventId, staffList),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  addStaff: {
    mutationFn: ({ eventId, data }) => _addStaff(eventId, data),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  updateStaff: {
    mutationFn: ({ eventId, staffId, data }) => _updateStaff(eventId, staffId, data),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  deleteStaff: {
    mutationFn: ({ eventId, staffId }) => _deleteStaff(eventId, staffId),
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
    mutationFn: ({ eventId, settings }) => _updateInvitationSettings(eventId, settings),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  updateLaunchSettings: {
    mutationFn: ({ eventId, launchSettings }) =>
      _updateLaunchSettings(eventId, launchSettings),
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
      if (visualTemplate !== undefined && visualTemplate !== null) {
        const templateRef =
          visualTemplate.templateRef ||
          visualTemplate._id ||
          visualTemplate.id;
        settings.visualTemplate = visualTemplate.isCustomUpload
          ? { isCustomUpload: true, fieldValues: {} }
          : {
              templateRef,
              fieldValues:
                fieldValues ||
                visualTemplate.fieldValues ||
                visualTemplate.data ||
                {},
              isCustomUpload: false,
            };
      }
      if (templateImage !== undefined) settings.templateImage = templateImage;
      return _updateInvitationSettings(eventId, settings);
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  updateTaqnyatTemplate: {
    mutationFn: ({ eventId, taqnyatTemplate, selectedTemplate, guestReplies, invitationType }) => {
      const ref =
        taqnyatTemplate?.templateRef ||
        taqnyatTemplate?._id ||
        taqnyatTemplate?.id ||
        selectedTemplate?._id ||
        selectedTemplate?.id;
      const settings = {};
      if (ref) {
        settings.taqnyatTemplate = { templateRef: ref };
      }
      // Step 4 also carries the auto-reply text + the invitation type. These
      // MUST be forwarded here — previously the mutation destructured only the
      // template, so guestReplies edits on the update wizard were silently
      // dropped (the success toast fired but nothing was saved).
      if (guestReplies && typeof guestReplies === "object") {
        settings.guestReplies = guestReplies;
      }
      if (invitationType !== undefined) settings.invitationType = invitationType;
      return _updateInvitationSettings(eventId, settings);
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  /**
   * Messaging + auto-replies + host note update for the unified wizard's
   * StepFive. Dual-writes legacy `attendanceAutoReply` / `absenceAutoReply` /
   * `note` alongside canonical
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
      }
      return _updateInvitationSettings(eventId, settings);
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  retryLaunch: {
    mutationFn: ({ eventId }) => _retryLaunch(eventId),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  updateReminderSettings: {
    mutationFn: ({ eventId, data }) => _updateReminderSettings(eventId, data),
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEvent(queryClient, vars?.eventId),
  },

  // Resend invite — pool-charged, REPEATABLE, no gates. Targets the
  // non-responder audience; pass `guestIds` to scope the send to a
  // specific selection (else the backend defaults to all non-responders).
  // Server charges the host's invite pool and 402s INSUFFICIENT_INVITES when
  // the selection exceeds remaining invites.
  resendInvite: {
    mutationFn: async ({ eventId, channel, guestIds }) => {
      // Channel follows the event template server-side unless explicitly forced.
      const body = {};
      if (channel) body.channel = channel;
      if (Array.isArray(guestIds) && guestIds.length > 0) {
        body.guestIds = guestIds;
      }
      const response = await apiFetch(ENDPOINTS.EVENTS.RESEND_INVITE(eventId), {
        method: "POST",
        body,
        headers: { "Idempotency-Key": newIdempotencyKey(`resend-${eventId}`) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data.message || "Failed to resend invitations");
        err.code = data.code;
        err.status = response.status;
        throw err;
      }
      return data;
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEventAndGuests(queryClient, vars?.eventId),
  },

  // Extra reminder — pool-charged, immediate, CONFIRMED guests only, using the
  // approved `reminder_confirmed` template. Pass `guestIds` to scope the send.
  // Server 402s INSUFFICIENT_INVITES and 400s NO_REMINDER_TEMPLATE.
  extraReminder: {
    mutationFn: async ({ eventId, guestIds }) => {
      const body = {};
      if (Array.isArray(guestIds) && guestIds.length > 0) {
        body.guestIds = guestIds;
      }
      const response = await apiFetch(ENDPOINTS.EVENTS.EXTRA_REMINDER(eventId), {
        method: "POST",
        body,
        headers: { "Idempotency-Key": newIdempotencyKey(`extra-reminder-${eventId}`) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data.message || "Failed to send extra reminder");
        err.code = data.code;
        err.status = response.status;
        throw err;
      }
      return data;
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEventAndGuests(queryClient, vars?.eventId),
  },

  // Send to new guests — initial pool-charged send to never-sent guests
  // (added after launch). Channel resolved server-side (follows the event
  // template). Pass `guestIds` to scope; server 402s INSUFFICIENT_INVITES and
  // 403s when the event's plan has expired.
  sendNewGuests: {
    mutationFn: async ({ eventId, guestIds, channel }) => {
      const body = {};
      if (channel) body.channel = channel;
      if (Array.isArray(guestIds) && guestIds.length > 0) {
        body.guestIds = guestIds;
      }
      const response = await apiFetch(ENDPOINTS.EVENTS.SEND_NEW_GUESTS(eventId), {
        method: "POST",
        body,
        headers: { "Idempotency-Key": newIdempotencyKey(`send-new-${eventId}`) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data.message || "Failed to send to new guests");
        err.code = data.code;
        err.status = response.status;
        throw err;
      }
      return data;
    },
    onSuccess: (_data, vars, _ctx, queryClient) =>
      invalidateSingleEventAndGuests(queryClient, vars?.eventId),
  },

  /**
   * Export events to XLSX. Returns `{ success, blob, filename }` — the caller
   * hands the blob to `saveBlobAndShare`. Listed as a mutation (not query)
   * because each invocation is a one-shot download triggered by user action.
   */
  exportEvents: {
    mutationFn: async () => {
      const response = await apiFetch(ENDPOINTS.EVENTS.EXPORT_EVENTS, {
        method: "GET",
        timeoutMs: 60 * 1000,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to export events");
      }
      const blob = await response.blob();
      return { success: true, blob, filename: "events-export.xlsx" };
    },
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
// across renders.

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
export const useUpdateReminderSettings = () =>
  useEventMutation("updateReminderSettings");
// Pool-charged, repeatable resend to non-responders (optional guestIds).
export const useResendInvite = () => useEventMutation("resendInvite");
// Pool-charged extra reminder to CONFIRMED guests (optional guestIds).
export const useExtraReminder = () => useEventMutation("extraReminder");
// Pool-charged initial send to NEW guests added after launch (optional guestIds).
export const useSendNewGuests = () => useEventMutation("sendNewGuests");

// Exports
export const useExportEvents = () => useEventMutation("exportEvents");

export default useEventMutation;
