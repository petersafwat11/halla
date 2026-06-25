"use client";
/**
 * useUnsavedChanges
 *
 * Guards against accidental navigation when a form is dirty. Two cases:
 *   1. Browser-level navigation (tab close, F5, address-bar entry) via
 *      the window `beforeunload` event.
 *   2. In-app SPA navigation (Next.js router.push / Link clicks) via
 *      monkey-patching window.history.pushState/replaceState — which is
 *      what Next.js App Router uses under the hood for soft navigation.
 *
 * The patch reads `isDirty` from a ref so it always sees the latest value
 * without re-patching.
 */

import { useEffect, useRef } from "react";

export function useUnsavedChanges(isDirty, message) {
  const msg = message || "You have unsaved changes. Are you sure you want to leave?";
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Call this before a programmatic navigation that follows a successful save
  // so the pushState guard doesn't fire before React flushes the reset().
  const clearGuard = () => { isDirtyRef.current = false; };

  // beforeunload — full reload / tab close / external nav
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      // Chrome requires returnValue to be set. Modern browsers ignore the
      // string and show a generic message.
      e.returnValue = msg;
      return msg;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, msg]);

  // SPA navigation via Next.js App Router
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    const guard = (original) => function (...args) {
      if (isDirtyRef.current) {
        // eslint-disable-next-line no-alert
        const ok = window.confirm(msg);
        if (!ok) return;
      }
      return original(...args);
    };

    window.history.pushState = guard(originalPush);
    window.history.replaceState = guard(originalReplace);

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
    // Run once on mount; isDirtyRef stays current via the earlier effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { clearGuard };
}

export default useUnsavedChanges;
