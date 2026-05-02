/**
 * Notification Preferences Schemas
 * Role-specific schemas for notification preference forms
 */

import { z } from "zod";

// ============================================
// ROLE CONSTANTS
// ============================================

export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  WHITELABEL_ADMIN: "whitelabel_admin",
  WHITELABEL_MODERATOR: "whitelabel_moderator",
  HOST: "host",
  VENDOR: "vendor",
  GUEST: "guest",
};

// ============================================
// BASE SCHEMAS
// ============================================

/**
 * Host app notifications preferences
 */
export const hostAppNotificationsSchema = z.object({
  eventUpdates: z.boolean().default(true),
  eventReminders: z.boolean().default(true),
  guestResponses: z.boolean().default(true),
  guestCheckIns: z.boolean().default(true),
  subscriptionAlerts: z.boolean().default(true),
  systemUpdates: z.boolean().default(true),
});

/**
 * Host email notifications preferences
 */
export const hostEmailNotificationsSchema = z.object({
  eventUpdates: z.boolean().default(false),
  eventReminders: z.boolean().default(true),
  guestResponses: z.boolean().default(false),
  subscriptionAlerts: z.boolean().default(true),
  invitationReports: z.boolean().default(true),
});

/**
 * Vendor app notifications preferences
 * Note: No service_booking - vendors show popup for users to contact outside project
 * Note: Reviews are given by admin only, not by other users
 */
export const vendorAppNotificationsSchema = z.object({
  serviceInquiries: z.boolean().default(true),
  adminReviews: z.boolean().default(true),
  profileViews: z.boolean().default(false),
  approvalStatus: z.boolean().default(true),
  systemUpdates: z.boolean().default(true),
});

/**
 * Vendor email notifications preferences
 */
export const vendorEmailNotificationsSchema = z.object({
  serviceInquiries: z.boolean().default(true),
  adminReviews: z.boolean().default(true),
  weeklyReport: z.boolean().default(true),
  approvalStatus: z.boolean().default(true),
});

/**
 * Admin app notifications preferences
 */
export const adminAppNotificationsSchema = z.object({
  newUsers: z.boolean().default(true),
  vendorApprovals: z.boolean().default(true),
  supportTickets: z.boolean().default(true),
  systemAlerts: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
  subscriptionAlerts: z.boolean().default(true),
});

/**
 * Admin email notifications preferences
 */
export const adminEmailNotificationsSchema = z.object({
  dailyReport: z.boolean().default(true),
  weeklyReport: z.boolean().default(true),
  vendorApprovals: z.boolean().default(true),
  supportTickets: z.boolean().default(false),
  criticalAlerts: z.boolean().default(true),
});

/**
 * Whitelabel admin app notifications preferences
 */
export const whitelabelAppNotificationsSchema = z.object({
  newHosts: z.boolean().default(true),
  eventActivity: z.boolean().default(true),
  subscriptionAlerts: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
  systemUpdates: z.boolean().default(true),
});

/**
 * Whitelabel admin email notifications preferences
 */
export const whitelabelEmailNotificationsSchema = z.object({
  dailyReport: z.boolean().default(false),
  weeklyReport: z.boolean().default(true),
  subscriptionAlerts: z.boolean().default(true),
  criticalAlerts: z.boolean().default(true),
});

// ============================================
// COMBINED SCHEMAS BY ROLE
// ============================================

/**
 * Host notification preferences schema
 */
export const hostNotificationPreferencesSchema = z.object({
  appNotifications: hostAppNotificationsSchema,
  emailNotifications: hostEmailNotificationsSchema,
});

/**
 * Vendor notification preferences schema
 */
export const vendorNotificationPreferencesSchema = z.object({
  appNotifications: vendorAppNotificationsSchema,
  emailNotifications: vendorEmailNotificationsSchema,
});

/**
 * Admin notification preferences schema
 */
export const adminNotificationPreferencesSchema = z.object({
  appNotifications: adminAppNotificationsSchema,
  emailNotifications: adminEmailNotificationsSchema,
});

/**
 * Whitelabel notification preferences schema
 */
export const whitelabelNotificationPreferencesSchema = z.object({
  appNotifications: whitelabelAppNotificationsSchema,
  emailNotifications: whitelabelEmailNotificationsSchema,
});

// ============================================
// SCHEMA GETTER BY ROLE
// ============================================

/**
 * Get notification preferences schema for a specific role
 * @param {string} role - User role
 * @returns {z.ZodSchema} Schema for the role
 */
export const getNotificationSchemaForRole = (role) => {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
    case USER_ROLES.MODERATOR:
      return adminNotificationPreferencesSchema;
    case USER_ROLES.WHITELABEL_ADMIN:
    case USER_ROLES.WHITELABEL_MODERATOR:
      return whitelabelNotificationPreferencesSchema;
    case USER_ROLES.VENDOR:
      return vendorNotificationPreferencesSchema;
    case USER_ROLES.HOST:
    default:
      return hostNotificationPreferencesSchema;
  }
};

