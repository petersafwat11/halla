/**
 * Unified API Handler
 * Central utility for all backend requests with React Query support
 * Works with both Client and Server Components in Next.js
 * Handles CRUD, exports, notifications, and all request types
 * Caching enabled by default via React Query
 */

import axios from 'axios';
import Cookies from 'js-cookie';
import {
  useQuery,
  useMutation,
  useQueryClient,
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import React from 'react';
import { parseError, ErrorTypes } from '@/services/errorHandlingService';

// ============================================
// AXIOS INSTANCE CONFIGURATION
// ============================================

// Server components call the backend directly; browser calls go through the
// Next.js proxy (rewrites) so cookies land on the correct origin (:3000).
const isServer = typeof window === "undefined";
const API_BASE_URL = isServer
  ? process.env.INTERNAL_API_URL || "http://localhost:8000/api/v2"
  : process.env.NEXT_PUBLIC_API_URL || "/api/v2";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
  // HttpOnly access_token / refresh_token cookies must flow on
  // every cross-origin request (Vercel → Railway in prod). Without this
  // login responses won't persist cookies and silent-refresh can't work.
  withCredentials: true,
});

// Coalesce concurrent refresh attempts. Refresh tokens are single-use, so
// firing two parallel rotations against the same token causes the backend
// to detect replay and revoke the entire session.
let _refreshPromise = null;
export const _refreshOnce = async () => {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true, timeout: 15000 }
      );
      return res.status >= 200 && res.status < 300;
    } catch (e) {
      return false;
    } finally {
      // microtask delay so concurrent callers see this attempt's result
      Promise.resolve().then(() => {
        _refreshPromise = null;
      });
    }
  })();
  return _refreshPromise;
};

// Session termination coordinator: ensures cleanup runs only once during session death
let _isTerminating = false;

/**
 * Cleanly terminate the web user session on expired/revoked refresh.
 * 1. Clears React Query cache to discard cached data and abort pending queries.
 * 2. Resets Zustand auth store state.
 * 3. Clears all JS-readable routing cookies.
 * 4. Redirects to localized login with returnUrl.
 */
export const terminateSession = async () => {
  if (typeof window === "undefined") return;
  if (_isTerminating) return;
  _isTerminating = true;

  try {
    const { clearQueryCache } = await import("@/providers/ReactQueryProvider");
    clearQueryCache();
  } catch (e) {
    // ignore
  }

  try {
    const { default: useAuthStore } = await import("@/stores/authStore");
    useAuthStore.getState().clearAuthState();
  } catch (e) {
    // ignore
  }

  try {
    const { cookieUtils } = await import("@/utils/cookieUtils");
    cookieUtils.clearAuthCookies();
  } catch (e) {
    Cookies.remove("token");
    Cookies.remove("userType");
    Cookies.remove("profileCompleted");
    Cookies.remove("mustChangePassword");
  }

  const pathname = window.location.pathname || "";
  if (!pathname.includes("/login")) {
    const segments = pathname.split("/").filter(Boolean);
    const locale = segments[0] === "en" || segments[0] === "ar" ? segments[0] : "ar";
    const returnUrl = encodeURIComponent(pathname + (window.location.search || ""));
    setTimeout(() => {
      window.location.href = `/${locale}/login?returnUrl=${returnUrl}`;
    }, 50);
  }
};

// Request interceptor for timing + request id.
//
// Authentication on web is exclusively the HttpOnly `access_token` cookie
// which the browser attaches automatically because of `withCredentials: true`
// above. The JS layer never sees the access token.
// Guest post-event interaction endpoints. These are authenticated by the
// guest *session* JWT (issued by /post-event/validate), NOT the host HttpOnly
// cookie. The JWT lives in the JS-readable `guestToken` cookie, so we attach
// it here as a Bearer header — scoped to exactly these paths so host requests
// (which use the HttpOnly access_token cookie) are never affected.
const GUEST_POST_EVENT_RE = /\/post-event\/[^/]+\/(content|like|comments|report|block|policies)(?:[/?]|$)/;

