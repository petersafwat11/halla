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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Request interceptor for auth token and timing
axiosInstance.interceptors.request.use(
  (config) => {
    // Add request timestamp for timing
    config.metadata = { startTime: Date.now() };

    // Only access Cookies on client side
    if (typeof window !== 'undefined') {
      const token = Cookies.get('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
    }

    return response;
  },
  (error) => {
    // Calculate request duration even for errors
    const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());

    // Parse and normalize error
    const parsedError = parseError(error);

    // Log errors
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${parsedError.status || 'Unknown'} (${duration}ms):`, parsedError.message);

    // Handle 401 unauthorized - redirect to login (skip if already on login page)
    if (parsedError.type === ErrorTypes.AUTH && parsedError.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        Cookies.remove('token');
        Cookies.remove('userType');
        Cookies.remove('profileCompleted');
        // Use setTimeout to allow current operation to complete
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
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

  // Server-side token handling
  if (isServer && serverToken) {
    requestConfig.headers = {
      ...requestConfig.headers,
      Authorization: `Bearer ${serverToken}`,
    };
  }

  try {
    console.log(`[API Request] ${method} ${path}`, { isServer });
    const response = await axiosInstance(requestConfig);
    console.log(`[API Response] ${method} ${path} - Success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] ${method} ${path}:`, error.message, error.response?.status);
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
    const token = typeof window !== "undefined"
      ? document.cookie.match(/token=([^;]+)/)?.[1]
      : null;

    const url = `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...(token && { "Authorization": `Bearer ${token}` }),
      },
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
          headers: {
            'Content-Type': 'multipart/form-data',
          },
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
