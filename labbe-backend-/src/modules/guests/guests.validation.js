/**
 * Guests validation schemas (Zod)
 * Wired into guests.routes.js via `validateZod(schema)`.
 */

const { z } = require('zod');
const { GUEST_STATUS, RSVP_STATUS } = require('../../shared/constants');

// Saudi mobile: 9 digits starting with 5 (E.164 minus the +966).
// Allow optional +966/966 prefix and strip non-digits before checking.
const saudiPhone = z
  .string()
  .min(1, 'phone is required')
  .transform((v) => v.replace(/[\s\-\(\)\.]/g, ''))
  .refine(
    (v) => /^(\+?966)?5\d{8}$/.test(v) || /^05\d{8}$/.test(v),
    { message: 'phone must be a Saudi mobile number (5xxxxxxxx)' }
  );

const addGuestSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(120),
    phone: saudiPhone.optional(),
    email: z.string().email().optional(),
  })
  .strict()
  .refine((v) => !!v.phone || !!v.email, {
    path: ['phone'],
    message: 'Either phone or email is required',
  });

const updateGuestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: saudiPhone.optional(),
    email: z.string().email().optional(),
    status: z.enum(Object.values(GUEST_STATUS)).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });

const submitRSVPSchema = z
  .object({
    response: z.enum(Object.values(RSVP_STATUS)),
    invitationCode: z.string().min(1, 'invitationCode is required'),
    message: z.string().max(500).optional(),
    dietaryRestrictions: z.string().max(200).optional(),
    plusOnes: z.number().int().min(0).max(10).optional(),
  })
  .strict();

module.exports = {
  addGuestSchema,
  updateGuestSchema,
  submitRSVPSchema,
};
