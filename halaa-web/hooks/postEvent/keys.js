export const postEventKeys = {
  all: ["post-event"],
  // Guest-portal keys (public via token).
  validate: (token) => [...postEventKeys.all, "validate", token],
  content: (eventId) => [...postEventKeys.all, "content", eventId],
  // Post-level comments (one post per event). Calling with just eventId
  // matches every page/limit variant for invalidation.
  comments: (eventId, page, limit) =>
    [...postEventKeys.all, "comments", eventId, page, limit].filter(
      (k) => k !== undefined
    ),
  // Host-management keys.
  hostContent: (eventId) => [...postEventKeys.all, "host", eventId],
};
