'use client';

import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../../lib/queryClient.js';
import { SessionProvider } from '../../hooks/useSession.jsx';
import { EventProvider } from '../../hooks/useEvent.jsx';

export function Providers({ children }) {
  // Create a QueryClient instance once per component lifecycle
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <EventProvider>
          {children}
        </EventProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
