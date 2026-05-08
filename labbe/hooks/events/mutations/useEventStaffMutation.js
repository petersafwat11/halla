"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { buildMutationOptions } from "./_shared";

// Action keys handled by this sub-mutation.
export const STAFF_ACTIONS = [
  "addStaff",
  "updateStaff",
  "deleteStaff",
  "updateStaffStatus",
  "updateStaffList",
  "notifyStaff",
];

const buildMutations = (queryClient) => ({
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
});

export const useEventStaffMutation = (action) => {
  const queryClient = useQueryClient();
  const mutationConfig = buildMutations(queryClient)[action];
  if (!mutationConfig) {
    throw new Error(`Unknown event staff action: ${action}`);
  }
  return useMutation(buildMutationOptions(mutationConfig));
};

export default useEventStaffMutation;
