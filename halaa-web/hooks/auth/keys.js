// Auth mutations don't currently cache anything queryable — this factory
// exists for symmetry with the rest of hooks/<domain>/ and for future
// additions (e.g. session/me queries).
export const authKeys = {
  all: ["auth"],
};
