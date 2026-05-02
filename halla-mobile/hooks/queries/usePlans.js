import { useQuery } from '@tanstack/react-query';
import plansService from '../../services/plansService';

/**
 * Hook to fetch all active plans
 * GET /plans
 */
export function usePlans() {
  return useQuery({
    queryKey: ['plans', 'all'],
    queryFn: async () => {
      const response = await plansService.getPlans();
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch host plans
 * GET /plans/host
 */
export function useHostPlans() {
  return useQuery({
    queryKey: ['plans', 'host'],
    queryFn: async () => {
      const response = await plansService.getHostPlans();
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch enterprise plans
 * GET /plans/enterprise
 */
export function useEnterprisePlans() {
  return useQuery({
    queryKey: ['plans', 'enterprise'],
    queryFn: async () => {
      const response = await plansService.getEnterprisePlans();
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a plan by code
 * GET /plans/code/:code
 */
export function usePlanByCode(code) {
  return useQuery({
    queryKey: ['plans', 'code', code],
    queryFn: async () => {
      const response = await plansService.getPlanByCode(code);
      return response;
    },
    enabled: !!code,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a plan by ID
 * GET /plans/:id
 */
export function usePlanById(id) {
  return useQuery({
    queryKey: ['plans', id],
    queryFn: async () => {
      const response = await plansService.getPlanById(id);
      return response;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}
