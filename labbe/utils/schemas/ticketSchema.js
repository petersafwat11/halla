import { z } from "zod";

/**
 * Ticket types matching backend TicketModel
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
 * Ticket status values
 */
export const TICKET_STATUS = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

/**
 * Ticket priority values
 */
export const TICKET_PRIORITY = ["low", "medium", "high", "urgent"];

/**
 * Create ticket schema
 * Used when creating a new ticket
 */
export const createTicketSchema = (t) =>
  z.object({
    subject: z
      .string()
      .trim()
      .min(
        1,
        t?.("tickets.errors.subjectRequired") || "عنوان الشكوى مطلوب"
      )
      .max(
        200,
        t?.("tickets.errors.subjectMaxLength") ||
          "عنوان الشكوى يجب أن لا يتجاوز 200 حرف"
      ),
    type: z.enum(TICKET_TYPES, {
      errorMap: () => ({
        message: t?.("tickets.errors.typeRequired") || "نوع الشكوى مطلوب",
      }),
    }),
    message: z
      .string()
      .trim()
      .min(
        10,
        t?.("tickets.errors.messageMinLength") ||
          "الرسالة يجب أن تكون 10 أحرف على الأقل"
      )
      .max(
        5000,
        t?.("tickets.errors.messageMaxLength") ||
          "الرسالة يجب أن لا تتجاوز 5000 حرف"
      ),
    priority: z
      .enum(TICKET_PRIORITY, {
        errorMap: () => ({
          message: t?.("tickets.errors.priorityInvalid") || "أولوية غير صالحة",
        }),
      })
      .optional()
      .default("medium"),
  });

/**
 * Update ticket schema
 * Used when updating an existing ticket
 */
export const updateTicketSchema = (t) =>
  z.object({
    type: z
      .enum(TICKET_TYPES, {
        errorMap: () => ({
          message: t?.("tickets.errors.typeInvalid") || "نوع الشكوى غير صالح",
        }),
      })
      .optional(),
    message: z
      .string()
      .min(
        10,
        t?.("tickets.errors.messageMinLength") ||
          "الرسالة يجب أن تكون 10 أحرف على الأقل"
      )
      .max(
        5000,
        t?.("tickets.errors.messageMaxLength") ||
          "الرسالة يجب أن لا تتجاوز 5000 حرف"
      )
      .optional(),
    status: z
      .enum(TICKET_STATUS, {
        errorMap: () => ({
          message: t?.("tickets.errors.statusInvalid") || "حالة غير صالحة",
        }),
      })
      .optional(),
    priority: z
      .enum(TICKET_PRIORITY, {
        errorMap: () => ({
          message: t?.("tickets.errors.priorityInvalid") || "أولوية غير صالحة",
        }),
      })
      .optional(),
  });

/**
 * Admin response schema
 * Used when admin responds to a ticket
 */
export const ticketResponseSchema = (t) =>
  z.object({
    message: z
      .string()
      .min(1, t?.("tickets.errors.responseRequired") || "الرد مطلوب")
      .max(
        5000,
        t?.("tickets.errors.responseMaxLength") ||
          "الرد يجب أن لا يتجاوز 5000 حرف"
      ),
  });

/**
 * Ticket filter schema
 * Used for filtering tickets list
 */
export const ticketFilterSchema = z.object({
  status: z.enum(TICKET_STATUS).optional(),
  type: z.enum(TICKET_TYPES).optional(),
  priority: z.enum(TICKET_PRIORITY).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
});

/**
 * Get default values for create ticket form
 */
export const getCreateTicketDefaults = () => ({
  subject: "",
  type: "other",
  message: "",
  priority: "medium",
});

/**
 * Validate ticket data
 * @param {Object} data - Ticket data to validate
 * @param {Function} t - Translation function
 * @returns {Object} Validation result
 */
export const validateTicketData = (data, t) => {
  try {
    const schema = createTicketSchema(t);
    const result = schema.parse(data);
    return { success: true, data: result, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { success: false, data: null, errors };
    }
    throw error;
  }
};

const ticketSchemas = {
  createTicketSchema,
  updateTicketSchema,
  ticketResponseSchema,
  ticketFilterSchema,
  getCreateTicketDefaults,
  validateTicketData,
  TICKET_TYPES,
  TICKET_STATUS,
  TICKET_PRIORITY,
};

export default ticketSchemas;
