import { ENDPOINTS } from "../config/api";
import { apiFetch } from "./apiClient";

const _request = async (path, init = {}, errorMessage) => {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || errorMessage);
  }
  return data;
};

const _requestWithQuery = (path, params, init, errorMessage) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.append(k, String(v));
  });
  const qs = search.toString();
  return _request(qs ? `${path}?${qs}` : path, init, errorMessage);
};

const buildServiceFormData = (data) => {
  const formData = new FormData();
  if (data.name) formData.append("name", data.name);
  if (data.category) formData.append("category", data.category);
  if (data.description) formData.append("description", data.description);
  if (data.price != null) formData.append("price", String(data.price));
  if (data.tags?.length) formData.append("tags", JSON.stringify(data.tags));
  if (data.image?.uri) {
    formData.append("image", {
      uri: data.image.uri,
      type: data.image.mimeType || data.image.type || "image/jpeg",
      name: data.image.fileName || "service.jpg",
    });
  }
  return formData;
};

export const vendorService = {
  getProfile: () =>
    _request(ENDPOINTS.USERS.PROFILE, { method: "GET" }, "Failed to get profile"),

  getStats: () =>
    _request(ENDPOINTS.SERVICES.STATS, { method: "GET" }, "Failed to get vendor stats"),

  getServices: () =>
    _request(ENDPOINTS.SERVICES.BASE, { method: "GET" }, "Failed to get services"),

  toggleServiceStatus: (serviceId) =>
    _request(
      ENDPOINTS.SERVICES.TOGGLE_STATUS(serviceId),
      { method: "PATCH" },
      "Failed to toggle service status"
    ),

  updateSection: (section, data) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section),
      { method: "PATCH", body: data },
      "Failed to update profile section"
    ),

  updateSectionWithFiles: (section, formData) =>
    _request(
      ENDPOINTS.USERS.UPDATE_PROFILE_SECTION(section),
      { method: "PATCH", body: formData, timeoutMs: 60 * 1000 },
      "Failed to update profile section"
    ),

  getTickets: (params = {}) =>
    _requestWithQuery(
      ENDPOINTS.TICKETS.BASE,
      params,
      { method: "GET" },
      "Failed to get tickets"
    ),

  createTicket: (data) =>
    _request(
      ENDPOINTS.TICKETS.BASE,
      { method: "POST", body: data },
      "Failed to create ticket"
    ),

  updateTicket: (ticketId, data) =>
    _request(
      ENDPOINTS.TICKETS.BY_ID(ticketId),
      { method: "PATCH", body: data },
      "Failed to update ticket"
    ),

  deleteTicket: (ticketId) =>
    _request(
      ENDPOINTS.TICKETS.BY_ID(ticketId),
      { method: "DELETE" },
      "Failed to delete ticket"
    ),

  addService: (data) =>
    _request(
      ENDPOINTS.SERVICES.BASE,
      { method: "POST", body: buildServiceFormData(data), timeoutMs: 60 * 1000 },
      "Failed to add service"
    ),

  updateService: (serviceId, data) =>
    _request(
      ENDPOINTS.SERVICES.BY_ID(serviceId),
      { method: "PATCH", body: buildServiceFormData(data), timeoutMs: 60 * 1000 },
      "Failed to update service"
    ),

  deleteService: (serviceId) =>
    _request(
      ENDPOINTS.SERVICES.BY_ID(serviceId),
      { method: "DELETE" },
      "Failed to delete service"
    ),
};

export default vendorService;
