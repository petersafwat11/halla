export const postEventKeys = {
  all: ["post-event"],
  // Guest-portal keys (public via token).
  validate: (token) => [...postEventKeys.all, "validate", token],
  content: (eventId) => [...postEventKeys.all, "content", eventId],
  comments: (eventId, postId, page, limit) => [
    ...postEventKeys.all,
    "comments",
    eventId,
    postId,
    page,
    limit,
  ],
  commentsForPost: (eventId, postId) => [
    ...postEventKeys.all,
    "comments",
    eventId,
    postId,
  ],
  // Host-management keys.
  hostContent: (eventId) => [...postEventKeys.all, "host", eventId],
};
