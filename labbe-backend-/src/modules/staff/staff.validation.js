const { z } = require('zod');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-char hex ObjectId');

const phoneSchema = z.string().min(5).max(20);

const verifyStaffAccessQuerySchema = z
  .object({
    token: z.string().min(1).optional(),
    phone: phoneSchema.optional(),
    eventId: objectId.optional(),
  })
  .refine(
    (d) => !!d.token || (!!d.phone && !!d.eventId),
    {
      message: 'Provide either token or both phone and eventId',
      path: ['token'],
    }
  )
  .refine(
    (d) => !(d.token && (d.phone || d.eventId)),
    {
      message: 'Provide token alone, or phone+eventId — not both',
      path: ['token'],
    }
  );

const checkInBodySchema = z
  .object({
    qrCode: z.string().min(1).optional(),
    guestId: objectId.optional(),
    phone: phoneSchema.optional(),
  })
  .refine(
    (d) => {
      const present = [d.qrCode, d.guestId, d.phone].filter(Boolean).length;
      return present === 1;
    },
    {
      message: 'Exactly one of qrCode, guestId, or phone is required',
      path: ['qrCode'],
    }
  );

const getEventGuestsQuerySchema = z
  .object({
    search: z.string().max(120).optional(),
    status: z
      .enum(['invited', 'confirmed', 'declined', 'checked_in', 'maybe'])
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

module.exports = {
  verifyStaffAccessQuerySchema,
  checkInBodySchema,
  getEventGuestsQuerySchema,
};
