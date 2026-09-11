'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Hook for managing guest list queries, pagination, search, filters, selections, and CRUD mutations.
 */
export function useGuests(eventId, { page = 1, pageSize = 25, search = '', status = 'all' } = {}) {
  const queryClient = useQueryClient();
  const [selectedGuestIds, setSelectedGuestIds] = useState(() => new Set());

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Clear selections when search, filter, or event changes
  useEffect(() => {
    setSelectedGuestIds(new Set());
  }, [eventId, debouncedSearch, status]);

  // Fetch guests query (F11/F18: periodic refresh while visible; no cross-event placeholder)
  const queryKey = ['guests', eventId, { page, pageSize, q: debouncedSearch, status }];
  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status,
      });
      if (debouncedSearch && debouncedSearch.trim()) {
        params.set('q', debouncedSearch.trim());
      }
      return api.get(`/events/${eventId}/guests?${params.toString()}`);
    },
    enabled: !!eventId,
    // Retain previous data only within the same event; show loading on event change (F18).
    placeholderData: (previousData, previousQuery) => {
      const prevEventId = previousQuery?.queryKey?.[1];
      if (prevEventId && prevEventId === eventId) return previousData;
      return undefined;
    },
    staleTime: 4000,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const guests = response?.data || [];
  const meta = response?.meta || { page, pageSize, total: 0, totalPages: 1 };

  // Invalidate queries helper
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
    queryClient.invalidateQueries({ queryKey: ['stats', eventId] });
  }, [queryClient, eventId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newGuest) => api.post(`/events/${eventId}/guests`, newGuest),
    onSuccess: () => invalidateAll(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ guestId, payload }) => api.patch(`/events/${eventId}/guests/${guestId}`, payload),
    onSuccess: () => invalidateAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ guestId, version }) => api.delete(`/events/${eventId}/guests/${guestId}`, { version }),
    onSuccess: (_, variables) => {
      setSelectedGuestIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.guestId);
        return next;
      });
      invalidateAll();
    },
  });

  // F17: reset mutation errors when dialogs are reused for another guest.
  const resetMutations = useCallback(() => {
    try { createMutation.reset?.(); } catch { /* ignore */ }
    try { updateMutation.reset?.(); } catch { /* ignore */ }
    try { deleteMutation.reset?.(); } catch { /* ignore */ }
  }, [createMutation, updateMutation, deleteMutation]);

  // Selection handlers
  const toggleSelect = useCallback((guestId) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  }, []);

  const selectAllCurrentPage = useCallback((currentPageGuests) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      const allSelected = currentPageGuests.every((g) => next.has(g.id));
      if (allSelected) {
        currentPageGuests.forEach((g) => next.delete(g.id));
      } else {
        currentPageGuests.forEach((g) => next.add(g.id));
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedGuestIds(new Set());
  }, []);

  return {
    guests,
    meta,
    isLoading: isLoading && !response,
    isFetching,
    error,
    refetch,
    // Selection
    selectedGuestIds,
    selectedCount: selectedGuestIds.size,
    toggleSelect,
    selectAllCurrentPage,
    clearSelection,
    // Mutations
    createGuest: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    updateGuest: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    deleteGuest: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    resetMutations,
  };
}
