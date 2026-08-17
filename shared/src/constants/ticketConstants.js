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
