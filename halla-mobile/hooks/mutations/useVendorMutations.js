import { useMutation, useQueryClient } from '@tanstack/react-query';
import vendorService from '../../services/vendorService';

export function useUpdateVendorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ section, data }) => {
      const response = await vendorService.updateSection(section, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'profile'] });
    },
  });
}

export function useUpdateVendorProfileWithFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ section, formData }) => {
      const response = await vendorService.updateSectionWithFiles(section, formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'profile'] });
    },
  });
}

export function useDeleteVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId) => {
      const response = await vendorService.deleteService(serviceId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'stats'] });
    },
  });
}

export function useToggleServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId) => {
      const response = await vendorService.toggleServiceStatus(serviceId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'stats'] });
    },
  });
}

export function useAddVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await vendorService.addService(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'stats'] });
    },
  });
}

export function useUpdateVendorService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, data }) => {
      const response = await vendorService.updateService(serviceId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'stats'] });
    },
  });
}
