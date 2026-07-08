/**
 * `buildDynamicTemplateSchema` takes `fontIds` as a parameter — web binds
 * it to the live `FONT_IDS` from `@/config/fonts` below so existing call
 * sites stay unchanged.
 */
"use client";
import {
  createEventSchema as sharedCreateEventSchema,
  stepValidationSchemas as sharedStepValidationSchemas,
  validateStep as sharedValidateStep,
  hasRequiredStepData as sharedHasRequiredStepData,
  buildDynamicTemplateSchema as sharedBuildDynamicTemplateSchema,
  buildDefaultValues as sharedBuildDefaultValues,
} from "@halla/shared/schemas/events";
import { FONT_IDS } from "@/config/fonts";

export const createEventSchema = sharedCreateEventSchema;
export const stepValidationSchemas = sharedStepValidationSchemas;
export const validateStep = sharedValidateStep;
export const hasRequiredStepData = sharedHasRequiredStepData;

// Bind web's live FONT_IDS so the dynamic-template schema picks up fonts
// fetched at runtime from `/api/v2/fonts`.
export const buildDynamicTemplateSchema = (fields, t) =>
  sharedBuildDynamicTemplateSchema(fields, { fontIds: FONT_IDS, t, timeAsDate: false });

export const buildDefaultValues = (template, parentEventDate, parentEventTime) =>
  sharedBuildDefaultValues(template, parentEventDate, parentEventTime, { timeAsDate: false });

export default createEventSchema;