axiosInstance.interceptors.request.use(
  (config) => {
    // Add request timestamp for timing
    config.metadata = { startTime: Date.now() };

    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Attach the guest session token for guest post-event interactions.
    if (typeof window !== 'undefined' && GUEST_POST_EVENT_RE.test(config.url || '')) {
      const guestToken = Cookies.get('guestToken');
      if (guestToken) {
        config.headers['Authorization'] = `Bearer ${guestToken}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and normalization
axiosInstance.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = Date.now() - (response.config.metadata?.startTime || Date.now());

    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
    }

    return response;
  },
  async (error) => {
    // Calculate request duration even for errors
    const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());

    // Parse and normalize error
    const parsedError = parseError(error);

    // On 401, attempt one silent refresh and replay the original
    // request before bouncing the user. We skip retry on auth routes
    // themselves (login / refresh / logout) to avoid loops, and skip when
    // we've already retried this request.
    const cfg = error.config || {};
    const url = cfg.url || '';
    const skipRefresh =
      cfg._retry ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/logout') ||
      // Guest post-event 401s are about the guest session token, not the host
      // session — don't attempt a host /auth/refresh or bounce to /login.
      GUEST_POST_EVENT_RE.test(url);

    // Suppress the console error for 401s that are about to be retried —
    // logging there is noise, and if the retry succeeds the user has no
    // way to know the "error" was harmless. Real failures (non-401, or
    // 401s on auth routes / already-retried requests) still log.
    const willRetry401 =
      parsedError.type === ErrorTypes.AUTH &&
      parsedError.status === 401 &&
      !skipRefresh;
    if (!willRetry401) {
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${parsedError.status || 'Unknown'} (${duration}ms):`, parsedError.message);
    }

    if (
      parsedError.type === ErrorTypes.AUTH &&
      parsedError.status === 401 &&
      !skipRefresh
    ) {
      const refreshed = await _refreshOnce();
      if (refreshed) {
        cfg._retry = true;
        return axiosInstance(cfg);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // If there was a session or user routing cookie, cleanly terminate session
        const hadSession = Cookies.get('userType') || Cookies.get('token');
        if (hadSession) {
          terminateSession();
        }
      }
    }

    // Attach parsed error info and override message with backend's user-friendly message
    error.parsedError = parsedError;
    if (parsedError.message && parsedError.message !== error.message) {
      error.message = parsedError.message;
    }

    return Promise.reject(error);
  }
);

// ============================================
// TYPES & CONFIGURATIONS
// ============================================

/**
 * @typedef {Object} ApiRequestParams
 * @property {'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} method - HTTP method
 * @property {string} path - API endpoint path
 * @property {any} [data] - Request body data
 * @property {any} [params] - Query parameters
 * @property {import('axios').AxiosRequestConfig} [config] - Additional axios config
 * @property {boolean} [isExport] - If true, responseType will be 'blob'
 * @property {boolean} [isServer] - If true, use server-side token (for server components)
 * @property {string} [serverToken] - Token for server-side requests
 */

// ============================================
// UNIFIED API REQUEST FUNCTION
// ============================================

/**
 * Unified API request handler
 * Handles all CRUD operations, exports, and special requests
 *
 * @param {ApiRequestParams} params
 * @returns {Promise<any>}
 */
export const apiRequest = async ({
  method,
  path,
  data,
  params,
  config = {},
  isExport = false,
  isServer = false,
  serverToken,
}) => {
  const requestConfig = {
    method,
    url: path,
    ...(data && { data }),
    ...(params && { params }),
    ...(isExport && { responseType: 'blob' }),
    ...config,
  };

  // When passing FormData in the browser, remove any static Content-Type
  // header so Axios and the browser automatically attach multipart/form-data
  // along with the proper boundary parameter (e.g. multipart/form-data; boundary=----...).
  const isBrowserFormData =
    typeof FormData !== 'undefined' && data instanceof FormData;
  if (isBrowserFormData) {
    // Override the instance's JSON default as well as caller headers.
    // Merely deleting the request header restores that default during merge,
    // causing Axios to serialize File entries to JSON instead of multipart.
    requestConfig.headers = { ...requestConfig.headers, 'Content-Type': undefined };
    delete requestConfig.headers['content-type'];
  }

  // Server-side token handling
  if (isServer && serverToken) {
    requestConfig.headers = {
      ...requestConfig.headers,
      Authorization: `Bearer ${serverToken}`,
    };
  }

  try {
    const response = await axiosInstance(requestConfig);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Generic query hook for GET requests with caching
 *
 * @param {string[]} queryKey - React Query key for caching
 * @param {Object} options
 * @param {string} options.path - API endpoint path
 * @param {any} [options.params] - Query parameters
 * @param {import('@tanstack/react-query').UseQueryOptions} [options.queryOptions] - Additional query options
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export const useApiQuery = (queryKey, { path, params, queryOptions = {} }) => {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => apiRequest({ method: 'GET', path, params }),
    staleTime: 1000 * 60 * 5, // 5 minutes default cache
    cacheTime: 1000 * 60 * 30, // 30 minutes garbage collection
    refetchOnWindowFocus: false,
    ...queryOptions,
  });
};

