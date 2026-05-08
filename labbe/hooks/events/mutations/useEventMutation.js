"use client";

// Thin façade over the four focused event-mutation sub-hooks.
//
// Action routing: each action key lives in exactly one sub-hook
// (CRUD / Guest / Staff / Settings). The factory looks up the owning
// sub-hook by action and delegates. Convenience hooks below call the
// sub-hook directly with a literal action so the action arg stays stable
// across renders and the rules-of-hooks contract is preserved.

import {
  useEventCrudMutation,
  CRUD_ACTIONS,
} from "./useEventCrudMutation";
import {
  useEventGuestMutation,
  GUEST_ACTIONS,
} from "./useEventGuestMutation";
import {
  useEventStaffMutation,
  STAFF_ACTIONS,
} from "./useEventStaffMutation";
import {
  useEventSettingsMutation,
  SETTINGS_ACTIONS,
} from "./useEventSettingsMutation";

// Action → owning sub-hook. Built once at module load.
const ACTION_GROUPS = {};
for (const a of CRUD_ACTIONS) ACTION_GROUPS[a] = "crud";
for (const a of GUEST_ACTIONS) ACTION_GROUPS[a] = "guest";
for (const a of STAFF_ACTIONS) ACTION_GROUPS[a] = "staff";
for (const a of SETTINGS_ACTIONS) ACTION_GROUPS[a] = "settings";

/**
 * Unified event mutation factory. Dispatches to the right sub-hook based
 * on `action`. Callers must keep `action` stable across renders (same
 * contract as before — each call-site uses a literal action key, so this
 * is automatic for the convenience hooks below).
 *
 * @param {string} action - The event action to perform.
 * @returns {import("@tanstack/react-query").UseMutationResult}
 */
export const useEventMutation = (action) => {
  const group = ACTION_GROUPS[action];
  if (!group) {
    throw new Error(`Unknown event action: ${action}`);
  }
  switch (group) {
    case "crud":
      return useEventCrudMutation(action);
    case "guest":
      return useEventGuestMutation(action);
    case "staff":
      return useEventStaffMutation(action);
    case "settings":
      return useEventSettingsMutation(action);
    default:
      // Unreachable — ACTION_GROUPS only contains the four group names.
      throw new Error(`Unhandled event action group: ${group}`);
  }
};

// ============================================
// CONVENIENCE HOOKS
// ============================================
// Each convenience hook calls its owning sub-hook directly with a literal
// action. Existing imports across the codebase keep working unchanged.

// CRUD
export const useCreateEvent = () => useEventCrudMutation("createEvent");
export const useDeleteEvent = () => useEventCrudMutation("deleteEvent");
export const useBulkDeleteEvents = () => useEventCrudMutation("bulkDeleteEvents");

// Guest
export const useUpdateGuestList = () => useEventGuestMutation("updateGuestList");

// Staff
export const useUpdateStaffList = () => useEventStaffMutation("updateStaffList");
export const useAddStaff = () => useEventStaffMutation("addStaff");
export const useUpdateStaff = () => useEventStaffMutation("updateStaff");
export const useUpdateStaffStatus = () => useEventStaffMutation("updateStaffStatus");
export const useDeleteStaff = () => useEventStaffMutation("deleteStaff");
export const useNotifyStaff = () => useEventStaffMutation("notifyStaff");

// Settings / wizard / launch
export const useUpdateEventDetails = () => useEventSettingsMutation("updateEventDetails");
// Single mutation hook for the unified update wizard's step 2 atomic dispatch.
export const useUpdateEventStep2 = () => useEventSettingsMutation("updateEventStep2");
export const useUpdateInvitationSettings = () => useEventSettingsMutation("updateInvitationSettings");
export const useUpdateLaunchSettings = () => useEventSettingsMutation("updateLaunchSettings");
// Manually retry a failed event launch.
export const useRetryLaunch = () => useEventSettingsMutation("retryLaunch");

export default useEventMutation;
