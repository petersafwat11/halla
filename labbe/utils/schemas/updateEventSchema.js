/**
 * Compat re-export. Canonical update-event schema lives in
 * `@halla/shared/schemas/events`.
 */
"use client";
export {
  updateEventSchema,
  updateStepValidationSchemas,
  validateUpdateStep,
} from "@halla/shared/schemas/events";

export { updateEventSchema as default } from "@halla/shared/schemas/events";
