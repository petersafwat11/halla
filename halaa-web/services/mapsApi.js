import { API_PATHS } from '@halaa/shared/api/paths';
import { apiRequest, API_BASE_URL } from './http';

const request = async (path, { params, signal, method = 'GET' } = {}) => {
  const body = await apiRequest({ method, path, params, config: { signal, timeout: 12000 } });
  return body.data ?? body;
};

export const azureMapsApi = {
  autocomplete: (params, signal) => request(API_PATHS.locations.azureAutocomplete, { params, signal }),
  reverseGeocode: (params, signal) => request(API_PATHS.locations.azureReverseGeocode, { params, signal }),
  createSession: signal => request(API_PATHS.locations.azureSession, { method: 'POST', signal }),
  renderUrl: () => new URL(`${API_BASE_URL}${API_PATHS.locations.azureRender}`, window.location.origin).href,
};
