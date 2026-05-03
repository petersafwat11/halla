/**
 * Phase 4d W0-SCHEMAS — re-export shim from `@halla/shared-schemas`.
 *
 * Mobile consumers should import from
 * `../../utils/schemas/createEventSchema` (this file). Source of truth
 * lives in `packages/shared-schemas/src/createEventSchema.js`.
 *
 * Mobile-specific bindings:
 *   - `buildDynamicTemplateSchema` runs with `timeAsDate: true` because
 *     the mobile TimePicker emits `Date` (web emits `"HH:MM:AM"`).
 *   - `buildDefaultValues` mirrors the same flag.
 *   - `FONT_IDS` is pinned to the mobile-supported set.
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

const MOBILE_FONT_IDS = [
  "cairo",
  "inter",
  "lato",
  "amiri",
  "ibm_plex_arabic",
  "noto_sans_arabic",
];

export const buildDynamicTemplateSchema = (fields, t) =>
  buildDynamicTemplateSchemaShared(fields, t, {
    fontIds: MOBILE_FONT_IDS,
    timeAsDate: true,
  });

export const buildDefaultValues = (template, parentEventDate, parentEventTime) =>
  buildDefaultValuesShared(template, parentEventDate, parentEventTime, {
    timeAsDate: true,
  });

export {
  createEventSchema,
  stepValidationSchemas,
  validateStep,
  hasRequiredStepData,
  templateFormSchema,
};

export default createEventSchema;
