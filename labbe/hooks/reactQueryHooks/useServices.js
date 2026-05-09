"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

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
    queryKey: ["vendor-services", "public", queryParams],
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
    queryKey: ["vendor-services", "my-services"],
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
    queryKey: ["vendor-services", "stats"],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.vendorServices.getMyStats,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useServiceMutation = (action) => {
  const queryClient = useQueryClient();

  const mutations = {
    createService: {
      mutationFn: (serviceData) =>
        apiRequest({
          method: "POST",
          path: API_PATHS.vendorServices.createService,
          data: serviceData,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services"] });
      },
    },

    updateService: {
      mutationFn: ({ serviceId, data }) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.vendorServices.updateService(serviceId),
          data,
        }),
      onSuccess: (_, { serviceId }) => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services", serviceId] });
        queryClient.invalidateQueries({ queryKey: ["vendor-services", "my-services"] });
      },
    },

    deleteService: {
      mutationFn: (serviceId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.vendorServices.deleteService(serviceId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services"] });
      },
    },

    toggleStatus: {
      mutationFn: (serviceId) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.vendorServices.toggleServiceStatus(serviceId),
        }),
      onSuccess: (_, serviceId) => {
        queryClient.invalidateQueries({ queryKey: ["vendor-services", serviceId] });
        queryClient.invalidateQueries({ queryKey: ["vendor-services", "my-services"] });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown service action: ${action}`);
  }

  return useMutation(mutationConfig);
};
