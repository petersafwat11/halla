import { z } from "zod";

// Ticket creation/update schema — matches backend TicketModel type enum
export const ticketSchema = z.object({
  type: z.enum(
    ["technical", "payment", "event", "user", "inquiry", "issue", "request", "suggestion", "other"],
    { required_error: "validation.ticketTypeRequired" }
  ),
  message: z
    .string()
    .min(10, "validation.ticketMessageMin")
    .max(5000, "validation.ticketMessageMax"),
});
