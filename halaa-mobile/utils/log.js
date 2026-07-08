/**
 * Dev-only logger. Promoted from `services/authService.js` so every
 * service file shares one mute path. React Native `__DEV__` flips to
 * `false` in release bundles, so `dlog(...)` becomes a no-op there —
 * keeps chatty info out of production crash reporters and device logs
 * (PII safety). For errors, keep using `console.error(...)` directly so
 * release builds still surface real failures.
 */
export const dlog = (...args) => {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export default dlog;
