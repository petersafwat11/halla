"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { vendorsKeys } from "./keys";

export const usePublicVendors = (params = {}, options = {}) => {
  const {
    search,
    category,
    regionId,
    cityId,
    districtId,
    minPrice,
    maxPrice,
    rating,
    lang,
    sort,
    page = 1,
    limit = 12,
  } = params;

  const queryParams = {};
  if (search) queryParams.search = search;
  if (category) queryParams.category = category;
  if (regionId) queryParams.regionId = regionId;
  if (cityId) queryParams.cityId = cityId;
  if (districtId) queryParams.districtId = districtId;
  if (minPrice) queryParams.minPrice = minPrice;
  if (maxPrice) queryParams.maxPrice = maxPrice;
  if (rating) queryParams.rating = rating;
  if (lang) queryParams.lang = lang;
  if (sort) queryParams.sort = sort;
  queryParams.page = page;
  queryParams.limit = limit;

  return useQuery({
    queryKey: vendorsKeys.publicList(queryParams),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendors.getPublicVendors,
        params: queryParams,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const usePublicVendor = (vendorId, options = {}) =>
  useQuery({
    queryKey: vendorsKeys.publicDetail(vendorId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendors.getPublicVendor(vendorId),
      }),
    enabled: Boolean(vendorId),
    staleTime: 2 * 60 * 1000,
    ...options,
  });

export const useVendorCategories = (options = {}) => {
  return useQuery({
    queryKey: vendorsKeys.categories(),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendors.getCategories,
      }),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
};
