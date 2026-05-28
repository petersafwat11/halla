/**
 * @halla/shared compat shim — admin schemas live in
 * `@halla/shared/schemas/admin` after the Phase 1 migration. This file
 * is a re-export so existing imports keep working; new code should
 * import from shared directly.
 *
 * Phase 8 will remove this shim and the consumers along with it.
 */
export {
  addHostSchema,
  hostSubscriptionSchema,
  subscriptionAssignmentSchema,
  addModeratorSchema,
  editModeratorSchema,
  vendorRatingSchema,
  whitelabelSubscriptionSchema,
  assignTicketSchema,
  ticketResponseSchema,
  categoryFormSchema,
  sendNotificationSchema,
  TAQNYAT_TEMPLATE_TYPES,
  assignTaqnyatSchema,
  createTaqnyatTemplateSchema,
  discountSchema,
} from "@halla/shared/schemas/admin";
