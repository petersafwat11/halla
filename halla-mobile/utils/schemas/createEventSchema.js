/**
 * Compat re-export. Canonical create-event schema lives in
 * `@halla/shared/schemas/events`. Each export is a factory `(t) => ZodSchema`
 * — call sites pass `t` so validation messages are translated.
 */
import {
  buildDynamicTemplateSchema as sharedBuildDynamicTemplateSchema,
  buildDefaultValues as sharedBuildDefaultValues,
} from "@halla/shared/schemas/events";

export {
  createEventSchema,
  guestSchema,
  staffSchema,
  locationSchema,
  stepValidationSchemas,
  validateStep,
  EVENT_TYPES,
  hasRequiredStepData,
} from "@halla/shared/schemas/events";

export const buildDynamicTemplateSchema = (fields, t) =>
  sharedBuildDynamicTemplateSchema(fields, { t, timeAsDate: true });

export const buildDefaultValues = (template, parentEventDate, parentEventTime) =>
  sharedBuildDefaultValues(template, parentEventDate, parentEventTime, {
    timeAsDate: true,
  });
