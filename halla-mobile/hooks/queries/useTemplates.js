import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { templateService } from "../../services/templateService";

export const TEMPLATES_QK = {
  hostList: (category) => ["templates", "host", category || "all"],
  categoriesPublic: ["template-categories", "public"],
  fonts: ["fonts"],
};

export function useHostTemplates({ category } = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: TEMPLATES_QK.hostList(category),
    queryFn: () =>
      templateService.getTemplates(category ? { category } : {}),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: TEMPLATES_QK.categoriesPublic,
    queryFn: () => templateService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFonts() {
  return useQuery({
    queryKey: TEMPLATES_QK.fonts,
    queryFn: () => templateService.getFonts(),
    staleTime: Infinity,
  });
}
