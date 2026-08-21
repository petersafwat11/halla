import { classifyRsvpBucket } from "../constants/eventStatus.js";
import { COMPENSATION_PERCENTAGE, getBillingType } from "../constants/plans.js";

/**
 * Canonical Boundary DTO Adapters
 *
 * Normalizes differences across backend representations, mongo IDs, legacy
 * field names, and shape variances before reaching UI components or service boundaries.
 */

/**
 * Normalizes any ID variant (_id, id, guestId, userId, etc.) or primitive to a string ID.
 * Returns null if no valid ID can be resolved.
 */
export const normalizeId = (entity) => {
  if (entity === null || entity === undefined) return null;
  if (typeof entity === "string") {
    const trimmed = entity.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof entity === "number") return String(entity);
  if (typeof entity === "object") {
    const candidate =
      entity._id ||
      entity.id ||
      entity.guestId ||
      entity.userId ||
      entity.eventId ||
      entity.ticketId ||
      entity.planId ||
      entity.serviceId;
    if (candidate !== undefined && candidate !== null) {
      return normalizeId(candidate);
    }
    if (typeof entity.toString === "function" && entity.toString !== Object.prototype.toString) {
      const str = entity.toString().trim();
      return str.length > 0 ? str : null;
    }
  }
  return null;
};

/**
 * Resolves EVT-15: produces a canonical GuestDTO with consistent `id` and canonical `status`.
 */
export const toGuestDTO = (rawGuest) => {
  if (!rawGuest || typeof rawGuest !== "object") return null;

  const id = normalizeId(rawGuest) || "";
  const name = rawGuest.name || rawGuest.fullName || "";
  const phone = rawGuest.phone || rawGuest.phoneNumber || rawGuest.mobile || "";
  const category = rawGuest.category || null;
  const email = rawGuest.email || null;

  const rawStatus = (rawGuest.status || rawGuest.rsvpStatus || "invited").toLowerCase();
  const status = rawStatus;
  const rsvpStatus = classifyRsvpBucket(rawStatus);
  const invitationType = rawGuest.invitationType || "reply_and_qr";
  const qrCode = rawGuest.qrCode || rawGuest.qrCodeUrl || rawGuest.qrcode || null;
  const checkedIn = Boolean(
    rawGuest.checkedIn ||
      (rawGuest.checkIn && rawGuest.checkIn.checkedInAt) ||
      rawStatus === "checked_in"
  );
  const checkInTime = rawGuest.checkInTime || rawGuest.checkIn?.checkedInAt || null;
  const checkIn = rawGuest.checkIn || null;
  const rsvp = rawGuest.rsvp || null;
  const invitation = rawGuest.invitation || null;
  const addedBy = rawGuest.addedBy || null;
  const createdAt = rawGuest.createdAt || null;
  const tableNumber = rawGuest.tableNumber !== undefined ? rawGuest.tableNumber : null;
  const companionsCount = Number(rawGuest.companionsCount || rawGuest.companions || 0);
  const notes = rawGuest.notes || null;

  return {
    id,
    _id: id,
    name,
    phone,
    mobile: phone,
    category,
    email,
    status,
    rsvpStatus,
    invitationType,
    qrCode,
    checkedIn,
    checkInTime,
    checkIn,
    rsvp,
    invitation,
    addedBy,
    createdAt,
    tableNumber,
    companionsCount,
    notes,
  };
};

/**
 * Resolves ADM-06: produces a canonical TicketDTO normalizing `subject` and `title`.
 */
