import { z } from "zod";

export const accountSettingsSchema = (t) =>
  z
    .object({
      username: z
        .string()
        .min(2, t ? t("username_min_length") : "Username must be at least 2 characters")
        .max(50, t ? t("username_max_length") : "Username must be less than 50 characters"),

      email: z
        .string()
        .email(t ? t("email_invalid") : "Please enter a valid email address"),

      currentPassword: z.string().optional().or(z.literal("")),

      password: z
        .string()
        .min(8, t ? t("password_min_length") : "Password must be at least 8 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          t ? t("password_requirements") : "Password must contain uppercase, lowercase, and a number"
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
        message: t ? t("password_mismatch") : "Passwords do not match",
        path: ["confirmPassword"],
      }
    )
    .refine(
      (data) => {
        // If new password is set, current password is required
        if (data.password && data.password !== "") {
          return !!data.currentPassword && data.currentPassword !== "";
        }
        return true;
      },
      {
        message: t ? t("current_password_required") : "Current password is required to set a new password",
        path: ["currentPassword"],
      }
    );

export default accountSettingsSchema;
