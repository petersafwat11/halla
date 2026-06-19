import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";
import { marketplaceKeys } from "./keys";

const _request = async (path, errorMessage) => {
  const response = await apiFetch(path, { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || errorMessage);
  return data;
};

const _buildVendorsPath = (params) => {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append("search", params.search);
  if (params.serviceType && params.serviceType !== "all") {
    queryParams.append("category", params.serviceType);
  }
  if (params.regionId) queryParams.append("regionId", params.regionId);
  if (params.cityId) queryParams.append("cityId", params.cityId);
  if (params.districtId) queryParams.append("districtId", params.districtId);
  if (params.minPrice) queryParams.append("minPrice", params.minPrice);
  if (params.maxPrice) queryParams.append("maxPrice", params.maxPrice);
  if (params.rating) queryParams.append("rating", params.rating);
  if (params.lang) queryParams.append("lang", params.lang);
  if (params.sort) queryParams.append("sort", params.sort);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);
  const qs = queryParams.toString();
  return `${ENDPOINTS.VENDORS.PUBLIC}${qs ? `?${qs}` : ""}`;
};

/**
 * Marketplace vendors with infinite scroll support.
 */
export function useMarketplaceVendors(filters = {}) {
  return useInfiniteQuery({
    queryKey: marketplaceKeys.vendors(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const path = _buildVendorsPath({ ...filters, page: pageParam, limit: 20 });
      return _request(path, "Failed to fetch marketplace vendors");
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
    queryFn: () => _request(ENDPOINTS.VENDORS.CATEGORIES, "Failed to fetch service types"),
    staleTime: 30 * 60 * 1000,
  });
}

export function useMarketplaceVendor(vendorId, lang) {
  return useQuery({
    queryKey: [...marketplaceKeys.vendor(vendorId), lang],
    queryFn: () => _request(`${ENDPOINTS.VENDORS.PUBLIC_BY_ID(vendorId)}?lang=${lang || "ar"}`, "Failed to fetch vendor"),
    enabled: Boolean(vendorId),
    staleTime: 5 * 60 * 1000,
  });
}
