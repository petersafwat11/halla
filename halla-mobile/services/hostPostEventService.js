import { API_BASE_URL, ENDPOINTS } from "../config/api";

const request = async (url, token, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const getHostPostEventContent = (eventId, token) =>
  request(`${API_BASE_URL}${ENDPOINTS.POST_EVENT.HOST_CONTENT(eventId)}`, token);

export const uploadPostEventPhotos = (eventId, formData, token) =>
  request(`${API_BASE_URL}${ENDPOINTS.POST_EVENT.UPLOAD_PHOTOS(eventId)}`, token, {
    method: "POST",
    body: formData,
  });

export const updateThankYouMessage = (eventId, message, token) =>
  request(`${API_BASE_URL}${ENDPOINTS.POST_EVENT.UPDATE_THANK_YOU(eventId)}`, token, {
    method: "PATCH",
    body: JSON.stringify({ message }),
  });

export const deletePostEventPhoto = (eventId, photoId, token) =>
  request(`${API_BASE_URL}${ENDPOINTS.POST_EVENT.DELETE_PHOTO(eventId, photoId)}`, token, {
    method: "DELETE",
  });

export const publishPostEventContent = (eventId, token) =>
  request(`${API_BASE_URL}${ENDPOINTS.POST_EVENT.PUBLISH(eventId)}`, token, {
    method: "POST",
  });

export const generatePostEventTokens = (eventId, filter = "attended", token) =>
  request(`${API_BASE_URL}${ENDPOINTS.POST_EVENT.GENERATE_TOKENS(eventId)}`, token, {
    method: "POST",
    body: JSON.stringify({ filter }),
  });
