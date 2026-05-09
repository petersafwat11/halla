import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import marketplaceService from '../../services/marketplaceService';

/**
 * Hook to fetch vendors from marketplace with infinite scroll support
 * @param {Object} filters - Search and filter parameters
 * @returns {Object} Infinite query result with vendors data
 */
export function useMarketplaceServices(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['marketplace', 'vendors', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await marketplaceService.getMarketplaceServices({ ...filters, page: pageParam, limit: 20 });
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
      const response = await marketplaceService.getServiceTypes();
      return response;
    },
    staleTime: 30 * 60 * 1000,
  });
}
