import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { useAuthStore } from "../../stores/authStore";
import { addonsKeys } from "./keys";

const _addonsRequest = async (endpoint, options = {}) => {
  const response = await apiFetch(endpoint, {
    method: options.method || "GET",
    body: options.body,
    headers: options.headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

export { _addonsRequest as addonsRequest };

export const useAvailableAddons = (options = {}) => {
  return useQuery({
    queryKey: addonsKeys.catalog(),
    queryFn: () => _addonsRequest(ENDPOINTS.ADDONS.CATALOG),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    ...options,
  });
};

export const useMyAddons = (params = {}, options = {}) => {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: addonsKeys.my(params),
    queryFn: () => {
      const qs = Object.keys(params).length
        ? `?${new URLSearchParams(params).toString()}`
        : "";
      return _addonsRequest(`${ENDPOINTS.ADDONS.MY}${qs}`);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
    ...options,
  });
};

export const useAdminFulfillment = (params = {}, options = {}) => {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: addonsKeys.adminFulfillment(params),
    queryFn: () => {
      const qs = Object.keys(params).length
        ? `?${new URLSearchParams(params).toString()}`
        : "";
      return _addonsRequest(`${ENDPOINTS.ADDONS.ADMIN_FULFILLMENT}${qs}`);
    },
    staleTime: 30 * 1000,
    enabled: !!token,
    ...options,
  });
};
