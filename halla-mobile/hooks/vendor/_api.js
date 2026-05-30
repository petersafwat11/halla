/**
 * Vendor-domain API helpers (services CRUD, stats, vendor tickets).
 * The user-account surface (profile, password, phone, vendor-image
 * deletion) lives in hooks/users/_api.js — vendor components import
 * `usersApi` directly when they need it.
 */
import { ENDPOINTS } from "../../config/api";
import { apiFetch } from "../../services/http";

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

const _resolveMimeType = (image) => {
  if (image.mimeType) return image.mimeType;
  if (image.type && image.type !== "image") return image.type;
  const uri = (image.uri || "").toLowerCase();
  if (uri.endsWith(".png")) return "image/png";
  if (uri.endsWith(".gif")) return "image/gif";
  if (uri.endsWith(".webp")) return "image/webp";
  if (uri.endsWith(".jpg") || uri.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
};

const buildServiceFormData = (data) => {
  const formData = new FormData();
  if (data.name) formData.append("name", data.name);
  if (data.category) formData.append("category", data.category);
  if (data.description) formData.append("description", data.description);
  if (data.price != null) formData.append("price", String(data.price));
  if (data.duration != null) formData.append("duration", String(data.duration));
  if (Array.isArray(data.included)) {
    formData.append("included", JSON.stringify(data.included));
  }
  if (data.tags?.length) formData.append("tags", JSON.stringify(data.tags));
  if (data.image?.uri) {
    formData.append("image", {
      uri: data.image.uri,
      type: _resolveMimeType(data.image),
      name: data.image.fileName || data.image.name || "service.jpg",
    });
  }
  return formData;
};

export const vendorApi = {
  getStats: () =>
    _request(ENDPOINTS.SERVICES.STATS, { method: "GET" }, "Failed to get vendor stats"),

  getServices: () =>
    _request(ENDPOINTS.SERVICES.BASE, { method: "GET" }, "Failed to get services"),

  toggleServiceStatus: (serviceId) =>
    _request(
      ENDPOINTS.SERVICES.TOGGLE_STATUS(serviceId),
      { method: "PATCH" },
      "Failed to toggle service status",
    ),

  getTickets: (params = {}) =>
    _requestWithQuery(
      ENDPOINTS.TICKETS.BASE,
      params,
      { method: "GET" },
      "Failed to get tickets",
    ),

  createTicket: (data) =>
    _request(
      ENDPOINTS.TICKETS.BASE,
      { method: "POST", body: data },
      "Failed to create ticket",
    ),

  updateTicket: (ticketId, data) =>
    _request(
      ENDPOINTS.TICKETS.BY_ID(ticketId),
      { method: "PATCH", body: data },
      "Failed to update ticket",
    ),

  deleteTicket: (ticketId) =>
    _request(
      ENDPOINTS.TICKETS.BY_ID(ticketId),
      { method: "DELETE" },
      "Failed to delete ticket",
    ),

  addService: (data) =>
    _request(
      ENDPOINTS.SERVICES.BASE,
      { method: "POST", body: buildServiceFormData(data), timeoutMs: 60 * 1000 },
      "Failed to add service",
    ),

  updateService: (serviceId, data) =>
    _request(
      ENDPOINTS.SERVICES.BY_ID(serviceId),
      { method: "PATCH", body: buildServiceFormData(data), timeoutMs: 60 * 1000 },
      "Failed to update service",
    ),

  deleteService: (serviceId) =>
    _request(
      ENDPOINTS.SERVICES.BY_ID(serviceId),
      { method: "DELETE" },
      "Failed to delete service",
    ),
};
