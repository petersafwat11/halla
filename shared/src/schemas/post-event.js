/**
 * Post-event guest portal schemas — token validation, content fetch,
 * comments, likes, host content management.
 *
 * Mirrors backend `halaa-backend/src/modules/post-event/post-event.validation.js`.
 * Error messages stay opaque English; web/mobile screens translate via
 * i18n keys at the call site if needed.
 */
import { z } from "zod";

// ============================================
// POST SCHEMAS
// ============================================

export const PostType = z.enum(["photo", "video", "message", "gallery"]);

export const CommentSchema = z.object({
  _id: z.string(),
  guest: z.object({
    _id: z.string(),
    name: z.string(),
  }),
  text: z.string(),
  images: z
    .array(
      z.object({
        url: z.string(),
        thumbnail: z.string().optional(),
      })
    )
    .optional(),
  createdAt: z.string().datetime(),
});

export const PostSchema = z.object({
  _id: z.string(),
  type: PostType,
  content: z.object({
    text: z.string().optional(),
    mediaUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
  }),
  likesCount: z.number(),
  commentsCount: z.number(),
  userLiked: z.boolean().optional(),
  createdAt: z.string().datetime(),
});

// ============================================
// TOKEN VALIDATION
// ============================================

export const TokenValidationResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    valid: z.boolean(),
    guest: z.object({
      _id: z.string(),
      name: z.string(),
    }),
    event: z.object({
      _id: z.string(),
      title: z.string().optional(),
      date: z.string().optional(),
    }),
    sessionToken: z.string(),
  }),
});

// ============================================
// CONTENT
// ============================================

export const PostEventContentResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    title: z.string(),
    titleAr: z.string().optional(),
    description: z.string().optional(),
    descriptionAr: z.string().optional(),
    coverImage: z.string().optional(),
    eventInfo: z.object({
      title: z.string().optional(),
      date: z.string().optional(),
      hostName: z.string().optional(),
    }),
    posts: z.array(PostSchema),
    settings: z.object({
      allowComments: z.boolean(),
      allowLikes: z.boolean(),
      allowGuestImages: z.boolean(),
    }),
    stats: z
      .object({
        totalViews: z.number().optional(),
        uniqueVisitors: z.number().optional(),
      })
      .optional(),
  }),
});

// ============================================
// INTERACTIONS
// ============================================

export const LikeToggleResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    liked: z.boolean(),
    likesCount: z.number(),
  }),
});

export const AddCommentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment cannot exceed 1000 characters"),
  // `File` is web-only; mobile passes plain objects with `uri`. Use
  // `z.any()` so the same schema validates on both platforms.
  images: z
    .array(z.any())
    .max(3, "Maximum 3 images allowed")
    .optional(),
});

export const AddCommentResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    comment: CommentSchema,
    commentsCount: z.number(),
  }),
});

export const GetCommentsResponseSchema = z.object({
  status: z.literal("success"),
  results: z.number(),
  data: z.object({
    comments: z.array(CommentSchema),
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalComments: z.number(),
    }),
  }),
});

// ============================================
// HOST CONTENT MANAGEMENT
// ============================================

export const CreatePostEventContentSchema = z.object({
  title: z.string().max(200, "Title cannot exceed 200 characters").optional(),
  titleAr: z
    .string()
    .max(200, "Arabic title cannot exceed 200 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
  descriptionAr: z
    .string()
    .max(1000, "Arabic description cannot exceed 1000 characters")
    .optional(),
  coverImage: z.any().optional(),
  settings: z
    .object({
      allowComments: z.boolean().optional(),
      allowLikes: z.boolean().optional(),
      allowGuestImages: z.boolean().optional(),
    })
    .optional(),
});

export const AddPostSchema = z.object({
  type: PostType,
  text: z.string().max(2000, "Text cannot exceed 2000 characters").optional(),
  media: z.any().optional(),
});

const postEventSchemas = {
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
};

export default postEventSchemas;
