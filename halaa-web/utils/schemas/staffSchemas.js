/**
 * Staff Portal Schemas
 * Zod validation schemas for staff portal forms and data
 */

import { z } from "zod";
import { saudiPhone } from "@halaa/shared/schemas/_shared";

// ============================================
// GUEST SCHEMAS
// ============================================

/**
 * Guest status enum
 */
export const GuestStatus = z.enum([
  "invited",
  "confirmed",
  "declined",
  "checked_in",
  "no_show",
]);

/**
 * Guest object schema
 */
export const GuestSchema = z.object({
  _id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional().nullable(),
  status: GuestStatus,
  checkIn: z
    .object({
      checkedIn: z.boolean(),
      checkedInAt: z.string().datetime().optional(),
      checkedInBy: z
        .object({
          staffId: z.string().optional(),
          staffName: z.string().optional(),
        })
        .optional(),
      method: z.enum(["qr", "manual"]).optional(),
      note: z.string().optional(),
    })
    .optional(),
  qrCode: z.string().optional(),
  rsvp: z
    .object({
      status: z.string().optional(),
      respondedAt: z.string().datetime().optional(),
    })
    .optional(),
});

/**
 * Guest list response schema
 */
export const GuestListResponseSchema = z.object({
  status: z.literal("success"),
  results: z.number(),
  data: z.object({
    guests: z.array(GuestSchema),
    stats: z.object({
      total: z.number(),
      confirmed: z.number(),
      checkedIn: z.number(),
      declined: z.number(),
      pending: z.number(),
    }),
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalGuests: z.number(),
      hasMore: z.boolean(),
    }),
  }),
});

// ============================================
// STAFF VERIFICATION SCHEMAS
// ============================================

/**
 * Staff verification response schema
 */
export const StaffVerificationResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    verified: z.boolean(),
    staff: z.object({
      _id: z.string().optional(),
      name: z.string(),
      phone: z.string(),
      role: z.string(),
      status: z.string().optional(),
    }),
    event: z.object({
      _id: z.string(),
      title: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      location: z
        .object({
          address: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
        .optional(),
      status: z.string().optional(),
    }),
    sessionToken: z.string(),
  }),
});

// ============================================
// CHECK-IN SCHEMAS
// ============================================

const idT = (k) => k;

/**
 * Check-in by QR code schema
 */
export const CheckInByQRSchema = (t = idT) =>
  z.object({
    qrCode: z.string().min(1, t("checkIn.qrCodeRequired")),
  });

/**
 * Check-in by guest ID schema
 */
export const CheckInByIdSchema = (t = idT) =>
  z.object({
    guestId: z.string().min(1, t("checkIn.guestIdRequired")),
  });

/**
 * Check-in by phone schema
 */
export const CheckInByPhoneSchema = (t = idT) =>
  z.object({
    phone: saudiPhone(t),
  });

/**
 * Manual check-in schema
 */
export const ManualCheckInSchema = (t = idT) =>
  z.object({
    guestId: z.string().min(1, t("checkIn.guestIdRequired")),
    note: z
      .string()
      .max(500, t("checkIn.noteMaxLength"))
      .optional(),
    overrideDeclined: z.boolean().optional(),
  });

/**
 * Check-in response schema
 */
export const CheckInResponseSchema = z.object({
  status: z.literal("success"),
  message: z.string(),
  data: z.object({
    guest: GuestSchema,
    alreadyCheckedIn: z.boolean(),
  }),
});

// ============================================
// STATS SCHEMAS
// ============================================

/**
 * Event stats response schema
 */
export const EventStatsResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    total: z.number(),
    confirmed: z.number(),
    checkedIn: z.number(),
    declined: z.number(),
    pending: z.number(),
    percentCheckedIn: z.number(),
    percentConfirmed: z.number(),
    recentCheckIns: z.array(
      z.object({
        guestName: z.string(),
        checkedInAt: z.string().datetime(),
        checkedInBy: z.string().optional(),
      })
    ),
    lastUpdated: z.string().datetime(),
  }),
});

// ============================================
// SEARCH & FILTER SCHEMAS
// ============================================

/**
 * Guest search/filter schema
 */
export const GuestSearchSchema = z.object({
  search: z.string().optional(),
  status: GuestStatus.optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

/**
 * @typedef {z.infer<typeof GuestSchema>} Guest
 * @typedef {z.infer<typeof GuestStatus>} GuestStatusType
 * @typedef {z.infer<typeof StaffVerificationResponseSchema>} StaffVerificationResponse
 * @typedef {z.infer<typeof CheckInResponseSchema>} CheckInResponse
 * @typedef {z.infer<typeof EventStatsResponseSchema>} EventStatsResponse
 * @typedef {z.infer<typeof GuestListResponseSchema>} GuestListResponse
 */

// Default exports
export default {
  GuestStatus,
  GuestSchema,
  GuestListResponseSchema,
  StaffVerificationResponseSchema,
  CheckInByQRSchema,
  CheckInByIdSchema,
  CheckInByPhoneSchema,
  ManualCheckInSchema,
  CheckInResponseSchema,
  EventStatsResponseSchema,
  GuestSearchSchema,
};
