import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 *
 * Global settings for data fetching, caching, and refetching behavior
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache data for 30 minutes
      gcTime: 30 * 60 * 1000,

      // Retry failed requests twice
      retry: 2,

      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (useful for web)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Refetch on mount if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});
