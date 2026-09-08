'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api.js';
import { useSession } from './useSession.jsx';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const { isAuthenticated } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const urlEventId = searchParams?.get('eventId') || null;

  // Fetch accessible events when authenticated
  const {
    data: eventsResponse,
    isLoading: isLoadingEvents,
    refetch: refetchEvents,
    error: eventsError,
  } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events'),
    enabled: isAuthenticated,
    staleTime: 10000,
  });

  const events = useMemo(() => eventsResponse?.data || [], [eventsResponse]);

  const [selectedEventId, setSelectedEventId] = useState(urlEventId);

  // Sync state with urlEventId or default to first event
  useEffect(() => {
    if (events.length > 0) {
      if (urlEventId && events.some(e => e.id === urlEventId)) {
        if (selectedEventId !== urlEventId) {
          setSelectedEventId(urlEventId);
        }
      } else if (!urlEventId) {
        // Find live event first, or default to most recent
        const defaultEvent = events.find(e => e.status === 'live') || events[0];
        if (defaultEvent) {
          setSelectedEventId(defaultEvent.id);
          const params = new URLSearchParams(searchParams.toString());
          params.set('eventId', defaultEvent.id);
          router.replace(`${pathname}?${params.toString()}`);
        }
      }
    } else {
      setSelectedEventId(null);
    }
  }, [events, urlEventId, pathname, router, searchParams, selectedEventId]);

  const selectedEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const selectEvent = useCallback((newEventId) => {
    if (newEventId === selectedEventId) return;

    // Invalidate/clear queries for the previous event
    if (selectedEventId) {
      queryClient.removeQueries({ queryKey: ['guests', selectedEventId] });
      queryClient.removeQueries({ queryKey: ['stats', selectedEventId] });
      queryClient.removeQueries({ queryKey: ['gate', selectedEventId] });
    }

    setSelectedEventId(newEventId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('eventId', newEventId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [selectedEventId, queryClient, searchParams, pathname, router]);

  const value = {
    events,
    selectedEvent,
    selectedEventId,
    isLoadingEvents,
    eventsError,
    selectEvent,
    refetchEvents,
    hasEvents: events.length > 0,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
