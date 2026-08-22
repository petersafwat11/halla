/**
 * Session 6.3: Cross-Platform Acceptance Matrix and Regression Gate Suite (@halaa/shared)
 *
 * Verifies that all contracts, schemas, state transitions, DTO adapters,
 * monetary calculations, and plan semantics satisfy the consolidated audit criteria.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  USER_STATUS,
  VENDOR_STATUS,
  EVENT_STATUS,
  SUBSCRIPTION_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  RSVP_STATUS,
  GUEST_STATUS,
  CHECKIN_STATUS,
  INVITATION_TYPE,
  RSVP_BUCKETS,
  classifyRsvpBucket,
  TICKET_TRANSITIONS,
  isValidTicketStatusTransition,
} from "../src/constants/index.js";

import {
  PLAN_TYPES,
  PLAN_FAMILIES,
  BILLING_TYPES,
  isTrialPlan,
  isPerEventPlan,
  isPoolPlan,
  isRecurringPlan,
  getPlanFamily,
  getBillingType,
} from "../src/constants/plans.js";

import {
  normalizeId,
  toGuestDTO,
  toTicketDTO,
  normalizeSubscriptionResponse,
  toSubscriptionDTO,
  toBulkIdsPayload,
  toInvitationSettingsDTO,
  toPlanPresentationDTO,
} from "../src/utils/adapters.js";

import {
  bulkIdsRequestSchema,
  bulkActionResponseSchema,
} from "../src/schemas/bulk.js";

import {
  invitationSettingsSchema,
  visualTemplateSchema,
  taqnyatTemplateSchema,
} from "../src/schemas/events.js";

import {
  eventKeys,
  guestKeys,
  ticketKeys,
  planKeys,
  vendorServiceKeys,
  subscriptionKeys,
} from "../src/utils/queryKeys.js";

import {
  round2,
  toHalalas,
  halalasToSar,
  formatSar,
  allocateDiscount,
  buildCheckoutQuote,
} from "../src/utils/money.js";

import {
  normalizeDigits,
  normalizeDigitsOnly,
  formatDate,
  formatTime,
  formatDateTime,
  formatLocation,
  formatNumber,
  formatPercent,
  formatGuestCount,
  getLocalized,
} from "../src/utils/locale.js";

import {
  normalizePhoneNumber,
  toE164,
  isValidPhone,
  validateAndFormatPhone,
} from "../src/utils/phone.js";

import {
  formatExpiryInput,
  parseCardExpiry,
  validateCardExpiry,
} from "../src/utils/card.js";

import {
  MARKETPLACE_EVENT_TYPES,
  MARKETPLACE_TARGET_TYPES,
  marketplaceTrackSchema,
} from "../src/schemas/vendor.js";

describe("Session 6.3: Acceptance Matrix Regression Gate", () => {
  describe("1. Roles, Statuses, and RSVP Buckets (ADM-08, EVT-15, EVT-16)", () => {
    it("exports frozen status dictionaries matching backend contracts", () => {
      assert.equal(EVENT_STATUS.PENDING_SCHEDULING, "pending_scheduling");
      assert.equal(EVENT_STATUS.LIVE, "live");
      assert.equal(EVENT_STATUS.COMPLETED, "completed");
      assert.equal(EVENT_STATUS.CANCELLED, "cancelled");
      assert.equal(USER_STATUS.ACTIVE, "active");
      assert.equal(USER_STATUS.SUSPENDED, "suspended");
      assert.equal(VENDOR_STATUS.APPROVED, "approved");
      assert.equal(TICKET_STATUS.OPEN, "open");
      assert.equal(TICKET_STATUS.RESOLVED, "resolved");
    });

    it("classifies all RSVP statuses into canonical buckets", () => {
      assert.equal(classifyRsvpBucket("confirmed"), "confirmed");
      assert.equal(classifyRsvpBucket("checked_in"), "attended");
      assert.equal(classifyRsvpBucket("declined"), "declined");
      assert.equal(classifyRsvpBucket("no_show"), "no_show");
      assert.equal(classifyRsvpBucket("pending"), "pending");
      assert.equal(classifyRsvpBucket("invited"), "pending");
      assert.equal(classifyRsvpBucket("unknown"), "pending");
    });
  });

  describe("2. Normalization Adapters (EVT-15, EVT-17, ADM-04, ADM-06)", () => {
    it("normalizes guest records with _id, id, and guestId into canonical GuestDTO", () => {
      const g1 = toGuestDTO({ _id: "mongo_1", name: "Ahmed", phone: "0501234567", status: "confirmed" });
      assert.equal(g1.id, "mongo_1");
      assert.equal(g1.status, "confirmed");
      assert.equal(g1.rsvpStatus, "confirmed");

      const g2 = toGuestDTO({ guestId: "gid_2", name: "Sara", mobile: "+966509876543", status: "declined" });
      assert.equal(g2.id, "gid_2");
      assert.equal(g2.status, "declined");
      assert.equal(g2.rsvpStatus, "declined");
    });

    it("normalizes ticket records with title or subject into canonical TicketDTO", () => {
      const t1 = toTicketDTO({ _id: "t_1", title: "Cannot login", status: "open" });
      assert.equal(t1.id, "t_1");
      assert.equal(t1.subject, "Cannot login");

      const t2 = toTicketDTO({ id: "t_2", subject: "Billing issue", status: "resolved" });
      assert.equal(t2.id, "t_2");
      assert.equal(t2.subject, "Billing issue");
    });

    it("normalizes singular vs array subscription responses (EVT-17)", () => {
      const resSingular = {
        data: {
          hasSubscription: true,
          subscription: { id: "sub_1", planCode: "trial", status: "active" },
          subscriptions: [{ id: "sub_1", planCode: "trial", status: "active" }],
        },
      };
      const norm1 = normalizeSubscriptionResponse(resSingular);
      assert.equal(norm1.hasSubscription, true);
      assert.equal(norm1.subscription.planCode, "trial");

      const resLegacyArray = {
        data: {
          hasSubscription: true,
          subscriptions: [{ id: "sub_2", planCode: "unlimited", status: "active" }],
        },
      };
      const norm2 = normalizeSubscriptionResponse(resLegacyArray);
      assert.equal(norm2.hasSubscription, true);
      assert.equal(norm2.subscription.planCode, "unlimited");
    });

    it("normalizes bulk request payloads across resource-specific keys (ADM-04)", () => {
      assert.deepEqual(toBulkIdsPayload(["id1", "id2"]), { ids: ["id1", "id2"] });
      assert.deepEqual(toBulkIdsPayload({ hostIds: ["h1", "h2"] }), { ids: ["h1", "h2"] });
      assert.deepEqual(toBulkIdsPayload({ eventIds: ["e1"] }), { ids: ["e1"] });
      assert.deepEqual(toBulkIdsPayload({ vendorIds: ["v1", "v2"] }), { ids: ["v1", "v2"] });
      assert.deepEqual(toBulkIdsPayload({ moderatorIds: ["m1"] }), { ids: ["m1"] });
    });
  });

  describe("3. Ticket State Machine Transitions (ADM-05, ADM-07)", () => {
    it("allows valid state transitions", () => {
      assert.ok(isValidTicketStatusTransition("open", "in_progress"));
      assert.ok(isValidTicketStatusTransition("in_progress", "resolved"));
      assert.ok(isValidTicketStatusTransition("resolved", "in_progress"));
      assert.ok(isValidTicketStatusTransition("open", "closed"));
    });

    it("rejects invalid state transitions", () => {
      assert.ok(!isValidTicketStatusTransition("closed", "open"));
      assert.ok(!isValidTicketStatusTransition("closed", "in_progress"));
    });
  });

  describe("4. Money and Authoritative Quote Boundary (PLN-02)", () => {
    it("converts SAR to minor halalas with zero floating-point drift", () => {
      assert.equal(toHalalas(199.99), 19999);
      assert.equal(toHalalas("249.50"), 24950);
      assert.equal(halalasToSar(19999), 199.99);
      assert.equal(formatSar(199.99), "199.99");
    });

    it("allocates discounts proportionally across line items without lost halalas", () => {
      const items = [
        { id: "plan", subtotal: 100 },
        { id: "setup", subtotal: 50 },
        { id: "extra", subtotal: 30 },
      ];
      const discountSar = 33.33;
      const allocations = allocateDiscount(items, discountSar);

      const totalAllocated = round2(
        allocations.get("plan") + allocations.get("setup") + allocations.get("extra")
      );
      assert.equal(totalAllocated, discountSar);
    });

    it("builds a complete authoritative checkout quote", () => {
      const quote = buildCheckoutQuote({
        plan: { nameEn: "Quarterly Business", pricing: { oneTime: 500 } },
        setupFee: 100,
        discountAmount: 50,
        discountCode: "DISC50",
        addons: [{ addonType: "vip_template", price: 75, quantity: 1 }],
      });

      assert.equal(quote.planPrice, 500);
      assert.equal(quote.setupFee, 100);
      assert.equal(quote.addonsTotal, 75);
      assert.equal(quote.subtotal, 575);
      assert.equal(quote.discountAmount, 50);
      assert.equal(quote.total, 625);
      assert.equal(quote.totalHalalas, 62500);
      assert.equal(quote.currency, "SAR");
      assert.equal(quote.lineItems.length, 3);
    });
  });

  describe("5. Plan Semantics & Invite Pools (PLN-03, PLN-04, PLN-05, PLN-09)", () => {
    it("classifies plan models into canonical semantics", () => {
      assert.equal(isTrialPlan(PLAN_TYPES.TRIAL), true);
      assert.equal(isPerEventPlan(PLAN_TYPES.TRIAL), true);
      assert.equal(isPoolPlan(PLAN_TYPES.TRIAL), false);

      assert.equal(isPoolPlan(PLAN_TYPES.BASIC_MONTHLY), true);
      assert.equal(isRecurringPlan(PLAN_TYPES.BASIC_MONTHLY), true);

      assert.equal(isRecurringPlan(PLAN_TYPES.BUSINESS_QUARTERLY), true);
      assert.equal(getBillingType(PLAN_TYPES.BUSINESS_QUARTERLY), BILLING_TYPES.QUARTERLY);
    });

    it("normalizes plan presentation DTO preserving priced line items (PLN-08)", () => {
      const dto = toPlanPresentationDTO({
        _id: "p_1",
        nameAr: "باقة الأعمال ربع السنوية",
        nameEn: "Quarterly Business",
        planType: "business_quarterly",
        code: "business_quarterly",
        pricing: { oneTime: 900 },
        setupFeeAmount: 150,
        limits: {
          maxEvents: -1,
          invitePool: 500,
          durationDays: 90,
        },
        features: {
          whatsAppTemplates: 10,
        },
      });

      assert.equal(dto.id, "p_1");
      assert.equal(dto.pricing.setupFee, 150);
      assert.equal(dto.billingType, "quarterly");
      assert.equal(dto.isManaged, true);
    });
  });

  describe("6. Card Expiry & Security Formatting (PLN-01)", () => {
    it("parses and validates strict MM/YY formats", () => {
      assert.equal(formatExpiryInput("1227").formatted, "12/27");
      assert.equal(formatExpiryInput("05/28").formatted, "05/28");

      const parsed = parseCardExpiry("08/29");
      assert.equal(parsed.monthNum, 8);
      assert.equal(parsed.yearNum, 2029);

      const refDate = new Date(2026, 7, 22);
      const validFuture = validateCardExpiry("12", "2035", refDate);
      assert.equal(validFuture.valid, true);

      const invalidMonth = validateCardExpiry("13", "2028", refDate);
      assert.equal(invalidMonth.valid, false);

      const expired = validateCardExpiry("01", "2020", refDate);
      assert.equal(expired.valid, false);
      assert.equal(expired.errorCode, "EXPIRED");
    });
  });

  describe("7. E.164 Saudi and Egyptian Phone Normalization (ADM-11)", () => {
    it("normalizes Saudi local 10-digit format (05xxxxxxxx) to +9665xxxxxxxx", () => {
      assert.equal(normalizePhoneNumber("0501234567"), "966501234567");
      assert.equal(toE164("0559876543"), "+966559876543");
      assert.ok(isValidPhone("0501234567"));
    });

    it("normalizes Egyptian local format (01xxxxxxxxx) to +201xxxxxxxxx", () => {
      assert.equal(normalizePhoneNumber("01012345678"), "201012345678");
      assert.equal(toE164("01012345678"), "+201012345678");
      assert.ok(isValidPhone("01012345678"));
    });

    it("strips separators and extra zeros cleanly", () => {
      assert.equal(normalizePhoneNumber("+966 (050) 123-4567"), "966501234567");
      assert.equal(toE164("00966 50 123 4567"), "+966501234567");
    });
  });

  describe("8. Digit Normalization & Localized Helpers (SET-07, Session 6.2)", () => {
    it("converts Eastern Arabic-Indic numerals to ASCII digits", () => {
      assert.equal(normalizeDigits("٠٥٠١٢٣٤٥٦٧"), "0501234567");
      assert.equal(normalizeDigitsOnly("١,٢٣٤.٥٦"), "123456");
    });

    it("formats dates, numbers, and guest counts accurately across locales", () => {
      const sampleDate = new Date("2026-08-22T12:00:00Z");
      assert.ok(formatDate(sampleDate, "en").length > 0);
      assert.ok(formatDate(sampleDate, "ar").length > 0);

      assert.equal(formatGuestCount(1, "en"), "1 guest");
      assert.equal(formatGuestCount(5, "en"), "5 guests");
      assert.equal(formatNumber(1500, "en"), "1,500");
    });
  });

  describe("9. Marketplace Analytics Contracts (MKT-10)", () => {
    it("validates structured analytics events with deduplication payload", () => {
      const parsed = marketplaceTrackSchema.safeParse({
        eventType: "service_view",
        targetType: "service",
        targetId: "507f1f77bcf86cd799439011",
        metadata: { source: "marketplace_grid" },
      });
      assert.equal(parsed.success, true);
      assert.equal(parsed.data.eventType, "service_view");
      assert.equal(parsed.data.targetId, "507f1f77bcf86cd799439011");
    });
  });

  describe("10. Canonical Query Key Factories (ADM-09)", () => {
    it("produces deterministic keys for server prefetch, client query, and invalidation", () => {
      assert.deepEqual(eventKeys.detail("evt_123"), ["events", "evt_123"]);
      assert.deepEqual(guestKeys.detail("g_123"), ["guests", "detail", "g_123"]);
      assert.deepEqual(ticketKeys.detail("t_456"), ["tickets", "t_456"]);
      assert.deepEqual(planKeys.all, ["plans"]);
      assert.deepEqual(vendorServiceKeys.myList(), ["vendor-services", "my-services"]);
      assert.deepEqual(subscriptionKeys.mySubscription(), ["subscriptions", "my-subscription"]);
    });
  });
});
