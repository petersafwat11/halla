import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import vendorService from "../../services/vendorService";
import { vendorKeys } from "./keys";

export function useVendorProfile() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: vendorKeys.profile(),
    queryFn: async () => {
      const response = await vendorService.getProfile();
      return response.data?.user || response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVendorStats() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: vendorKeys.stats(),
    queryFn: async () => {
      const response = await vendorService.getStats();
      return response.data?.stats || {};
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

export function useVendorServices() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: vendorKeys.services(),
    queryFn: async () => {
      const response = await vendorService.getServices();
      return response.data || [];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVendorTickets(params = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: vendorKeys.tickets(params),
    queryFn: async () => {
      const response = await vendorService.getTickets(params);
      return response.data || [];
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}
