/**
 * Event schemas — create, update, guest, staff, location, template.
 *
 * Reconciles backend (`events.validation.js`, `guests.validation.js`)
 * with both apps' existing client schemas. The guest contact rule is
 * the canonical one from the backend: phone required, email optional
 * (Phase 1 resolves the web "phone OR email" divergence).
 *
 * `buildDynamicTemplateSchema` accepts an explicit `fontIds` array so
 * the helper works without web's `@/config/fonts` import; both apps
 * supply their own list.
 */
import { z } from "zod";
import { saudiPhone, requiredString } from "./_shared.js";

const idT = (k) => k;

// ============================================================
// LEAF SCHEMAS
// ============================================================

export const guestSchema = (t = idT) =>
  z.object({
    id: z.union([z.number(), z.string()]).optional(),
    _id: z.union([z.number(), z.string()]).optional(),
    name: requiredString(t),
    phone: saudiPhone(t),
    email: z
      .string()
      .email(t("validation.invalidEmail"))
      .optional()
      .or(z.literal("")),
  });

export const staffSchema = (t = idT) =>
  z.object({
    id: z.union([z.number(), z.string()]).optional(),
    _id: z.union([z.number(), z.string()]).optional(),
    name: requiredString(t),
    phone: saudiPhone(t),
  });

