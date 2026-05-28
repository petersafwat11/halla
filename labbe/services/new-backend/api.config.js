/**
 * API_PATHS — re-exported from @halla/shared.
 *
 * The canonical registry now lives in `shared/src/api/paths.js`. This file
 * stays as a thin compat re-export so existing `@/services/new-backend/api.config`
 * imports keep working. Phase 5/8 will migrate call sites to import directly
 * from `@halla/shared/api/paths` and this file will be deleted.
 */

export {
  API_PATHS,
  default,
  auth,
  events,
  users,
  guests,
  subscriptions,
  hostPayments,
  discounts,
  addons,
  tickets,
  notifications,
  staff,
  locations,
  vendors,
  dashboard,
  invitations,
  templates,
  taqnyatTemplates,
  plans,
  payments,
  postEvent,
  vendorServices,
  admin,
} from "@halla/shared/api/paths";
