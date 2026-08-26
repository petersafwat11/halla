/**
 * Messaging validation schemas (Zod).
 * Wired into messaging.routes.js via `validateZod(schema)`.
 */

const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

const channelEnum = z.enum(['sms', 'whatsapp']);

// HH:mm 24-hour time (00-23 hours, 00-59 minutes).
const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'scheduledTime must be HH:mm');

// ISO 8601 date or date-time string. Do not compare the date value by itself
// with `Date.now()`: clients intentionally send the selected calendar day at
// UTC midnight, and a valid same-day trial schedule would otherwise look
// "past" before `scheduledTime` is combined with it. The schedule service
// validates the complete Riyadh date+time instant and the plan-specific lead.
const isoDate = z
  .string()
  .min(1, 'scheduledDate is required')
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'scheduledDate must be an ISO date string',
  });

const sendMessageSchema = z
  .object({
    guestId: objectId,
    eventId: objectId,
    channel: channelEnum.default('sms'),
  })
  .strict();

const sendBulkSchema = z
  .object({
    guestIds: z.array(objectId).min(1, 'guestIds is required').max(5000),
    eventId: objectId,
    channel: channelEnum.default('sms'),
  })
  .strict();

const retrySchema = z
  .object({
    eventId: objectId,
    channel: channelEnum.default('sms'),
  })
  .strict();

const scheduleSchema = z
  .object({
    eventId: objectId,
    scheduledDate: isoDate,
    scheduledTime: timeOfDay,
    channel: channelEnum.default('whatsapp'),
  })
  .strict();

const reminderSchema = z
  .object({
    eventId: objectId,
    guestIds: z.array(objectId).optional(),
    channel: channelEnum.default('sms'),
    customMessage: z.string().max(1000).optional(),
    reminderTemplateName: z
      .string()
      .regex(/^[a-z0-9_]{1,80}$/, 'reminderTemplateName must match /^[a-z0-9_]{1,80}$/')
      .optional(),
  })
  .strict();

module.exports = {
  sendMessageSchema,
  sendBulkSchema,
  retrySchema,
  scheduleSchema,
  reminderSchema,
};
