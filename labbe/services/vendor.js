/**
 * Vendor Service
 * Uses the unified /user routes for profile management
 * Service-related endpoints remain on /services
 */

import apiClient from "./apiClient";

export const vendorService = {
  // Get vendor profile/settings (uses unified user route)
  getProfile: async () => {
    return apiClient.get("/user/profile");
  },

  // Update vendor profile/settings (JSON) - uses unified user route
  updateProfile: async (data) => {
    return apiClient.patch("/user/profile", data);
  },

  // Update vendor profile with files (FormData) - uses unified user route
  updateProfileWithFiles: async (formData) => {
    return apiClient.patch("/user/profile", formData);
  },

  // Update specific section (personal, basic, service, images, links) - uses unified user route
  updateSection: async (section, data) => {
    return apiClient.patch(`/user/profile/${section}`, data);
  },

  // Update specific section with files - uses unified user route
  updateSectionWithFiles: async (section, formData) => {
    return apiClient.patch(`/user/profile/${section}`, formData);
  },

  // Update password - uses unified user route
  updatePassword: async (data) => {
    return apiClient.patch("/user/password", data);
  },

  // Get vendor services
  getServices: async () => {
    return apiClient.get("/services");
  },

  // Get vendor stats
  getStats: async () => {
    return apiClient.get("/services/stats");
  },

  // Create a new service
  createService: async (formData) => {
    return apiClient.post("/services", formData);
  },

  // Update a service
  updateService: async (serviceId, formData) => {
    return apiClient.patch(`/services/${serviceId}`, formData);
  },

  // Toggle service status
  toggleServiceStatus: async (serviceId) => {
    return apiClient.patch(`/services/${serviceId}/toggle-status`);
  },

  // Delete a service
  deleteService: async (serviceId) => {
    return apiClient.delete(`/services/${serviceId}`);
  },

  // Get single service
  getService: async (serviceId) => {
    return apiClient.get(`/services/${serviceId}`);
  },
};

export default vendorService;
