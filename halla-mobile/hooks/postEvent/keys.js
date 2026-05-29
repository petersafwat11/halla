export const postEventKeys = {
  all: ["post-event"],
  validate: (token) => [...postEventKeys.all, "validate", token],
  content: (eventId) => [...postEventKeys.all, "content", eventId],
  comments: (eventId, postId, params) => [
    ...postEventKeys.all,
    "comments",
    eventId,
    postId,
    params || {},
  ],
  commentsForPost: (eventId, postId) => [
    ...postEventKeys.all,
    "comments",
    eventId,
    postId,
  ],
  // Mobile's host-content key includes an extra "content" segment vs web's
  // shape — both shapes are byte-identical to their respective prior literals.
  hostContent: (eventId) => [...postEventKeys.all, "host", "content", eventId],
};
