/**
 * Settings schemas — profile update, password change, account settings,
 * notification preferences (per-role).
 *
 * Hosts the union of:
 *   - `halaa-web/utils/schemas/settingsSchemas.js`        (web, factory `(t) => ...`)
 *   - `halaa-web/utils/schemas/accountSettingsSchema.js`  (web, factory `(t) => ...`)
 *   - `halaa-web/utils/schemas/notificationPreferencesSchemas.js` (web, zod parts only — UI options live in the app)
 *   - `halaa-mobile/utils/schemas/settingsSchema.js`  (mobile, opaque i18n keys as messages)
 *
 * Validation rules mirror backend `users.validation.js` /
 * `NotificationPreferencesModel`.
 *
 * The two `accountSettingsSchema` variants are kept distinct (one
 * factory, one opaque-key) because the existing call sites differ —
 * web uses `t`, mobile passes i18n keys through to `react-i18next`.
 * Both are exported; consumers stay on the variant they already used.
 */
import { z } from "zod";
import { SAUDI_PHONE_REGEX, PASSWORD_COMPLEXITY_REGEX } from "./_shared.js";

const idT = (k) => k;

// ============================================================
// PROFILE / PASSWORD (web — factory pattern)
// ============================================================

export const profileUpdateSchema = (t = idT) =>
  z.object({
    username: z
      .string()
      .min(
        3,
        t("settings.errors.usernameMinLength") ||
          "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"
      )
      .max(
        50,
        t("settings.errors.usernameMaxLength") ||
          "اسم المستخدم يجب أن لا يتجاوز 50 حرف"
      )
      .optional(),
    name: z
      .string()
      .min(
        2,
        t("settings.errors.nameMinLength") ||
          "الاسم يجب أن يكون حرفين على الأقل"
      )
      .max(
        100,
        t("settings.errors.nameMaxLength") || "الاسم يجب أن لا يتجاوز 100 حرف"
      )
      .optional(),
    email: z
      .string()
      .email(t("settings.errors.invalidEmail") || "البريد الإلكتروني غير صالح")
      .optional()
      .or(z.literal("")),
    phoneNumber: z
      .string()
      .regex(
        SAUDI_PHONE_REGEX,
        t("settings.errors.invalidPhone") || "رقم الهاتف غير صالح"
      )
      .optional()
      .or(z.literal("")),
  });

export const passwordUpdateSchema = (t = idT) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(
          1,
          t("settings.errors.currentPasswordRequired") ||
            "كلمة المرور الحالية مطلوبة"
        ),
      newPassword: z
        .string()
        .min(
          8,
          t("settings.errors.passwordMinLength") ||
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
        )
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          t("settings.errors.passwordComplexity") ||
            "كلمة المرور تتكون من حروف وأرقام فقط، وبها حرف ورقم على الأقل"
        ),
      confirmPassword: z
        .string()
        .min(
          1,
          t("settings.errors.confirmPasswordRequired") ||
            "تأكيد كلمة المرور مطلوب"
        ),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message:
        t("settings.errors.passwordsDoNotMatch") ||
        "كلمات المرور غير متطابقة",
      path: ["confirmPassword"],
    });

// ============================================================
// ACCOUNT SETTINGS — web variant (factory, English-default messages)
// ============================================================

export const accountSettingsSchema = (t = idT) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t("name_min_length") || "Name must be at least 2 characters")
        .max(
          100,
          t("name_max_length") || "Name must be less than 100 characters"
        ),

      username: z
        .string()
        .min(
          2,
          t("username_min_length") || "Username must be at least 2 characters"
        )
        .max(
          50,
          t("username_max_length") || "Username must be less than 50 characters"
        ),

      email: z
        .string()
        .email(t("email_invalid") || "Please enter a valid email address"),

      currentPassword: z.string().optional().or(z.literal("")),

      password: z
        .string()
        .min(
          8,
          t("password_min_length") || "Password must be at least 8 characters"
        )
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          t("password_requirements") ||
            "Password may use letters and numbers only, including at least one of each"
        )
        .optional()
        .or(z.literal("")),

      confirmPassword: z.string().optional().or(z.literal("")),
    })
    .refine(
      (data) => {
        if (data.password && data.password !== "") {
          return data.password === data.confirmPassword;
        }
        return true;
      },
      {
        message: t("password_mismatch") || "Passwords do not match",
        path: ["confirmPassword"],
      }
    )
    .refine(
      (data) => {
        if (data.password && data.password !== "") {
          return !!data.currentPassword && data.currentPassword !== "";
        }
        return true;
      },
      {
        message:
          t("current_password_required") ||
          "Current password is required to set a new password",
        path: ["currentPassword"],
      }
    );

// ============================================================
// ACCOUNT SETTINGS — mobile variant (plain schema, opaque i18n keys)
//
// Used by `halaa-mobile/components/settings/AccountSettings.js`. The
// field name is `newPassword` (mobile) vs `password` (web). The
// rename is intentional UI naming, not a divergent backend shape, so
// both forms POST the same payload after mapping in the screen.
// ============================================================

