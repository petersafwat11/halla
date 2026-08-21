/**
 * Application Status Constants
 * Mirrors `halaa-backend/src/shared/constants/status.js`
 */

export * from "./eventStatus.js";
export * from "./ticketConstants.js";

export const USER_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  REJECTED: "rejected",
  INACTIVE: "inactive",
  DELETED: "deleted",
});

export const VENDOR_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  PENDING: "pending",
  SUSPENDED: "suspended",
});

export const INVITATION_TYPE = Object.freeze({
  REPLY_AND_QR: "reply_and_qr",
  REPLY_ONLY: "reply_only",
  NONE: "none",
});

export const invitationAllowsReply = (type) =>
  type === INVITATION_TYPE.REPLY_AND_QR || type === INVITATION_TYPE.REPLY_ONLY;

export const invitationIncludesQr = (type) =>
  type === INVITATION_TYPE.REPLY_AND_QR;

export const NOTIFICATION_STATUS = Object.freeze({
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  READ: "read",
});

export const SERVICE_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  DISABLED: "disabled",
});

export const WHATSAPP_TEMPLATE_STATUS = Object.freeze({
  NOT_SUBMITTED: "not_submitted",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PAUSED: "paused",
  DISABLED: "disabled",
});

export const SUPERVISOR_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
});

export const TICKET_SOURCE = Object.freeze({
  HOST: "host",
  GUEST: "guest",
  VENDOR: "vendor",
  SYSTEM: "system",
});
