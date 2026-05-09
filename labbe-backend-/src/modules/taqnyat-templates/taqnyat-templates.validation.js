/**
 * Zod schemas for the taqnyat-templates module.
 * Mounted via `validateZod` on POST /admin/taqnyat-templates and
 * PATCH /admin/taqnyat-templates/:id.
 */

const { z } = require('zod');

const varMappingEntry = z.object({
  placeholder: z.string().regex(/^\{\{\d+\}\}$/, 'placeholder must look like {{N}}'),
  sourceKey: z.string().min(1).max(120),
  fallback: z.string().max(200).optional().default(''),
});

// Meta requires lowercase, snake_case, ≤512 chars, leading letter.
const TEMPLATE_NAME_REGEX = /^[a-z][a-z0-9_]{0,511}$/;

const createTemplateSchema = z
  .object({
    name: z.string().regex(TEMPLATE_NAME_REGEX, 'name must be lowercase snake_case starting with a letter'),
    category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
    language: z.enum(['ar', 'en']).default('ar'),
    headerText: z.string().max(60).optional(),
    bodyText: z.string().min(1).max(1024),
    bodyExamples: z.array(z.string().max(60)).optional().default([]),
    footerText: z.string().max(60).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const placeholders = data.bodyText.match(/\{\{\d+\}\}/g) || [];
    const uniqueCount = new Set(placeholders).size;
    if (uniqueCount > 0 && data.bodyExamples.length !== uniqueCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bodyExamples'],
        message: `bodyExamples must contain exactly ${uniqueCount} value(s) — one per {{N}} placeholder`,
      });
    }
  });

const assignMappingSchema = z
  .object({
    category: z.string().nullable().optional(),
    varMapping: z.array(varMappingEntry).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict();

module.exports = { createTemplateSchema, assignMappingSchema };
