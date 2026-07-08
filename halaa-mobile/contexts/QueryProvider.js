import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../config/queryClient';
import { runCacheMigrations } from '../hooks/_cacheMigrations';

/**
 * QueryProvider Component
 *
 * Wraps the app with React Query's QueryClientProvider
 * Provides data fetching, caching, and state management capabilities
 */
export function QueryProvider({ children }) {
  useEffect(() => {
    runCacheMigrations(queryClient);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
