/**
 * Post-Event Content — Guest-facing routes.
 * Token validation (public) + guest-auth read/like/comment.
 * @module modules/post-event/post-event.guest.routes
 */

const express = require("express");
const router = express.Router();

const postEventController = require("./post-event.controller");
const { guestAuth } = require("../../shared/middleware/guestAuth");
const { validateObjectId, validateZod } = require("../../shared/middleware/validation");
const { authLimiter } = require("../../shared/middleware/rateLimiter");
const { uploadMultipleImages } = require("../../shared/utils/s3Upload");
const {
  addCommentSchema,
  paginationSchema,
} = require("./post-event.validation");

// ============================================
// PUBLIC: Token validation
// ============================================

/**
 * @swagger
 * /post-event/validate:
 *   get:
 *     summary: Validate a guest access token
 *     description: |
 *       Validates a post-event access token (issued by the host's
 *       `/generate-tokens` or `/send-access-links` flow). Returns 410 Gone
 *       with a structured `reason` (qr_rotated / qr_revoked / qr_expired)
 *       when the token is no longer usable.
 *     tags: [Post-Event]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token validated successfully
 *       410:
 *         description: Token rotated, revoked, or expired
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get("/validate", authLimiter, postEventController.validateToken);

// ============================================
// GUEST-AUTH: requires a valid guest session token
// ============================================

/**
 * @swagger
 * /post-event/{eventId}/content:
 *   get:
 *     summary: Get post-event content for a guest
 *     tags: [Post-Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/:eventId/content",
  validateObjectId("eventId"),
  guestAuth,
  postEventController.getContent
);

/**
 * @swagger
 * /post-event/{eventId}/posts/{postId}/like:
 *   post:
 *     summary: Toggle like on a media item
 *     description: Single POST toggle — fires both like and unlike.
 *     tags: [Post-Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/posts/:postId/like",
  validateObjectId("eventId"),
  guestAuth,
  postEventController.toggleLike
);

/**
 * @swagger
 * /post-event/{eventId}/posts/{postId}/comments:
 *   post:
 *     summary: Add a comment to a media item
 *     tags: [Post-Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 1000
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/posts/:postId/comments",
  validateObjectId("eventId"),
  guestAuth,
  uploadMultipleImages,
  validateZod(addCommentSchema),
  postEventController.addComment
);

/**
 * @swagger
 * /post-event/{eventId}/posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a media item (paginated)
 *     tags: [Post-Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  "/:eventId/posts/:postId/comments",
  validateObjectId("eventId"),
  guestAuth,
  validateZod(paginationSchema, "query"),
  postEventController.getComments
);

module.exports = router;
