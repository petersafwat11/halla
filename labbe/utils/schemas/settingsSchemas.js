/**
 * @halla/shared compat shim — settings schemas live in
 * `@halla/shared/schemas/settings` after the Phase 1 migration. This
 * file is a re-export so existing imports keep working; new code should
 * import from shared directly.
 *
 * Phase 8 will remove this shim and the consumers along with it.
 */
export {
  profileUpdateSchema,
  passwordUpdateSchema,
  emailNotificationSchema,
  pushNotificationSchema,
  smsNotificationSchema,
  notificationPreferencesSchema,
  appNotificationsSchema,
  hostEmailNotificationsSchemaLegacy as hostEmailNotificationsSchema,
  notificationsSchema,
  accountDeletionSchema,
  emailVerificationSchema,
  getProfileDefaults,
  getPasswordDefaults,
  getNotificationDefaults,
  validateProfileData,
  validatePasswordData,
} from "@halla/shared/schemas/settings";
