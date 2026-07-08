const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-char hex ObjectId');

const adminAssignSchema = z
  .object({
    userId: objectId,
    planCode: z.string().min(1),
    notes: z.string().max(500).optional(),
  })
  .strict();

module.exports = { adminAssignSchema };
