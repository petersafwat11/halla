import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { plansKeys } from "./keys";

const _plansRequest = async (endpoint) => {
  const response = await apiFetch(endpoint, { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.data = data;
    error.field = data.field;
    throw error;
  }
  return data;
};

export function usePlans() {
  return useQuery({
    queryKey: plansKeys.list(),
    queryFn: () => _plansRequest(ENDPOINTS.PLANS.ALL),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHostPlans() {
  return useQuery({
    queryKey: plansKeys.host(),
    queryFn: () => _plansRequest(ENDPOINTS.PLANS.HOST_PLANS),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBusinessPlans() {
  return useQuery({
    queryKey: plansKeys.business(),
    queryFn: () => _plansRequest(ENDPOINTS.PLANS.BUSINESS),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanByCode(code) {
  return useQuery({
    queryKey: plansKeys.byCode(code),
    queryFn: () => _plansRequest(ENDPOINTS.PLANS.BY_CODE(code)),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanById(id) {
  return useQuery({
    queryKey: plansKeys.byId(id),
    queryFn: () => _plansRequest(ENDPOINTS.PLANS.BY_ID(id)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
