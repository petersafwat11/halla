"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { plansKeys } from "./keys";

export const usePlans = (options = {}) => {
  return useQuery({
    queryKey: plansKeys.list(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getPlans,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useHostPlans = (options = {}) => {
  return useQuery({
    queryKey: plansKeys.host(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.getHostPlans,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Landing page plans (host + business combined). Public — no auth required.
 */
export const useLandingPlans = (options = {}) => {
  return useQuery({
    queryKey: plansKeys.landing(),
    queryFn: () => apiRequest({ method: "GET", path: API_PATHS.plans.getLandingPlans }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useBusinessPlans = (options = {}) => {
  return useQuery({
    queryKey: plansKeys.business(),
    queryFn: () => apiRequest({ method: "GET", path: API_PATHS.plans.getBusinessPlans }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
