'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from './useSession.jsx';
import { api, API_BASE, ApiError } from '../lib/api.js';

/**
 * Hook for managing export jobs: create, poll, download, print, and retry.
 * F24: retains non-secret job IDs per event across panel closure/navigation
 * (localStorage), pauses polling when closed/hidden, resumes on reopen, and
 * surfaces creation/polling/expiry/download errors independently.
 */
export function useExports(eventId, { pollingEnabled = true } = {}) {
  const { user } = useSession();
  const actorId = user?.id;
  const storageKey = `halaa-checkin:exportJob:${actorId}:${eventId}`;
  const contextRef = useRef(storageKey);
  contextRef.current = storageKey;
  const [active, setActive] = useState(null);
  const activeJobId = active?.key === storageKey ? active.id : null;
  const setActiveJobId = useCallback((id) => setActive({ key: storageKey, id }), [storageKey]);

  // Restore retained job ID for this event (F24: resume after navigate/close).
  useEffect(() => {
    if (!eventId || !actorId) {
      setActiveJobId(null);
      return;
    }
    try {
      const retained = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (retained) setActiveJobId(retained);
      else setActiveJobId(null);
    } catch {
      setActiveJobId(null);
    }
  }, [eventId, actorId, storageKey, setActiveJobId]);

  // Start polling for a job (React Query refetchInterval below does the polling)
  const startPolling = useCallback((jobId) => {
    setActiveJobId(jobId);
    try {
      if (eventId && jobId && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, jobId);
      }
    } catch { /* ignore */ }
  }, [eventId, actorId, storageKey, setActiveJobId]);

  // Create export job mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post(`/events/${eventId}/exports`, payload);
      return { ...response, originKey: storageKey };
    },
    onSuccess: (response) => {
      const job = response?.data;
      if (job?.id) {
        try { window.localStorage.setItem(response.originKey, job.id); } catch { /* storage unavailable */ }
        if (response.originKey !== contextRef.current) return;
        startPolling(job.id);
      }
    },
  });

  // Get job status query (single 2s poller, paused when tab hidden/panel closed)
  const jobQuery = useQuery({
    queryKey: ['exportJob', eventId, activeJobId],
    queryFn: ({ signal }) => api.get(`/events/${eventId}/exports/${activeJobId}`, { signal }),
    enabled: !!eventId && !!activeJobId && pollingEnabled,
    refetchInterval: (query) => {
      if (!pollingEnabled) return false;
      const state = query.state.data?.data?.state;
      if (state === 'ready' || state === 'failed' || state === 'expired') return false;
      return 2000;
    },
    refetchIntervalInBackground: false,
    staleTime: 1000,
    retry: 1,
  });

  // Download export via authenticated blob URL (cookies included, revoked after click)
  const downloadExport = useCallback(async (jobId) => {
    const url = `${API_BASE}/events/${eventId}/exports/${jobId}/download`;
    const response = await api.get(url, { responseType: 'blob' });
    const blob = response.blob;
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `export-${jobId}.pdf`;
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (matches && matches[1]) {
        filename = decodeURIComponent(matches[1].replace(/['"]/g, '').replace(/^UTF-8''/i, ''));
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // Defer revocation so Firefox/Safari finish the download
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 4000);
    }
  }, [eventId, actorId, storageKey, setActiveJobId]);

  // Print export: fetch authenticated blob, open in new tab, print with fallback
  // F25: wait for the viewer to be ready (load event) rather than assuming 800ms;
  // localize popup/download failures; user-triggered with new-window/PDF fallback.
  const printExport = useCallback(async (jobId) => {
    const url = `${API_BASE}/events/${eventId}/exports/${jobId}/download`;
    const response = await api.get(url, { responseType: 'blob' });
    const blob = response.blob;
    const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    try {
      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow) {
        // Fallback: trigger a download if popups are blocked
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `export-${jobId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        throw new ApiError({ status: 0, code: 'PRINT_POPUP_BLOCKED', message: 'Popup blocked. PDF downloaded instead — open it to print.' });
      }
      await new Promise((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        try {
          newWindow.addEventListener('load', () => {
            if (done) return;
            try { newWindow.print(); } catch { /* ignore */ }
            finish();
          }, { once: true });
        } catch { /* ignore */ }
        // Native PDF viewers may not dispatch a page load. Leave the viewer
        // open for manual printing, without invoking print before readiness.
        setTimeout(finish, 10000);
      });
    } finally {
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    }
  }, [eventId, actorId, storageKey, setActiveJobId]);

  const cleanup = useCallback(() => {
    // F24: closing the panel pauses polling but retains the job ID for resume.
    // Use clearRetainedJob to forget (logout/user change/new export).
  }, []);

  const clearRetainedJob = useCallback(() => {
    setActiveJobId(null);
    try {
      if (eventId && typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey);
      }
    } catch { /* ignore */ }
  }, [eventId, actorId, storageKey, setActiveJobId]);

  const terminalStates = ['ready', 'failed', 'expired'];
  const currentState = jobQuery.data?.data?.state;

  return {
    // State
    activeJobId,
    job: jobQuery.data?.data,
    jobState: currentState,
    isPolling: !!activeJobId && pollingEnabled && !terminalStates.includes(currentState),
    jobQueryError: jobQuery.error || null,

    // Mutations
    createExport: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    resetCreateError: createMutation.reset,

    // Actions
    startPolling,
    downloadExport,
    printExport,
    cleanup,
    clearRetainedJob,

    // Queries
    refetchJob: jobQuery.refetch,

  };
}

/**
 * Hook for admin correction and reset mutations.
 */
export function useAdmissionCorrection(eventId) {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
    queryClient.invalidateQueries({ queryKey: ['stats', eventId] });
    queryClient.invalidateQueries({ queryKey: ['gate', eventId, 'recent'] });
  }, [queryClient, eventId]);

  // Correction mutation (PATCH /events/:eventId/guests/:guestId/checkin)
  const correctMutation = useMutation({
    mutationFn: ({ guestId, payload }) =>
      api.patch(`/events/${eventId}/guests/${guestId}/checkin`, payload),
    onSuccess: () => invalidateAll(),
  });

  // Reset mutation (DELETE /events/:eventId/guests/:guestId/checkin)
  const resetMutation = useMutation({
    mutationFn: ({ guestId, payload }) =>
      api.delete(`/events/${eventId}/guests/${guestId}/checkin`, payload),
    onSuccess: () => invalidateAll(),
  });

  return {
    correctAdmission: correctMutation.mutateAsync,
    isCorrecting: correctMutation.isPending,
    correctError: correctMutation.error,
    resetAdmission: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
    resetError: resetMutation.error,
    resetCorrectionErrors: () => {
      try { correctMutation.reset?.(); } catch { /* ignore */ }
      try { resetMutation.reset?.(); } catch { /* ignore */ }
    },
  };
}
