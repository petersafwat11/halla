/**
 * Compat re-export. Canonical ticket schemas live in
 * `@halla/shared/schemas/tickets`. Mobile call sites called the
 * factories with `t`, which works unchanged.
 */
export {
  TICKET_TYPES,
  TICKET_STATUS,
  TICKET_PRIORITY,
  createTicketSchema,
  updateTicketSchema,
  ticketResolutionSchema,
  ticketRatingSchema,
  ticketFilterSchema,
  getCreateTicketDefaults,
} from "@halla/shared/schemas/tickets";

export { default } from "@halla/shared/schemas/tickets";
