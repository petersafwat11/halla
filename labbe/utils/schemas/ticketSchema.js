import { z } from "zod";

/**
 * Canonical ticket type values — must stay in sync with backend
 * TicketModel.type enum and tickets.validation.TICKET_TYPE_VALUES.
 */
export const TICKET_TYPES = [
  "technical",
  "payment",
  "event",
  "user",
  "other",
  "inquiry",
  "issue",
  "request",
  "suggestion",
];

/**
 * Display-only status list (used by cards, badges, filters, locales).
 * `waiting_response` is admin-set via PATCH /:id/status; not a value a
 * regular user can set via update.
 */
export const TICKET_STATUS = [
  "open",
  "in_progress",
  "waiting_response",
  "resolved",
  "closed",
];

export const TICKET_PRIORITY = ["low", "medium", "high", "urgent"];

const subject = (t) =>
  z
    .string()
    .trim()
    .min(5, t?.("tickets.errors.subjectMinLength") || "Subject must be at least 5 characters")
    .max(200, t?.("tickets.errors.subjectMaxLength") || "Subject must not exceed 200 characters");

const message = (t) =>
  z
    .string()
    .trim()
    .min(10, t?.("tickets.errors.messageMinLength") || "Message must be at least 10 characters")
    .max(5000, t?.("tickets.errors.messageMaxLength") || "Message must not exceed 5000 characters");

const type = (t) =>
  z.enum(TICKET_TYPES, {
    errorMap: () => ({
      message: t?.("tickets.errors.typeRequired") || "Ticket type is required",
    }),
  });

const priority = (t) =>
  z.enum(TICKET_PRIORITY, {
    errorMap: () => ({
      message: t?.("tickets.errors.priorityInvalid") || "Invalid priority",
    }),
  });

/**
 * Create ticket — used by host + vendor (whitelabel uses host page too).
 */
export const createTicketSchema = (t) =>
  z.object({
    subject: subject(t),
    type: type(t),
    message: message(t),
    priority: priority(t).optional().default("medium"),
  });

/**
 * Update ticket — user-facing edits only (subject/type/message/priority).
 * Status changes go through the admin PATCH /:id/status endpoint with its
 * own schema; intentionally not accepted here.
 */
export const updateTicketSchema = (t) =>
  z.object({
    subject: subject(t).optional(),
    type: type(t).optional(),
    message: message(t).optional(),
    priority: priority(t).optional(),
  });

/**
 * Admin resolution response — matches backend updateStatusSchema.resolution.
 */
export const ticketResolutionSchema = (t) =>
  z.object({
    resolution: z
      .string()
      .trim()
      .min(10, t?.("tickets.errors.resolutionMinLength") || "Resolution must be at least 10 characters")
      .max(5000, t?.("tickets.errors.resolutionMaxLength") || "Resolution must not exceed 5000 characters"),
  });

export const ticketFilterSchema = z.object({
  status: z.enum(TICKET_STATUS).optional(),
  type: z.enum(TICKET_TYPES).optional(),
  priority: z.enum(TICKET_PRIORITY).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

export const getCreateTicketDefaults = () => ({
  subject: "",
  type: "other",
  message: "",
  priority: "medium",
});

const ticketSchemas = {
  createTicketSchema,
  updateTicketSchema,
  ticketResolutionSchema,
  ticketFilterSchema,
  getCreateTicketDefaults,
  TICKET_TYPES,
  TICKET_STATUS,
  TICKET_PRIORITY,
};

export default ticketSchemas;
