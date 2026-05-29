import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { templateService } from "../../services/templateService";
import { templatesKeys, templateCategoriesKeys, fontsKeys } from "./keys";

export function useHostTemplates({ category } = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: templatesKeys.hostList(category),
    queryFn: () =>
      templateService.getTemplates(category ? { category } : {}),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: templateCategoriesKeys.public(),
    queryFn: () => templateService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFonts() {
  return useQuery({
    queryKey: fontsKeys.all,
    queryFn: () => templateService.getFonts(),
    staleTime: Infinity,
  });
}
