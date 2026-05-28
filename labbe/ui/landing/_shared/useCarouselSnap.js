"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const SCROLL_GUARD_MS = 600;
const WHEEL_THROTTLE_MS = 420;

/**
 * Hook for a horizontally-scrolling snap carousel.
 *
 * Fixes:
 *  - Race between programmatic smooth-scroll and the onScroll handler: a guard
 *    flag suppresses idx-from-scrollLeft updates while a click/wheel-driven
 *    scroll is animating.
 *  - Correct maxIdx based on how many cards actually fit (so the last dot
 *    isn't a clamped no-op).
 *  - Direction-agnostic math: handles RTL containers where scrollLeft is
 *    negative without forcing dir="ltr" on the track.
 */
export default function useCarouselSnap({ gap = 14, totalItems }) {
  const trackRef = useRef(null);
  const throttleRef = useRef(false);
  const programmaticRef = useRef(false);
  const programmaticTimerRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const [maxIdx, setMaxIdx] = useState(0);

  const getMetrics = useCallback(() => {
    const el = trackRef.current;
    if (!el) return null;
    const cardW = el.firstElementChild?.offsetWidth || 0;
    const step = cardW + gap;
    if (step <= 0) return null;
    const visible = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    const max = Math.max(0, totalItems - visible);
    const isRTL = getComputedStyle(el).direction === "rtl";
    return { step, maxIdx: max, isRTL };
  }, [gap, totalItems]);

  useEffect(() => {
    const update = () => {
      const m = getMetrics();
      if (!m) return;
      setMaxIdx(m.maxIdx);
      setIdx((i) => Math.min(i, m.maxIdx));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [getMetrics]);

  const scrollToIdx = useCallback(
    (i) => {
      const el = trackRef.current;
      const m = getMetrics();
      if (!el || !m) return;
      const clamped = Math.min(Math.max(0, i), m.maxIdx);
      const target = clamped * m.step;
      programmaticRef.current = true;
      el.scrollTo({ left: m.isRTL ? -target : target, behavior: "smooth" });
      setIdx(clamped);
      clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = setTimeout(() => {
        programmaticRef.current = false;
      }, SCROLL_GUARD_MS);
    },
    [getMetrics],
  );

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) return;
    const el = trackRef.current;
    const m = getMetrics();
    if (!el || !m) return;
    const pos = Math.abs(el.scrollLeft);
    setIdx(Math.min(Math.max(0, Math.round(pos / m.step)), m.maxIdx));
  }, [getMetrics]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      if (throttleRef.current) return;
      throttleRef.current = true;
      setTimeout(() => {
        throttleRef.current = false;
      }, WHEEL_THROTTLE_MS);
      const delta = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
      scrollToIdx(idx + delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [idx, scrollToIdx]);

  useEffect(() => () => clearTimeout(programmaticTimerRef.current), []);

  return { trackRef, idx, maxIdx, scrollToIdx, handleScroll };
}
