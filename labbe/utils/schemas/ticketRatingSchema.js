import { z } from "zod";

/**
 * Schema for ticket rating form
 * Used in ticket-rating page with React Hook Form
 */
export const ticketRatingSchema = z.object({
  rating: z
    .number()
    .min(1, "Please select a rating")
    .max(5, "Rating must be between 1 and 5"),
  feedback: z
    .string()
    .max(1000, "Feedback must be less than 1000 characters")
    .optional()
    .default(""),
});

/**
 * Default values for ticket rating form
 */
export const defaultTicketRatingValues = {
  rating: 0,
  feedback: "",
};
