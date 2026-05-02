import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import vendorService from '../../services/vendorService';

/**
 * Hook to fetch vendor profile
 * @returns {Object} Query result with vendor profile data
 */
export function useVendorProfile() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: async () => {
      const response = await vendorService.getProfile();
      // response = { success, status, data: { user: {...} } }
      return response.data?.user || response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch vendor dashboard statistics
 * @returns {Object} Query result with stats: { totalServices, activeServices, avgRating, ... }
 */
export function useVendorStats() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['vendor', 'stats'],
    queryFn: async () => {
      const response = await vendorService.getStats();
      // response = { success, status, data: { stats: {...} } }
      return response.data?.stats || response.data;
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook to fetch vendor services
 * @returns {Object} Query result with services array
 */
export function useVendorServices() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['vendor', 'services'],
    queryFn: async () => {
      const response = await vendorService.getServices();
      // sendPaginated: response = { success, status, data: [...], pagination: {...} }
      return response.data || [];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch vendor orders/bookings
 * @param {Object} params - Optional filter parameters (e.g. { limit: 10 })
 * @returns {Object} Query result with orders array
 */
export function useVendorOrders(params = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['vendor', 'orders', params],
    queryFn: async () => {
      const response = await vendorService.getOrders(params);
      return response.data?.orders || response.data || [];
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook to fetch vendor tickets
 * @param {Object} params - Optional filter parameters
 * @returns {Object} Query result with tickets array
 */
export function useVendorTickets(params = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['vendor', 'tickets', params],
    queryFn: async () => {
      const response = await vendorService.getTickets(params);
      // sendPaginated: response = { success, status, data: [...], pagination: {...} }
      return response.data || [];
    },
    enabled: !!token,
    staleTime: 3 * 60 * 1000,
  });
}