// ============================================
// DEFAULT VALUES BY ROLE
// ============================================

/**
 * Default host notification preferences
 */
export const hostNotificationDefaults = {
  appNotifications: {
    eventUpdates: true,
    eventReminders: true,
    guestResponses: true,
    guestCheckIns: true,
    subscriptionAlerts: true,
    systemUpdates: true,
  },
  emailNotifications: {
    eventUpdates: false,
    eventReminders: true,
    guestResponses: false,
    subscriptionAlerts: true,
    invitationReports: true,
  },
};

/**
 * Default vendor notification preferences
 * Note: No service_booking - vendors show popup for users to contact outside project
 * Note: Reviews are given by admin only (adminReviews)
 */
export const vendorNotificationDefaults = {
  appNotifications: {
    serviceInquiries: true,
    adminReviews: true,
    profileViews: false,
    approvalStatus: true,
    systemUpdates: true,
  },
  emailNotifications: {
    serviceInquiries: true,
    adminReviews: true,
    weeklyReport: true,
    approvalStatus: true,
  },
};

/**
 * Default admin notification preferences
 */
export const adminNotificationDefaults = {
  appNotifications: {
    newUsers: true,
    vendorApprovals: true,
    supportTickets: true,
    systemAlerts: true,
    paymentAlerts: true,
    subscriptionAlerts: true,
  },
  emailNotifications: {
    dailyReport: true,
    weeklyReport: true,
    vendorApprovals: true,
    supportTickets: false,
    criticalAlerts: true,
  },
};

/**
 * Default whitelabel notification preferences
 */
export const whitelabelNotificationDefaults = {
  appNotifications: {
    newHosts: true,
    eventActivity: true,
    subscriptionAlerts: true,
    paymentAlerts: true,
    systemUpdates: true,
  },
  emailNotifications: {
    dailyReport: false,
    weeklyReport: true,
    subscriptionAlerts: true,
    criticalAlerts: true,
  },
};

/**
 * Get default notification preferences for a role
 * @param {string} role - User role
 * @returns {Object} Default preferences
 */
export const getNotificationDefaultsForRole = (role) => {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
    case USER_ROLES.MODERATOR:
      return adminNotificationDefaults;
    case USER_ROLES.WHITELABEL_ADMIN:
    case USER_ROLES.WHITELABEL_MODERATOR:
      return whitelabelNotificationDefaults;
    case USER_ROLES.VENDOR:
      return vendorNotificationDefaults;
    case USER_ROLES.HOST:
    default:
      return hostNotificationDefaults;
  }
};

