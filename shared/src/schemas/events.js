/**
 * Event schemas — create, update, guest, staff, location, template.
 *
 * The guest contact rule: phone required, email optional.
 *
 * `buildDynamicTemplateSchema` accepts an explicit `fontIds` array so
 * the helper works without web's `@/config/fonts` import; both apps
 * supply their own list.
 */
import { z } from "zod";
import { saudiPhone, requiredString } from "./_shared.js";
import { EVENT_CATEGORY_VALUES } from "../constants/eventCategories.js";
import { INVITATION_TYPE_VALUES } from "../constants/status.js";

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
    placeId: z.string().max(300).optional().nullable(),
    provider: z.enum(["google", "device", "manual"]).optional(),
  });

export const visualTemplateSchema = (_t = idT) =>
  z
    .object({
      templateRef: z.union([z.string(), z.number()]).optional().nullable(),
      fieldValues: z.record(z.any()).optional().default({}),
      bakedImagePath: z.string().optional().nullable(),
      isCustomUpload: z.boolean().optional().default(false),
    })
    .passthrough();

export const taqnyatTemplateSchema = (_t = idT) =>
  z
    .object({
      templateRef: z.union([z.string(), z.number()]).optional().nullable(),
    })
    .passthrough();

export const guestRepliesSchema = (_t = idT) =>
  z
    .object({
      onAttend: z.string().optional().nullable(),
      onAbsent: z.string().optional().nullable(),
    })
    .passthrough();

export const invitationSettingsSchema = (_t = idT) =>
  z
    .object({
      visualTemplate: visualTemplateSchema(_t).optional().nullable(),
      taqnyatTemplate: taqnyatTemplateSchema(_t).optional().nullable(),
      guestReplies: guestRepliesSchema(_t).optional().nullable(),
      invitationType: z.enum(INVITATION_TYPE_VALUES).optional(),
      templateImage: z.any().optional().nullable(),
      // Boundary migration aliases
      taqnyatTemplateRef: z.union([z.string(), z.number()]).optional().nullable(),
      selectedTemplate: z.any().optional(),
      attendanceAutoReply: z.string().optional().nullable(),
      absenceAutoReply: z.string().optional().nullable(),
    })
    .transform((data) => {
      const result = { ...data };
      if (result.taqnyatTemplateRef && !result.taqnyatTemplate) {
        result.taqnyatTemplate = { templateRef: String(result.taqnyatTemplateRef) };
      } else if (result.selectedTemplate && !result.taqnyatTemplate) {
        const ref =
          result.selectedTemplate?.templateRef ||
          result.selectedTemplate?._id ||
          result.selectedTemplate?.id;
        if (ref) {
          result.taqnyatTemplate = { templateRef: String(ref) };
        }
      }
      if (
        (result.attendanceAutoReply || result.absenceAutoReply) &&
        !result.guestReplies
      ) {
        result.guestReplies = {
          onAttend: result.attendanceAutoReply || "",
          onAbsent: result.absenceAutoReply || "",
        };
      }
      return result;
    });

const dateLike = z
  .union([z.date(), z.string(), z.null()])
  .transform((val) => {
    if (val === null || val === undefined || val === "") return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  });

export const EVENT_TYPES = EVENT_CATEGORY_VALUES;

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

    invitationSettings: invitationSettingsSchema(t).optional(),

    launchSettings: z
      .object({
        sendSchedule: z.enum(["now", "later"]).optional().default("now"),
        scheduledDate: z.date().optional().nullable(),
        scheduledTime: z.string().optional(),
      })
      .optional(),
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

    invitationSettings: invitationSettingsSchema(t).optional(),

    launchSettings: z
      .object({
        sendSchedule: z.enum(["now", "later"]).optional().default("now"),
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
      return true;
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
        defaultVal = saved ?? "cairo";
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
