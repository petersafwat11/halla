import { z } from "zod";

/**
 * Phone number regex for Saudi Arabia
 */
const phoneRegex = /^(\+966|966|0)?5[0-9]{8}$/;

/**
 * Password regex - at least 8 chars, uppercase, lowercase, number
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Profile update schema
 * Used when updating user profile information
 */
export const profileUpdateSchema = (t) =>
  z.object({
    username: z
      .string()
      .min(
        3,
        t?.("settings.errors.usernameMinLength") ||
          "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"
      )
      .max(
        50,
        t?.("settings.errors.usernameMaxLength") ||
          "اسم المستخدم يجب أن لا يتجاوز 50 حرف"
      )
      .optional(),
    name: z
      .string()
      .min(
        2,
        t?.("settings.errors.nameMinLength") ||
          "الاسم يجب أن يكون حرفين على الأقل"
      )
      .max(
        100,
        t?.("settings.errors.nameMaxLength") || "الاسم يجب أن لا يتجاوز 100 حرف"
      )
      .optional(),
    email: z
      .string()
      .email(
        t?.("settings.errors.invalidEmail") || "البريد الإلكتروني غير صالح"
      )
      .optional()
      .or(z.literal("")),
    phoneNumber: z
      .string()
      .regex(
        phoneRegex,
        t?.("settings.errors.invalidPhone") || "رقم الهاتف غير صالح"
      )
      .optional()
      .or(z.literal("")),
  });

/**
 * Password update schema
 * Used when changing password
 */
export const passwordUpdateSchema = (t) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(
          1,
          t?.("settings.errors.currentPasswordRequired") ||
            "كلمة المرور الحالية مطلوبة"
        ),
      newPassword: z
        .string()
        .min(
          8,
          t?.("settings.errors.passwordMinLength") ||
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
        )
        .regex(
          passwordRegex,
          t?.("settings.errors.passwordComplexity") ||
            "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم"
        ),
      confirmPassword: z
        .string()
        .min(
          1,
          t?.("settings.errors.confirmPasswordRequired") ||
            "تأكيد كلمة المرور مطلوب"
        ),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message:
        t?.("settings.errors.passwordsDoNotMatch") ||
        "كلمات المرور غير متطابقة",
      path: ["confirmPassword"],
    });

/**
 * Email notification preferences schema
 */
export const emailNotificationSchema = z.object({
  eventReminders: z.boolean().default(true),
  guestUpdates: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  weeklyDigest: z.boolean().default(true),
});

/**
 * Push notification preferences schema
 */
export const pushNotificationSchema = z.object({
  eventReminders: z.boolean().default(true),
  guestUpdates: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
  chatMessages: z.boolean().default(true),
});

/**
 * SMS notification preferences schema
 */
export const smsNotificationSchema = z.object({
  eventReminders: z.boolean().default(false),
  urgentAlerts: z.boolean().default(true),
});

/**
 * Full notification preferences schema
 */
export const notificationPreferencesSchema = z.object({
  email: emailNotificationSchema.optional(),
  push: pushNotificationSchema.optional(),
  sms: smsNotificationSchema.optional(),
});

/**
 * App notifications schema (for host dashboard)
 */
export const appNotificationsSchema = z.object({
  eventUpdates: z.boolean().default(true),
  eventDates: z.boolean().default(true),
  packageRenewal: z.boolean().default(true),
  systemInteractions: z.boolean().default(true),
});

/**
 * Email notifications schema (for host dashboard)
 */
export const hostEmailNotificationsSchema = z.object({
  eventUpdates: z.boolean().default(false),
  eventDates: z.boolean().default(false),
  packageRenewal: z.boolean().default(false),
  beforeSendingInvitations: z.boolean().default(false),
  afterSendingInvitations: z.boolean().default(false),
});

/**
 * Notifications schema for host settings page
 * Used in Notifications.js component
 */
export const notificationsSchema = (t) =>
  z.object({
    appNotifications: appNotificationsSchema,
    emailNotifications: hostEmailNotificationsSchema,
  });

/**
 * Account deletion schema
 * Used when deleting account
 */
export const accountDeletionSchema = (t) =>
  z.object({
    password: z
      .string()
      .min(
        1,
        t?.("settings.errors.passwordRequired") || "كلمة المرور مطلوبة للتأكيد"
      ),
    confirmation: z.literal("DELETE", {
      errorMap: () => ({
        message:
          t?.("settings.errors.confirmDeletion") || "يرجى كتابة DELETE للتأكيد",
      }),
    }),
  });

/**
 * Email verification schema
 */
export const emailVerificationSchema = (t) =>
  z.object({
    email: z
      .string()
      .email(
        t?.("settings.errors.invalidEmail") || "البريد الإلكتروني غير صالح"
      ),
  });

/**
 * Get default profile values
 */
export const getProfileDefaults = (user) => ({
  username: user?.username || "",
  name: user?.name || "",
  email: user?.email || "",
  phoneNumber: user?.phoneNumber || "",
});

/**
 * Get default password form values
 */
export const getPasswordDefaults = () => ({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

/**
 * Get default notification preferences
 */
export const getNotificationDefaults = () => ({
  email: {
    eventReminders: true,
    guestUpdates: true,
    paymentAlerts: true,
    marketingEmails: false,
    weeklyDigest: true,
  },
  push: {
    eventReminders: true,
    guestUpdates: true,
    paymentAlerts: true,
    chatMessages: true,
  },
  sms: {
    eventReminders: false,
    urgentAlerts: true,
  },
});

/**
 * Validate profile data
 * @param {Object} data - Profile data to validate
 * @param {Function} t - Translation function
 * @returns {Object} Validation result
 */
export const validateProfileData = (data, t) => {
  try {
    const schema = profileUpdateSchema(t);
    const result = schema.parse(data);
    return { success: true, data: result, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { success: false, data: null, errors };
    }
    throw error;
  }
};

/**
 * Validate password data
 * @param {Object} data - Password data to validate
 * @param {Function} t - Translation function
 * @returns {Object} Validation result
 */
export const validatePasswordData = (data, t) => {
  try {
    const schema = passwordUpdateSchema(t);
    const result = schema.parse(data);
    return { success: true, data: result, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { success: false, data: null, errors };
    }
    throw error;
  }
};

const settingsSchemas = {
  profileUpdateSchema,
  passwordUpdateSchema,
  emailNotificationSchema,
  pushNotificationSchema,
  smsNotificationSchema,
  notificationPreferencesSchema,
  appNotificationsSchema,
  hostEmailNotificationsSchema,
  notificationsSchema,
  accountDeletionSchema,
  emailVerificationSchema,
  getProfileDefaults,
  getPasswordDefaults,
  getNotificationDefaults,
  validateProfileData,
  validatePasswordData,
};

export default settingsSchemas;
