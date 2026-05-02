import { z } from "zod";

/**
 * Zod phone number validation schema
 * Supports Saudi Arabia (9-10 digits) and Egypt (11 digits)
 */
export const phoneNumberSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ""))
  .refine(
    (val) => {
      if (val.length === 9) return val.startsWith("5");
      if (val.length === 10) return val.startsWith("05");
      if (val.length === 11) return val.startsWith("01");
      return false;
    },
    {
      message:
        "Invalid phone number. Must be 9 digits starting with 5 (Saudi), 10 digits starting with 05 (Saudi), or 11 digits starting with 01 (Egypt)",
    }
  )
  .transform((val) => {
    // Normalize 10-digit Saudi numbers to 9 digits
    if (val.length === 10 && val.startsWith("05")) {
      return val.substring(1);
    }
    return val;
  });

/**
 * Optional phone number schema
 */
export const optionalPhoneNumberSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((val) => {
    if (!val) return val;
    return val.replace(/\D/g, "");
  })
  .refine(
    (val) => {
      if (!val || val === "") return true;
      if (val.length === 9) return val.startsWith("5");
      if (val.length === 10) return val.startsWith("05");
      if (val.length === 11) return val.startsWith("01");
      return false;
    },
    {
      message:
        "Invalid phone number. Must be 9 digits starting with 5 (Saudi), 10 digits starting with 05 (Saudi), or 11 digits starting with 01 (Egypt)",
    }
  )
  .transform((val) => {
    if (!val || val === "") return val;
    // Normalize 10-digit Saudi numbers to 9 digits
    if (val.length === 10 && val.startsWith("05")) {
      return val.substring(1);
    }
    return val;
  });