/**
 * Generic mutation hook for POST, PUT, PATCH, DELETE requests
 * Auto-invalidates related queries on success
 *
 * @param {Object} options
 * @param {string[]} [options.invalidateQueries] - Query keys to invalidate on success
 * @param {Function} [options.onSuccess] - Callback on success
 * @param {Function} [options.onError] - Callback on error
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useApiMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { invalidateQueries = [], onSuccess, onError } = options;

  return useMutation({
    mutationFn: (params) => apiRequest(params),
    onSuccess: (data, variables, context) => {
      // Invalidate specified queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Call custom onSuccess if provided
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Call custom onError if provided
      if (onError) {
        onError(error, variables, context);
      }
    },
  });
};

/**
 * Download export file from API
 * Centralized function for handling file exports (Excel, CSV, etc.)
 * @param {Object} options
 * @param {string} options.path - API path for export endpoint
 * @param {string} options.filename - Suggested filename for download
 * @param {Object} options.params - Optional query params
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const downloadExportFile = async ({ path, filename, params = {} }) => {
  try {
    // HttpOnly access_token cookie travels automatically via
    // `credentials: "include"`.
    const url = `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true };
  } catch (error) {
    console.error("Export download failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Hook for export mutations
 * @returns {UseMutationResult}
 */
export const useExportMutation = () => {
  return useMutation({
    mutationFn: downloadExportFile,
  });
};

/**
 * Specialized hook for file upload requests with progress tracking
 *
 * @param {Object} options
 * @param {Function} [options.onProgress] - Progress callback (0-100)
 * @param {string[]} [options.invalidateQueries]
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useUploadMutation = (options = {}) => {
  const { onProgress, invalidateQueries = [], ...rest } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, data, method = 'POST' }) => {
      const config = {};

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        };
      }

      return apiRequest({
        method,
        path,
        data,
        config: {
          ...config,
        },
      });
    },
    onSuccess: (data, variables, context) => {
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      if (rest.onSuccess) {
        rest.onSuccess(data, variables, context);
      }
    },
    onError: rest.onError,
  });
};

/**
 * Server-side API request helper (for Next.js Server Components)
 *
 * @param {Object} params
 * @param {string} params.path - API endpoint path
 * @param {string} params.token - Server-side auth token
 * @param {any} [params.params] - Query parameters
 * @returns {Promise<any>}
 */
export const serverApiRequest = async ({ path, token, params }) => {
  return apiRequest({
    method: 'GET',
    path,
    params,
    isServer: true,
    serverToken: token,
  });
};

// ============================================
// UTILITY EXPORTS
// ============================================

/**
 * Prefetch data for server-side rendering
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {string[]} queryKey
 * @param {string} path
 * @param {any} [params]
 */
export const prefetchQuery = async (queryClient, queryKey, path, params) => {
  await queryClient.prefetchQuery({
    queryKey: [...queryKey, params],
    queryFn: () => apiRequest({ method: 'GET', path, params }),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Build URL with query parameters
 *
 * @param {string} basePath
 * @param {Object} params
 * @returns {string}
 */
export const buildUrl = (basePath, params = {}) => {
  const url = new URL(basePath, API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.pathname + url.search;
};

// ============================================
// REACT QUERY SSR UTILITIES
// ============================================

/**
 * Create a new QueryClient instance for server-side use
 * Each server request gets its own QueryClient to prevent cache sharing
 */
export const createServerQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  });
};

/**
 * Prefetch data on server for SSR
 * @param {Object} options
 * @param {QueryClient} options.queryClient - QueryClient instance
 * @param {string[]} options.queryKey - React Query key
 * @param {string} options.path - API endpoint path
 * @param {string} options.token - Auth token
 * @param {Object} [options.params] - Query parameters
 */
export const prefetchServerData = async ({
  queryClient,
  queryKey,
  path,
  token,
  params,
}) => {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: () => serverApiRequest({ path, token, params }),
  });
};

/**
 * Wrapper component for Server Components using React Query SSR
 * Handles hydration of prefetched data to client
 * @param {Object} props
 * @param {QueryClient} props.queryClient - Server QueryClient instance
 * @param {React.ReactNode} props.children - Child components
 */
export const QueryClientServerProvider = ({ queryClient, children }) => {
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      {children}
    </HydrationBoundary>
  );
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  apiRequest,
  useApiQuery,
  useApiMutation,
  useExportMutation,
  useUploadMutation,
  serverApiRequest,
  prefetchQuery,
  buildUrl,
  createServerQueryClient,
  prefetchServerData,
  QueryClientServerProvider,
};
