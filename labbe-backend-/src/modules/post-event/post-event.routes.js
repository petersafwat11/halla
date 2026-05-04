/**
 * Post-Event Content Routes
 * @module modules/post-event/post-event.routes
 */

/**
 * @swagger
 * tags:
 *   name: Post-Event
 *   description: Post-event content sharing and gallery endpoints
 */

const express = require("express");
const router = express.Router();

const postEventController = require("./post-event.controller");
const { protect } = require("../../shared/middleware/auth");
const { guestAuth } = require("../../shared/middleware/guestAuth");
const { validateObjectId } = require("../../shared/middleware/validation");

// Use centralized S3 upload utility
const {
  uploadPostEventMedia,
  uploadMultipleImages,
  uploadMedia,
} = require("../../shared/utils/s3Upload");

// ============================================
// PUBLIC ROUTES (Token validation)
// ============================================

/**
 * @swagger
 * /post-event/validate:
 *   get:
 *     summary: Validate guest access token
 *     description: Validate a guest access token for post-event content
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get("/validate", postEventController.validateToken);

// ============================================
// GUEST ROUTES (Guest token required)
// ============================================

/**
 * @swagger
 * /post-event/{eventId}/content:
 *   get:
 *     summary: Get post-event content for guest
 *     description: Retrieve post-event content using guest authentication
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
 *     summary: Toggle like on post
 *     description: Toggle like on a post as a guest
 *     tags: [Post-Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
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
 *     summary: Add comment to post
 *     description: Add a comment to a post as a guest
 *     tags: [Post-Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/posts/:postId/comments",
  validateObjectId("eventId"),
  guestAuth,
  uploadMultipleImages,
  postEventController.addComment
);

/**
 * @swagger
 * /post-event/{eventId}/posts/{postId}/comments:
 *   get:
 *     summary: Get comments for post
 *     description: Retrieve paginated comments for a post
 *     tags: [Post-Event]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
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
  postEventController.getComments
);

// ============================================
// HOST ROUTES (Protected - requires login)
// ============================================

router.use(protect);

/**
 * @swagger
 * /post-event/{eventId}:
 *   get:
 *     summary: Get host content management view
 *     description: Get post-event content for host management
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
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
  "/:eventId",
  validateObjectId("eventId"),
  postEventController.getHostContent
);

/**
 * @swagger
 * /post-event/{eventId}/photos:
 *   post:
 *     summary: Upload photos
 *     description: Upload photos to post-event content
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Photos uploaded successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/photos",
  validateObjectId("eventId"),
  uploadMedia.array("photos", 20),
  postEventController.uploadPhotos
);

/**
 * @swagger
 * /post-event/{eventId}/videos:
 *   post:
 *     summary: Upload video
 *     description: Upload a video to post-event content
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/videos",
  validateObjectId("eventId"),
  uploadMedia.single("video"),
  postEventController.uploadVideo
);

/**
 * @swagger
 * /post-event/{eventId}/thank-you:
 *   patch:
 *     summary: Update thank you message
 *     description: Update the thank you message for post-event content
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Thank you message updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/:eventId/thank-you",
  validateObjectId("eventId"),
  postEventController.updateThankYouMessage
);

/**
 * @swagger
 * /post-event/{eventId}/photos/{photoId}:
 *   delete:
 *     summary: Delete photo
 *     description: Delete a photo from post-event content
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/:eventId/photos/:photoId",
  validateObjectId("eventId"),
  postEventController.deletePhoto
);

/**
 * @swagger
 * /post-event/{eventId}/videos/{videoId}:
 *   delete:
 *     summary: Delete video
 *     description: Delete a video from post-event content
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/:eventId/videos/:videoId",
  validateObjectId("eventId"),
  postEventController.deleteVideo
);

/**
 * @swagger
 * /post-event/{eventId}/publish:
 *   post:
 *     summary: Publish content
 *     description: Publish post-event content to guests
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content published successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/publish",
  validateObjectId("eventId"),
  postEventController.publishContent
);

router.patch(
  "/:eventId/unpublish",
  validateObjectId("eventId"),
  postEventController.unpublishContent
);

/**
 * @swagger
 * /post-event/{eventId}/generate-tokens:
 *   post:
 *     summary: Generate bulk access tokens
 *     description: Generate access tokens for guests in bulk
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               filter:
 *                 type: string
 *                 enum: [attended, confirmed, all]
 *     responses:
 *       200:
 *         description: Tokens generated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/generate-tokens",
  validateObjectId("eventId"),
  postEventController.generateBulkTokens
);

/**
 * @swagger
 * /post-event/{eventId}/send-emails:
 *   post:
 *     summary: Send bulk access emails
 *     description: Send post-event access emails to guests in bulk
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               filter:
 *                 type: string
 *                 enum: [attended, confirmed, all]
 *     responses:
 *       200:
 *         description: Emails sent successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
// FLOW-21-F04: renamed from send-emails — sends WhatsApp/SMS access links, not email
router.post(
  "/:eventId/send-access-links",
  validateObjectId("eventId"),
  postEventController.sendBulkAccessLinks
);

module.exports = router;
