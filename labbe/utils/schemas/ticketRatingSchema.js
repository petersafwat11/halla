/**
 * Compat re-export. `ticketRatingSchema` was previously a static schema
 * unique to web; it now lives in `@halla/shared/schemas/tickets` (matching
 * mobile + backend) as a factory function. Web's call site passed no `t`
 * so the default-identity preserves opaque-key behavior.
 */
import { ticketRatingSchema as sharedFactory, defaultTicketRatingValues } from "@halla/shared/schemas/tickets";

// Materialize once without a translator so existing imports remain `Zod schema`,
// not `(t) => Zod schema`.
export const ticketRatingSchema = sharedFactory();

export { defaultTicketRatingValues };
