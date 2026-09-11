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

  // Fetch accessible events when authenticated (F11: refresh while visible/on focus)
  const {
    data: eventsResponse,
    isLoading: isLoadingEvents,
    refetch: refetchEvents,
    error: eventsError,
  } = useQuery({
    queryKey: ['events'],
    queryFn: ({ signal }) => api.get('/events', { signal }),
    enabled: isAuthenticated,
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const events = useMemo(() => eventsResponse?.data || [], [eventsResponse]);

  const [selectedEventId, setSelectedEventId] = useState(urlEventId);
  const [invalidEventId, setInvalidEventId] = useState(null);

  // F18: fetch a permitted selected event outside the first 100-event page.
  const shouldFetchSingle =
    isAuthenticated &&
    !!urlEventId &&
    !isLoadingEvents &&
    !events.some((e) => e.id === urlEventId);
  const singleEventQuery = useQuery({
    queryKey: ['event', urlEventId],
    queryFn: ({ signal }) => api.get(`/events/${urlEventId}`, { signal }),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    enabled: shouldFetchSingle,
    staleTime: 10000,
    retry: false,
  });
  const fetchedSingleEvent = singleEventQuery.error ? null : singleEventQuery.data?.data || null;

  const allEvents = useMemo(() => {
    if (fetchedSingleEvent && !events.some((e) => e.id === fetchedSingleEvent.id)) {
      return [...events, fetchedSingleEvent];
    }
    return events;
  }, [events, fetchedSingleEvent]);

  // Sync state with urlEventId or default to first event (F18: deterministic).
  useEffect(() => {
    if (isLoadingEvents) return;
    if (pathname?.includes('/login')) return;
    if (allEvents.length > 0) {
      if (urlEventId && allEvents.some(e => e.id === urlEventId)) {
        setInvalidEventId(null);
        if (selectedEventId !== urlEventId) {
          setSelectedEventId(urlEventId);
        }
      } else if (urlEventId && singleEventQuery.isError && [403, 404, 422].includes(singleEventQuery.error?.status)) {
        // Invalid/revoked/deleted/unassigned URL: explicit error + valid fallback.
        setInvalidEventId(urlEventId);
        const defaultEvent = allEvents.find(e => e.status === 'live') || allEvents[0];
        if (defaultEvent) {
          setSelectedEventId(defaultEvent.id);
          const params = new URLSearchParams(searchParams.toString());
          params.set('eventId', defaultEvent.id);
          router.replace(`${pathname}?${params.toString()}`);
        } else {
          setSelectedEventId(null);
        }
      } else if (!urlEventId) {
        setInvalidEventId(null);
        // Find live event first, or default to most recent
        const defaultEvent = allEvents.find(e => e.status === 'live') || allEvents[0];
        if (defaultEvent) {
          setSelectedEventId(defaultEvent.id);
          const params = new URLSearchParams(searchParams.toString());
          params.set('eventId', defaultEvent.id);
          router.replace(`${pathname}?${params.toString()}`);
        }
      }
    } else if (!isLoadingEvents) {
      // Distinguish fetch error (eventsError) from genuinely empty list upstream.
      setSelectedEventId(null);
      setInvalidEventId(urlEventId || null);
    }
  }, [allEvents, urlEventId, pathname, router, searchParams, selectedEventId, isLoadingEvents, shouldFetchSingle, singleEventQuery.isFetched]);

  const selectedEvent = useMemo(() => {
    return allEvents.find(e => e.id === selectedEventId) || null;
  }, [allEvents, selectedEventId]);

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
    events: allEvents,
    selectedEvent,
    selectedEventId,
    isLoadingEvents: isLoadingEvents || (shouldFetchSingle && singleEventQuery.isLoading),
    eventsError: eventsError || singleEventQuery.error || null,
    invalidEventId,
    selectEvent,
    refetchEvents,
    hasEvents: allEvents.length > 0,
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
