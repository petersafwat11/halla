const { z } = require('zod');

const refundSchema = z
  .object({
    amount: z.number().gt(0).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

const captureSchema = z
  .object({
    amount: z.number().gt(0).optional(),
  })
  .strict();

module.exports = { refundSchema, captureSchema };
