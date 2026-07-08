"use client";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { taqnyatTemplatesKeys } from "./keys";

export function useHostTaqnyatTemplates({ category, type } = {}, opts = {}) {
  return useQuery({
    queryKey: taqnyatTemplatesKeys.hostList({ category, type }),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.taqnyatTemplates.list,
        params: { category, type },
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
