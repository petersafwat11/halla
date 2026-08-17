"use client";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { taqnyatTemplatesKeys } from "./keys";

export function useHostTaqnyatTemplates({ category, type, invitationMode } = {}, opts = {}) {
  return useQuery({
    queryKey: taqnyatTemplatesKeys.hostList({ category, type, invitationMode }),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.taqnyatTemplates.list,
        params: { category, type, invitationMode },
      }),
    staleTime: 5 * 60 * 1000,
    ...opts,
  });
}

export function useAdminTaqnyatTemplates(params = {}) {
  return useQuery({
    queryKey: taqnyatTemplatesKeys.adminList(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.taqnyatTemplates.adminList,
        params,
      }),
  });
}
