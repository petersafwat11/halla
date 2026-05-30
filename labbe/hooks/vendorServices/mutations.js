"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { vendorServicesKeys } from "./keys";

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
        queryClient.invalidateQueries({ queryKey: vendorServicesKeys.all });
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
        queryClient.invalidateQueries({ queryKey: vendorServicesKeys.detail(serviceId) });
        queryClient.invalidateQueries({ queryKey: vendorServicesKeys.myList() });
      },
    },

    deleteService: {
      mutationFn: (serviceId) =>
        apiRequest({
          method: "DELETE",
          path: API_PATHS.vendorServices.deleteService(serviceId),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: vendorServicesKeys.all });
      },
    },

    toggleStatus: {
      mutationFn: (serviceId) =>
        apiRequest({
          method: "PATCH",
          path: API_PATHS.vendorServices.toggleServiceStatus(serviceId),
        }),
      onSuccess: (_, serviceId) => {
        queryClient.invalidateQueries({ queryKey: vendorServicesKeys.detail(serviceId) });
        queryClient.invalidateQueries({ queryKey: vendorServicesKeys.myList() });
      },
    },
  };

  const mutationConfig = mutations[action];

  if (!mutationConfig) {
    throw new Error(`Unknown service action: ${action}`);
  }

  return useMutation(mutationConfig);
};
