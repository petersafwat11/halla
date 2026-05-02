/**
 * Post-Event Page Schemas
 * Zod validation schemas for post-event content and interactions
 */

import { z } from "zod";

// ============================================
// POST SCHEMAS
// ============================================

/**
 * Post type enum
 */
export const PostType = z.enum(["photo", "video", "message", "gallery"]);

/**
 * Comment schema
 */
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

/**
 * Post schema
 */
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
// TOKEN VALIDATION SCHEMAS
// ============================================

/**
 * Token validation response schema
 */
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
// CONTENT SCHEMAS
// ============================================

/**
 * Post-event content response schema
 */
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
// INTERACTION SCHEMAS
// ============================================

/**
 * Like toggle response schema
 */
export const LikeToggleResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    liked: z.boolean(),
    likesCount: z.number(),
  }),
});

/**
 * Add comment form schema
 */
export const AddCommentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment cannot exceed 1000 characters"),
  images: z
    .array(z.instanceof(File))
    .max(3, "Maximum 3 images allowed")
    .optional(),
});

/**
 * Add comment response schema
 */
export const AddCommentResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    comment: CommentSchema,
    commentsCount: z.number(),
  }),
});

/**
 * Get comments response schema
 */
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
// HOST CONTENT MANAGEMENT SCHEMAS
// ============================================

/**
 * Create post-event content schema (host)
 */
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
  coverImage: z.instanceof(File).optional(),
  settings: z
    .object({
      allowComments: z.boolean().optional(),
      allowLikes: z.boolean().optional(),
      allowGuestImages: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Add post schema (host)
 */
export const AddPostSchema = z.object({
  type: PostType,
  text: z.string().max(2000, "Text cannot exceed 2000 characters").optional(),
  media: z.union([z.instanceof(File), z.array(z.instanceof(File))]).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

/**
 * @typedef {z.infer<typeof PostType>} PostTypeValue
 * @typedef {z.infer<typeof PostSchema>} Post
 * @typedef {z.infer<typeof CommentSchema>} Comment
 * @typedef {z.infer<typeof TokenValidationResponseSchema>} TokenValidationResponse
 * @typedef {z.infer<typeof PostEventContentResponseSchema>} PostEventContentResponse
 * @typedef {z.infer<typeof LikeToggleResponseSchema>} LikeToggleResponse
 * @typedef {z.infer<typeof AddCommentSchema>} AddCommentForm
 */

// Named exports object
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
