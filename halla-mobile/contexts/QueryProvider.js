import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../config/queryClient';

/**
 * QueryProvider Component
 *
 * Wraps the app with React Query's QueryClientProvider
 * Provides data fetching, caching, and state management capabilities
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
