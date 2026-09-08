'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { api, setCsrfToken, ApiError } from '../lib/api.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/auth/session');
      if (res?.data) {
        setSession(res.data);
        setCsrfToken(res.data.csrfToken);
        setIsExpired(false);
      } else {
        setSession(null);
        setCsrfToken(null);
      }
    } catch (err) {
      setSession(null);
      setCsrfToken(null);
      if (err instanceof ApiError && err.status === 401 && err.code === 'UNAUTHENTICATED') {
        // Unauthenticated is expected when not logged in
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async ({ username, password }) => {
    // Clear query cache on login to prevent leaking data
    queryClient.clear();
    const res = await api.post('/auth/login', { username, password });
    if (res?.data) {
      setCsrfToken(res.data.csrfToken);
      // Fetch full session details
      const sessionRes = await api.get('/auth/session');
      setSession(sessionRes.data);
      setIsExpired(false);
      return sessionRes.data;
    }
    return null;
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setCsrfToken(null);
      setSession(null);
      setIsExpired(false);
      queryClient.clear();
      router.push(`/${lang}/login`);
    }
  }, [lang, queryClient, router]);

  const value = {
    user: session?.user || null,
    role: session?.role || null,
    assignedEventIds: session?.assignedEventIds || [],
    csrfToken: session?.csrfToken || null,
    expiresAt: session?.expiresAt || null,
    isLoading,
    isAuthenticated: !!session?.user,
    isExpired,
    setIsExpired,
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
