/**
 * Compat re-export. Canonical update-event schema lives in
 * `@halla/shared/schemas/events`. Mobile previously imported a static
 * schema; we materialize the factory once here.
 */
import {
  updateEventSchema as _updateEvent,
  updateStepValidationSchemas as _updateStepValidationSchemas,
  validateUpdateStep,
} from "@halla/shared/schemas/events";

export const updateEventSchema = _updateEvent();
export const updateStepValidationSchemas = _updateStepValidationSchemas();
export { validateUpdateStep };

export default updateEventSchema;
