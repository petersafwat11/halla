// Volatile retry body, isolated by actor and event; never written to storage.
const imports = new Map();
export const pendingImports = {
  get: (actor, event) => imports.get(`${actor}:${event}`),
  set: (actor, event, value) => imports.set(`${actor}:${event}`, value),
  delete: (actor, event) => imports.delete(`${actor}:${event}`),
};
