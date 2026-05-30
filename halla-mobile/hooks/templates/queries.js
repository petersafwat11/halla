import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { fontsKeys, templateCategoriesKeys, templatesKeys } from "./keys";

const buildQuery = (params = {}) => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  );
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : "";
};

const request = async (path, options = {}) => {
  const res = await apiFetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

export function useHostTemplates({ category } = {}) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: templatesKeys.hostList(category),
    queryFn: () =>
      request(
        `${ENDPOINTS.TEMPLATES.LIST}${buildQuery(category ? { category } : {})}`
      ),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: templateCategoriesKeys.public(),
    queryFn: () => request(ENDPOINTS.TEMPLATES.CATEGORIES),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFonts() {
  return useQuery({
    queryKey: fontsKeys.all,
    queryFn: () => request(ENDPOINTS.FONTS.LIST),
    staleTime: Infinity,
  });
}
