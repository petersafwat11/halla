/**
 * Each export is a factory `(t) => ZodSchema` — call sites pass `t` so
 * validation messages are translated.
 */
export {
  updateEventSchema,
  updateStepValidationSchemas,
  validateUpdateStep,
} from "@halla/shared/schemas/events";
