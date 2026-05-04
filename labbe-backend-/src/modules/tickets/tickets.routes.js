/**
 * Tickets Routes
 * @module modules/tickets/tickets.routes
 */

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Support ticket management endpoints
 */

const express = require("express");
const router = express.Router();

const ticketsController = require("./tickets.controller");
const { protect } = require("../../shared/middleware/auth");
const { restrictTo, requirePageAccess } = require("../../shared/middleware/rbac");
const { ADMIN_PAGES } = require("../../shared/constants");
const { validateObjectId } = require("../../shared/middleware/validation");
const { ROLES } = require("../../shared/constants");

router.use(protect);

/**
 * @swagger
 * /tickets/assignees:
 *   get:
 *     summary: Get ticket assignees
 *     description: Get list of users who can be assigned tickets. Admin/moderator only
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assignees retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  "/assignees",
  requirePageAccess(ADMIN_PAGES.TICKETS, 'update'),
  ticketsController.getAssignees
);

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Get tickets
 *     description: Get paginated list of tickets for current user
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tickets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Ticket'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     summary: Create ticket
 *     description: Create a new support ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTicketRequest'
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router
  .route("/")
  .get(ticketsController.getTickets)
  .post(ticketsController.createTicket);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     description: Get detailed information about a specific ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticket:
 *                       $ref: '#/components/schemas/Ticket'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update ticket
 *     description: Update an existing ticket's subject or message
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete ticket
 *     description: Delete a ticket. Owner or admin only
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/export",
  requirePageAccess(ADMIN_PAGES.TICKETS, "view"),
  ticketsController.exportTickets
);

router
  .route("/:id")
  .get(validateObjectId("id"), ticketsController.getTicketById)
  .patch(validateObjectId("id"), ticketsController.updateTicket)
  .delete(validateObjectId("id"), ticketsController.deleteTicket);

/**
 * @swagger
 * /tickets/{id}/assign:
 *   patch:
 *     summary: Assign ticket
 *     description: Assign a ticket to a user. Admin only
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assigneeId]
 *             properties:
 *               assigneeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket assigned successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Ticket assignment (admin/moderator only)
router.patch(
  "/:id/assign",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TICKETS, 'update'),
  ticketsController.assignTicket
);

/**
 * @swagger
 * /tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status
 *     description: Update the status of a ticket. Admin only
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Ticket status update (admin/moderator only)
router.patch(
  "/:id/status",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TICKETS, 'update'),
  ticketsController.updateStatus
);

/**
 * @swagger
 * /tickets/{id}/rate:
 *   patch:
 *     summary: Rate ticket
 *     description: Submit a rating for a resolved ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket rated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Ticket rating (user submits rating)
router.patch("/:id/rate", validateObjectId("id"), ticketsController.rateTicket);

/**
 * @swagger
 * /tickets/{id}/rating-info:
 *   get:
 *     summary: Get ticket rating info
 *     description: Get ticket details for the rating page
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ticket rating info retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Get ticket for rating page (minimal data)
router.get(
  "/:id/rating-info",
  validateObjectId("id"),
  ticketsController.getTicketForRating
);

// FLOW-23-F02: Add reply to ticket
router.post(
  "/:id/replies",
  validateObjectId("id"),
  ticketsController.addReply
);

module.exports = router;

