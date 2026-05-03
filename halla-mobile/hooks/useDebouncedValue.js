import { useEffect, useState } from "react";

/**
 * Debounce a value for `delayMs` milliseconds.
 *
 * Used by admin list screens that drive a server-side `?search=` query
 * from the search box; without debouncing every keystroke would refetch
 * page 1 from the backend.
 *
 * @template T
 * @param {T} value
 * @param {number} [delayMs=350]
 * @returns {T}
 */
export function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

export default useDebouncedValue;
