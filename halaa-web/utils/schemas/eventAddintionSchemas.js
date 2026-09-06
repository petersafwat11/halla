import { z } from "zod";
import { saudiPhone, optionalSaudiPhone } from "@halaa/shared/schemas/_shared";
import { clampPhoneInput, SAUDI_PHONE_REGEX } from "@halaa/shared/utils/phone";

// Helper function to create schemas with localized messages
export const createEventAdditionSchemas = (t) => {
  // Helper schemas with localized messages
  const phoneSchema = optionalSaudiPhone(t);
  const requiredPhoneSchema = saudiPhone(t);

  const emailSchema = z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: t
        ? t("singleEvent.addGuest.invalidEmail")
        : "Please enter a valid email address",
    });

  const requiredStringSchema = z
    .string()
    .min(1, t ? t("common.required") : "This field is required");

  // Guest schema — name and phone are required (email no longer used).
  const guestSchema = z.object({
    id: z.number().optional(),
    name: requiredStringSchema,
    phone: requiredPhoneSchema,
    category: z.string().trim().max(60).optional(),
  });

  // Staff schema - name and phone required
  const staffSchema = z.object({
    id: z.number().optional(),
    name: z
      .string()
      .min(
        2,
        t
          ? t("singleEvent.addStaff.nameRequired")
          : "Name must be at least 2 characters"
      )
      .max(
        100,
        t
          ? t("singleEvent.addStaff.nameMaxLength")
          : "Name cannot exceed 100 characters"
      ),
    phone: requiredPhoneSchema,
    email: emailSchema,
    isMain: z.boolean().optional().default(false),
  });

  return {
    guestSchema,
    staffSchema,
    phoneSchema,
    requiredPhoneSchema,
    emailSchema,
    requiredStringSchema,
  };
};

// Default schema without localization — name + phone, no email.
export const guestSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform((val) => clampPhoneInput(val))
    .refine((val) => SAUDI_PHONE_REGEX.test(val), {
      message: "Phone number must be 10 digits starting with 05 or 9 digits starting with 5",
    }),
});

export const staffSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform((val) => clampPhoneInput(val))
    .refine((val) => SAUDI_PHONE_REGEX.test(val), {
      message: "Phone number must be 10 digits starting with 05 or 9 digits starting with 5",
    }),
});
