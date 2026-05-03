/**
 * Phase 4d W0-SCHEMAS — re-export shim from `@halla/shared-schemas`.
 *
 * The single source of truth lives in
 * `packages/shared-schemas/src/createEventSchema.js`. This shim:
 *   1. Re-exports every schema/helper untouched.
 *   2. Wraps `buildDynamicTemplateSchema` + `buildDefaultValues` so the
 *      web app doesn't need to pass `fontIds` (it injects the live list
 *      from `@/config/fonts`, which is hydrated from `/api/v2/fonts`).
 *
 * Schema-drift contract: this file should remain a pure re-export shim.
 * `scripts/check-schema-drift.sh` fails if anyone re-introduces inline
 * schema definitions here.
 */

import {
  createEventSchema,
  stepValidationSchemas,
  validateStep,
  hasRequiredStepData,
  templateFormSchema,
  buildDynamicTemplateSchema as buildDynamicTemplateSchemaShared,
  buildDefaultValues as buildDefaultValuesShared,
} from "@halla/shared-schemas";

import { FONT_IDS } from "@/config/fonts";

export const buildDynamicTemplateSchema = (fields, t) =>
  buildDynamicTemplateSchemaShared(fields, t, { fontIds: FONT_IDS });

export const buildDefaultValues = (template, parentEventDate, parentEventTime) =>
  buildDefaultValuesShared(template, parentEventDate, parentEventTime);

export {
  createEventSchema,
  stepValidationSchemas,
  validateStep,
  hasRequiredStepData,
  templateFormSchema,
};

export default createEventSchema;
