"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { runCacheMigrations } from "@/hooks/_cacheMigrations";

let _queryClient = null;

export function clearQueryCache() {
  _queryClient?.clear();
}

export default function ReactQueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Never retry on 401 (Auth) or 403 (Forbidden) — axios interceptor
              // already handles silent refresh attempt. Retrying here causes storms.
              const status = error?.parsedError?.status || error?.response?.status || error?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  useEffect(() => {
    _queryClient = queryClient;
    runCacheMigrations(queryClient);
    return () => {
      _queryClient = null;
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
