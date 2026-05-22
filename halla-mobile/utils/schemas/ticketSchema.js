import { z } from "zod";

/**
 * Canonical ticket type values — must stay in sync with backend
 * TicketModel.type enum and web ticketSchema.js TICKET_TYPES.
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
 * Display-only status list (cards, badges, filters, locales).
 * `waiting_response` is admin-set via PATCH /:id/status.
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
    .min(5, t ? t("errors.subjectMinLength") : "Subject must be at least 5 characters")
    .max(200, t ? t("errors.subjectMaxLength") : "Subject must not exceed 200 characters");

const message = (t) =>
  z
    .string()
    .trim()
    .min(10, t ? t("errors.messageMinLength") : "Message must be at least 10 characters")
    .max(5000, t ? t("errors.messageMaxLength") : "Message must not exceed 5000 characters");

const type = (t) =>
  z.enum(TICKET_TYPES, {
    errorMap: () => ({
      message: t ? t("errors.typeRequired") : "Ticket type is required",
    }),
  });

const priority = (t) =>
  z.enum(TICKET_PRIORITY, {
    errorMap: () => ({
      message: t ? t("errors.priorityInvalid") : "Invalid priority",
    }),
  });

export const createTicketSchema = (t) =>
  z.object({
    subject: subject(t),
    type: type(t),
    message: message(t),
    priority: priority(t).optional().default("medium"),
  });

export const updateTicketSchema = (t) =>
  z.object({
    subject: subject(t).optional(),
    type: type(t).optional(),
    message: message(t).optional(),
    priority: priority(t).optional(),
  });

export const ticketResolutionSchema = (t) =>
  z.object({
    resolution: z
      .string()
      .trim()
      .min(10, t ? t("errors.resolutionMinLength") : "Resolution must be at least 10 characters")
      .max(5000, t ? t("errors.resolutionMaxLength") : "Resolution must not exceed 5000 characters"),
  });

export const ticketRatingSchema = (t) =>
  z.object({
    rating: z
      .number()
      .int(t ? t("errors.ratingInvalid") : "Rating must be a whole number")
      .min(1, t ? t("errors.ratingRequired") : "Please select a rating")
      .max(5, t ? t("errors.ratingMax") : "Rating must be between 1 and 5"),
    feedback: z
      .string()
      .max(1000, t ? t("errors.feedbackMaxLength") : "Feedback must not exceed 1000 characters")
      .optional()
      .default(""),
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
  ticketRatingSchema,
  ticketFilterSchema,
  getCreateTicketDefaults,
  TICKET_TYPES,
  TICKET_STATUS,
  TICKET_PRIORITY,
};

export default ticketSchemas;
