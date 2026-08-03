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

const TEMPLATE_TYPES = [
  'invite',
  'reminder_confirmed',
  'post_event',
  'staff_access',
];
const INVITATION_MODES = ['reply_and_qr', 'reply_only', 'none'];

const assignMappingSchema = z
  .object({
    category: z.string().nullable().optional(),
    type: z.enum(TEMPLATE_TYPES).nullable().optional(),
    invitationMode: z.enum(INVITATION_MODES).nullable().optional(),
    varMapping: z.array(varMappingEntry).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // staff_access is global (no category required); all other typed
    // assignments require a category so cron lookups by (category,type) work.
    if (data.type && data.type !== 'staff_access' && !data.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'category is required for this template type',
      });
    }
    if (data.type && data.type !== 'invite' && data.invitationMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['invitationMode'],
        message: 'invitationMode is only valid for invite templates',
      });
    }
  });

const listForHostQuerySchema = z
  .object({
    category: z.string().optional(),
    type: z.enum(TEMPLATE_TYPES).optional(),
    invitationMode: z.enum(INVITATION_MODES).optional(),
  })
  .strict();

module.exports = {
  createTemplateSchema,
  assignMappingSchema,
  listForHostQuerySchema,
  TEMPLATE_TYPES,
  INVITATION_MODES,
};
