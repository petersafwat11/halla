import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import marketplaceService from "../../services/marketplaceService";
import { marketplaceKeys } from "./keys";

/**
 * Marketplace vendors with infinite scroll support.
 */
export function useMarketplaceServices(filters = {}) {
  return useInfiniteQuery({
    queryKey: marketplaceKeys.vendors(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await marketplaceService.getMarketplaceServices({
        ...filters,
        page: pageParam,
        limit: 20,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage?.pagination || {};
      return page < pages ? page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useVendorCategories() {
  return useQuery({
    queryKey: marketplaceKeys.categories(),
    queryFn: async () => {
      const response = await marketplaceService.getServiceTypes();
      return response;
    },
    staleTime: 30 * 60 * 1000,
  });
}
