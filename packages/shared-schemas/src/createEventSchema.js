/**
 * Shared `createEventSchema` (Phase 4d W0-SCHEMAS).
 *
 * Lifted from `labbe/utils/schemas/createEventSchema.js` (post-Phase-4c
 * canonical shape). Mobile and web both `import` from
 * `@halla/shared-schemas` via the re-export shims under their own
 * `utils/schemas/` trees.
 *
 * Conventions:
 *   - CommonJS module (so `node -e "require('@halla/shared-schemas')"`
 *     works without ESM loader flags). Web (Next.js) and mobile (Metro)
 *     normalise CJS → ESM at consume time.
 *   - All locale strings come through the optional `t` translator
 *     argument — schemas don't reach into i18n state directly.
 *   - The dynamic-template factory accepts a `fontIds` argument so each
 *     consumer keeps full control of its font registry. The web app
 *     hydrates `FONT_IDS` from `/api/v2/fonts`; the mobile app keeps a
 *     pinned list. Defaults match the post-4c web font set.
 */

const { z } = require("zod");

const DEFAULT_FONT_IDS = [
  "cairo",
  "inter",
  "lato",
  "amiri",
  "ibm_plex_arabic",
  "noto_sans_arabic",
];

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
      path: ["contact"],
    }
  );

const staffSchema = z.object({
  id: z.number().optional(),
  name: requiredStringSchema,
  phone: requiredPhoneSchema,
});

const locationSchema = z.object({
  address: requiredStringSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  country: z.string().optional(),
});

const templateSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  image: z.string().optional(),
  data: z
    .object({
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
    })
    .optional(),
  colors: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    })
    .optional(),
});

const createEventSchema = (t) =>
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
      // NOTE: zod v3 supports `z.date({ required_error })`; zod v4 swaps
      // that for an `error` callback. Using the bare constructor + a
      // chained `.refine` keeps the shared schema cross-compatible with
      // both consumer versions (web ^3.25, mobile ^4.0). Same approach
      // for every constructor option below.
      date: z.date().refine((d) => d instanceof Date && !isNaN(d), {
        message: t ? t("date_required") : "Date is required",
      }),
      time: z.string().min(1, t ? t("time_required") : "Time is required"),
      location: locationSchema,
      description: z.string().optional(),
    }),

    guestList: z
      .array(guestSchema)
      .min(1, t ? t("guest_list_required") : "At least one guest is required"),

    staffList: z.array(staffSchema).optional(),

    invitationSettings: z.object({
      selectedTemplate: templateSchema.optional(),
      invitationMessage: z.string().optional(),
      attendanceAutoReply: z.string().optional(),
      absenceAutoReply: z.string().optional(),
      expectedAttendanceAutoReply: z.string().optional(),
      // `templateImage` is a `File` on web and a `{ uri, type, name }`
      // descriptor on mobile — accept either; the platform layer
      // narrows it before it hits the network.
      templateImage: z.any().optional(),
      note: z.string().optional(),
    }),

    launchSettings: z.object({
      sendSchedule: z.enum(["now", "later"]).default("now"),
      scheduledDate: z.date().optional().nullable(),
      scheduledTime: z.string().optional(),
    }),
  });

