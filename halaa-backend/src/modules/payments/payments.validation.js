const { z } = require('zod');

const refundSchema = z
  .object({
    amount: z.number().gt(0).optional(),
    reason: z.string().trim().max(500).optional(),
    // Optional invite clawback on PARTIAL refunds: how many invites to debit
    // from the linked subscription's pool (by increasing invitesConsumed).
    deductInvites: z.number().int().min(0).optional(),
  })
  .strict();

const captureSchema = z
  .object({
    amount: z.number().gt(0).optional(),
  })
  .strict();

module.exports = { refundSchema, captureSchema };
