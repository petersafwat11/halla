/**
 * @halla/shared compat shim — settings schemas live in
 * `@halla/shared/schemas/settings` after the Phase 1 migration. This
 * file re-exports the mobile variants under their original names so
 * existing imports keep working; new code should import from shared
 * directly.
 *
 * Phase 8 will remove this shim and the consumers along with it.
 */
export {
  mobileAccountSettingsSchema as accountSettingsSchema,
  mobileNotificationSettingsSchema as notificationSettingsSchema,
} from "@halla/shared/schemas/settings";
