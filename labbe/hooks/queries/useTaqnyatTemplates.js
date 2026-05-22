"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taqnyatTemplatesService } from "@/services/taqnyatTemplatesService";

export const TAQNYAT_TEMPLATES_QK = {
  hostList: ({ category, type } = {}) => [
    "taqnyat-templates",
    "host",
    category || "all",
    type || "all",
  ],
  adminList: ["taqnyat-templates", "admin"],
};

export function useHostTaqnyatTemplates({ category, type } = {}, opts = {}) {
  return useQuery({
    queryKey: TAQNYAT_TEMPLATES_QK.hostList({ category, type }),
    queryFn: () => taqnyatTemplatesService.getTemplates({ category, type }),
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

export function useCreateTaqnyatTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => taqnyatTemplatesService.adminCreate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taqnyat-templates"] }),
  });
}

export function useDeleteTaqnyatTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => taqnyatTemplatesService.adminDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taqnyat-templates"] }),
  });
}
