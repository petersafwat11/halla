import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import marketplaceService from '../../services/marketplaceService';

/**
 * Hook to fetch vendors from marketplace with infinite scroll support
 * @param {Object} filters - Search and filter parameters
 * @returns {Object} Infinite query result with vendors data
 */
export function useVendors(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['marketplace', 'vendors', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await marketplaceService.getVendors({ ...filters, page: pageParam, limit: 20 });
      return response;
    },
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage?.pagination || {};
      return page < pages ? page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch vendor categories
 * @returns {Object} Query result with categories data
 */
export function useVendorCategories() {
  return useQuery({
    queryKey: ['marketplace', 'categories'],
    queryFn: async () => {
      const response = await marketplaceService.getServiceTypes("ar");
      return response;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single vendor by ID
 * @param {string} vendorId - Vendor ID
 * @returns {Object} Query result with vendor details
 */
export function useVendorDetails(vendorId) {
  return useQuery({
    queryKey: ['marketplace', 'vendor', vendorId],
    queryFn: async () => {
      const response = await marketplaceService.getVendorDetails(vendorId);
      return response;
    },
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  });
}
