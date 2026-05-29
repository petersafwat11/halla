"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taqnyatTemplatesService } from "@/services/taqnyatTemplatesService";
import { taqnyatTemplatesKeys } from "./keys";

export function useSyncTaqnyat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taqnyatTemplatesService.adminSync(),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}

export function useAssignTaqnyat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => taqnyatTemplatesService.adminAssign(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}

export function useCreateTaqnyatTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => taqnyatTemplatesService.adminCreate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}

export function useDeleteTaqnyatTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => taqnyatTemplatesService.adminDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: taqnyatTemplatesKeys.all }),
  });
}
