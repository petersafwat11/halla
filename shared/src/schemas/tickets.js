/**
 * Ticket schemas — create, update, admin resolution, rating, filter.
 * Mirrors `labbe-backend-/src/modules/tickets/tickets.validation.js`.
 *
 * Callers bind `t` to the `tickets` namespace (`useTranslation("tickets")`)
 * so keys here are relative to that namespace — no `tickets.` prefix.
 */
import { z } from "zod";

const idT = (k) => k;

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
    .min(5, t("errors.subjectMinLength"))
    .max(200, t("errors.subjectMaxLength"));

const message = (t) =>
  z
    .string()
    .trim()
    .min(10, t("errors.messageMinLength"))
    .max(5000, t("errors.messageMaxLength"));

const type = (t) =>
  z.enum(TICKET_TYPES, {
    errorMap: () => ({ message: t("errors.typeRequired") }),
  });

const priority = (t) =>
  z.enum(TICKET_PRIORITY, {
    errorMap: () => ({ message: t("errors.priorityInvalid") }),
  });

export const createTicketSchema = (t = idT) =>
  z.object({
    subject: subject(t),
    type: type(t),
    message: message(t),
    priority: priority(t).optional().default("medium"),
  });

export const updateTicketSchema = (t = idT) =>
  z.object({
    subject: subject(t).optional(),
    type: type(t).optional(),
    message: message(t).optional(),
    priority: priority(t).optional(),
  });

export const ticketResolutionSchema = (t = idT) =>
  z.object({
    resolution: z
      .string()
      .trim()
      .min(10, t("errors.resolutionMinLength"))
      .max(5000, t("errors.resolutionMaxLength")),
  });

export const ticketRatingSchema = (t = idT) =>
  z.object({
    rating: z
      .number()
      .int(t("errors.ratingInvalid"))
      .min(1, t("errors.ratingRequired"))
      .max(5, t("errors.ratingMax")),
    feedback: z
      .string()
      .max(1000, t("errors.feedbackMaxLength"))
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

export const defaultTicketRatingValues = {
  rating: 0,
  feedback: "",
};

const ticketSchemas = {
  createTicketSchema,
  updateTicketSchema,
  ticketResolutionSchema,
  ticketRatingSchema,
  ticketFilterSchema,
  getCreateTicketDefaults,
  defaultTicketRatingValues,
  TICKET_TYPES,
  TICKET_STATUS,
  TICKET_PRIORITY,
};

export default ticketSchemas;
