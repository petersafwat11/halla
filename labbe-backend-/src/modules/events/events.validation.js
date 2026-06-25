/**
 * Events validation schemas (Zod)
 * Wired into events.routes.js via `validateZod(schema)`.
 */

const { z } = require('zod');
const { EVENT_STATUS, SUPERVISOR_STATUS, GUEST_STATUS } = require('../../shared/constants');

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-char hex ObjectId');

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

const guestEntry = z.object({
  name: z.string().trim().min(1, 'guest name is required').max(120),
  phone: saudiPhone,
  // Optional free-text grouping label, reused across events. No fixed enum.
  category: z.string().trim().max(60).optional(),
  status: z.enum(Object.values(GUEST_STATUS)).optional(),
}).passthrough();

const staffEntry = z.object({
  name: z.string().trim().min(1, 'staff name is required').max(120),
  phone: saudiPhone,
  status: z.enum(Object.values(SUPERVISOR_STATUS)).optional(),
}).passthrough();

const eventDetailsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(80).optional(),
  date: z.union([z.string(), z.date()]).optional(),
  time: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).partial().passthrough().optional(),
  description: z.string().optional(),
}).passthrough();

const createEventSchema = z.object({
  eventDetails: eventDetailsSchema,
  guestList: z.array(guestEntry).optional().default([]),
  staffList: z.array(staffEntry).optional().default([]),
  visualTemplate: z.object({}).passthrough().optional(),
  taqnyatTemplate: z.object({}).passthrough().optional(),
  guestReplies: z.object({}).passthrough().optional(),
  launchSettings: z.object({}).passthrough().optional(),
}).passthrough();

const updateEventDetailsSchema = eventDetailsSchema.partial().refine(
  (val) => Object.keys(val).length > 0,
  { message: 'At least one field is required' }
);

const updateGuestListSchema = z.object({
  guestList: z.array(guestEntry),
}).strict();

const updateStaffListSchema = z.object({
  staffList: z.array(staffEntry),
}).strict();

const updateStep2Schema = z.object({
  guestList: z.array(guestEntry),
  // Backwards naming compat is handled at the controller boundary; the
  // canonical body key is `staffList`. `supervisorsList` is the web
  // alias and we accept it here for clients that haven't migrated.
  staffList: z.array(staffEntry).optional(),
  supervisorsList: z.array(staffEntry).optional(),
}).refine(
  (v) => Array.isArray(v.staffList) || Array.isArray(v.supervisorsList),
  { path: ['staffList'], message: 'staffList (or supervisorsList) is required' }
);

const updateInvitationSettingsSchema = z.object({}).passthrough();

const updateLaunchSettingsSchema = z.object({
  scheduledDate: z.union([z.string(), z.date()]).optional(),
  scheduledTime: z.string().optional(),
  launchChannel: z.string().optional(),
}).passthrough().refine(
  (val) => Object.keys(val).length > 0,
  { message: 'At least one field is required' }
);

const sendTestMessageSchema = z.object({
  phoneNumber: saudiPhone.optional(),
  phone: saudiPhone.optional(),
  channel: z.enum(['sms', 'whatsapp']).optional(),
}).passthrough().refine(
  (v) => v.phoneNumber || v.phone,
  { path: ['phoneNumber'], message: 'phoneNumber is required' }
);

const addStaffSchema = staffEntry;

const updateStaffSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: saudiPhone.optional(),
  status: z.enum(Object.values(SUPERVISOR_STATUS)).optional(),
}).refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field is required' }
);

const updateStaffStatusSchema = z.object({
  status: z.enum(Object.values(SUPERVISOR_STATUS)),
}).strict();

const bulkDeleteSchema = z.object({
  eventIds: z.array(objectId).min(1).max(100),
}).strict();

const adminUpdateStatusSchema = z.object({
  status: z.enum(Object.values(EVENT_STATUS)),
}).strict();

const notifyStaffSchema = z.object({
  message: z.string().max(2000).optional(),
}).passthrough();

const updateReminderSettingsSchema = z.object({
  customReminderTime: z.boolean().optional(),
  scheduledDate: z.union([z.string(), z.date()]).nullable().optional(),
  scheduledTime: z.string().nullable().optional(),
}).passthrough();

const resendInviteSchema = z.object({
  channel: z.enum(['sms', 'whatsapp']).optional(),
  // Optional explicit target set. When present, exactly these guests are
  // re-invited (still restricted to the event in the service); when absent the
  // default non-responder / "maybe" audience is used.
  guestIds: z.array(objectId).optional(),
}).passthrough();

const extraReminderSchema = z.object({
  // Optional explicit target set, narrowed to confirmed guests in the service.
  guestIds: z.array(objectId).optional(),
}).passthrough();

module.exports = {
  createEventSchema,
  updateEventDetailsSchema,
  updateGuestListSchema,
  updateStaffListSchema,
  updateStep2Schema,
  updateInvitationSettingsSchema,
  updateLaunchSettingsSchema,
  sendTestMessageSchema,
  addStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
  bulkDeleteSchema,
  adminUpdateStatusSchema,
  notifyStaffSchema,
  updateReminderSettingsSchema,
  resendInviteSchema,
  extraReminderSchema,
};
