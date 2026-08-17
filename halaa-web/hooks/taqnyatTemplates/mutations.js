"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { taqnyatTemplatesKeys } from "./keys";

export function useSyncTaqnyat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest({ method: "POST", path: API_PATHS.taqnyatTemplates.adminSync }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}

export function useAssignTaqnyat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      apiRequest({
        method: "PATCH",
        path: API_PATHS.taqnyatTemplates.adminAssign(id),
        data: body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}

export function useCreateTaqnyatTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiRequest({
        method: "POST",
        path: API_PATHS.taqnyatTemplates.adminCreate,
        data: body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}

export function useDeleteTaqnyatTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest({
        method: "DELETE",
        path: API_PATHS.taqnyatTemplates.adminDelete(id),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}
