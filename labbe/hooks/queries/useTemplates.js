"use client";
import { useQuery } from "@tanstack/react-query";
import { templatesService } from "@/services/templatesService";

export const TEMPLATES_QK = {
  hostList: (category) => ["templates", "host", category || "all"],
  adminList: (params) => ["templates", "admin", params || {}],
  byId: (id) => ["templates", id],
  categoriesPublic: ["template-categories", "public"],
  categoriesAdmin: ["template-categories", "admin"],
  fonts: ["fonts"],
};

export function useHostTemplates({ category } = {}) {
  return useQuery({
    queryKey: TEMPLATES_QK.hostList(category),
    queryFn: () => templatesService.getTemplates({ category }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminTemplates(params = {}) {
  return useQuery({
    queryKey: TEMPLATES_QK.adminList(params),
    queryFn: () => templatesService.adminListTemplates(params),
  });
}

export function useTemplate(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: TEMPLATES_QK.byId(id),
    queryFn: () => templatesService.adminGetTemplate(id),
    enabled: !!id && enabled,
  });
}

export function useTemplateCategories({ admin = false } = {}) {
  return useQuery({
    queryKey: admin ? TEMPLATES_QK.categoriesAdmin : TEMPLATES_QK.categoriesPublic,
    queryFn: () =>
      admin ? templatesService.adminListCategories() : templatesService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFonts() {
  return useQuery({
    queryKey: TEMPLATES_QK.fonts,
    queryFn: () => templatesService.getFonts(),
    staleTime: Infinity,
  });
}
