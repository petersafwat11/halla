import { useQuery } from "@tanstack/react-query";
import plansService from "../../services/plansService";
import { plansKeys } from "./keys";

export function usePlans() {
  return useQuery({
    queryKey: plansKeys.list(),
    queryFn: () => plansService.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHostPlans() {
  return useQuery({
    queryKey: plansKeys.host(),
    queryFn: () => plansService.getHostPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBusinessPlans() {
  return useQuery({
    queryKey: plansKeys.business(),
    queryFn: () => plansService.getBusinessPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanByCode(code) {
  return useQuery({
    queryKey: plansKeys.byCode(code),
    queryFn: () => plansService.getPlanByCode(code),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanById(id) {
  return useQuery({
    queryKey: plansKeys.byId(id),
    queryFn: () => plansService.getPlanById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
