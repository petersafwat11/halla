/**
 * @halla/shared compat shim — account-settings schema lives in
 * `@halla/shared/schemas/settings` after the Phase 1 migration. This
 * file is a re-export so existing imports keep working; new code should
 * import from shared directly.
 *
 * Phase 8 will remove this shim and the consumers along with it.
 */
export { accountSettingsSchema } from "@halla/shared/schemas/settings";
export { accountSettingsSchema as default } from "@halla/shared/schemas/settings";
