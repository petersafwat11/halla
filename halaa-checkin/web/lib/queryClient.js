import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api.js';

/**
 * Creates and configures a TanStack QueryClient with Halaa check-in defaults.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000, // 5 seconds per product spec
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          // Do not retry on client errors
          if (error instanceof ApiError) {
            if ([401, 403, 404, 409, 422].includes(error.status)) {
              return false;
            }
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
