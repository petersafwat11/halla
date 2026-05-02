import { API_BASE_URL, ENDPOINTS } from "../config/api";

const request = async (url, token, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : "";
};

export const templateService = {
  getCategories: (token) =>
    request(`${API_BASE_URL}${ENDPOINTS.TEMPLATES.CATEGORIES}`, token),

  getTemplates: (params = {}, token) =>
    request(`${API_BASE_URL}${ENDPOINTS.TEMPLATES.LIST}${buildQuery(params)}`, token),
};