export const locationSchema = (t = idT) =>
  z.object({
    address: requiredString(t),
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

export const EVENT_TYPES = [
  "wedding",
  "birthday",
  "graduation",
  "meeting",
  "conference",
  "other",
];

// ============================================================
// CREATE EVENT
// ============================================================

export const createEventSchema = (t = idT) =>
  z.object({
    eventDetails: z.object({
      title: requiredString(t),
      type: z.enum(EVENT_TYPES),
      date: z.date().refine((d) => d instanceof Date && !isNaN(d), {
        message: t("date_required"),
      }),
      time: z.string().min(1, t("time_required")),
      location: locationSchema(t),
      description: z.string().optional(),
    }),

    guestList: z
      .array(guestSchema(t))
      .min(1, t("guest_list_required")),

    staffList: z.array(staffSchema(t)).optional(),
    supervisorsList: z.array(staffSchema(t)).optional(),

    invitationSettings: z.object({
      selectedTemplate: z.any().optional(),
      visualTemplate: z.any().optional(),
      taqnyatTemplate: z.any().optional(),
      attendanceAutoReply: z.string().optional(),
      absenceAutoReply: z.string().optional(),
      expectedAttendanceAutoReply: z.string().optional(),
      templateImage: z.any().optional(),
      guestReplies: z
        .object({
          onAttend: z.string().optional(),
          onAbsent: z.string().optional(),
          onExpected: z.string().optional(),
        })
        .partial()
        .optional(),
    }),

    launchSettings: z.object({
      sendSchedule: z.enum(["now", "later"]).default("now"),
      scheduledDate: z.date().optional().nullable(),
      scheduledTime: z.string().optional(),
    }),
  });

// ============================================================
// UPDATE EVENT (dateLike — strings/Dates coerced)
// ============================================================

export const updateEventSchema = (t = idT) =>
  z.object({
    eventDetails: z.object({
      title: requiredString(t),
      type: z.enum(EVENT_TYPES),
      date: dateLike.refine((d) => d instanceof Date, {
        message: t("date_required"),
      }),
      time: z.string().min(1, t("time_required")),
      location: locationSchema(t),
      description: z.string().optional(),
    }),

    guestList: z
      .array(guestSchema(t))
      .min(1, t("guest_list_required")),

    supervisorsList: z.array(staffSchema(t)).optional(),
    staffList: z.array(staffSchema(t)).optional(),

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

// ============================================================
// STEP VALIDATION HELPERS
// ============================================================

export const stepValidationSchemas = (t = idT) => {
  const s = createEventSchema(t);
  return {
    1: z.object({ eventDetails: s.shape.eventDetails }),
    2: z.object({ guestList: s.shape.guestList, staffList: s.shape.staffList }),
    3: z.object({ invitationSettings: s.shape.invitationSettings }),
    4: z.object({ launchSettings: s.shape.launchSettings }),
  };
};

export const updateStepValidationSchemas = (t = idT) => {
  const s = updateEventSchema(t);
  return {
    1: z.object({ eventDetails: s.shape.eventDetails }),
    2: z
      .object({
        guestList: s.shape.guestList,
        supervisorsList: s.shape.supervisorsList,
        staffList: s.shape.staffList,
      })
      .refine(
        (data) =>
          Array.isArray(data.supervisorsList) || Array.isArray(data.staffList),
        {
          message: "supervisorsList or staffList is required",
          path: ["staffList"],
        }
      ),
    3: z.object({ invitationSettings: s.shape.invitationSettings }),
    4: z.object({ launchSettings: s.shape.launchSettings }),
  };
};

export const validateStep = (stepNumber, data, t = idT) => {
  const schema = stepValidationSchemas(t)[stepNumber];
  if (!schema) return { success: false, error: "Invalid step number" };
  const r = schema.safeParse(data);
  return r.success ? { success: true } : { success: false, error: r.error.issues };
};

export const validateUpdateStep = (stepNumber, data, t = idT) => {
  const schema = updateStepValidationSchemas(t)[stepNumber];
  if (!schema) return { success: false, error: "Invalid step number" };
  const r = schema.safeParse(data);
  return r.success ? { success: true } : { success: false, error: r.error.issues };
};

export const hasRequiredStepData = (stepNumber, data) => {
  switch (stepNumber) {
    case 1:
      return Boolean(
        data?.eventDetails?.title &&
          data?.eventDetails?.type &&
          data?.eventDetails?.date &&
          data?.eventDetails?.time &&
          data?.eventDetails?.location?.address
      );
    case 2:
      return Boolean(data?.guestList?.length);
    case 3:
      return true;
    case 4:
      return Boolean(data?.launchSettings?.sendSchedule);
    default:
      return false;
  }
};

// ============================================================
// DYNAMIC TEMPLATE SCHEMA BUILDER
// ============================================================

const COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DEFAULT_FONT_IDS = [
  "cairo",
  "inter",
  "lato",
  "amiri",
  "ibm_plex_arabic",
  "noto_sans_arabic",
];

export const buildDynamicTemplateSchema = (fields, options = {}) => {
  const { fontIds = DEFAULT_FONT_IDS, t = idT, timeAsDate = false } = options;
  const shape = {};
  for (const field of fields || []) {
    let schema;
    switch (field.type) {
      case "text":
      case "textarea": {
        let s = z.string();
        if (field.minLength)
          s = s.min(
            field.minLength,
            t("templates.fields.validation.minLength", { min: field.minLength })
          );
        if (field.maxLength)
          s = s.max(
            field.maxLength,
            t("templates.fields.validation.maxLength", { max: field.maxLength })
          );
        schema = field.required
          ? s.min(1, t("templates.fields.validation.required"))
          : s.optional();
        break;
      }
      case "email": {
        let s = z
          .string()
          .email(t("templates.fields.validation.invalidEmail"));
        if (field.minLength) s = s.min(field.minLength);
        if (field.maxLength) s = s.max(field.maxLength);
        schema = field.required
          ? s.min(1, t("templates.fields.validation.required"))
          : s.optional();
        break;
      }
      case "password": {
        let s = z.string();
        if (field.minLength) s = s.min(field.minLength);
        if (field.maxLength) s = s.max(field.maxLength);
        schema = field.required
          ? s.min(1, t("templates.fields.validation.required"))
          : s.optional();
        break;
      }
      case "date":
        schema = field.required
          ? z.date().refine((d) => d instanceof Date && !isNaN(d), {
              message: t("templates.fields.validation.required"),
            })
          : z.date().nullable().optional();
        break;
      case "time":
        if (timeAsDate) {
          schema = field.required
            ? z.date().refine((d) => d instanceof Date && !isNaN(d), {
                message: t("templates.fields.validation.required"),
              })
            : z.date().nullable().optional();
        } else {
          schema = field.required
            ? z
                .string()
                .regex(
                  /^\d{1,2}:\d{2}:(AM|PM)$/,
                  t("templates.fields.validation.required")
                )
            : z.string().optional();
        }
        break;
      case "color":
        schema = field.required
          ? z
              .string()
              .regex(
                COLOR_REGEX,
                t("templates.fields.validation.invalidColor")
              )
          : z.string().regex(COLOR_REGEX).optional();
        break;
      case "font":
        schema = z.enum(fontIds.length ? fontIds : DEFAULT_FONT_IDS);
        if (!field.required) schema = schema.optional();
        break;
      case "number": {
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

export const buildDefaultValues = (template, parentEventDate, parentEventTime, options = {}) => {
  const { timeAsDate = false } = options;
  if (!template?.fields) return {};
  return template.fields.reduce((acc, field) => {
    const saved = template?.fieldValues?.[field.key] ?? template?.data?.[field.key];
    let defaultVal;
    switch (field.type) {
      case "date":
        defaultVal = saved
          ? new Date(saved)
          : parentEventDate
            ? new Date(parentEventDate)
            : null;
        break;
      case "time":
        defaultVal = timeAsDate
          ? saved
            ? parseTimeStringToDate(saved)
            : parentEventTime
              ? parseTimeStringToDate(parentEventTime)
              : new Date()
          : (saved ?? parentEventTime ?? "12:00:AM");
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

export default createEventSchema;