export const toTicketDTO = (rawTicket) => {
  if (!rawTicket || typeof rawTicket !== "object") return null;

  const id = normalizeId(rawTicket) || "";
  const subject = rawTicket.subject || rawTicket.title || "";
  const title = subject;
  const description = rawTicket.description || rawTicket.message || "";
  const message = description;
  const status = (rawTicket.status || "open").toLowerCase();
  const priority = (rawTicket.priority || "medium").toLowerCase();
  const type = rawTicket.type || rawTicket.category || "other";
  const createdAt = rawTicket.createdAt || null;
  const updatedAt = rawTicket.updatedAt || null;
  const attachments = Array.isArray(rawTicket.attachments) ? rawTicket.attachments : [];
  const attachment = rawTicket.attachment || (attachments.length > 0 ? attachments[0] : null);
  const creator = rawTicket.creator || rawTicket.user || null;
  const assignedTo = rawTicket.assignedTo || rawTicket.assignee || null;
  const resolution = rawTicket.resolution || rawTicket.resolutionResponse || null;
  const ticketNumber = rawTicket.ticketNumber || (id ? id.toString().slice(-6) : "");

  return {
    id,
    ticketNumber,
    subject,
    title,
    description,
    message,
    status,
    priority,
    type,
    createdAt,
    updatedAt,
    attachments,
    attachment,
    creator,
    assignedTo,
    resolution,
  };
};

/**
 * Resolves EVT-17: normalizes subscription payload into standard shape:
 * `{ subscription: Object|null, subscriptions: Array, hasSubscription: Boolean }`
 */
export const normalizeSubscriptionResponse = (data) => {
  if (!data || typeof data !== "object") {
    return {
      subscription: null,
      subscriptions: [],
      hasSubscription: false,
    };
  }

  // If top-level data has nested .data (standard API envelope)
  const source = data.data && typeof data.data === "object" ? data.data : data;

  let subscription = null;
  let subscriptions = [];

  if (Array.isArray(source)) {
    subscriptions = source;
    subscription = subscriptions[0] || null;
  } else {
    if (Array.isArray(source.subscriptions)) {
      subscriptions = source.subscriptions;
    } else if (Array.isArray(source.subscription)) {
      // Handles rare legacy array in singular field
      subscriptions = source.subscription;
    }

    if (source.subscription && !Array.isArray(source.subscription)) {
      subscription = source.subscription;
    } else if (subscriptions.length > 0) {
      subscription = subscriptions[0];
    }
  }

  const hasSubscription =
    typeof source.hasSubscription === "boolean"
      ? source.hasSubscription
      : Boolean(subscription);

  return {
    subscription,
    subscriptions,
    hasSubscription,
  };
};

/**
 * Produces a canonical SubscriptionDTO
 */
export const toSubscriptionDTO = (rawSub) => {
  if (!rawSub || typeof rawSub !== "object") return null;

  const id = normalizeId(rawSub) || "";
  const planCode =
    rawSub.planCode ||
    rawSub.code ||
    rawSub.plan?.code ||
    rawSub.planId?.code ||
    "";
  const planType =
    rawSub.planType ||
    rawSub.plan?.planType ||
    rawSub.planId?.planType ||
    "";
  const status = (rawSub.status || "inactive").toLowerCase();
  const billingType =
    rawSub.billingType ||
    rawSub.plan?.billingType ||
    rawSub.planId?.billingType ||
    getBillingType(planType) ||
    null;
  const billingInterval =
    rawSub.billingInterval || billingType || "event";
  const invitePool =
    rawSub.invitePool !== undefined && rawSub.invitePool !== null
      ? rawSub.invitePool
      : (rawSub.limits?.invitePool ??
        rawSub.plan?.limits?.invitePool ??
        rawSub.planId?.limits?.invitePool ??
        rawSub.limits?.maxInvitesPerEvent ??
        null);
  const compensationPool =
    rawSub.compensationPool !== undefined && rawSub.compensationPool !== null
      ? rawSub.compensationPool
      : null;
  const invitesConsumed = Number(
    rawSub.invitesConsumed ?? rawSub.usedInvites ?? rawSub.usage?.guestsUsed ?? 0
  );
  const remainingInvites =
    invitePool !== null
      ? Math.max(
          0,
          Number(invitePool) + (compensationPool || 0) - invitesConsumed
        )
      : null;
  const startDate = rawSub.startDate || rawSub.createdAt || null;
  const endDate = rawSub.endDate || rawSub.expiresAt || null;

  return {
    id,
    planCode,
    planType,
    status,
    billingType,
    billingInterval,
    invitePool,
    compensationPool,
    usedInvites: invitesConsumed,
    invitesConsumed,
    remainingInvites,
    startDate,
    endDate,
  };
};

