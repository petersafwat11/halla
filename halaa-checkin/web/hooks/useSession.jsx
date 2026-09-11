'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { api, setCsrfToken, setUnauthorizedHandler, ApiError } from '../lib/api.js';

const SessionContext = createContext(null);

/**
 * Normalize the authoritative session DTO `{ user, csrfToken, expiresAt }`.
 * The API returns role/assignments inside `user`; there are no top-level
 * `role` / `assignedEventIds` fields. Returns null for malformed payloads
 * so callers fail closed instead of rendering admin UI with a null role.
 */
export function normalizeSessionData(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const user = raw.user;
  if (!user || typeof user !== 'object') return null;
  if (user.role !== 'admin' && user.role !== 'reception') return null;
  return {
    user,
    csrfToken: typeof raw.csrfToken === 'string' ? raw.csrfToken : null,
    expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : null,
  };
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const authGeneration = useRef(0);
  const revocationRef = useRef(null);
  const sessionRef = useRef(null);
  sessionRef.current = session;

  const checkSession = useCallback(async () => {
    const generation = ++authGeneration.current;
    setIsLoading(true);
    try {
      const res = await api.get('/auth/session');
      if (generation !== authGeneration.current) return;
      const normalized = normalizeSessionData(res?.data);
      if (normalized) {
        setSession(normalized);
        setCsrfToken(normalized.csrfToken);
        setIsExpired(false);
      } else {
        setSession(null);
        setCsrfToken(null);
      }
    } catch (err) {
      if (generation !== authGeneration.current) return;
      setSession(null);
      setCsrfToken(null);
      if (err instanceof ApiError && err.status === 401 && err.code === 'UNAUTHENTICATED') {
        // Unauthenticated is expected when not logged in
      }
    } finally {
      if (generation === authGeneration.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
    return () => { authGeneration.current += 1; };
  }, [checkSession]);

  // Central 401 propagation (F10): any authenticated API 401 clears private
  // query/UI data; actor-scoped volatile admission intent survives route unmount,
  // and enters reauthentication. Network loss (status 0) is NOT expiry.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!sessionRef.current) return;
      authGeneration.current += 1;
      // Clear private cached data immediately; pendingAdmissions keeps only
      // the original actor-scoped write intent for reconciliation after login.
      try { queryClient.clear(); } catch { /* ignore */ }
      setCsrfToken(null);
      setSession(null);
      setIsExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  const login = useCallback(async ({ username, password }) => {
    const generation = ++authGeneration.current;
    // Clear query cache on login to prevent leaking data
    queryClient.clear();
    const res = await api.post('/auth/login', { username, password });
    if (generation !== authGeneration.current) throw new Error('Session changed during login');
    const normalizedLogin = normalizeSessionData(res?.data);
    if (normalizedLogin) {
      setCsrfToken(normalizedLogin.csrfToken);
    }
    // Fetch full session details (authoritative shape)
    const sessionRes = await api.get('/auth/session');
    if (generation !== authGeneration.current) throw new Error('Session changed during login');
    const normalized = normalizeSessionData(sessionRes?.data);
    if (!normalized) {
      setSession(null);
      setCsrfToken(null);
      throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Invalid session response' });
    }
    setSession(normalized);
    setIsLoading(false);
    revocationRef.current = null;
    setLogoutError(null);
    setCsrfToken(normalized.csrfToken);
    setIsExpired(false);
    return normalized;
  }, [queryClient]);

  const logout = useCallback(async () => {
    authGeneration.current += 1;
    const revocationToken = sessionRef.current?.csrfToken || revocationRef.current;
    revocationRef.current = revocationToken;
    // Hide local private data first, then attempt server revocation (F10).
    // A network loss must not silently restore a supposedly logged-out session.
    setCsrfToken(null);
    setSession(null);
    setIsExpired(false);
    setLogoutError(null);
    try { queryClient.clear(); } catch { /* ignore */ }
    router.push(`/${lang}/login`);
    try {
      await api.post('/auth/logout', undefined, { csrfToken: revocationToken });
      revocationRef.current = null;
      return { serverRevoked: true };
    } catch (err) {
      // Local data is already hidden; surface revocation failure explicitly
      // so the UI can offer retry instead of promising revocation.
      const message = err?.message || 'Logout may not have revoked the server session';
      setLogoutError(message);
      return { serverRevoked: false, error: message };
    }
  }, [lang, queryClient, router]);

  const value = {
    user: session?.user || null,
    role: session?.user?.role || null,
    assignedEventIds: session?.user?.assignedEventIds || [],
    csrfToken: session?.csrfToken || null,
    expiresAt: session?.expiresAt || null,
    isLoading,
    isAuthenticated: !!session?.user && !!session?.user?.role,
    isExpired,
    setIsExpired,
    logoutError,
    login,
    logout,
    refetchSession: checkSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
