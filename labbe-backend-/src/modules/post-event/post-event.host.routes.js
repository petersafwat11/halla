/**
 * Post-Event Content — Host-facing routes.
 * All routes require authentication.
 * @module modules/post-event/post-event.host.routes
 */

const express = require("express");
const router = express.Router();

const postEventController = require("./post-event.controller");
const { protect } = require("../../shared/middleware/auth");
const { validateObjectId, validateZod } = require("../../shared/middleware/validation");
const { idempotency } = require("../../shared/middleware/idempotency");
const {
  authLimiter,
  otpHourlyLimiter,
} = require("../../shared/middleware/rateLimiter");
const { uploadMedia } = require("../../shared/utils/s3Upload");
const {
  uploadMediaSchema,
  updateThankYouMessageSchema,
  updateMessagingTemplateSchema,
  bulkGuestActionSchema,
  sendAccessLinksSchema,
} = require("./post-event.validation");

router.use(protect);

/**
 * @swagger
 * /post-event/{eventId}:
 *   get:
 *     summary: Get host content management view
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
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
 * /post-event/{eventId}/media:
 *   post:
 *     summary: Upload media (photos and/or videos)
 *     description: |
 *       Unified media upload endpoint. Accepts a mixed batch of photos
 *       and videos (up to 20 files). The server distinguishes type by MIME
 *       prefix and stores everything in `PostEventContent.media[]`.
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/media",
  validateObjectId("eventId"),
  uploadMedia.array("files", 20),
  validateZod(uploadMediaSchema),
  postEventController.uploadMedia
);

/**
 * @swagger
 * /post-event/{eventId}/media/{mediaId}:
 *   delete:
 *     summary: Delete a media item (photo or video)
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/:eventId/media/:mediaId",
  validateObjectId("eventId"),
  postEventController.deleteMedia
);

/**
 * @swagger
 * /post-event/{eventId}/thank-you:
 *   patch:
 *     summary: Update thank-you message
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text: { type: string, maxLength: 2000 }
 *               textAr: { type: string, maxLength: 2000 }
 *               description: { type: string, maxLength: 5000 }
 *               descriptionAr: { type: string, maxLength: 5000 }
 *     responses:
 *       200:
 *         description: Thank-you message updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/:eventId/thank-you",
  validateObjectId("eventId"),
  validateZod(updateThankYouMessageSchema),
  postEventController.updateThankYouMessage
);

/**
 * @swagger
 * /post-event/{eventId}/messaging:
 *   patch:
 *     summary: Save the host's chosen Taqnyat WhatsApp template
 *     description: |
 *       Mirrors `PATCH /events/{id}/invitation-settings` (StepFour).
 *       Persists the template ObjectId on
 *       `PostEventContent.taqnyatTemplate.templateRef`. The dispatch flow
 *       at `/send-access-links` resolves this template and substitutes its
 *       `varMapping[]` against the post-event context (guest, event,
 *       access link).
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taqnyatTemplateRef]
 *             properties:
 *               taqnyatTemplateRef:
 *                 type: string
 *                 description: Canonical TaqnyatTemplate ObjectId
 *     responses:
 *       200:
 *         description: Template saved successfully
 *       400:
 *         description: Template not found in cache
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch(
  "/:eventId/messaging",
  validateObjectId("eventId"),
  validateZod(updateMessagingTemplateSchema),
  postEventController.updateMessagingTemplate
);

/**
 * @swagger
 * /post-event/{eventId}/publish:
 *   post:
 *     summary: Publish post-event content to guests
 *     description: |
 *       Marks content published and (non-blocking) generates access tokens
 *       and dispatches WhatsApp template messages with native SMS fallback.
 *       If no Taqnyat template is configured, the auto-send is skipped and
 *       the host can re-trigger via `/send-access-links`.
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Content published successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/publish",
  validateObjectId("eventId"),
  idempotency({ scope: "post_event_publish" }),
  postEventController.publishContent
);

/**
 * @swagger
 * /post-event/{eventId}/unpublish:
 *   patch:
 *     summary: Unpublish (revoke) post-event content
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Content unpublished successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:eventId/unpublish",
  validateObjectId("eventId"),
  postEventController.unpublishContent
);

/**
 * @swagger
 * /post-event/{eventId}/generate-tokens:
 *   post:
 *     summary: Generate bulk access tokens for guests
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestIds:
 *                 type: array
 *                 items: { type: string }
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
  authLimiter,
  idempotency({ scope: "post_event_generate_tokens" }),
  validateZod(bulkGuestActionSchema),
  postEventController.generateBulkTokens
);

/**
 * @swagger
 * /post-event/{eventId}/send-access-links:
 *   post:
 *     summary: Send post-event access links to guests
 *     description: |
 *       Sends each selected guest a Taqnyat WhatsApp template message with
 *       a native SMS fallback (Taqnyat dispatches SMS automatically when
 *       the recipient has no WhatsApp capability).
 *
 *       The template comes from `content.taqnyatTemplate.templateRef`
 *       (saved via `PATCH /:eventId/messaging`) unless overridden via the
 *       `taqnyatTemplateRef` field in the request body. If no template is
 *       resolvable, returns `400 NoTemplateConfigured` with a CTA pointing
 *       at the host's messaging-templates settings page.
 *     tags: [Post-Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestIds:
 *                 type: array
 *                 items: { type: string }
 *               filter:
 *                 type: string
 *                 enum: [attended, confirmed, all]
 *               taqnyatTemplateRef:
 *                 type: string
 *                 description: Optional override; defaults to the saved template
 *     responses:
 *       200:
 *         description: |
 *           Access links dispatched. Response includes per-channel breakdown
 *           `{ whatsapp, sms, failed }`.
 *       400:
 *         description: No Taqnyat template configured
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/:eventId/send-access-links",
  validateObjectId("eventId"),
  otpHourlyLimiter,
  idempotency({ scope: "post_event_access" }),
  validateZod(sendAccessLinksSchema),
  postEventController.sendBulkAccessLinks
);

module.exports = router;
