/** Coalesces map-ticket refreshes and renews before expiry on web and native. */
export function createMapSessionManager({ requestSession, onSession, onError,
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let pending, timer, disposed = false, expiresAt = 0;
  const controller = new AbortController();
  function refresh(force = false) {
    if (disposed) return Promise.resolve();
    if (pending) return pending;
    if (!force && expiresAt > now() + 60000) return Promise.resolve();
    clearTimer(timer);
    pending = Promise.resolve().then(() => requestSession(controller.signal)).then(session => {
      if (disposed) return;
      if (typeof session?.token !== 'string' || !session.token || !Number.isFinite(session.expiresIn) || session.expiresIn < 60) {
        throw new Error('Invalid map session');
      }
      expiresAt = now() + session.expiresIn * 1000;
      onSession(session);
      timer = setTimer(() => refresh(true), Math.max(1000, session.expiresIn * 1000 - 60000));
    }).catch(error => {
      if (disposed) return;
      onError(error);
      timer = setTimer(() => refresh(true), 30000);
    }).finally(() => { pending = null; });
    return pending;
  }
  return {
    refresh,
    dispose() { disposed = true; clearTimer(timer); controller.abort(); },
  };
}
