"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { vendorServicesKeys } from "./keys";

export const usePublicVendorServices = (params = {}, options = {}) => {
  const {
    search,
    category,
    regionId,
    cityId,
    districtIds,
    minPrice,
    maxPrice,
    minRating,
    page = 1,
    limit = 12,
  } = params;

  const queryParams = {};
  if (search) queryParams.search = search;
  if (category) queryParams.category = category;
  if (regionId) queryParams.regionId = regionId;
  if (cityId) queryParams.cityId = cityId;
  if (districtIds?.length) queryParams.districtIds = districtIds.join(",");
  if (minPrice) queryParams.minPrice = minPrice;
  if (maxPrice) queryParams.maxPrice = maxPrice;
  if (minRating) queryParams.minRating = minRating;
  queryParams.page = page;
  queryParams.limit = limit;

  return useQuery({
    queryKey: vendorServicesKeys.publicList(queryParams),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getPublicServices,
        params: queryParams,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useMyServices = (options = {}) => {
  return useQuery({
    queryKey: vendorServicesKeys.myList(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getMyServices,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useServiceStats = (options = {}) => {
  return useQuery({
    queryKey: vendorServicesKeys.stats(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getMyStats,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
