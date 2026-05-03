/**
 * Phase 4d W0-SCHEMAS — re-export shim from `@halla/shared-schemas`.
 *
 * Web consumers should import from `@/utils/schemas/updateEventSchema`
 * (this file). The actual schema lives in
 * `packages/shared-schemas/src/updateEventSchema.js`.
 */

import {
  updateEventSchema,
  updateStepValidationSchemas,
  validateUpdateStep,
} from "@halla/shared-schemas";

export { updateEventSchema, updateStepValidationSchemas, validateUpdateStep };

export default updateEventSchema;
