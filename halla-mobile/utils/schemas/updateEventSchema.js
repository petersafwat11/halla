/**
 * Phase 4d W0-SCHEMAS — re-export shim from `@halla/shared-schemas`.
 *
 * Mobile consumers should import from
 * `../../utils/schemas/updateEventSchema` (this file).
 */

import {
  updateEventSchema,
  updateStepValidationSchemas,
  validateUpdateStep,
} from "@halla/shared-schemas";

export { updateEventSchema, updateStepValidationSchemas, validateUpdateStep };

export default updateEventSchema;
