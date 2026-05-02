import { z } from "zod";

// Helper function to create schemas with localized messages
export const createEventAdditionSchemas = (t) => {
  // Helper schemas with localized messages
  const phoneSchema = z
    .string()
    .optional()
    .refine((val) => !val || /^5[0-9]{8}$/.test(val), {
      message: t
        ? t("singleEvent.addGuest.invalidPhone")
        : "Phone number must be 9 digits starting with 5",
    });

  const requiredPhoneSchema = z
    .string()
    .min(
      1,
      t
        ? t("singleEvent.addStaff.phoneRequired")
        : "Phone number is required"
    )
    .refine((val) => /^5[0-9]{8}$/.test(val), {
      message: t
        ? t("singleEvent.addStaff.invalidPhone")
        : "Phone number must be 9 digits starting with 5",
    });

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

  // Guest schema - name required, either email or phone required
  const guestSchema = z
    .object({
      id: z.number().optional(),
      name: requiredStringSchema,
      phone: phoneSchema,
      email: emailSchema,
    })
    .refine(
      (data) =>
        (data.phone && data.phone.trim()) || (data.email && data.email.trim()),
      {
        message: t
          ? t("singleEvent.addGuest.contactRequired")
          : "Either phone number or email address is required",
        path: ["contact"], // This will be the error path
      }
    );

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

// Default schemas without localization (for backward compatibility)
export const guestSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().min(1, "Name is required"),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || /^5[0-9]{8}$/.test(val), {
        message: "Phone number must be 9 digits starting with 5",
      }),
    email: z
      .string()
      .optional()
      .refine((val) => !val || z.string().email().safeParse(val).success, {
        message: "Please enter a valid email address",
      }),
  })
  .refine(
    (data) =>
      (data.phone && data.phone.trim()) || (data.email && data.email.trim()),
    {
      message: "Either phone number or email address is required",
      path: ["contact"], // This will be the error path
    }
  );

export const staffSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[0-9]{7,15}$/, {
      message: "Phone number must be 7-15 digits",
    }),
});
