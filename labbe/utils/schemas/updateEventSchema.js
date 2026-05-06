/**
 * Standalone update-event schema for the web app (labbe).
 *
 * Previously sourced from `@halla/shared-schemas`; now self-contained
 * for easier deployment.
 */

import { z } from "zod";

const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || val.length >= 9, {
    message: "Phone number must be at least 9 digits",
  });

const requiredPhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .min(9, "Phone number must be at least 9 digits");

const emailSchema = z
  .string()
  .optional()
  .refine((val) => !val || z.string().email().safeParse(val).success, {
    message: "Please enter a valid email address",
  });

const requiredStringSchema = z.string().min(1, "This field is required");

const updateGuestSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    _id: z.union([z.number(), z.string()]).optional(),
    name: requiredStringSchema,
    phone: phoneSchema,
    email: emailSchema,
  })
  .refine(
    (data) =>
      (data.phone && data.phone.trim()) || (data.email && data.email.trim()),
    {
      message: "Either phone number or email address is required",
      path: ["contact"],
    }
  );

const updateStaffSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  _id: z.union([z.number(), z.string()]).optional(),
  name: requiredStringSchema,
  phone: requiredPhoneSchema,
});

const updateLocationSchema = z.object({
  address: requiredStringSchema,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const dateLike = z
  .union([z.date(), z.string(), z.null()])
  .transform((val) => {
    if (val === null || val === undefined || val === "") return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  });

export const updateEventSchema = (t) =>
  z.object({
    eventDetails: z.object({
      title: requiredStringSchema,
      type: z.enum([
        "wedding",
        "birthday",
        "graduation",
        "meeting",
        "conference",
        "other",
      ]),
      date: dateLike.refine((d) => d instanceof Date, {
        message: t ? t("date_required") : "Date is required",
      }),
      time: z.string().min(1, t ? t("time_required") : "Time is required"),
      location: updateLocationSchema,
      description: z.string().optional(),
    }),

    guestList: z
      .array(updateGuestSchema)
      .min(1, t ? t("guest_list_required") : "At least one guest is required"),

    supervisorsList: z.array(updateStaffSchema).optional(),
    staffList: z.array(updateStaffSchema).optional(),

    invitationSettings: z
      .object({
        visualTemplate: z.any().optional(),
        taqnyatTemplate: z.any().optional(),
        guestReplies: z
          .object({
            onAttend: z.string().optional(),
            onAbsent: z.string().optional(),
            onExpected: z.string().optional(),
          })
          .partial()
          .optional(),
        selectedTemplate: z.any().optional(),
        attendanceAutoReply: z.string().optional(),
        absenceAutoReply: z.string().optional(),
        expectedAttendanceAutoReply: z.string().optional(),
        templateImage: z.any().optional(),
      })
      .partial()
      .optional(),

    launchSettings: z
      .object({
        sendSchedule: z.enum(["now", "later"]).default("now"),
        scheduledDate: dateLike.nullable().optional(),
        scheduledTime: z.string().optional(),
      })
      .partial()
      .optional(),
  });

export const updateStepValidationSchemas = (t) => ({
  1: z.object({
    eventDetails: updateEventSchema(t).shape.eventDetails,
  }),
  2: z
    .object({
      guestList: updateEventSchema(t).shape.guestList,
      supervisorsList: updateEventSchema(t).shape.supervisorsList,
      staffList: updateEventSchema(t).shape.staffList,
    })
    .refine(
      (data) =>
        Array.isArray(data.supervisorsList) || Array.isArray(data.staffList),
      {
        message:
          "supervisorsList or staffList is required for step 2 (atomic endpoint)",
        path: ["staffList"],
      }
    ),
  3: z.object({
    invitationSettings: updateEventSchema(t).shape.invitationSettings,
  }),
  4: z.object({
    launchSettings: updateEventSchema(t).shape.launchSettings,
  }),
});

export const validateUpdateStep = (stepNumber, data, t) => {
  const schemas = updateStepValidationSchemas(t);
  const schema = schemas[stepNumber];
  if (!schema) return { success: false, error: "Invalid step number" };
  try {
    schema.parse(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.errors };
  }
};

export default updateEventSchema;
