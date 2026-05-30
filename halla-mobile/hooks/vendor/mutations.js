import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../users/_api";
import { vendorApi } from "./_api";
import { vendorKeys } from "./keys";

export function useUpdateVendorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ section, data }) => {
      const response = await usersApi.updateProfileSection(section, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.profile() });
    },
  });
}

export function useUpdateVendorProfileWithFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ section, formData }) => {
      const response = await usersApi.updateProfileSectionWithFiles(section, formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.profile() });
    },
  });
}

export function useDeleteVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId) => {
      const response = await vendorApi.deleteService(serviceId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.services() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.stats() });
    },
  });
}

export function useToggleServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId) => {
      const response = await vendorApi.toggleServiceStatus(serviceId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.services() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.stats() });
    },
  });
}

export function useAddVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await vendorApi.addService(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.services() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.stats() });
    },
  });
}

export function useUpdateVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, data }) => {
      const response = await vendorApi.updateService(serviceId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.services() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.stats() });
    },
  });
}
