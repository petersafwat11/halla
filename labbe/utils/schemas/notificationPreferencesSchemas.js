/**
 * Notification Preferences — re-exports shared schemas + UI option config
 *
 * The validation schemas are re-exported from
 * `@halla/shared/schemas/settings`. The UI option configurations are kept
 * local because they reference web-side i18n keys + Arabic label defaults
 * and don't belong in the cross-platform shared package.
 */

export {
  USER_ROLES,
  hostAppNotificationsSchema,
  adminAppNotificationsSchema,
  adminEmailNotificationsSchema,
  hostNotificationPreferencesSchema,
  adminNotificationPreferencesSchema,
  getNotificationSchemaForRole,
  hostNotificationDefaults,
  adminNotificationDefaults,
  getNotificationDefaultsForRole,
} from "@halla/shared/schemas/settings";

import { USER_ROLES } from "@halla/shared/schemas/settings";

// ============================================
// NOTIFICATION OPTIONS CONFIG BY ROLE
// (UI concern — labels + i18n keys per option, web-side only)
// ============================================

/**
 * Get notification options configuration for UI rendering
 * @param {string} role - User role
 * @param {Function} t - Translation function
 * @returns {Object} Configuration for app and email notifications
 */
export const getNotificationOptionsForRole = (role, t) => {
  const configs = {
    host: {
      appNotifications: [
        { key: "eventUpdates", labelKey: "notifications.eventUpdates", defaultLabel: "تحديثات الفعاليات" },
        { key: "eventReminders", labelKey: "notifications.eventReminders", defaultLabel: "تذكيرات الفعاليات" },
        { key: "guestResponses", labelKey: "notifications.guestResponses", defaultLabel: "ردود الضيوف" },
        { key: "guestCheckIns", labelKey: "notifications.guestCheckIns", defaultLabel: "تسجيل دخول الضيوف" },
        { key: "subscriptionAlerts", labelKey: "notifications.subscriptionAlerts", defaultLabel: "تنبيهات الاشتراك" },
        { key: "systemUpdates", labelKey: "notifications.systemUpdates", defaultLabel: "تحديثات النظام" },
      ],
      emailNotifications: [],
    },
    admin: {
      appNotifications: [
        { key: "newUsers", labelKey: "notifications.newUsers", defaultLabel: "المستخدمين الجدد" },
        { key: "vendorApprovals", labelKey: "notifications.vendorApprovals", defaultLabel: "موافقات التجار" },
        { key: "supportTickets", labelKey: "notifications.supportTickets", defaultLabel: "تذاكر الدعم" },
        { key: "systemAlerts", labelKey: "notifications.systemAlerts", defaultLabel: "تنبيهات النظام" },
        { key: "paymentAlerts", labelKey: "notifications.paymentAlerts", defaultLabel: "تنبيهات المدفوعات" },
        { key: "subscriptionAlerts", labelKey: "notifications.subscriptionAlerts", defaultLabel: "تنبيهات الاشتراكات" },
      ],
      emailNotifications: [
        { key: "dailyReport", labelKey: "notifications.dailyReport", defaultLabel: "التقرير اليومي" },
        { key: "weeklyReport", labelKey: "notifications.weeklyReport", defaultLabel: "التقرير الأسبوعي" },
        { key: "vendorApprovals", labelKey: "notifications.vendorApprovals", defaultLabel: "موافقات التجار" },
        { key: "supportTickets", labelKey: "notifications.supportTickets", defaultLabel: "تذاكر الدعم" },
        { key: "criticalAlerts", labelKey: "notifications.criticalAlerts", defaultLabel: "التنبيهات الحرجة" },
      ],
    },
  };

  let configKey = "host";
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
    case USER_ROLES.MODERATOR:
      configKey = "admin";
      break;
    default:
      configKey = "host";
  }

  const config = configs[configKey];

  return {
    appNotifications: config.appNotifications.map((opt) => ({
      ...opt,
      label: t?.(opt.labelKey) || opt.defaultLabel,
    })),
    emailNotifications: config.emailNotifications.map((opt) => ({
      ...opt,
      label: t?.(opt.labelKey) || opt.defaultLabel,
    })),
  };
};
