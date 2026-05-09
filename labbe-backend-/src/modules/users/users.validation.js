const { z } = require('zod');

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    passwordConfirm: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((d) => d.newPassword === d.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Passwords do not match',
  });

const updateProfileSchema = z
  .object({
    username: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    preferredLanguage: z.enum(['ar', 'en']).optional(),
    profile: z.unknown().optional(),
  })
  .strict();

const profileSectionParamSchema = z.object({
  section: z.enum([
    'hostData',
    'vendorData',
    'businessInfo',
    'contactInfo',
    'documents',
  ]),
});

const updateProfileSectionSchema = z.record(z.unknown());

const notificationKeysSchema = z.record(z.boolean());

const updateNotificationPreferencesSchema = z
  .object({
    appNotifications: notificationKeysSchema.optional(),
    emailNotifications: notificationKeysSchema.optional(),
    smsNotifications: notificationKeysSchema.optional(),
  })
  .strict();

module.exports = {
  updatePasswordSchema,
  updateProfileSchema,
  profileSectionParamSchema,
  updateProfileSectionSchema,
  updateNotificationPreferencesSchema,
};
