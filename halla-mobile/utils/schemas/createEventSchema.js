/**
 * Compat re-export. Canonical create-event schema lives in
 * `@halla/shared/schemas/events`. Mobile previously imported a static
 * schema; we materialize the factory once here (opaque keys).
 */
import {
  createEventSchema as _createEvent,
  guestSchema as _guest,
  staffSchema as _staff,
  locationSchema as _location,
  EVENT_TYPES,
  stepValidationSchemas as _stepValidationSchemas,
  validateStep as _validateStep,
  hasRequiredStepData,
  buildDynamicTemplateSchema as sharedBuildDynamicTemplateSchema,
  buildDefaultValues as sharedBuildDefaultValues,
} from "@halla/shared/schemas/events";

export const createEventSchema = _createEvent();
export const guestSchema = _guest();
export const staffSchema = _staff();
export const locationSchema = _location();
export const stepValidationSchemas = _stepValidationSchemas();
export const validateStep = _validateStep;
export { EVENT_TYPES, hasRequiredStepData };

// Mobile's TimePicker stores `time` values as Date objects (not the "H:MM:AM"
// strings web uses), so the dynamic schema and default values must run in
// `timeAsDate` mode. Wrap the shared helpers here so every mobile call site
// gets the Date-based time branch and the real translator — passing `t`
// straight through as the 2nd positional arg silently lands in the options
// slot and leaves `timeAsDate` false, which rejects the Date the picker emits.
export const buildDynamicTemplateSchema = (fields, t) =>
  sharedBuildDynamicTemplateSchema(fields, { t, timeAsDate: true });

export const buildDefaultValues = (template, parentEventDate, parentEventTime) =>
  sharedBuildDefaultValues(template, parentEventDate, parentEventTime, {
    timeAsDate: true,
  });

export default createEventSchema;
