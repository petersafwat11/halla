import { z } from "zod";

// Account Settings Schema
export const accountSettingsSchema = z
  .object({
    username: z
      .string()
      .min(2, "validation.usernameMin")
      .max(50, "validation.usernameMax"),
    email: z.string().email("validation.emailInvalid"),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 8, "validation.passwordMin"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.confirmPassword === data.newPassword;
      }
      return true;
    },
    {
      message: "validation.passwordsDoNotMatch",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return !!data.currentPassword;
      }
      return true;
    },
    {
      message: "validation.currentPasswordRequired",
      path: ["currentPassword"],
    }
  );

// Host Notification Settings Schema (matches backend NotificationPreferencesModel)
export const notificationSettingsSchema = z.object({
  appNotifications: z.object({
    eventUpdates: z.boolean(),
    eventReminders: z.boolean(),
    guestResponses: z.boolean(),
    guestCheckIns: z.boolean(),
    subscriptionAlerts: z.boolean(),
    systemUpdates: z.boolean(),
  }),
  emailNotifications: z.object({
    eventUpdates: z.boolean(),
    eventReminders: z.boolean(),
    guestResponses: z.boolean(),
    subscriptionAlerts: z.boolean(),
    invitationReports: z.boolean(),
  }),
  smsNotifications: z
    .object({
      eventReminders: z.boolean(),
      guestConfirmations: z.boolean(),
      importantUpdates: z.boolean(),
    })
    .optional(),
});
