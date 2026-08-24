/**
 * Events validation schemas (Zod)
 * Wired into events.routes.js via `validateZod(schema)`.
 */

const { z } = require('zod');
const {
  EVENT_STATUS,
  SUPERVISOR_STATUS,
  GUEST_STATUS,
  INVITATION_TYPE,
  EVENT_CATEGORY_VALUES,
} = require('../../shared/constants');
const { clampPhoneInput, SAUDI_PHONE_REGEX } = require('../../shared/utils/phone');

// Invitation type (Step 4) — reply×QR selector. Optional everywhere; the
// model default (reply_and_qr) applies when omitted.
const invitationTypeSchema = z.enum(Object.values(INVITATION_TYPE));

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-char hex ObjectId');

// Saudi mobile: 10 digits starting with 05 or 9 digits starting with 5.
const saudiPhone = z
  .string()
  .min(1, 'phone is required')
  .transform((v) => clampPhoneInput(v))
  .refine(
    (v) => SAUDI_PHONE_REGEX.test(v),
    { message: 'phone must be a valid Saudi mobile number (10 digits starting with 05 or 9 digits starting with 5)' }
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

const eventLocationSchema = z.object({
  address: z.string().trim().min(1, 'location address is required').max(500),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  placeId: z.string().trim().max(300).optional().nullable(),
  provider: z.enum(['google', 'device', 'manual']).optional().nullable(),
}).passthrough();

const createEventDetailsSchema = z.object({
  title: z.string().trim().min(1, 'event title is required').max(200),
  type: z.enum(EVENT_CATEGORY_VALUES, {
    errorMap: () => ({ message: 'valid event type is required' }),
  }),
  date: z.union([z.string().trim().min(1, 'event date is required'), z.date()], {
    errorMap: () => ({ message: 'event date is required' }),
  }),
  time: z.string().trim().min(1, 'event time is required'),
  location: eventLocationSchema,
  description: z.string().trim().max(2000).optional().nullable(),
}).passthrough();

const visualTemplateInputSchema = z
  .object({
    templateRef: objectId.optional().nullable(),
    fieldValues: z.record(z.any()).optional().default({}),
    bakedImagePath: z.string().optional().nullable(),
    isCustomUpload: z.boolean().optional(),
  })
  .passthrough();

const taqnyatTemplateInputSchema = z
  .object({
    templateRef: objectId.optional().nullable(),
  })
  .passthrough();

const guestRepliesInputSchema = z
  .object({
    onAttend: z.string().optional().nullable(),
    onAbsent: z.string().optional().nullable(),
  })
  .passthrough();

const createEventSchema = z
  .object({
    eventDetails: createEventDetailsSchema,
    guestList: z.array(guestEntry).optional().default([]),
    staffList: z.array(staffEntry).optional().default([]),
    visualTemplate: visualTemplateInputSchema.optional().nullable(),
    taqnyatTemplate: taqnyatTemplateInputSchema.optional().nullable(),
    guestReplies: guestRepliesInputSchema.optional().nullable(),
    invitationType: invitationTypeSchema.optional(),
    launchSettings: z.object({}).passthrough().optional(),
    // Boundary aliases
    taqnyatTemplateRef: objectId.optional().nullable(),
    selectedTemplate: z.any().optional(),
  })
  .transform((data) => {
    const result = { ...data };
    if (result.taqnyatTemplateRef && !result.taqnyatTemplate) {
      result.taqnyatTemplate = { templateRef: String(result.taqnyatTemplateRef) };
    } else if (result.selectedTemplate && !result.taqnyatTemplate) {
      const ref =
        result.selectedTemplate?.templateRef ||
        result.selectedTemplate?._id ||
        result.selectedTemplate?.id;
      if (ref) {
        result.taqnyatTemplate = { templateRef: String(ref) };
      }
    }
    return result;
  });

const updateEventDetailsSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  type: z.enum(EVENT_CATEGORY_VALUES).optional(),
  date: z.union([z.string().trim().min(1), z.date()]).optional(),
  time: z.string().trim().min(1).optional(),
  location: z.object({
    address: z.string().trim().min(1, 'location address cannot be empty').max(500).optional(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    country: z.string().trim().max(100).optional().nullable(),
    placeId: z.string().trim().max(300).optional().nullable(),
    provider: z.enum(['google', 'device', 'manual']).optional().nullable(),
  }).partial().passthrough().optional(),
  description: z.string().trim().max(2000).optional().nullable(),
}).partial().passthrough().refine(
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

const updateInvitationSettingsSchema = z
  .object({
    visualTemplate: visualTemplateInputSchema.optional().nullable(),
    taqnyatTemplate: taqnyatTemplateInputSchema.optional().nullable(),
    guestReplies: guestRepliesInputSchema.optional().nullable(),
    invitationType: invitationTypeSchema.optional(),
    templateImage: z.string().optional().nullable(),
    // Boundary migration aliases
    taqnyatTemplateRef: objectId.optional().nullable(),
    selectedTemplate: z.any().optional(),
    attendanceAutoReply: z.string().optional().nullable(),
    absenceAutoReply: z.string().optional().nullable(),
  })
  .transform((data) => {
    const result = { ...data };
    if (result.taqnyatTemplateRef && !result.taqnyatTemplate) {
      result.taqnyatTemplate = { templateRef: String(result.taqnyatTemplateRef) };
    } else if (result.selectedTemplate && !result.taqnyatTemplate) {
      const ref =
        result.selectedTemplate?.templateRef ||
        result.selectedTemplate?._id ||
        result.selectedTemplate?.id;
      if (ref) {
        result.taqnyatTemplate = { templateRef: String(ref) };
      }
    }
    if (
      (result.attendanceAutoReply || result.absenceAutoReply) &&
      !result.guestReplies
    ) {
      result.guestReplies = {
        onAttend: result.attendanceAutoReply || "",
        onAbsent: result.absenceAutoReply || "",
      };
    }
    return result;
  });

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

const bulkDeleteSchema = z
  .object({
    ids: z.array(objectId).optional(),
    eventIds: z.array(objectId).optional(),
  })
  .transform((data) => {
    const rawList = data.ids || data.eventIds || [];
    const uniqueIds = Array.from(new Set(rawList.map(String)));
    return { ids: uniqueIds, eventIds: uniqueIds };
  })
  .refine((data) => data.ids.length >= 1 && data.ids.length <= 100, {
    message: 'ids must contain between 1 and 100 items',
    path: ['ids'],
  });

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
  // default non-responder audience is used.
  guestIds: z.array(objectId).optional(),
}).passthrough();

const extraReminderSchema = z.object({
  // Optional explicit target set, narrowed to confirmed guests in the service.
  guestIds: z.array(objectId).optional(),
}).passthrough();

const sendNewGuestsSchema = z.object({
  channel: z.enum(['sms', 'whatsapp']).optional(),
  // Optional explicit target set. Always narrowed to never-sent guests
  // (invitation.sent != true) in the service — can only narrow, never widen.
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
  sendNewGuestsSchema,
};