/**
 * Resolves ADM-04: converts disparate bulk request keys (hostIds, vendorIds, moderatorIds, eventIds, ticketIds, array)
 * into a single canonical `{ ids: string[] }` payload with empty/duplicate items removed.
 */
export const toBulkIdsPayload = (input) => {
  if (!input) return { ids: [] };

  let rawList = [];

  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === "object") {
    rawList =
      input.ids ||
      input.hostIds ||
      input.vendorIds ||
      input.moderatorIds ||
      input.eventIds ||
      input.ticketIds ||
      input.userIds ||
      [];
  }

  if (!Array.isArray(rawList)) {
    rawList = [rawList];
  }

  const seen = new Set();
  const ids = [];

  for (const item of rawList) {
    const id = normalizeId(item);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return { ids };
};

/**
 * Resolves EVT-02: normalizes invitation settings into canonical shape:
 * {
 *   visualTemplate: { templateRef, fieldValues, bakedImagePath, isCustomUpload } | null,
 *   taqnyatTemplate: { templateRef } | null,
 *   guestReplies: { onAttend, onAbsent } | null,
 *   invitationType: string,
 *   templateImage: string | null
 * }
 */
export const toInvitationSettingsDTO = (rawSettings) => {
  if (!rawSettings || typeof rawSettings !== "object") return null;

  let visualTemplate = null;
  if (rawSettings.visualTemplate && typeof rawSettings.visualTemplate === "object") {
    const vt = rawSettings.visualTemplate;
    visualTemplate = {
      templateRef: normalizeId(vt.templateRef) || normalizeId(vt._id) || normalizeId(vt.id) || null,
      fieldValues: vt.fieldValues && typeof vt.fieldValues === "object" ? vt.fieldValues : {},
      bakedImagePath: vt.bakedImagePath || null,
      isCustomUpload: Boolean(vt.isCustomUpload),
    };
  }

  let taqnyatTemplate = null;
  const rawTaqnyat =
    rawSettings.taqnyatTemplate ||
    (rawSettings.taqnyatTemplateRef ? { templateRef: rawSettings.taqnyatTemplateRef } : null) ||
    (rawSettings.selectedTemplate ? { templateRef: rawSettings.selectedTemplate } : null);

  if (rawTaqnyat && typeof rawTaqnyat === "object") {
    const ref =
      normalizeId(rawTaqnyat.templateRef) ||
      normalizeId(rawTaqnyat._id) ||
      normalizeId(rawTaqnyat.id) ||
      null;
    if (ref) {
      taqnyatTemplate = { templateRef: ref };
    }
  }

  let guestReplies = null;
  if (rawSettings.guestReplies && typeof rawSettings.guestReplies === "object") {
    guestReplies = {
      onAttend: rawSettings.guestReplies.onAttend || rawSettings.attendanceAutoReply || "",
      onAbsent: rawSettings.guestReplies.onAbsent || rawSettings.absenceAutoReply || "",
    };
  } else if (rawSettings.attendanceAutoReply || rawSettings.absenceAutoReply) {
    guestReplies = {
      onAttend: rawSettings.attendanceAutoReply || "",
      onAbsent: rawSettings.absenceAutoReply || "",
    };
  }

  const invitationType = rawSettings.invitationType || "reply_and_qr";
  const templateImage = rawSettings.templateImage || visualTemplate?.bakedImagePath || null;

  return {
    visualTemplate,
    taqnyatTemplate,
    guestReplies,
    invitationType,
    templateImage,
  };
};

