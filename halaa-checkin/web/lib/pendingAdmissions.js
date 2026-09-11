// Volatile, actor-scoped intent survives route unmount and reauthentication.
// Never persist invitation tokens, guest details, credentials or cookies.
const pending = new Map();

export function pendingAdmissionSlot(actorId, eventId) {
  const key = `${actorId}:${eventId}`;
  return {
    get current() { return pending.get(key) || null; },
    set current(operation) {
      if (operation && actorId && eventId) pending.set(key, Object.freeze({ ...operation }));
      else pending.delete(key);
    },
  };
}

export function pendingEventFor(actorId) {
  for (const [key, operation] of pending) {
    if (key.startsWith(`${actorId}:`)) return operation.eventId;
  }
  return null;
}
