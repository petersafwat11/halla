"use client";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { templatesKeys, templateCategoriesKeys, fontsKeys } from "./keys";

export function useHostTemplates({ category } = {}) {
  return useQuery({
    queryKey: templatesKeys.hostList(category),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.templates.list,
        params: category ? { category } : undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminTemplates(params = {}) {
  return useQuery({
    queryKey: templatesKeys.adminList(params),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.templates.adminList,
        params,
      }),
  });
}

export function useTemplate(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: templatesKeys.detail(id),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.templates.adminGetById(id),
      }),
    enabled: !!id && enabled,
  });
}

export function useTemplateCategories({ admin = false } = {}) {
  return useQuery({
    queryKey: admin ? templateCategoriesKeys.admin() : templateCategoriesKeys.public(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: admin
          ? API_PATHS.templates.adminCategories
          : API_PATHS.templates.categories,
      }),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFonts() {
  return useQuery({
    queryKey: fontsKeys.all,
    queryFn: () =>
      apiRequest({ method: "GET", path: API_PATHS.templates.fonts }),
    staleTime: Infinity,
  });
}
