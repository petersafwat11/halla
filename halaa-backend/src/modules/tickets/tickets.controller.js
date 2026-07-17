/**
 * Tickets Controller
 * HTTP request handling only - delegates to tickets.service
 * @module modules/tickets/tickets.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendDeleted,
} = require("../../shared/utils/responseHelper");
const { isAdminRole } = require("../../shared/constants/roles");
const ticketsService = require("./tickets.service");
const { generateExcel } = require("../../shared/utils/excelExport");

/**
 * Get ticket assignees
 * GET /api/v2/tickets/assignees
 */
exports.getAssignees = catchAsync(async (req, res) => {
  const assignees = await ticketsService.getTicketAssignees();
  sendSuccess(res, assignees);
});

/**
 * Get tickets (user's own or all for admin)
 * GET /api/v2/tickets
 */
exports.getTickets = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 20 };

  const result = await ticketsService.getTickets(
    req.user._id,
    isAdminRole(req.user.role),
    filters,
    options,
    req.user
  );

  sendPaginated(res, result.data, result.pagination);
});

/**
 * Get ticket by ID
 * GET /api/v2/tickets/:id
 */
exports.getTicketById = catchAsync(async (req, res) => {
  const result = await ticketsService.getTicketById(
    req.params.id,
    req.user._id,
    isAdminRole(req.user.role)
  );
  sendSuccess(res, result);
});

/**
 * Create ticket
 * POST /api/v2/tickets
 */
exports.createTicket = catchAsync(async (req, res) => {
  const result = await ticketsService.createTicket(req.body, req.user, req.file);
  sendCreated(res, result, "Ticket created successfully");
});

/**
 * Update ticket status (admin)
 * PATCH /api/v2/tickets/:id/status
 */
exports.updateStatus = catchAsync(async (req, res) => {
  const { status, resolution } = req.body;
  const result = await ticketsService.updateTicketStatus(
    req.params.id,
    status,
    resolution,
    req.user._id
  );
  sendSuccess(res, result, "Ticket status updated");
});

/**
 * Assign ticket (admin)
 * PATCH /api/v2/tickets/:id/assign
 */
exports.assignTicket = catchAsync(async (req, res) => {
  const { assigneeId } = req.body;
  const result = await ticketsService.assignTicket(req.params.id, assigneeId);
  sendSuccess(res, result, "Ticket assigned successfully");
});

/**
 * Update ticket
 * PATCH /api/v2/tickets/:id
 */
exports.updateTicket = catchAsync(async (req, res) => {
  const result = await ticketsService.updateTicket(
    req.params.id,
    req.body,
    req.user._id,
    isAdminRole(req.user.role)
  );
  sendSuccess(res, result, "Ticket updated");
});

/**
 * Delete ticket (admin)
 * DELETE /api/v2/tickets/:id
 */
exports.deleteTicket = catchAsync(async (req, res) => {
  await ticketsService.deleteTicket(req.params.id, req.user._id, isAdminRole(req.user.role));
  sendDeleted(res, "Ticket deleted");
});

/**
 * Rate ticket
 * PATCH /api/v2/tickets/:id/rate
 */
exports.rateTicket = catchAsync(async (req, res) => {
  const { rating, feedback } = req.body;
  const result = await ticketsService.rateTicket(
    req.params.id,
    rating,
    feedback,
    req.user._id
  );
  sendSuccess(res, result, "Rating submitted");
});

/**
 * Get ticket for rating (minimal data)
 * GET /api/v2/tickets/:id/rating-info
 */
exports.getTicketForRating = catchAsync(async (req, res) => {
  const result = await ticketsService.getTicketForRating(
    req.params.id,
    req.user._id
  );
  sendSuccess(res, result);
});

/**
 * Export tickets to Excel
 * GET /api/v2/tickets/export
 */
exports.exportTickets = catchAsync(async (req, res) => {
  const { search, status, priority, from, to } = req.query;
  const data = await ticketsService.exportTickets({ search, status, priority, from, to });
  const buffer = generateExcel(data, "tickets");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=tickets.xlsx");
  res.send(buffer);
});
