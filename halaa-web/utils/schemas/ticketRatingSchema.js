/**
 * Exports the ticket-rating schema factory so consumers can bind their own
 * translator. Web's call site passes `t` from `useTranslation("ticketRating")`.
 */
export { ticketRatingSchema, defaultTicketRatingValues } from "@halaa/shared/schemas/tickets";
