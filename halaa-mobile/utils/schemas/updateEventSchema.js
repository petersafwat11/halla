/**
 * Each export is a factory `(t) => ZodSchema` — call sites pass `t` so
 * validation messages are translated.
 */
export {
  updateEventSchema,
  updateStepValidationSchemas,
  validateUpdateStep,
} from "@halaa/shared/schemas/events";
