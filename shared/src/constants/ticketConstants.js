/**
 * Ticket enums — mirror `halaa-backend/src/shared/constants/status.js`
 * (TICKET_STATUS, TICKET_PRIORITY) plus the FE-only TICKET_TYPES list.
 */

export const TICKET_TYPES = Object.freeze({
  TECHNICAL: "technical",
  PAYMENT: "payment",
  EVENT: "event",
  USER: "user",
  OTHER: "other",
  INQUIRY: "inquiry",
  ISSUE: "issue",
  REQUEST: "request",
  SUGGESTION: "suggestion",
});

export const TICKET_STATUS = Object.freeze({
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  WAITING_RESPONSE: "waiting_response",
  RESOLVED: "resolved",
  CLOSED: "closed",
});

export const TICKET_PRIORITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
});

export const TICKET_TRANSITIONS = Object.freeze({
  [TICKET_STATUS.OPEN]: Object.freeze([
    TICKET_STATUS.IN_PROGRESS,
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.IN_PROGRESS]: Object.freeze([
    TICKET_STATUS.WAITING_RESPONSE,
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.WAITING_RESPONSE]: Object.freeze([
    TICKET_STATUS.IN_PROGRESS,
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.RESOLVED]: Object.freeze([
    TICKET_STATUS.IN_PROGRESS,
    TICKET_STATUS.OPEN,
    TICKET_STATUS.CLOSED,
  ]),
  [TICKET_STATUS.CLOSED]: Object.freeze([]),
});

export const isValidTicketStatusTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  const allowed = TICKET_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};