const stepValidationSchemas = (t) => ({
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

const validateStep = (stepNumber, data, t) => {
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

const hasRequiredStepData = (stepNumber, data) => {
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
      return data.guestList && data.guestList.length > 0;
    case 3:
      return true;
    case 4:
      return data.launchSettings?.sendSchedule;
    default:
      return false;
  }
};

const templateFormSchema = (t) =>
  z.object({
    messageText: z.string().optional(),
    brideName: z
      .string()
      .min(
        1,
        t ? t("validation.bride_name_required") : "Bride name is required"
      ),
    groomName: z
      .string()
      .min(
        1,
        t ? t("validation.groom_name_required") : "Groom name is required"
      ),
    guestMessage: z
      .string()
      .min(
        1,
        t ? t("validation.guest_message_required") : "Guest message is required"
      ),
    entryDate: z
      .union([z.date(), z.string().transform((val) => new Date(val))])
      .refine((date) => date instanceof Date && !isNaN(date), {
        message: t
          ? t("validation.entry_date_required")
          : "Event date is required",
      }),
    entryTime: z
      .string()
      .min(
        1,
        t ? t("validation.entry_time_required") : "Event time is required"
      )
      .regex(
        /^(0[1-9]|1[0-2]):[0-5][0-9]:(AM|PM)$/,
        t
          ? t("validation.invalid_time_format")
          : "Invalid time format (HH:MM:AM/PM)"
      ),
    address: z
      .string()
      .min(1, t ? t("validation.address_required") : "Address is required"),
    endMessage: z
      .string()
      .min(
        1,
        t ? t("validation.end_message_required") : "End message is required"
      ),
    // `z.enum([...], { required_error })` is a v3-only constructor
    // option (v4 swaps for an `error` callback). Drop the option to
    // stay cross-compatible; the form layer still surfaces the
    // localised "required" message via the resolver.
    fontType: z.enum(["inter", "cairo", "lato"]).default("cairo"),
    primaryColor: z
      .string()
      .min(
        1,
        t ? t("validation.primary_color_required") : "Primary color is required"
      )
      .regex(
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        t
          ? t("validation.invalid_color_format")
          : "Invalid color format (hex color required)"
      )
      .default("#5a4a42"),
  });

const colorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Build a Zod schema for the dynamic visual-template form.
 *
 * @param {Array<{key:string,type:string,required?:boolean,minLength?:number,maxLength?:number,min?:number,max?:number}>} fields
 * @param {Function|undefined} t
 * @param {{ fontIds?: string[], timeAsDate?: boolean }} [options]
 *   - `fontIds`: registry of valid font IDs (web hydrates from
 *     `/api/v2/fonts`; mobile pins a list). Falls back to the post-4c
 *     default set.
 *   - `timeAsDate`: mobile TimePicker emits `Date`; web TimePicker emits
 *     a `"HH:MM:AM"` string. The factory branches on this flag so each
 *     platform's existing components keep working without per-call
 *     adapters.
 */
const buildDynamicTemplateSchema = (fields, t, options = {}) => {
  const fontIds = (options.fontIds && options.fontIds.length > 0)
    ? options.fontIds
    : DEFAULT_FONT_IDS;
  const timeAsDate = options.timeAsDate === true;

  const shape = {};
  for (const field of fields || []) {
    let schema;
    switch (field.type) {
      case "text":
      case "textarea": {
        let s = z.string();
        if (field.minLength) {
          s = s.min(
            field.minLength,
            t
              ? t("templates.fields.validation.minLength", { min: field.minLength })
              : `Min ${field.minLength}`
          );
        }
        if (field.maxLength) {
          s = s.max(
            field.maxLength,
            t
              ? t("templates.fields.validation.maxLength", { max: field.maxLength })
              : `Max ${field.maxLength}`
          );
        }
        schema = field.required
          ? s.min(1, t ? t("templates.fields.validation.required") : "Required")
          : s.optional();
        break;
      }
      case "email": {
        let s = z.string().email(t ? t("templates.fields.validation.invalidEmail") : "Invalid email");
        if (field.minLength) s = s.min(field.minLength);
        if (field.maxLength) s = s.max(field.maxLength);
        schema = field.required
          ? s.min(1, t ? t("templates.fields.validation.required") : "Required")
          : s.optional();
        break;
      }
      case "password": {
        let s = z.string();
        if (field.minLength) s = s.min(field.minLength);
        if (field.maxLength) s = s.max(field.maxLength);
        schema = field.required
          ? s.min(1, t ? t("templates.fields.validation.required") : "Required")
          : s.optional();
        break;
      }
      case "date":
        // Cross-compat: drop the `required_error` constructor option
        // (v3-only). Use a chained `.refine` so v4 also surfaces the
        // localised message.
        if (field.required) {
          schema = z
            .date()
            .refine((d) => d instanceof Date && !isNaN(d), {
              message: t ? t("templates.fields.validation.required") : "Required",
            });
        } else {
          schema = z.date().nullable().optional();
        }
        break;
      case "time":
        if (timeAsDate) {
          if (field.required) {
            schema = z
              .date()
              .refine((d) => d instanceof Date && !isNaN(d), {
                message: t ? t("templates.fields.validation.required") : "Required",
              });
          } else {
            schema = z.date().nullable().optional();
          }
        } else {
          schema = field.required
            ? z
                .string()
                .regex(
                  /^\d{1,2}:\d{2}:(AM|PM)$/,
                  t ? t("templates.fields.validation.required") : "Required"
                )
            : z.string().optional();
        }
        break;
      case "color":
        schema = field.required
          ? z
              .string()
              .regex(
                colorRegex,
                t ? t("templates.fields.validation.invalidColor") : "Invalid color"
              )
          : z.string().regex(colorRegex).optional();
        break;
      case "font":
        // Cross-compat: drop the v3-only `errorMap` constructor option.
        // The default zod error message ("invalid enum value") is shown
        // until the consumer overrides it via the form layer.
        schema = z.enum(fontIds);
        if (!field.required) schema = schema.optional();
        break;
      case "number": {
        // Cross-compat: drop the v3-only `invalid_type_error` option.
        let s = z.coerce.number();
        if (field.min !== undefined) s = s.min(field.min);
        if (field.max !== undefined) s = s.max(field.max);
        schema = field.required
          ? s
          : z.preprocess((v) => (v === "" ? undefined : v), s.optional());
        break;
      }
      default:
        schema = z.any();
    }
    shape[field.key] = schema;
  }
  return z.object(shape);
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

/**
 * Compute default form values for the dynamic template fields.
 *
 * @param {Object} template
 * @param {Date|string|null} parentEventDate
 * @param {string|null} parentEventTime  — "HH:MM:AM" string
 * @param {{ timeAsDate?: boolean }} [options]
 */
const buildDefaultValues = (template, parentEventDate, parentEventTime, options = {}) => {
  if (!template?.fields) return {};
  const timeAsDate = options.timeAsDate === true;
  return template.fields.reduce((acc, field) => {
    const saved = template?.fieldValues?.[field.key] ?? template?.data?.[field.key];
    let defaultVal;
    switch (field.type) {
      case "date":
        defaultVal = saved ? new Date(saved) : (parentEventDate ? new Date(parentEventDate) : null);
        break;
      case "time":
        if (timeAsDate) {
          defaultVal = saved
            ? parseTimeStringToDate(saved)
            : parentEventTime
              ? parseTimeStringToDate(parentEventTime)
              : new Date();
        } else {
          defaultVal = saved ?? parentEventTime ?? "12:00:AM";
        }
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

module.exports = {
  createEventSchema,
  stepValidationSchemas,
  validateStep,
  hasRequiredStepData,
  templateFormSchema,
  buildDynamicTemplateSchema,
  buildDefaultValues,
  DEFAULT_FONT_IDS,
  default: createEventSchema,
};
