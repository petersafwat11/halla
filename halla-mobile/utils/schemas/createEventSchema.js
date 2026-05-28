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
  buildDynamicTemplateSchema,
  buildDefaultValues,
} from "@halla/shared/schemas/events";

export const createEventSchema = _createEvent();
export const guestSchema = _guest();
export const staffSchema = _staff();
export const locationSchema = _location();
export const stepValidationSchemas = _stepValidationSchemas();
export const validateStep = _validateStep;
export { EVENT_TYPES, hasRequiredStepData, buildDynamicTemplateSchema, buildDefaultValues };

export default createEventSchema;
