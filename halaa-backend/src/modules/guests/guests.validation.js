/**
 * Guests validation schemas (Zod)
 * Wired into guests.routes.js via `validateZod(schema)`.
 */

const { z } = require('zod');
const { GUEST_STATUS, RSVP_STATUS } = require('../../shared/constants');
const { clampPhoneInput, SAUDI_PHONE_REGEX } = require('../../shared/utils/phone');

// Saudi mobile: 10 digits starting with 05 or 9 digits starting with 5.
const saudiPhone = z
  .string()
  .min(1, 'phone is required')
  .transform((v) => clampPhoneInput(v))
  .refine(
    (v) => SAUDI_PHONE_REGEX.test(v),
    { message: 'phone must be a valid Saudi mobile number (10 digits starting with 05 or 9 digits starting with 5)' }
  );

const addGuestSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required').max(120),
    phone: saudiPhone,
    category: z.string().trim().max(60).optional(),
  })
  .strict();

const updateGuestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: saudiPhone.optional(),
    category: z.string().trim().max(60).optional(),
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
    // UI language for the reply copy returned to the guest ('ar' | 'en').
    lang: z.enum(['ar', 'en']).optional(),
  })
  .strict();

module.exports = {
  addGuestSchema,
  updateGuestSchema,
  submitRSVPSchema,
};
