/**
 * @halla/shared compat shim — post-event schemas live in
 * `@halla/shared/schemas/post-event` after the Phase 1 migration. This
 * file is a re-export so existing imports keep working; new code should
 * import from shared directly.
 *
 * Phase 8 will remove this shim and the consumers along with it.
 */
export {
  PostType,
  PostSchema,
  CommentSchema,
  TokenValidationResponseSchema,
  PostEventContentResponseSchema,
  LikeToggleResponseSchema,
  AddCommentSchema,
  AddCommentResponseSchema,
  GetCommentsResponseSchema,
  CreatePostEventContentSchema,
  AddPostSchema,
} from "@halla/shared/schemas/post-event";

export { default } from "@halla/shared/schemas/post-event";
