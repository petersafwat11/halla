import { z } from "zod";

/**
 * Plans validation schemas (Zod) — web mirror of the backend canonical
 * at `labbe-backend-/src/modules/plans/plans.schemas.js`.
 *
 * Source-of-truth alignment: per L1 / L16 of the locked plan doc.
 * The backend `safeUpdate` whitelist drives this shape. `tier` was
 * dropped (L16) and is intentionally absent.
 */

// snake_case lowercase code: must start with a letter; trimmed + lowered.
const planCode = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "code must be at least 2 chars")
  .max(60, "code must be at most 60 chars")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "code must be lowercase snake_case (start with a letter, only [a-z0-9_])"
  );

const planTypeEnum = z.enum([
  "trial",
  "basic_event",
  "basic_monthly",
  "premium_event",
  "premium_monthly",
  "business_event",
  "business_quarterly",
  "business_annual",
  "unlimited",
]);

const planFamilyEnum = z.enum(["basic", "premium", "business"]);
const billingTypeEnum = z.enum(["event", "monthly", "quarterly", "annual"]);
const availabilityEnum = z.enum(["host", "whitelabel", "platform_admin"]);
const currencyEnum = z.enum([
  "SAR",
  "USD",
  "EUR",
  "AED",
  "KWD",
  "BHD",
  "QAR",
  "OMR",
]);

// SAR major-units: non-negative number with at most 2 decimal places.
const sarAmount = z
  .number()
  .nonnegative("must be ≥ 0")
  .refine(
    (v) => {
      const rounded = Math.round(v * 100) / 100;
      return Math.abs(rounded - v) < 1e-9;
    },
    { message: "must have at most 2 decimal places (SAR)" }
  );

// Event-count style limit: positive integer OR -1 (= unlimited).
const limitOrUnlimited = z
  .number()
  .int("must be an integer")
  .refine((v) => v === -1 || v >= 1, {
    message: "must be ≥ 1 or -1 (unlimited)",
  });

// Optional nullable variant for limits that allow null = "no ceiling".
const optionalLimit = z
  .number()
  .int("must be an integer")
  .refine((v) => v === -1 || v >= 0, { message: "must be ≥ 0 or -1" })
  .nullable();

const pricingSchema = z
  .object({
    oneTime: sarAmount,
  })
  .strict();

const limitsSchema = z
  .object({
    maxEvents: limitOrUnlimited,
    maxInvitesPerEvent: optionalLimit.optional(),
    invitePool: optionalLimit.optional(),
    durationDays: z.number().int().positive().optional(),
    maxHosts: optionalLimit.optional(),
  })
  .strict();

const featuresSchema = z
  .object({
    // Core invitation features
    hasInAppInvites: z.boolean().optional(),
    hasWhatsAppInvites: z.boolean().optional(),
    hasSMSInvites: z.boolean().optional(),

    // Entry & scanning
    hasQRCode: z.boolean().optional(),
    hasQRScanning: z.boolean().optional(),
    hasFlexibleEntryMode: z.boolean().optional(),

    // Staff & management
    hasStaffCheckIn: z.boolean().optional(),
    hasStaffAssignment: z.boolean().optional(),

    // Communication
    hasRSVPTracking: z.boolean().optional(),
    hasAutoReminders: z.boolean().optional(),
    hasEmailNotifications: z.boolean().optional(),
    hasCustomWhatsAppNumber: z.boolean().optional(),

    // Compensation
    hasCompensationInvites: z.boolean().optional(),
    compensationPercentage: z.number().min(0).max(100).optional(),

    // Templates
    hasBasicTemplates: z.boolean().optional(),
    hasPremiumTemplates: z.boolean().optional(),

    // Post event
    hasPostEventPage: z.boolean().optional(),

    // Reports
    hasCustomReports: z.boolean().optional(),

    // Support
    priorityPoints: z.number().int().min(1).max(10).optional(),
    hasWhatsAppSupport: z.boolean().optional(),
  })
  .strict();

export const createPlanSchema = z
  .object({
    code: planCode,
    planType: planTypeEnum,
    nameAr: z.string().trim().min(1, "nameAr is required"),
    nameEn: z.string().trim().min(1, "nameEn is required"),

    pricing: pricingSchema,
    limits: limitsSchema,
    features: featuresSchema,

    descriptionAr: z.string().trim().optional(),
    descriptionEn: z.string().trim().optional(),
    currency: currencyEnum.optional(),
    availableFor: availabilityEnum.optional(),
    planFamily: planFamilyEnum.nullable().optional(),
    billingType: billingTypeEnum.nullable().optional(),

    sortOrder: z.number().int().optional(),
    isPopular: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  })
  .strict();

// `code` and `planType` are immutable on update.
export const editPlanSchema = createPlanSchema
  .omit({ code: true, planType: true })
  .partial()
  .strict();

/**
 * Plan-type display labels used by ManagePlansContent legacy UI.
 * Kept verbatim for backward compat with existing imports.
 */
export const PLAN_TYPES = {
  direct: { labelAr: "هلا مباشر", labelEn: "Halaa Direct" },
  managed: { labelAr: "هلا علينا", labelEn: "Halaa Managed" },
  business_client: {
    labelAr: "هلا أعمال — بالعميل",
    labelEn: "Halaa Business — By Client",
  },
  business_team: {
    labelAr: "هلا أعمال — بفريق هلا",
    labelEn: "Halaa Business — By Halaa Team",
  },
  trial: { labelAr: "الباقات التجريبية", labelEn: "Trial Plans" },
  unlimited: { labelAr: "غير محدود", labelEn: "Unlimited" },
};
