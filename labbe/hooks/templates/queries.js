"use client";
import { useQuery } from "@tanstack/react-query";
import { templatesService } from "@/services/templatesService";
import { templatesKeys, templateCategoriesKeys, fontsKeys } from "./keys";

export function useHostTemplates({ category } = {}) {
  return useQuery({
    queryKey: templatesKeys.hostList(category),
    queryFn: () => templatesService.getTemplates({ category }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminTemplates(params = {}) {
  return useQuery({
    queryKey: templatesKeys.adminList(params),
    queryFn: () => templatesService.adminListTemplates(params),
  });
}

export function useTemplate(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: templatesKeys.detail(id),
    queryFn: () => templatesService.adminGetTemplate(id),
    enabled: !!id && enabled,
  });
}

export function useTemplateCategories({ admin = false } = {}) {
  return useQuery({
    queryKey: admin ? templateCategoriesKeys.admin() : templateCategoriesKeys.public(),
    queryFn: () =>
      admin ? templatesService.adminListCategories() : templatesService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFonts() {
  return useQuery({
    queryKey: fontsKeys.all,
    queryFn: () => templatesService.getFonts(),
    staleTime: Infinity,
  });
}
