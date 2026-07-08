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
const { validateObjectId, validateZod } = require("../../shared/middleware/validation");
const { ROLES } = require("../../shared/constants");
const {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  assignTicketSchema,
  rateTicketSchema,
  listTicketsQuerySchema,
} = require("./tickets.validation");

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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
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
  .get(validateZod(listTicketsQuerySchema, 'query'), ticketsController.getTickets)
  .post(validateZod(createTicketSchema), ticketsController.createTicket);

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
/**
 * @swagger
 * /tickets/export:
 *   get:
 *     summary: Export tickets to Excel
 *     description: Export filtered tickets as an Excel file. Admin with export permission only.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  "/export",
  requirePageAccess(ADMIN_PAGES.TICKETS, "export"),
  ticketsController.exportTickets
);

router
  .route("/:id")
  .get(validateObjectId("id"), ticketsController.getTicketById)
  .patch(validateObjectId("id"), validateZod(updateTicketSchema), ticketsController.updateTicket)
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
router.patch(
  "/:id/assign",
  validateObjectId("id"),
  validateZod(assignTicketSchema),
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
router.patch(
  "/:id/status",
  validateObjectId("id"),
  validateZod(updateStatusSchema),
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
router.patch("/:id/rate", validateObjectId("id"), validateZod(rateTicketSchema), ticketsController.rateTicket);

/**
 * @swagger
 * /tickets/{id}/rating-info:
 *   get:
 *     summary: Get minimal ticket info needed for the rating page
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Rating info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     ticketNumber:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     status:
 *                       type: string
 *                     canRate:
 *                       type: boolean
 *                     hasRated:
 *                       type: boolean
 *                     currentRating:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         rating:
 *                           type: integer
 *                         feedback:
 *                           type: string
 *                         ratedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/:id/rating-info",
  validateObjectId("id"),
  ticketsController.getTicketForRating
);

module.exports = router;

