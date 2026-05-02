import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";

const API_URL = API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let RN set the correct Content-Type with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Vendor Service
export const vendorService = {
  // Get vendor profile - GET /api/v2/users/profile
  getProfile: async () => {
    const response = await apiClient.get("/users/profile");
    return response.data;
  },

  // Get vendor dashboard stats - GET /api/v2/services/stats
  getStats: async () => {
    const response = await apiClient.get("/services/stats");
    return response.data;
  },

  // Get vendor services - GET /api/v2/services
  getServices: async () => {
    const response = await apiClient.get("/services");
    return response.data;
  },

  // Toggle service status - PATCH /api/v2/services/:id/toggle-status
  toggleServiceStatus: async (serviceId) => {
    const response = await apiClient.patch(
      `/services/${serviceId}/toggle-status`,
    );
    return response.data;
  },

  // Update vendor profile section - PATCH /api/v2/users/profile/:section
  updateSection: async (section, data) => {
    const response = await apiClient.patch(`/users/profile/${section}`, data);
    return response.data;
  },

  // Update vendor profile section with files
  updateSectionWithFiles: async (section, formData) => {
    const response = await apiClient.patch(
      `/users/profile/${section}`,
      formData,
    );
    return response.data;
  },

  // Get vendor tickets - GET /api/v2/tickets
  getTickets: async (params = {}) => {
    const response = await apiClient.get("/tickets", { params });
    return response.data;
  },

  // Create vendor ticket - POST /api/v2/tickets
  createTicket: async (data) => {
    const response = await apiClient.post("/tickets", data);
    return response.data;
  },

  // Update vendor ticket - PATCH /api/v2/tickets/:id
  updateTicket: async (ticketId, data) => {
    const response = await apiClient.patch(`/tickets/${ticketId}`, data);
    return response.data;
  },

  // Delete vendor ticket - DELETE /api/v2/tickets/:id
  deleteTicket: async (ticketId) => {
    const response = await apiClient.delete(`/tickets/${ticketId}`);
    return response.data;
  },

  // Add new service - POST /api/v2/services
  addService: async (data) => {
    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.type) formData.append("type", data.type);
    if (data.description) formData.append("description", data.description);
    if (data.price != null) formData.append("price", String(data.price));
    if (data.tags?.length) formData.append("tags", JSON.stringify(data.tags));
    if (data.image?.uri) {
      formData.append("image", {
        uri: data.image.uri,
        type: data.image.mimeType || "image/jpeg",
        name: data.image.fileName || "service.jpg",
      });
    }
    const response = await apiClient.post("/services", formData);
    return response.data;
  },

  // Update service - PATCH /api/v2/services/:id
  updateService: async (serviceId, data) => {
    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    if (data.type) formData.append("type", data.type);
    if (data.price != null) formData.append("price", String(data.price));
    if (data.tags?.length) formData.append("tags", JSON.stringify(data.tags));
    if (data.image && data.image.uri) {
      formData.append("image", {
        uri: data.image.uri,
        type: data.image.mimeType || data.image.type || "image/jpeg",
        name: data.image.fileName || "service.jpg",
      });
    }
    const response = await apiClient.patch(
      `/services/${serviceId}`,
      formData,
    );
    return response.data;
  },

  // Delete service - DELETE /api/v2/services/:id
  deleteService: async (serviceId) => {
    const response = await apiClient.delete(`/services/${serviceId}`);
    return response.data;
  },

  // Get vendor orders/bookings - GET /api/v2/services/orders
  getOrders: async (params = {}) => {
    const response = await apiClient.get("/services/orders", { params });
    return response.data;
  },

  // Update password - PATCH /api/v2/users/password
  updatePassword: async (data) => {
    const response = await apiClient.patch("/users/password", data);
    return response.data;
  },
};

export default vendorService;
