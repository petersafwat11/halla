/**
 * @halla/shared compat shim — plan schemas live in
 * `@halla/shared/schemas/plans` after the Phase 1 migration. This file
 * is a re-export so existing imports keep working; new code should
 * import from shared directly.
 *
 * Phase 8 will remove this shim and the consumers along with it.
 */
export {
  createPlanSchema,
  editPlanSchema,
  PLAN_TYPES,
  planTypeEnum,
  planFamilyEnum,
  billingTypeEnum,
  availabilityEnum,
  currencyEnum,
} from "@halla/shared/schemas/plans";
