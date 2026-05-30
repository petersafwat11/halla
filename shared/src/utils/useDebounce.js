import { useEffect, useState } from "react";

/**
 * Debounce a value for `delayMs` milliseconds.
 *
 * Used by both apps' search inputs (admin list screens, marketplace
 * filters) where every keystroke would otherwise refetch from the
 * backend. 500 ms is the conservative default agreed in the Phase 8
 * unification — long enough for typeahead, short enough to feel snappy.
 *
 * @template T
 * @param {T} value
 * @param {number} [delayMs=500]
 * @returns {T}
 */
export function useDebounce(value, delayMs = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

// Mobile previously used the name `useDebouncedValue`; alias kept so
// the rename can happen incrementally without touching every consumer
// in this slice.
export { useDebounce as useDebouncedValue };

export default useDebounce;
