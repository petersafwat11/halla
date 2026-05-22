import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addStaff,
  updateStaff,
  deleteStaff,
} from "../../services/eventsService.staff";

const _invalidate = (queryClient, eventId) => {
  queryClient.invalidateQueries({ queryKey: ["events"] });
  if (eventId) {
    queryClient.invalidateQueries({ queryKey: ["events", "single-stats", eventId] });
  }
};

export function useAddEventStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }) => addStaff(eventId, data),
    onSuccess: (_d, vars) => _invalidate(queryClient, vars?.eventId),
  });
}

export function useUpdateEventStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, staffId, data }) => updateStaff(eventId, staffId, data),
    onSuccess: (_d, vars) => _invalidate(queryClient, vars?.eventId),
  });
}

export function useDeleteEventStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, staffId }) => deleteStaff(eventId, staffId),
    onSuccess: (_d, vars) => _invalidate(queryClient, vars?.eventId),
  });
}
