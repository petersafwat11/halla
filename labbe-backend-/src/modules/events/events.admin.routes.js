/**
 * Events Admin Routes
 * Admin-scoped event endpoints. Mounted at /events/admin from
 * events.routes.js so the public API surface stays at /events/admin/*.
 * @module modules/events/events.admin.routes
 */

const express = require("express");
const router = express.Router();

const eventsController = require("./events.controller");

const { requirePageAccess } = require("../../shared/middleware/rbac");
const { filterByWhitelabel } = require("../../shared/middleware/whitelabel");
const {
  validateObjectId,
  validateZod,
} = require("../../shared/middleware/validation");
const { ADMIN_PAGES } = require("../../shared/constants");
const { adminUpdateStatusSchema } = require("./events.validation");

/**
 * @swagger
 * /events/admin/all:
 *   get:
 *     summary: Get all events (admin)
 *     description: Retrieve all events. Requires admin role with events view permission
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  "/all",
  requirePageAccess(ADMIN_PAGES.EVENTS, "view"),
  filterByWhitelabel,
  eventsController.getAllEvents
);

/**
 * @swagger
 * /events/admin/{id}/status:
 *   patch:
 *     summary: Admin update event status
 *     description: Update event status. Requires admin role with events update permission
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUpdateStatusRequest'
 *     responses:
 *       200:
 *         description: Event status updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  "/:id/status",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.EVENTS, "update"),
  validateZod(adminUpdateStatusSchema),
  eventsController.adminUpdateEventStatus
);

/**
 * @swagger
 * /events/admin/{id}:
 *   delete:
 *     summary: Admin delete event
 *     description: Delete an event. Requires admin role with events delete permission
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.EVENTS, "delete"),
  eventsController.adminDeleteEvent
);

module.exports = router;
