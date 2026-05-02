import { z } from "zod";
import { optionalPhoneNumberSchema } from "./phoneValidation";

export const addModeratorSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username cannot exceed 50 characters")
      .trim(),
    email: z.string().email("Please enter a valid email").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string(),
    phoneNumber: optionalPhoneNumberSchema,
    title: z
      .string()
      .max(100, "Title cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    role: z.enum(["admin", "moderator"]).default("moderator"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Schema for editing (password optional)
export const editModeratorSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters")
    .trim(),
  phoneNumber: z
    .string()
    .min(9, "Phone number must be at least 9 digits")
    .optional()
    .or(z.literal("")),
  title: z
    .string()
    .max(100, "Title cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
});

/**
 * Available roles for admin/moderator
 */
export const rolesList = [
  {
    key: "admin",
    labelAr: "مدير",
    labelEn: "Admin",
  },
  {
    key: "moderator",
    labelAr: "مشرف",
    labelEn: "Moderator",
  },
];

/**
 * DEPRECATED: Permissions are now role-based, not customizable per user
 * Kept for reference only - see navConfig.js ROLE_PAGE_ACCESS for current permissions
 *
 * Moderator role has fixed permissions:
 * - hosts: EDIT (create/update, no delete)
 * - events: EDIT (create/update, no delete)
 * - tickets: FULL (all operations)
 * - vendors: VIEW (read only)
 * - payments: VIEW (read only)
 * - dashboard: VIEW (read only)
 */
