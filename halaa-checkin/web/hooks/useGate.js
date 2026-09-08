'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';

function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gate State Machine hook.
 * Adheres to Technical Contract Section 5 and Product Section 6.
 *
 * States:
 * - 'idle': No active scan or guest selected
 * - 'resolving': Fetching invitation details (does not admit)
 * - 'ready': Preview visible, companions selectable, awaiting deliberate confirm
 * - 'submitting': Admission in flight, inputs locked, idempotency key persisted
 * - 'admitted': Admission confirmed by server truth
 * - 'already_admitted': Invitation already admitted (shows prior details, no second confirm)
 * - 'invalid_invitation': Unknown or wrong-event QR (no details leaked)
 * - 'closed_event': Event is draft or closed
 * - 'network_failure': Network dropped before submission
 * - 'lost_response': Connection lost during submission, same key reusable
 * - 'session_expired': 401 unauthenticated
 */
export function useGate(eventId) {
  const queryClient = useQueryClient();

  const [gateState, setGateState] = useState('idle');
  const [currentGuest, setCurrentGuest] = useState(null);
  const [gateEvent, setGateEvent] = useState(null);
  const [actualCompanions, setActualCompanions] = useState(0);
  const [method, setMethod] = useState('camera');
  const [resolvedAt, setResolvedAt] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [asOf, setAsOf] = useState(new Date().toISOString());

  // Idempotency key held in ref and state for stable retries
  const idempotencyKeyRef = useRef(null);
  const [idempotencyKey, setIdempotencyKey] = useState(null);

  // Monitor browser network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Fetch recent admissions
  const {
    data: recentResponse,
    refetch: refetchRecent,
    isLoading: isLoadingRecent,
  } = useQuery({
    queryKey: ['gate', eventId, 'recent'],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/gate/recent`);
      setAsOf(new Date().toISOString());
      return res.data || [];
    },
    enabled: Boolean(eventId),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const recentAdmissions = recentResponse || [];

  // Reset all gate state when eventId changes
  useEffect(() => {
    setGateState('idle');
    setCurrentGuest(null);
    setGateEvent(null);
    setActualCompanions(0);
    setResolvedAt(null);
    setErrorDetails(null);
    idempotencyKeyRef.current = null;
    setIdempotencyKey(null);
  }, [eventId]);

  /**
   * Reset to idle state for next scan.
   */
  const resetToIdle = useCallback(() => {
    setGateState('idle');
    setCurrentGuest(null);
    setGateEvent(null);
    setActualCompanions(0);
    setResolvedAt(null);
    setErrorDetails(null);
    idempotencyKeyRef.current = null;
    setIdempotencyKey(null);
  }, []);

  /**
   * Resolve an invitation via QR token or guest ID.
   * Does NOT admit anyone.
   *
   * @param {{ token?: string, guestId?: string }} payload
   * @param {'camera' | 'scanner' | 'manual'} scanMethod
   */
  const resolve = useCallback(async (payload, scanMethod = 'camera') => {
    if (!eventId) return;

    setGateState('resolving');
    setErrorDetails(null);
    setMethod(scanMethod);

    try {
      const res = await api.post(`/events/${eventId}/gate/resolve`, payload);
      const data = res.data;
      const guest = data.guest;
      const event = data.event;

      setCurrentGuest(guest);
      setGateEvent(event);
      setResolvedAt(Date.now());
      setActualCompanions(0);

      // Generate a new idempotency key for this admission session
      const key = generateUuid();
      idempotencyKeyRef.current = key;
      setIdempotencyKey(key);

      // Check event status
      if (event.status !== 'live') {
        setGateState('closed_event');
        return;
      }

      // Check if already checked in
      if (guest.checkIn !== null) {
        setGateState('already_admitted');
        return;
      }

      // Ready for deliberate admission confirmation
      setGateState('ready');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_INVITATION' || err.status === 404) {
          // Zero details leaked
          setCurrentGuest(null);
          setGateEvent(null);
          setGateState('invalid_invitation');
          setErrorDetails({ code: 'INVALID_INVITATION', message: err.message });
          return;
        }

        if (err.code === 'EVENT_CLOSED' || err.code === 'EVENT_NOT_LIVE') {
          setGateState('closed_event');
          setErrorDetails({ code: err.code, message: err.message });
          return;
        }

        if (err.code === 'UNAUTHENTICATED' || err.status === 401) {
          setGateState('session_expired');
          setErrorDetails({ code: 'UNAUTHENTICATED', message: err.message });
          return;
        }

        if (err.status === 0 || err.code === 'SERVICE_UNAVAILABLE') {
          setGateState('network_failure');
          setErrorDetails({ code: 'NETWORK_ERROR', message: err.message });
          return;
        }

        setErrorDetails({ code: err.code, message: err.message });
        setGateState('idle');
      } else {
        setGateState('network_failure');
        setErrorDetails({ code: 'NETWORK_ERROR', message: err.message });
      }
    }
  }, [eventId]);

  /**
   * Set actual companion count (bounded 0..allowedCompanions).
   */
  const updateCompanions = useCallback((count) => {
    if (!currentGuest) return;
    const bounded = Math.max(0, Math.min(Number(count) || 0, currentGuest.allowedCompanions));
    setActualCompanions(bounded);
  }, [currentGuest]);

  /**
   * Submit admission with server confirmation.
   * Re-resolves if preview is stale (> 30s).
   */
  const admit = useCallback(async () => {
    if (!eventId || !currentGuest || gateState !== 'ready') return;

    // Staleness check: if preview is older than 30 seconds, re-verify first
    if (resolvedAt && Date.now() - resolvedAt > 30000) {
      try {
        const verifyRes = await api.post(`/events/${eventId}/gate/resolve`, {
          guestId: currentGuest.id,
        });
        const freshGuest = verifyRes.data.guest;
        setCurrentGuest(freshGuest);
        setResolvedAt(Date.now());

        if (freshGuest.checkIn !== null) {
          setGateState('already_admitted');
          return;
        }
      } catch (err) {
        setGateState('network_failure');
        setErrorDetails({ code: 'STALE_VERIFICATION_FAILED', message: err.message });
        return;
      }
    }

    setGateState('submitting');
    setErrorDetails(null);

    const key = idempotencyKeyRef.current || generateUuid();
    idempotencyKeyRef.current = key;
    setIdempotencyKey(key);

    try {
      const res = await api.post(
        `/events/${eventId}/checkins`,
        {
          guestId: currentGuest.id,
          version: currentGuest.version,
          actualCompanions,
          method,
        },
        {
          headers: {
            'Idempotency-Key': key,
          },
        }
      );

      const admittedGuest = res.data;
      setCurrentGuest(admittedGuest);
      setGateState('admitted');

      // Invalidate and refresh recent admissions & stats
      queryClient.invalidateQueries({ queryKey: ['gate', eventId, 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['stats', eventId] });
      refetchRecent();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ALREADY_CHECKED_IN') {
          // If server provides safe prior checkIn details in details
          if (err.details?.checkIn) {
            setCurrentGuest((prev) => ({
              ...prev,
              checkIn: err.details.checkIn,
            }));
          }
          setGateState('already_admitted');
          setErrorDetails({ code: 'ALREADY_CHECKED_IN', message: err.message, details: err.details });
          return;
        }

        if (err.code === 'EVENT_CLOSED' || err.code === 'EVENT_NOT_LIVE') {
          setGateState('closed_event');
          setErrorDetails({ code: err.code, message: err.message });
          return;
        }

        if (err.code === 'UNAUTHENTICATED' || err.status === 401) {
          setGateState('session_expired');
          setErrorDetails({ code: 'UNAUTHENTICATED', message: err.message });
          return;
        }

        if (err.code === 'VERSION_CONFLICT') {
          // Re-fetch current guest state
          try {
            const reRes = await api.post(`/events/${eventId}/gate/resolve`, {
              guestId: currentGuest.id,
            });
            setCurrentGuest(reRes.data.guest);
            setResolvedAt(Date.now());
            if (reRes.data.guest.checkIn !== null) {
              setGateState('already_admitted');
            } else {
              setGateState('ready');
            }
          } catch {
            setGateState('idle');
          }
          setErrorDetails({ code: 'VERSION_CONFLICT', message: err.message });
          return;
        }

        // Lost response / network failure during submit: preserve key for retry
        if (err.status === 0 || err.code === 'SERVICE_UNAVAILABLE') {
          setGateState('lost_response');
          setErrorDetails({ code: 'LOST_RESPONSE', message: err.message });
          return;
        }

        setErrorDetails({ code: err.code, message: err.message });
        setGateState('ready');
      } else {
        // Uncaught error / network timeout
        setGateState('lost_response');
        setErrorDetails({ code: 'LOST_RESPONSE', message: err.message });
      }
    }
  }, [eventId, currentGuest, gateState, resolvedAt, actualCompanions, method, queryClient, refetchRecent]);

  /**
   * Retry admission with the EXACT SAME idempotency key and payload.
   */
  const retryAdmission = useCallback(async () => {
    if (!eventId || !currentGuest) return;

    setGateState('submitting');
    setErrorDetails(null);

    const key = idempotencyKeyRef.current;

    try {
      const res = await api.post(
        `/events/${eventId}/checkins`,
        {
          guestId: currentGuest.id,
          version: currentGuest.version,
          actualCompanions,
          method,
        },
        {
          headers: {
            'Idempotency-Key': key,
          },
        }
      );

      const admittedGuest = res.data;
      setCurrentGuest(admittedGuest);
      setGateState('admitted');

      queryClient.invalidateQueries({ queryKey: ['gate', eventId, 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['stats', eventId] });
      refetchRecent();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALREADY_CHECKED_IN') {
        if (err.details?.checkIn) {
          setCurrentGuest((prev) => ({
            ...prev,
            checkIn: err.details.checkIn,
          }));
        }
        setGateState('already_admitted');
        setErrorDetails({ code: 'ALREADY_CHECKED_IN', message: err.message, details: err.details });
        return;
      }

      setGateState('lost_response');
      setErrorDetails({
        code: err instanceof ApiError ? err.code : 'LOST_RESPONSE',
        message: err.message,
      });
    }
  }, [eventId, currentGuest, actualCompanions, method, queryClient, refetchRecent]);

  /**
   * Verify whether a lost request succeeded on the server.
   */
  const verifyStatus = useCallback(async () => {
    if (!eventId || !currentGuest) return;

    try {
      const res = await api.post(`/events/${eventId}/gate/resolve`, {
        guestId: currentGuest.id,
      });
      const guest = res.data.guest;
      setCurrentGuest(guest);
      setResolvedAt(Date.now());

      if (guest.checkIn !== null) {
        setGateState('admitted');
        queryClient.invalidateQueries({ queryKey: ['gate', eventId, 'recent'] });
        queryClient.invalidateQueries({ queryKey: ['stats', eventId] });
        refetchRecent();
      } else {
        setGateState('ready');
      }
    } catch (err) {
      setErrorDetails({
        code: err instanceof ApiError ? err.code : 'UNKNOWN',
        message: err.message,
      });
    }
  }, [eventId, currentGuest, queryClient, refetchRecent]);

  const derivedPartySize = 1 + actualCompanions;

  return {
    gateState,
    currentGuest,
    gateEvent,
    actualCompanions,
    derivedPartySize,
    method,
    idempotencyKey,
    errorDetails,
    isOnline,
    asOf,
    recentAdmissions,
    isLoadingRecent,
    resolve,
    setActualCompanions: updateCompanions,
    admit,
    retryAdmission,
    verifyStatus,
    resetToIdle,
    refetchRecent,
  };
}
