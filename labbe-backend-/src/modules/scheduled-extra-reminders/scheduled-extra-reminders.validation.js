/**
 * Zod schemas for the scheduled-extra-reminders module.
 * Mounted via `validateZod` on POST /events/:id/scheduled-reminders.
 */

const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

const createSchema = z
  .object({
    reminderType: z.enum(['reminder_confirmed', 'reminder_pending']),
    guestIds: z.array(objectId).min(1).max(2000),
    scheduledFor: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), 'scheduledFor must be ISO datetime'),
  })
  .strict();

module.exports = { createSchema };
