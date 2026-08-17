/**
 * Post-Event Content — Zod validation schemas.
 *
 * Wired via `validateZod(schema)` middleware at route layer
 * (`shared/middleware/validation.js:401`).
 */

const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-char hex ObjectId');

// Text is optional: a comment may carry only image attachments (validated in
// the service, which can see `req.files`). Zod only sees the body.
const addCommentSchema = z
  .object({
    text: z.string().trim().max(1000).optional(),
  })
  .strict();

const uploadMediaSchema = z.object({}).strict();

const updateThankYouMessageSchema = z
  .object({
    text: z.string().max(2000).optional(),
    textAr: z.string().max(2000).optional(),
    description: z.string().max(5000).optional(),
    descriptionAr: z.string().max(5000).optional(),
  })
  .strict()
  .refine(
    (val) =>
      val.text !== undefined
      || val.textAr !== undefined
      || val.description !== undefined
      || val.descriptionAr !== undefined,
    { message: 'at least one of text|textAr|description|descriptionAr is required' }
  );

const updateMessagingTemplateSchema = z
  .object({
    taqnyatTemplateRef: objectId,
  })
  .strict();

const bulkGuestActionSchema = z
  .object({
    guestIds: z.array(objectId).min(1).optional(),
    filter: z.enum(['attended', 'confirmed', 'all']).optional(),
  })
  .strict()
  .refine(
    (val) =>
      (val.guestIds && val.guestIds.length > 0)
      || val.filter !== undefined,
    { message: 'either guestIds or filter is required' }
  );

const sendAccessLinksSchema = bulkGuestActionSchema.innerType().extend({
  taqnyatTemplateRef: objectId.optional(),
});

const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// Combined "Publish & notify" — audience filter (defaults to attended) plus
// an optional template override (falls back to the saved template).
const publishAndNotifySchema = z
  .object({
    filter: z.enum(['attended', 'confirmed', 'all']).default('attended'),
    taqnyatTemplateRef: objectId.optional(),
  })
  .strict();

module.exports = {
  addCommentSchema,
  uploadMediaSchema,
  updateThankYouMessageSchema,
  updateMessagingTemplateSchema,
  bulkGuestActionSchema,
  sendAccessLinksSchema,
  paginationSchema,
  publishAndNotifySchema,
};
