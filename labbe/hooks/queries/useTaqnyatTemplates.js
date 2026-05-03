"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taqnyatTemplatesService } from "@/services/taqnyatTemplatesService";

export const TAQNYAT_TEMPLATES_QK = {
  hostList: (category) => ["taqnyat-templates", "host", category || "all"],
  adminList: ["taqnyat-templates", "admin"],
};

export function useHostTaqnyatTemplates({ category } = {}, opts = {}) {
  return useQuery({
    queryKey: TAQNYAT_TEMPLATES_QK.hostList(category),
    queryFn: () => taqnyatTemplatesService.getTemplates({ category }),
    staleTime: 5 * 60 * 1000,
    ...opts,
  });
}

export function useAdminTaqnyatTemplates() {
  return useQuery({
    queryKey: TAQNYAT_TEMPLATES_QK.adminList,
    queryFn: () => taqnyatTemplatesService.adminList(),
  });
}

export function useSyncTaqnyat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taqnyatTemplatesService.adminSync(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taqnyat-templates"] }),
  });
}

export function useAssignTaqnyat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => taqnyatTemplatesService.adminAssign(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taqnyat-templates"] }),
  });
}
