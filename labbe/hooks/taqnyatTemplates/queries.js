"use client";
import { useQuery } from "@tanstack/react-query";
import { taqnyatTemplatesService } from "@/services/taqnyatTemplatesService";
import { taqnyatTemplatesKeys } from "./keys";

export function useHostTaqnyatTemplates({ category, type } = {}, opts = {}) {
  return useQuery({
    queryKey: taqnyatTemplatesKeys.hostList({ category, type }),
    queryFn: () => taqnyatTemplatesService.getTemplates({ category, type }),
    staleTime: 5 * 60 * 1000,
    ...opts,
  });
}

export function useAdminTaqnyatTemplates() {
  return useQuery({
    queryKey: taqnyatTemplatesKeys.adminList(),
    queryFn: () => taqnyatTemplatesService.adminList(),
  });
}