export const mobileAccountSettingsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "validation.nameMin")
      .max(100, "validation.nameMax"),
    username: z
      .string()
      .min(2, "validation.usernameMin")
      .max(50, "validation.usernameMax"),
    email: z.string().email("validation.emailInvalid"),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine(
        (val) =>
          !val ||
          (val.length >= 8 &&
            val.length <= 128 &&
            PASSWORD_COMPLEXITY_REGEX.test(val)),
        "validation.passwordComplexity"
      ),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasCurrent =
        !!data.currentPassword && data.currentPassword.trim().length > 0;
      const hasNew = !!data.newPassword && data.newPassword.length > 0;
      if (hasCurrent) {
        return hasNew;
      }
      return true;
    },
    {
      message: "validation.newPasswordRequired",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      const hasCurrent =
        !!data.currentPassword && data.currentPassword.trim().length > 0;
      const hasNew = !!data.newPassword && data.newPassword.length > 0;
      if (hasNew) {
        return hasCurrent;
      }
      return true;
    },
    {
      message: "validation.currentPasswordRequired",
      path: ["currentPassword"],
    }
  )
  .refine(
    (data) => {
      const hasConfirm =
        !!data.confirmPassword && data.confirmPassword.trim().length > 0;
      const hasNew = !!data.newPassword && data.newPassword.length > 0;
      if (hasConfirm) {
        return hasNew;
      }
      return true;
    },
    {
      message: "validation.newPasswordRequired",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      const hasNew = !!data.newPassword && data.newPassword.length > 0;
      if (hasNew) {
        return data.confirmPassword === data.newPassword;
      }
      return true;
    },
    {
      message: "validation.passwordsDoNotMatch",
      path: ["confirmPassword"],
    }
  );

export const accountDeletionSchema = (t = idT) =>
  z.object({
    password: z
      .string()
      .min(
        1,
        t("settings.errors.passwordRequired") || "كلمة المرور مطلوبة للتأكيد"
      ),
    confirmation: z.literal("DELETE", {
      errorMap: () => ({
        message:
          t("settings.errors.confirmDeletion") || "يرجى كتابة DELETE للتأكيد",
      }),
    }),
  });

export const emailVerificationSchema = (t = idT) =>
  z.object({
    email: z
      .string()
      .email(t("settings.errors.invalidEmail") || "البريد الإلكتروني غير صالح"),
  });

// ============================================================
// ROLE-AWARE NOTIFICATION PREFERENCES
// Mirrors backend `NotificationPreferencesModel`. UI labels/option
// configs stay app-side (they reference each app's i18n catalogue).
// ============================================================

export const hostAppNotificationsSchema = z.object({
  eventUpdates: z.boolean().default(true),
  eventReminders: z.boolean().default(true),
  guestResponses: z.boolean().default(true),
  guestCheckIns: z.boolean().default(true),
  subscriptionAlerts: z.boolean().default(true),
  systemUpdates: z.boolean().default(true),
});

export const adminAppNotificationsSchema = z.object({
  newUsers: z.boolean().default(true),
  vendorApprovals: z.boolean().default(true),
  supportTickets: z.boolean().default(true),
  systemAlerts: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
  subscriptionAlerts: z.boolean().default(true),
});

export const adminEmailNotificationsSchema = z.object({
  dailyReport: z.boolean().default(true),
  weeklyReport: z.boolean().default(true),
  vendorApprovals: z.boolean().default(true),
  supportTickets: z.boolean().default(false),
  criticalAlerts: z.boolean().default(true),
});

export const hostNotificationPreferencesSchema = z.object({
  appNotifications: hostAppNotificationsSchema,
});

export const adminNotificationPreferencesSchema = z.object({
  appNotifications: adminAppNotificationsSchema,
  emailNotifications: adminEmailNotificationsSchema,
});

// Role constants — duplicated here for back-compat with consumers that
// imported `USER_ROLES` from the original schema file. New code should
// import from `@halaa/shared/constants/roles` once that lands.
export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  HOST: "host",
  VENDOR: "vendor",
  GUEST: "guest",
};

export const getNotificationSchemaForRole = (role) => {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
    case USER_ROLES.MODERATOR:
      return adminNotificationPreferencesSchema;
    case USER_ROLES.HOST:
      return hostNotificationPreferencesSchema;
    default:
      throw new Error(
        `No notification preferences schema for role: ${role}`
      );
  }
};

export const hostNotificationDefaults = {
  appNotifications: {
    eventUpdates: true,
    eventReminders: true,
    guestResponses: true,
    guestCheckIns: true,
    subscriptionAlerts: true,
    systemUpdates: true,
  },
};

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

export const getNotificationDefaultsForRole = (role) => {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
    case USER_ROLES.MODERATOR:
      return adminNotificationDefaults;
    case USER_ROLES.HOST:
      return hostNotificationDefaults;
    default:
      throw new Error(
        `No notification preferences defaults for role: ${role}`
      );
  }
};

// ============================================================
// MOBILE — host notification settings (matches backend
// NotificationPreferencesModel; equivalent to
// `hostNotificationPreferencesSchema` plus an optional SMS block)
// ============================================================

export const mobileNotificationSettingsSchema = z.object({
  appNotifications: z.object({
    eventUpdates: z.boolean(),
    eventReminders: z.boolean(),
    guestResponses: z.boolean(),
    guestCheckIns: z.boolean(),
    subscriptionAlerts: z.boolean(),
    systemUpdates: z.boolean(),
  }),
});

// ============================================================
// DEFAULTS / VALIDATION HELPERS (web compatibility re-exports)
// ============================================================

export const getProfileDefaults = (user) => ({
  username: user?.username || "",
  name: user?.name || "",
  email: user?.email || "",
  phoneNumber: user?.phoneNumber || "",
});

export const getPasswordDefaults = () => ({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

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
