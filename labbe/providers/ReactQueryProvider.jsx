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
