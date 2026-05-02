import { z } from "zod";

// Helper schemas
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
      message: "Either phone number or email address is required",
      path: ["contact"], // This will be the error path
    }
  );

// Staff schema - name and phone required
const staffSchema = z.object({
  id: z.number().optional(),
  name: requiredStringSchema,
  phone: requiredPhoneSchema,
});

// Location schema
const locationSchema = z.object({
  address: requiredStringSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  country: z.string().optional(),
});

// Template schema
const templateSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  image: z.string().optional(),
  data: z.object({
    messageText: z.string().optional(),
    brideName: z.string().optional(),
    groomName: z.string().optional(),
    guestMessage: z.string().optional(),
    entryDate: z.date().optional().nullable(),
    entryTime: z.string().optional(),
    address: z.string().optional(),
    endMessage: z.string().optional(),
    fontType: z.string().optional(),
    primaryColor: z.string().optional(),
  }).optional(),
  colors: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    })
    .optional(),
});

// Main create event schema
export const createEventSchema = (t) =>
  z.object({
    // Step 1: Event Details
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
      date: z.date({
        required_error: t ? t("date_required") : "Date is required",
      }),
      time: z.string().min(1, t ? t("time_required") : "Time is required"),
      location: locationSchema,
      description: z.string().optional(),
    }),

    // Step 2: Guest List
    guestList: z
      .array(guestSchema)
      .min(1, t ? t("guest_list_required") : "At least one guest is required"),

    // Step 3: Staff List
    staffList: z.array(staffSchema).optional(),

    // Step 4: Invitation Settings
    invitationSettings: z.object({
      selectedTemplate: templateSchema.optional(),
      invitationMessage: z.string().optional(),
      attendanceAutoReply: z.string().optional(),
      absenceAutoReply: z.string().optional(),
      expectedAttendanceAutoReply: z.string().optional(),
      templateImage: z.instanceof(File).optional(),
      note: z.string().optional(),
    }),

    // Step 5: Launch Settings
    launchSettings: z.object({
      sendSchedule: z.enum(["now", "later"]).default("now"),
      scheduledDate: z.date().optional().nullable(),
      scheduledTime: z.string().optional(),
    }),
  });

// Step validation schemas (updated for 4 steps)
export const stepValidationSchemas = (t) => ({
  1: z.object({
    eventDetails: createEventSchema(t).shape.eventDetails,
  }),
  2: z.object({
    guestList: createEventSchema(t).shape.guestList,
    staffList: createEventSchema(t).shape.staffList,
  }),
  3: z.object({
    invitationSettings: createEventSchema(t).shape.invitationSettings,
  }),
  4: z.object({
    launchSettings: createEventSchema(t).shape.launchSettings,
  }),
});

// Helper function to validate individual steps
export const validateStep = (stepNumber, data, t) => {
  const schemas = stepValidationSchemas(t);
  const schema = schemas[stepNumber];

  if (!schema) {
    return { success: false, error: "Invalid step number" };
  }

  try {
    schema.parse(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.errors };
  }
};

// Helper function to check if step has required data (updated for 4 steps)
export const hasRequiredStepData = (stepNumber, data) => {
  switch (stepNumber) {
    case 1:
      return (
        data.eventDetails?.title &&
        data.eventDetails?.type &&
        data.eventDetails?.date &&
        data.eventDetails?.time &&
        data.eventDetails?.location?.address
      );
    case 2:
      return data.guestList && data.guestList.length > 0; // At least one guest required, staff optional
    case 3:
      return true; // Invitation settings are optional
    case 4:
      return data.launchSettings?.sendSchedule;
    default:
      return false;
  }
};

// Template form schema for invitation template customization
export const templateFormSchema = (t) =>
  z.object({
    messageText: z.string().optional(),
    brideName: z
      .string()
      .min(1, t ? t("bride_name_required") : "Bride name is required"),
    groomName: z
      .string()
      .min(1, t ? t("groom_name_required") : "Groom name is required"),
    guestMessage: z.string().optional(),
    entryDate: z.date({
      required_error: t ? t("entry_date_required") : "Event date is required",
    }),
    entryTime: z
      .string()
      .min(1, t ? t("entry_time_required") : "Event time is required")
      .regex(
        /^(0[1-9]|1[0-2]):[0-5][0-9]:(AM|PM)$/,
        t ? t("invalid_time_format") : "Invalid time format (HH:MM:AM/PM)"
      ),
    address: z
      .string()
      .min(1, t ? t("address_required") : "Address is required"),
    endMessage: z.string().optional(),
    fontType: z
      .enum(["inter", "cairo", "lato"], {
        required_error: t ? t("font_type_required") : "Font type is required",
      })
      .default("cairo"),
    primaryColor: z
      .string()
      .min(1, t ? t("primary_color_required") : "Primary color is required")
      .regex(
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        t
          ? t("invalid_color_format")
          : "Invalid color format (hex color required)"
      )
      .default("#5a4a42"),
  });

const colorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const MOBILE_FONT_IDS = ["cairo", "inter", "lato", "amiri", "ibm_plex_arabic", "noto_sans_arabic"];

export const buildDynamicTemplateSchema = (fields, t) => {
  const shape = {};
  for (const field of fields) {
    let schema;
    switch (field.type) {
      case "text":
      case "textarea": {
        let s = z.string();
        if (field.minLength) s = s.min(field.minLength, t ? t("templates.fields.validation.minLength", { min: field.minLength }) : `Min ${field.minLength} chars`);
        if (field.maxLength) s = s.max(field.maxLength, t ? t("templates.fields.validation.maxLength", { max: field.maxLength }) : `Max ${field.maxLength} chars`);
        schema = field.required ? s.min(1, t ? t("templates.fields.validation.required") : "Required") : s.optional();
        break;
      }
      case "email": {
        let s = z.string().email(t ? t("templates.fields.validation.invalidEmail") : "Invalid email");
        if (field.minLength) s = s.min(field.minLength);
        if (field.maxLength) s = s.max(field.maxLength);
        schema = field.required ? s.min(1, t ? t("templates.fields.validation.required") : "Required") : s.optional();
        break;
      }
      case "password": {
        let s = z.string();
        if (field.minLength) s = s.min(field.minLength);
        if (field.maxLength) s = s.max(field.maxLength);
        schema = field.required ? s.min(1, t ? t("templates.fields.validation.required") : "Required") : s.optional();
        break;
      }
      case "date":
        schema = field.required
          ? z.date({ required_error: t ? t("templates.fields.validation.required") : "Required" })
          : z.date().nullable().optional();
        break;
      case "time":
        // Mobile TimePicker emits Date; dateToTimeString conversion happens in submit handler
        schema = field.required
          ? z.date({ required_error: t ? t("templates.fields.validation.required") : "Required" })
          : z.date().nullable().optional();
        break;
      case "color":
        schema = field.required
          ? z.string().regex(colorRegex, t ? t("templates.fields.validation.invalidColor") : "Invalid color")
          : z.string().regex(colorRegex).optional();
        break;
      case "font":
        schema = z.enum(MOBILE_FONT_IDS, { errorMap: () => ({ message: t ? t("templates.fields.validation.required") : "Required" }) });
        if (!field.required) schema = schema.optional();
        break;
      case "number": {
        let s = z.coerce.number({ invalid_type_error: t ? t("templates.fields.validation.invalidNumber") : "Invalid number" });
        if (field.min !== undefined) s = s.min(field.min);
        if (field.max !== undefined) s = s.max(field.max);
        schema = field.required
          ? s
          : z.preprocess(v => v === "" ? undefined : v, s.optional());
        break;
      }
      default:
        schema = z.any();
    }
    shape[field.key] = schema;
  }
  return z.object(shape);
};

export const buildDefaultValues = (template, parentEventDate, parentEventTime) => {
  if (!template?.fields) return {};
  return template.fields.reduce((acc, field) => {
    const saved = template?.data?.[field.key];
    let defaultVal;
    switch (field.type) {
      case "date":
        defaultVal = saved ? new Date(saved) : (parentEventDate ? new Date(parentEventDate) : null);
        break;
      case "time":
        // Mobile time field default is a Date (for TimePicker)
        defaultVal = saved ? parseTimeStringToDate(saved) : (parentEventTime ? parseTimeStringToDate(parentEventTime) : new Date());
        break;
      case "font":
        defaultVal = saved ?? field.defaultValue ?? "cairo";
        break;
      case "color":
        defaultVal = saved ?? field.defaultValue ?? "#c28e5c";
        break;
      case "number":
        defaultVal = saved ?? field.defaultValue ?? "";
        break;
      default:
        defaultVal = saved ?? field.defaultValue ?? "";
    }
    acc[field.key] = defaultVal;
    return acc;
  }, {});
};

function parseTimeStringToDate(str) {
  if (!str || typeof str !== "string") return new Date();
  const parts = str.split(":");
  if (parts.length < 2) return new Date();
  let hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  const period = parts[2];
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d;
}

export default createEventSchema;
