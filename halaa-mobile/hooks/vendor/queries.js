import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { usersApi } from "../users/_api";
import { vendorApi } from "./_api";
import { vendorKeys } from "./keys";

export function useVendorProfile() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: vendorKeys.profile(),
    queryFn: async () => {
      const response = await usersApi.getProfile();
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
      const response = await vendorApi.getStats();
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
      const response = await vendorApi.getServices();
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
      const response = await vendorApi.getTickets(params);
      return response.data || [];
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}
