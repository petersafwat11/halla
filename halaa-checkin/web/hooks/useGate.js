'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from './useSession.jsx';
import { pendingAdmissionSlot } from '../lib/pendingAdmissions.js';
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

function clampCompanions(value, allowed) {
  const max = Number.isFinite(allowed) ? allowed : 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(Math.trunc(n), max));
}

/**
 * Gate State Machine hook (F07–F11 hardening).
 *
 * Guarantees:
 * - Request/event generation guards: only the current event's latest callbacks
 *   may update UI; old event responses never refill the new event (F07).
 * - Immutable in-memory operation `{eventId,guestId,version,actualCompanions,
 *   method,key}` from submission through reconciliation; retry reuses the exact
 *   original payload/key (F09).
 * - Concurrent-admission consumes `details.guest` (safe DTO), never fabricates
 *   counts/times/operators (F08).
 * - Stale previews re-resolve and require reconfirmation when allowance/details
 *   change; proxy 502/504 + timeouts are unknown outcomes (F09).
 * - 401 clears guest data and enters reauth; network loss is distinct (F10).
 * - Browser connectivity vs API reachability separated; asOf only on success;
 *   recent errors surfaced, never rendered as empty on failure (F11).
 */
export function useGate(eventId) {
  const queryClient = useQueryClient();

  const { user } = useSession();
  const actorId = user?.id;
  const operationRef = useMemo(() => pendingAdmissionSlot(actorId, eventId), [actorId, eventId]);
  const [gateState, updateGateState] = useState(() => operationRef.current ? 'lost_response' : 'idle');
  const stateRef = useRef(gateState);
  const setGateState = useCallback((next) => {
    stateRef.current = next; // synchronous lock, including same-tick double clicks
    updateGateState(next);
  }, []);
  const [currentGuest, setCurrentGuest] = useState(null);
  const [gateEvent, setGateEvent] = useState(null);
  const [actualCompanions, setActualCompanions] = useState(0);
  const [method, setMethod] = useState('camera');
  const [resolvedAt, setResolvedAt] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [apiReachable, setApiReachable] = useState(false);
  const [asOf, setAsOf] = useState(null);

  const idempotencyKeyRef = useRef(null);
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  // Immutable operation snapshot for submission → reconciliation (F09).
  // Generation invalidates stale resolve/admit/verify/search callbacks (F07).
  const generationRef = useRef(0);
  const eventIdRef = useRef(eventId);


  // Monitor browser network status (connectivity only, not API health).
  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    if (typeof window !== 'undefined') {
      setBrowserOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Fetch recent admissions (F11: separate connectivity vs API success).
  const {
    data: recentResponse,
    refetch: refetchRecent,
    isLoading: isLoadingRecent,
    error: recentError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['gate', eventId, 'recent'],
    queryFn: async ({ signal }) => {
      const res = await api.get(`/events/${eventId}/gate/recent`, { signal });
      return res.data || [];
    },
    enabled: Boolean(eventId),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    staleTime: 5000,
    retry: 1,
  });

  useEffect(() => {
    if (recentResponse !== undefined && eventId) {
      setApiReachable(true);
      setAsOf(new Date(dataUpdatedAt).toISOString());
    }
  }, [dataUpdatedAt, recentResponse, eventId]);

  useEffect(() => {
    if (recentError && eventId) {
      // Failed fetches must not become empty arrivals/zero totals (F11).
      if (recentError instanceof ApiError && recentError.status === 401) {
        // 401 handled centrally via SessionProvider; mark unreachable.
        setApiReachable(false);
      } else {
        setApiReachable(false);
      }
    }
  }, [recentError, eventId]);

  const recentAdmissions = recentResponse || [];
  const isOnline = browserOnline && apiReachable;

  // Reset gate UI when eventId changes (F07). In-flight callbacks carry the old
  // eventId/generation and are discarded; a pending uncertain write keeps its
  // original operation context in operationRef and never updates the new event.
  useEffect(() => {
    if (eventIdRef.current !== eventId) {
      generationRef.current += 1;
      eventIdRef.current = eventId;
      setGateState(operationRef.current ? 'lost_response' : 'idle');
      setApiReachable(false);
      setAsOf(null);
      setCurrentGuest(null);
      setGateEvent(null);
      setActualCompanions(0);
      setResolvedAt(null);
      setErrorDetails(null);
      idempotencyKeyRef.current = null;
      setIdempotencyKey(null);
      // Do NOT clear operationRef here: an uncertain write retains its original
      // {eventId,...} for reconciliation and its late response is discarded
      // because its eventId no longer matches eventIdRef.current.
    }
  }, [eventId, operationRef, setGateState]);

  useEffect(() => () => { generationRef.current += 1; }, []);

  const resetToIdle = useCallback(() => {
    if (operationRef.current || stateRef.current === 'submitting') return;
    generationRef.current += 1;
    operationRef.current = null;
    setGateState('idle');
    setCurrentGuest(null);
    setGateEvent(null);
    setActualCompanions(0);
    setResolvedAt(null);
    setErrorDetails(null);
    idempotencyKeyRef.current = null;
    setIdempotencyKey(null);
  }, [operationRef, setGateState]);

  /**
   * Resolve an invitation via QR token or guest ID. Does NOT admit.
   * Locked during submission/uncertainty to preserve one operation (F09).
   */
  const resolve = useCallback(
    async (payload, scanMethod = 'camera') => {
      const capturedEventId = eventIdRef.current;
      if (!capturedEventId) return;
      const cur = stateRef.current;
      // Lock competing inputs during resolution/submission/uncertainty (F09).
      if (cur === 'resolving' || cur === 'submitting' || cur === 'lost_response') return;

      const gen = generationRef.current + 1;
      generationRef.current = gen;
      setGateState('resolving');
      setErrorDetails(null);
      setMethod(scanMethod);

      try {
        const res = await api.post(`/events/${capturedEventId}/gate/resolve`, payload);
        if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
        const guest = res.data?.guest;
        const event = res.data?.event;
        setCurrentGuest(guest || null);
        setGateEvent(event || null);
        setResolvedAt(Date.now());
        setActualCompanions(0);
        const key = generateUuid();
        idempotencyKeyRef.current = key;
        setIdempotencyKey(key);
        operationRef.current = null;

        if (!guest) {
          setGateState('invalid_invitation');
          setErrorDetails({ code: 'INVALID_INVITATION', message: 'Invitation not valid' });
          return;
        }
        if (event && event.status !== 'live') {
          setGateState(event.status === 'draft' ? 'draft_event' : 'closed_event');
          return;
        }
        if (guest.checkIn) {
          setGateState('already_admitted');
          return;
        }
        setGateState('ready');
      } catch (err) {
        if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
        if (err instanceof ApiError) {
          if (err.code === 'INVALID_INVITATION' || err.status === 404) {
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
            setCurrentGuest(null);
            setGateEvent(null);
            setGateState('session_expired');
            setErrorDetails({ code: 'UNAUTHENTICATED', message: err.message });
            return;
          }
          if (err.status === 0 || err.code === 'SERVICE_UNAVAILABLE' || err.code === 'LOST_RESPONSE') {
            setGateState('network_failure');
            setErrorDetails({ code: 'NETWORK_ERROR', message: err.message });
            return;
          }
          setErrorDetails({ code: err.code, message: err.message });
          setGateState('idle');
        } else {
          if (err?.name === 'AbortError') return;
          setGateState('network_failure');
          setErrorDetails({ code: 'NETWORK_ERROR', message: err.message });
        }
      }
    },
    [operationRef, setGateState],
  );

  const updateCompanions = useCallback(
    (count) => {
      // Locked during submission/uncertainty (F09).
      const cur = stateRef.current;
      if (cur === 'submitting' || cur === 'lost_response' || cur === 'resolving') return;
      if (!currentGuest) return;
      setActualCompanions(clampCompanions(count, currentGuest.allowedCompanions));
    },
    [currentGuest],
  );

  const handleAlreadyCheckedIn = useCallback(
    (err, gen, capturedEventId) => {
      if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
      // F08: consume safe guest DTO in details.guest; never fabricate.
      const serverGuest = err.details?.guest;
      if (serverGuest && serverGuest.checkIn) {
        setCurrentGuest(serverGuest);
        setResolvedAt(Date.now());
        setActualCompanions(0);
      } else if (serverGuest) {
        setCurrentGuest(serverGuest);
        setResolvedAt(Date.now());
      } else {
        // No details: re-resolve before displaying any count/time/operator.
        // Keep current preview but do not invent admission details.
      }
      setGateState(serverGuest?.checkIn ? 'already_admitted' : 'network_failure');
      setErrorDetails({ code: 'ALREADY_CHECKED_IN', message: err.message, details: err.details });
    },
    [],
  );

  /**
   * Submit admission with server confirmation. Uses an immutable operation
   * snapshot; stale previews re-resolve and require reconfirmation (F09).
   */
  const admit = useCallback(async () => {
    const capturedEventId = eventIdRef.current;
    if (!capturedEventId || !currentGuest || stateRef.current !== 'ready' || operationRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setGateState('network_failure');
      setErrorDetails({ code: 'NETWORK_ERROR', message: 'Offline — revalidate before admission' });
      return;
    }

    const gen = generationRef.current + 1;
    generationRef.current = gen;

    // Staleness check: re-verify with fresh data directly (F09).
    if (resolvedAt && Date.now() - resolvedAt > 30000) {
      setGateState('resolving');
      try {
        const verifyRes = await api.post(`/events/${capturedEventId}/gate/resolve`, {
          guestId: currentGuest.id,
        });
        if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
        const freshGuest = verifyRes.data?.guest;
        const freshEvent = verifyRes.data?.event;
        if (!freshGuest) {
          setCurrentGuest(null);
          setGateState('invalid_invitation');
          return;
        }
        setCurrentGuest(freshGuest);
        if (freshEvent) setGateEvent(freshEvent);
        setResolvedAt(Date.now());
        // Clamp to fresh allowance.
        setActualCompanions((prev) => clampCompanions(prev, freshGuest.allowedCompanions));

        if (freshEvent && freshEvent.status !== 'live') {
          setGateState(freshEvent.status === 'draft' ? 'draft_event' : 'closed_event');
          return;
        }
        if (freshGuest.checkIn) {
          setGateState('already_admitted');
          return;
        }
        // Allowance/details changed → require deliberate reconfirmation (F09).
        if (
          freshGuest.version !== currentGuest.version ||
          freshGuest.allowedCompanions !== currentGuest.allowedCompanions ||
          freshGuest.name !== currentGuest.name
        ) {
          setGateState('ready');
          setErrorDetails({
            code: 'VERSION_CONFLICT',
            message: 'Details changed — review updated preview before confirming',
          });
          return;
        }
      } catch (err) {
        if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
        if (err instanceof ApiError && (err.status === 401 || err.code === 'UNAUTHENTICATED')) {
          setCurrentGuest(null);
          setGateEvent(null);
          setGateState('session_expired');
          setErrorDetails({ code: 'UNAUTHENTICATED', message: err.message });
          return;
        }
        if (err instanceof ApiError && (err.code === 'EVENT_CLOSED' || err.code === 'EVENT_NOT_LIVE')) {
          setGateState('closed_event');
          setErrorDetails({ code: err.code, message: err.message });
          return;
        }
        setGateState('network_failure');
        setErrorDetails({ code: 'STALE_VERIFICATION_FAILED', message: err.message });
        return;
      }
      // Re-arm generation for the actual submit below.
      generationRef.current = gen;
    }

    // Snapshot immutable operation (F09).
    const snapshotGuest = currentGuest;
    const key = idempotencyKeyRef.current || generateUuid();
    idempotencyKeyRef.current = key;
    setIdempotencyKey(key);
    const operation = {
      eventId: capturedEventId,
      guestId: snapshotGuest.id,
      version: snapshotGuest.version,
      actualCompanions: clampCompanions(actualCompanions, snapshotGuest.allowedCompanions),
      method,
      key,
    };
    operationRef.current = operation;

    setGateState('submitting');
    setErrorDetails(null);

    try {
      const res = await api.post(
        `/events/${operation.eventId}/checkins`,
        {
          guestId: operation.guestId,
          version: operation.version,
          actualCompanions: operation.actualCompanions,
          method: operation.method,
        },
        { headers: { 'Idempotency-Key': operation.key } },
      );
      if (gen !== generationRef.current || operation.eventId !== eventIdRef.current) {
        // Never associate an old write with the new event (F07). Server truth
        // stands; operator reconciles after switching back / via recent/stats.
        return;
      }
      const admittedGuest = res.data;
      if (!admittedGuest?.checkIn) throw new ApiError({ status: 0, code: 'LOST_RESPONSE', message: 'Admission response is incomplete' });
      setCurrentGuest(admittedGuest);
      if (admittedGuest?.checkIn) {
        setActualCompanions(admittedGuest.checkIn.actualCompanions ?? operation.actualCompanions);
      }
      setGateState('admitted');
      operationRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['gate', capturedEventId, 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['stats', capturedEventId] });
      refetchRecent();
    } catch (err) {
      if (gen !== generationRef.current || operation.eventId !== eventIdRef.current) return;
      if (err instanceof ApiError) {
        if (err.code === 'ALREADY_CHECKED_IN') {
          handleAlreadyCheckedIn(err, gen, capturedEventId);
          operationRef.current = null;
          queryClient.invalidateQueries({ queryKey: ['gate', capturedEventId, 'recent'] });
          queryClient.invalidateQueries({ queryKey: ['stats', capturedEventId] });
          return;
        }
        if (err.code === 'EVENT_CLOSED' || err.code === 'EVENT_NOT_LIVE') {
          setGateState('closed_event');
          setErrorDetails({ code: err.code, message: err.message });
          operationRef.current = null;
          return;
        }
        if (err.code === 'UNAUTHENTICATED' || err.status === 401) {
          setCurrentGuest(null);
          setGateEvent(null);
          setGateState('session_expired');
          setErrorDetails({ code: 'UNAUTHENTICATED', message: err.message });
          // Keep operationRef for reconciliation after re-login (F10).
          return;
        }
        if (err.code === 'VERSION_CONFLICT') {
          try {
            const reRes = await api.post(`/events/${capturedEventId}/gate/resolve`, {
              guestId: operation.guestId,
            });
            if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
            setCurrentGuest(reRes.data?.guest || null);
            setResolvedAt(Date.now());
            setActualCompanions(0);
            operationRef.current = null;
            setGateEvent(reRes.data?.event || null);
            if (reRes.data?.guest?.checkIn) setGateState('already_admitted');
            else if (!reRes.data?.guest) setGateState('invalid_invitation');
            else setGateState(reRes.data?.event?.status === 'live' ? 'ready' : reRes.data?.event?.status === 'draft' ? 'draft_event' : 'closed_event');
          } catch {
            if (gen !== generationRef.current) return;
            setGateState('idle');
            operationRef.current = null;
          }
          setErrorDetails({ code: 'VERSION_CONFLICT', message: err.message });
          return;
        }
        // Unknown outcome (timeouts, 502/504, network) → uncertain, keep key (F09).
        if (
          err.status === 0 || err.status >= 500 ||
          err.code === 'SERVICE_UNAVAILABLE' ||
          err.code === 'LOST_RESPONSE' ||
          err.status === 502 ||
          err.status === 504
        ) {
          setGateState('lost_response');
          setErrorDetails({ code: 'LOST_RESPONSE', message: err.message });
          return;
        }
        // Definite rejection → back to ready for deliberate retry as new op.
        setErrorDetails({ code: err.code, message: err.message });
        setGateState('ready');
        operationRef.current = null;
      } else {
        if (err?.name === 'AbortError') {
          if (capturedEventId !== eventIdRef.current) return;
          setGateState('lost_response');
          setErrorDetails({ code: 'LOST_RESPONSE', message: 'Request aborted — outcome unknown' });
          return;
        }
        setGateState('lost_response');
        setErrorDetails({ code: 'LOST_RESPONSE', message: err.message });
      }
    }
  }, [eventId, currentGuest, resolvedAt, actualCompanions, method, queryClient, refetchRecent, handleAlreadyCheckedIn, operationRef, setGateState]);

  /**
   * Retry with the EXACT original payload/key; then resolve server truth (F09).
   */
  const retryAdmission = useCallback(async () => {
    if (stateRef.current === 'submitting' || stateRef.current === 'resolving') return;
    const op = operationRef.current;
    if (!op) {
      if (currentGuest) await resolve({ guestId: currentGuest.id }, method);
      return;
    }
    const capturedEventId = op.eventId;
    if (capturedEventId !== eventIdRef.current) return; // never retry into a new event
    const gen = generationRef.current + 1;
    generationRef.current = gen;
    setGateState('submitting');
    setErrorDetails(null);

    try {
      await api.post(
        `/events/${op.eventId}/checkins`,
        {
          guestId: op.guestId,
          version: op.version,
          actualCompanions: op.actualCompanions,
          method: op.method,
        },
        { headers: { 'Idempotency-Key': op.key } },
      );
      if (gen !== generationRef.current || op.eventId !== eventIdRef.current) return;
      // A replay is historical success. A reset/correction may have followed it.
      // Never fall back to the historical admission when current truth is unknown.
      const cur = await api.post(`/events/${op.eventId}/gate/resolve`, { guestId: op.guestId });
      if (gen !== generationRef.current || op.eventId !== eventIdRef.current) return;
      const fresh = cur.data?.guest;
      if (!fresh) throw new Error('Current admission could not be verified');
      setCurrentGuest(fresh);
      setGateEvent(cur.data?.event || null);
      setResolvedAt(Date.now());
      setActualCompanions(fresh.checkIn?.actualCompanions ?? 0);
      setGateState(fresh.checkIn ? 'admitted' : cur.data?.event?.status === 'live' ? 'ready' : cur.data?.event?.status === 'draft' ? 'draft_event' : 'closed_event');
      operationRef.current = null;
      idempotencyKeyRef.current = null;
      setIdempotencyKey(null);
      queryClient.invalidateQueries({ queryKey: ['gate', op.eventId, 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['stats', op.eventId] });
      refetchRecent();
    } catch (err) {
      if (gen !== generationRef.current || op.eventId !== eventIdRef.current) return;
      if (err instanceof ApiError && err.code === 'ALREADY_CHECKED_IN') {
        handleAlreadyCheckedIn(err, gen, op.eventId);
        operationRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['gate', op.eventId, 'recent'] });
        queryClient.invalidateQueries({ queryKey: ['stats', op.eventId] });
        refetchRecent();
        return;
      }
      if (err instanceof ApiError && (err.status === 401 || err.code === 'UNAUTHENTICATED')) {
        setCurrentGuest(null);
        setGateEvent(null);
        setGateState('session_expired');
        setErrorDetails({ code: 'UNAUTHENTICATED', message: err.message });
        return;
      }
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        operationRef.current = null;
        idempotencyKeyRef.current = null;
        setIdempotencyKey(null);
        setGateState('idle');
        if (err.status === 404) {
          setCurrentGuest(null);
          setGateState('invalid_invitation');
        } else {
          await resolve({ guestId: op.guestId }, op.method);
        }
        setErrorDetails({ code: err.code, message: err.message });
        return;
      }
      setGateState('lost_response');
      setErrorDetails({
        code: err instanceof ApiError ? err.code : 'LOST_RESPONSE',
        message: err.message,
      });
    }
  }, [currentGuest, method, queryClient, refetchRecent, resolve, handleAlreadyCheckedIn, operationRef, setGateState]);

  /**
   * Verify whether a lost request succeeded. Applies event lifecycle (F09/F11).
   */
  const verifyStatus = useCallback(async () => {
    if (stateRef.current === 'submitting' || stateRef.current === 'resolving') return;
    const op = operationRef.current;
    const guestId = op?.guestId || currentGuest?.id;
    const capturedEventId = op?.eventId || eventIdRef.current;
    if (!capturedEventId || !guestId) return;
    if (capturedEventId !== eventIdRef.current) return;
    const gen = generationRef.current + 1;
    generationRef.current = gen;

    setGateState('resolving');
    try {
      const res = await api.post(`/events/${capturedEventId}/gate/resolve`, { guestId });
      if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
      const guest = res.data?.guest;
      const event = res.data?.event;
      if (!guest) {
        setCurrentGuest(null);
        setGateState(op ? 'lost_response' : 'invalid_invitation');
        return;
      }
      setCurrentGuest(guest);
      if (event) setGateEvent(event);
      setResolvedAt(Date.now());
      setActualCompanions(0);
      if (guest.checkIn) {
        setGateState('admitted');
        operationRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['gate', capturedEventId, 'recent'] });
        queryClient.invalidateQueries({ queryKey: ['stats', capturedEventId] });
        refetchRecent();
      } else {
        // A read cannot rule out a still-running original write. Keep exact
        // intent locked until the same-key retry returns a definitive result.
        setGateState(op ? 'lost_response' : event?.status === 'live' ? 'ready' : event?.status === 'draft' ? 'draft_event' : 'closed_event');
      }
    } catch (err) {
      if (gen !== generationRef.current || capturedEventId !== eventIdRef.current) return;
      if (err instanceof ApiError && (err.status === 401 || err.code === 'UNAUTHENTICATED')) {
        setCurrentGuest(null);
        setGateEvent(null);
        setGateState('session_expired');
        setErrorDetails({ code: 'UNAUTHENTICATED', message: err.message });
        return;
      }
      setGateState(op ? 'lost_response' : 'network_failure');
      setErrorDetails({
        code: err instanceof ApiError ? err.code : 'UNKNOWN',
        message: err.message,
      });
    }
  }, [currentGuest, queryClient, refetchRecent, operationRef, setGateState]);

  const derivedPartySize = 1 + actualCompanions;
  const isBusy =
    gateState === 'resolving' || gateState === 'submitting' || gateState === 'lost_response';

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
    browserOnline,
    apiReachable,
    recentError,
    asOf,
    recentAdmissions,
    isLoadingRecent,
    isBusy,
    resolve,
    setActualCompanions: updateCompanions,
    admit,
    retryAdmission,
    verifyStatus,
    resetToIdle,
    refetchRecent,
  };
}
