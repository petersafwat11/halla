/**
 * @halla/shared compat shim — vendor schemas live in
 * `@halla/shared/schemas/vendor` after the Phase 1 migration. This file
 * re-exports the mobile variants under their original names so existing
 * imports keep working; new code should import from shared directly.
 *
 * Phase 8 will remove this shim and the consumers along with it.
 */
export {
  mobilePersonalInfoSchema as personalInfoSchema,
  mobileBasicAccountInfoSchema as basicAccountInfoSchema,
  mobileServiceDetailsSchema as serviceDetailsSchema,
  mobileSocialLinksSchema as socialLinksSchema,
  phoneChangeSchema,
  phoneVerifySchema,
  passwordChangeSchema,
} from "@halla/shared/schemas/vendor";