// ============================================
// NOTIFICATION OPTIONS CONFIG BY ROLE
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
        {
          key: "eventUpdates",
          labelKey: "notifications.eventUpdates",
          defaultLabel: "تحديثات الفعاليات",
        },
        {
          key: "eventReminders",
          labelKey: "notifications.eventReminders",
          defaultLabel: "تذكيرات الفعاليات",
        },
        {
          key: "guestResponses",
          labelKey: "notifications.guestResponses",
          defaultLabel: "ردود الضيوف",
        },
        {
          key: "guestCheckIns",
          labelKey: "notifications.guestCheckIns",
          defaultLabel: "تسجيل دخول الضيوف",
        },
        {
          key: "subscriptionAlerts",
          labelKey: "notifications.subscriptionAlerts",
          defaultLabel: "تنبيهات الاشتراك",
        },
        {
          key: "systemUpdates",
          labelKey: "notifications.systemUpdates",
          defaultLabel: "تحديثات النظام",
        },
      ],
      emailNotifications: [
        {
          key: "eventUpdates",
          labelKey: "notifications.eventUpdates",
          defaultLabel: "تحديثات الفعاليات",
        },
        {
          key: "eventReminders",
          labelKey: "notifications.eventReminders",
          defaultLabel: "تذكيرات الفعاليات",
        },
        {
          key: "guestResponses",
          labelKey: "notifications.guestResponses",
          defaultLabel: "ردود الضيوف",
        },
        {
          key: "subscriptionAlerts",
          labelKey: "notifications.subscriptionAlerts",
          defaultLabel: "تنبيهات الاشتراك",
        },
        {
          key: "invitationReports",
          labelKey: "notifications.invitationReports",
          defaultLabel: "تقارير الدعوات",
        },
      ],
    },
    vendor: {
      appNotifications: [
        {
          key: "serviceInquiries",
          labelKey: "notifications.serviceInquiries",
          defaultLabel: "استفسارات الخدمة",
        },
        {
          key: "adminReviews",
          labelKey: "notifications.adminReviews",
          defaultLabel: "تقييمات المدير",
        },
        {
          key: "profileViews",
          labelKey: "notifications.profileViews",
          defaultLabel: "مشاهدات الملف",
        },
        {
          key: "approvalStatus",
          labelKey: "notifications.approvalStatus",
          defaultLabel: "حالة الموافقة",
        },
        {
          key: "systemUpdates",
          labelKey: "notifications.systemUpdates",
          defaultLabel: "تحديثات النظام",
        },
      ],
      emailNotifications: [
        {
          key: "serviceInquiries",
          labelKey: "notifications.serviceInquiries",
          defaultLabel: "استفسارات الخدمة",
        },
        {
          key: "adminReviews",
          labelKey: "notifications.adminReviews",
          defaultLabel: "تقييمات المدير",
        },
        {
          key: "weeklyReport",
          labelKey: "notifications.weeklyReport",
          defaultLabel: "التقرير الأسبوعي",
        },
        {
          key: "approvalStatus",
          labelKey: "notifications.approvalStatus",
          defaultLabel: "حالة الموافقة",
        },
      ],
    },
    admin: {
      appNotifications: [
        {
          key: "newUsers",
          labelKey: "notifications.newUsers",
          defaultLabel: "المستخدمين الجدد",
        },
        {
          key: "vendorApprovals",
          labelKey: "notifications.vendorApprovals",
          defaultLabel: "موافقات التجار",
        },
        {
          key: "supportTickets",
          labelKey: "notifications.supportTickets",
          defaultLabel: "تذاكر الدعم",
        },
        {
          key: "systemAlerts",
          labelKey: "notifications.systemAlerts",
          defaultLabel: "تنبيهات النظام",
        },
        {
          key: "paymentAlerts",
          labelKey: "notifications.paymentAlerts",
          defaultLabel: "تنبيهات المدفوعات",
        },
        {
          key: "subscriptionAlerts",
          labelKey: "notifications.subscriptionAlerts",
          defaultLabel: "تنبيهات الاشتراكات",
        },
      ],
      emailNotifications: [
        {
          key: "dailyReport",
          labelKey: "notifications.dailyReport",
          defaultLabel: "التقرير اليومي",
        },
        {
          key: "weeklyReport",
          labelKey: "notifications.weeklyReport",
          defaultLabel: "التقرير الأسبوعي",
        },
        {
          key: "vendorApprovals",
          labelKey: "notifications.vendorApprovals",
          defaultLabel: "موافقات التجار",
        },
        {
          key: "supportTickets",
          labelKey: "notifications.supportTickets",
          defaultLabel: "تذاكر الدعم",
        },
        {
          key: "criticalAlerts",
          labelKey: "notifications.criticalAlerts",
          defaultLabel: "التنبيهات الحرجة",
        },
      ],
    },
    whitelabel: {
      appNotifications: [
        {
          key: "newHosts",
          labelKey: "notifications.newHosts",
          defaultLabel: "المضيفين الجدد",
        },
        {
          key: "eventActivity",
          labelKey: "notifications.eventActivity",
          defaultLabel: "نشاط الفعاليات",
        },
        {
          key: "subscriptionAlerts",
          labelKey: "notifications.subscriptionAlerts",
          defaultLabel: "تنبيهات الاشتراك",
        },
        {
          key: "paymentAlerts",
          labelKey: "notifications.paymentAlerts",
          defaultLabel: "تنبيهات المدفوعات",
        },
        {
          key: "systemUpdates",
          labelKey: "notifications.systemUpdates",
          defaultLabel: "تحديثات النظام",
        },
      ],
      emailNotifications: [
        {
          key: "dailyReport",
          labelKey: "notifications.dailyReport",
          defaultLabel: "التقرير اليومي",
        },
        {
          key: "weeklyReport",
          labelKey: "notifications.weeklyReport",
          defaultLabel: "التقرير الأسبوعي",
        },
        {
          key: "subscriptionAlerts",
          labelKey: "notifications.subscriptionAlerts",
          defaultLabel: "تنبيهات الاشتراك",
        },
        {
          key: "criticalAlerts",
          labelKey: "notifications.criticalAlerts",
          defaultLabel: "التنبيهات الحرجة",
        },
      ],
    },
  };

  // Map role to config key
  let configKey = "host";
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
    case USER_ROLES.MODERATOR:
      configKey = "admin";
      break;
    case USER_ROLES.WHITELABEL_ADMIN:
    case USER_ROLES.WHITELABEL_MODERATOR:
      configKey = "whitelabel";
      break;
    case USER_ROLES.VENDOR:
      configKey = "vendor";
      break;
    default:
      configKey = "host";
  }

  const config = configs[configKey];

  // Apply translations
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

export default {
  USER_ROLES,
  getNotificationSchemaForRole,
  getNotificationDefaultsForRole,
  getNotificationOptionsForRole,
  hostNotificationPreferencesSchema,
  vendorNotificationPreferencesSchema,
  adminNotificationPreferencesSchema,
  whitelabelNotificationPreferencesSchema,
};
